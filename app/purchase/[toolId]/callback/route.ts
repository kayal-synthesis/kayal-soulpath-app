// app/purchase/[toolId]/callback/route.ts
//
// Where the customer's browser lands after paying (or cancelling) on
// Stripe's hosted page. This does a best-effort verification purely
// to decide which screen to show the customer right now, it does NOT
// create the purchase record, credit commission, or trigger reading
// generation. That only ever happens in app/api/webhooks/stripe's
// checkout.session.completed handler, once Stripe's own server-to-server
// confirmation arrives, which is not something a redirect, fully
// controllable by the customer's browser, should ever be trusted for.
//
// In the ordinary case the webhook arrives before or around the same
// time as this redirect, so pending_checkouts may already show
// 'completed' here. If it doesn't yet, this shows a "confirming" state
// rather than a failure, since the payment may simply still be in
// flight server-side.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyTransaction } from '@/lib/stripe/checkout'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest, { params }: { params: { toolId: string } }) {
  const searchParams = request.nextUrl.searchParams
  const txRef         = searchParams.get('tx_ref')
  // Stripe substitutes {CHECKOUT_SESSION_ID} into success_url with the
  // real session id, session_id here, not transaction_id, Flutterwave's
  // naming, which never matched what Stripe actually sends, silently
  // leaving the live-verification fallback below unreachable.
  const sessionId = searchParams.get('session_id')
  const status    = searchParams.get('status') // Stripe's own redirect param, informational only, never trusted for fulfillment

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  if (!txRef) {
    return NextResponse.redirect(`${appUrl}/purchase/${params.toolId}?error=missing_reference`)
  }

  const { data: pending } = await supabaseAdmin
    .from('pending_checkouts')
    .select('status')
    .eq('tx_ref', txRef)
    .maybeSingle()

  // Already confirmed by the webhook, likely arrived first or at the
  // same time, safe to send straight to the real confirmation page.
  if (pending?.status === 'completed') {
    return NextResponse.redirect(`${appUrl}/purchase/${params.toolId}/confirmation?tx_ref=${txRef}`)
  }

  if (pending?.status === 'failed' || status === 'cancelled') {
    return NextResponse.redirect(`${appUrl}/purchase/${params.toolId}?error=payment_failed`)
  }

  // Not yet confirmed by webhook. Do a best-effort live check purely to
  // decide what to show right now, this does not write anything.
  if (sessionId) {
    const verification = await verifyTransaction(sessionId)
    if (verification.status === 'failed') {
      return NextResponse.redirect(`${appUrl}/purchase/${params.toolId}?error=payment_failed`)
    }
  }

  // Genuinely still pending, most likely the webhook just hasn't arrived
  // yet. Send to a waiting screen that polls pending_checkouts status,
  // rather than either a false success or a false failure.
  return NextResponse.redirect(`${appUrl}/purchase/${params.toolId}/confirming?tx_ref=${txRef}`)
}
