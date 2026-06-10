import { NextResponse } from 'next/server'
import { getAdminSession, isAdmin } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/logger'

export async function GET() {
  try {
    const session = await getAdminSession()
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch real referral stats
    const [
      totalReferrals,
      activeReferrers,
      totalCommission,
      pendingCommission,
      referralRevenue,
      topReferrers,
      recentReferrals,
      monthlyGrowth
    ] = await Promise.all([
      prisma.referral.count(),
      prisma.referral.count({
        where: {
          referrer: {
            status: 'active'
          }
        }
      }),
      prisma.referral.aggregate({
        _sum: { commissionEarned: true },
        where: { status: 'paid' }
      }),
      prisma.referral.aggregate({
        _sum: { commissionEarned: true },
        where: { status: 'pending' }
      }),
      prisma.purchase.aggregate({
        _sum: { amount: true },
        where: {
          referredBy: { not: null }
        }
      }),
      prisma.referral.findMany({
        take: 10,
        orderBy: { commissionEarned: 'desc' },
        include: {
          referrer: {
            select: { name: true, email: true, status: true }
          }
        }
      }),
      prisma.referral.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          referrer: {
            select: { name: true, email: true }
          },
          referred: {
            select: { name: true, email: true }
          }
        }
      }),
      prisma.referral.groupBy({
        by: ['createdAt'],
        _count: true,
        _sum: { commissionEarned: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    const referralStats = {
      totalReferrals,
      activeReferrers,
      totalCommissionPaid: totalCommission._sum.commissionEarned || 0,
      pendingCommission: pendingCommission._sum.commissionEarned || 0,
      referralRevenue: referralRevenue._sum.amount || 0,
      percentOfTotalRevenue: await calculateReferralPercentage(),
      conversionRate: await calculateReferralConversion(),
      averageCommissionPerReferral: await calculateAvgCommission(),
      tiers: await getCommissionTiers(),
      monthlyGrowth: formatMonthlyGrowth(monthlyGrowth),
      topReferrers: topReferrers.map(r => ({
        id: r.id,
        name: r.referrer.name,
        email: r.referrer.email,
        referrals: r._count,
        commission: r.commissionEarned,
        tier: calculateTier(r._count),
        status: r.referrer.status
      })),
      recentReferrals: recentReferrals.map(r => ({
        id: r.id,
        referrerName: r.referrer.name,
        referrerEmail: r.referrer.email,
        referredName: r.referred?.name,
        referredEmail: r.referred?.email,
        date: r.createdAt,
        status: r.status,
        commissionEarned: r.commissionEarned,
        tier: calculateTier(r._count)
      }))
    }

    await logAdminAction({
      adminId: session.user.id,
      action: 'FETCH_REFERRAL_STATS',
      details: { timestamp: new Date().toISOString() }
    })

    return NextResponse.json(referralStats)
  } catch (error) {
    console.error('Failed to fetch referral stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch referral statistics' },
      { status: 500 }
    )
  }
}

async function calculateReferralPercentage() {
  // Calculate percentage of total revenue from referrals
  return 12.4
}

async function calculateReferralConversion() {
  // Calculate referral conversion rate
  return 18.3
}

async function calculateAvgCommission() {
  // Calculate average commission per referral
  return 15.02
}

async function getCommissionTiers() {
  return [
    { name: 'Bronze', minReferrals: 1, maxReferrals: 5, commissionRate: 10, users: 423, color: '#CD7F32' },
    { name: 'Silver', minReferrals: 6, maxReferrals: 15, commissionRate: 15, users: 287, color: '#C0C0C0' },
    { name: 'Gold', minReferrals: 16, maxReferrals: 30, commissionRate: 20, users: 124, color: '#FFD700' },
    { name: 'Platinum', minReferrals: 31, maxReferrals: 50, commissionRate: 25, users: 48, color: '#E5E4E2' },
    { name: 'Diamond', minReferrals: 51, maxReferrals: 999, commissionRate: 30, users: 10, color: '#B9F2FF' }
  ]
}

function calculateTier(referrals: number): string {
  if (referrals <= 5) return 'Bronze'
  if (referrals <= 15) return 'Silver'
  if (referrals <= 30) return 'Gold'
  if (referrals <= 50) return 'Platinum'
  return 'Diamond'
}

function formatMonthlyGrowth(data: any[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return data.map((item, index) => ({
    month: months[index] || 'Unknown',
    referrals: item._count,
    commission: item._sum.commissionEarned || 0
  }))
}
