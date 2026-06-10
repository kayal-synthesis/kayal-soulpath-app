// ============================================================
// SACRED SCRIPT — 10 Chat Subscription Tools
// Domain: Whispering Scroll
// Route: /domain/sacred-script
// ============================================================

export interface ToolLimits {
  // Monthly message allowance
  messagesPerMonth:  number   // hard limit
  warningAt:         number   // show warning banner
  graceMessages:     number   // extra messages after limit before hard stop

  // Memory
  sessionMemoryDepth: 'session' | 'three-sessions' | 'full'
  // session        = current session only (last 20 messages)
  // three-sessions = last 3 sessions loaded on open
  // full           = complete history across all sessions

  // Synthesis scope injected as context
  synthesisScope:
    | 'domain-only'   // domain section + core numbers only
    | 'full'          // full synthesis + all domain sections
    | 'full-extended' // full synthesis + both charts (partner/business)

  // Oracle response depth instruction
  responseDepth: 'standard' | 'deep' | 'fullest'
  // standard = 2–4 paragraphs, domain-focused
  // deep     = 3–6 paragraphs, cross-domain connections allowed
  // fullest  = no length restriction, multi-system synthesis, full depth

  // Which oracle domains are in scope
  domainScope: string[]
  // Determines which synthesis sections are prioritised
  // and which out-of-scope redirects fire

  // Reset — aligns with billing date, not calendar month
  resetOnBillingDate: true
}

export interface SacredScriptTool {
  id: string
  name: string
  tagline: string
  emoji: string
  hook: string
  price: number
  domain: 'sacred-script'
  subscriptionPeriod: 'month'
  isPopular?: boolean
  isBestSeller?: boolean
  isNew?: boolean
  rating?: number
  reviewCount?: number
  whatYouGet: string[]
  guidanceType?: 'daily-guidance'
  guidanceText?: string
  upsell?: { id: string; name: string; price: number }
  limits: ToolLimits
}

export const sacredScriptTools: SacredScriptTool[] = [
  {
    id: 'the-life-scribe',
    name: 'The Life Scribe',
    tagline: 'Any topic, any depth — your complete synthesis loaded before your first word',
    emoji: '📝',
    price: 37,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    isPopular: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 2341,
    hook: 'An ongoing written dialogue with an AI that holds your complete four-system synthesis. Ask about love, career, purpose, timing, or anything else. Unlike a static report, the scribe remembers what you have discussed, builds on previous conversations, and deepens its understanding of your situation over time.',
    whatYouGet: [
      'Full synthesis loaded — your chart, birth pattern, and timing cycles active before you write',
      'Any domain available — love, career, wealth, spirituality, timing, purpose all in scope',
      'Conversation memory — builds understanding across your last 3 sessions',
      'Follow-up questions welcome — responds to clarifications and digs deeper on request',
      'Remedy and solution suggestions where appropriate — drawn from your heritage tradition',
      '400 messages per month — resets on your billing date',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Every conversation includes a specific next step or daily action calibrated to your synthesis and the topic discussed — not generic advice but a chart-grounded recommendation.',
    upsell: { id: 'the-destiny-speaker', name: 'The Destiny Speaker', price: 37 },
    limits: {
      messagesPerMonth:   400,
      warningAt:          380,
      graceMessages:      5,
      sessionMemoryDepth: 'three-sessions',
      synthesisScope:     'full',
      responseDepth:      'deep',
      domainScope:        ['love','wealth','spiritual','health','purpose','grief','timing','all'],
      resetOnBillingDate: true,
    },
  },
  {
    id: 'love-scribe',
    name: 'The Love Scribe',
    tagline: 'Deep written dialogue focused entirely on your love life and relationships',
    emoji: '💌',
    price: 29,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    isPopular: true,
    rating: 4.8,
    reviewCount: 1876,
    hook: 'Most love questions deserve more than a one-time reading. Patterns shift, circumstances evolve, and what you need to understand about your love life changes month to month. This is a dedicated channel where your complete love blueprint is loaded as permanent context — so every question you bring gets a response grounded in your actual design, not a generic answer.',
    whatYouGet: [
      'Love synthesis loaded — heart line, Venus, 7th house, karmic love patterns, and soul urge all active',
      'Current relationship assessment — honest, specific, chart-grounded',
      'Pattern identification — the scribe notices and names patterns across conversations',
      'Timing guidance — when love windows open, when to act, when to wait',
      'Karmic love insight — what the pattern is teaching, what the remedy is',
      '300 messages per month — resets on your billing date',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Each love conversation closes with a specific daily practice for the pattern or question discussed — drawn from your heritage tradition and calibrated to your Venus placement.',
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 37 },
    limits: {
      messagesPerMonth:   300,
      warningAt:          280,
      graceMessages:      5,
      sessionMemoryDepth: 'session',
      synthesisScope:     'domain-only',
      responseDepth:      'standard',
      domainScope:        ['love'],
      resetOnBillingDate: true,
    },
  },
  {
    id: 'wealth-scribe',
    name: 'The Wealth Scribe',
    tagline: 'Dedicated financial dialogue — your wealth blueprint as the constant context',
    emoji: '💹',
    price: 29,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    isPopular: true,
    rating: 4.8,
    reviewCount: 1543,
    hook: 'Financial decisions made without context are gambling. This channel loads your complete wealth blueprint before your first question — your earning design, your timing windows, your income ceiling pattern, and your natural wealth channel — so every career or business question you bring is answered against the actual structure of your financial design.',
    whatYouGet: [
      'Wealth synthesis loaded — fate line, Jupiter, wealth palace indicators, Personal Year, all active',
      'Career and business guidance — chart-grounded responses to your specific professional questions',
      'Timing precision — wealth windows, career advancement months, and caution periods identified',
      'Business idea validation — how a specific idea aligns with your Founder Archetype',
      'Income ceiling work — the scribe tracks your patterns and notices ceiling behaviours as they arise',
      '300 messages per month — resets on your billing date',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Each wealth conversation ends with a specific practical action for the next 24 hours — not generic advice but a move calibrated to your current cycle and the specific question.',
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 37 },
    limits: {
      messagesPerMonth:   300,
      warningAt:          280,
      graceMessages:      5,
      sessionMemoryDepth: 'session',
      synthesisScope:     'domain-only',
      responseDepth:      'standard',
      domainScope:        ['wealth'],
      resetOnBillingDate: true,
    },
  },
  {
    id: 'spiritual-scribe',
    name: 'The Spiritual Scribe',
    tagline: 'Deep spiritual dialogue — your awakening stage, gifts, and path as the context',
    emoji: '🕯️',
    price: 29,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    rating: 4.9,
    reviewCount: 1234,
    hook: 'A dedicated spiritual dialogue channel with your complete spiritual synthesis loaded — awakening stage, spiritual gifts, shadow work in progress, ancestral pattern, and heritage tradition all active as context for every conversation.',
    whatYouGet: [
      'Spiritual synthesis loaded — awakening stage, gifts, shadow work, ancestral pattern, tradition',
      'Awakening navigation — chart-grounded responses to spiritual experiences and questions',
      'Shadow and integration work — the scribe holds the shadow portrait across conversations',
      'Heritage practice guidance — practices from your specific ancestral tradition',
      'Dark night navigation — if you are in a dark night, the scribe knows and responds accordingly',
      '300 messages per month — resets on your billing date',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Each spiritual conversation includes a specific practice recommendation for the day — drawn from your heritage tradition and calibrated to your current awakening stage.',
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 37 },
    limits: {
      messagesPerMonth:   300,
      warningAt:          280,
      graceMessages:      5,
      sessionMemoryDepth: 'session',
      synthesisScope:     'domain-only',
      responseDepth:      'standard',
      domainScope:        ['spiritual'],
      resetOnBillingDate: true,
    },
  },
  {
    id: 'health-scribe',
    name: 'The Health Scribe',
    tagline: 'Personalised wellness dialogue — your constitution as the constant context',
    emoji: '⚕️',
    price: 29,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    rating: 4.7,
    reviewCount: 987,
    hook: 'Generic wellness advice fails most people because it is not designed for their specific constitution. This channel loads your complete constitutional portrait before your first question — your body type, your elemental design, your seasonal vulnerabilities, your vitality pattern — so every health question you bring is answered against who you actually are, not who the advice was written for.',
    whatYouGet: [
      'Constitutional portrait loaded — body type, elemental balance, 6th house health indicators, vitality markers',
      'Symptom guidance — responses calibrated to your constitutional vulnerabilities',
      'Seasonal health guidance — what your constitution needs in the current season',
      'Lifestyle and dietary answers — specific to your constitution type',
      'Vitality cycle awareness — current cycle phase and its health implications',
      '300 messages per month — resets on your billing date',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Each health conversation ends with a specific daily practice recommendation — one action calibrated to the constitutional type and the health question raised.',
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 37 },
    limits: {
      messagesPerMonth:   300,
      warningAt:          280,
      graceMessages:      5,
      sessionMemoryDepth: 'session',
      synthesisScope:     'domain-only',
      responseDepth:      'standard',
      domainScope:        ['health'],
      resetOnBillingDate: true,
    },
  },
  {
    id: 'purpose-scribe',
    name: 'The Purpose Scribe',
    tagline: 'Deep purpose dialogue — your soul contract and calling as the constant context',
    emoji: '🧭',
    price: 29,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    rating: 4.9,
    reviewCount: 876,
    hook: 'A dedicated purpose and calling channel with your complete purpose synthesis loaded — soul contract, dharma, fate line, Midheaven, and Pinnacle phase all active as context. Ask about your calling, your direction, your next move, or what this chapter is for.',
    whatYouGet: [
      'Purpose synthesis loaded — soul contract, dharma, fate line, Midheaven, Pinnacle all active',
      'Calling navigation — specific chart-grounded guidance for moving toward your dharmic calling',
      'Purpose check-ins — the scribe tracks your progress and reflects alignment and misalignment',
      'Transition guidance — navigating Pinnacle transitions and Personal Year shifts',
      'Next move precision — chart-grounded responses to specific career and purpose decisions',
      '300 messages per month — resets on your billing date',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Each purpose conversation ends with the most immediately available step toward calling alignment — specific to current Pinnacle and Personal Year, not a long-term plan but a right-now action.',
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 37 },
    limits: {
      messagesPerMonth:   300,
      warningAt:          280,
      graceMessages:      5,
      sessionMemoryDepth: 'session',
      synthesisScope:     'domain-only',
      responseDepth:      'standard',
      domainScope:        ['purpose'],
      resetOnBillingDate: true,
    },
  },
  {
    id: 'relationship-scribe',
    name: 'The Relationship Scribe',
    tagline: 'Dedicated relationship dialogue for couples — both charts as context',
    emoji: '👫',
    price: 47,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    isPopular: true,
    rating: 4.8,
    reviewCount: 1234,
    hook: 'A dedicated couples\' dialogue channel where both partners\' charts are loaded as context — compatibility, karmic contract, friction points, and growth opportunities all known before the first message. Navigate your relationship with both charts as the constant backdrop.',
    whatYouGet: [
      'Both partner charts loaded — compatibility, karmic contract, and friction points all active as context',
      'Conflict navigation — specific chart-grounded guidance for recurring conflicts',
      'Communication guidance — the specific adjustments each chart needs for the other to feel heard',
      'Timing awareness — relationship windows, challenge periods, and growth phases',
      'Karmic progress tracking — the scribe notices and reflects karmic completion over time',
      '500 messages per month — resets on your billing date',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Each relationship conversation includes a specific daily practice for both partners — one action each, calibrated to their respective charts and the dynamic discussed.',
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 37 },
    limits: {
      messagesPerMonth:   500,
      warningAt:          480,
      graceMessages:      5,
      sessionMemoryDepth: 'full',
      synthesisScope:     'full-extended',
      responseDepth:      'fullest',
      domainScope:        ['love','all'],
      resetOnBillingDate: true,
    },
  },
  {
    id: 'grief-scribe',
    name: 'The Grief Scribe',
    tagline: 'A compassionate written companion for loss — your grief process as the context',
    emoji: '🌧️',
    price: 29,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    isNew: true,
    rating: 4.9,
    reviewCount: 543,
    hook: 'Grief does not follow a generic timeline. It follows yours. Your chart describes a specific way of processing loss — the emotional style encoded in your Moon sign, the loss patterns carried in your blueprint, the timing of when it lifts. This channel loads that portrait as permanent context, so every conversation you bring is met with a response calibrated to how you actually grieve — not how you are supposed to.',
    whatYouGet: [
      'Grief profile loaded — Moon sign, loss indicators, 4th and 8th house signatures, current timing all active',
      'Process acknowledgment — responses calibrated to your specific grief processing style',
      'Timeline orientation — chart-grounded understanding of where you are and what comes next',
      'Heritage practice guidance — practices from your tradition for the type of loss you are carrying',
      'Secondary loss identification — the loss beneath the loss, when you are ready to see it',
      '300 messages per month — resets on your billing date',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Each grief conversation offers one small, specific practice for the day — drawn from your heritage tradition and sized for where you actually are in the process.',
    upsell: { id: 'spiritual-scribe', name: 'Spiritual Scribe', price: 29 },
    limits: {
      messagesPerMonth:   300,
      warningAt:          280,
      graceMessages:      5,
      sessionMemoryDepth: 'session',
      synthesisScope:     'domain-only',
      responseDepth:      'standard',
      domainScope:        ['grief'],
      resetOnBillingDate: true,
    },
  },
  {
    id: 'parenting-scribe',
    name: 'The Parenting Scribe',
    tagline: 'Dedicated parenting dialogue — your child\'s chart as the constant context',
    emoji: '👨‍👧',
    price: 37,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    isNew: true,
    rating: 4.8,
    reviewCount: 654,
    hook: 'A dedicated parenting channel with your child\'s complete chart loaded alongside yours — Life Path, Moon sign, parenting archetype, and parent-child karmic contract all active. Navigate your child\'s development, conflicts, and milestones with full chart context.',
    whatYouGet: [
      'Both parent and child charts loaded — complete profiles and compatibility active as context',
      'Behavioural guidance — chart-grounded responses to specific parenting challenges',
      'Development insight — what your child\'s chart says about this specific developmental stage',
      'Conflict navigation — the chart-specific root of recurring conflicts and how to address them',
      'Milestone preparation — what the chart says about upcoming transitions in the child\'s life',
      '400 messages per month — resets on your billing date',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Each parenting conversation ends with one specific communication adjustment for the parent-child dynamic — calibrated to both charts and immediately usable.',
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 37 },
    limits: {
      messagesPerMonth:   400,
      warningAt:          380,
      graceMessages:      5,
      sessionMemoryDepth: 'three-sessions',
      synthesisScope:     'full',
      responseDepth:      'deep',
      domainScope:        ['all'],
      resetOnBillingDate: true,
    },
  },
  {
    id: 'business-scribe',
    name: 'The Business Scribe',
    tagline: 'Dedicated business dialogue — your Founder Archetype as the constant context',
    emoji: '🏢',
    price: 47,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    isNew: true,
    rating: 4.7,
    reviewCount: 432,
    hook: 'A dedicated business dialogue channel with your complete entrepreneurial synthesis loaded — Founder Archetype, dharmic business model, fate line, wealth timing windows, and current business cycle all active as context for every business question.',
    whatYouGet: [
      'Business synthesis loaded — Founder Archetype, dharmic model, fate line, wealth timing all active',
      'Strategic guidance — chart-grounded responses to specific business decisions',
      'Launch and timing guidance — when to move, when to hold, when to pivot from the chart',
      'Team and partnership guidance — chart-grounded hiring and partnership decisions',
      'Business naming and branding — name vibration guidance calibrated to the Founder Archetype',
      '500 messages per month — resets on your billing date',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Each business conversation ends with the single highest-leverage action available right now — calibrated to the current Personal Year, the Founder Archetype, and the specific question.',
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 37 },
    limits: {
      messagesPerMonth:   500,
      warningAt:          480,
      graceMessages:      5,
      sessionMemoryDepth: 'full',
      synthesisScope:     'full-extended',
      responseDepth:      'fullest',
      domainScope:        ['wealth','all'],
      resetOnBillingDate: true,
    },
  },
]

export const getSacredScriptToolById      = (id: string) => sacredScriptTools.find(t => t.id === id)
export const getPopularSacredScriptTools  = ()           => sacredScriptTools.filter(t => t.isPopular)
export const getNewSacredScriptTools      = ()           => sacredScriptTools.filter(t => t.isNew)

// ─────────────────────────────────────────────────────────────
// Feature limit helpers — used by ChatSession.tsx
// ─────────────────────────────────────────────────────────────

/**
 * Returns the message limit status for a user on a given tool.
 * messageCount = how many messages the user has sent this billing period.
 */
export function getLimitStatus(
  tool:         SacredScriptTool,
  messageCount: number,
): {
  status:        'ok' | 'warning' | 'grace' | 'blocked'
  remaining:     number
  warningAt:     number
  limit:         number
  graceRemaining: number
} {
  const { messagesPerMonth, warningAt, graceMessages } = tool.limits
  const hardLimit    = messagesPerMonth + graceMessages
  const remaining    = Math.max(messagesPerMonth - messageCount, 0)
  const graceRemaining = Math.max(hardLimit - messageCount, 0)

  if (messageCount >= hardLimit) {
    return { status:'blocked',  remaining:0, warningAt, limit:messagesPerMonth, graceRemaining:0 }
  }
  if (messageCount >= messagesPerMonth) {
    return { status:'grace',    remaining:0, warningAt, limit:messagesPerMonth, graceRemaining }
  }
  if (messageCount >= warningAt) {
    return { status:'warning',  remaining, warningAt, limit:messagesPerMonth, graceRemaining }
  }
  return   { status:'ok',       remaining, warningAt, limit:messagesPerMonth, graceRemaining }
}

/**
 * Returns the response depth instruction string injected into
 * the synthesis block for Claude, calibrated per tool tier.
 */
export function getResponseDepthInstruction(tool: SacredScriptTool): string {
  switch (tool.limits.responseDepth) {
    case 'standard':
      return 'Response length: 2 to 4 paragraphs. Stay focused on the domain. Reference specific numbers and placements. Do not cross into other domains unless directly relevant.'
    case 'deep':
      return 'Response length: 3 to 6 paragraphs. Cross-domain connections are encouraged — draw from any system that illuminates the question. Build on previous sessions where relevant.'
    case 'fullest':
      return 'Response length: as long as the question requires. Full multi-system synthesis. No domain restrictions. Reference both charts where applicable. Build actively on the full session history.'
    default:
      return 'Response length: 2 to 4 paragraphs. Stay focused on the domain.'
  }
}

/**
 * Returns the memory depth instruction injected into
 * the synthesis block, calibrated per tool tier.
 */
export function getMemoryInstruction(tool: SacredScriptTool): string {
  switch (tool.limits.sessionMemoryDepth) {
    case 'session':
      return 'Memory scope: this session only. Do not reference conversations from previous sessions.'
    case 'three-sessions':
      return 'Memory scope: this session and the two most recent previous sessions. Build connections across them where relevant.'
    case 'full':
      return 'Memory scope: full history. Actively reference and build on everything discussed across all previous sessions.'
    default:
      return 'Memory scope: this session only.'
  }
}
