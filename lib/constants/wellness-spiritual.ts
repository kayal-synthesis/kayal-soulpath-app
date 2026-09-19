// ============================================================
// WELLNESS & SPIRITUALITY - 14 Tools
// Domain: wellness
// Route: /domain/wellness
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

export interface WellnessTool {
  id: string
  name: string
  tagline: string
  emoji: string
  hook: string
  price: number
  domain: 'wellness'
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

export const wellnessTools: WellnessTool[] = [
  {
    id: 'body-type-reading',
    name: "Why Your Body Doesn't Follow the Rules",
    tagline: "The health advice that was never going to work for you, and what actually will",
    emoji: '🌿',
    price: 34,
    domain: 'wellness',
    methodTag: 'vedic',
    rating: 4.8,
    reviewCount: 1876,
    hook: "You've tried what works for everyone else. It didn't work for you. This reading names your real body type, why it's been fighting the standard playbook, and the one change that fits your body specifically.",
    whatYouGet: [
      "The type of body you actually have, not the one wellness culture assumes you have",
      "Why generic advice has never worked, even when you followed it exactly",
      "What genuinely helps your body, even when it goes against popular advice",
      "The 'healthy' habits that quietly make you worse",
      "Where your body shows stress first, before anywhere else does",
      "Whether this has been true your whole life, or shifted after a specific turning point",
      "What rest actually does for you, which is probably not what you've been told",
      "One small change this week that actually fits your body, not someone else's",
    ],
    upsell: { id: 'health-scribe', name: 'The Health Scribe', price: 24 },
  },
  {
    id: 'hidden-pattern-reading',
    name: "The Part of You That Knows",
    tagline: "The thing you keep almost admitting to yourself, then looking away from",
    emoji: '🌑',
    price: 44,
    domain: 'wellness',
    methodTag: 'jungian',
    isPopular: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 2745,
    hook: "There's something you keep circling back to, then turning away from before you fully see it. This reading names it. Not in a way that judges you. In a way that makes you go, oh. That's what that was.",
    whatYouGet: [
      "The thing you keep almost admitting to yourself, then talking yourself out of",
      "Why it has stayed just out of reach until now",
      "The exact situation in the next few weeks where it will probably surface",
      "The excuse you use when you get close to looking at it directly",
      "Whether this is a lifelong pattern, or one that's closer to breaking than you think",
      "Whether it's been getting louder recently, or has gone quiet for a while",
      "What it has quietly been costing you, even in the years it stayed hidden",
      "One honest question to sit with this week that starts facing it directly",
    ],
    guidanceType: 'practical-solution',
    guidanceText: "One specific situation in the coming weeks where this pattern is likely to surface, and what to do differently when it does.",
    upsell: { id: 'spiritual-scribe', name: 'The Pattern Journal', price: 24 },
  },
  {
    id: 'family-pattern-reading',
    name: 'The Family Pattern You Inherited',
    tagline: 'The thing your family passed down that no one talks about',
    emoji: '🌳',
    price: 44,
    domain: 'wellness',
    methodTag: 'lineage',
    rating: 4.8,
    reviewCount: 1532,
    hook: "Some of what you carry was never really yours. This reading names the family pattern behind it, shows how it has moved through your family, and one way to start setting it down.",
    whatYouGet: [
      "The exact pattern your family handed down, and where in the family it started",
      "How the same pattern has shown up differently for each person, while staying the same underneath",
      "The area of your life where it is most active right now",
      "Why your family has held onto this pattern. It has been doing something for them",
      "Whether every family member carries it, or some carry it much harder",
      "Whether this pattern has gotten louder recently, or stayed steady for years",
      "What stops with you, if you're the one who breaks it",
      "One small action this week that starts setting it down",
    ],
    upsell: { id: 'family-destiny-synthesis', name: 'What Your Family Actually Passed Down', price: 69 },
  },
  {
    id: 'hidden-gift-reading',
    name: "The Thing You Don't Give Yourself Credit For",
    tagline: "The gift you've been playing down, and why you've never leaned into it",
    emoji: '✨',
    price: 29,
    domain: 'wellness',
    methodTag: 'vedic',
    hook: "You're good at something you rarely give yourself credit for. Everyone else sees it. You've spent years explaining it away. This reading names it, shows you why you've dismissed it, and one way to actually start using it.",
    whatYouGet: [
      "The specific thing you are genuinely good at, named clearly",
      "Why you've dismissed it or played it down all this time",
      "Whether it's already strong in you, or still needs to be developed",
      "What using it looks like on a normal Tuesday, not in theory",
      "The moment where it's needed most, but offered least",
      "Whether others have noticed it before, even if you brushed it off",
      "What it looks like once it's fully developed, not just first noticed",
      "One small, real step to start using it this week",
    ],
    upsell: { id: 'spiritual-scribe', name: 'The Pattern Journal', price: 24 },
  },
  {
    id: 'carried-pattern-reading',
    name: "The Pattern That Isn't From This Life",
    tagline: "The instinct, fear, or pull your own history can't explain",
    emoji: '🕯️',
    price: 49,
    domain: 'wellness',
    methodTag: 'soul-contract',
    isBestSeller: true,
    rating: 4.7,
    reviewCount: 1420,
    hook: "Some patterns in your life don't match anything that has actually happened to you. This reading names what you carried in, how present it still is, and what to do with it.",
    whatYouGet: [
      "The pattern you most likely carried into this life, named clearly",
      "The fear you have that nothing in your life actually justifies",
      "Where this pattern is most active in your life right now",
      "The thing you have always been good at, with no obvious reason why",
      "What this pattern has been trying to complete",
      "Whether it's been getting stronger recently, or has always felt this present",
      "The kind of person you meet and instantly recognize, with no explanation",
      "One small action this week that helps it move toward completion, not repeat again",
    ],
    upsell: { id: 'spiritual-scribe', name: 'The Pattern Journal', price: 24 },
  },
  {
    id: 'energy-flow-reading',
    name: "Where You're Open, Where You're Blocked",
    tagline: "The exact places your energy moves freely, and the exact places it doesn't",
    emoji: '🔓',
    price: 34,
    domain: 'wellness',
    methodTag: 'vedic',
    rating: 4.7,
    reviewCount: 1698,
    hook: "Energy doesn't move evenly through anyone. This reading shows where yours is open, where it is closed, whether that has always been true, and one way to open what's blocked.",
    whatYouGet: [
      "Which parts of your energy are genuinely open right now, and which are closed",
      "What is actually keeping the closed parts closed",
      "How each block shows up in normal daily life, not just as a vague feeling",
      "Whether your biggest block is starting to loosen, or still fully shut",
      "The practice that fits your specific pattern, not a generic routine",
      "Whether this block has been there your whole life, or started after something specific",
      "The area of your life most likely to improve first once it clears",
      "One simple practice this week to start opening your biggest block",
    ],
    upsell: { id: 'health-scribe', name: 'The Health Scribe', price: 24 },
  },
  {
    id: 'hardest-season-reading',
    name: "The Season You're In",
    tagline: "Not a bad week. The kind of season that reshapes you",
    emoji: '🌒',
    price: 49,
    domain: 'wellness',
    methodTag: 'astrology',
    rating: 4.9,
    reviewCount: 892,
    hook: "This isn't for an ordinary hard week. This is for the season that has been quietly breaking and rebuilding you. This reading shows exactly where you are in it, whether the hardest part is behind you or still ahead, and what's actually being formed.",
    whatYouGet: [
      "Exactly where you are right now inside this season",
      "What's actually ending (versus what just feels like it is)",
      "What's quietly forming underneath, even if you can't see it yet",
      "Whether the hardest part is still building, or already starting to ease",
      "Why the things that used to work stopped working",
      "Whether this season has a clear starting point you can name, or built up slowly",
      "What's most likely to make it harder than it needs to be",
      "One grounding practice this week that fits this exact stage",
    ],
    guidanceType: 'practical-solution',
    guidanceText: "A grounding practice built specifically for this stage of the process, not a generic self-care suggestion.",
    upsell: { id: 'spiritual-scribe', name: 'The Pattern Journal', price: 24 },
  },
  {
    id: 'inner-voice-reading',
    name: "The Voice You've Been Ignoring",
    tagline: "Where your gut has already been right, and why you've been talking yourself out of it",
    emoji: '👁️',
    price: 29,
    domain: 'wellness',
    methodTag: 'somatic',
    hook: "Most people who say they don't trust themselves actually have a perfect track record. This reading proves it, names the exact place you second-guess yourself the most, and shows you how to stop.",
    whatYouGet: [
      "Real proof from your own life that your gut has been right all along",
      "Why you've talked yourself out of it anyway, named clearly",
      "How to tell the difference, in your body, between a real gut feeling and plain anxiety",
      "The area of your life where your gut is most reliable",
      "Whether this is naturally strong in you, or something you still need to practice",
      "Whether the doubt shows up more in relationships, work, or your own body",
      "Whose voice in your head talks you out of it most often",
      "One practice this week to hear it more clearly",
    ],
    upsell: { id: 'spiritual-scribe', name: 'The Pattern Journal', price: 24 },
  },
  {
    id: 'energy-drain-reading',
    name: "Why You're Tired All the Time",
    tagline: "What's actually draining you, and what will actually help",
    emoji: '⚡',
    price: 29,
    domain: 'wellness',
    methodTag: 'somatic',
    isPopular: true,
    rating: 4.8,
    reviewCount: 2210,
    hook: "Feeling tired for no clear reason usually has a real cause. This reading finds yours, checks whether this pattern is new or long-standing, and shows one thing that will genuinely help.",
    whatYouGet: [
      "Your natural energy pattern, named clearly",
      "What's actually draining you, which may have nothing to do with sleep",
      "What genuinely restores your energy, not what's just popular advice",
      "The time of day your energy is naturally strongest",
      "Whether your low energy points to a bigger pattern worth watching",
      "Whether this has been true for years, or changed recently",
      "The habit most likely making it worse without you realizing it",
      "One simple change this week that will genuinely help",
    ],
    upsell: { id: 'health-scribe', name: 'The Health Scribe', price: 24 },
  },
  {
    id: 'enough-audit',
    name: "The 'Never Enough' Feeling",
    tagline: "Where it came from, and why more doesn't fix it",
    emoji: '🌾',
    price: 34,
    domain: 'wellness',
    methodTag: 'hermetic',
    hook: "Feeling like you never have enough isn't always about money. This reading shows where this feeling actually started, where it shows up strongest, and how to loosen it.",
    whatYouGet: [
      "Where your feeling of never having enough most likely began",
      "How this feeling shows up in decisions that have nothing to do with money",
      "The area of your life where it's strongest right now",
      "The real difference between having more and feeling like it's enough",
      "Whether this is deeply set in you, or something that can shift with practice",
      "Whether it gets stronger around certain people, or stays the same regardless",
      "What having genuinely enough would actually let you stop doing",
      "One small decision this week from a place of enough, not fear",
    ],
    upsell: { id: 'spiritual-scribe', name: 'The Pattern Journal', price: 24 },
  },
  {
    id: 'recurring-dream-reading',
    name: "The Dream That Keeps Coming Back",
    tagline: "What your recurring dream is actually trying to tell you",
    emoji: '🌙',
    price: 29,
    domain: 'wellness',
    methodTag: 'dreamwork',
    hook: "Repeating dreams aren't random. This reading names the real theme behind yours, why it's showing up in your sleep instead of your waking life, and one way to work with it.",
    whatYouGet: [
      "The real theme most likely behind your repeating dream",
      "Why it's showing up in your sleep instead of your waking thoughts",
      "The part of your waking life it's most connected to",
      "Whether it's close to being resolved, or still just beginning to surface",
      "One way to work with it while you're awake, not only while you sleep",
      "Whether it has become more frequent recently, or has always shown up occasionally",
      "The decision or relationship it's most likely trying to prepare you for",
      "One small practice tonight before bed to invite more clarity",
    ],
    upsell: { id: 'health-scribe', name: 'The Health Scribe', price: 24 },
  },
  {
    id: 'purpose-gap-reading',
    name: 'The Gap Between Who You Are and How You Live',
    tagline: "Why knowing your purpose hasn't changed anything yet",
    emoji: '🔥',
    price: 34,
    domain: 'wellness',
    methodTag: 'dharma',
    rating: 4.7,
    reviewCount: 1345,
    hook: "Knowing your purpose and actually living it are two different things. This reading shows you exactly where the gap is, what's actually holding it open, and one small way to close it.",
    whatYouGet: [
      "The exact gap between what you know about your purpose and how you're actually living",
      "What's really in the way, day to day, not the excuse you've been blaming",
      "The smallest way this purpose could show up in an ordinary week",
      "The fear most likely keeping this gap open",
      "Whether you're entering a stage that makes closing it more likely now",
      "Whether this gap has been there for years, or opened up more recently",
      "The specific fear underneath the one you already knew about",
      "One small decision this month that starts closing the gap",
    ],
    upsell: { id: 'spiritual-scribe', name: 'The Pattern Journal', price: 24 },
  },
  {
    id: 'unfinished-ties-reading',
    name: "The Pulls You Didn't Choose",
    tagline: "The connections you're still carrying, and what they're actually doing to you",
    emoji: '🔗',
    price: 34,
    domain: 'wellness',
    methodTag: 'attachment',
    hook: "Some strong pulls toward certain people or places were never fully your choice. This reading names the real ties you're still carrying, how they've changed, and one way to work with them.",
    whatYouGet: [
      "The specific ties you're still carrying, named clearly",
      "Where each one most likely started, in family, an old event, or something further back",
      "Whether each tie is actually helping you or quietly draining you",
      "The part of your life where these ties show up most, without you realizing it",
      "Whether a tie is close to being resolved, or still fully active",
      "Whether this tie has gotten stronger or weaker as your life has changed",
      "The specific circumstance most likely to bring an old tie back into focus",
      "One simple action this week to start working with your strongest tie",
    ],
    upsell: { id: 'spiritual-scribe', name: 'The Pattern Journal', price: 24 },
  },
  {
    id: 'old-promise-reading',
    name: "The Promise You Don't Remember Making",
    tagline: "The promise you're still keeping without knowing it",
    emoji: '🕊️',
    price: 34,
    domain: 'wellness',
    methodTag: 'soul-contract',
    hook: "Some patterns make no sense given your real history. This reading names the old promise behind it, where it shows up most, and one way to finally let it go.",
    whatYouGet: [
      "The old promise you're still keeping without realizing it",
      "The kind of moment this promise was probably made in",
      "Where it shows up now, in choices that have nothing to do with where it started",
      "What it was protecting you from, and whether you still need that protection",
      "Whether it's close to being released, or still firmly in place",
      "Whether it shows up more in relationships, work, or how you treat yourself",
      "What would change the moment you chose differently, just once",
      "One small action this week to start letting it go",
    ],
    upsell: { id: 'spiritual-scribe', name: 'The Pattern Journal', price: 24 },
  },
]

export const getWellnessToolById = (id: string) => wellnessTools.find(t => t.id === id)
export const getPopularWellnessTools = () => wellnessTools.filter(t => t.isPopular)