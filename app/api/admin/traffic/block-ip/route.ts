import { NextResponse } from 'next/server'
import { getAdminSession, isAdmin } from '@/lib/admin/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/admin/logger'

export async function POST(request: Request) {
  try {
    const session = await getAdminSession()
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { ip, action, reason } = body

    // Add to blocklist
    const blocked = await prisma.blockedIP.upsert({
      where: { ip },
      update: {
        action,
        reason,
        updatedAt: new Date()
      },
      create: {
        ip,
        action,
        reason,
        blockedBy: session.user.id
      }
    })

    // Log the action
    await logAdminAction({
      adminId: session.user.id,
      action: 'BLOCK_IP',
      details: { ip, action, reason }
    })

    return NextResponse.json(blocked)
  } catch (error) {
    console.error('Failed to block IP:', error)
    return NextResponse.json(
      { error: 'Failed to block IP' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getAdminSession()
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const blockedIPs = await prisma.blockedIP.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(blockedIPs)
  } catch (error) {
    console.error('Failed to fetch blocked IPs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blocked IPs' },
      { status: 500 }
    )
  }
}