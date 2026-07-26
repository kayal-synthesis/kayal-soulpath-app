// lib/pricing/localizePrice.ts
//
// The single function tool cards and the purchase page should call for
// showing a price. Applies the flat 20% African discount, converts to
// the visitor's local currency using the cached rate, no visible
// discount messaging, no strikethrough, no "20% off" badge, just the
// final, localized number, exactly as specified: nobody needs to see
// the logic behind it, they should just see a better price.
//
// This is DISPLAY only. The actual amount charged at checkout is
// computed separately, at checkout time, using a live rate via
// lib/flutterwave/payouts.ts's convertUsdToLocal(), not this cached
// value, since a stale display-time rate is fine for showing someone a
// price while browsing, but not fine for what actually gets charged.

import { createClient } from '@supabase/supabase-js'
import { getCountryPricing } from './countryData'

const AFRICAN_DISCOUNT = 0.20 // flat 20% off for every African country, no tiers

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface LocalizedPrice {
  amount:        number  // final display amount, in the local currency, already discounted if applicable
  currency:      string  // ISO 4217 code
  isDiscounted:  boolean
  usdEquivalent: number  // the true USD price this maps to, for internal use (commission math etc), never shown to the customer
}

export async function localizePrice(basePriceUsd: number, countryCode: string | null): Promise<LocalizedPrice> {
  const pricing = getCountryPricing(countryCode)

  const discountedUsd = pricing.isAfrican ? basePriceUsd * (1 - AFRICAN_DISCOUNT) : basePriceUsd

  if (pricing.currency === 'USD') {
    return {
      amount: Math.round(discountedUsd * 100) / 100,
      currency: 'USD',
      isDiscounted: pricing.isAfrican,
      usdEquivalent: discountedUsd,
    }
  }

  const { data: cached } = await supabaseAdmin
    .from('fx_rates_cache')
    .select('rate_to_usd')
    .eq('currency', pricing.currency)
    .maybeSingle()

  if (!cached) {
    // No cached rate yet, e.g. the refresh job has never run for this
    // currency, fall back to USD display rather than show a wrong or
    // zero amount. Should be rare once the daily refresh job is
    // running, but must degrade safely if it hasn't run yet, or a
    // specific currency failed to fetch.
    return {
      amount: Math.round(discountedUsd * 100) / 100,
      currency: 'USD',
      isDiscounted: pricing.isAfrican,
      usdEquivalent: discountedUsd,
    }
  }

  const localAmount = discountedUsd * cached.rate_to_usd

  return {
    amount: Math.round(localAmount * 100) / 100,
    currency: pricing.currency,
    isDiscounted: pricing.isAfrican,
    usdEquivalent: discountedUsd,
  }
}

// For components that already have the country resolved client-side
// (e.g. a manual country override the visitor selected), rather than
// needing a fresh server round-trip.
export function isAfricanCountry(countryCode: string | null): boolean {
  return getCountryPricing(countryCode).isAfrican
}
