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
    // Rewritten from the flat 30% version. That was a real, serious bug:
    // every sale was credited at the same rate regardless of the tool's
    // price tier or the affiliate's actual standing, which directly
    // contradicted the real Standard/Performance/Strategic structure
    // affiliates agree to on the register page.
    //
    // Also switched the lookup from users.referral_code to
    // affiliate_profiles.referral_code. ReferralTeaser.tsx, the component
    // that already correctly reads real affiliate data rather than
    // fabricating it, treats affiliate_profiles as the source of truth,
    // and two separate admin pages were found independently relying on
    // affiliate_profiles.approved for the same purpose. users.referral_code
    // was a second, unsynced field answering the same question.
    if (ref_code) {
      try {
        const HIGH_TICKET_THRESHOLD = 37 // matches the register page's own tier table

        const { data: affiliate } = await supabaseAdmin
          .from('affiliate_profiles')
          .select('id, user_id, commission_rate, approved, status')
          .eq('referral_code', ref_code)
          .single()

        if (affiliate && affiliate.approved && affiliate.status !== 'suspended') {

          // Idempotency: skip if already recorded for this purchase
          const { data: existing } = await supabaseAdmin
            .from('affiliate_conversions')
            .select('id')
            .eq('stripe_session_id', purchase.id)  // use purchase id as session key in test mode
            .maybeSingle()

          if (!existing) {
            let commissionRate: number

            if (affiliate.commission_rate != null) {
              // Strategic tier: individually negotiated rate, set by an
              // admin at approval time, overrides the formula entirely.
              commissionRate = affiliate.commission_rate
            } else {
              // Standard/Performance: the formula. Performance requires
              // 10+ sales in the last rolling 30 days, matching the
              // register page's real, agreed-upon terms exactly.
              const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
              const { count: recentSales } = await supabaseAdmin
                .from('affiliate_conversions')
                .select('id', { count: 'exact', head: true })
                .eq('affiliate_id', affiliate.user_id)
                .gte('created_at', thirtyDaysAgo)

              const isPerformanceTier = (recentSales || 0) >= 10
              const isHighTicket      = finalPrice >= HIGH_TICKET_THRESHOLD

              commissionRate = isPerformanceTier
                ? (isHighTicket ? 35 : 30)
                : (isHighTicket ? 30 : 25)
            }

            const commissionAmount = Math.round(finalPrice * (commissionRate / 100) * 100) / 100

            // Insert conversion record aligned to our schema
            const { data: conversion } = await supabaseAdmin
              .from('affiliate_conversions')
              .insert({
                affiliate_id:      affiliate.user_id,
                link_id:           link_id          || null,
                tool_id:           toolId,
                tool_name:         toolName,
                ref_code:          ref_code,
                stripe_session_id: purchase.id,     // purchase id as idempotency key
                purchase_amount:   finalPrice,
                commission_rate:   commissionRate,
                commission_amount: commissionAmount,
                is_recurring:      false,
                status:            'pending',
                created_at:        new Date().toISOString(),
              })
              .select('id')
              .single()

            if (conversion) {
              // Credit commission via RPC (updates pending_balance + writes ledger)
              await supabaseAdmin.rpc('credit_commission', {
                p_affiliate_id:    affiliate.user_id,
                p_conversion_id:   conversion.id,
                p_purchase_amount: finalPrice,
              })

              // Notify affiliate
              await supabaseAdmin.from('notifications').insert({
                user_id:    affiliate.user_id,
                type:       'affiliate_conversion',
                title:      '🎉 New Sale!',
                message:    `Someone purchased ${toolName} using your link. You earned $${commissionAmount.toFixed(2)}!`,
                data:       { conversion_id: conversion.id, amount: commissionAmount },
                read:       false,
                created_at: new Date().toISOString(),
              })

              console.log(`[add-purchase] Commission $${commissionAmount} (${commissionRate}%) credited to affiliate ${ref_code}`)

              // ──── Instant first-payout trigger ──────────────────────────────
              // Only runs for affiliates who have not yet had their first
              // payout, and only if they have already submitted banking
              // details (flutterwave_recipient_id set). Uses the same
              // 5-point threshold ReferralTeaser.tsx already shows progress
              // toward.
              //
              // Critically, this only ever RECORDS a pending attempt.
              // Flutterwave's initial API response confirms the transfer
              // was accepted, not that it completed, real bank transfers
              // are asynchronous, the actual outcome arrives later via
              // webhook. affiliate_profiles.pending_payout and
              // payout_activated are never touched here, only by
              // app/api/webhooks/flutterwave/route.ts once the real
              // outcome is known. Marking anything final at this point
              // would mean telling an affiliate they were paid for a
              // transfer that could still fail afterward.
              try {
                const { data: fullProfile } = await supabaseAdmin
                  .from('affiliate_profiles')
                  .select('id, payout_activated, flutterwave_recipient_id, payout_currency, pending_payout')
                  .eq('id', affiliate.id)
                  .single()

                if (fullProfile && !fullProfile.payout_activated && fullProfile.flutterwave_recipient_id) {
                  const { data: confirmedSales } = await supabaseAdmin
                    .from('affiliate_conversions')
                    .select('purchase_amount')
                    .eq('affiliate_id', affiliate.user_id)
                    .in('status', ['pending', 'confirmed'])

                  const totalPoints = (confirmedSales || []).reduce(
                    (sum, s) => sum + (Number(s.purchase_amount) >= 37 ? 1.5 : 1.0), 0
                  )

                  if (totalPoints >= 5.0) {
                    const { convertUsdToLocal, triggerPayout, buildPayoutReference, recordPayoutAttempt } =
                      await import('@/lib/flutterwave/payouts')

                    const usdAmount = fullProfile.pending_payout || 0
                    const localAmount = await convertUsdToLocal(usdAmount, fullProfile.payout_currency)
                    const reference = buildPayoutReference(affiliate.user_id, 'first')

                    const payoutResult = await triggerPayout({
                      recipientId: fullProfile.flutterwave_recipient_id,
                      amountLocal: localAmount,
                      currency:    fullProfile.payout_currency,
                      reference,
                    })

                    if (payoutResult.success) {
                      // Accepted, not yet completed. Recorded as pending,
                      // the webhook finishes this later.
                      await recordPayoutAttempt({
                        supabaseAdmin,
                        affiliateId: affiliate.id,
                        userId:      affiliate.user_id,
                        reference,
                        transferId:  payoutResult.transferId,
                        kind:        'first',
                        amountUsd:   usdAmount,
                        amountLocal: localAmount,
                        currency:    fullProfile.payout_currency,
                      })

                      await supabaseAdmin.from('notifications').insert({
                        user_id:    affiliate.user_id,
                        type:       'affiliate_payout',
                        title:      '💰 First Payout Initiated',
                        message:    `Your first commission payout of ${localAmount} ${fullProfile.payout_currency} is being processed. You'll be notified once it's confirmed delivered.`,
                        data:       { reference },
                        read:       false,
                        created_at: new Date().toISOString(),
                      })
                    } else {
                      console.error(`[add-purchase] First payout request failed for ${affiliate.user_id}: ${payoutResult.error}`)
                      await supabaseAdmin.from('admin_logs').insert({
                        admin_id:   null,
                        action:     'payout_failed',
                        resource:   affiliate.user_id,
                        details:    { reason: payoutResult.error, amount: usdAmount, reference },
                        created_at: new Date().toISOString(),
                      })
                    }
                  }
                }
              } catch (payoutError) {
                console.error('[add-purchase] First-payout check error:', payoutError)
              }

              // ──── Tier-2 override ──────────────────────────────────────────────
              // If this affiliate was themselves recruited by someone, that
              // recruiter earns a smaller override on this same sale, on top
              // of what was just credited above in full. Bounded to exactly
              // one hop: this always looks up the direct recruiter only, never
              // walks further up any chain, which is what keeps this
              // structurally different from a real MLM tree rather than just
              // a smaller one. Only recruiters actually approved for Strategic
              // tier can receive this (override_rate set on their profile at
              // approval time), not every affiliate who happens to have
              // recruited someone.
              try {
                const { data: recruitedUser } = await supabaseAdmin
                  .from('users')
                  .select('recruited_by')
                  .eq('id', affiliate.user_id)
                  .maybeSingle()

                const recruiterCode = recruitedUser?.recruited_by

                if (recruiterCode) {
                  const { data: recruiter } = await supabaseAdmin
                    .from('affiliate_profiles')
                    .select('id, user_id, override_rate, approved, status')
                    .eq('referral_code', recruiterCode)
                    .single()

                  if (
                    recruiter &&
                    recruiter.approved &&
                    recruiter.status !== 'suspended' &&
                    recruiter.override_rate != null &&
                    recruiter.override_rate > 0
                  ) {
                    // Distinct idempotency key from the direct commission
                    // record above, since both rows share the same
                    // underlying purchase and stripe_session_id must not
                    // collide between them.
                    const overrideSessionId = `${purchase.id}_override`

                    const { data: existingOverride } = await supabaseAdmin
                      .from('affiliate_conversions')
                      .select('id')
                      .eq('stripe_session_id', overrideSessionId)
                      .maybeSingle()

                    if (!existingOverride) {
                      const overrideAmount = Math.round(finalPrice * (recruiter.override_rate / 100) * 100) / 100

                      const { data: overrideConversion } = await supabaseAdmin
                        .from('affiliate_conversions')
                        .insert({
                          affiliate_id:      recruiter.user_id,
                          link_id:           null,
                          tool_id:           toolId,
                          tool_name:         toolName,
                          ref_code:          recruiterCode,
                          stripe_session_id: overrideSessionId,
                          purchase_amount:   finalPrice,
                          commission_rate:   recruiter.override_rate,
                          commission_amount: overrideAmount,
                          is_recurring:      false,
                          status:            'pending',
                          created_at:        new Date().toISOString(),
                        })
                        .select('id')
                        .single()

                      if (overrideConversion) {
                        await supabaseAdmin.rpc('credit_commission', {
                          p_affiliate_id:    recruiter.user_id,
                          p_conversion_id:   overrideConversion.id,
                          p_purchase_amount: finalPrice,
                        })

                        await supabaseAdmin.from('notifications').insert({
                          user_id:    recruiter.user_id,
                          type:       'affiliate_override',
                          title:      '🎉 Override Earned!',
                          message:    `A partner you recruited made a sale. You earned $${overrideAmount.toFixed(2)} in override commission.`,
                          data:       { conversion_id: overrideConversion.id, amount: overrideAmount },
                          read:       false,
                          created_at: new Date().toISOString(),
                        })

                        console.log(`[add-purchase] Override $${overrideAmount} (${recruiter.override_rate}%) credited to recruiter ${recruiterCode}`)
                      }
                    }
                  }
                }
              } catch (overrideError) {
                // Never fail the purchase, or the direct commission that was
                // already successfully credited above, because this
                // secondary override step failed.
                console.error('[add-purchase] Tier-2 override error:', overrideError)
              }
            }
          }
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
