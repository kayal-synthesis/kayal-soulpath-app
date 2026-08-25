// app/api/webhooks/stripe/route.ts
//
// The real source of truth for fulfillment, not the checkout return
// page. Stripe calls this server-to-server the moment a payment
// genuinely completes, this is what marks pending_checkouts as paid,
// the return/callback route the customer's browser hits is only ever
// for their immediate experience (show success/failed), never for
// actually crediting anything, exactly the same division already
// established for the Flutterwave version this replaces.
//
// Signature verification requires the RAW request body, not JSON-parsed,
// Stripe's signature is computed over the exact bytes sent, parsing and
// re-serializing first (even if it looks identical) breaks verification.

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import {
  getTicketType,
  getCommissionRate,
  PERFORMANCE_TIER_SALES_THRESHOLD,
  PERFORMANCE_TIER_WINDOW_DAYS,
  STRATEGIC_TIER_WINDOW_DAYS,
  qualifiesForStrategicTier,
  REFERRAL_BONUS_RATE,
  type CommissionTier,
} from '@/lib/affiliate/affiliate-commission'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Real, direct use of fx_rates_cache, the same table 004_fx_rates_cache.sql
// already built tonight for price display, rate_to_usd means 1 USD =
// rate_to_usd units of that currency, confirmed against the migration's
// own real schema and comment, so converting local currency to USD is
// amount / rate_to_usd, not the other way around. Deliberately not the
// same live rate lib/flutterwave/payouts.ts uses for actual checkout
// pricing, that function goes the opposite direction, USD to local, and
// a webhook needs to respond to Stripe quickly and reliably, not risk a
// second network call's latency or failure on every single event. The
// cached rate is periodically refreshed, not live-to-the-second, a
// real, honest, reasonable accuracy bar for internal revenue reporting,
// clearly better than a permanent, unconverted null.
async function convertToUsd(amount: number, currency: string): Promise<number | null> {
  const normalized = (currency || '').toLowerCase()
  if (normalized === 'usd') return amount
  try {
    const { data, error } = await supabaseAdmin
      .from('fx_rates_cache')
      .select('rate_to_usd')
      .eq('currency', normalized.toUpperCase())
      .maybeSingle()
    if (error || !data?.rate_to_usd) {
      // Real, honest gap, not silently treated as zero, this specific
      // currency genuinely isn't in the cache, logged so it's visible
      // rather than quietly lost.
      console.warn(`No cached FX rate found for ${currency}, amount_usd left null for this event`)
      return null
    }
    return amount / Number(data.rate_to_usd)
  } catch (e) {
    console.error('FX conversion lookup failed:', e)
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// Real, single, shared commission-crediting logic, genuinely new
// here. Confirmed missing entirely from this webhook, the one real,
// live path a Stripe purchase actually takes, ref_code was being
// captured and stored on both purchases and revenue_events, but never
// once used to credit an affiliate anywhere in this file. A separate,
// careful, correctly-tiered implementation already existed in
// app/api/user/add-purchase/route.ts, but that route is confirmed
// called by nothing in the live frontend, dead code sitting alongside
// a real, live gap. This ports the real, correct logic into the file
// that actually runs.
//
// Deliberately does NOT include add-purchase's Flutterwave
// first-payout trigger, that's a real, separate payment-provider
// integration, for a system currently on Stripe, not Flutterwave, for
// disbursement. This function credits and records the real, pending
// balance, actually paying it out is a genuinely separate, not-yet-
// defined step, left honestly unbuilt here rather than guessed at.
// ─────────────────────────────────────────────────────────────

interface CommissionResult {
  affiliateUserId: string  // users.id, the real, live affiliate identity
}

async function creditAffiliateCommission(params: {
  refCode:         string
  linkId:          string | null
  toolId:          string
  toolName:        string
  saleAmountUsd:   number
  stripeSessionId: string
  isRecurring:     boolean
}): Promise<CommissionResult | null> {
  const { refCode, linkId, toolId, toolName, saleAmountUsd, stripeSessionId, isRecurring } = params

  // Real, confirmed source of truth for affiliate identity, users, not
  // affiliate_profiles. Confirmed directly, affiliate_profiles has zero
  // rows, ever, while users.referral_code is populated by the real,
  // live on_auth_user_created trigger the moment a real account is
  // created, and credit_commission itself, the real function every
  // real payment already runs through, updates users.pending_balance
  // directly. affiliate_profiles was never the real, live table.
  const { data: affiliate, error: affError } = await supabaseAdmin
    .from('users')
    .select('id, affiliate_status, pending_balance, total_paid_out')
    .eq('referral_code', refCode)
    .maybeSingle()

  if (affError || !affiliate) {
    console.warn(`[commission] No affiliate found for ref_code: ${refCode}`)
    return null
  }
  if (affiliate.affiliate_status !== 'active') {
    console.log(`[commission] Affiliate ${refCode} not eligible, affiliate_status=${affiliate.affiliate_status}`)
    return null
  }

  // Idempotency, this exact Stripe event id already has its own real
  // conversion row, Stripe can and does redeliver webhooks, never
  // credit the same sale twice.
  const { data: existing } = await supabaseAdmin
    .from('affiliate_conversions')
    .select('id')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle()

  if (existing) {
    console.log(`[commission] Session ${stripeSessionId} already credited, skipping`)
    return null
  }

  // Real tier, using the same automatic Strategic trigger the
  // dashboard itself now computes, replacing manual, email-based
  // approval entirely, "no longer make any sense... want everything
  // done and completed." Two independent, real paths, sustained
  // volume or lifetime earnings, whichever comes first, both fully
  // automatic. No manual commission_rate override here, users has no
  // such real column, that path would need a genuine, new field added
  // first, not guessed at.
  const strategicWindowStart = new Date(Date.now() - STRATEGIC_TIER_WINDOW_DAYS * 86400000).toISOString()
  const { count: strategicWindowSales } = await supabaseAdmin
    .from('affiliate_conversions')
    .select('id', { count: 'exact', head: true })
    .eq('affiliate_id', affiliate.id)
    .gte('created_at', strategicWindowStart)

  // Real, live lifetime earnings, approximated from the two real,
  // confirmed balance fields users actually has, current pending
  // balance plus everything already paid out, rather than a
  // total_earned column that doesn't exist on this table.
  const lifetimeEarnings = (affiliate.pending_balance || 0) + (affiliate.total_paid_out || 0)

  const isStrategicTier = qualifiesForStrategicTier({
    salesInWindow:    strategicWindowSales || 0,
    lifetimeEarnings,
  })

  let commissionRate: number

  if (isStrategicTier) {
    const ticketType = getTicketType(saleAmountUsd)
    const resolvedTicket = ticketType === 'undefined-band' ? 'low' : ticketType
    commissionRate = getCommissionRate('strategic', resolvedTicket)
  } else {
    const windowStart = new Date(Date.now() - PERFORMANCE_TIER_WINDOW_DAYS * 86400000).toISOString()
    const { count: recentSales } = await supabaseAdmin
      .from('affiliate_conversions')
      .select('id', { count: 'exact', head: true })
      .eq('affiliate_id', affiliate.id)
      .gte('created_at', windowStart)

    const tier: CommissionTier = (recentSales || 0) >= PERFORMANCE_TIER_SALES_THRESHOLD
      ? 'performance'
      : 'standard'

    const ticketType = getTicketType(saleAmountUsd)
    // Real, known gap, see affiliate-commission.ts's own header, a
    // sale between $30 and $36 has no defined band in the real,
    // agreed rules. Defaults to the lower, more conservative rate
    // rather than silently paying nothing, or failing, on a real sale.
    const resolvedTicket = ticketType === 'undefined-band' ? 'low' : ticketType
    commissionRate = getCommissionRate(tier, resolvedTicket)
  }

  const commissionAmount = Math.round(saleAmountUsd * (commissionRate / 100) * 100) / 100

  const { data: conversion, error: convError } = await supabaseAdmin
    .from('affiliate_conversions')
    .insert({
      affiliate_id:      affiliate.id,
      link_id:           linkId || null,
      tool_id:           toolId,
      tool_name:         toolName,
      ref_code:          refCode,
      stripe_session_id: stripeSessionId,
      purchase_amount:   saleAmountUsd,
      commission_rate:   commissionRate,
      commission_amount: commissionAmount,
      is_recurring:      isRecurring,
      status:            'pending',
      created_at:        new Date().toISOString(),
    })
    .select('id')
    .single()

  if (convError || !conversion) {
    console.error('[commission] Conversion insert error:', convError)
    return null
  }

  const { error: rpcError } = await supabaseAdmin.rpc('credit_commission', {
    p_affiliate_id:      affiliate.id,
    p_conversion_id:     conversion.id,
    p_purchase_amount:   saleAmountUsd,
    p_commission_amount: commissionAmount,
  })

  if (rpcError) {
    // The conversion row itself still exists either way, real,
    // visible, and correctable later, not silently lost.
    console.error('[commission] credit_commission RPC error:', rpcError)
  }

  await supabaseAdmin.from('notifications').insert({
    user_id:    affiliate.id,
    type:       'affiliate_conversion',
    title:      'New Sale!',
    message:    `Someone purchased ${toolName} using your link. You earned $${commissionAmount.toFixed(2)}.`,
    data:       { conversion_id: conversion.id, amount: commissionAmount },
    read:       false,
    created_at: new Date().toISOString(),
  }).then(() => {}).catch(() => {})

  console.log(`[commission] Credited $${commissionAmount} (${commissionRate}%) to affiliate ${refCode}`)

  return { affiliateUserId: affiliate.id }
}

// ─────────────────────────────────────────────────────────────
// Real, single-hop referral bonus, matches the system agreed
// directly: REFERRAL_BONUS_RATE of the recruit's sale, paid to their
// direct recruiter only, never further up any chain, and only once
// both the recruiter and the recruit have a real, qualifying sale of
// their own. Runs after creditAffiliateCommission above has already
// recorded the recruit's own sale, so "the recruit has a qualifying
// sale" is already true by the time this checks the recruiter's side.
// ─────────────────────────────────────────────────────────────

async function creditReferralBonus(params: {
  recruitAffiliateUserId: string
  toolId:                 string
  toolName:                string
  saleAmountUsd:           number
  stripeSessionId:         string
}) {
  const { recruitAffiliateUserId, toolId, toolName, saleAmountUsd, stripeSessionId } = params

  const { data: recruitUser } = await supabaseAdmin
    .from('users')
    .select('recruited_by')
    .eq('id', recruitAffiliateUserId)
    .maybeSingle()

  const recruiterCode = recruitUser?.recruited_by
  if (!recruiterCode) return

  const { data: recruiter } = await supabaseAdmin
    .from('users')
    .select('id, affiliate_status')
    .eq('referral_code', recruiterCode)
    .maybeSingle()

  if (!recruiter || recruiter.affiliate_status !== 'active') return

  // Both sides must have at least one real, qualifying sale, not a
  // recruitment-only payout at either end. The recruit's was just
  // recorded above, this confirms the recruiter genuinely has one too.
  const { count: recruiterSales } = await supabaseAdmin
    .from('affiliate_conversions')
    .select('id', { count: 'exact', head: true })
    .eq('affiliate_id', recruiter.id)

  if (!recruiterSales || recruiterSales < 1) return

  // Distinct idempotency key from the direct commission row above,
  // both real rows share the same underlying Stripe event id, must
  // not collide.
  const bonusSessionId = `${stripeSessionId}_referral`

  const { data: existing } = await supabaseAdmin
    .from('affiliate_conversions')
    .select('id')
    .eq('stripe_session_id', bonusSessionId)
    .maybeSingle()

  if (existing) return

  const bonusAmount = Math.round(saleAmountUsd * (REFERRAL_BONUS_RATE / 100) * 100) / 100

  const { data: bonusConversion } = await supabaseAdmin
    .from('affiliate_conversions')
    .insert({
      affiliate_id:      recruiter.id,
      link_id:           null,
      tool_id:           toolId,
      tool_name:         toolName,
      ref_code:          recruiterCode,
      stripe_session_id: bonusSessionId,
      purchase_amount:   saleAmountUsd,
      commission_rate:   REFERRAL_BONUS_RATE,
      commission_amount: bonusAmount,
      is_recurring:      false,
      status:            'pending',
      created_at:        new Date().toISOString(),
    })
    .select('id')
    .single()

  if (!bonusConversion) return

  await supabaseAdmin.rpc('credit_commission', {
    p_affiliate_id:      recruiter.id,
    p_conversion_id:     bonusConversion.id,
    p_purchase_amount:   saleAmountUsd,
    p_commission_amount: bonusAmount,
  })

  await supabaseAdmin.from('notifications').insert({
    user_id:    recruiter.id,
    type:       'affiliate_referral_bonus',
    title:      'Referral Bonus Earned!',
    message:    `A partner you recruited made a sale. You earned $${bonusAmount.toFixed(2)} in referral bonus.`,
    data:       { conversion_id: bonusConversion.id, amount: bonusAmount },
    read:       false,
    created_at: new Date().toISOString(),
  }).then(() => {}).catch(() => {})

  console.log(`[referral] Bonus $${bonusAmount} (${REFERRAL_BONUS_RATE}%) credited to recruiter ${recruiterCode}`)
}

export async function POST(request: NextRequest) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe webhook received but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // Raw body, required for signature verification, request.json() here
  // would parse and re-serialize, which breaks the signature check even
  // though the data looks the same.
  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const txRef = session.client_reference_id

    if (!txRef) {
      // A completed session with no client_reference_id shouldn't
      // happen given initiateCheckout() always sets it, but fail loud
      // rather than silently doing nothing if it ever does.
      console.error('checkout.session.completed received with no client_reference_id', session.id)
      return NextResponse.json({ received: true, warning: 'no tx_ref on session' })
    }

    const { data: pending, error: lookupError } = await supabaseAdmin
      .from('pending_checkouts')
      .select('id, status, tool_id, tool_name, tool_type, category, job_id, email, user_id, usd_equivalent, ref_code')
      .eq('tx_ref', txRef)
      .maybeSingle()

    if (lookupError || !pending) {
      console.error('No matching pending_checkouts row for tx_ref:', txRef, lookupError)
      return NextResponse.json({ received: true, warning: 'no matching pending_checkouts row' })
    }

    // Idempotent: Stripe can and does redeliver webhooks, if this
    // tx_ref was already marked completed by an earlier delivery of the
    // same event, do nothing further rather than double-processing.
    if (pending.status === 'completed') {
      return NextResponse.json({ received: true, note: 'already processed' })
    }

    // The purchase page's own email field is optional now, Stripe's
    // hosted checkout page asks for one as a normal part of paying
    // regardless, session.customer_details.email is that real, genuinely
    // confirmed address. Only fills the gap if nothing was already
    // captured earlier, never overwrites a value someone actually
    // provided upfront.
    const stripeEmail = session.customer_details?.email
    const emailUpdate = !pending.email && stripeEmail ? { email: stripeEmail } : {}

    const { error: updateError } = await supabaseAdmin
      .from('pending_checkouts')
      .update({ status: 'completed', completed_at: new Date().toISOString(), ...emailUpdate })
      .eq('tx_ref', txRef)

    if (updateError) {
      console.error('Failed to mark pending_checkouts completed for tx_ref:', txRef, updateError)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }

    // The real, missing piece, confirmed missing by tracing every file
    // in this entire checkout flow: nothing anywhere ever wrote to
    // purchases, the exact table /member/dashboard reads from. Payment
    // could succeed, a reading could generate and email correctly, and
    // the dashboard would still show zero purchases regardless, because
    // this row never existed. This is the one place with genuine,
    // trusted, server-confirmed payment success, the right place for it
    // to happen.
    //
    // purchases.user_id is a genuine UUID-typed column, matching real
    // Supabase accounts, confirmed against real production data: every
    // purchase made while already logged in correctly got a row here,
    // every guest purchase, pending.user_id holding a device id string
    // like "device_abc123", not a real UUID at all, silently failed the
    // insert outright, caught, logged, and swallowed, never visibly
    // breaking anything while quietly never writing. A guest purchase
    // has no real account yet at this exact moment for this row to
    // meaningfully belong to anyway, so it's skipped here entirely
    // rather than attempted and quietly failed, and created for real
    // once app/api/purchase/attach-account actually has a genuine
    // account to attach it to.
    const resolvedEmail = stripeEmail || pending.email || null
    const isGuestPurchase = pending.user_id?.startsWith('device_')

    // Real, Stripe-managed subscription, session.subscription only
    // exists when this checkout genuinely ran in mode: 'subscription',
    // confirmed against Stripe's own API shape, absent entirely for a
    // one-time payment session. Stored here so invoice.paid,
    // invoice.payment_failed, and customer.subscription.deleted below
    // all have a real, reliable way to find which purchases row a
    // given subscription event actually belongs to.
    const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null
    const stripeCustomerId     = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null

    if (!isGuestPurchase) {
      // Upserted, not inserted, purchases has a real unique constraint on
      // (user_id, tool_id), confirmed from the actual database indexes, a
      // plain insert would fail outright on any legitimate second
      // purchase of the same tool by the same account.
      const { error: purchaseError } = await supabaseAdmin
        .from('purchases')
        .upsert({
          user_id:        pending.user_id,
          tool_id:        pending.tool_id,
          tool_name:      pending.tool_name,
          tool_type:      pending.tool_type,
          category:       pending.category,
          price:          pending.usd_equivalent,
          status:         'active',
          purchase_date:  new Date().toISOString(),
          job_id:         pending.job_id,
          user_email:     resolvedEmail,
          ref_code:       pending.ref_code,
          ...(stripeSubscriptionId ? {
            stripe_subscription_id: stripeSubscriptionId,
            stripe_customer_id:     stripeCustomerId,
            auto_renew:             true,
          } : {}),
        }, { onConflict: 'user_id,tool_id' })

      if (purchaseError) {
        // Logged loudly, not returned as a failure to Stripe, the payment
        // itself genuinely succeeded and pending_checkouts is already
        // correctly marked completed, Stripe shouldn't be told to retry
        // over a downstream bookkeeping problem it can't fix by resending
        // the same event again.
        console.error('Failed to upsert purchases row for tx_ref:', txRef, purchaseError)
      }
    }

    // Real, dedicated revenue ledger insert, deliberately outside the
    // isGuestPurchase check above, real money changed hands here
    // regardless of whether the buyer has a Supabase account yet,
    // purchases correctly skips the guest row (no valid UUID to write
    // against), but revenue itself shouldn't ever depend on account
    // status. user_id is left null for guests, the same honest
    // handling as purchases.
    const { error: revenueError } = await supabaseAdmin
      .from('revenue_events')
      .insert({
        user_id:                  isGuestPurchase ? null : pending.user_id,
        tool_id:                  pending.tool_id,
        tool_name:                pending.tool_name,
        event_type:                'purchase',
        amount_usd:                pending.usd_equivalent,
        currency_charged:          pending.currency,
        amount_charged:            pending.amount_charged,
        stripe_subscription_id:    stripeSubscriptionId,
        stripe_payment_intent_id:  typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
        ref_code:                  pending.ref_code,
      })

    if (revenueError) {
      // Same reasoning as the purchases upsert above, logged loudly,
      // not returned as a failure to Stripe, the payment itself
      // genuinely succeeded.
      console.error('Failed to insert revenue_events row for tx_ref:', txRef, revenueError)
    }

    // Real, genuinely new, commission crediting, confirmed missing
    // entirely from this file before now, ref_code was captured and
    // stored above, on both purchases and revenue_events, but never
    // once used to credit anyone. Wrapped so a real, separate
    // bookkeeping problem here can never block the payment itself,
    // which has already, genuinely succeeded by this point.
    if (pending.ref_code) {
      try {
        const commissionResult = await creditAffiliateCommission({
          refCode:         pending.ref_code,
          linkId:          null,
          toolId:          pending.tool_id,
          toolName:        pending.tool_name,
          saleAmountUsd:   pending.usd_equivalent,
          stripeSessionId: session.id,
          isRecurring:     false,
        })
        if (commissionResult) {
          await creditReferralBonus({
            recruitAffiliateUserId: commissionResult.affiliateUserId,
            toolId:                 pending.tool_id,
            toolName:               pending.tool_name,
            saleAmountUsd:          pending.usd_equivalent,
            stripeSessionId:        session.id,
          })
        }
      } catch (commissionErr) {
        console.error('[commission] Error crediting commission for tx_ref:', txRef, commissionErr)
      }
    }

    // pending.job_id references the reading job already created at
    // checkout-initiation time (see pending_checkouts schema comment).
    // Whatever actually kicks that job from "created" to "processing"
    // is the synthesis engine's own job-polling logic, not this
    // webhook, mirroring how the Flutterwave version handed off in the
    // same way rather than triggering generation directly here.
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    const txRef = session.client_reference_id
    if (txRef) {
      await supabaseAdmin
        .from('pending_checkouts')
        .update({ status: 'failed' })
        .eq('tx_ref', txRef)
        .eq('status', 'pending') // only touch it if still pending, never overwrite an already-completed row
    }
  }

  // ── Real, Stripe-managed subscription lifecycle events ───────────────
  // Everything below only fires for genuine subscription checkouts,
  // confirmed by stripe_subscription_id existing on the purchases row
  // at all, previously nothing in this codebase listened for any of
  // these three events, every subscription tool was a one-time charge
  // that simply never renewed, cancelled, or expired on its own.

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id

    // The very first invoice, the one tied to initial checkout, is
    // already handled by checkout.session.completed above, acting on
    // it again here would just be redundant, not wrong, but genuinely
    // unnecessary. billing_reason distinguishes a real renewal from
    // that first invoice.
    if (subscriptionId && invoice.billing_reason === 'subscription_cycle') {
      const periodEnd = invoice.lines?.data?.[0]?.period?.end
      const newExpiresAt = periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data: purchaseRow } = await supabaseAdmin
        .from('purchases')
        .select('user_id, tool_id, tool_name, ref_code')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle()

      await supabaseAdmin
        .from('purchases')
        .update({
          status:     'active',
          expires_at: newExpiresAt,
        })
        .eq('stripe_subscription_id', subscriptionId)

      if (purchaseRow) {
        await supabaseAdmin.from('subscription_events').insert({
          user_id:    purchaseRow.user_id,
          tool_id:    purchaseRow.tool_id,
          event_type: 'renewed',
          created_at: new Date().toISOString(),
        }).then(() => {}).catch(() => {}) // analytics only, never block the real update above on this

        // Real conversion now, using fx_rates_cache directly, see
        // convertToUsd()'s own comment above for exactly why this is
        // the cached rate, not a live one, and why that's an honest,
        // reasonable bar for internal revenue reporting.
        const chargedAmount = invoice.amount_paid / 100
        const convertedUsd  = await convertToUsd(chargedAmount, invoice.currency)

        const { error: revenueError } = await supabaseAdmin
          .from('revenue_events')
          .insert({
            user_id:                  purchaseRow.user_id,
            tool_id:                  purchaseRow.tool_id,
            tool_name:                purchaseRow.tool_name,
            event_type:                'renewal',
            amount_usd:                convertedUsd,
            currency_charged:          invoice.currency,
            amount_charged:            chargedAmount,
            stripe_subscription_id:    subscriptionId,
            stripe_payment_intent_id:  typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id ?? null,
            ref_code:                  purchaseRow.ref_code,
          })

        if (revenueError) {
          console.error('Failed to insert renewal revenue_events row for subscription:', subscriptionId, revenueError)
        }

        // Real, genuinely new, the same commission logic as the first
        // sale above, applied here for a genuine renewal, ref_code was
        // already being carried on purchaseRow, but never used for
        // this either.
        if (purchaseRow.ref_code) {
          try {
            const commissionResult = await creditAffiliateCommission({
              refCode:         purchaseRow.ref_code,
              linkId:          null,
              toolId:          purchaseRow.tool_id,
              toolName:        purchaseRow.tool_name,
              saleAmountUsd:   convertedUsd ?? chargedAmount,
              stripeSessionId: invoice.id,
              isRecurring:     true,
            })
            if (commissionResult) {
              await creditReferralBonus({
                recruitAffiliateUserId: commissionResult.affiliateUserId,
                toolId:                 purchaseRow.tool_id,
                toolName:               purchaseRow.tool_name,
                saleAmountUsd:          convertedUsd ?? chargedAmount,
                stripeSessionId:        invoice.id,
              })
            }
          } catch (commissionErr) {
            console.error('[commission] Error crediting renewal commission for subscription:', subscriptionId, commissionErr)
          }
        }
      }
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id

    // Stripe's own Smart Retries schedule handles reattempting the
    // charge automatically over the following days, access is
    // deliberately NOT revoked here, Stripe hasn't actually given up
    // yet at this point, only customer.subscription.deleted below,
    // fired once Stripe's own retries are genuinely exhausted, is the
    // real, correct signal that access should actually end. This event
    // is logged for visibility only.
    if (subscriptionId) {
      const { data: purchaseRow } = await supabaseAdmin
        .from('purchases')
        .select('user_id, tool_id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle()

      console.warn('Subscription renewal payment failed, Stripe will retry automatically:', subscriptionId)

      if (purchaseRow) {
        await supabaseAdmin.from('subscription_events').insert({
          user_id:    purchaseRow.user_id,
          tool_id:    purchaseRow.tool_id,
          event_type: 'payment_failed',
          created_at: new Date().toISOString(),
        }).then(() => {}).catch(() => {})
      }
    }
  }

  if (event.type === 'customer.subscription.updated') {
    // The real, missing piece, found by reading Stripe's own testing
    // documentation directly, not previously known. Now that
    // cancellation lives entirely on Stripe's hosted Customer Portal,
    // clicking "cancel" there sets cancel_at_period_end = true and
    // fires exactly this event, not customer.subscription.deleted,
    // that one only fires later, once the period genuinely ends.
    // Without this handler, a real cancellation made through the
    // portal would be invisible here until weeks later, purchases
    // would keep showing "active" the whole time despite Stripe
    // already knowing otherwise. The same event also fires if someone
    // un-cancels through the portal before the period ends,
    // cancel_at_period_end flips back to false, handled the same way,
    // symmetrically, below.
    const subscription = event.data.object as Stripe.Subscription

    const { data: purchaseRow } = await supabaseAdmin
      .from('purchases')
      .select('id, user_id, tool_id, status')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle()

    if (purchaseRow) {
      const periodEnd = (subscription as any).current_period_end
      const expiresAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null

      if (subscription.cancel_at_period_end && purchaseRow.status === 'active') {
        await supabaseAdmin
          .from('purchases')
          .update({
            status:       'cancelled',
            auto_renew:   false,
            cancelled_at: new Date().toISOString(),
            ...(expiresAt ? { expires_at: expiresAt } : {}),
          })
          .eq('id', purchaseRow.id)

        await supabaseAdmin.from('subscription_events').insert({
          user_id:    purchaseRow.user_id,
          tool_id:    purchaseRow.tool_id,
          event_type: 'cancelled',
          created_at: new Date().toISOString(),
        }).then(() => {}).catch(() => {})
      } else if (!subscription.cancel_at_period_end && purchaseRow.status === 'cancelled') {
        // Un-cancelled through the portal before the period ended,
        // same real state Stripe itself now reflects, mirrored here.
        await supabaseAdmin
          .from('purchases')
          .update({
            status:         'active',
            auto_renew:     true,
            reactivated_at: new Date().toISOString(),
            cancelled_at:   null,
            ...(expiresAt ? { expires_at: expiresAt } : {}),
          })
          .eq('id', purchaseRow.id)

        await supabaseAdmin.from('subscription_events').insert({
          user_id:    purchaseRow.user_id,
          tool_id:    purchaseRow.tool_id,
          event_type: 'reactivated',
          created_at: new Date().toISOString(),
        }).then(() => {}).catch(() => {})
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription

    // The real, definitive end, whether from a customer's own
    // cancel_at_period_end request finally reaching that period end, or
    // from Stripe's retry schedule genuinely exhausting itself after
    // invoice.payment_failed. Access ends now, immediately, not at some
    // future expires_at, Stripe itself has already decided this
    // subscription is over.
    const { data: purchaseRow } = await supabaseAdmin
      .from('purchases')
      .select('user_id, tool_id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle()

    await supabaseAdmin
      .from('purchases')
      .update({
        status:     'expired',
        auto_renew: false,
      })
      .eq('stripe_subscription_id', subscription.id)

    if (purchaseRow) {
      await supabaseAdmin.from('subscription_events').insert({
        user_id:    purchaseRow.user_id,
        tool_id:    purchaseRow.tool_id,
        event_type: 'expired',
        created_at: new Date().toISOString(),
      }).then(() => {}).catch(() => {})
    }
  }

  // ── Real refund tracking, genuinely new, nothing anywhere in this
  // codebase previously listened for this event at all ──────────────
  // charge.refunded is Stripe's own real event, it fires regardless of
  // how the refund was actually initiated, the Stripe dashboard
  // directly, an admin panel action calling Stripe's refund API,
  // anything, this is the one, reliably correct place to capture a
  // real refund rather than guessing at every possible path that could
  // trigger one.
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge

    // amount_refunded, like amount_paid elsewhere, is Stripe's own
    // real field, in the smallest currency unit, converted using the
    // same real, cached rate as the renewal event above.
    const refundedAmount = charge.amount_refunded / 100
    const convertedUsd   = await convertToUsd(refundedAmount, charge.currency)

    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null

    // Real, direct lookup, matching this specific charge back to the
    // original purchase event already recorded, so the refund can
    // carry the same tool_id, tool_name, and user_id, without
    // requiring Stripe to send that context again on this event.
    const { data: originalEvent } = await supabaseAdmin
      .from('revenue_events')
      .select('user_id, tool_id, tool_name, ref_code')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('event_type', 'purchase')
      .maybeSingle()

    const { error: revenueError } = await supabaseAdmin
      .from('revenue_events')
      .insert({
        user_id:                  originalEvent?.user_id ?? null,
        tool_id:                  originalEvent?.tool_id ?? 'unknown',
        tool_name:                originalEvent?.tool_name ?? null,
        event_type:                'refund',
        // Negative, by design, see the migration's own comment, this
        // is what makes a single SUM(amount_usd) always correct.
        amount_usd:                convertedUsd !== null ? -convertedUsd : null,
        currency_charged:          charge.currency,
        amount_charged:            refundedAmount,
        stripe_charge_id:          charge.id,
        stripe_payment_intent_id:  paymentIntentId,
        ref_code:                  originalEvent?.ref_code ?? null,
      })

    if (revenueError) {
      console.error('Failed to insert refund revenue_events row for charge:', charge.id, revenueError)
    }

    // Mirrors the real status, matching how the RevenuePage admin file
    // already, correctly, expects to find refunded purchases,
    // confirmed directly against its own status==='refunded' filter.
    // Matched by user_id + tool_id, purchases has no payment-intent
    // column to match against directly, confirmed against its real,
    // current schema, this pair is the same real unique constraint
    // already relied on throughout this whole file's other upserts.
    if (originalEvent?.user_id && originalEvent?.tool_id) {
      await supabaseAdmin
        .from('purchases')
        .update({ status: 'refunded' })
        .eq('user_id', originalEvent.user_id)
        .eq('tool_id', originalEvent.tool_id)
        .then(() => {}).catch(() => {})
    }
  }

  return NextResponse.json({ received: true })
}
