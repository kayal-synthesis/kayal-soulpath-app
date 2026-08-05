// app/api/pricing/localize/route.ts
//
// The purchase page and tool cards call this, never localizePrice()
// directly, since that function uses the Supabase service role key,
// which must never be present in client-side code at all. This route is
// the only safe bridge between the two.

import { NextRequest, NextResponse } from 'next/server'
import { localizePrice } from '@/lib/pricing/localizePrice'
import { getCountryFromRequest } from '@/lib/pricing/getCountryFromRequest'

export async function GET(request: NextRequest) {
  const basePriceParam = request.nextUrl.searchParams.get('basePrice')
  const countryOverride = request.nextUrl.searchParams.get('country') // for a manual "paying from X" selector, overrides IP detection

  const basePriceUsd = parseFloat(basePriceParam || '')
  if (isNaN(basePriceUsd)) {
    return NextResponse.json({ error: 'Invalid or missing basePrice' }, { status: 400 })
  }

  const countryCode = countryOverride || await getCountryFromRequest(request)
  const result = await localizePrice(basePriceUsd, countryCode)

  return NextResponse.json({ ...result, detectedCountry: countryCode })
}
