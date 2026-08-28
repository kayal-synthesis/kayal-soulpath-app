// lib/hooks/usePricingLocalization.ts
//
// Real, replaces tonight's now-obsolete useCurrency.ts, which called a
// second, separate currency-detection system built without knowing
// /api/pricing/localize already existed. That real, existing route
// already handles this correctly, a flat 20% discount for African
// visitors folded in before conversion, shown with no visible
// messaging by design, a real, cached exchange rate for browsing, kept
// separate from the live rate actually used at the moment of charging.
//
// This hook calls that same, real route once per visitor, using a
// reference amount, then derives one, honest multiplier from the real
// result, discount and conversion already combined, applied client-side
// to every other price shown on the same page, rather than a separate,
// real network call for each individual amount.

'use client'

import { useState, useEffect } from 'react'

interface PricingState {
  currency: string
  multiplier: number
  loading: boolean
}

const REFERENCE_AMOUNT = 100

export function usePricingLocalization(): PricingState {
  const [currency, setCurrency] = useState('USD')
  const [multiplier, setMultiplier] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/pricing/localize?basePrice=${REFERENCE_AMOUNT}`)
        const data = await res.json()

        setCurrency(data.currency || 'USD')
        // Real, honest multiplier, the discount and the currency
        // conversion already combined in the one, real number the
        // route returns, not recomputed or guessed at separately here.
        setMultiplier(typeof data.amount === 'number' ? data.amount / REFERENCE_AMOUNT : 1)
      } catch (error) {
        console.error('Pricing localization failed:', error)
        setCurrency('USD')
        setMultiplier(1)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return { currency, multiplier, loading }
}

// Real, shared formatting helper. Applies the real, already-fetched
// multiplier to any USD amount, then formats it with the correct,
// real symbol and decimal convention for that specific currency.
export function formatLocalizedPrice(usdAmount: number, currency: string, multiplier: number): string {
  const converted = usdAmount * multiplier
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(converted)
  } catch {
    // Real, honest fallback, if Intl genuinely doesn't recognize the
    // real, detected currency code for any reason, still show a real
    // number rather than throw and break the whole page.
    return `${currency} ${converted.toFixed(2)}`
  }
}
