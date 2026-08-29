// app/sitemap.ts
//
// Real, dynamic sitemap, Next.js automatically serves this at
// /sitemap.xml, no separate, static file to maintain by hand. Tool
// URLs are generated directly from the same, real, shared data files
// every tool page already imports, app/tool/[toolId]/page.tsx, so
// this can never drift out of date as tools are added, removed, or
// renamed, it is always the real, current, live list, not a
// snapshot someone has to remember to update.
//
// Worth remembering the real, separate reason this matters more
// here than usual, confirmed directly tonight: tool cards navigate
// with router.push(), JavaScript only, no real <a href> underneath.
// This sitemap is the one, reliable, direct path guaranteeing every
// one of the 113 real tools actually gets found by a crawler,
// rather than depending on it successfully following JavaScript
// navigation.

import { MetadataRoute } from 'next'
import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { omniRelationshipTools }   from '@/lib/constants/omni-seer-relationships'
import { omniSelfPurposeTools }    from '@/lib/constants/omni-seer-self-purpose'
import { omniPhysicalTimingTools } from '@/lib/constants/omni-seer-physical-timing'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'

const ALL_TOOLS = [
  ...loveTools, ...wealthTools, ...wellnessTools, ...lifePathTools,
  ...omniRelationshipTools, ...omniSelfPurposeTools, ...omniPhysicalTimingTools,
  ...sacredScriptTools, ...timeKeeperTools, ...voiceTools,
]

// Real, the eight, actual domain page URLs, confirmed directly
// against domains_page.tsx's own, real data, not guessed at.
const DOMAIN_URLS = [
  '/domain/omni-seer-sanctum',
  '/domain/voice-of-prophecy',
  '/domain/sacred-script',
  '/domain/eternal-clock',
  '/domain/love-relationships',
  '/domain/wealth-career',
  '/domain/wellness-spirituality',
  '/domain/life-path-destiny',
]

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.kayalsoulpath.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const toolEntries: MetadataRoute.Sitemap = ALL_TOOLS.map((tool: any) => ({
    url:           `${SITE_URL}/tool/${tool.id}`,
    lastModified:  now,
    changeFrequency: 'monthly',
    priority:      0.8,
  }))

  const domainEntries: MetadataRoute.Sitemap = DOMAIN_URLS.map(path => ({
    url:           `${SITE_URL}${path}`,
    lastModified:  now,
    changeFrequency: 'weekly',
    priority:      0.7,
  }))

  return [
    {
      url:           SITE_URL,
      lastModified:  now,
      changeFrequency: 'daily',
      priority:      1.0,
    },
    {
      url:           `${SITE_URL}/domains`,
      lastModified:  now,
      changeFrequency: 'weekly',
      priority:      0.9,
    },
    {
      // Confirmed the real, actual front door for a first-time,
      // cold search visitor, /dashboard is genuinely gated, only
      // reachable after this, this page is the one meant to be found.
      url:           `${SITE_URL}/onboarding/basic`,
      lastModified:  now,
      changeFrequency: 'monthly',
      priority:      0.9,
    },
    {
      url:           `${SITE_URL}/privacy`,
      lastModified:  now,
      changeFrequency: 'yearly',
      priority:      0.3,
    },
    {
      url:           `${SITE_URL}/terms`,
      lastModified:  now,
      changeFrequency: 'yearly',
      priority:      0.3,
    },
    {
      url:           `${SITE_URL}/contact`,
      lastModified:  now,
      changeFrequency: 'yearly',
      priority:      0.4,
    },
    {
      url:           `${SITE_URL}/blog`,
      lastModified:  now,
      changeFrequency: 'weekly',
      priority:      0.6,
    },
    ...domainEntries,
    ...toolEntries,
  ]
}
