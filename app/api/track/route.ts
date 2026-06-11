// @ts-nocheck
import { NextResponse } from 'next/server'

const prisma = null

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    // Store in database
    await prisma.event.create({
      data: {
        type,
        data: JSON.stringify(data),
        timestamp: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}