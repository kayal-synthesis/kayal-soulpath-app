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
      refCode, jobId, isSubscription,
    } = body

    // email intentionally excluded here, the field on the purchase
    // page was removed entirely, Stripe's own checkout page collects
    // one as a normal part of paying regardless, and the webhook picks
    // it up from there once payment confirms.
    if (!toolId || !toolName || amountCharged == null || !currency) {
      return NextResponse.json({ error: 'Missing required checkout fields' }, { status: 400 })
    }

    // Real, deliberate block, not a UX nicety, this stops a second
    // charge before it can happen at all, not after. These are
    // personalized readings built from birth data that doesn't change,
    // rebuying the same static tool would mean paying again for output
    // that comes back nearly identical. time-keeper tools are the one
    // genuine exception, their content legitimately varies by when
    // they're purchased, everything else, subscription tools included,
    // gets its freshness from renewal, not a manual repurchase.
    //
    // Two separate paths, not one, because purchases.user_id is a real,
    // UUID-typed column, confirmed directly against production data
    // earlier, it structurally cannot hold a device id string at all, a
    // guest never gets a row there in the first place. reading_jobs,
    // by contrast, genuinely does store device ids correctly, so for a
    // guest, a completed reading_jobs row for this device and this
    // tool is the real, honest signal of prior ownership, not
    // purchases. This still only catches the same device, browser, and
    // storage, a deliberate, accepted limit, not every conceivable way
    // around it, extending real protection to every guest scenario
    // would mean collecting an email or requiring an account before
    // purchase, both real, separate product decisions, not something
    // to introduce as a side effect of this fix.
    const isRealAccount = userId && !userId.startsWith('device_')
    const isGuest        = userId && userId.startsWith('device_')
    // v1.1, urgent, real correction, not yet Stripe-managed recurring
    // billing, confirmed directly, this repo has no real subscription
    // mode anywhere, just a one-time charge with "/mo" as display text.
    // Without this exemption, the very first monthly renewal of a
    // subscription tool would be permanently blocked by this same
    // check, indistinguishable from a genuine, accidental repurchase.
    // Real Stripe-native billing is the right eventual fix, this
    // exemption is the correct, honest stopgap until that's built.
    const isTimingTool     = category === 'time-keeper'
    const isSubscriptionTool = !!isSubscription

    if (!isTimingTool && !isSubscriptionTool && isRealAccount) {
      const { data: existingPurchase } = await supabaseAdmin
        .from('purchases')
        .select('id, job_id, purchase_date')
        .eq('user_id', userId)
        .eq('tool_id', toolId)
        .eq('status', 'active')
        .maybeSingle()

      if (existingPurchase) {
        return NextResponse.json({
          error: 'You already own this reading, no need to purchase it again.',
          alreadyOwned: true,
          existingJobId: existingPurchase.job_id,
        }, { status: 409 })
      }
    }

    if (!isTimingTool && !isSubscriptionTool && isGuest) {
      const { data: existingJob } = await supabaseAdmin
        .from('reading_jobs')
        .select('id')
        .eq('user_id', userId)
        .eq('tool_id', toolId)
        .eq('status', 'completed')
        .maybeSingle()

      if (existingJob) {
        return NextResponse.json({
          error: 'You already own this reading on this device, no need to purchase it again.',
          alreadyOwned: true,
          existingJobId: existingJob.id,
        }, { status: 409 })
      }
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
      isSubscription: isSubscriptionTool,
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
