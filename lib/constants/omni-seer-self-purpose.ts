// ============================================================
// OMNI-SEER - SELF & PURPOSE (11 tools)
// Domain: oracle-temple
// Route: /domain/omni-seer
//
// Split out of the original single omni-seer-tools.ts for
// manageability. This file: Wealth (4), Health (1),
// Purpose & Spiritual (4), the Complete Remedy Plan, and the
// solo flagship (Complete Portrait of Who You Are).
//
// Voice standard: plain, human, specific. No esoteric jargon
// surfaces in user-facing copy. The methodology engine stays
// under the hood.
//
// CONSTRAINT: whatYouGet counts preserved per tool exactly as
// originally defined.
// ============================================================

export interface OmniSeerTool {
  id: string
  name: string
  tagline: string
  emoji: string
  hook: string
  price: number
  domain: 'oracle-temple'
  requiresPartner?: boolean
  requiresImage?: boolean
  isPopular?: boolean
  isBestSeller?: boolean
  isNew?: boolean
  rating?: number
  reviewCount?: number
  whatYouGet: string[]
  guidanceType?: 'practical-solution' | 'daily-guidance'
  guidanceText?: string
  upsell?: { id: string; name: string; price: number }
}

export const omniSelfPurposeTools: OmniSeerTool[] = [
  {
    id: 'complete-wealth-synthesis',
    name: 'Everything Your Money Is Trying to Tell You',
    tagline: "The complete synthesis of your financial pattern, across every discipline at once",
    emoji: '💰',
    price: 79,
    domain: 'oracle-temple',
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 2103,
    hook: "Your earning pattern, your blocks, your timing, and your capacity for risk rarely get read together, even though they interact in every real financial decision you make. This synthesizes all of it into one picture instead of four disconnected readings.",
    whatYouGet: [
      "Your complete money pattern, checked across several real systems, not just one",
      "How your earning style, your blocks, and your risk pattern all connect",
      "Where different systems agree, which is where the real signal is",
      "The real income ceiling in your pattern, and what actually breaks it",
      "The kind of wealth-building path that genuinely fits your pattern",
      "Whether your next big money window is still building, or already close",
      "Whether you're moving through a life stage that makes a big money move more likely to work",
      "One real action this month, matched to your specific pattern",
      "What shifting your money path would actually require",
      "Whether this pattern has held steady across your whole earning life, or shifted at some point",
    ],
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
  {
    id: 'business-destiny-synthesis',
    name: 'Your Business, Fully Mapped',
    tagline: "A full synthesis of your business, its trajectory, and what it's actually built to become",
    emoji: '🏢',
    price: 79,
    domain: 'oracle-temple',
    rating: 4.8,
    reviewCount: 1432,
    hook: "A business has its own real pattern, separate from yours. This reading checks both together, and shows where they support each other and where they quietly work against each other.",
    whatYouGet: [
      "Your business's own real pattern, checked separately from your pattern as its owner",
      "Where your pattern and your business's pattern support each other",
      "Where they're quietly working against each other",
      "The real path this business is actually built to follow",
      "The point where this business is most likely to slow down, and what moves it past that",
      "What steady growth looks like for a business shaped like this one",
      "Whether this business is built to sell, grow big, or run for the long term",
      "One real focus for the next twelve months",
      "One real action this month to move the business forward",
      "Whether this business is currently in an easier or harder stage of its own natural pattern",
    ],
    upsell: { id: 'business-scribe', name: 'The Business Scribe', price: 24 },
  },
  {
    id: 'wealth-timing-oracle',
    name: 'The Five-Year Money Forecast',
    tagline: "A five-year financial forecast, built for long-range decisions rather than the next few months",
    emoji: '📈',
    price: 59,
    domain: 'oracle-temple',
    rating: 4.7,
    reviewCount: 987,
    hook: "Some money decisions only make sense over a longer horizon than most forecasts bother to cover. This reading maps five years ahead, and shows your real windows.",
    whatYouGet: [
      "Your five-year money path, mapped year by year",
      "Your strongest windows in that time for a big move",
      "The years that favor holding steady over expanding",
      "The single biggest turning point across the whole five years",
      "Whether that turning point is still building, or already close",
      "How this five-year view should change what you do right now",
      "One real action this month to prepare for your strongest window",
      "Whether this five-year path echoes the last five years, or breaks from it",
      "The specific decision most likely to accelerate or delay your strongest window",
    ],
    upsell: { id: 'complete-wealth-synthesis', name: 'Everything Your Money Is Trying to Tell You', price: 79 },
  },
  {
    id: 'personal-brand-frequency',
    name: "The Brand You're Already Becoming",
    tagline: "The personal brand forming around you, whether or not you've noticed it",
    emoji: '🎯',
    price: 59,
    domain: 'oracle-temple',
    hook: "A personal brand is forming around you already, built from how you actually show up rather than what you intend, and it's often quite different from the version you think you're projecting. This reading checks what's actually forming, and one way to shape it.",
    whatYouGet: [
      "The real personal brand forming around you, separate from what you intend",
      "Where this brand is genuinely working in your favor",
      "Where it's quietly working against you, without you noticing",
      "The real gap between how you want to be seen and how you actually are",
      "The kind of opportunity this brand naturally attracts",
      "The kind it naturally pushes away, and whether that matters",
      "One real change this month that would close the gap",
      "Whether this brand has been consistent for years, or is still actively forming",
      "The specific setting, online, in a room, or in writing, where this brand shows up strongest",
    ],
    upsell: { id: 'business-scribe', name: 'The Business Scribe', price: 24 },
  },
  {
    id: 'complete-health-synthesis',
    name: 'The Full Read on Your Body',
    tagline: "A full synthesis of your physical constitution across every relevant discipline, in one reading",
    emoji: '🌿',
    price: 79,
    domain: 'oracle-temple',
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 1876,
    hook: "Generic health advice was never built for your specific body. This reading checks your real body type across several real systems at once, converging on the same picture from multiple directions.",
    whatYouGet: [
      "Your complete body type, checked across several real systems, not just one",
      "Where different systems agree on your body, which is where the real signal is",
      "What genuinely supports your specific body, even against popular advice",
      "What quietly works against you, even when marketed as healthy",
      "The part of your body most likely to show stress first",
      "Whether your pattern points to any specific vulnerability worth watching",
      "What real rest looks like for your specific body",
      "What your pattern suggests about your mental and emotional load, not just the physical",
      "The link between your energy levels and your daily choices, made clear",
      "One real, sustainable change this month that fits your body",
    ],
    upsell: { id: 'health-scribe', name: 'The Health Scribe', price: 24 },
  },
  {
    id: 'complete-spiritual-synthesis',
    name: 'Beneath the Surface',
    tagline: "The full picture, going deeper than any single reading ever could",
    emoji: '🕯️',
    price: 79,
    domain: 'oracle-temple',
    rating: 4.8,
    reviewCount: 1543,
    hook: "Your spiritual pattern rarely fits one single view. This reading checks it across several real systems at once: what you carried in, what's unresolved, and what's been quietly running beneath your awareness.",
    whatYouGet: [
      "Your complete spiritual pattern, checked across several real systems at once",
      "What you most likely carried into this life, and how it shapes this one",
      "The specific thing you're here to complete, named directly",
      "What's been running beneath your awareness, now brought into view",
      "Any real, unresolved tie or old promise still quietly shaping you",
      "Where different systems agree on your pattern, which is where the real signal is",
      "The practice most matched to your specific pattern, not a generic one",
      "What real spiritual progress looks like for someone shaped like you",
      "The next real threshold ahead in your spiritual life",
      "Whether this pattern has felt consistent for years, or is shifting right now",
    ],
    upsell: { id: 'spiritual-scribe', name: 'The Spirit Scribe', price: 24 },
  },
  {
    id: 'complete-purpose-synthesis',
    name: "The Whole Reason You're Alive",
    tagline: "A full synthesis of your life's purpose, built from every relevant discipline at once",
    emoji: '🔥',
    price: 79,
    domain: 'oracle-temple',
    isPopular: true,
    rating: 4.9,
    reviewCount: 2287,
    hook: "Purpose readings built from one system are often too vague to actually use. This one checks several real systems, converging on something specific enough to live by.",
    whatYouGet: [
      "Your life purpose, checked across several real, independent systems at once",
      "Where those systems agree, which is where the real signal is",
      "What's likely been mistaken for purpose, but is actually a stand-in for it",
      "The real gap between what you know about your purpose and how you live",
      "What living it, not just knowing it, would concretely require",
      "The place where this purpose is genuinely supported, and the place where it quietly fades",
      "The fear most likely to have kept this purpose at a distance",
      "Whether you're entering a life stage that makes closing this gap more likely now",
      "One real decision this month that closes the gap",
      "Whether this purpose has felt consistent your whole life, or is only recently becoming clear",
    ],
    upsell: { id: 'purpose-scribe', name: 'The Purpose Scribe', price: 24 },
  },
  {
    id: 'pattern-breaker',
    name: 'The Repeat',
    tagline: "The pattern you keep repeating, named directly, and what breaks it",
    emoji: '⛓️',
    price: 69,
    domain: 'oracle-temple',
    rating: 4.8,
    reviewCount: 1298,
    hook: "Some patterns carry forward until they're actually resolved. This reading names your real pattern, checks whether it's fading or getting stronger, and one way to finally complete it.",
    whatYouGet: [
      "The specific pattern you keep living out, named clearly across your life",
      "The unfinished business this pattern represents, not a punishment",
      "Where this pattern shows up most, and why that area specifically",
      "The real difference between resolving this pattern and just surviving it again",
      "What resolution actually looks like, practically, not only spiritually",
      "The kind of situation most likely to offer a real chance to break it",
      "One real action this month toward finally resolving it, not just noticing it",
      "The specific relationship most likely to test whether this pattern has genuinely shifted",
      "What your life would look like a year from now if this pattern finally resolved",
      "Whether this pattern has gotten stronger or weaker over the years",
    ],
    upsell: { id: 'spiritual-scribe', name: 'The Spirit Scribe', price: 24 },
  },
  {
    id: 'creative-genius-synthesis',
    name: "The Genius You Haven't Used Yet",
    tagline: "The specific creative capacity you haven't fully used yet, and why",
    emoji: '🎨',
    price: 59,
    domain: 'oracle-temple',
    hook: "Real creative ability often goes unused, not from a lack of talent but from a lack of permission, sometimes self-imposed, sometimes inherited from somewhere else. This reading names yours, and what actually using it would look like.",
    whatYouGet: [
      "Your specific creative ability, named clearly",
      "What's been holding back permission to use it",
      "Where this ability has already shown up in small, unnoticed ways",
      "What using it fully would look like in ordinary life",
      "The kind of creative work most matched to this ability",
      "The audience or place most likely to actually value it",
      "One small, real step this month to start using it more",
      "Whether this ability has been recognized by others before, even if you dismissed it",
      "What fully developing this ability would realistically require, stated honestly",
    ],
    upsell: { id: 'purpose-scribe', name: 'The Purpose Scribe', price: 24 },
  },
  {
    id: 'complete-remedy-plan',
    name: 'The Complete Remedy Plan',
    tagline: "A complete, personalized plan of practical remedies across every area of your life at once",
    emoji: '🗺️',
    price: 99,
    domain: 'oracle-temple',
    isBestSeller: true,
    hook: "Most readings tell you what's true. This one tells you what to actually do, across every part of your life at once, converging from multiple systems into one plan.",
    whatYouGet: [
      "A complete plan of real actions across every major part of your life",
      "Real actions for your core patterns, not generic advice",
      "Real actions matched to what your numbers show needs attention",
      "What your spiritual load is asking you to address, in practical terms",
      "Real health actions, matched to your actual body type",
      "What your closest relationships need from you right now",
      "The money pattern most worth addressing right away",
      "What your mental and emotional load is actually asking for",
      "Which of these matter most to act on first, not just a flat list",
      "How these different parts of the plan work together when followed at once",
      "The one area of this plan most likely to be skipped, and why it matters anyway",
      "What genuinely following this plan for ninety days would change, compared to following none of it",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'complete-life-portrait',
    name: 'The Complete Portrait of Who You Are',
    tagline: "The single most comprehensive reading in the catalog, everything synthesized into one portrait",
    emoji: '☀️',
    price: 99,
    domain: 'oracle-temple',
    isBestSeller: true,
    isPopular: true,
    rating: 5.0,
    reviewCount: 1876,
    hook: "This is the one reading built to hold everything at once. Your character, your love life, your money, your health, your spirit, your purpose, checked together, not one at a time.",
    whatYouGet: [
      "Your complete character, checked across every system that reads it, not just one",
      "Your real calling, named clearly enough to check against the work you do now",
      "Your real pattern in love, including your best window ahead for it",
      "Your specific way of earning, the real ceiling in your pattern, and what actually breaks it",
      "Your real body type, checked across more than one tradition, and what genuinely supports it",
      "Your spiritual gifts, and exactly where you are in your own spiritual stage right now",
      "The single biggest window currently open in your life, across every part of it",
      "Any real pattern passed down through your family line, or carried from further back, still shaping you",
      "The one thread running underneath everything else in your life",
      "What you're actually building toward that would still matter twenty years from now",
      "A full plan of real remedies across every part of this portrait, not just one suggestion",
      "Where every system checked here agrees, which is where the deepest signal is",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
]

export const getSelfPurposeToolsById = (id: string) => omniSelfPurposeTools.find(t => t.id === id)
export const getPopularSelfPurposeTools = () => omniSelfPurposeTools.filter(t => t.isPopular)