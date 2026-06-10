// @ts-nocheck
import { NextResponse } from 'next/server'


export async function POST(request: Request) {
  try {
    const { sessionId, source, dayNumber } = await request.json()

    await prisma.upgradeIntent.create({
      data: {
        sessionId,
        source,
        dayNumber,
        intentAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Upgrade intent tracking error:', error)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}