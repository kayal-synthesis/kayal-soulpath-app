// ============================================================
// ORACLE VOICE — 10 Tools
// Domain: voice
// Route: /domain/voice
// Distinct format from every other domain: live spoken sessions,
// not written readings. whatYouGet is framed around the spoken,
// real-time, conversational nature of the product — that's the
// actual differentiator from a Sacred Script dialogue (text,
// asynchronous) or a one-time reading (written, static).
// ============================================================

export interface VoiceTool {
  id: string
  name: string
  tagline: string
  emoji: string
  hook: string
  price: number
  domain: 'voice'
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
    id: 'oracle-voice-session',
    name: 'The Oracle Voice Session',
    tagline: 'A live spoken conversation with an oracle that already knows your complete pattern',
    emoji: '🎙️',
    price: 29,
    domain: 'voice',
    subscriptionPeriod: 'month',
    isPopular: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 3102,
    hook: 'Reading words and hearing them spoken feel different. This live call already knows your full pattern, checks what has already come up before, and gives you a real answer.',
    whatYouGet: [
      'A live spoken call, not a written reading, with your full pattern already loaded in',
      'Ask anything, in the moment, not from a fixed list of questions',
      'Real back and forth, where follow-up questions get real answers',
      'Good for anyone who understands spoken guidance better than written',
      'A real, practical next step by the end of the call, not just talk',
      'Continuity with anything covered in a past session, so you never start from zero',
      'The chance to hear the reasoning behind an answer, not only the answer itself',
      'A private space for a question that feels too big to type out',
    ],
    upsell: { id: 'oracle-deep-dive-session', name: 'The Oracle Deep Dive Session', price: 44 },
  },
  {
    id: 'oracle-deep-dive-session',
    name: 'The Oracle Deep Dive Session',
    tagline: 'An extended spoken session for questions that need more time and depth than a standard call',
    emoji: '🌊',
    price: 44,
    domain: 'voice',
    subscriptionPeriod: 'month',
    rating: 4.8,
    reviewCount: 1287,
    hook: 'Some questions need more time than a short call allows. This extended session gives you real room to work through something layered, checks past sessions, and leaves you with real clarity.',
    whatYouGet: [
      'A much longer live call, built for questions with real layers to them',
      'Room to circle back and revisit something from earlier in the same call',
      'Your full pattern held in view for the whole session, not just the start',
      'The chance to bring more than one question into a single call',
      'A conversation that can move between related topics without losing the thread',
      'A clear summary and real next steps at the end, so nothing gets lost',
      'Continuity with anything already covered in a shorter session, so nothing repeats',
      'Enough time to actually sit with a hard answer instead of rushing past it',
    ],
    upsell: { id: 'oracle-voice-unlimited', name: 'Oracle Voice Unlimited', price: 79 },
  },
  {
    id: 'love-oracle-session',
    name: 'The Love Oracle Session',
    tagline: 'A live spoken reading focused on your love life, calibrated to your complete pattern',
    emoji: '💗',
    price: 24,
    domain: 'voice',
    subscriptionPeriod: 'month',
    hook: 'Some love questions are easier said out loud than typed. This live call focuses only on your love life, checks your real pattern, and gives real answers.',
    whatYouGet: [
      'A live spoken call focused only on your love life',
      'Your relationship pattern already loaded in before the call starts',
      'Real, follow-up questions answered in the moment',
      'A private space for a question you might not want to type out',
      'One clear next step to try after the call ends',
      'A space to say something out loud you have been avoiding putting into words',
      'Real-time follow-up as the call clarifies what you are actually asking',
      'The chance to hear tone and nuance a written reading cannot carry',
    ],
    upsell: { id: 'oracle-voice-unlimited', name: 'Oracle Voice Unlimited', price: 79 },
  },
  {
    id: 'wealth-oracle-session',
    name: 'The Wealth Oracle Session',
    tagline: 'A live spoken reading focused on your finances, calibrated to your complete pattern',
    emoji: '📈',
    price: 24,
    domain: 'voice',
    subscriptionPeriod: 'month',
    hook: 'Money questions are often easier to think through out loud. This live call focuses on your finances, checks your real pattern, and gives you a next step.',
    whatYouGet: [
      'A live spoken call focused only on money and career questions',
      'Your earning pattern already loaded in before the call starts',
      'Real-time follow-up on a specific decision you are weighing',
      'A space to think out loud through a decision, not just read about it',
      'One clear financial action to take after the call',
      'The chance to talk through numbers out loud instead of staring at them alone',
      'A private space for a money question you have not said out loud to anyone',
      'A place to say a number or a fear out loud that has felt too big to type',
    ],
    upsell: { id: 'oracle-voice-unlimited', name: 'Oracle Voice Unlimited', price: 79 },
  },
  {
    id: 'purpose-oracle-session',
    name: 'The Purpose Oracle Session',
    tagline: 'A live spoken reading focused on purpose and direction, calibrated to your complete pattern',
    emoji: '🔥',
    price: 24,
    domain: 'voice',
    subscriptionPeriod: 'month',
    hook: 'Questions about purpose often need to be spoken out loud to become clear. This live call focuses only on direction and meaning, checked against your real pattern.',
    whatYouGet: [
      'A live spoken call focused only on purpose and direction',
      'Your full pattern already loaded in before the call starts',
      'Room to think out loud through a question you have been circling alone',
      'Real-time follow-up as new layers of the question surface mid-call',
      'One clear next step by the end of the call',
      'A space to say a half-formed idea out loud before it feels ready to share',
      'The chance to hear which parts of your own answer already sound true',
      'A private space for a question you have never said to anyone else',
    ],
    upsell: { id: 'oracle-voice-unlimited', name: 'Oracle Voice Unlimited', price: 79 },
  },
  {
    id: 'daily-voice-briefing',
    name: 'The Daily Voice Briefing',
    tagline: 'A short daily spoken briefing on what today is asking of you',
    emoji: '☀️',
    price: 19,
    domain: 'voice',
    subscriptionPeriod: 'month',
    isPopular: true,
    rating: 4.7,
    reviewCount: 2543,
    hook: 'Some mornings need something spoken, not read. This short daily call tells you plainly what today is asking, checks it against yesterday, in just minutes.',
    whatYouGet: [
      'A short spoken briefing every day, built to hear in a few minutes',
      "What today's energy is asking of you, spoken plainly",
      'Whether today\'s energy is still building, or already starting to ease',
      'One clear action for today',
      'Built for listening on your way into the day, not sitting to read',
      'Whether today echoes yesterday, or marks a genuine shift worth noticing',
      'A quick, real answer to carry with you before the day gets busy',
    ],
    upsell: { id: 'oracle-voice-session', name: 'The Oracle Voice Session', price: 29 },
  },
  {
    id: 'relationship-oracle-session',
    name: 'The Relationship Oracle Session',
    tagline: 'A live spoken reading focused on one specific relationship',
    emoji: '🤝',
    price: 24,
    domain: 'voice',
    subscriptionPeriod: 'month',
    hook: 'Unlike a general love call, this one stays on one relationship. It knows the real history, checks what has already been tried, spoken in real time.',
    whatYouGet: [
      'A live spoken call focused on one specific relationship, not relationships in general',
      'The real history of that relationship held in view for the call',
      'Real-time follow-up as a specific situation gets talked through',
      'A private space to work through something you have been carrying alone',
      'One clear next step for this specific relationship',
      'A space to rehearse a hard conversation before you have it with your partner',
      'The chance to hear your own thinking out loud before deciding what to say',
      'Continuity with anything already discussed about this relationship in a past session',
    ],
    upsell: { id: 'oracle-voice-unlimited', name: 'Oracle Voice Unlimited', price: 79 },
  },
  {
    id: 'spiritual-oracle-session',
    name: 'The Spiritual Oracle Session',
    tagline: 'A live spoken reading focused on spiritual questions, calibrated to your complete pattern',
    emoji: '🕊️',
    price: 24,
    domain: 'voice',
    subscriptionPeriod: 'month',
    hook: 'Spiritual questions often want to be spoken, not typed. This live call gives you room to sit with a question, checks your real pattern, not rush past it.',
    whatYouGet: [
      'A live spoken call focused only on spiritual questions',
      'Your full spiritual pattern already loaded in before the call starts',
      'Room to sit with a question, not rush toward an answer',
      'A private space for something that has been hard to put into words',
      'One real spiritual practice to try after the call',
      'A space to say something out loud that has felt too strange or too big to type',
      'A steadier voice than your own thoughts to help sort a spiritual question out',
      'Continuity with anything already covered in a past spiritual session',
    ],
    upsell: { id: 'oracle-voice-unlimited', name: 'Oracle Voice Unlimited', price: 79 },
  },
  {
    id: 'crisis-oracle-session',
    name: 'The Crisis Oracle Session',
    tagline: 'A live spoken session built for a genuinely difficult moment, grounded and specific',
    emoji: '🆘',
    price: 34,
    domain: 'voice',
    subscriptionPeriod: 'month',
    rating: 4.9,
    reviewCount: 967,
    hook: 'This is not for a curious afternoon question. This live call is built for a genuinely hard moment, checks your real pattern, grounded and steady, not rushed.',
    whatYouGet: [
      'A live spoken call built specifically for a genuinely hard moment',
      'Grounded, specific support, not vague comfort',
      'Your full pattern held in view, so the call is built around you',
      'A steady pace that meets the moment, not one that rushes past it',
      'Real-time follow-up as the situation is actually talked through',
      'One grounding practice to use right now, before the call ends',
      'A voice on the other end when a written reading would feel too slow',
      'Access built for exactly this moment, not scheduled around a calendar',
    ],
    upsell: { id: 'oracle-voice-unlimited', name: 'Oracle Voice Unlimited', price: 79 },
  },
  {
    id: 'oracle-voice-unlimited',
    name: 'Oracle Voice Unlimited',
    tagline: 'Unlimited spoken sessions with your oracle, any question, any time',
    emoji: '♾️',
    price: 79,
    domain: 'voice',
    subscriptionPeriod: 'month',
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 1543,
    hook: 'For anyone who wants ongoing access, not one call at a time. Unlimited live calls, on any question, checked against your full pattern, always loaded in.',
    whatYouGet: [
      'Unlimited live calls, on any topic, love, money, purpose, spirit, and more',
      'No per-call cost or limit, use it whenever a real question comes up',
      'Your full pattern held in view across every single call',
      'Access to both short calls and longer deep-dive sessions',
      'Priority access during high-demand times',
      'A running thread across calls, so repeat topics build instead of restarting',
      'Every domain-specific session included, not billed or booked separately',
      'The freedom to call for something small, not just save it for a big question',
      'Continuity that spans crisis calls, daily check-ins, and everything between',
      'A single subscription that replaces piecing together several separate sessions',
    ],
  },
]

export const getVoiceToolById = (id: string) => voiceTools.find(t => t.id === id)
export const getPopularVoiceTools = () => voiceTools.filter(t => t.isPopular)
