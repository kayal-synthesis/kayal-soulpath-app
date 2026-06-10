import { NextResponse } from 'next/server'
import { api } from '@/lib/api/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  try {
    // Get referrer info
    const response = await api.get(`/api/referral/info/${code}`)
    
    // Track click (anonymous)
    await api.post('/api/referral/track-click', {
      code,
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(response.data)
  } catch (error) {
    return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const { code, action, data } = body

  try {
    switch (action) {
      case 'click':
        await api.post('/api/referral/track-click', { code, ...data })
        break
      case 'signup':
        await api.post('/api/referral/track-signup', { code, ...data })
        break
      case 'purchase':
        await api.post('/api/referral/track-purchase', { code, ...data })
        break
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to track' }, { status: 500 })
  }
}