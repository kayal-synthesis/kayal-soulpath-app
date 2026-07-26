// app/api/webhooks/flutterwave/route.ts
//
// This is the only place in the whole system where a payout actually
// gets marked complete. Neither the instant first-payout trigger in
// route.ts nor the monthly batch job finalize anything themselves
// anymore, both only record a pending attempt and wait for this handler
// to hear back from Flutterwave with the real outcome.
//
// Verification is a direct string comparison against the verif-hash
// header, not an HMAC signature, confirmed explicitly rather than
// assumed, since HMAC is the more common pattern with other providers
// and would be the natural, wrong guess here.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyFlutterwaveWebhook } from '@/lib/flutterwave/payouts'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const receivedHash = request.headers.get('verif-hash')

  if (!verifyFlutterwaveWebhook(receivedHash)) {
    console.error('[webhooks/flutterwave] Verification failed, rejecting')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Transfer events (affiliate payouts) and charge events (customer
  // checkout) both land on this same webhook URL, Flutterwave sends
  // every subscribed event type here, so this routes to the right
  // handling logic based on which one arrived.
  if (payload?.event === 'charge.completed' || payload?.event === 'charge.failed') {
    return handleChargeEvent(payload, request)
  }

  if (payload?.event !== 'transfer.completed' && payload?.event !== 'transfer.failed') {
    return NextResponse.json({ received: true, ignored: true })
  }

  const reference = payload?.data?.reference
  const status    = payload?.data?.status // "SUCCESSFUL" or "FAILED"

  if (!reference) {
    console.error('[webhooks/flutterwave] No reference in payload')
    return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
  }

  try {
    const { data: payoutRecord } = await supabaseAdmin
      .from('affiliate_payouts')
      .select('*')
      .eq('reference', reference)
      .maybeSingle()

    if (!payoutRecord) {
      // A webhook for a reference we have no record of, log it, do not
      // error loudly, Flutterwave will retry webhooks that fail, and we
      // do not want to trigger retries for something that will never
      // resolve to a record we recognize.
      console.error(`[webhooks/flutterwave] No payout record for reference ${reference}`)
      return NextResponse.json({ received: true, unmatched: true })
    }

    if (payoutRecord.status !== 'pending') {
      // Already processed, webhooks can legitimately arrive more than
      // once, this must not double-apply the balance change.
      return NextResponse.json({ received: true, already_processed: true })
    }

    if (status === 'SUCCESSFUL') {
      await supabaseAdmin
        .from('affiliate_payouts')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', payoutRecord.id)

      const updates: Record<string, any> = {
        pending_payout:  0,
        last_payout_at:  new Date().toISOString(),
      }
      if (payoutRecord.kind === 'first') {
        updates.payout_activated = true
      }

      // total_paid_out incremented via a real running total, adjust if
      // your schema tracks this differently, e.g. via a database
      // function that sums affiliate_payouts directly instead of
      // maintaining a separate counter column.
      const { data: profile } = await supabaseAdmin
        .from('affiliate_profiles')
        .select('total_paid_out')
        .eq('id', payoutRecord.affiliate_id)
        .single()

      updates.total_paid_out = (profile?.total_paid_out || 0) + Number(payoutRecord.amount_usd)

      await supabaseAdmin
        .from('affiliate_profiles')
        .update(updates)
        .eq('id', payoutRecord.affiliate_id)

      await supabaseAdmin.from('notifications').insert({
        user_id:    payoutRecord.user_id,
        type:       'affiliate_payout',
        title:      '💰 Payout Confirmed!',
        message:    `Your payout of ${payoutRecord.amount_local} ${payoutRecord.currency} has been delivered.`,
        data:       { payout_id: payoutRecord.id },
        read:       false,
        created_at: new Date().toISOString(),
      })
    } else if (status === 'FAILED') {
      await supabaseAdmin
        .from('affiliate_payouts')
        .update({
          status:         'failed',
          failure_reason: payload?.data?.complete_message || 'Transfer failed',
          completed_at:   new Date().toISOString(),
        })
        .eq('id', payoutRecord.id)

      // Balance is deliberately left untouched, the affiliate's
      // pending_payout still reflects reality, nothing was actually
      // delivered, this needs a human to look at, not a silent retry.
      await supabaseAdmin.from('admin_logs').insert({
        admin_id:   null,
        action:     'payout_failed',
        resource:   payoutRecord.user_id,
        details:    { reference, reason: payload?.data?.complete_message, amount: payoutRecord.amount_local },
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ received: true, processed: true })
  } catch (err: any) {
    console.error('[webhooks/flutterwave] Processing error:', err)
    // Return 500 so Flutterwave retries, this failure was on our side,
    // not a reason to tell Flutterwave to stop trying.
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// Charge events — customer checkout confirmation. This is the only
// place in the whole system that fulfills a purchase: creates the real
// purchase record, credits commission (direct and Tier-2 override),
// checks the first-payout threshold, all of it, by calling the existing,
// already-tested /api/user/add-purchase endpoint server-to-server, once
// payment is genuinely confirmed. Nothing about fulfillment happens from
// the client-side purchase flow or the customer-facing callback route
// anymore, both of those only ever show the customer a screen, they
// never write anything that matters.
// ─────────────────────────────────────────────────────────────

async function handleChargeEvent(payload: any, request: NextRequest) {
  const txRef  = payload?.data?.tx_ref
  const status = payload?.data?.status // "successful" or "failed"

  if (!txRef) {
    console.error('[webhooks/flutterwave] Charge event with no tx_ref')
    return NextResponse.json({ error: 'Missing tx_ref' }, { status: 400 })
  }

  try {
    const { data: pending } = await supabaseAdmin
      .from('pending_checkouts')
      .select('*')
      .eq('tx_ref', txRef)
      .maybeSingle()

    if (!pending) {
      console.error(`[webhooks/flutterwave] No pending checkout for tx_ref ${txRef}`)
      return NextResponse.json({ received: true, unmatched: true })
    }

    if (pending.status !== 'pending') {
      // Already processed, webhooks can legitimately arrive more than
      // once, this must never fulfill the same purchase twice.
      return NextResponse.json({ received: true, already_processed: true })
    }

    if (status === 'successful') {
      // Call the existing, already-tested purchase-fulfillment logic
      // server-to-server, reusing every bit of the commission, Tier-2
      // override, and first-payout logic already built and validated,
      // rather than duplicating any of it here.
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
      const fulfillResponse = await fetch(`${appUrl}/api/user/add-purchase`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:        pending.user_id,
          toolId:        pending.tool_id,
          toolName:      pending.tool_name,
          toolType:      pending.tool_type,
          category:      pending.category,
          price:         pending.usd_equivalent, // commission math stays USD-referenced regardless of charge currency
          originalPrice: pending.usd_equivalent,
          name:          pending.full_name,
          email:         pending.email,
          job_id:        pending.job_id,
          purchaseDate:  new Date().toISOString(),
          ref_code:      pending.ref_code,
        }),
      })

      if (!fulfillResponse.ok) {
        const errBody = await fulfillResponse.text()
        throw new Error(`Fulfillment call failed: ${fulfillResponse.status} ${errBody}`)
      }

      await supabaseAdmin
        .from('pending_checkouts')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('tx_ref', txRef)

    } else if (status === 'failed') {
      await supabaseAdmin
        .from('pending_checkouts')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('tx_ref', txRef)

      await supabaseAdmin.from('admin_logs').insert({
        admin_id:   null,
        action:     'checkout_failed',
        resource:   pending.email,
        details:    { tx_ref: txRef, tool_id: pending.tool_id, reason: payload?.data?.processor_response },
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ received: true, processed: true })
  } catch (err: any) {
    console.error('[webhooks/flutterwave] Charge processing error:', err)
    // Return 500 so Flutterwave retries, a failure here means the
    // customer paid but did not get fulfilled, that must not be treated
    // as a non-issue, it needs to keep retrying or be caught manually.
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
