// app/api/coupons/validate/route.ts
//
// Real, rebuilt route. This previously existed to give someone
// immediate, real feedback the moment they typed a coupon code in,
// before ever reaching Stripe, confirmed it works, shows the real
// discount, without waiting until after payment to find out.
//
// The real, previous version's account-wide check only ever ran when
// a real, logged-in userId was present, `if (userId) { ... }`,
// meaning every guest checkout skipped it entirely, letting the same,
// real person reuse a coupon indefinitely just by never logging in.
//
// This version closes that gap two, real ways. First, a guest's given
// email is resolved to the same, real, existing account
// add-purchase.tsx would use, read-only, never creating a new one
// just to check a code. Second, the requester's real IP is checked
// too, catching reuse across different emails on the same device,
// something email alone can't catch.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { code, toolId, userId, email } = await request.json()

    if (!code) return NextResponse.json({ valid: false, error: 'No coupon code provided' })

    // Fetch coupon
    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .single()

    if (error || !coupon)
      return NextResponse.json({ valid: false, error: 'Coupon not found or inactive' })

    // Check global usage limit
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit)
      return NextResponse.json({ valid: false, error: 'Coupon usage limit has been reached' })

    // Check date validity
    const now = new Date()
    if (coupon.start_date && new Date(coupon.start_date) > now)
      return NextResponse.json({ valid: false, error: 'Coupon is not yet active' })
    if (coupon.end_date && new Date(coupon.end_date) < now)
      return NextResponse.json({ valid: false, error: 'Coupon has expired' })

    // Check if applies to this tool
    if (coupon.applies_to && coupon.applies_to.length > 0 && toolId)
      if (!coupon.applies_to.includes(toolId))
        return NextResponse.json({ valid: false, error: 'Coupon does not apply to this tool' })

    // Check if excludes this tool
    if (coupon.excludes_tools && coupon.excludes_tools.length > 0 && toolId)
      if (coupon.excludes_tools.includes(toolId))
        return NextResponse.json({ valid: false, error: 'Coupon cannot be used for this tool' })

    // ── Per-user usage check, account-wide, not per tool ────────
    const perUserLimit = coupon.per_user_limit ?? 1
    const alreadyUsedMessage = perUserLimit === 1
      ? 'You have already used this coupon. It can only be used once per account.'
      : `You have reached the maximum uses (${perUserLimit}) for this coupon.`

    // Real, resolved identity. A logged-in userId is used directly. A
    // guest's given email is resolved to the same, real, existing
    // account add-purchase.tsx would resolve it to, read-only, this
    // never creates a new user row just to check a code, a genuinely
    // new email has never completed a real purchase before, so it
    // can't have used any coupon yet either.
    let resolvedUserId: string | null = userId || null

    if (!resolvedUserId && email) {
      const { data: existingByEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()

      if (existingByEmail) resolvedUserId = existingByEmail.id
    }

    if (resolvedUserId) {
      const { count } = await supabaseAdmin
        .from('coupon_usage')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', resolvedUserId)

      if ((count ?? 0) >= perUserLimit)
        return NextResponse.json({ valid: false, error: alreadyUsedMessage })
    }

    // ── Real, second layer, IP address ───────────────────────────
    // Catches the same, real device reusing a coupon under a
    // different email, something the check above can't see. Not
    // airtight on its own, a shared connection or a VPN can defeat
    // it, but combined with the real, resolved-identity check above,
    // it meaningfully raises the real bar.
    const forwardedFor = request.headers.get('x-forwarded-for')
    const requestIp = forwardedFor?.split(',')[0]?.trim()

    if (requestIp) {
      const { count: ipCount } = await supabaseAdmin
        .from('coupon_usage')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('ip_address', requestIp)

      if ((ipCount ?? 0) >= perUserLimit)
        return NextResponse.json({ valid: false, error: alreadyUsedMessage })
    }

    return NextResponse.json({ valid: true, coupon })

  } catch (error) {
    console.error('Coupon validation error:', error)
    return NextResponse.json({ valid: false, error: 'Error validating coupon' })
  }
}
