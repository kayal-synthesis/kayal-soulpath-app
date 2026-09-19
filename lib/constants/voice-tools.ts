// ============================================================
// ORACLE VOICE - 10 Tools
// Domain: voice
// Route: /domain/voice
//
// Distinct format: live spoken sessions, not written readings.
// Names and copy are written to work when spoken out loud,
// and to feel like an invitation, not a category.
//
// CONSTRAINT: whatYouGet slot count is preserved per tool.
// Note: unlimited-calls has 10 items (subscription tier).
// The .py pipeline must handle this tool's count.
// ============================================================

export type MethodTag =
  | 'astrology'
  | 'numerology'
  | 'hermetic'
  | 'jungian'
  | 'vedic'
  | 'kabbalah'
  | 'somatic'
  | 'attachment'
  | 'lineage'
  | 'dreamwork'
  | 'dharma'
  | 'soul-contract'
  | 'archetype'
  | 'enneagram'
  | 'human-design'

export interface VoiceTool {
  id: string
  name: string
  tagline: string
  emoji: string
  hook: string
  price: number
  domain: 'voice'
  methodTag?: MethodTag
  subscriptionPeriod: 'month'
  isPopular?: boolean
  isBestSeller?: boolean
  isNew?: boolean
  rating?: number
  reviewCount?: number
  whatYouGet: string[]
  upsell?: { id: string; name: string; price: number }
}

export const voiceTools: VoiceTool[] = [
  {
    id: 'ask-anything-call',
    name: 'Ask Me Anything',
    tagline: 'A live call, your whole story already on the table',
    emoji: '🎙️',
    price: 29,
    domain: 'voice',
    methodTag: 'astrology',
    subscriptionPeriod: 'month',
    isPopular: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 3102,
    hook: "Reading words and hearing them spoken are two different things. This live call already knows your full pattern, remembers what has come up before, and gives you a real answer in the moment.",
    whatYouGet: [
      "A live spoken call, not a written reading, with your full pattern already loaded in",
      "Ask anything, in the moment, not from a fixed list of questions",
      "Real back and forth, where follow-up questions get real answers",
      "Built for anyone who understands spoken guidance better than written",
      "A real, practical next step by the end of the call, not just talk",
      "Continuity with anything covered in a past session, so you never start from zero",
      "The chance to hear the reasoning behind an answer, not only the answer itself",
      "A private space for a question that feels too big to type out",
    ],
    upsell: { id: 'deep-dive-call', name: 'The Deep Dive', price: 44 },
  },
  {
    id: 'deep-dive-call',
    name: 'The Deep Dive',
    tagline: 'More time, more depth, for the questions that need it',
    emoji: '🌊',
    price: 44,
    domain: 'voice',
    methodTag: 'astrology',
    subscriptionPeriod: 'month',
    rating: 4.8,
    reviewCount: 1287,
    hook: "Some questions need more time than a short call allows. This extended session gives you real room to work through something layered, checks past sessions, and leaves you with real clarity.",
    whatYouGet: [
      "A much longer live call, built for questions with real layers to them",
      "Room to circle back and revisit something from earlier in the same call",
      "Your full pattern held in view for the whole session, not just the start",
      "The chance to bring more than one question into a single call",
      "A conversation that can move between related topics without losing the thread",
      "A clear summary and real next steps at the end, so nothing gets lost",
      "Continuity with anything already covered in a shorter session, so nothing repeats",
      "Enough time to actually sit with a hard answer instead of rushing past it",
    ],
    upsell: { id: 'unlimited-calls', name: 'Unlimited Talk', price: 79 },
  },
  {
    id: 'love-call',
    name: 'The Love Call',
    tagline: 'A live call about your love life, and nothing else',
    emoji: '💗',
    price: 24,
    domain: 'voice',
    methodTag: 'attachment',
    subscriptionPeriod: 'month',
    hook: "Some love questions are easier said out loud than typed. This live call stays on your love life, knows your real pattern, and answers in real time, not after.",
    whatYouGet: [
      "A live spoken call focused only on your love life",
      "Your relationship pattern already loaded in before the call starts",
      "Real, follow-up questions answered in the moment",
      "A private space for a question you might not want to type out",
      "One clear next step to try after the call ends",
      "Room to say something out loud you've been avoiding putting into words",
      "Real-time follow-up as the call clarifies what you're actually asking",
      "The chance to hear tone and nuance a written reading cannot carry",
    ],
    upsell: { id: 'unlimited-calls', name: 'Unlimited Talk', price: 79 },
  },
  {
    id: 'money-call',
    name: 'The Money Call',
    tagline: 'A live call about money, said out loud instead of stared at',
    emoji: '📈',
    price: 24,
    domain: 'voice',
    methodTag: 'hermetic',
    subscriptionPeriod: 'month',
    hook: "Money questions are easier to think through out loud than to stare at on a screen. This live call stays on your finances, knows your real pattern, and gives you a next step.",
    whatYouGet: [
      "A live spoken call focused only on money and career questions",
      "Your earning pattern already loaded in before the call starts",
      "Real-time follow-up on a specific decision you're weighing",
      "A space to think out loud through a decision, not just read about it",
      "One clear financial action to take after the call",
      "The chance to talk through numbers out loud instead of staring at them alone",
      "A private space for a money question you haven't said out loud to anyone",
      "A place to say a number or a fear out loud that's felt too big to type",
    ],
    upsell: { id: 'unlimited-calls', name: 'Unlimited Talk', price: 79 },
  },
  {
    id: 'purpose-call',
    name: 'The Purpose Call',
    tagline: 'For the question you keep circling but never quite say out loud',
    emoji: '🔥',
    price: 24,
    domain: 'voice',
    methodTag: 'dharma',
    subscriptionPeriod: 'month',
    hook: "Questions about purpose often need to be spoken out loud before they become clear. This live call stays on direction and meaning, checked against your real pattern.",
    whatYouGet: [
      "A live spoken call focused only on purpose and direction",
      "Your full pattern already loaded in before the call starts",
      "Room to think out loud through a question you've been circling alone",
      "Real-time follow-up as new layers of the question surface mid-call",
      "One clear next step by the end of the call",
      "A space to say a half-formed idea out loud before it feels ready to share",
      "The chance to hear which parts of your own answer already sound true",
      "A private space for a question you've never said to anyone else",
    ],
    upsell: { id: 'unlimited-calls', name: 'Unlimited Talk', price: 79 },
  },
  {
    id: 'daily-briefing',
    name: 'The Daily Briefing',
    tagline: "A short spoken note on what today is actually asking of you",
    emoji: '☀️',
    price: 19,
    domain: 'voice',
    methodTag: 'astrology',
    subscriptionPeriod: 'month',
    isPopular: true,
    rating: 4.7,
    reviewCount: 2543,
    hook: "Some mornings need something spoken, not scrolled through. This short daily call tells you plainly what today is asking, checks it against yesterday, in just a few minutes.",
    whatYouGet: [
      "A short spoken briefing every day, built to hear in a few minutes",
      "What today's energy is asking of you, spoken plainly",
      "Whether today's energy is still building, or already starting to ease",
      "One clear action for today",
      "Built for listening on your way into the day, not sitting to read",
      "Whether today echoes yesterday, or marks a genuine shift worth noticing",
      "A quick, real answer to carry with you before the day gets busy",
    ],
    upsell: { id: 'ask-anything-call', name: 'Ask Me Anything', price: 29 },
  },
  {
    id: 'relationship-call',
    name: 'The One Relationship Call',
    tagline: 'One relationship, one call, start to finish',
    emoji: '🤝',
    price: 24,
    domain: 'voice',
    methodTag: 'attachment',
    subscriptionPeriod: 'month',
    hook: "Unlike a general love call, this one stays on one relationship. It knows the real history, remembers what's already been tried, and answers in real time.",
    whatYouGet: [
      "A live spoken call focused on one specific relationship, not relationships in general",
      "The real history of that relationship held in view for the call",
      "Real-time follow-up as a specific situation gets talked through",
      "A private space to work through something you've been carrying alone",
      "One clear next step for this specific relationship",
      "A space to rehearse a hard conversation before you have it with your partner",
      "The chance to hear your own thinking out loud before deciding what to say",
      "Continuity with anything already discussed about this relationship in a past session",
    ],
    upsell: { id: 'unlimited-calls', name: 'Unlimited Talk', price: 79 },
  },
  {
    id: 'spiritual-call',
    name: 'The Spiritual Call',
    tagline: "For the questions that don't fit anywhere else",
    emoji: '🕊️',
    price: 24,
    domain: 'voice',
    methodTag: 'kabbalah',
    subscriptionPeriod: 'month',
    hook: "Spiritual questions often want to be spoken, not typed. This live call gives you room to sit with a question, checked against your real pattern, instead of rushing past it.",
    whatYouGet: [
      "A live spoken call focused only on spiritual questions",
      "Your full spiritual pattern already loaded in before the call starts",
      "Room to sit with a question, not rush toward an answer",
      "A private space for something that's been hard to put into words",
      "One real spiritual practice to try after the call",
      "Room to say something out loud that's felt too strange or too big to type",
      "A steadier voice than your own thoughts to help sort a spiritual question out",
      "Continuity with anything already covered in a past spiritual session",
    ],
    upsell: { id: 'unlimited-calls', name: 'Unlimited Talk', price: 79 },
  },
  {
    id: 'sos-call',
    name: 'The SOS Line',
    tagline: 'A live call built for a genuinely hard moment',
    emoji: '🆘',
    price: 34,
    domain: 'voice',
    methodTag: 'somatic',
    subscriptionPeriod: 'month',
    rating: 4.9,
    reviewCount: 967,
    hook: "This isn't for a curious afternoon question. This live call is built for a genuinely hard moment, checks your real pattern, stays grounded and steady, and does not rush you.",
    whatYouGet: [
      "A live spoken call built specifically for a genuinely hard moment",
      "Grounded, specific support, not vague comfort",
      "Your full pattern held in view, so the call is built around you",
      "A steady pace that meets the moment, not one that rushes past it",
      "Real-time follow-up as the situation is actually talked through",
      "One grounding practice to use right now, before the call ends",
      "A voice on the other end when a written reading would feel too slow",
      "Access built for exactly this moment, not scheduled around a calendar",
    ],
    upsell: { id: 'unlimited-calls', name: 'Unlimited Talk', price: 79 },
  },
  {
    id: 'unlimited-calls',
    name: 'Unlimited Talk',
    tagline: 'Unlimited live calls, on anything, at any time',
    emoji: '♾️',
    price: 79,
    domain: 'voice',
    methodTag: 'astrology',
    subscriptionPeriod: 'month',
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 1543,
    hook: "For anyone who wants ongoing access, not one call at a time. Unlimited live calls, on any question, checked against your full pattern, always loaded in.",
    whatYouGet: [
      "Unlimited live calls, on any topic, love, money, purpose, spirit, and more",
      "No per-call cost or limit, use it whenever a real question comes up",
      "Your full pattern held in view across every single call",
      "Access to both short calls and longer deep-dive sessions",
      "Priority access during high-demand times",
      "A running thread across calls, so repeat topics build instead of restarting",
      "Every domain-specific session included, not billed or booked separately",
      "The freedom to call for something small, not just save it for a big question",
      "Continuity that spans crisis calls, daily check-ins, and everything in between",
      "A single subscription that replaces piecing together several separate sessions",
    ],
  },
]

export const getVoiceToolById = (id: string) => voiceTools.find(t => t.id === id)
export const getPopularVoiceTools = () => voiceTools.filter(t => t.isPopular)