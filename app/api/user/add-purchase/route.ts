// app/api/user/add-purchase/route.ts
// Changes from original:
//  1. commission_rate 15 → 30 (flat model)
//  2. affiliate_cookies lookup removed , now reads ref_code from request body
//  3. affiliate_conversions insert aligned to our schema
//  4. users insert: 'name' → 'full_name', 'membership_tier' removed
//  5. purchases insert: added user_email (needed for returning customer detection)
//  6. GET handler extended: supports ?email=xxx lookup for check-email functionality
//     (removes need for a separate check-email route)

import { NextResponse }   from 'next/server'
import { createClient }   from '@supabase/supabase-js'
import { cookies }        from 'next/headers'
import { creditAffiliateCommission, creditReferralBonus } from '@/lib/affiliate/credit-purchase-commission'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// POST , record a purchase and credit affiliate commission
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Real, actual requester IP, needed below so a coupon's real
    // usage record carries the same, real signal the validate route
    // checks against, not just the resolved user_id.
    const forwardedFor = request.headers.get('x-forwarded-for')
    const requestIp = forwardedFor?.split(',')[0]?.trim() || null

    const {
      userId,
      toolId,
      toolName,
      toolType,
      category,
      destination,
      emoji,
      price,
      originalPrice,
      couponCode,
      images,
      purchaseDate,
      expires_at,
      name,
      email,
      job_id,
      // FIX 4: read affiliate tracking from request body
      // (set by purchase page from sessionStorage.kayal_selected_tool)
      ref_code,
      link_id,
    } = body

    if (!toolId || !toolName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Resolve the real user id. Logged-in purchasers already send a real
    // Supabase auth UUID here. Anonymous purchasers send their device id
    // instead, which is never a UUID, so without this step their purchase
    // was silently rejected below and never saved, meaning there was no
    // record anywhere of which email the finished report should go to.
    // Email is the anchor for anonymous checkout instead: look up an
    // existing user by email first, so a returning anonymous customer maps
    // back to the same account instead of getting a new one every time,
    // and only create a new user record if genuinely none exists yet.
    let resolvedUserId = userId
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || '')

    if (!isUUID) {
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required to complete a guest purchase' },
          { status: 400 },
        )
      }
      const { data: existingByEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existingByEmail) {
        resolvedUserId = existingByEmail.id
      } else {
        resolvedUserId = crypto.randomUUID()
        await supabaseAdmin.from('users').insert({
          id:        resolvedUserId,
          email:     email,
          full_name: name || 'Guest',
          created:   new Date().toISOString(),
        })
      }
    }

    // ──── Ensure user record exists ──────────────────────────────────────────────────────────
    // Safe no-op for the anonymous path above, which already created this
    // record, this only does real work for the logged-in path.
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', resolvedUserId)
      .maybeSingle()

    if (!existingUser) {
      await supabaseAdmin.from('users').insert({
        id:           resolvedUserId,
        email:        email || 'unknown@email.com',
        full_name:    name  || 'User',
        created:      new Date().toISOString(),
      })
    }

    // ──── Coupon handling (unchanged from original) ──────────────────────────
    let finalPrice      = price
    let appliedCouponId = null

    if (couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('id, discount_type, discount_value, max_discount, usage_limit, used_count, applies_to, excludes_tools')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single()

      if (coupon) {
        const appliesToTool = !coupon.applies_to?.length || coupon.applies_to.includes(toolId)
        const excluded      = coupon.excludes_tools?.includes(toolId)

        if (appliesToTool && !excluded) {
          appliedCouponId = coupon.id
          if (coupon.discount_type === 'percentage') {
            finalPrice = originalPrice * (1 - coupon.discount_value / 100)
            if (coupon.max_discount)
              finalPrice = Math.min(finalPrice, originalPrice - coupon.max_discount)
          } else if (coupon.discount_type === 'fixed') {
            finalPrice = Math.max(originalPrice - coupon.discount_value, 0)
          }
          await supabaseAdmin
            .from('coupons')
            .update({ used_count: (coupon.used_count || 0) + 1 })
            .eq('id', coupon.id)
        }
      }
    }

    // ──── Insert purchase ────────────────────────────────────────────────────────────────────────────────
    // Core fields always present; optional columns added only if they exist
    // in the schema , prevents PGRST204 errors on older deployments.
    const purchaseRow: Record<string, any> = {
      user_id:       resolvedUserId,
      tool_id:       toolId,
      tool_name:     toolName,
      tool_type:     toolType      || 'report',
      category:      category      || 'universal',
      destination:   destination   || toolType || 'report',
      emoji:         emoji         || '📦',
      price:         finalPrice    || price || 0,
      original_price: originalPrice || price || 0,
      coupon_id:     appliedCouponId,
      images:        images && typeof images === 'object' ? images : {},
      status:        'active',
      purchase_date: purchaseDate  || new Date().toISOString(),
      expires_at:    expires_at    || null,
      job_id:        job_id        || null,
      created_at:    new Date().toISOString(),
    }

    // Add optional columns , these require ALTER TABLE if not present.
    // Run supabase/migrations/add_missing_columns.sql to add them.
    if (email)    purchaseRow.user_email = email
    if (ref_code) purchaseRow.ref_code   = ref_code
    if (link_id)  purchaseRow.link_id    = link_id

    let purchase: any
    let purchaseError: any

    // First attempt: with optional columns
    const result = await supabaseAdmin
      .from('purchases')
      .insert(purchaseRow)
      .select()
      .single()

    if (result.error?.code === 'PGRST204') {
      // Column doesn't exist yet , retry without optional columns
      const { user_email, ref_code: rc, link_id: li, ...coreRow } = purchaseRow
      const fallback = await supabaseAdmin
        .from('purchases')
        .insert(coreRow)
        .select()
        .single()
      purchase      = fallback.data
      purchaseError = fallback.error
    } else {
      purchase      = result.data
      purchaseError = result.error
    }

    if (purchaseError) {
      console.error('Purchase insert error:', purchaseError)
      return NextResponse.json({ error: purchaseError.message }, { status: 500 })
    }

    // ──── Coupon usage record ──────────────────────────────────────────────────────────────────────
    if (appliedCouponId) {
      await supabaseAdmin.from('coupon_usage').insert({
        coupon_id:       appliedCouponId,
        user_id:         resolvedUserId,
        purchase_id:     purchase.id,
        discount_amount: (originalPrice || price) - finalPrice,
        ip_address:      requestIp,
        used_at:         new Date().toISOString(),
      })
    }

    // ── Send purchase confirmation email ────────────────────────
    try {
      if (email) {
        const { sendPurchaseConfirmation } = await import('@/lib/email/emailService')
        await sendPurchaseConfirmation({
          to:             email,
          firstName:      (name || 'Seeker').split(' ')[0],
          toolName:       toolName,
          toolEmoji:      emoji || '✨',
          price:          finalPrice,
          jobId:          job_id || null,
          requiresImages: !!(images && Object.keys(images).length > 0),
          imageType:      undefined,
          isGuest:        !isUUID,
        })
      }
    } catch (emailErr) {
      console.error('[add-purchase] Email error:', emailErr)
    }

    // ──── Affiliate commission ────────────────────────────────────────────────────────────────────
    // Real, rebuilt to match the exact, single, real commission and
    // referral-bonus functions already live and working in
    // app/api/webhooks/stripe/route.ts, not a second, separate
    // implementation. The previous version here used a genuinely
    // different, older design entirely, Flutterwave for real payouts,
    // a manual commission_rate override, and a Tier-2 override system,
    // none of which match what's actually confirmed live tonight,
    // Stripe as the real payment and payout provider, fully automatic
    // tiers, and a single-hop, flat referral bonus only.
    if (ref_code) {
      try {
        const commissionResult = await creditAffiliateCommission(supabaseAdmin, {
          refCode:         ref_code,
          linkId:          link_id || null,
          toolId:          toolId,
          toolName:        toolName,
          saleAmountUsd:   finalPrice,
          stripeSessionId: purchase.id,
          isRecurring:     false,
        })

        if (commissionResult) {
          await creditReferralBonus(supabaseAdmin, {
            recruitAffiliateUserId: commissionResult.affiliateUserId,
            toolId:                 toolId,
            toolName:                toolName,
            saleAmountUsd:           finalPrice,
            stripeSessionId:         purchase.id,
          })
        }
      } catch (affiliateError) {
        // Never fail the purchase because affiliate tracking failed
        console.error('[add-purchase] Affiliate tracking error:', affiliateError)
      }
    }

    return NextResponse.json({
      success:          true,
      purchase,
      message:          'Purchase saved successfully',
      discount_applied: !!appliedCouponId,
    })

  } catch (error) {
    console.error('Error in add-purchase POST:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add purchase' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET , fetch purchases
// Supports two modes:
//   ?userId=xxx     → returns all active purchases for a user (original behaviour)
//   ?email=xxx      → returns purchase count + name for returning customer detection
//                     (replaces the need for a separate check-email route)
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const email  = searchParams.get('email')?.toLowerCase().trim()

    // ──── Email lookup mode (for returning customer detection) ────
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ hasPurchases: false, purchaseCount: 0 })
      }

      const { data: purchases } = await supabaseAdmin
        .from('purchases')
        .select('id, tool_name, user_id')
        .eq('user_email', email)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      const purchaseCount = purchases?.length || 0
      let name: string | undefined

      if (purchases?.[0]?.user_id) {
        const { data: profile } = await supabaseAdmin
          .from('users')
          .select('full_name')
          .eq('id', purchases[0].user_id)
          .single()
        name = profile?.full_name || undefined
      }

      return NextResponse.json({
        hasPurchases:  purchaseCount > 0,
        purchaseCount,
        name,
      })
    }

    // ──── User ID lookup mode (original behaviour) ────────────────────────────
    if (!userId) {
      return NextResponse.json({ error: 'userId or email is required' }, { status: 400 })
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    if (!isUUID) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }

    const { data: purchases, error } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
    }

    return NextResponse.json({ purchases: purchases || [] })

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
  }
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// DELETE , unchanged from original
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const purchaseId = searchParams.get('id')
    const userId     = searchParams.get('userId')

    const { data: { user } } = await supabaseAdmin.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let query = supabaseAdmin.from('purchases').delete()

    if (purchaseId) {
      query = query.eq('id', purchaseId).eq('user_id', user.id)
    } else if (userId && userId === user.id) {
      query = query.eq('user_id', userId)
    } else {
      return NextResponse.json({ error: 'Invalid delete request' }, { status: 400 })
    }

    const { error } = await query
    if (error) return NextResponse.json({ error: 'Failed to delete purchases' }, { status: 500 })

    return NextResponse.json({ success: true, message: 'Purchases deleted successfully' })

  } catch {
    return NextResponse.json({ error: 'Failed to delete purchases' }, { status: 500 })
  }
}
