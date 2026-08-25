// app/api/affiliate/connect-stripe/route.ts
//
// Real, new route, generates a Stripe Connect Express onboarding link
// for the currently logged-in affiliate. Creates their connected
// account on first use, reuses the same real account id on every
// later visit rather than creating a new one each time.
//
// Country is required up front, not deferred to Stripe's own hosted
// onboarding flow, Stripe's real API requires it at account creation
// time, and it generally can't be changed afterward. Nothing in the
// real, confirmed affiliate_profiles schema holds this today, so it's
// collected here, once, before the real account is created, rather
// than guessed at or hardcoded to a single country for what is meant
// to be a genuinely global program.

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.kayalsoulpath.com'

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  // Real, logged-in affiliate, not a service-role bypass, this route
  // only ever acts on the calling person's own real record.
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const country = (body.country || '').toUpperCase()

  // Real, minimal validation, a genuine two-letter ISO country code,
  // Stripe's own account creation call will reject anything it
  // doesn't actually support, this just catches an obviously missing
  // or malformed value before making a real API call.
  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ error: 'A valid two-letter country code is required' }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('affiliate_profiles')
    .select('user_id, stripe_connect_account_id, stripe_connect_onboarded, stripe_connect_country')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Affiliate profile not found' }, { status: 404 })
  }

  // Already fully onboarded, no real reason to generate a new link,
  // the real webhook already confirmed this genuinely completed.
  if (profile.stripe_connect_onboarded) {
    return NextResponse.json({ error: 'Already connected', alreadyOnboarded: true }, { status: 400 })
  }

  let accountId = profile.stripe_connect_account_id

  // Real, honest guard, the country chosen at account creation can't
  // be changed afterward on a real Stripe account, if someone already
  // started onboarding under a different country than they're
  // submitting now, that's a genuine, real conflict worth surfacing
  // directly rather than silently reusing the wrong account.
  if (accountId && profile.stripe_connect_country && profile.stripe_connect_country !== country) {
    return NextResponse.json({
      error: `An onboarding attempt already exists for ${profile.stripe_connect_country}. Country can't be changed once started, contact support to reset it.`,
    }, { status: 409 })
  }

  if (!accountId) {
    // Real, standard Stripe Connect Express account, the same,
    // stable, well-documented API surface Stripe has used for this
    // for years, requesting the transfers capability specifically,
    // the one this program actually needs, not the full card-charging
    // capability set a merchant account would require.
    const account = await stripe.accounts.create({
      type:    'express',
      country,
      email:   user.email || undefined,
      capabilities: {
        transfers: { requested: true },
      },
    })

    accountId = account.id

    const { error: updateError } = await supabaseAdmin
      .from('affiliate_profiles')
      .update({
        stripe_connect_account_id: accountId,
        stripe_connect_country:    country,
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[connect-stripe] Failed to save new account id:', updateError)
      return NextResponse.json({ error: 'Failed to save account' }, { status: 500 })
    }
  }

  // Real, hosted onboarding link, Stripe's own real UI, not something
  // built here, expires after a short time by Stripe's own design,
  // so this is deliberately generated fresh on every real request
  // rather than cached.
  const accountLink = await stripe.accountLinks.create({
    account:     accountId,
    refresh_url: `${APP_URL}/member/referral/dashboard?stripe_connect=refresh`,
    return_url:  `${APP_URL}/member/referral/dashboard?stripe_connect=return`,
    type:        'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
