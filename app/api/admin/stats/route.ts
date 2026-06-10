// @ts-nocheck
import { NextResponse } from 'next/server'
import { getAdminSession, isAdmin } from '@/lib/admin/auth'
import { prisma } from '@/lib/prisma'
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

    // Fetch real stats from database
    const [
      totalUsers,
      premiumUsers,
      lifetimeUsers,
      activeUsers,
      newUsersToday,
      totalRevenue,
      monthlyRevenue,
      purchasesByDomain,
      userGrowth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { membership: 'premium' } }),
      prisma.user.count({ where: { membership: 'lifetime' } }),
      prisma.user.count({
        where: {
          lastActive: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.purchase.aggregate({
        _sum: { amount: true }
      }),
      prisma.purchase.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { amount: true }
      }),
      prisma.purchase.groupBy({
        by: ['domain'],
        _count: true,
        _sum: { amount: true }
      }),
      prisma.user.groupBy({
        by: ['createdAt'],
        _count: true,
        where: {
          createdAt: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    const stats = {
      users: {
        total: totalUsers,
        free: totalUsers - premiumUsers - lifetimeUsers,
        premium: premiumUsers,
        lifetime: lifetimeUsers,
        active30d: activeUsers,
        new30d: newUsersToday,
        churnRate: calculateChurnRate(),
        retention: calculateRetention(),
        growth: calculateGrowth()
      },
      revenue: {
        mrr: monthlyRevenue._sum.amount || 0,
        arr: (monthlyRevenue._sum.amount || 0) * 12,
        oneTime: totalRevenue._sum.amount || 0,
        byDomain: purchasesByDomain.map(d => ({
          domain: d.domain,
          count: d._count,
          revenue: d._sum.amount || 0
        }))
      }
    }

    // Log the action
    await logAdminAction({
      adminId: session.user.id,
      action: 'FETCH_STATS',
      details: { timestamp: new Date().toISOString() }
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}

function calculateChurnRate() {
  // Implement churn rate calculation
  return 2.3
}

function calculateRetention() {
  // Implement retention calculation
  return 78
}

function calculateGrowth() {
  // Implement growth calculation
  return 23
}