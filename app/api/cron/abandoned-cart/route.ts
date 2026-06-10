import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notificationService'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notificationService = new NotificationService()
    const result = await notificationService.sendAbandonedCartReminders()

    return NextResponse.json({ 
      success: true, 
      sent: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cron job failed:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}