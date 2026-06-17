import { NextRequest, NextResponse } from 'next/server'

const SYNTHESIS_API = process.env.NEXT_PUBLIC_SYNTHESIS_ENGINE_URL || 'https://api.kayalsoulpath.com'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const form = new FormData()
    form.append('name',       body.name       || '')
    form.append('dob',        body.dob        || '')
    form.append('tool_id',    body.tool_id    || '')
    form.append('session_id', body.session_id || '0')
    if (body.birth_time)     form.append('birth_time',     body.birth_time)
    if (body.birth_location) form.append('birth_location', body.birth_location)
    if (body.partner_name)   form.append('partner_name',   body.partner_name)

    const res = await fetch(`${SYNTHESIS_API}/tool-teaser`, {
      method: 'POST',
      body:   form,
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