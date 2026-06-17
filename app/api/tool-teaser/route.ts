import { NextRequest, NextResponse } from 'next/server'

const SYNTHESIS_API = process.env.NEXT_PUBLIC_SYNTHESIS_ENGINE_URL || 'https://api.kayalsoulpath.com'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const res = await fetch(`${SYNTHESIS_API}/tool-teaser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}