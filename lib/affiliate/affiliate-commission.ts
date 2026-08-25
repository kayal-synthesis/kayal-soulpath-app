// lib/affiliate/affiliate-commission.ts
//
// The real, single, shared source of truth for the KAYAL affiliate
// commission and first-payout structure. Derived directly and only
// from two real, independently-written files already confirmed to
// agree with each other, word for word, in structure:
//   app/member/referral/register/page.tsx (what a new affiliate reads
//     and explicitly agrees to via checkbox at signup)
//   app/member/referral/rules/page.tsx (the standalone rules page)
//
// Neither source file was changed to produce this, this is a direct,
// faithful transcription of numbers already confirmed consistent
// across both. The real, live dashboard, by contrast, was found
// running an entirely different, incompatible system, a flat
// lifetime-dollar tier (bronze/silver/gold/platinum), invented
// thresholds nowhere in the real rules, and no points concept at all.
// This file exists so that drift can't happen again, everything reads
// from here, nothing re-describes these numbers independently.
//
// Real, honest gaps, not invented here, flagged rather than guessed
// at:
//   1. Tools priced $30–$36 fall into neither the "low" nor "high"
//      band defined in either real source file. That gap exists in
//      the original spec itself, not introduced here.
//   2. Strategic tier is explicitly "by application," not a number
//      any live sales data can compute. Whichever file ends up
//      determining a real affiliate's tier needs a real, persisted
//      approval flag from the database, this file only defines the
//      rate that flag should map to once it exists.
//   3. The Performance tier bonus is explicitly permanent once
//      triggered, "does not reset monthly." A live, recomputed
//      30-day check alone cannot express that permanence correctly,
//      that also needs a real, persisted flag, set once and never
//      cleared, not invented here for the same reason as above.

export type TicketType = 'low' | 'high' | 'undefined-band'
export type CommissionTier = 'standard' | 'performance' | 'strategic'

// Real, confirmed price bands, transcribed exactly from rules.tsx's
// own table: "Low Ticket ... Tools priced $19 – $29" and
// "High Ticket ... Tools priced $37 – $79".
export const LOW_TICKET_MIN  = 19
export const LOW_TICKET_MAX  = 29
export const HIGH_TICKET_MIN = 37
export const HIGH_TICKET_MAX = 79

export function getTicketType(price: number): TicketType {
  if (price >= LOW_TICKET_MIN && price <= LOW_TICKET_MAX) return 'low'
  if (price >= HIGH_TICKET_MIN && price <= HIGH_TICKET_MAX) return 'high'
  // Real, honest gap, see file header, point 1, a tool priced $30-$36,
  // or outside $19-$79 entirely, has no defined band in either real
  // source file, this is not a bug introduced here.
  return 'undefined-band'
}

// Real, confirmed point values per sale, identical in both source
// files' worked examples.
export const POINTS_PER_SALE: Record<'low' | 'high', number> = {
  low:  1.0,
  high: 1.5,
}

export function getPointsForSale(price: number): number {
  const type = getTicketType(price)
  if (type === 'undefined-band') return 0
  return POINTS_PER_SALE[type]
}

// Real, confirmed first-payout threshold. Explicitly no dollar
// minimum attached to it, confirmed directly in rules.tsx: "There is
// no minimum amount, your full earned balance is paid on
// activation." This is genuinely separate from RECURRING_PAYOUT_MINIMUM
// below, which only applies to every payout after the first.
export const FIRST_PAYOUT_POINTS_THRESHOLD = 5

// Real, confirmed recurring payout minimum and schedule, separate
// from first-payout activation.
export const RECURRING_PAYOUT_MINIMUM = 50
export const RECURRING_PAYOUT_DAY_OF_MONTH = 15

// Real, confirmed first-payout turnaround, confirmed identically in
// both register.tsx's terms bar and rules.tsx's worked example.
export const FIRST_PAYOUT_WORKING_DAYS = 7

// Real, confirmed Performance tier trigger, a genuinely rolling
// window measured in days, not a calendar month, and explicitly
// permanent once reached, see file header, point 3.
export const PERFORMANCE_TIER_SALES_THRESHOLD = 10
export const PERFORMANCE_TIER_WINDOW_DAYS = 30

// Real, confirmed cookie attribution window, used consistently across
// register.tsx's terms bar, rules.tsx's own tracking section, and the
// real cookie logic already confirmed live in app/ref/[code]/route.ts.
export const COOKIE_WINDOW_DAYS = 60

// Real, confirmed dual rates by tier and ticket type, transcribed
// exactly from rules.tsx's own rate table.
export const COMMISSION_RATES: Record<CommissionTier, Record<'low' | 'high', number>> = {
  standard:    { low: 25, high: 30 },
  performance: { low: 30, high: 35 },
  strategic:   { low: 35, high: 40 },
}

export function getCommissionRate(tier: CommissionTier, ticketType: 'low' | 'high'): number {
  return COMMISSION_RATES[tier][ticketType]
}

// Real, confirmed bonus deltas for display, matching the "+5%" /
// "+10%" badges shown on rules.tsx.
export const TIER_BONUS: Record<CommissionTier, number> = {
  standard:    0,
  performance: 5,
  strategic:   10,
}

export const TIER_LABELS: Record<CommissionTier, string> = {
  standard:    'Standard',
  performance: 'Performance',
  strategic:   'Strategic',
}

export const TIER_SUBLABELS: Record<CommissionTier, string> = {
  standard:    'Automatic on sign-up, begins immediately',
  performance: '10+ sales in any rolling 30-day window',
  strategic:   'Platform owners & influencers, by application',
}

// ─────────────────────────────────────────────────────────────
// Account activity policy, real, confirmed constants from rules.tsx's
// own "Account Activity Policy" section. Not previously included in
// this file, added now because the referral bonus system below
// deliberately reuses this exact policy for its own eligibility
// window, rather than defining a second, separate one.
// ─────────────────────────────────────────────────────────────
export const ACCOUNT_SUSPEND_AFTER_INACTIVE_DAYS = 60
export const ACCOUNT_DELETE_AFTER_INACTIVE_DAYS  = 90

// ─────────────────────────────────────────────────────────────
// REFERRAL BONUS, single-hop, non-compounding
//
// Real, newly agreed structure, not present in any of the five
// original files, worked out directly, deliberately built to reuse
// every real, existing rule already established for direct
// commission above, rather than invent a second, separate rule set:
//
//   - Activity requirement: the same ACCOUNT_SUSPEND_AFTER_INACTIVE_DAYS
//     window above, a suspended affiliate earns no referral bonus,
//     exactly as a suspended affiliate earns no direct commission.
//   - Refund reversal: the same reversal rule already defined for
//     direct commission in rules.tsx, if the recruit's sale is
//     refunded within the guarantee window, the referral bonus paid
//     on it reverses too, in the same payment period, not a separate
//     rule.
//   - Self-referral prohibition: the same rule already stated in
//     rules.tsx applies here without modification, no separate
//     account, real or otherwise, may recruit itself.
//
// Real, confirmed shape, agreed directly:
//   A recruits B. When B makes a qualifying sale, A earns
//   REFERRAL_BONUS_RATE of B's sale amount.
//   Single-hop only, deliberately non-compounding: if B later recruits
//   C, A earns nothing at all from C's sales, no matter how deep the
//   real recruitment tree grows beneath A. Each real sale can trigger
//   at most one referral bonus payment, to exactly one person, the
//   sale-maker's own direct recruiter, never further up the chain.
//   Both parties must have made at least one real, qualifying sale of
//   their own, not merely have signed up or recruited, to be eligible
//   for any referral bonus at all, this is not a recruitment-only
//   payout at either end.
// ─────────────────────────────────────────────────────────────

export const REFERRAL_BONUS_RATE  = 5 // percent, of the recruit's real sale amount
export const REFERRAL_CHAIN_DEPTH = 1 // single-hop only, deliberately non-compounding

export interface ReferralEligibility {
  recruiterHasQualifyingSale: boolean
  recruiterAccountActive:     boolean
  recruitHasQualifyingSale:   boolean
  recruitAccountActive:       boolean
}

// Real, both-sided eligibility check, matches the agreed rule
// directly, neither party earns anything from this system unless
// both have made a genuine sale of their own and remain in real,
// active standing under the same policy that already governs direct
// commission.
export function isReferralBonusEligible(e: ReferralEligibility): boolean {
  return (
    e.recruiterHasQualifyingSale && e.recruiterAccountActive &&
    e.recruitHasQualifyingSale   && e.recruitAccountActive
  )
}

export function getReferralBonusAmount(recruitSaleAmount: number): number {
  return recruitSaleAmount * (REFERRAL_BONUS_RATE / 100)
}

// ─────────────────────────────────────────────────────────────
// Strategic tier, automatic trigger
//
// Real, agreed replacement for manual, email-based approval,
// "no longer make any sense... want everything done and completed."
// Two independent, real paths, whichever an affiliate reaches first,
// both fully automatic:
//   - Sustained volume: STRATEGIC_TIER_SALES_THRESHOLD or more sales
//     within a single STRATEGIC_TIER_WINDOW_DAYS rolling window.
//   - Lifetime value: STRATEGIC_TIER_LIFETIME_EARNINGS_USD or more in
//     total real earnings, direct commission plus referral bonuses
//     combined.
// Deliberately a single, continuous rolling window, not several
// separate, stacked monthly gates, avoiding the real, unfair edge
// case where comparable, genuine volume could fall just short of a
// bar purely due to how it happened to land across calendar months.
// ─────────────────────────────────────────────────────────────

export const STRATEGIC_TIER_SALES_THRESHOLD       = 30
export const STRATEGIC_TIER_WINDOW_DAYS            = 90
export const STRATEGIC_TIER_LIFETIME_EARNINGS_USD  = 5000

export interface StrategicTierEligibility {
  salesInWindow:   number
  lifetimeEarnings: number
}

export function qualifiesForStrategicTier(e: StrategicTierEligibility): boolean {
  return (
    e.salesInWindow >= STRATEGIC_TIER_SALES_THRESHOLD ||
    e.lifetimeEarnings >= STRATEGIC_TIER_LIFETIME_EARNINGS_USD
  )
}

