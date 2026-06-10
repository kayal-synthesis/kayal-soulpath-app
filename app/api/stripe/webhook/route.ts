// @ts-nocheck
// app/api/stripe/webhook/route.ts
// Handles all Stripe webhook events.
// Critical path: checkout.session.completed → credit_commission()
// Also handles: invoice.payment_succeeded (subscription renewals)
// and charge.refunded (reverses commission).

import { NextResponse }  from 'next/server'
import { headers }       from 'next/headers'
import Stripe            from 'stripe'
import { createClient }  from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─────────────────────────────────────────────────────────────
// POST /api/stripe/webhook
// ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const body      = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  // ── Verify webhook signature ───────────────────────────────
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── Route event to handler ─────────────────────────────────
  try {
    switch (event.type) {

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge)
        break

      // Log unhandled events for debugging — do not error
      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (err: any) {
    console.error(`[webhook] Handler error for ${event.type}:`, err)
    // Return 200 anyway — Stripe retries on non-200, which could double-credit
    return NextResponse.json({ received: true, error: err.message })
  }
}

// ─────────────────────────────────────────────────────────────
// checkout.session.completed
// Fires for every one-time purchase.
// metadata expected: { tool_id, tool_name, user_id, ref_code, link_id }
// ─────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const {
    tool_id,
    tool_name,
    user_id,
    ref_code,
    link_id,
  } = (session.metadata || {}) as Record<string, string>

  const purchaseAmount = (session.amount_total || 0) / 100  // cents → dollars
  const customerEmail  = session.customer_details?.email || ''

  // ── 1. Record the purchase in your purchases table ─────────
  const { data: purchase, error: purchaseError } = await supabaseAdmin
    .from('purchases')
    .insert({
      user_id:           user_id    || null,
      tool_id:           tool_id    || 'unknown',
      tool_name:         tool_name  || 'Unknown Tool',
      amount:            purchaseAmount,
      status:            'completed',
      stripe_session_id: session.id,
      ref_code:          ref_code   || null,
      user_email:        customerEmail,
      created_at:        new Date().toISOString(),
    })
    .select('id')
    .single()

  if (purchaseError) {
    console.error('[webhook] Purchase insert error:', purchaseError)
    // Do not throw — continue to attempt commission credit
  }

  // ── 2. Credit affiliate commission if ref_code present ─────
  if (ref_code) {
    await creditAffiliateCommission({
      refCode:        ref_code,
      linkId:         link_id       || null,
      toolId:         tool_id       || 'unknown',
      toolName:       tool_name     || 'Unknown Tool',
      purchaseAmount,
      stripeSessionId: session.id,
      customerEmail,
      isRecurring:    false,
    })
  }

  // ── 3. Tag Stripe Customer with ref_code for subscription renewals ──
  // When this customer renews a subscription, invoice.payment_succeeded
  // fires without metadata — we use the Customer tag to re-attribute.
  if (ref_code && session.customer) {
    await stripe.customers.update(session.customer as string, {
      metadata: { kayal_ref: ref_code, kayal_lid: link_id || '' },
    }).catch(err => {
      console.error('[webhook] Customer tag error:', err)
    })
  }

  console.log(`[webhook] checkout.session.completed processed. ref: ${ref_code || 'organic'} session: ${session.id}`)
}

// ─────────────────────────────────────────────────────────────
// invoice.payment_succeeded
// Fires for every subscription renewal after the first payment.
// The first payment is covered by checkout.session.completed.
// We look up the affiliate from the Stripe Customer metadata.
// ─────────────────────────────────────────────────────────────

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Skip first invoice — it was already handled by checkout.session.completed
  if (invoice.billing_reason === 'subscription_create') {
    console.log('[webhook] invoice.payment_succeeded: first invoice, skipping (handled by checkout)')
    return
  }

  if (!invoice.customer) return

  // Look up affiliate ref_code from the Stripe Customer metadata
  const customer = await stripe.customers.retrieve(invoice.customer as string)
  if (customer.deleted) return

  const refCode = (customer as Stripe.Customer).metadata?.kayal_ref
  const linkId  = (customer as Stripe.Customer).metadata?.kayal_lid || null

  if (!refCode) return  // Customer was not referred by an affiliate

  const purchaseAmount = (invoice.amount_paid || 0) / 100
  const toolId   = invoice.metadata?.tool_id   || 'subscription'
  const toolName = invoice.metadata?.tool_name || 'Subscription Renewal'

  await creditAffiliateCommission({
    refCode,
    linkId,
    toolId,
    toolName,
    purchaseAmount,
    stripeSessionId: invoice.id,
    customerEmail:   invoice.customer_email || '',
    isRecurring:     true,
  })

  console.log(`[webhook] invoice.payment_succeeded: recurring commission credited. ref: ${refCode}`)
}

// ─────────────────────────────────────────────────────────────
// charge.refunded
// When a purchase is refunded, reverse the affiliate commission.
// ─────────────────────────────────────────────────────────────

async function handleRefund(charge: Stripe.Charge) {
  const stripeSessionId = charge.payment_intent as string
  if (!stripeSessionId) return

  // Find the conversion record for this payment
  const { data: conversion } = await supabaseAdmin
    .from('affiliate_conversions')
    .select('id, affiliate_id, commission_amount, status')
    .eq('stripe_session_id', stripeSessionId)
    .single()

  if (!conversion) return
  if (conversion.status === 'refunded') return  // already reversed

  // Mark conversion as refunded
  await supabaseAdmin
    .from('affiliate_conversions')
    .update({ status: 'refunded' })
    .eq('id', conversion.id)

  // Deduct commission from affiliate's pending_balance
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('pending_balance')
    .eq('id', conversion.affiliate_id)
    .single()

  if (user) {
    const newBalance = Math.max(0, (user.pending_balance || 0) - conversion.commission_amount)
    await supabaseAdmin
      .from('users')
      .update({ pending_balance: newBalance })
      .eq('id', conversion.affiliate_id)

    // Write reversal to earnings_ledger
    await supabaseAdmin.from('earnings_ledger').insert({
      affiliate_id:  conversion.affiliate_id,
      conversion_id: conversion.id,
      type:          'refunded',
      amount:        conversion.commission_amount,
      description:   'Commission reversed due to refund',
      balance_after: newBalance,
      created_at:    new Date().toISOString(),
    })
  }

  console.log(`[webhook] charge.refunded: commission of $${conversion.commission_amount} reversed`)
}

// ─────────────────────────────────────────────────────────────
// Shared commission crediting logic
// Called by both checkout and invoice handlers.
// ─────────────────────────────────────────────────────────────

interface CommissionPayload {
  refCode:         string
  linkId:          string | null
  toolId:          string
  toolName:        string
  purchaseAmount:  number
  stripeSessionId: string
  customerEmail:   string
  isRecurring:     boolean
}

async function creditAffiliateCommission(payload: CommissionPayload) {
  const {
    refCode, linkId, toolId, toolName,
    purchaseAmount, stripeSessionId, customerEmail, isRecurring,
  } = payload

  const COMMISSION_RATE    = 0.30
  const commissionAmount   = Math.round(purchaseAmount * COMMISSION_RATE * 100) / 100

  // ── Look up affiliate by ref_code ──────────────────────────
  const { data: affiliate, error: affError } = await supabaseAdmin
    .from('users')
    .select('id, affiliate_status')
    .eq('referral_code', refCode)
    .single()

  if (affError || !affiliate) {
    console.error(`[commission] Affiliate not found for ref_code: ${refCode}`)
    return
  }

  if (affiliate.affiliate_status === 'suspended') {
    console.log(`[commission] Affiliate ${refCode} is suspended — commission not credited`)
    return
  }

  // ── Idempotency: skip if this session was already processed ──
  const { data: existing } = await supabaseAdmin
    .from('affiliate_conversions')
    .select('id')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle()

  if (existing) {
    console.log(`[commission] Session ${stripeSessionId} already processed — skipping`)
    return
  }

  // ── Insert conversion record ───────────────────────────────
  const { data: conversion, error: convError } = await supabaseAdmin
    .from('affiliate_conversions')
    .insert({
      affiliate_id:        affiliate.id,
      link_id:             linkId          || null,
      tool_id:             toolId,
      tool_name:           toolName,
      ref_code:            refCode,
      stripe_session_id:   stripeSessionId,
      purchase_amount:     purchaseAmount,
      commission_rate:     30.00,           // always 30% — flat
      commission_amount:   commissionAmount,
      is_recurring:        isRecurring,
      customer_email_hash: hashEmail(customerEmail),
      status:              'pending',
      created_at:          new Date().toISOString(),
    })
    .select('id')
    .single()

  if (convError) {
    console.error('[commission] Conversion insert error:', convError)
    return
  }

  // ── Call Supabase RPC to credit balance + write ledger ─────
  const { data: result, error: rpcError } = await supabaseAdmin
    .rpc('credit_commission', {
      p_affiliate_id:      affiliate.id,
      p_conversion_id:     conversion.id,
      p_purchase_amount:   purchaseAmount,
    })

  if (rpcError) {
    console.error('[commission] credit_commission RPC error:', rpcError)
    return
  }

  // ── Update link conversion counters if link_id present ────
  if (linkId) {
    await supabaseAdmin
      .from('affiliate_links')
      .update({
        conversions: supabaseAdmin.rpc('increment', { x: 1 }) as any,
        earnings:    supabaseAdmin.rpc('add', { x: commissionAmount }) as any,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', linkId)
      .catch(err => console.error('[commission] Link counter update error:', err))

    // Simpler: just increment directly
    const { data: link } = await supabaseAdmin
      .from('affiliate_links')
      .select('conversions, earnings')
      .eq('id', linkId)
      .single()

    if (link) {
      await supabaseAdmin
        .from('affiliate_links')
        .update({
          conversions: (link.conversions || 0) + 1,
          earnings:    (link.earnings    || 0) + commissionAmount,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', linkId)
    }
  }

  console.log(
    `[commission] Credited $${commissionAmount} (30% of $${purchaseAmount}) ` +
    `to affiliate ${refCode}. ` +
    `New balance: $${result?.new_balance || '?'}`
  )
}

// ─────────────────────────────────────────────────────────────
// Simple one-way hash for customer email (GDPR-friendly storage)
// ─────────────────────────────────────────────────────────────

function hashEmail(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}
