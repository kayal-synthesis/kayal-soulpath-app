// ============================================================
// TIMEKEEPER'S VAULT — 5 Tools
// Domain: time-keeper
// Route: /domain/time-keeper
// This domain scored 100% flagged in the original jargon audit —
// every hook and whatYouGet named "Personal Day/Month/Year,"
// "Moon phase," "Solar Return," "Saturn and Jupiter movements"
// directly. Rewritten clean at the source. Escalating cascade by
// design: daily -> monthly -> quarterly -> annual -> nine-year,
// each upselling into the next.
// ============================================================

export interface TimeKeeperTool {
  id: string
  name: string
  tagline: string
  emoji: string
  hook: string
  price: number
  domain: 'time-keeper'
  subscriptionPeriod: 'month'
  isPopular?: boolean
  isBestSeller?: boolean
  isNew?: boolean
  rating?: number
  reviewCount?: number
  whatYouGet: string[]
  guidanceType: 'daily-guidance'
  guidanceText: string
  upsell?: { id: string; name: string; price: number }
}

export const timeKeeperTools: TimeKeeperTool[] = [
  {
    id: 'daily-personal-oracle',
    name: 'What Today Is Asking of You',
    tagline: 'Wake every morning knowing what the day is actually asking of you',
    emoji: '🌅',
    price: 19,
    domain: 'time-keeper',
    subscriptionPeriod: 'month',
    isPopular: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 4231,
    hook: 'Every day carries its own real shape. This reading tells you what today is asking, whether it is building or easing, and checks how it compares to yesterday.',
    whatYouGet: [
      'What kind of day this is, in plain, clear words',
      'Whether today\'s energy is still building, or already starting to ease',
      'One clear action that fits today',
      'One thing worth avoiding today specifically',
      'Which area of your life is most active today',
      'Whether today\'s pattern is similar to yesterday, or a genuine shift',
      'The specific part of the day this energy is likely strongest',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Every daily reading ends with one specific action and one specific caution, calibrated to today, not a generic prompt.',
    upsell: { id: 'monthly-cycle-navigator', name: 'Your Month, Mapped Before It Starts', price: 29 },
  },
  {
    id: 'monthly-cycle-navigator',
    name: 'Your Month, Mapped Before It Starts',
    tagline: 'The complete map of your month, delivered before it begins',
    emoji: '📆',
    price: 29,
    domain: 'time-keeper',
    subscriptionPeriod: 'month',
    isPopular: true,
    rating: 4.8,
    reviewCount: 2876,
    hook: 'Most people meet the month unprepared. This reading maps it before it starts, checks if it echoes last month, and shows your best window.',
    whatYouGet: [
      'The real theme running through this coming month',
      'Your best window this month for a big move or decision',
      'The stretch this month where rest, not effort, is the right move',
      'Which area of your life is most active this month',
      'Whether this month\'s pattern echoes last month, or marks a real change',
      'The specific relationship or work area this month is most likely to test',
      'What starting the month with intention would change, compared to drifting into it',
      'One clear focus for the month to get the most out of it',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: "A single practice repeated across the month, aligned with its theme and the area of life it activates.",
    upsell: { id: 'quarterly-destiny-pulse', name: 'Your Next Ninety Days, Mapped', price: 37 },
  },
  {
    id: 'quarterly-destiny-pulse',
    name: 'Your Next Ninety Days, Mapped',
    tagline: 'Ninety days mapped: the themes, windows, and pivots of the season ahead',
    emoji: '🌀',
    price: 37,
    domain: 'time-keeper',
    subscriptionPeriod: 'month',
    isPopular: true,
    rating: 4.8,
    reviewCount: 1654,
    hook: 'Ninety days is enough time for a real shift. This reading maps the season ahead, checks if it echoes the last one, and shows your biggest window.',
    whatYouGet: [
      'The real shape of the season ahead, month by month',
      'Your single biggest window in the next ninety days',
      'The deeper theme this season is actually working through',
      'Whether a major shift is moving toward you, or already settling into place',
      'An alert if a major life change falls within this season',
      'Whether this season resembles the one three months ago, or is genuinely new territory',
      'The specific area of life, work, love, or health, this season centers on most',
      'One clear focus for the whole season',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'A ninety-day practice, one discipline carried across the full season rather than a new task each week.',
    upsell: { id: 'annual-arc-keeper', name: 'Your Whole Year, Mapped Before It Starts', price: 47 },
  },
  {
    id: 'annual-arc-keeper',
    name: 'Your Whole Year, Mapped Before It Starts',
    tagline: 'The complete year, every peak, every valley, every pivot, mapped before January',
    emoji: '🗓️',
    price: 47,
    domain: 'time-keeper',
    subscriptionPeriod: 'month',
    isPopular: true,
    rating: 4.9,
    reviewCount: 1987,
    hook: 'Your whole year has a real shape before it even begins. This reading maps it, checks if it continues last year\'s theme, and names your biggest month.',
    whatYouGet: [
      'The real theme running through your whole year ahead',
      'All twelve months previewed, one after another',
      'Your three strongest windows this year, ranked in order',
      'The two stretches this year that call for real rest',
      'The single most important month, where a big decision lives',
      'Whether this year continues last year\'s theme, or marks a real turning point',
      'The specific relationship or commitment most likely to be tested this year',
      'One clear focus to carry through the year',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'A twelve-month practice framework, one focus per quarter, each calibrated to compound across the year.',
    upsell: { id: 'nine-year-arc-compass', name: 'The Next Nine Years of Your Life', price: 57 },
  },
  {
    id: 'nine-year-arc-compass',
    name: 'The Next Nine Years of Your Life',
    tagline: 'Nine years mapped, the arc understood, the preparation made',
    emoji: '🧭',
    price: 57,
    domain: 'time-keeper',
    subscriptionPeriod: 'month',
    isNew: true,
    rating: 4.9,
    reviewCount: 876,
    hook: 'Most people plan one year at a time, then get surprised by the decade. This reading maps your next nine years, checks how it echoes the last arc, so nothing catches you off guard.',
    whatYouGet: [
      'The full nine-year sequence, year by year',
      'Your single biggest window in the whole nine years, where everything lines up',
      'Your hardest year in the nine years, named honestly, with real guidance',
      'The long view of the whole arc, not just the next twelve months',
      'The one thing this whole nine-year arc is building toward',
      'How to recognize when this cycle is closing and the next one is beginning',
      'Whether this arc echoes the one before it, or is building something genuinely new',
      'The specific area of life, career, family, or purpose, this arc is most built around',
      'What starting to prepare now, rather than waiting, would change about how this arc unfolds',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: "A clear plan for what to do before your biggest window opens, sequenced by year.",
  },
]

export const getTimeKeeperToolById = (id: string) => timeKeeperTools.find(t => t.id === id)
export const getPopularTimeTools = () => timeKeeperTools.filter(t => t.isPopular)
export const getNewTimeTools = () => timeKeeperTools.filter(t => t.isNew)
