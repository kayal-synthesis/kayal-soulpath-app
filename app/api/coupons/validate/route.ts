import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { code, toolId, userId } = await request.json()

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

    // ── Per-user usage check ─────────────────────────────────
    if (userId) {
      const perUserLimit = coupon.per_user_limit ?? 1

      const { count } = await supabaseAdmin
        .from('coupon_usage')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId)

      if ((count ?? 0) >= perUserLimit)
        return NextResponse.json({
          valid: false,
          error: perUserLimit === 1
            ? 'You have already used this coupon. It can only be used once per account.'
            : `You have reached the maximum uses (${perUserLimit}) for this coupon.`
        })
    }

    return NextResponse.json({ valid: true, coupon })

  } catch (error) {
    console.error('Coupon validation error:', error)
    return NextResponse.json({ valid: false, error: 'Error validating coupon' })
  }
}