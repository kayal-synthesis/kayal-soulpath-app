// ============================================================
// ETERNAL CLOCK — 5 Forecast Subscription Tools
// Domain: Timekeeper's Vault
// Route: /domain/eternal-clock
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
    name: 'The Daily Personal Oracle',
    tagline: 'Wake every morning knowing what the day is asking of you',
    emoji: '🌅',
    price: 19,
    domain: 'time-keeper',
    subscriptionPeriod: 'month',
    isPopular: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 4231,
    hook: 'Most people walk into the day without knowing what the day actually is. Every day carries a specific energy — a Personal Day number that shapes what it supports and what it resists, layered with the current Moon phase and your ruling planet\'s position. This oracle reads all three each morning and tells you plainly what the day is asking of you.',
    whatYouGet: [
      'Daily Personal Day number and its energy quality — what type of day it is',
      'Moon phase influence — how the lunar cycle amplifies or complicates the Personal Day',
      'Ruling planet position — what your personal planet is doing today',
      'Domain emphasis — which life area is highlighted today',
      'One specific action for the day — the move most aligned with the combined energy',
      'One thing to avoid — the common misstep for this particular day type',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Every daily oracle ends with one specific action and one specific caution — both calibrated to your Personal Day number, Moon phase, and current planetary position. Not generic. Yours.',
    upsell: { id: 'monthly-cycle-navigator', name: 'Monthly Cycle Navigator', price: 29 },
  },
  {
    id: 'monthly-cycle-navigator',
    name: 'The Monthly Cycle Navigator',
    tagline: 'The complete map of your month — delivered before it begins',
    emoji: '📆',
    price: 29,
    domain: 'time-keeper',
    subscriptionPeriod: 'month',
    isPopular: true,
    rating: 4.8,
    reviewCount: 2876,
    hook: 'Most people meet the month as it arrives — reactive, unprepared for what it carries. On the first of each month, this forecast maps the next 30 days before they begin. Personal Month energy, New and Full Moon impacts on your chart positions, peak windows, challenge dates, and the single theme the month is here to work on — all synthesised into a navigable map you can actually use.',
    whatYouGet: [
      'Personal Month number and governing energy for the 30 days',
      'New Moon and Full Moon assessment — which of your chart positions they activate',
      'Peak opportunity windows — specific dates where multiple systems converge positively',
      'Challenge dates — specific days requiring extra care or intentional rest',
      'Domain of emphasis — which life area is most activated this month',
      'Monthly theme and lesson — what this specific month is here to teach',
      'One monthly intention to carry — the specific focus that harvests this month most completely',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Each monthly forecast includes a 30-day practice — one daily action repeated across the month, aligned with the Personal Month energy and activating the domain of emphasis.',
    upsell: { id: 'quarterly-destiny-pulse', name: 'Quarterly Destiny Pulse', price: 37 },
  },
  {
    id: 'quarterly-destiny-pulse',
    name: 'The Quarterly Destiny Pulse',
    tagline: 'Ninety days mapped — the themes, windows, and pivots of the season ahead',
    emoji: '🌀',
    price: 37,
    domain: 'time-keeper',
    subscriptionPeriod: 'month',
    isPopular: true,
    rating: 4.8,
    reviewCount: 1654,
    hook: 'Every three months, a complete seasonal forecast maps the next 90 days across all timing systems. Personal Months for the quarter, Saturn and Jupiter movements through your chart positions, the karmic themes active in this season, and the single most important window not to miss.',
    whatYouGet: [
      'Three-month Personal Month sequence — governing energy of each month in the quarter',
      'Saturn and Jupiter quarterly movements — long-range activations in your key chart positions',
      'Most significant window of the quarter — exact dates and what it most supports',
      'Karmic theme of the season — what this 90-day period is assigned to work on',
      'Quarter-end position — where the chart says you will be if you navigate well',
      'One seasonal practice — the 90-day discipline most aligned with the quarter\'s energy',
      'Transition alert — full navigation guidance if a Personal Year or Pinnacle shift falls within the quarter',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'Each quarterly pulse includes a 90-day practice — a specific seasonal discipline calibrated to the karmic theme and domain of emphasis for those three months.',
    upsell: { id: 'annual-arc-keeper', name: 'Annual Arc Keeper', price: 47 },
  },
  {
    id: 'annual-arc-keeper',
    name: 'The Annual Arc Keeper',
    tagline: 'The complete year — every peak, every valley, every pivot — mapped before January',
    emoji: '🗓️',
    price: 47,
    domain: 'time-keeper',
    subscriptionPeriod: 'month',
    isPopular: true,
    rating: 4.9,
    reviewCount: 1987,
    hook: 'Your complete year forecast, delivered in December for the year ahead. Personal Year energy, all 12 Personal Months mapped, Solar Return read, key Jupiter and Saturn movements identified, Pinnacle phase assessed, and the single most important month you cannot afford to miss.',
    whatYouGet: [
      'Personal Year number and governing theme of the entire year',
      'All 12 Personal Months previewed — month-by-month energy sequence',
      'Solar Return assessment — the birthday chart and what the new solar year opens',
      'Jupiter and Saturn movements — major planetary activations in your chart positions',
      'Three peak windows — months of highest opportunity in rank order',
      'Two caution periods — months requiring rest, consolidation, or extra care',
      'Most important month — where the critical decision lives',
      'Annual theme and lesson — the single soul curriculum of the year',
      'Year-end position forecast — where a well-navigated year leaves you',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'The annual arc includes a 12-month practice framework — a specific practice for each quarter, each calibrated to the Personal Month energy and designed to compound across the year.',
    upsell: { id: 'nine-year-arc-compass', name: 'Nine-Year Arc Compass', price: 57 },
  },
  {
    id: 'nine-year-arc-compass',
    name: 'The Nine-Year Arc Compass',
    tagline: 'The long view — nine years mapped, the arc understood, the preparation made',
    emoji: '🧭',
    price: 57,
    domain: 'time-keeper',
    subscriptionPeriod: 'month',
    isNew: true,
    rating: 4.9,
    reviewCount: 876,
    hook: 'Most people navigate their life one year at a time — which means they are always surprised by the decade. Your nine-year cycle is a complete arc with a beginning, a middle, and an end. This compass maps the entire arc before it unfolds — every Personal Year, every Pinnacle transition, every long-range planetary movement — so nothing that is coming catches you unprepared.',
    whatYouGet: [
      'Complete nine-year Personal Year sequence — energy and theme of each year',
      'Pinnacle phase map — which Pinnacles are active, when they transition, what each demands',
      'Decade\'s highest opportunity window — the specific year where multiple timing systems converge',
      'Decade\'s hardest year — identified honestly with full navigation guidance',
      'Long-range Saturn cycle — where Saturn activates key themes in your chart across this decade',
      'Long-range Jupiter cycle — years of Jupiter return and expansion across the arc',
      'Soul curriculum of the decade — what the nine-year arc is assigned to complete as a whole',
      'Decade intention framework — three-phase strategy for navigating the arc consciously',
    ],
    guidanceType: 'daily-guidance',
    guidanceText: 'The nine-year compass includes a decade preparation guide — the three most important actions before the decade\'s peak window opens, sequenced by year.',
    upsell: { id: 'annual-destiny-forecast', name: 'Annual Destiny Forecast', price: 77 },
  },
]

export const getTimeKeeperToolById = (id: string) => timeKeeperTools.find(t => t.id === id)
export const getPopularTimeTools   = ()           => timeKeeperTools.filter(t => t.isPopular)
export const getNewTimeTools       = ()           => timeKeeperTools.filter(t => t.isNew)
