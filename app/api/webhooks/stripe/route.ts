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
      .select('id, status, tool_id, job_id, email')
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
