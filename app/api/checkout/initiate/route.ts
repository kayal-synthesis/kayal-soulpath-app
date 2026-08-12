// app/api/checkout/initiate/route.ts
//
// The purchase page calls this instead of calling savePurchase()
// directly. This creates a pending_checkouts record, initiates payment
// with Stripe, and returns a redirect link. Nothing about the
// actual purchase, the commission, the reading job's real generation, is
// created or triggered from here, all of that waits for the webhook to
// confirm the charge actually completed.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { initiateCheckout } from '@/lib/stripe/checkout'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function buildTxRef(): string {
  return `kayal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId, email, fullName,
      toolId, toolName, toolType, category,
      amountCharged, currency, usdEquivalent,
      refCode, jobId,
    } = body

    if (!email || !toolId || !toolName || amountCharged == null || !currency) {
      return NextResponse.json({ error: 'Missing required checkout fields' }, { status: 400 })
    }

    const txRef = buildTxRef()

    const { error: insertError } = await supabaseAdmin.from('pending_checkouts').insert({
      tx_ref:         txRef,
      user_id:        userId || null,
      email,
      full_name:      fullName || null,
      tool_id:        toolId,
      tool_name:      toolName,
      tool_type:      toolType || null,
      category:       category || null,
      amount_charged: amountCharged,
      currency,
      usd_equivalent: usdEquivalent ?? amountCharged,
      ref_code:       refCode || null,
      job_id:         jobId || null,
      status:         'pending',
    })

    if (insertError) throw insertError

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

    const checkoutResult = await initiateCheckout({
      amount:      amountCharged,
      currency,
      email,
      name:        fullName || 'Guest',
      txRef,
      redirectUrl: `${appUrl}/purchase/${toolId}/callback`,
      meta: { tool_id: toolId, tx_ref: txRef }, // best-effort echo, not relied upon, pending_checkouts is the real source of truth
    })

    if (!checkoutResult.success) {
      // Clean up the pending record since checkout never actually started
      await supabaseAdmin.from('pending_checkouts').delete().eq('tx_ref', txRef)
      return NextResponse.json({ error: checkoutResult.error || 'Checkout initiation failed' }, { status: 500 })
    }

    return NextResponse.json({ paymentLink: checkoutResult.paymentLink, txRef })
  } catch (err: any) {
    console.error('[checkout/initiate] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to initiate checkout' }, { status: 500 })
  }
}
