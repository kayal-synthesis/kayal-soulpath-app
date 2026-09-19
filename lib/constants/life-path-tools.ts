// ============================================================
// LIFE PATH & DESTINY - 14 Tools
// Domain: life-path
// Route: /domain/life-path
//
// Voice standard: plain, human, specific. No esoteric jargon
// surfaces in user-facing copy. The methodology engine stays
// under the hood, tracked only in `methodTag` (internal).
//
// CONSTRAINT: whatYouGet must contain exactly 8 items per tool.
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
  | 'synastry'
  | 'pinnacle'

export interface LifePathTool {
  id: string
  name: string
  tagline: string
  emoji: string
  hook: string
  price: number
  domain: 'life-path'
  methodTag?: MethodTag
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

export const lifePathTools: LifePathTool[] = [
  {
    id: 'core-pattern-reading',
    name: 'The Pattern Your Whole Life Is Built On',
    tagline: "The one core pattern running underneath everything else, explained in full",
    emoji: '🧭',
    price: 49,
    domain: 'life-path',
    methodTag: 'numerology',
    isPopular: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 4587,
    hook: "There's a pattern underneath everything in your life, and most readings barely touch it. This reading goes deep, checks it two different ways, and shows what it actually means for you.",
    whatYouGet: [
      "Your core pattern, explained in real depth, not one short paragraph",
      "How this pattern shows up in your work, your relationships, and how you handle conflict",
      "Where this pattern has already proven true in your life, even if you never named it",
      "Two separate systems checked together, so this reading is more reliable than just one",
      "The specific way people close to you often misread this pattern",
      "What this pattern is asking of you at this exact point in your life",
      "The specific strength in this pattern that tends to get overlooked because it looks effortless",
      "One small change this month that fits your core pattern, not fights it",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'the-deal-reading',
    name: 'The Deal You Made',
    tagline: "The real terms you arrived with, and what they're asking of you now",
    emoji: '📜',
    price: 44,
    domain: 'life-path',
    methodTag: 'soul-contract',
    rating: 4.8,
    reviewCount: 1876,
    hook: "Some people feel their life is meant for something specific, without knowing what. This reading names your real agreement, checks how close you are to living it, and how to start honoring it.",
    whatYouGet: [
      "The core agreement you appear to have come in carrying, named directly",
      "What honoring this agreement actually looks like in daily life",
      "How you've likely been avoiding it, often without noticing",
      "The situation in your life that keeps pointing back to this agreement",
      "Whether you're close to living it fully, or still avoiding it",
      "What's most likely made this agreement feel too big to actually start",
      "The kind of person or moment most likely to remind you of it, whether you want the reminder or not",
      "One small action this week that moves you toward honoring it",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'life-chapter-reading',
    name: "The Chapter of Your Life You're In",
    tagline: "The exact chapter you're in right now, and what it's asking for",
    emoji: '📖',
    price: 44,
    domain: 'life-path',
    methodTag: 'pinnacle',
    isPopular: true,
    rating: 4.8,
    reviewCount: 2102,
    hook: "Life moves through real chapters, each asking something different. This reading names exactly which chapter you're in, checks how far along you are, and what it wants from you.",
    whatYouGet: [
      "The exact chapter you're in right now, named specifically",
      "How long you've likely been in it, and what set it in motion",
      "What this chapter is asking of you, different from what earlier chapters asked",
      "Whether this chapter is ending soon, or you're only partway through it",
      "The kind of effort that will actually work right now, and the kind that's wasted",
      "What the chapter right before this one was actually preparing you for",
      "The specific sign that will tell you clearly when this chapter is closing",
      "One clear focus for this month that fits exactly where you are",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'life-cycle-reading',
    name: 'The Shape of Your Whole Life',
    tagline: "A complete map of your cycle, past and present, in one reading",
    emoji: '🗺️',
    price: 49,
    domain: 'life-path',
    methodTag: 'numerology',
    rating: 4.9,
    reviewCount: 1743,
    hook: "Your life moves in a repeating pattern that most people never actually see. This reading maps your whole cycle at once, checks exactly where you stand, so the separate years finally make sense.",
    whatYouGet: [
      "The complete shape of your cycle, from the start to right now",
      "What each year in this cycle has actually been building toward",
      "Exactly where you stand right now inside this cycle",
      "What the years still ahead are asking of you",
      "The single most important year still coming in this cycle",
      "How this cycle compares to the one directly before it",
      "What finishing this cycle well would actually look like, beyond just getting through it",
      "One thing to start this month to make the most of this cycle",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'returning-lessons-reading',
    name: 'The Lesson That Keeps Coming Back',
    tagline: "The specific lesson your life keeps returning you to, until it's actually learned",
    emoji: '🔁',
    price: 34,
    domain: 'life-path',
    methodTag: 'soul-contract',
    hook: "Certain lessons keep showing up in different forms until you finally learn them. This reading names yours clearly, checks how close you are, and how to actually learn it.",
    whatYouGet: [
      "The specific lesson your life keeps circling back to, named clearly",
      "The different forms this lesson has taken in your life so far",
      "The form it's most likely to take the next time it appears",
      "Whether you're close to learning it, or still early in the process",
      "Why this lesson has been so hard to hold onto until now",
      "The specific relationship or role most likely to test whether you've actually learned it",
      "What your life would look like once this lesson genuinely sticks",
      "One real action this month that helps you finally learn it, not just notice it",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'life-direction-reading',
    name: "The Direction You Can't Stop Feeling",
    tagline: "The pull toward something specific, whether you've noticed it or not",
    emoji: '🧲',
    price: 34,
    domain: 'life-path',
    methodTag: 'astrology',
    rating: 4.7,
    reviewCount: 1298,
    hook: "There's a real pull in your life toward something specific, even if you can't name it yet. This reading names it, checks whether you're already moving toward it, and one step to follow it.",
    whatYouGet: [
      "The specific direction your life is quietly pulling you toward",
      "What's likely been resisting this pull, and why that made sense before",
      "The comfortable pattern this direction is actually asking you to move beyond",
      "Whether you're already moving in this direction, or still resisting it",
      "What moving toward it looks like in real, practical terms",
      "The specific cost of continuing to resist this pull, stated honestly",
      "What becomes available once you stop fighting this direction",
      "One small step this week toward this direction",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'this-year-reading',
    name: 'What This Year Is Actually For',
    tagline: "A complete reading of your current chapter, explaining what this exact year is asking",
    emoji: '📆',
    price: 34,
    domain: 'life-path',
    methodTag: 'numerology',
    isPopular: true,
    rating: 4.8,
    reviewCount: 2654,
    hook: "Every year of your life has its own real theme. This reading names what this exact year is for, checks whether its biggest chance has passed, and what to do with it.",
    whatYouGet: [
      "The specific theme running underneath this exact year of your life",
      "What this year genuinely supports, and what it tends to resist no matter how hard you try",
      "Why certain efforts this year have felt harder than they should",
      "What this year is quietly preparing you for, even if it doesn't feel like it yet",
      "Whether this year's biggest opportunity is still ahead, or already starting to pass",
      "How this year connects to the one right before it",
      "What next year is likely to ask of you instead, so you can prepare early",
      "One clear focus for the months left in this year",
    ],
    guidanceType: 'daily-guidance',
    guidanceText: "One theme-aligned focus for the remainder of this year, revisited each time you return to this reading.",
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'heavy-life-reading',
    name: "Why Your Life Feels Heavier Than Everyone Else's",
    tagline: "A reading built for the rare weight you've been carrying",
    emoji: '💠',
    price: 44,
    domain: 'life-path',
    methodTag: 'numerology',
    rating: 4.9,
    reviewCount: 967,
    hook: "Some people carry a heavier, more intense life pattern than most. This reading names why yours feels this way, checks what it's already cost you, and how to carry it well.",
    whatYouGet: [
      "What your specific pattern has actually been asking of you",
      "Why this weight has felt heavier than what people around you seem to carry",
      "What this intensity has likely already cost you",
      "What this pattern is actually for, beyond just the pressure of carrying it",
      "The real difference between rising to this and simply burning out under it",
      "The specific age or period when this weight is most likely to feel heaviest",
      "What others carrying the same weight have found helps most",
      "One practice this month that helps you carry this weight well, not just survive it",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'name-signature-reading',
    name: 'What Your Name Says Before You Do',
    tagline: "The signature your name carries, and how it shapes first impressions",
    emoji: '🖋️',
    price: 29,
    domain: 'life-path',
    methodTag: 'numerology',
    hook: "Your name carries a real signature that shapes how people see you. This reading names it, checks how strongly it's shaped first impressions, and shows where it fits.",
    whatYouGet: [
      "The specific signature your name carries, named clearly",
      "Where this signature matches who you actually are",
      "Where it clashes, creating a gap between how you're seen and who you are",
      "How this signature has shaped first impressions throughout your life",
      "Whether this gap is small or significant for you right now",
      "The specific setting, work, family, or new relationships, where this gap shows up most",
      "What people consistently get wrong about you because of this signature",
      "One way to work with this gap, if closing it matters to you",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'deepest-want-reading',
    name: "What You're Really After",
    tagline: "What you actually want, beneath what you've told yourself you want",
    emoji: '💫',
    price: 34,
    domain: 'life-path',
    methodTag: 'numerology',
    hook: "There's often a real gap between the goals you've chosen and what you actually want underneath. This reading names your deeper want, and checks how close you already are to it.",
    whatYouGet: [
      "The deeper want underneath your surface goals, named clearly",
      "Where you've likely been chasing a substitute for this want instead of the real thing",
      "Why some achievements have felt hollow even when they should have felt good",
      "The kind of experience that actually satisfies this deeper want",
      "Whether you're close to living from this deeper want, or still chasing substitutes",
      "The specific fear most likely to have kept you chasing the substitute instead",
      "What your life would look like if you stopped chasing the substitute entirely",
      "One small choice this week that moves you toward the real thing",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'the-gaps-reading',
    name: "The Strengths You Had to Build",
    tagline: "The abilities that didn't come naturally, and what that absence has meant for you",
    emoji: '🕳️',
    price: 29,
    domain: 'life-path',
    methodTag: 'numerology',
    hook: "What's missing from your pattern matters as much as what's there. This reading names your gap, checks how it's shown up before, and how to build around it.",
    whatYouGet: [
      "The specific capacity you've had to build on purpose, instead of it coming naturally",
      "How this gap has shown up as a repeat challenge in your life",
      "Whether this is a gap you've already learned to work around, or still struggle with",
      "What working with this gap looks like, instead of fighting it",
      "The kind of person or environment most likely to help this gap close naturally",
      "What would genuinely change in your life if this gap closed",
      "The specific moment this gap is most likely to show itself again",
      "One small practice this month that builds strength in this exact area",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'name-fit-reading',
    name: 'Does Your Name Work For You',
    tagline: "Whether the name you go by is helping or holding you back",
    emoji: '🔤',
    price: 29,
    domain: 'life-path',
    methodTag: 'numerology',
    hook: "The name you go by either supports your pattern or works against it. This reading tells you which, checks how strong the effect really is, clearly and directly.",
    whatYouGet: [
      "A direct answer on whether your current name supports or works against your pattern",
      "The specific way it's helping or holding you back",
      "What a more supportive name would need to carry, if you ever considered a change",
      "Whether a nickname or short version you already use shifts this in either direction",
      "Whether this effect is strong or fairly minor for you personally",
      "The specific area of life, work, relationships, or self-image, where this effect shows up most",
      "What changed for other people once they made a similar name adjustment",
      "One simple way to work with your name as it stands now, without changing it",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
  {
    id: 'missing-hour-reading',
    name: 'The Missing Hour',
    tagline: "For anyone who doesn't know their exact birth time, working backward to find it",
    emoji: '⏳',
    price: 39,
    domain: 'life-path',
    methodTag: 'astrology',
    isNew: true,
    hook: "Not knowing your exact birth time makes every other reading less accurate. This reading works backward from the real events in your life to find the missing piece.",
    whatYouGet: [
      "A narrowed, best estimate of your birth time, worked out from real events in your life, not a guess",
      "Which moments in your life were used to reach this estimate, and why they mattered",
      "How confident this estimate is, stated honestly, not presented as fully certain",
      "What shifts in your other readings once this better estimate is used",
      "What extra details would sharpen this estimate even further later",
      "A plain explanation of why this one detail matters for everything else",
      "Which of your other readings would benefit most from being redone with this corrected time",
      "The specific detail most likely to sharpen once this estimate is in place",
    ],
    guidanceType: 'practical-solution',
    guidanceText: "A short list of the specific life-event types most useful to gather before starting, so the estimate lands as tight as possible on the first pass.",
    upsell: { id: 'core-pattern-reading', name: 'The Pattern Your Whole Life Is Built On', price: 49 },
  },
  {
    id: 'remembered-for-reading',
    name: "What You'll Actually Be Remembered For",
    tagline: "The legacy you're quietly building, whether or not you've noticed it forming",
    emoji: '🌳',
    price: 44,
    domain: 'life-path',
    methodTag: 'dharma',
    hook: "Legacy isn't only decided at the end of a life. This reading names what you'll actually be remembered for, and checks where it's already forming right now.",
    whatYouGet: [
      "What you'll actually be remembered for, named directly",
      "How this differs from what you've assumed your legacy would be",
      "Where this legacy is already taking shape right now, even if you haven't noticed",
      "What's likely been distracting you from building it on purpose",
      "Whether your impact is more quiet and personal, or public and visible",
      "The specific person or group most likely to carry this legacy forward after you",
      "What would need to change now for this legacy to actually be the one you want",
      "One small action this month that moves you toward building it on purpose",
    ],
    upsell: { id: 'the-life-scribe', name: 'The Life Scribe', price: 24 },
  },
]

export const getLifePathToolById = (id: string) => lifePathTools.find(t => t.id === id)
export const getPopularLifePathTools = () => lifePathTools.filter(t => t.isPopular)