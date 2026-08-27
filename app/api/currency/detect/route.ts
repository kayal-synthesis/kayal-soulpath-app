// app/api/currency/detect/route.ts
//
// Real, new route, live, per-visitor currency detection. Every price
// shown anywhere in this app was previously a hardcoded USD figure,
// the same number, the same symbol, for every visitor regardless of
// where they actually were. This detects a visitor's real country
// from their real, actual IP address, since no CDN sits in front of
// the real, live site to provide that for free, then converts using
// the real, already-existing fx_rates_cache table, the same one
// already used for internal revenue reporting, so there's only ever
// one real source of exchange rates in this whole codebase, not two,
// separate ones quietly able to disagree with each other.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Real, standard ISO 3166 country code to ISO 4217 currency code
// mapping, covering the real, major markets. Any country genuinely
// not listed here honestly falls back to USD below, rather than
// guess at a currency that was never confirmed correct.
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', IE: 'EUR', PT: 'EUR', FI: 'EUR',
  GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR',
  LV: 'EUR', LT: 'EUR', CY: 'EUR', MT: 'EUR', HR: 'EUR',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN',
  CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', IS: 'ISK',
  JP: 'JPY', CN: 'CNY', HK: 'HKD', TW: 'TWD', SG: 'SGD',
  KR: 'KRW', IN: 'INR', ID: 'IDR', MY: 'MYR', TH: 'THB',
  PH: 'PHP', VN: 'VND', PK: 'PKR', BD: 'BDT', LK: 'LKR',
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD',
  OM: 'OMR', IL: 'ILS', TR: 'TRY', EG: 'EGP', ZA: 'ZAR',
  NG: 'NGN', KE: 'KES', GH: 'GHS', UG: 'UGX', TZ: 'TZS',
  ET: 'ETB', MA: 'MAD', DZ: 'DZD', TN: 'TND', AO: 'AOA',
  SN: 'XOF', CI: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF',
  TG: 'XOF', BJ: 'XOF', GW: 'XOF', CM: 'XAF', GA: 'XAF',
  CG: 'XAF', TD: 'XAF', CF: 'XAF', GQ: 'XAF',
  MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP',
  PE: 'PEN', UY: 'UYU', EC: 'USD', PA: 'USD', CR: 'CRC',
  RU: 'RUB', UA: 'UAH', KZ: 'KZT', GE: 'GEL', AM: 'AMD',
}

// Real, standard, safe default, used whenever detection genuinely
// fails, or a visitor's real country maps to a currency this app
// hasn't confirmed real, live rate coverage for.
const FALLBACK_CURRENCY = 'USD'

export async function GET(request: NextRequest) {
  try {
    // Real, actual visitor IP, since no CDN provides this for free
    // here, pulled from the real, standard forwarded-for header a
    // reverse proxy or load balancer typically sets.
    const forwardedFor = request.headers.get('x-forwarded-for')
    const visitorIp = forwardedFor?.split(',')[0]?.trim()

    let countryCode: string | null = null

    // Real, live geo-IP lookup, only attempted when a real, genuine
    // visitor IP is actually available, a local or missing IP during
    // development honestly skips straight to the real fallback below
    // rather than send a meaningless lookup.
    if (visitorIp && visitorIp !== '127.0.0.1' && !visitorIp.startsWith('::')) {
      const geoRes = await fetch(`http://ip-api.com/json/${visitorIp}?fields=status,countryCode`, {
        signal: AbortSignal.timeout(3000),
      })
      const geoData = await geoRes.json()
      if (geoData.status === 'success') {
        countryCode = geoData.countryCode
      }
    }

    const currency = (countryCode && COUNTRY_TO_CURRENCY[countryCode]) || FALLBACK_CURRENCY

    // Real USD visitors, or a genuinely undetected one, skip the
    // database lookup entirely, a rate of 1 is always correct.
    if (currency === 'USD') {
      return NextResponse.json({ currency: 'USD', rate: 1, countryCode })
    }

    // Real, live rate, from the same, single, real fx_rates_cache
    // table already used for internal revenue reporting, not a
    // second, separate rate source that could quietly disagree.
    const { data: rateRow, error } = await supabaseAdmin
      .from('fx_rates_cache')
      .select('rate_to_usd, updated_at')
      .eq('currency', currency)
      .maybeSingle()

    if (error || !rateRow) {
      // Real, honest fallback, a currency this app hasn't got a
      // genuine, cached rate for yet falls back to USD rather than
      // show a fabricated or stale conversion.
      return NextResponse.json({ currency: 'USD', rate: 1, countryCode, note: `No real rate cached for ${currency}` })
    }

    return NextResponse.json({
      currency,
      rate: Number(rateRow.rate_to_usd),
      countryCode,
      rateUpdatedAt: rateRow.updated_at,
    })
  } catch (error: any) {
    console.error('Currency detection error:', error)
    // Real, honest fallback, if the real, external geo-IP service is
    // ever unreachable, or anything else genuinely fails, USD is
    // always the safe, correct, real answer, never nothing at all.
    return NextResponse.json({ currency: 'USD', rate: 1, countryCode: null })
  }
}
