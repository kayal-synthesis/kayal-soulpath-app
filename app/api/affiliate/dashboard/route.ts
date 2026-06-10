import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const affiliateId = searchParams.get('affiliateId')

    if (!affiliateId) {
      return NextResponse.json({ error: 'Affiliate ID required' }, { status: 400 })
    }

    // Get affiliate profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', affiliateId)
      .single()

    // Get stats from database functions
    const { data: stats } = await supabaseAdmin
      .rpc('get_affiliate_stats', { p_affiliate_id: affiliateId })

    const { data: monthlyStats } = await supabaseAdmin
      .rpc('get_monthly_stats', { p_affiliate_id: affiliateId })

    const { data: topTools } = await supabaseAdmin
      .rpc('get_top_tools', { p_affiliate_id: affiliateId })

    const { data: recentConversions } = await supabaseAdmin
      .rpc('get_recent_conversions', { p_affiliate_id: affiliateId })

    // Get affiliate links
    const { data: links } = await supabaseAdmin
      .from('affiliate_links')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })

    // Get commission rates based on tier
    const { data: tier } = await supabaseAdmin
      .from('users')
      .select('referral_tier')
      .eq('id', affiliateId)
      .single()

    const commissionRates = {
      bronze: { base: 10, tier: 0, recurring: 5, total: 15 },
      silver: { base: 15, tier: 0, recurring: 5, total: 20 },
      gold: { base: 15, tier: 5, recurring: 5, total: 25 },
      platinum: { base: 20, tier: 5, recurring: 5, total: 30 }
    }

    const currentTier = tier?.referral_tier || 'bronze'

    // Get next milestone
    const nextMilestone = {
      bronze: { type: 'Silver Tier', needed: 5, current: stats?.total_conversions || 0, reward: '15% commission' },
      silver: { type: 'Gold Tier', needed: 20, current: stats?.total_conversions || 0, reward: '20% commission + $100 bonus' },
      gold: { type: 'Platinum Tier', needed: 50, current: stats?.total_conversions || 0, reward: '25% commission + $500 bonus' },
      platinum: { type: 'Elite', needed: 100, current: stats?.total_conversions || 0, reward: '30% commission + $1000 bonus' }
    }

    return NextResponse.json({
      profile: {
        id: affiliateId,
        name: profile?.name || 'Affiliate Partner',
        email: profile?.email,
        joinDate: profile?.created_at,
        tier: currentTier,
        accountType: 'affiliate'
      },
      stats,
      monthlyStats: monthlyStats || [],
      topTools: topTools || [],
      recentConversions: recentConversions || [],
      links: links || [],
      commissionRates: commissionRates[currentTier as keyof typeof commissionRates],
      nextMilestone: nextMilestone[currentTier as keyof typeof nextMilestone]
    })
  } catch (error) {
    console.error('Error fetching affiliate data:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}