// app/api/subscription/portal/route.ts
//
// Replaces app/api/subscription/cancel/route.ts entirely, which itself
// replaced api/subscription/cancel.py. Rather than maintaining custom
// cancel/reactivate logic, this hands the whole job to Stripe's own
// hosted Customer Portal, cancellation, reactivation, and payment
// method updates all happen on Stripe's page, not this site. The real
// subscription events, invoice.paid, invoice.payment_failed,
// customer.subscription.deleted, already handled in
// app/api/webhooks/stripe/route.ts, don't change at all, whatever a
// customer does in the portal still flows through those same, standard
// events.
//
// Required, one-time manual step, not something this code can do on
// its own: the portal must be configured in the Stripe Dashboard
// first, Settings → Billing → Customer portal, at minimum enabling
// "Customers can update payment methods" and "Customers can cancel
// subscriptions". Without that configuration, this route will still
// create a session, but the portal page itself will have nothing
// enabled for a customer to actually do there.

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { userId, toolId, returnUrl } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // toolId is optional, if provided, opens the portal scoped to that
    // specific subscription's own stripe_customer_id, if omitted,
    // finds any real, existing subscription customer id on the
    // account, a Stripe customer can hold several subscriptions at
    // once and the portal shows all of them regardless of which one
    // was used to open it.
    let query = supabaseAdmin
      .from('purchases')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (toolId) query = query.eq('tool_id', toolId)

    const { data: purchase } = await query.maybeSingle()

    if (!purchase?.stripe_customer_id) {
      return NextResponse.json({
        error: 'No billing account found, this account has no active Stripe-managed subscription yet.',
      }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

    const session = await stripe.billingPortal.sessions.create({
      customer:   purchase.stripe_customer_id,
      return_url: returnUrl || `${appUrl}/member/dashboard`,
    })

    return NextResponse.json({ success: true, portalUrl: session.url })
  } catch (err: any) {
    console.error('[subscription/portal] error:', err.message)
    return NextResponse.json({ error: 'Could not open billing portal. Please try again.' }, { status: 500 })
  }
}
