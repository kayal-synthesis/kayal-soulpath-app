// app/api/cron/monthly-payouts/route.ts
//
// Runs on the 15th of every month, matching the terms affiliates actually
// agreed to on the register page. Only pays affiliates who have already
// had their first payout (payout_activated = true) and have at least $50
// pending, exactly the two conditions the register page states. Below
// $50, balances correctly roll forward untouched, nothing here forces
// a payout early.
//
// Needs wiring into whatever scheduling mechanism the deployment
// actually uses, Vercel Cron, a Supabase Edge Function on a schedule, or
// similar, this file is the handler, not the scheduler itself. Whatever
// triggers it needs to call this route with a shared secret or similar
// auth, it should not be a publicly callable endpoint given it moves
// real money.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { convertUsdToLocal, triggerPayout, buildPayoutReference, recordPayoutAttempt } from '@/lib/flutterwave/payouts'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MONTHLY_MINIMUM = 50
const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-cron-secret')
  if (!CRON_SECRET || authHeader !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const period = new Date().toISOString().slice(0, 7) // YYYY-MM, for idempotency
  const results: { affiliateId: string; success: boolean; amount?: number; error?: string }[] = []

  try {
    const { data: eligible, error } = await supabaseAdmin
      .from('affiliate_profiles')
      .select('id, user_id, pending_payout, payout_currency, flutterwave_recipient_id, payout_activated')
      .eq('payout_activated', true)
      .eq('approved', true)
      .neq('status', 'suspended')
      .gte('pending_payout', MONTHLY_MINIMUM)
      .not('flutterwave_recipient_id', 'is', null)

    if (error) throw error

    for (const affiliate of eligible || []) {
      const reference = buildPayoutReference(affiliate.user_id, 'monthly', period)

      // Idempotency check against affiliate_payouts directly now, the
      // real tracking table, rather than admin_logs, this month's batch
      // already having a row here, in any status, means it already ran
      // for this affiliate, a real, expected failure-recovery case if
      // this job gets re-triggered after a partial run.
      const { data: existingAttempt } = await supabaseAdmin
        .from('affiliate_payouts')
        .select('id')
        .eq('reference', reference)
        .maybeSingle()

      if (existingAttempt) {
        results.push({ affiliateId: affiliate.user_id, success: true, error: 'already attempted this period' })
        continue
      }

      try {
        const usdAmount = affiliate.pending_payout
        const localAmount = await convertUsdToLocal(usdAmount, affiliate.payout_currency)

        const payoutResult = await triggerPayout({
          recipientId: affiliate.flutterwave_recipient_id,
          amountLocal: localAmount,
          currency:    affiliate.payout_currency,
          reference,
        })

        if (payoutResult.success) {
          // Accepted, not completed. Recorded as pending, the webhook
          // handler is what actually zeroes pending_payout and updates
          // total_paid_out once Flutterwave confirms the real outcome.
          await recordPayoutAttempt({
            supabaseAdmin,
            affiliateId: affiliate.id,
            userId:      affiliate.user_id,
            reference,
            transferId:  payoutResult.transferId,
            kind:        'monthly',
            period,
            amountUsd:   usdAmount,
            amountLocal: localAmount,
            currency:    affiliate.payout_currency,
          })

          await supabaseAdmin.from('notifications').insert({
            user_id:    affiliate.user_id,
            type:       'affiliate_payout',
            title:      '💰 Monthly Payout Initiated',
            message:    `Your commission payout of ${localAmount} ${affiliate.payout_currency} is being processed.`,
            data:       { reference },
            read:       false,
            created_at: new Date().toISOString(),
          })

          results.push({ affiliateId: affiliate.user_id, success: true, amount: localAmount })
        } else {
          await supabaseAdmin.from('admin_logs').insert({
            admin_id:   null,
            action:     'payout_failed',
            resource:   affiliate.user_id,
            details:    { period, reason: payoutResult.error, amount: usdAmount },
            created_at: new Date().toISOString(),
          })
          results.push({ affiliateId: affiliate.user_id, success: false, error: payoutResult.error })
        }
      } catch (individualError: any) {
        // One affiliate's failure must never stop the rest of the batch.
        console.error(`[monthly-payouts] Error for ${affiliate.user_id}:`, individualError)
        results.push({ affiliateId: affiliate.user_id, success: false, error: individualError.message })
      }
    }

    return NextResponse.json({
      period,
      processed: results.length,
      accepted:  results.filter(r => r.success).length,
      failed:    results.filter(r => !r.success).length,
      note:      'accepted means Flutterwave accepted the transfer request, not that it has been confirmed delivered, confirmation arrives via webhook separately',
      results,
    })
  } catch (err: any) {
    console.error('[monthly-payouts] Batch error:', err)
    return NextResponse.json({ error: err.message || 'Batch payout failed' }, { status: 500 })
  }
}
