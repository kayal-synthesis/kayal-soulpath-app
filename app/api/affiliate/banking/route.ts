// app/api/affiliate/banking/route.ts
//
// Affiliates submit their raw banking details here, once. This is the
// only place in the whole system that ever sees the raw account number,
// it gets sent straight to Flutterwave to create a recipient reference,
// and only that reference (plus bank name and last 4 digits for display)
// gets written to our own database. The raw number is never stored,
// never logged, never appears anywhere downstream of this function.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPayoutRecipient } from '@/lib/flutterwave/payouts'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, accountBank, accountNumber, currency } = body

    if (!userId || !accountBank || !accountNumber || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: profile } = await supabaseAdmin
      .from('affiliate_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'No affiliate profile found for this user' }, { status: 404 })
    }

    // Everything sensitive stops here. Only the returned reference and
    // display-safe fields go into our own database from this point on.
    const recipient = await createPayoutRecipient({
      accountBank,
      accountNumber,
      currency,
    })

    const { error: updateError } = await supabaseAdmin
      .from('affiliate_profiles')
      .update({
        flutterwave_recipient_id: recipient.recipientId,
        bank_name:                recipient.bankName,
        account_last4:            recipient.last4,
        payout_currency:          currency,
      })
      .eq('id', profile.id)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      bankName: recipient.bankName,
      last4:    recipient.last4,
    })
  } catch (err: any) {
    console.error('[affiliate/banking] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to save banking details' }, { status: 500 })
  }
}
