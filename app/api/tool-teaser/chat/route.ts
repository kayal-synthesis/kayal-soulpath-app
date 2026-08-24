import { NextRequest, NextResponse } from 'next/server'

const SYNTHESIS_API = process.env.NEXT_PUBLIC_SYNTHESIS_ENGINE_URL || 'https://api.kayalsoulpath.com'

// Real, single-exchange preview for chat/voice subscription tools.
// Deliberately sends real JSON, not FormData, unlike the sibling
// /api/tool-teaser route just above this one. The backend's real
// /tool-teaser/chat endpoint uses a Pydantic BaseModel,
// ChatTeaserRequest, not Form(...) parameters, confirmed directly
// against main.py, so a JSON body is what it actually expects.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const res = await fetch(`${SYNTHESIS_API}/tool-teaser/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:           body.name           || '',
        dob:            body.dob            || '',
        tool_id:        body.tool_id        || '',
        message:        body.message        || '',
        birth_time:     body.birth_time     || null,
        birth_location: body.birth_location || null,
      }),
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
