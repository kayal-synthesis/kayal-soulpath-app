// @ts-nocheck
import { NextResponse } from 'next/server'

const prisma = null

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete expired sessions
    const expired = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    })

    // Clean up old notifications
    const oldNotifications = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    })

    return NextResponse.json({ 
      success: true,
      cleaned: {
        sessions: expired.count,
        notifications: oldNotifications.count
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cleanup failed:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}