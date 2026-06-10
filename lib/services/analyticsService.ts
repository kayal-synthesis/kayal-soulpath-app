import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class AnalyticsService {
  async getDashboardStats() {
    const [
      totalUsers,
      activeToday,
      totalRevenue,
      conversionRate
    ] = await Promise.all([
      prisma.user.count(),
      prisma.visit.count({
        where: {
          visitedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.purchase.aggregate({
        _sum: { amount: true }
      }),
      this.calculateConversionRate()
    ])

    return {
      totalUsers,
      activeToday,
      totalRevenue: totalRevenue._sum.amount || 0,
      conversionRate
    }
  }

  async getUserGrowth(days: number = 30) {
    const data = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: date,
            lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      })

      data.unshift({
        date: date.toISOString().split('T')[0],
        count
      })
    }
    return data
  }

  async getRevenueData(days: number = 30) {
    const data = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const revenue = await prisma.purchase.aggregate({
        where: {
          createdAt: {
            gte: date,
            lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
          }
        },
        _sum: { amount: true }
      })

      data.unshift({
        date: date.toISOString().split('T')[0],
        revenue: revenue._sum.amount || 0
      })
    }
    return data
  }

  async getTopTools(limit: number = 10) {
    return prisma.purchase.groupBy({
      by: ['toolId'],
      _count: true,
      _sum: { amount: true },
      orderBy: {
        _count: 'desc'
      },
      take: limit
    })
  }

  async getTrafficStats() {
    const [totalVisits, uniqueVisitors, topPages] = await Promise.all([
      prisma.visit.count(),
      prisma.visitor.count(),
      prisma.visit.groupBy({
        by: ['page'],
        _count: true,
        orderBy: {
          _count: 'desc'
        },
        take: 10
      })
    ])

    return {
      totalVisits,
      uniqueVisitors,
      topPages
    }
  }

  private async calculateConversionRate(): Promise<number> {
    const [totalUsers, totalPurchases] = await Promise.all([
      prisma.user.count(),
      prisma.purchase.groupBy({
        by: ['userId']
      })
    ])

    return totalUsers > 0 ? (totalPurchases.length / totalUsers) * 100 : 0
  }

  async trackEvent(data: any) {
    await prisma.event.create({
      data: {
        type: data.type,
        data: JSON.stringify(data),
        timestamp: new Date()
      }
    })
  }
}