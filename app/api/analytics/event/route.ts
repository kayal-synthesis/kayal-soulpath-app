import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const headersList = headers()
    
    // Get IP and user agent
    const ip = headersList.get('x-forwarded-for') || 
               headersList.get('x-real-ip') || 
               'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'
    
    // Store in database (implement based on your DB)
    // await db.analyticsEvents.create({
    //   data: {
    //     name: body.name,
    //     properties: body.properties,
    //     ip,
    //     userAgent,
    //     timestamp: new Date(),
    //   }
    // })

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', {
        name: body.name,
        properties: body.properties,
        ip,
        userAgent,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}