// @ts-nocheck
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { sessionId, teaserType, dayNumber } = await request.json()

    await prisma.teaserClick.create({
      data: {
        sessionId,
        teaserType,
        dayNumber,
        clickedAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Teaser click tracking error:', error)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}