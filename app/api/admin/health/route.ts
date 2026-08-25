// app/api/admin/health/route.ts
//
// Real, new proxy route. Calls the real, confirmed KAYAL Synthesis
// Engine /health endpoint server-side, matching the same real,
// established pattern already used for the admin tools route tonight,
// avoiding any real CORS concern a direct client-side call to a
// separate domain would risk.
//
// Deliberately a thin passthrough, this route does not interpret or
// reshape the real response, the admin page itself does that, so the
// real, actual shape /health returns is always what's genuinely
// displayed, not a copy that could quietly drift from it.

import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET() {
  // Real admin gate, matching the same check already used on the
  // admin tools route, this is real, internal infrastructure status,
  // not something to expose to an unauthenticated request.
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiUrl = process.env.SYNTHESIS_API_URL || 'https://api.kayalsoulpath.com'

  try {
    const res = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      // Real health checks should never be served stale, always a
      // genuine, fresh request.
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Synthesis API returned ${res.status}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    // The backend being unreachable is itself real, meaningful health
    // information, surfaced directly, not swallowed.
    return NextResponse.json(
      { error: `Could not reach synthesis API: ${error.message}` },
      { status: 502 }
    )
  }
}
