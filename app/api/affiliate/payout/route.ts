// app/api/affiliate/payout/route.ts
//
// POST /api/affiliate/payout
//   Submits a payout request. Calls process_payout_request() Supabase RPC.
//   Validates: authenticated user matches affiliateId, min $50, no in-flight request.
//
// GET /api/affiliate/payout/history?affiliateId=xxx
//   Returns payout_requests history for this affiliate.

import { NextResponse }  from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── POST — submit payout request ──────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { affiliateId, amount, method, paymentDetails } = body

    if (!affiliateId || !amount || !method) {
      return NextResponse.json(
        { error: 'affiliateId, amount, and method are required' },
        { status: 400 }
      )
    }

    // ── Auth guard ─────────────────────────────────────────────
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== affiliateId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['paypal', 'bank', 'wise'].includes(method)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }

    // ── Call Supabase RPC ──────────────────────────────────────
    // process_payout_request validates minimum, checks balance,
    // prevents duplicate in-flight requests, and deducts from pending_balance.
    const { data: result, error: rpcError } = await supabaseAdmin
      .rpc('process_payout_request', {
        p_affiliate_id:    affiliateId,
        p_amount:          Number(amount),
        p_method:          method,
        p_payment_details: paymentDetails || {},
      })

    if (rpcError) {
      console.error('[affiliate/payout] RPC error:', rpcError)
      return NextResponse.json({ error: 'Failed to process payout request' }, { status: 500 })
    }

    // RPC returns { success, request_id, amount, new_balance, message }
    if (!result?.success) {
      return NextResponse.json(
        { success: false, message: result?.message || 'Payout request failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success:   true,
      requestId: result.request_id,
      message:   result.message,
    })

  } catch (err) {
    console.error('[affiliate/payout] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ── GET — payout request history ─────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const affiliateId      = searchParams.get('affiliateId')

    if (!affiliateId) {
      return NextResponse.json({ error: 'affiliateId required' }, { status: 400 })
    }

    // ── Auth guard ─────────────────────────────────────────────
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== affiliateId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: payouts, error } = await supabaseAdmin
      .from('payout_requests')
      .select('id, amount, method, status, requested_at, processed_at, transaction_id')
      .eq('affiliate_id', affiliateId)
      .order('requested_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch payout history' }, { status: 500 })
    }

    return NextResponse.json(payouts || [])

  } catch (err) {
    console.error('[affiliate/payout/history] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
