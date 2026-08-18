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

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

  return NextResponse.json({ received: true })
}
