// ============================================================
// ALL TOOLS INDEX — The bridge layer
// Maps rich domain constants → flat shape used by:
//   - ExploreByLifeArea (domains array)
//   - BestsellerTools (domains array)
//   - NewArrivals (domains array)
//
// Required flat Tool shape:
//   { id, name, emoji, description, shortDescription, features[],
//     price, duration, category, domain, isPopular, isBestSeller,
//     isNew, requiresImage (boolean), requiresImageType (string),
//     href }
//
// Required Domain shape:
//   { id, name, icon, tools: Tool[] }
// ============================================================

import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { omniTools }         from '@/lib/constants/omni-seer-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'

// ─────────────────────────────────────────────────────────────
// Flat tool shape — what the dashboard components expect
// ─────────────────────────────────────────────────────────────
export interface Tool {
  id: string
  name: string
  emoji: string
  description: string
  shortDescription: string
  features: string[]
  price: number
  duration?: string
  category: string          // domain id for icon/colour lookups
  domain: string            // human-readable domain name
  isPopular?: boolean
  isBestSeller?: boolean
  isNew?: boolean
  requiresImage: boolean
  requiresImageType: string
  href: string
}

export interface Domain {
  id: string
  name: string
  icon: string              // emoji icon used for domain cards
  tools: Tool[]
}

// ─────────────────────────────────────────────────────────────
// Helper — converts requiresImage from rich object or null
// into the two flat booleans the dashboard expects
// ─────────────────────────────────────────────────────────────
function flattenImageReq(req: { type: string } | null | undefined): {
  requiresImage: boolean
  requiresImageType: string
} {
  if (!req) return { requiresImage: false, requiresImageType: '' }
  return {
    requiresImage: true,
    requiresImageType: req.type,          // 'face' | 'palm' | 'both'
  }
}

// ─────────────────────────────────────────────────────────────
// Helper — extracts features as plain strings from whatYouGet
// (all domain files use whatYouGet; features[] is the flat alias)
// ─────────────────────────────────────────────────────────────
function toFeatures(source: any): string[] {
  if (Array.isArray(source?.whatYouGet))  return source.whatYouGet as string[]
  if (Array.isArray(source?.features))    return source.features as string[]
  return []
}

// ─────────────────────────────────────────────────────────────
// Helper — builds short description from hook or tagline
// ─────────────────────────────────────────────────────────────
function toShortDescription(tool: any): string {
  if (tool.tagline) return tool.tagline
  if (tool.hook)    return tool.hook.slice(0, 120)
  return tool.name
}

// ─────────────────────────────────────────────────────────────
// Subscription duration label (for subscription tools)
// ─────────────────────────────────────────────────────────────
function toDuration(tool: any): string | undefined {
  if (tool.subscriptionPeriod === 'month') return '/month'
  if (tool.sessionDurationMinutes)         return `${tool.sessionDurationMinutes}-min session`
  return undefined
}

// ─────────────────────────────────────────────────────────────
// DOMAIN DEFINITIONS — id + name + icon + mapped tools
// ─────────────────────────────────────────────────────────────

// LOVE & RELATIONSHIPS
const loveDomain: Domain = {
  id:   'love',
  name: "Love & Relationships",
  icon: '💞',
  tools: loveTools.map(t => {
    const { requiresImage, requiresImageType } = flattenImageReq(t.requiresImage as any)
    return {
      id:               t.id,
      name:             t.name,
      emoji:            t.emoji,
      description:      t.hook?.slice(0, 160) ?? t.tagline,
      shortDescription: toShortDescription(t),
      features:         toFeatures(t),
      price:            t.price,
      duration:         toDuration(t),
      category:         'love',
      domain:           'Love & Relationships',
      isPopular:        t.isPopular,
      isBestSeller:     t.isBestSeller,
      isNew:            t.isNew,
      requiresImage,
      requiresImageType,
      href:             `/purchase/${t.id}`,
    }
  }),
}

// WEALTH & CAREER
const wealthDomain: Domain = {
  id:   'wealth',
  name: 'Wealth & Career',
  icon: '💰',
  tools: wealthTools.map(t => {
    const { requiresImage, requiresImageType } = flattenImageReq(t.requiresImage as any)
    return {
      id:               t.id,
      name:             t.name,
      emoji:            t.emoji,
      description:      t.hook?.slice(0, 160) ?? t.tagline,
      shortDescription: toShortDescription(t),
      features:         toFeatures(t),
      price:            t.price,
      duration:         toDuration(t),
      category:         'wealth',
      domain:           'Wealth & Career',
      isPopular:        t.isPopular,
      isBestSeller:     t.isBestSeller,
      isNew:            t.isNew,
      requiresImage,
      requiresImageType,
      href:             `/purchase/${t.id}`,
    }
  }),
}

// WELLNESS & SPIRITUALITY
const wellnessDomain: Domain = {
  id:   'wellness',
  name: 'Wellness & Spirituality',
  icon: '🌙',
  tools: wellnessTools.map(t => {
    const { requiresImage, requiresImageType } = flattenImageReq(t.requiresImage as any)
    return {
      id:               t.id,
      name:             t.name,
      emoji:            t.emoji,
      description:      t.hook?.slice(0, 160) ?? t.tagline,
      shortDescription: toShortDescription(t),
      features:         toFeatures(t),
      price:            t.price,
      duration:         toDuration(t),
      category:         'spiritual',
      domain:           'Wellness & Spirituality',
      isPopular:        t.isPopular,
      isBestSeller:     t.isBestSeller,
      isNew:            t.isNew,
      requiresImage,
      requiresImageType,
      href:             `/purchase/${t.id}`,
    }
  }),
}

// LIFE PATH & DESTINY
const lifePathDomain: Domain = {
  id:   'life-path',
  name: 'Life Path & Destiny',
  icon: '🌟',
  tools: lifePathTools.map(t => {
    const { requiresImage, requiresImageType } = flattenImageReq(t.requiresImage as any)
    return {
      id:               t.id,
      name:             t.name,
      emoji:            t.emoji,
      description:      t.hook?.slice(0, 160) ?? t.tagline,
      shortDescription: toShortDescription(t),
      features:         toFeatures(t),
      price:            t.price,
      duration:         toDuration(t),
      category:         'life-path',
      domain:           'Life Path & Destiny',
      isPopular:        t.isPopular,
      isBestSeller:     t.isBestSeller,
      isNew:            t.isNew,
      requiresImage,
      requiresImageType,
      href:             `/purchase/${t.id}`,
    }
  }),
}

// OMNI-SEER SANCTUM
const omniDomain: Domain = {
  id:   'oracle-temple',
  name: 'Omni-Seer Sanctum',
  icon: '👑',
  tools: omniTools.map(t => {
    const { requiresImage, requiresImageType } = flattenImageReq(t.requiresImage as any)
    return {
      id:               t.id,
      name:             t.name,
      emoji:            t.emoji,
      description:      t.hook?.slice(0, 160) ?? t.tagline,
      shortDescription: toShortDescription(t),
      features:         toFeatures(t),
      price:            t.price,
      duration:         toDuration(t),
      category:         'oracle-temple',
      domain:           'Omni-Seer Sanctum',
      isPopular:        t.isPopular,
      isBestSeller:     t.isBestSeller,
      isNew:            t.isNew,
      requiresImage,
      requiresImageType,
      href:             `/purchase/${t.id}`,
    }
  }),
}

// SACRED SCRIPT (subscription chat)
const sacredScriptDomain: Domain = {
  id:   'sacred-script',
  name: 'Sacred Script',
  icon: '📜',
  tools: sacredScriptTools.map(t => ({
    id:               t.id,
    name:             t.name,
    emoji:            t.emoji,
    description:      t.hook?.slice(0, 160) ?? t.tagline,
    shortDescription: toShortDescription(t),
    features:         toFeatures(t),
    price:            t.price,
    duration:         '/month',
    category:         'sacred-script',
    domain:           'Sacred Script',
    isPopular:        t.isPopular,
    isBestSeller:     t.isBestSeller,
    isNew:            t.isNew,
    requiresImage:    false,
    requiresImageType:'',
    href:             `/purchase/${t.id}`,
  })),
}

// ETERNAL CLOCK (subscription forecasting)
const timeKeeperDomain: Domain = {
  id:   'time-keeper',
  name: 'Eternal Clock',
  icon: '⏳',
  tools: timeKeeperTools.map(t => ({
    id:               t.id,
    name:             t.name,
    emoji:            t.emoji,
    description:      t.hook?.slice(0, 160) ?? t.tagline,
    shortDescription: toShortDescription(t),
    features:         toFeatures(t),
    price:            t.price,
    duration:         '/month',
    category:         'time-keeper',
    domain:           'Eternal Clock',
    isPopular:        t.isPopular,
    isBestSeller:     t.isBestSeller,
    isNew:            t.isNew,
    requiresImage:    false,
    requiresImageType:'',
    href:             `/purchase/${t.id}`,
  })),
}

// VOICE OF PROPHECY (subscription voice)
const voiceDomain: Domain = {
  id:   'voice',
  name: 'Voice of Prophecy',
  icon: '🎙️',
  tools: voiceTools.map(t => ({
    id:               t.id,
    name:             t.name,
    emoji:            t.emoji,
    description:      t.hook?.slice(0, 160) ?? t.tagline,
    shortDescription: toShortDescription(t),
    features:         toFeatures(t),
    price:            t.price,
    duration:         t.sessionDurationMinutes
                        ? `${t.sessionDurationMinutes}-min session`
                        : '/month',
    category:         'voice',
    domain:           'Voice of Prophecy',
    isPopular:        t.isPopular,
    isBestSeller:     t.isBestSeller,
    isNew:            t.isNew,
    requiresImage:    false,
    requiresImageType:'',
    href:             `/purchase/${t.id}`,
  })),
}

// ─────────────────────────────────────────────────────────────
// PRIMARY EXPORT — consumed by ExploreByLifeArea, BestsellerTools,
// NewArrivals, and any other dashboard components
// ─────────────────────────────────────────────────────────────
export const domains: Domain[] = [
  loveDomain,
  wealthDomain,
  wellnessDomain,
  lifePathDomain,
  omniDomain,
  sacredScriptDomain,
  timeKeeperDomain,
  voiceDomain,
]

// ─────────────────────────────────────────────────────────────
// CONVENIENCE HELPERS — used by dashboard personalisation layer
// ─────────────────────────────────────────────────────────────

/** Flat array of every tool across all domains */
export const allTools: Tool[] = domains.flatMap(d => d.tools)

/** Look up any tool by id across all domains */
export const getToolById = (id: string): Tool | undefined =>
  allTools.find(t => t.id === id)

/** All popular tools across domains — for dashboard "popular" section */
export const getPopularTools = (): Tool[] =>
  allTools.filter(t => t.isPopular)

/** All bestseller tools — for BestsellerTools component */
export const getBestsellerTools = (): Tool[] =>
  allTools.filter(t => t.isBestSeller)

/** All new arrivals — for NewArrivals component */
export const getNewArrivalTools = (): Tool[] =>
  allTools.filter(t => t.isNew)

/** Tools requiring face photo upload */
export const getFaceTools = (): Tool[] =>
  allTools.filter(t => t.requiresImageType === 'face' || t.requiresImageType === 'both')

/** Tools requiring palm photo upload */
export const getPalmTools = (): Tool[] =>
  allTools.filter(t => t.requiresImageType === 'palm' || t.requiresImageType === 'both')

/** Get domain by id */
export const getDomainById = (id: string): Domain | undefined =>
  domains.find(d => d.id === id)

/** Total tool count across all domains */
export const totalToolCount = allTools.length

// ─────────────────────────────────────────────────────────────
// PERSONALISATION LAYER — Dashboard selects tools based on
// computed synthesis indicators from user profile
// ─────────────────────────────────────────────────────────────

export interface SynthesisIndicators {
  lifePathNumber?: number      // 1-9, 11, 22, 33
  personalYearNumber?: number  // 1-9
  hasKarmicDebts?: boolean
  dominantDomain?: 'love' | 'wealth' | 'wellness' | 'life-path'
  hasPalmData?: boolean
  hasFaceData?: boolean
}

/**
 * Returns 8-12 personalised tools for the home dashboard
 * based on computed synthesis indicators.
 * Fallback: returns popular tools if no indicators provided.
 */
export function getPersonalisedDashboardTools(
  indicators?: SynthesisIndicators
): Tool[] {
  if (!indicators) return getPopularTools().slice(0, 12)

  const selected: Tool[] = []

  // Always include the personal year forecast if we know the year
  if (indicators.personalYearNumber) {
    const forecast = getToolById('annual-destiny-forecast')
    if (forecast) selected.push(forecast)
    const cycle    = getToolById('nine-year-cycle-reading-os')
    if (cycle)     selected.push(cycle)
  }

  // Karmic debt holders always see the cleanser
  if (indicators.hasKarmicDebts) {
    const debt = getToolById('karmic-debt-cleanser')
    if (debt) selected.push(debt)
  }

  // Dominant domain — show 3 tools from that domain
  if (indicators.dominantDomain) {
    const domainTools = getDomainById(indicators.dominantDomain)?.tools ?? []
    const popular     = domainTools.filter(t => t.isPopular).slice(0, 3)
    selected.push(...popular)
  }

  // Palm data available — show palmistry tools
  if (indicators.hasPalmData) {
    const fate    = getToolById('fate-line-mission-reading')
    const heart   = getToolById('heart-line-love-map')
    if (fate)     selected.push(fate)
    if (heart)    selected.push(heart)
  }

  // Face data available — show physiognomy tools
  if (indicators.hasFaceData) {
    const wealth  = getToolById('mian-xiang-wealth-face')
    const face    = getToolById('face-shape-character-verdict')
    if (wealth)   selected.push(wealth)
    if (face)     selected.push(face)
  }

  // Fill remaining slots with globally popular tools not yet included
  const remaining = getPopularTools()
    .filter(t => !selected.find(s => s.id === t.id))
    .slice(0, Math.max(0, 12 - selected.length))

  return [...selected, ...remaining].slice(0, 12)
}