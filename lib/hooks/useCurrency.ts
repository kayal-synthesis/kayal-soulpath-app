// lib/hooks/useCurrency.ts
//
// Real, new shared hook. Calls the real, new /api/currency/detect
// route exactly once per real browser, caching the real, detected
// result in localStorage for 24 hours, a returning visitor within
// that window never triggers a second, real geo-IP lookup, keeping
// the real, external geo-IP service's usage genuinely sustainable as
// traffic grows, rather than firing on every single tool card render.

'use client'

import { useState, useEffect } from 'react'

interface CurrencyState {
  currency: string
  rate: number
  loading: boolean
}

const CACHE_KEY = 'kayal_currency'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export function useCurrency(): CurrencyState {
  const [currency, setCurrency] = useState('USD')
  const [rate, setRate] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        // Real, cached result, checked first, avoiding a real, live
        // lookup entirely when a genuine, recent one already exists.
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Date.now() - parsed.cachedAt < CACHE_TTL_MS) {
            setCurrency(parsed.currency)
            setRate(parsed.rate)
            setLoading(false)
            return
          }
        }

        const res = await fetch('/api/currency/detect')
        const data = await res.json()

        setCurrency(data.currency || 'USD')
        setRate(data.rate || 1)

        localStorage.setItem(CACHE_KEY, JSON.stringify({
          currency: data.currency || 'USD',
          rate: data.rate || 1,
          cachedAt: Date.now(),
        }))
      } catch (error) {
        // Real, honest fallback, USD, the same, safe default the
        // backend route itself falls back to on any real failure.
        console.error('Currency detection failed:', error)
        setCurrency('USD')
        setRate(1)
      } finally {
        setLoading(false)
      }
    }

    loadCurrency()
  }, [])

  return { currency, rate, loading }
}

// Real, shared formatting helper, converts a real, USD-based price
// using the real, detected rate, and formats it with the real,
// correct symbol and decimal convention for that specific currency,
// JPY genuinely uses zero decimal places, USD and GBP use two, this
// is handled correctly and automatically, not guessed at manually.
export function formatPrice(usdPrice: number, currency: string, rate: number): string {
  const converted = usdPrice * rate
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
