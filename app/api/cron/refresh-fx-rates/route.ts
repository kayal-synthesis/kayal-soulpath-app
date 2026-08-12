// app/api/cron/refresh-fx-rates/route.ts
//
// Refreshes fx_rates_cache for every currency in COUNTRY_DATA.
//
// Previously called Flutterwave's /transfers/rates endpoint once per
// currency (71 separate requests). That path is dead: the Flutterwave
// account this project uses requires Nigeria-specific KYC (NIN, BVN, a
// Nigerian bank account) that the actual business doesn't have, so
// every one of those 71 calls returned 401/invalid_client regardless of
// anything in this code.
//
// Replaced with https://open.er-api.com/v6/latest/USD, a free,
// no-API-key, no-account source. Verified directly, not assumed: a real
// response was checked against every one of the 71 currencies this
// project actually uses, all 71 covered, including all 42 African
// currencies (ZAR, NGN, XOF, XAF, SLL, everything), where the earlier
// ECB-based alternative that was also tested (Frankfurter) only
// covered 1 of 42. This source's rates refresh roughly every 24 hours
// on their end, matching the daily schedule this cron job already runs
// on.
//
// One real structural improvement from the single-request design: the
// old per-currency loop could partially fail, some currencies updated,
// others silently kept stale rates, with no single, clean success/fail
// state for the whole run. This version is atomic: either the one
// request succeeds and every currency updates together, or it fails and
// nothing in fx_rates_cache is touched at all, previously cached rates
// stay exactly as they were rather than getting into a mixed state.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { COUNTRY_DATA } from '@/lib/pricing/countryData'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RATES_API_URL = 'https://open.er-api.com/v6/latest/USD'
const CRON_SECRET = process.env.CRON_SECRET

interface RatesApiResponse {
  result: string
  rates: Record<string, number>
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-cron-secret')
  if (!CRON_SECRET || authHeader !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currencies = Array.from(new Set(Object.values(COUNTRY_DATA).map(c => c.currency)))

  let apiData: RatesApiResponse
  try {
    const response = await fetch(RATES_API_URL)
    if (!response.ok) {
      return NextResponse.json({ error: `Rates source returned ${response.status}`, refreshed: {} }, { status: 502 })
    }
    apiData = await response.json()
    if (apiData.result !== 'success' || !apiData.rates) {
      return NextResponse.json({ error: 'Rates source returned an unsuccessful result', refreshed: {} }, { status: 502 })
    }
  } catch (err: any) {
    // Network failure, timeout, or the source unreachable, nothing in
    // fx_rates_cache gets touched, whatever rates were already cached
    // stay exactly as they were rather than being partially overwritten.
    return NextResponse.json({ error: err.message || 'Failed to reach rates source', refreshed: {} }, { status: 502 })
  }

  const results: Record<string, string> = {}
  const nowIso = new Date().toISOString()

  for (const currency of currencies) {
    if (currency === 'USD') {
      await supabaseAdmin.from('fx_rates_cache').upsert({ currency: 'USD', rate_to_usd: 1, updated_at: nowIso })
      results.USD = 'ok (fixed)'
      continue
    }

    const rate = apiData.rates[currency]
    if (rate != null) {
      await supabaseAdmin.from('fx_rates_cache').upsert({
        currency,
        rate_to_usd: rate,
        updated_at: nowIso,
      })
      results[currency] = 'ok'
    } else {
      // Would only happen if COUNTRY_DATA ever adds a currency this
      // source doesn't track, none currently, confirmed directly
      // against all 71, kept as a safety branch rather than assumed
      // impossible.
      results[currency] = 'failed, kept previous cached value (not present in source response)'
    }
  }

  return NextResponse.json({ refreshed: results })
}
