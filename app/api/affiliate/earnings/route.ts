// app/api/affiliate/earnings/route.ts
// GET /api/affiliate/earnings?affiliateId=xxx
// Returns pendingBalance, totalPaidOut, and full earnings_ledger transaction list.
// Feeds EarningsWidget.tsx transaction history section.

import { NextResponse }  from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    // ── Fetch current balances from users table ────────────────
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('pending_balance, total_paid_out')
      .eq('id', affiliateId)
      .single()

    // ── Fetch full ledger ──────────────────────────────────────
    const { data: ledger, error: ledgerError } = await supabaseAdmin
      .from('earnings_ledger')
      .select('id, type, amount, tool_id, tool_name, description, balance_after, created_at')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (ledgerError) {
      console.error('[affiliate/earnings] Ledger error:', ledgerError)
      return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 })
    }

    // ── Shape transactions to EarningsTransaction interface ────
    const transactions = (ledger || []).map(row => ({
      id:           row.id,
      type:         row.type,                      // earned | paid_out | refunded | adjusted
      amount:       Number(row.amount),
      toolId:       row.tool_id   || undefined,
      toolName:     row.tool_name || undefined,
      description:  row.description,
      date:         row.created_at,
      balanceAfter: Number(row.balance_after),
      status:       row.type === 'paid_out' ? 'paid' : 'confirmed',
    }))

    return NextResponse.json({
      pendingBalance:  Number(profile?.pending_balance  ?? 0),
      totalPaidOut:    Number(profile?.total_paid_out   ?? 0),
      transactions,
    })

  } catch (err) {
    console.error('[affiliate/earnings] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
