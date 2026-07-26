// app/api/cron/refresh-fx-rates/route.ts
//
// Refreshes fx_rates_cache for every currency in COUNTRY_DATA, using the
// same confirmed Flutterwave rates endpoint and source/destination
// mapping already verified and used in lib/flutterwave/payouts.ts.
// Querying with destination.amount = 1 USD gives back, in
// response.data.source.amount, exactly the rate (how much of that
// currency equals 1 USD), which is what gets cached and then simply
// multiplied by any price at display time.
//
// Needs wiring into the same scheduling mechanism as the monthly payout
// job, run daily is reasonable, display prices don't need to the minute
// accuracy, unlike an actual charge or payout.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { COUNTRY_DATA } from '@/lib/pricing/countryData'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FLW_API_BASE = process.env.FLUTTERWAVE_ENV === 'production'
  ? 'https://api.flutterwave.com'
  : 'https://developersandbox-api.flutterwave.com'
const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY
const CRON_SECRET = process.env.CRON_SECRET

async function fetchRate(currency: string): Promise<number | null> {
  try {
    const response = await fetch(`${FLW_API_BASE}/transfers/rates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        source:      { currency },
        destination: { currency: 'USD', amount: 1 },
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    const rate = data?.data?.source?.amount
    return rate != null ? parseFloat(rate) : null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-cron-secret')
  if (!CRON_SECRET || authHeader !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currencies = Array.from(new Set(Object.values(COUNTRY_DATA).map(c => c.currency)))
  const results: Record<string, string> = {}

  for (const currency of currencies) {
    if (currency === 'USD') {
      await supabaseAdmin.from('fx_rates_cache').upsert({ currency: 'USD', rate_to_usd: 1, updated_at: new Date().toISOString() })
      results.USD = 'ok (fixed)'
      continue
    }

    const rate = await fetchRate(currency)
    if (rate != null) {
      await supabaseAdmin.from('fx_rates_cache').upsert({
        currency,
        rate_to_usd: rate,
        updated_at:  new Date().toISOString(),
      })
      results[currency] = 'ok'
    } else {
      // Deliberately does not overwrite a previously-cached rate with a
      // failure, a stale-but-real rate from yesterday is better than no
      // rate at all for display purposes.
      results[currency] = 'failed, kept previous cached value'
    }
  }

  return NextResponse.json({ refreshed: results })
}
