// app/api/affiliate/stats/route.ts
// GET /api/affiliate/stats?affiliateId=xxx
// Returns AffiliateStats shape — calls get_affiliate_stats Supabase RPC.

import { NextResponse }  from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import { cookies }       from 'next/headers'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const affiliateId      = searchParams.get('affiliateId')

    if (!affiliateId) {
      return NextResponse.json({ error: 'affiliateId required' }, { status: 400 })
    }

    // ── Auth: confirm the requesting user owns this affiliateId ──
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== affiliateId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Call Supabase RPC ──────────────────────────────────────
    const { data: stats, error } = await supabaseAdmin
      .rpc('get_affiliate_stats', { p_affiliate_id: affiliateId })

    if (error) {
      console.error('[affiliate/stats] RPC error:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    // ── Return aligned to AffiliateStats interface ─────────────
    return NextResponse.json({
      totalClicks:       stats?.totalClicks        ?? 0,
      uniqueVisitors:    stats?.uniqueVisitors      ?? 0,
      totalConversions:  stats?.totalConversions    ?? 0,
      conversionRate:    stats?.conversionRate      ?? 0,
      totalEarnings:     stats?.totalCommissionEarned ?? 0,
      pendingBalance:    stats?.pendingBalance      ?? 0,
      paidOut:           stats?.paidOut             ?? 0,
      averageOrderValue: stats?.averageOrderValue   ?? 0,
      recurringRevenue:  stats?.recurringRevenue    ?? 0,
      rank:              0,
      percentile:        0,
    })

  } catch (err) {
    console.error('[affiliate/stats] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
