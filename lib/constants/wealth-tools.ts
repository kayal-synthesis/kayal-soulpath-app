// ============================================================
// WEALTH & CAREER - 12 Tools
// Domain: wealth
// Route: /domain/wealth
//
// Voice standard: plain, human, specific. No esoteric jargon
// surfaces in user-facing copy. The methodology engine stays
// under the hood, tracked only in `methodTag` (internal).
//
// CONSTRAINT: whatYouGet must contain exactly 8 items per tool.
// The .py generation pipeline expects 8 for this domain.
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

export interface WealthTool {
  id: string
  name: string
  tagline: string
  emoji: string
  hook: string
  price: number
  domain: 'wealth'
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

export const wealthTools: WealthTool[] = [
  {
    id: 'money-movement-reading',
    name: 'The Way Money Moves Through You',
    tagline: "The pattern behind every dollar you've ever earned, spent, or lost",
    emoji: '🌊',
    price: 34,
    domain: 'wealth',
    methodTag: 'hermetic',
    rating: 4.8,
    reviewCount: 2103,
    hook: "Money doesn't move the same way through everyone. There's a pattern behind how it flows through you, and it's been running your financial life longer than you think. This reading names it, and shows you how to stop working against it.",
    whatYouGet: [
      "The way money naturally moves through you, named clearly",
      "Why every piece of money advice you've tried has felt slightly wrong",
      "The one way you're most likely to lose money without ever noticing",
      "The one way you're most likely to actually build it, once you stop fighting yourself",
      "Whether this is a lifelong pattern, or one that shifted after a specific turning point",
      "Whether this pattern has ever changed, or stayed exactly the same your whole life",
      "The first financial decision this pattern is likely to affect",
      "One small money habit this month that actually fits how you're built",
    ],
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
  {
    id: 'income-ceiling-reading',
    name: 'The Number You Keep Landing On',
    tagline: "The exact income level you keep circling back to, and why it isn't random",
    emoji: '🧱',
    price: 34,
    domain: 'wealth',
    methodTag: 'astrology',
    isPopular: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 3567,
    hook: "If you've hit the same income level more than once, across more than one job, that isn't bad luck. This reading names the real reason behind it, and one clear way to finally break through.",
    whatYouGet: [
      "The exact income level you keep landing on, and why it isn't random",
      "The real reason you keep circling back to it, named clearly",
      "The moment in your working life when this ceiling first appeared",
      "Whether it's starting to loosen now, or still fully locked in place",
      "The kind of opportunity most likely to finally break it open",
      "Whether this has shown up in more than one job, or is tied to this one specifically",
      "The environment most likely to make it harder to break",
      "One clear move this month that works directly against this ceiling",
    ],
    guidanceType: 'practical-solution',
    guidanceText: "One specific move available to you in the next 90 days that directly targets the actual mechanism, not the symptom.",
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
  {
    id: 'calling-reading',
    name: 'The Work You Were Built For',
    tagline: "Not the closest job available. The one you were actually built for",
    emoji: '🧭',
    price: 34,
    domain: 'wealth',
    methodTag: 'dharma',
    rating: 4.7,
    reviewCount: 1842,
    hook: "Most career advice starts with what jobs exist, not who you are. This reading shows the work you were actually built for, whether it showed up early or arrived much later, and one first step to take.",
    whatYouGet: [
      "The kind of work you're genuinely built for, not the closest job available",
      "Why you've been talked out of this path before, and by whom",
      "The workplace where this work grows, and the one where it dies",
      "Whether this calling is strong and fixed in you, or still forming",
      "The real difference between your current job and the work that would actually fit",
      "Whether this has shown up since childhood, or emerged much later in life",
      "The income this calling is realistically capable of producing, stated honestly",
      "One small step this month toward this kind of work",
    ],
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
  {
    id: 'money-belief-reading',
    name: "The Belief That's Costing You Money",
    tagline: "The old rule about money that's been running your decisions without asking you",
    emoji: '🩹',
    price: 34,
    domain: 'wealth',
    methodTag: 'jungian',
    hook: "There's one belief about money that's been quietly running your decisions for years. Sometimes it traces back to a single moment. Sometimes it was just absorbed. This reading names it, and shows you how to change it.",
    whatYouGet: [
      "The specific belief about money that's been running your decisions without you knowing",
      "Where this belief most likely came from",
      "Three normal decisions where it's quietly been showing up",
      "What this belief has already cost you, in real terms, not just in feeling",
      "Whether it's deeply set in you, or can shift quickly once you see it clearly",
      "Whether it came from a specific event, or was simply absorbed over time",
      "The one financial goal this belief has kept just out of reach",
      "Start replacing it this week, beginning with something small and specific",
    ],
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
  {
    id: 'salary-timing-reading',
    name: "The Right Time to Ask for More",
    tagline: "The window is real. It also closes",
    emoji: '💬',
    price: 29,
    domain: 'wealth',
    methodTag: 'astrology',
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 2988,
    hook: "Timing changes how a money conversation goes, more than most people ever realize. This reading finds your real window to ask for more, checks whether it's already closing, and shows you how to use it before it does.",
    whatYouGet: [
      "Your real window ahead for asking for more money",
      "Whether that window is still fully open, or already starting to close",
      "The best way to ask, based on your natural style",
      "The one mistake most likely to work against you if you ask too soon",
      "What to do if the answer is no",
      "Whether this window is tied to your current role, or would apply anywhere you worked",
      "What asking for less than you're worth has already cost you",
      "One specific thing to prepare this week before you ask",
    ],
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
  {
    id: 'money-forecast-reading',
    name: 'Your Money, Two Years Out',
    tagline: "The shape of what's coming, and where the real turning point is",
    emoji: '📊',
    price: 29,
    domain: 'wealth',
    methodTag: 'astrology',
    hook: "Two years is long enough to see real change in your money life, and short enough to plan around. This reading maps it out, checks whether old patterns are repeating, and shows what to do now.",
    whatYouGet: [
      "The shape of your money life, month by month, for the next two years",
      "Your strongest window in this time for a smart financial move",
      "The stretch where saving carefully, not risking, is the right move",
      "The single biggest turning point in your money life over the next two years",
      "Whether you're heading into that turning point, or just past it",
      "Whether the pattern of the last two years is repeating, or genuinely shifting",
      "The area, saving, earning, or investing, this period favors most",
      "One thing to start this month that prepares you for your strongest window",
    ],
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
  {
    id: 'side-income-reading',
    name: 'The Income Stream Waiting to Be Built',
    tagline: "The one built for your actual strengths, not someone else's playbook",
    emoji: '🌱',
    price: 29,
    domain: 'wealth',
    methodTag: 'dharma',
    hook: "Most side hustle advice is identical for everyone, regardless of who they actually are. This reading shows the one that fits your specific strengths, and exactly how to start it this week.",
    whatYouGet: [
      "The type of extra income stream that actually fits your natural strengths",
      "Why the popular option everyone else is trying may not work as well for you",
      "The first real problem this type of income stream is likely to hit",
      "Whether this is a fast, natural fit for you, or something to build slowly",
      "What would help this idea survive its first hard month",
      "Whether this can realistically run alongside your current job, or needs your full attention",
      "The specific skill you already have that this idea depends on most",
      "One small, real first step to take this week",
    ],
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
  {
    id: 'risk-timing-reading',
    name: "When to Take the Risk",
    tagline: "The real window, not general encouragement to take one",
    emoji: '🎲',
    price: 29,
    domain: 'wealth',
    methodTag: 'astrology',
    hook: "A good decision and a well-timed decision aren't always the same thing, even when the reasoning is sound. This reading finds your real window for taking a financial risk, and what waiting past it would actually cost.",
    whatYouGet: [
      "Your real window ahead for a financial risk that's likely to pay off",
      "Whether that window is opening now, or already starting to close",
      "The kind of risk that fits your pattern, and the kind that usually backfires for you",
      "What to have in place before taking this risk",
      "The warning sign that this window is closing",
      "Whether this risk is about money, time, or reputation, and which one matters most here",
      "What waiting past this window would most likely cost you",
      "One thing to check or prepare this week before you act",
    ],
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
  {
    id: 'career-change-reading',
    name: 'Should You Change Careers',
    tagline: "A direct answer on whether now is actually the moment",
    emoji: '🔀',
    price: 44,
    domain: 'wealth',
    methodTag: 'archetype',
    isPopular: true,
    rating: 4.8,
    reviewCount: 1654,
    hook: "Career changes often fail from bad timing, not bad ideas. This reading gives you a clear answer on whether now is the moment, and the direction most likely to actually hold your interest.",
    whatYouGet: [
      "A clear answer on whether your unhappiness is about this job, or something bigger",
      "Whether now is genuinely the right window for a change, or whether waiting serves you better",
      "The real direction this change should take, not just a list of options",
      "What you'd be leaving behind that's genuinely worth grieving, not just guilt",
      "The fear most likely to stop you from making this change",
      "Whether you're moving through a major life-stage shift right now",
      "The specific type of role most likely to actually hold your interest long term",
      "One clear first step this month if the answer is yes",
    ],
    guidanceType: 'practical-solution',
    guidanceText: "If the read is yes, the single first move to make before telling anyone else about the decision.",
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
  {
    id: 'leadership-reading',
    name: 'How Authority Moves Through You',
    tagline: "Where it lands, where it doesn't, and why",
    emoji: '👑',
    price: 44,
    domain: 'wealth',
    methodTag: 'archetype',
    rating: 4.7,
    reviewCount: 1209,
    hook: "Some people command a room without trying. Others carry real authority that never quite lands the way it should. This reading names your real leadership pattern, where it's strong, and one way to use it better.",
    whatYouGet: [
      "Your specific leadership pattern, named clearly",
      "Where this leadership is already genuinely strong, even if no one has told you",
      "The one habit most likely quietly working against how people see you",
      "The type of room where your leadership works best",
      "The type of room where it currently falls flat, and why",
      "Whether this pattern shows up the same way at work and at home, or shifts by setting",
      "The kind of team or organization most likely to actually need what you offer",
      "One change this month that would let your leadership fully show",
    ],
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
  {
    id: 'founder-shape-reading',
    name: 'The Business Shaped Like You',
    tagline: "The specific kind built for your nature, not a one-size-fits-all quiz",
    emoji: '🏛️',
    price: 49,
    domain: 'wealth',
    methodTag: 'archetype',
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 1988,
    hook: "Not everyone is built for the same kind of business. Starting the wrong shape can cost you real years. This reading shows the shape that actually fits you, and whether now is a realistic time to start.",
    whatYouGet: [
      "The size and shape of business that actually fits your nature",
      "The role you're best suited for inside that business, founder, operator, or something else",
      "The kind of business partner who would complement you, if you need one",
      "The most common mistake people like you make in the first two years",
      "Whether now is a strong stage in your life to start, or whether waiting would serve you better",
      "Whether this shape is realistic given your current resources, or something to grow into",
      "The single biggest risk of starting before you're genuinely ready",
      "One first step this month if you decide to start",
    ],
    upsell: { id: 'business-destiny-synthesis', name: 'Your Business, Fully Mapped', price: 79 },
  },
  {
    id: 'later-career-reading',
    name: 'Where Your Strongest Years Are',
    tagline: "Many people peak early. Yours may not have started yet",
    emoji: '🌅',
    price: 49,
    domain: 'wealth',
    methodTag: 'astrology',
    rating: 4.8,
    reviewCount: 976,
    hook: "Many people believe their best working years happen early, and spend their later decades coasting because of it. This reading shows you which pattern is actually yours, and whether it has already begun.",
    whatYouGet: [
      "Whether your pattern points to an early career peak, or a later one",
      "What you should let go of now to make room for what's coming",
      "The decade ahead most likely to bring your highest income and authority",
      "What kind of work will satisfy you most at this stage, compared to before",
      "The most common mistake people at your stage make",
      "Whether this pattern has already started showing up, or is still further ahead",
      "What preparing too early or too late would each likely cost you",
      "One thing to start this month to prepare for your strongest decade",
    ],
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
]

export const getWealthToolById = (id: string) => wealthTools.find(t => t.id === id)
export const getPopularWealthTools = () => wealthTools.filter(t => t.isPopular)