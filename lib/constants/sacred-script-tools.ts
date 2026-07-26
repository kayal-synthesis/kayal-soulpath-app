// ============================================================
// SACRED SCRIPT — 10 Tools
// Domain: sacred-script
// Route: /domain/sacred-script
// Different shape from every other domain: these are ongoing AI
// dialogue subscriptions, not one-time readings. whatYouGet is
// framed around continuity and permanent context, not depth of a
// single delivered reading — that's the actual value proposition
// here, so the copy should say so rather than force-fit the
// reading-domain pattern.
// ============================================================

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
}

export const sacredScriptTools: SacredScriptTool[] = [
  {
    id: 'the-life-scribe',
    name: 'The Life Scribe',
    tagline: 'An ongoing dialogue that holds your complete life pattern in permanent context',
    emoji: '📖',
    price: 29,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    isPopular: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 2456,
    hook: 'Most advice forgets you the moment the talk ends. This one remembers your full pattern every time, checks what has already worked, and gives you real answers to any question.',
    whatYouGet: [
      'An ongoing chat that remembers your full pattern, every single time',
      'No need to explain your situation again and again',
      'Answers for anything, from a small daily choice to a big life decision',
      'A chat partner that remembers last week and last month, and builds on it',
      'Real, practical steps you can act on, not just insight',
      'The chance to return to old chats and pick up right where you left off',
      'Advice that gets sharper over time, as it learns what has genuinely worked for you',
      'A steady place to think out loud, available the moment a question actually comes up',
    ],
    upsell: { id: 'life-path-deep-dive', name: 'Your Core Life Pattern, Fully Explained', price: 49 },
  },
  {
    id: 'love-scribe',
    name: 'The Love Scribe',
    tagline: 'An ongoing dialogue focused on your relationships, holding full context across every conversation',
    emoji: '💗',
    price: 24,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    hook: 'Love questions rarely get solved in one talk. This chat remembers your history, checks what has already worked, and gives you real steps every time you return.',
    whatYouGet: [
      'An ongoing chat focused only on your love life, remembering every session',
      'No need to repeat your relationship history each time you have a new question',
      'Advice that remembers what you already tried and what was already decided',
      'Real steps to try, not just reflection',
      'Support the moment a question comes up, not on a fixed schedule',
      'Guidance that improves the longer you use it, as it learns your actual pattern',
      'A private space to think through something you are not ready to say out loud yet',
      'Continuity across breakups, new connections, and everything in between',
    ],
    upsell: { id: 'complete-love-synthesis', name: 'The Complete Read on How You Love', price: 79 },
  },
  {
    id: 'wealth-scribe',
    name: 'The Wealth Scribe',
    tagline: 'An ongoing dialogue for financial decisions, calibrated to your complete pattern',
    emoji: '📈',
    price: 24,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    hook: 'Money decisions build on each other. This chat remembers your pattern, checks what has worked before, and gives you real steps for every new question.',
    whatYouGet: [
      'An ongoing chat for money decisions, calibrated to your real earning pattern',
      'Continuity across months, so this question connects to the last one',
      'Advice built around your real blind spots, not general money tips',
      'Real, practical steps you can act on right away',
      'Support the moment a money decision needs input',
      'Guidance that sharpens the longer you use it, as it learns what actually works for you',
      'A place to think through a decision before you have to commit to it out loud',
      'Continuity across raises, job changes, and every financial season in between',
    ],
    upsell: { id: 'complete-wealth-synthesis', name: 'Everything Your Money Is Trying to Tell You', price: 79 },
  },
  {
    id: 'spiritual-scribe',
    name: 'The Spiritual Scribe',
    tagline: 'An ongoing dialogue for spiritual questions, holding your full synthesis in permanent context',
    emoji: '🕊️',
    price: 24,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    isPopular: true,
    rating: 4.8,
    reviewCount: 1893,
    hook: 'Spiritual growth is rarely a straight line. This chat remembers your journey, checks what has actually helped, and gives you real practices, not just reflection.',
    whatYouGet: [
      'An ongoing chat that remembers your full spiritual pattern, session to session',
      'Continuity for what you are actually working on right now',
      'Remembers which practices have already helped you, and builds on them',
      'Real spiritual practices to try, not only ideas to think about',
      'Support any time a spiritual question comes up, not on a schedule',
      'Guidance that deepens the longer you use it, tracking real change over months',
      'A steady space to sit with something difficult, without needing to explain the backstory',
      'Continuity across seasons of doubt, growth, and everything harder to name',
    ],
    upsell: { id: 'complete-spiritual-synthesis', name: 'The Spiritual Layer Beneath the Surface', price: 79 },
  },
  {
    id: 'health-scribe',
    name: 'The Health Scribe',
    tagline: 'An ongoing dialogue for wellness questions, calibrated to your complete constitution',
    emoji: '🌿',
    price: 24,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    hook: 'What worked last month should shape what you try this month. This chat remembers your body pattern, checks what has already helped, and gives you real steps.',
    whatYouGet: [
      'An ongoing chat calibrated to your real body type and pattern',
      'Continuity across what you have already tried, so advice does not repeat dead ends',
      'Guidance based on your actual energy pattern, not generic wellness tips',
      'Real, practical steps for energy, rest, and routine',
      'Support the moment a question about your body comes up',
      'Guidance that gets more precise over time, as it learns what genuinely helps you',
      'A place to track how your body responds to changes, without starting a new log each time',
      'Continuity across seasons, stress, and everything that shifts how your body feels',
    ],
    upsell: { id: 'complete-health-synthesis', name: 'The Full Read on Your Body', price: 79 },
  },
  {
    id: 'purpose-scribe',
    name: 'The Purpose Scribe',
    tagline: 'An ongoing dialogue for questions of purpose and direction, holding full context every session',
    emoji: '🔥',
    price: 24,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    hook: 'Questions about purpose keep returning at every crossroad. This chat remembers your pattern, checks what has held true before, and helps you see the real answer.',
    whatYouGet: [
      'An ongoing chat for questions of purpose and direction, remembering every session',
      'Guidance built around your real pattern, not generic advice to follow your passion',
      'Continuity across every crossroad, so this question connects to the last one',
      'Real, practical next steps, not only reflection',
      'Support the moment a real question about direction comes up',
      'Guidance that sharpens over time, tracking how your sense of purpose actually evolves',
      'A steady place to return to when the same question resurfaces in a new form',
      'A space that treats a quiet, uncertain question with the same weight as an urgent one',
    ],
    upsell: { id: 'complete-purpose-synthesis', name: "The Whole Reason You're Alive", price: 79 },
  },
  {
    id: 'relationship-scribe',
    name: 'The Relationship Scribe',
    tagline: 'An ongoing dialogue focused on navigating one specific relationship, in full context',
    emoji: '🤝',
    price: 24,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    hook: 'This chat stays focused on one relationship. It remembers the real history, checks what has already been tried, and gives you real steps each time.',
    whatYouGet: [
      'An ongoing chat focused on one specific relationship, not relationships in general',
      'Continuity across the real history of that relationship, tracked over time',
      'Advice built around what has already been tried in this exact relationship',
      'Real steps to try, not only reflection',
      'Support the moment a new question or conflict comes up',
      'Guidance that sharpens the longer you use it, as it learns the real shape of this relationship',
      'A private space to think through something before you say it out loud to your partner',
      'A record of patterns in this relationship that can be hard to see from inside it',
    ],
    upsell: { id: 'complete-union-blueprint', name: 'What the Two of You Become Together', price: 99 },
  },
  {
    id: 'grief-scribe',
    name: 'The Grief Scribe',
    tagline: 'A dedicated dialogue for navigating grief, holding context across every conversation',
    emoji: '🕯️',
    price: 24,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    rating: 4.9,
    reviewCount: 1204,
    hook: 'Grief does not move in a straight line. This chat remembers where you are, checks how things have shifted, and offers real support built for this exact stage.',
    whatYouGet: [
      'A dedicated chat for grief, remembering where you are without needing to explain again',
      'Guidance built around how grief actually moves through a life, not a fixed set of stages',
      'Support at difficult hours, not only during a scheduled time',
      'Real grounding practices for hard moments, along with space to simply be heard',
      'A steady presence you can return to, day or night',
      'A record of how this has shifted over time, so you can see real movement even on hard days',
      'Support around anniversaries and dates that carry weight, without you needing to flag them first',
      'A space that never asks you to move on before you are ready to',
    ],
  },
  {
    id: 'parenting-scribe',
    name: 'The Parenting Scribe',
    tagline: 'An ongoing dialogue for parenting questions, calibrated to your complete pattern',
    emoji: '👨‍👩‍👧',
    price: 24,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    hook: 'Parenting questions rarely wait for research time. This chat remembers your child and your pattern, checks what has worked before, and gives you real answers fast.',
    whatYouGet: [
      'An ongoing chat calibrated to your specific pattern as a parent',
      'Continuity across what you have shared about your child, so advice builds, not repeats',
      'Real, practical answers in the moment a parenting question comes up',
      'Guidance built around what has already worked in your specific home',
      'Support any time, not on a fixed schedule',
      'Guidance that sharpens over time, as it learns your child alongside you',
      'A place to think through a hard moment before you have already reacted to it',
      'Continuity across every age and stage, not just the one you are in now',
    ],
    upsell: { id: 'child-blueprint', name: 'Who This Child Is Becoming', price: 59 },
  },
  {
    id: 'business-scribe',
    name: 'The Business Scribe',
    tagline: "An ongoing dialogue for business decisions, holding your company's full pattern in permanent context",
    emoji: '💼',
    price: 24,
    domain: 'sacred-script',
    subscriptionPeriod: 'month',
    hook: 'One business choice shapes the next. This chat remembers your company\'s real pattern, checks what has worked, and gives you real answers, not fresh guesses.',
    whatYouGet: [
      'An ongoing chat for business decisions, remembering your company\'s real pattern',
      'Continuity across quarters, so this decision connects to the last one',
      'Advice built around your real business and its history, not generic startup tips',
      'Real, practical next steps for each decision',
      'Support the moment a decision actually needs input',
      'Guidance that sharpens over time, as it learns what actually works for your business',
      'A place to think through a hard call before you have to make it in the room',
      'A record of past decisions to reference instead of relying on memory alone',
    ],
    upsell: { id: 'business-destiny-synthesis', name: 'Your Business, Fully Mapped', price: 79 },
  },
]

export const getSacredScriptToolById = (id: string) => sacredScriptTools.find(t => t.id === id)
export const getPopularSacredScriptTools = () => sacredScriptTools.filter(t => t.isPopular)
