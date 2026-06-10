import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { sessionId, page, userAgent, ip, country } = await request.json()

    // Find or create visitor
    let visitor = await prisma.visitor.findUnique({
      where: { sessionId }
    })

    if (!visitor) {
      visitor = await prisma.visitor.create({
        data: {
          sessionId,
          firstVisit: new Date(),
          ip,
          country,
          userAgent
        }
      })
    }

    // Record visit
    await prisma.visit.create({
      data: {
        visitorId: visitor.id,
        page,
        visitedAt: new Date()
      }
    })

    // Update visitor stats
    await prisma.visitor.update({
      where: { id: visitor.id },
      data: {
        lastVisit: new Date(),
        visitCount: { increment: 1 }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Visit tracking error:', error)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}