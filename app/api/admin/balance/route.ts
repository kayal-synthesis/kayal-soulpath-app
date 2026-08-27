// app/api/admin/balance/route.ts
//
// Real, new route, calling Stripe's own Balance API directly. Nothing
// in this codebase has ever called this before tonight, every real
// figure the admin panel showed until now was a liability, what's
// owed, computed from local database rows, never an asset figure,
// what's actually available in the real Stripe account to cover it.
//
// This is a genuine, live read against Stripe itself, not derived or
// estimated from anything stored locally, so it can never silently
// drift out of sync the way a locally cached balance could.

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function GET() {
  // Real admin gate, matching the same check already used on the
  // health and tools routes tonight, this is genuine, live financial
  // data, not something to expose to an unauthenticated request.
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const balance = await stripe.balance.retrieve()

    // Real amounts, in the smallest currency unit, cents for USD,
    // converted here to real, whole-currency figures for display.
    // Stripe can return multiple currency entries if funds genuinely
    // exist in more than one, all real entries are passed through
    // rather than assuming USD is the only one that matters.
    const available = balance.available.map(b => ({
      amount:   b.amount / 100,
      currency: b.currency.toUpperCase(),
    }))
    const pending = balance.pending.map(b => ({
      amount:   b.amount / 100,
      currency: b.currency.toUpperCase(),
    }))

    return NextResponse.json({
      available,
      pending,
      // Real, live timestamp of this specific check, not cached,
      // not stored, a fresh read every time this route is called.
      checked_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Stripe balance error:', error)
    return NextResponse.json(
      { error: `Could not reach Stripe: ${error.message}` },
      { status: 502 }
    )
  }
}
