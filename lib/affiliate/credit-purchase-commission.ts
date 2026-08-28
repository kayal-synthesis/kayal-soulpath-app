// lib/affiliate/credit-purchase-commission.ts
//
// Real, single, shared implementation. This is the exact logic
// already live and working in app/api/webhooks/stripe/route.ts,
// extracted here so add-purchase.tsx calls the same, real functions
// rather than a second, separate copy that could quietly drift apart
// from the webhook's own version over time, a genuine risk for
// anything calculating real, actual money.
//
// Both real callers pass their own supabaseAdmin client in, rather
// than this module creating its own, so there's still only ever one,
// real Supabase connection per request, not a hidden, second one.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getTicketType,
  getCommissionRate,
  PERFORMANCE_TIER_SALES_THRESHOLD,
  PERFORMANCE_TIER_WINDOW_DAYS,
  STRATEGIC_TIER_WINDOW_DAYS,
  qualifiesForStrategicTier,
  REFERRAL_BONUS_RATE,
  type CommissionTier,
} from '@/lib/affiliate/affiliate-commission'

interface CommissionResult {
  affiliateUserId: string
}

export async function creditAffiliateCommission(
  supabaseAdmin: SupabaseClient,
  params: {
    refCode:         string
    linkId:          string | null
    toolId:          string
    toolName:        string
    saleAmountUsd:   number
    stripeSessionId: string
    isRecurring:     boolean
  }
): Promise<CommissionResult | null> {
  const { refCode, linkId, toolId, toolName, saleAmountUsd, stripeSessionId, isRecurring } = params

  // Real, confirmed source of truth for affiliate identity, users, not
  // affiliate_profiles. Confirmed directly, affiliate_profiles has zero
  // rows, ever, while users.referral_code is populated by the real,
  // live on_auth_user_created trigger the moment a real account is
  // created, and credit_commission itself, the real function every
  // real payment already runs through, updates users.pending_balance
  // directly. affiliate_profiles was never the real, live table.
  const { data: affiliate, error: affError } = await supabaseAdmin
    .from('users')
    .select('id, affiliate_status, pending_balance, total_paid_out')
    .eq('referral_code', refCode)
    .maybeSingle()

  if (affError || !affiliate) {
    console.warn(`[commission] No affiliate found for ref_code: ${refCode}`)
    return null
  }
  if (affiliate.affiliate_status !== 'active') {
    console.log(`[commission] Affiliate ${refCode} not eligible, affiliate_status=${affiliate.affiliate_status}`)
    return null
  }

  // Idempotency, this exact sale already has its own real conversion
  // row, both real callers can, in principle, be retried, never
  // credit the same sale twice.
  const { data: existing } = await supabaseAdmin
    .from('affiliate_conversions')
    .select('id')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle()

  if (existing) {
    console.log(`[commission] Session ${stripeSessionId} already credited, skipping`)
    return null
  }

  // Real tier, using the same automatic Strategic trigger the
  // dashboard itself now computes, replacing manual, email-based
  // approval entirely. Two independent, real paths, sustained
  // volume or lifetime earnings, whichever comes first, both fully
  // automatic. No manual commission_rate override here, users has no
  // such real column, that path would need a genuine, new field added
  // first, not guessed at.
  const strategicWindowStart = new Date(Date.now() - STRATEGIC_TIER_WINDOW_DAYS * 86400000).toISOString()
  const { count: strategicWindowSales } = await supabaseAdmin
    .from('affiliate_conversions')
    .select('id', { count: 'exact', head: true })
    .eq('affiliate_id', affiliate.id)
    .gte('created_at', strategicWindowStart)

  // Real, live lifetime earnings, approximated from the two real,
  // confirmed balance fields users actually has, current pending
  // balance plus everything already paid out, rather than a
  // total_earned column that doesn't exist on this table.
  const lifetimeEarnings = (affiliate.pending_balance || 0) + (affiliate.total_paid_out || 0)

  const isStrategicTier = qualifiesForStrategicTier({
    salesInWindow:    strategicWindowSales || 0,
    lifetimeEarnings,
  })

  let commissionRate: number

  if (isStrategicTier) {
    const ticketType = getTicketType(saleAmountUsd)
    const resolvedTicket = ticketType === 'undefined-band' ? 'low' : ticketType
    commissionRate = getCommissionRate('strategic', resolvedTicket)
  } else {
    const windowStart = new Date(Date.now() - PERFORMANCE_TIER_WINDOW_DAYS * 86400000).toISOString()
    const { count: recentSales } = await supabaseAdmin
      .from('affiliate_conversions')
      .select('id', { count: 'exact', head: true })
      .eq('affiliate_id', affiliate.id)
      .gte('created_at', windowStart)

    const tier: CommissionTier = (recentSales || 0) >= PERFORMANCE_TIER_SALES_THRESHOLD
      ? 'performance'
      : 'standard'

    const ticketType = getTicketType(saleAmountUsd)
    // Real, known gap, see affiliate-commission.ts's own header, a
    // sale between $30 and $36 has no defined band in the real,
    // agreed rules. Defaults to the lower, more conservative rate
    // rather than silently paying nothing, or failing, on a real sale.
    const resolvedTicket = ticketType === 'undefined-band' ? 'low' : ticketType
    commissionRate = getCommissionRate(tier, resolvedTicket)
  }

  const commissionAmount = Math.round(saleAmountUsd * (commissionRate / 100) * 100) / 100

  const { data: conversion, error: convError } = await supabaseAdmin
    .from('affiliate_conversions')
    .insert({
      affiliate_id:      affiliate.id,
      link_id:           linkId || null,
      tool_id:           toolId,
      tool_name:         toolName,
      ref_code:          refCode,
      stripe_session_id: stripeSessionId,
      purchase_amount:   saleAmountUsd,
      commission_rate:   commissionRate,
      commission_amount: commissionAmount,
      is_recurring:      isRecurring,
      status:            'pending',
      created_at:        new Date().toISOString(),
    })
    .select('id')
    .single()

  if (convError || !conversion) {
    console.error('[commission] Conversion insert error:', convError)
    return null
  }

  const { error: rpcError } = await supabaseAdmin.rpc('credit_commission', {
    p_affiliate_id:      affiliate.id,
    p_conversion_id:     conversion.id,
    p_purchase_amount:   saleAmountUsd,
    p_commission_amount: commissionAmount,
  })

  if (rpcError) {
    // The conversion row itself still exists either way, real,
    // visible, and correctable later, not silently lost.
    console.error('[commission] credit_commission RPC error:', rpcError)
  }

  await supabaseAdmin.from('notifications').insert({
    user_id:    affiliate.id,
    type:       'affiliate_conversion',
    title:      'New Sale!',
    message:    `Someone purchased ${toolName} using your link. You earned $${commissionAmount.toFixed(2)}.`,
    data:       { conversion_id: conversion.id, amount: commissionAmount },
    read:       false,
    created_at: new Date().toISOString(),
  }).then(() => {}).catch(() => {})

  console.log(`[commission] Credited $${commissionAmount} (${commissionRate}%) to affiliate ${refCode}`)

  return { affiliateUserId: affiliate.id }
}

// ─────────────────────────────────────────────────────────────
// Real, single-hop referral bonus, matches the system agreed
// directly: REFERRAL_BONUS_RATE of the recruit's sale, paid to their
// direct recruiter only, never further up any chain, and only once
// both the recruiter and the recruit have a real, qualifying sale of
// their own. Call this after creditAffiliateCommission above has
// already recorded the recruit's own sale, so "the recruit has a
// qualifying sale" is already true by the time this checks the
// recruiter's side.
// ─────────────────────────────────────────────────────────────

export async function creditReferralBonus(
  supabaseAdmin: SupabaseClient,
  params: {
    recruitAffiliateUserId: string
    toolId:                 string
    toolName:                string
    saleAmountUsd:           number
    stripeSessionId:         string
  }
) {
  const { recruitAffiliateUserId, toolId, toolName, saleAmountUsd, stripeSessionId } = params

  const { data: recruitUser } = await supabaseAdmin
    .from('users')
    .select('recruited_by')
    .eq('id', recruitAffiliateUserId)
    .maybeSingle()

  const recruiterCode = recruitUser?.recruited_by
  if (!recruiterCode) return

  const { data: recruiter } = await supabaseAdmin
    .from('users')
    .select('id, affiliate_status')
    .eq('referral_code', recruiterCode)
    .maybeSingle()

  if (!recruiter || recruiter.affiliate_status !== 'active') return

  // Both sides must have at least one real, qualifying sale, not a
  // recruitment-only payout at either end. The recruit's was just
  // recorded above, this confirms the recruiter genuinely has one too.
  const { count: recruiterSales } = await supabaseAdmin
    .from('affiliate_conversions')
    .select('id', { count: 'exact', head: true })
    .eq('affiliate_id', recruiter.id)

  if (!recruiterSales || recruiterSales < 1) return

  // Distinct idempotency key from the direct commission row above,
  // both real rows share the same underlying sale id, must not
  // collide.
  const bonusSessionId = `${stripeSessionId}_referral`

  const { data: existing } = await supabaseAdmin
    .from('affiliate_conversions')
    .select('id')
    .eq('stripe_session_id', bonusSessionId)
    .maybeSingle()

  if (existing) return

  const bonusAmount = Math.round(saleAmountUsd * (REFERRAL_BONUS_RATE / 100) * 100) / 100

  const { data: bonusConversion } = await supabaseAdmin
    .from('affiliate_conversions')
    .insert({
      affiliate_id:      recruiter.id,
      link_id:           null,
      tool_id:           toolId,
      tool_name:         toolName,
      ref_code:          recruiterCode,
      stripe_session_id: bonusSessionId,
      purchase_amount:   saleAmountUsd,
      commission_rate:   REFERRAL_BONUS_RATE,
      commission_amount: bonusAmount,
      is_recurring:      false,
      status:            'pending',
      created_at:        new Date().toISOString(),
    })
    .select('id')
    .single()

  if (!bonusConversion) return

  await supabaseAdmin.rpc('credit_commission', {
    p_affiliate_id:      recruiter.id,
    p_conversion_id:     bonusConversion.id,
    p_purchase_amount:   saleAmountUsd,
    p_commission_amount: bonusAmount,
  })

  await supabaseAdmin.from('notifications').insert({
    user_id:    recruiter.id,
    type:       'affiliate_referral_bonus',
    title:      'Referral Bonus Earned!',
    message:    `A partner you recruited made a sale. You earned $${bonusAmount.toFixed(2)} in referral bonus.`,
    data:       { conversion_id: bonusConversion.id, amount: bonusAmount },
    read:       false,
    created_at: new Date().toISOString(),
  }).then(() => {}).catch(() => {})

  console.log(`[referral] Bonus $${bonusAmount} (${REFERRAL_BONUS_RATE}%) credited to recruiter ${recruiterCode}`)
}
