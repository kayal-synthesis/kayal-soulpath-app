// app/api/purchase/attach-account/route.ts
//
// Called from the confirmation page's account-creation and sign-in
// flows. Originally built as an update-only endpoint, re-pointing an
// existing purchases row from a guest's device id to a real account id.
// That assumed the row already existed, confirmed against real
// production data that it never did, purchases.user_id is a genuine
// UUID-typed column, a guest's device id string never fit that type at
// all, the webhook's own insert attempt silently failed every single
// time for every guest purchase, caught and logged, never visibly
// breaking. There was never a row here to update.
//
// Now creates the row for real, upserted using data pulled from
// pending_checkouts, the same real, complete record the webhook itself
// draws from, this is genuinely the first time a guest purchase's real
// tool, price, and job get written into purchases at all.

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
      .select('job_id, tool_id, tool_name, tool_type, category, usd_equivalent, email, ref_code, status')
      .eq('tx_ref', txRef)
      .maybeSingle()

    if (lookupError || !pending) {
      console.error('[purchase/attach-account] No pending_checkouts row for tx_ref:', txRef, lookupError)
      return NextResponse.json({ error: 'No matching purchase found for this reference' }, { status: 404 })
    }

    if (pending.status !== 'completed') {
      // Never creates a purchases row for anything payment hasn't
      // genuinely confirmed, same discipline as the webhook itself,
      // account creation happening quickly after checkout doesn't mean
      // payment necessarily has confirmed yet.
      return NextResponse.json({
        error: 'Payment is not confirmed for this purchase yet',
        pendingCheckoutStatus: pending.status,
      }, { status: 400 })
    }

    // Upserted, not inserted, same real unique constraint on
    // (user_id, tool_id) the webhook itself respects, this call may
    // also be the very first time this row is created at all, for a
    // guest whose original insert silently never happened, not
    // necessarily just re-pointing something that already existed.
    const { error: upsertError, count } = await supabaseAdmin
      .from('purchases')
      .upsert({
        user_id:        userId,
        tool_id:        pending.tool_id,
        tool_name:      pending.tool_name,
        tool_type:      pending.tool_type,
        category:       pending.category,
        price:          pending.usd_equivalent,
        status:         'active',
        purchase_date:  new Date().toISOString(),
        job_id:         pending.job_id,
        user_email:     pending.email,
        ref_code:       pending.ref_code,
      }, { onConflict: 'user_id,tool_id' })
      .select('id', { count: 'exact' })

    if (upsertError) {
      console.error('[purchase/attach-account] Failed to upsert purchase for tx_ref:', txRef, upsertError)
      return NextResponse.json({ error: 'Failed to link purchase to account' }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: count ?? 0 })
  } catch (error: any) {
    console.error('[purchase/attach-account] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
