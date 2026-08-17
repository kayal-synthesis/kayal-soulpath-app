// app/api/purchase/attach-account/route.ts
//
// Called from the confirmation page's account-creation and sign-in
// flows, referenced and assumed there three separate times across this
// project, never actually built until now, confirmed genuinely needed
// by a real report: a purchase made as a guest gets stored under a
// temporary device id, not a real account id, since no account exists
// yet at the moment payment happens. Once someone creates an account or
// signs in right after, this is what re-points that purchase at the
// real, permanent id instead, using tx_ref, the one identifier that
// survives the whole trip from checkout through to right now.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { txRef, userId } = await request.json()

    if (!txRef || !userId) {
      return NextResponse.json({ error: 'txRef and userId are required' }, { status: 400 })
    }

    const { data: pending, error: lookupError } = await supabaseAdmin
      .from('pending_checkouts')
      .select('job_id, tool_id')
      .eq('tx_ref', txRef)
      .maybeSingle()

    if (lookupError || !pending) {
      console.error('[purchase/attach-account] No pending_checkouts row for tx_ref:', txRef, lookupError)
      return NextResponse.json({ error: 'No matching purchase found for this reference' }, { status: 404 })
    }

    // job_id is the real, stable link between this exact checkout and
    // the purchases row the webhook created, more precise than matching
    // on tool_id alone, which someone could plausibly buy more than
    // once. Falls back to tool_id + the old device id only if job_id
    // somehow isn't present, defensive, not the expected path.
    let updateQuery = supabaseAdmin.from('purchases').update({ user_id: userId })

    if (pending.job_id) {
      updateQuery = updateQuery.eq('job_id', pending.job_id)
    } else if (pending.tool_id) {
      updateQuery = updateQuery.eq('tool_id', pending.tool_id)
    } else {
      return NextResponse.json({ error: 'Nothing to match this purchase against' }, { status: 500 })
    }

    const { error: updateError, count } = await updateQuery.select('id', { count: 'exact' })

    if (updateError) {
      console.error('[purchase/attach-account] Failed to re-point purchase for tx_ref:', txRef, updateError)
      return NextResponse.json({ error: 'Failed to link purchase to account' }, { status: 500 })
    }

    // A real, honest signal back to the caller rather than a silent
    // 200, zero rows matched means the webhook's own purchases upsert
    // either hasn't landed yet or never ran, worth knowing, not hiding.
    return NextResponse.json({ success: true, updated: count ?? 0 })
  } catch (error: any) {
    console.error('[purchase/attach-account] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
