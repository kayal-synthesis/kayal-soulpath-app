// ============================================================
// LOVE & RELATIONSHIPS - 13 Tools
// Domain: love
// Route: /domain/love
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

export interface LoveTool {
  id: string
  name: string
  tagline: string
  emoji: string
  hook: string
  price: number
  domain: 'love'
  methodTag?: MethodTag
  requiresPartner?: boolean
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

export const loveTools: LoveTool[] = [
  {
    id: 'soulmate-timing-reading',
    name: 'When Your Soulmate Arrives',
    tagline: "The window when your person actually arrives, not just when you hope they will",
    emoji: '🕰️',
    price: 29,
    domain: 'love',
    methodTag: 'astrology',
    isPopular: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 3204,
    hook: "Most people wait for love without knowing if their real window is open, or already closing. This reading finds that window, shows what's been quietly keeping the right person away, and one real next step.",
    whatYouGet: [
      "The real time window when a serious new person is most likely to enter your life",
      "Whether this window is still opening, or has already started to close",
      "What you're doing now that may be keeping the right person away without you knowing",
      "The one small change that would open this window wider",
      "Whether this kind of missed timing has happened before, and what made it repeat",
      "The kind of person most likely to actually match you once this window opens",
      "What to do if the window has already started to close",
      "One small step this week, and notice how it changes the wait",
    ],
    guidanceType: 'practical-solution',
    guidanceText: "One clear action for the weeks right before your window opens, not generic advice to put yourself out there.",
    upsell: { id: 'love-scribe', name: 'The Love Scribe', price: 24 },
  },
  {
    id: 'repeating-wound-reading',
    name: 'The Same Wound, Different Face',
    tagline: "The relationship pattern you keep living out, with a different person each time",
    emoji: '💔',
    price: 34,
    domain: 'love',
    methodTag: 'jungian',
    rating: 4.9,
    reviewCount: 2871,
    hook: "You may have noticed the same pain repeats with different partners. This reading finds the real pattern behind your wound, shows where it started, whether it's fading or still strong, and one clear way to stop it.",
    whatYouGet: [
      "The exact shape of the pattern you keep repeating, in words you'll recognize right away",
      "Where this pattern most likely started, often earlier than you think",
      "The early warning sign that shows up every time, before the pattern takes over",
      "Whether this pattern is deep and automatic in you, or something that changes once it's named",
      "The type of person you're drawn to without realizing it, who keeps this pattern alive",
      "Whether this pattern has been getting weaker over time, or is just as strong as ever",
      "The one situation most likely to bring this pattern back, even after real progress",
      "Catch it the next time it starts. This reading shows you exactly how",
    ],
    guidanceType: 'practical-solution',
    guidanceText: "The one moment, early in any new connection, where this pattern is still interruptible, and what interrupting it looks like.",
    upsell: { id: 'love-scribe', name: 'The Love Scribe', price: 24 },
  },
  {
    id: 'love-loop-reading',
    name: 'The Love Loop',
    tagline: "Why you keep hitting the same wall, and how to actually break it",
    emoji: '⚖️',
    price: 34,
    domain: 'love',
    methodTag: 'soul-contract',
    hook: "Some love patterns didn't start with you. This reading names the pattern running underneath your love life, whether it's easing or still heavy, and one clear way to finally break it.",
    whatYouGet: [
      "The specific pattern you carried in, before your own history even began shaping it",
      "What this pattern has quietly been asking of you in every serious relationship so far",
      "The kind of relationship most likely to bring this pattern up to the surface",
      "Whether this pattern is close to being resolved, or still just beginning",
      "Whether it's more about romantic love specifically, or shows up in other close relationships too",
      "What resolving this pattern would actually free you to do differently going forward",
      "The type of person most likely to keep this pattern going, without meaning to",
      "One real step this month toward settling it, not just naming it",
    ],
    upsell: { id: 'complete-love-synthesis', name: 'The Complete Read on How You Love', price: 79 },
  },
  {
    id: 'rare-connection-reading',
    name: "The Connection You Can't Explain",
    tagline: "A direct answer on what this actually is",
    emoji: '🔥',
    price: 44,
    domain: 'love',
    methodTag: 'synastry',
    requiresPartner: true,
    isPopular: true,
    rating: 4.8,
    reviewCount: 1965,
    hook: "Some connections feel rarer than others, and mixing up what they actually are can hurt you. This reading uses both of your details, checks whether this has shown up before, and gives you a clear answer.",
    whatYouGet: [
      "A clear answer on what this connection actually is, not a maybe",
      "What this answer really means for how it's likely to go",
      "Whether the strong pull between you is still growing, or already starting to settle",
      "Whether one of you tends to lead this connection more than the other",
      "What staying would really ask of you, based on what this is",
      "Whether this connection has repeated before, in a different form, with a different person",
      "The specific area of life this is most likely to disrupt, for better or worse",
      "If you stay, what to do this week. If you let go, it tells you that too",
    ],
    upsell: { id: 'complete-love-synthesis', name: 'The Complete Read on How You Love', price: 79 },
  },
  {
    id: 'compatibility-reading',
    name: 'Where You Align, Where You Collide',
    tagline: "A full read on the two of you, not a percentage score",
    emoji: '🧩',
    price: 49,
    domain: 'love',
    methodTag: 'synastry',
    requiresPartner: true,
    isPopular: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 4102,
    hook: "A number can't show you where you truly match and where you truly clash. This reading compares both of your patterns directly, shows the real friction, and where you're genuinely strong together.",
    whatYouGet: [
      "The places where you naturally match, without either of you trying",
      "The real friction points, named clearly, not softened",
      "Which friction points you can work through, and which ones won't change",
      "What you're genuinely great at together that neither of you is as good at alone",
      "Whether one of you tends to lead and one tends to follow, and if that's healthy for you both",
      "Whether the friction between you has already tested a real relationship, or is still theoretical",
      "The specific area of daily life where this pairing works best together",
      "Ease the biggest friction point this week, with one change only one of you needs to make",
    ],
    upsell: { id: 'complete-love-synthesis', name: 'The Complete Read on How You Love', price: 79 },
  },
  {
    id: 'closeness-pattern-reading',
    name: 'How You Move Toward and Away From People',
    tagline: "Why closeness feels the specific way it does for you",
    emoji: '🌊',
    price: 34,
    domain: 'love',
    methodTag: 'attachment',
    rating: 4.8,
    reviewCount: 2340,
    hook: "Some people move toward closeness. Some people pull away. This reading names your real pattern, when it shows up, whether it changes with different partners, and one way to feel safer.",
    whatYouGet: [
      "Your specific pattern of moving toward or away from closeness, named clearly",
      "Where this pattern most likely began, and why it made sense back then",
      "The exact point in a relationship where this pattern tends to switch on",
      "Whether this pattern is strong and automatic in you, or easy to shift once you notice it",
      "What real safety and closeness would actually feel like for you",
      "Whether this shows up the same way with every partner, or changes depending on who you're with",
      "The specific moment this pattern is most likely to quietly end a relationship, if left unchecked",
      "Practice feeling safe this week with an exercise built for your specific pattern",
    ],
    upsell: { id: 'love-scribe', name: 'The Love Scribe', price: 24 },
  },
  {
    id: 'love-forecast-reading',
    name: "What's Coming in Love This Year",
    tagline: "Your next twelve months in love, mapped in advance",
    emoji: '📅',
    price: 29,
    domain: 'love',
    methodTag: 'astrology',
    hook: "Not every month this year is the same for love. This reading maps your next twelve months, checks whether last year's pattern is repeating, and shows what to do now.",
    whatYouGet: [
      "The shape of your love life, month by month, for the next year",
      "Your strongest window this year for meeting someone new, or growing closer to someone you love",
      "The stretch where being alone, not searching, is actually the right move",
      "The single biggest turning point coming in your love life this year",
      "Whether the current chapter in your love life is still opening, or already closing",
      "Whether last year's pattern is repeating this year, or genuinely shifting",
      "The area this year favors most, meeting someone new, or deepening one you have",
      "One specific move this month to make the most of your best window",
    ],
    upsell: { id: 'love-scribe', name: 'The Love Scribe', price: 24 },
  },
  {
    id: 'relationship-check-reading',
    name: 'Where This Relationship Actually Stands',
    tagline: "An honest read on where this relationship actually stands right now",
    emoji: '🩺',
    price: 44,
    domain: 'love',
    methodTag: 'synastry',
    requiresPartner: true,
    rating: 4.8,
    reviewCount: 1877,
    hook: "It's hard to see your own relationship clearly from inside it. This reading looks at both of you honestly, checks whether old patterns are repeating, and shows what's solid.",
    whatYouGet: [
      "What's genuinely solid in this relationship right now, not just what you hope is true",
      "What's quietly falling apart, named before it gets worse",
      "The one thing this relationship needs most in the next few months",
      "Whether the current problem is getting worse, or already starting to settle down",
      "Whether one of you is carrying more of the relationship than the other",
      "Whether this pattern has shown up in past relationships for either of you, or is new to this one",
      "The real difference between how each of you would describe this relationship right now",
      "One way to start the honest conversation this relationship is overdue for",
    ],
    upsell: { id: 'synastry-health-cross-impact', name: 'How This Relationship Affects Your Health', price: 59 },
  },
  {
    id: 'stay-or-leave-reading',
    name: 'Should You Stay or Go',
    tagline: "A direct read built to answer one question clearly",
    emoji: '⚔️',
    price: 49,
    domain: 'love',
    methodTag: 'synastry',
    requiresPartner: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 2156,
    hook: "If you've been asking this alone, this reading looks closely at your actual marriage and gives you a clear, honest answer. Not a quick guess. This is for the kind of decision where being wrong can cost you years.",
    whatYouGet: [
      "A clear score on how strong this marriage really is, not a guess",
      "What leaving would really cost you in the first year, in money and in feelings",
      "How to tell the difference between a hard time and a marriage that has already ended",
      "Whether one of you controls the relationship too much, and how that pattern could repeat if this one ends",
      "Whether your main problem is getting worse or already past its worst point, and what that means for the next six months",
      "Whether trust is the real problem here, or if something else is",
      "One simple thing you can do this week, based on what's really causing the problem",
      "One real question underneath every other question in this reading, finally in focus",
    ],
    upsell: { id: 'marriage-longevity-score', name: 'How Long This Is Actually Built to Last', price: 69 },
  },
  {
    id: 'self-love-reading',
    name: 'The Love You Owe Yourself First',
    tagline: "What self-love actually requires from you, specifically",
    emoji: '🪞',
    price: 29,
    domain: 'love',
    methodTag: 'jungian',
    hook: "Self-love is a phrase people use without meaning it. This reading shows exactly where you've been hardest on yourself, whether that has eased over time, and one way to change it.",
    whatYouGet: [
      "The one area where you've been hardest on yourself, named clearly",
      "Why the usual self-love advice hasn't worked for you",
      "Whether this pattern is deeply set in you, or something that can shift once you see it",
      "How this pattern has quietly shaped who you choose to love",
      "What actually closing this gap looks like in real life, not just as a nice thought",
      "Whether this pattern has eased over time, or feels just as strong as it did years ago",
      "The specific relationship this pattern is most likely to affect first",
      "Start closing the gap this week with something small, done just for you",
    ],
    upsell: { id: 'love-scribe', name: 'The Love Scribe', price: 24 },
  },
  {
    id: 'ex-return-reading',
    name: 'Will Your Ex Come Back',
    tagline: "A private, honest read on whether this specific reconciliation is likely",
    emoji: '🌙',
    price: 34,
    domain: 'love',
    methodTag: 'astrology',
    rating: 4.7,
    reviewCount: 3388,
    hook: "Everyone who has gone through a real breakup has asked this. This reading gives you an honest answer, checks whether this has happened before, and what to do next.",
    whatYouGet: [
      "An honest answer on how likely it is that this specific person comes back",
      "What would really need to change for this to actually work",
      "The real timing, if it does happen",
      "Whether the pull between you is still growing or already fading, no matter what either of you does",
      "The one mistake that could ruin any chance of this working, if you make it again",
      "Whether this same pattern of leaving and returning has happened before between you",
      "The specific sign that would tell you clearly this is not going to happen",
      "Whatever the answer turns out to be, one place to put your attention this week",
    ],
    upsell: { id: 'love-scribe', name: 'The Love Scribe', price: 24 },
  },
  {
    id: 'love-give-need-reading',
    name: 'The Love You Give, The Love You Need',
    tagline: "How you actually give love, versus how you need to receive it",
    emoji: '🗝️',
    price: 29,
    domain: 'love',
    methodTag: 'attachment',
    hook: "You may be giving love the way you want to receive it, not the way others need it. This reading shows the real gap, whether it repeats, and how to close it.",
    whatYouGet: [
      "The specific way you naturally give love, and why it feels normal to you",
      "The specific way you actually need to receive love, which may be different",
      "Where this gap has caused real hurt or confusion before",
      "Whether the way you love is a fixed pattern, or changes depending on who you're with",
      "How to ask for what you need without it feeling like too much",
      "Whether this pattern has caused the same kind of hurt more than once, with different partners",
      "The specific way this gap is most likely to show up early in a new relationship",
      "Show love the way your partner actually needs it, starting with something specific this week",
    ],
    upsell: { id: 'love-scribe', name: 'The Love Scribe', price: 24 },
  },
  {
    id: 'numbers-match-reading',
    name: 'Do Your Numbers Actually Match',
    tagline: "A lighter, numbers-based check, a simpler first step before the deeper read",
    emoji: '🔢',
    price: 34,
    domain: 'love',
    methodTag: 'numerology',
    requiresPartner: true,
    hook: "Not every match needs a deep reading right away. This reading checks both of your numbers, shows if this pattern has shown up before, and gives you a simple, honest answer.",
    whatYouGet: [
      "A clear compatibility answer based on both of your numbers",
      "The area where your numbers naturally match",
      "The area where your numbers are more likely to clash",
      "Whether this match is worth exploring further, based on what shows up here",
      "Whether your numbers have shown this same pattern with someone else before",
      "The specific number in each of you most responsible for the friction",
      "What this pairing is naturally good at, even in the areas where the numbers clash",
      "Work with your biggest clash this month using a real, practical approach",
    ],
    upsell: { id: 'compatibility-reading', name: 'Where You Align, Where You Collide', price: 49 },
  },
]

export const getLoveToolById = (id: string) => loveTools.find(t => t.id === id)
export const getPopularLoveTools = () => loveTools.filter(t => t.isPopular)