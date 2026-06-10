/**
 * lib/hooks/useDomainTheme.ts
 * ============================
 * Applies the correct domain background class to <body>
 * when a user enters a domain session.
 *
 * The background shift is subtle — 2-3% colour temperature —
 * but transforms each session into its own emotional environment.
 *
 * Domain → CSS class → --domain-bg variable → background colour
 *
 * Usage:
 *   useDomainTheme('love')      → body gets .domain-love
 *   useDomainTheme('spiritual') → body gets .domain-spiritual
 *   useDomainTheme(null)        → removes all domain classes
 */

import { useEffect } from 'react'

const DOMAIN_CLASSES = [
  'domain-love',
  'domain-wealth',
  'domain-spiritual',
  'domain-health',
  'domain-purpose',
  'domain-grief',
  'domain-timing',
  'domain-voice',
  'domain-all',
] as const

type Domain =
  | 'love' | 'wealth' | 'spiritual' | 'health'
  | 'purpose' | 'grief' | 'timing' | 'voice' | 'all'
  | null

export function useDomainTheme(domain: Domain) {
  useEffect(() => {
    const body = document.body

    // Remove all domain classes
    DOMAIN_CLASSES.forEach(cls => body.classList.remove(cls))

    // Apply grain texture to body (always)
    body.classList.add('grain')

    // Apply domain class if set
    if (domain) {
      body.classList.add(`domain-${domain}`)
      body.style.background = `var(--bg-${domain}, var(--mineral-1))`
    } else {
      body.style.background = 'var(--mineral-1)'
    }

    return () => {
      DOMAIN_CLASSES.forEach(cls => body.classList.remove(cls))
      body.style.background = ''
    }
  }, [domain])
}

/**
 * Map tool IDs to domains for both chat and voice tools
 */
export const TOOL_DOMAIN_MAP: Record<string, Domain> = {
  // Sacred Script — chat
  'the-life-scribe':     'all',
  'love-scribe':         'love',
  'wealth-scribe':       'wealth',
  'spiritual-scribe':    'spiritual',
  'health-scribe':       'health',
  'purpose-scribe':      'purpose',
  'relationship-scribe': 'love',
  'grief-scribe':        'grief',
  'parenting-scribe':    'all',
  'business-scribe':     'wealth',

  // Voice of Prophecy
  'oracle-voice-session':        'all',
  'oracle-deep-dive-session':    'all',
  'love-oracle-session':         'love',
  'wealth-oracle-session':       'wealth',
  'purpose-oracle-session':      'purpose',
  'daily-voice-briefing':        'timing',
  'relationship-oracle-session': 'love',
  'spiritual-oracle-session':    'spiritual',
  'crisis-oracle-session':       'all',
  'oracle-voice-unlimited':      'all',
}

/**
 * Get the accent colour for a domain
 */
export const DOMAIN_ACCENT: Record<string, string> = {
  love:      '#d4856a',
  wealth:    '#c9a96e',
  spiritual: '#a48ac4',
  health:    '#7aaa8a',
  purpose:   '#7a9ac4',
  grief:     '#8a9aaa',
  timing:    '#a0c49a',
  voice:     '#c9a96e',
  all:       '#c9a96e',
}

export function getDomainAccent(domain: string | null): string {
  return DOMAIN_ACCENT[domain ?? 'all'] ?? '#c9a96e'
}

/**
 * Get the CSS background variable name for a domain
 */
export function getDomainBg(domain: string | null): string {
  const map: Record<string, string> = {
    love:      '#110a09',
    wealth:    '#0f0c07',
    spiritual: '#09080f',
    health:    '#090f0a',
    purpose:   '#08090f',
    grief:     '#0a0b0e',
    timing:    '#0a0f09',
    voice:     '#0f0c07',
    all:       '#0d0b0f',
  }
  return map[domain ?? 'all'] ?? '#0d0b0f'
}
