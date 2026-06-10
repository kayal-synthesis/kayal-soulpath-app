import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const headersList = headers()
    
    const ip = headersList.get('x-forwarded-for') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'
    
    // Store pageview in database
    // await db.pageViews.create({
    //   data: {
    //     path: body.path,
    //     title: body.title,
    //     properties: body.properties,
    //     ip,
    //     userAgent,
    //     timestamp: new Date(),
    //   }
    // })

    if (process.env.NODE_ENV === 'development') {
      console.log('📄 Page View:', {
        path: body.path,
        title: body.title,
        properties: body.properties,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Pageview error:', error)
    return NextResponse.json(
      { error: 'Failed to track pageview' },
      { status: 500 }
    )
  }
}