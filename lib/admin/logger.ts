import { prisma } from '@/lib/prisma'

interface AdminLogEntry {
  adminId: string
  action: string
  details: any
  ip?: string
  userAgent?: string
}

export async function logAdminAction(entry: AdminLogEntry) {
  try {
    await prisma.adminLog.create({
      data: {
        adminId: entry.adminId,
        action: entry.action,
        details: entry.details,
        ip: entry.ip,
        userAgent: entry.userAgent,
        timestamp: new Date()
      }
    })

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ADMIN ACTION] ${entry.action}:`, entry.details)
    }
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}

export async function getAdminLogs(filters?: {
  adminId?: string
  action?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  return await prisma.adminLog.findMany({
    where: {
      adminId: filters?.adminId,
      action: filters?.action,
      timestamp: {
        gte: filters?.startDate,
        lte: filters?.endDate
      }
    },
    orderBy: { timestamp: 'desc' },
    take: filters?.limit || 100,
    include: {
      admin: {
        select: { name: true, email: true }
      }
    }
  })
}