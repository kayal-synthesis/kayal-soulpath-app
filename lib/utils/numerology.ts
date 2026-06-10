// ============================================================
// lib/utils/numerology.ts
// KAYAL SoulPath — Official Numerology Engine
//
// All formulas match the official OfficialKayalCalculator spec.
// Additional: Karmic Debt detection, Destiny number,
//             complete NumerologySnapshot for dashboard.
//
// DOB format accepted:  DD/MM/YYYY  (primary)
//                       YYYY-MM-DD  (ISO fallback)
//                       DD-MM-YYYY  (dash fallback)
// ============================================================

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
export const MASTER_NUMBERS  = [11, 22, 33]
export const KARMIC_NUMBERS  = [13, 14, 16, 19]

// ─────────────────────────────────────────────────────────────
// Core reduction
// ─────────────────────────────────────────────────────────────

/** Reduce n to a single digit, preserving master numbers 11/22/33 */
export function reduce(n: number): number {
  if (MASTER_NUMBERS.includes(n)) return n
  let result = n
  while (result > 9 && !MASTER_NUMBERS.includes(result)) {
    result = String(result)
      .split('')
      .reduce((sum, d) => sum + Number(d), 0)
  }
  return result
}

/** Sum all digits of n without reduction */
function digitSum(n: number): number {
  return String(n).split('').reduce((s, d) => s + Number(d), 0)
}

/** Check if a raw pre-reduction number is a karmic debt number */
function isKarmic(n: number): boolean {
  return KARMIC_NUMBERS.includes(n)
}

// ─────────────────────────────────────────────────────────────
// DOB parsing — returns { day, month, year } or null
// ─────────────────────────────────────────────────────────────
export function parseDOB(
  dob: string
): { day: number; month: number; year: number } | null {
  if (!dob) return null

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = dob.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) return { day: +dmy[1], month: +dmy[2], year: +dmy[3] }

  // YYYY-MM-DD (ISO)
  const iso = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return { day: +iso[3], month: +iso[2], year: +iso[1] }

  return null
}

// ─────────────────────────────────────────────────────────────
// FORMULA 1 — Life Path
// Spec: add ALL digits of full DOB at once, then reduce
// ─────────────────────────────────────────────────────────────
export function getLifePath(dob: string): {
  value:         number
  rawSum:        number
  isKarmic:      boolean
  karmicNumber?: number
} {
  const p = parseDOB(dob)
  if (!p) return { value: 1, rawSum: 1, isKarmic: false }

  // Official: concatenate all digits as-is then sum
  const digits = `${String(p.day).padStart(2,'0')}${String(p.month).padStart(2,'0')}${p.year}`
    .split('')
    .map(Number)
  const rawSum = digits.reduce((s, d) => s + d, 0)
  const value  = reduce(rawSum)

  return {
    value,
    rawSum,
    isKarmic:      isKarmic(rawSum),
    karmicNumber:  isKarmic(rawSum) ? rawSum : undefined,
  }
}

// ─────────────────────────────────────────────────────────────
// FORMULA 3 — Universal Year Vibration
// Spec: reduce current year's digits
// ─────────────────────────────────────────────────────────────
export function getUniversalYear(today = new Date()): number {
  return reduce(digitSum(today.getFullYear()))
}

// ─────────────────────────────────────────────────────────────
// FORMULA 2 — Personal Year Vibration (PYV)
// Spec: Birth Day + Birth Month + Universal Year  →  reduce
// ─────────────────────────────────────────────────────────────
export function getPersonalYear(dob: string, today = new Date()): number {
  const p = parseDOB(dob)
  if (!p) return 1
  const uY  = getUniversalYear(today)
  return reduce(p.day + p.month + uY)
}

// ─────────────────────────────────────────────────────────────
// FORMULA 4 — Monthly Vibration
// Spec: PYV + reduced(current calendar month)  →  reduce
// ─────────────────────────────────────────────────────────────
export function getMonthlyVibration(dob: string, today = new Date()): number {
  const pyv        = getPersonalYear(dob, today)
  const monthNum   = today.getMonth() + 1
  const monthSum   = reduce(digitSum(monthNum))
  return reduce(pyv + monthSum)
}

// ─────────────────────────────────────────────────────────────
// FORMULA 5 — Weekly Vibration
// Spec: PYV + reduced(month) + week-of-month  →  reduce
// ─────────────────────────────────────────────────────────────
export function getWeeklyVibration(dob: string, today = new Date()): number {
  const pyv      = getPersonalYear(dob, today)
  const monthNum = today.getMonth() + 1
  const monthSum = reduce(digitSum(monthNum))

  // Week of month: same method as official spec
  const firstDay         = new Date(today.getFullYear(), today.getMonth(), 1)
  const pastDaysOfMonth  = today.getDate() + firstDay.getDay()
  const weekOfMonth      = Math.ceil(pastDaysOfMonth / 7)

  return reduce(pyv + monthSum + weekOfMonth)
}

// ─────────────────────────────────────────────────────────────
// FORMULA 6 — Daily Vibration (official KAYAL formula)
// Spec: PYV + reduced(month) + week-of-month + day-of-week  →  reduce
//       Day of week: Mon=1 … Sat=6, Sun=7
// ─────────────────────────────────────────────────────────────
export function getDailyVibration(dob: string, today = new Date()): number {
  const pyv      = getPersonalYear(dob, today)
  const monthNum = today.getMonth() + 1
  const monthSum = reduce(digitSum(monthNum))

  const firstDay        = new Date(today.getFullYear(), today.getMonth(), 1)
  const pastDaysOfMonth = today.getDate() + firstDay.getDay()
  const weekOfMonth     = Math.ceil(pastDaysOfMonth / 7)

  const dayOfWeek = today.getDay() + 1 // Sun=0+1=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6, Sat=7

  return reduce(pyv + monthSum + weekOfMonth + dayOfWeek)
}

// ─────────────────────────────────────────────────────────────
// PINNACLES
// P1 = reduce(M + D)
// P2 = reduce(D + Y)
// P3 = reduce(P1 + P2)
// P4 = reduce(M + Y)
// where M, D, Y are each individually reduced first
// ─────────────────────────────────────────────────────────────
export interface Pinnacles {
  P1: number; P2: number; P3: number; P4: number
}

export function getPinnacles(dob: string): Pinnacles {
  const p = parseDOB(dob)
  if (!p) return { P1: 1, P2: 1, P3: 2, P4: 1 }

  const M  = reduce(p.month)
  const D  = reduce(p.day)
  const Y  = reduce(digitSum(p.year))

  const P1 = reduce(M + D)
  const P2 = reduce(D + Y)
  const P3 = reduce(P1 + P2)
  const P4 = reduce(M + Y)

  return { P1, P2, P3, P4 }
}

// ─────────────────────────────────────────────────────────────
// PINNACLE TIMING
// End of 1st Pinnacle = 36 - LifePath
// Each subsequent Pinnacle lasts 9 years
// ─────────────────────────────────────────────────────────────
export interface PinnacleTiming {
  currentPinnacle: 1 | 2 | 3 | 4
  ageAtStart:      number
  ageAtEnd:        number | null  // null = rest of life (P4)
  endFirst:        number
}

export function getPinnacleTiming(
  lifePathValue: number,
  currentAge:    number
): PinnacleTiming {
  const endFirst = 36 - lifePathValue

  if (currentAge <= endFirst) {
    return { currentPinnacle: 1, ageAtStart: 0, ageAtEnd: endFirst, endFirst }
  } else if (currentAge <= endFirst + 9) {
    return { currentPinnacle: 2, ageAtStart: endFirst, ageAtEnd: endFirst + 9, endFirst }
  } else if (currentAge <= endFirst + 18) {
    return { currentPinnacle: 3, ageAtStart: endFirst + 9, ageAtEnd: endFirst + 18, endFirst }
  } else {
    return { currentPinnacle: 4, ageAtStart: endFirst + 18, ageAtEnd: null, endFirst }
  }
}

// ─────────────────────────────────────────────────────────────
// PINNACLE CHALLENGES
// C1 = |D - M|
// C2 = |D - Y|
// C3 = |C1 - C2|
// C4 = |M - Y|
// Reduce only if > 9
// ─────────────────────────────────────────────────────────────
export interface PinnacleChallenges {
  C1: number; C2: number; C3: number; C4: number
}

export function getPinnacleChallenges(dob: string): PinnacleChallenges {
  const p = parseDOB(dob)
  if (!p) return { C1: 0, C2: 0, C3: 0, C4: 0 }

  const M = reduce(p.month)
  const D = reduce(p.day)
  const Y = reduce(digitSum(p.year))

  const reduceIfNeeded = (n: number) => n > 9 ? reduce(n) : n

  const C1 = reduceIfNeeded(Math.abs(D - M))
  const C2 = reduceIfNeeded(Math.abs(D - Y))
  const C3 = reduceIfNeeded(Math.abs(C1 - C2))
  const C4 = reduceIfNeeded(Math.abs(M - Y))

  return { C1, C2, C3, C4 }
}

// ─────────────────────────────────────────────────────────────
// BIRTHDAY SYSTEM
// Challenge: if day ≤ 9 → day itself
//            if master number → 0
//            else → |digit1 - digit2|
// Gift: |Challenge - 9|
// ─────────────────────────────────────────────────────────────
export interface BirthdaySystem {
  day:       number
  gift:      number
  challenge: number
}

export function getBirthdaySystem(birthDay: number): BirthdaySystem {
  let challenge: number

  // Official order: <=9 first, then check master inside else block
  if (birthDay <= 9) {
    challenge = birthDay
  } else {
    const digits = String(birthDay).split('').map(Number)
    if (MASTER_NUMBERS.includes(birthDay)) {
      challenge = 0                                      // 11/22/33 → no challenge
    } else {
      challenge = Math.abs(digits[0] - digits[1])
    }
  }

  const gift = Math.abs(challenge - 9)

  return {
    day:       birthDay,
    challenge: reduce(challenge),
    gift:      reduce(gift),
  }
}

// ─────────────────────────────────────────────────────────────
// KARMIC DEBT DETECTION
// Check Life Path raw sum AND individual DOB components
// Also checks Destiny if name provided
// Karmic numbers: 13 (laziness/abuse of knowledge),
//                 14 (misuse of freedom),
//                 16 (destruction of ego/love misuse),
//                 19 (abuse of power / self-reliance lesson)
// ─────────────────────────────────────────────────────────────
export interface KarmicDebt {
  number:      13 | 14 | 16 | 19
  position:    string        // where it appears
  lesson:      string
  pattern:     string        // how it typically manifests
}

const KARMIC_MEANINGS: Record<number, { lesson: string; pattern: string }> = {
  13: {
    lesson:  'Discipline and creative responsibility',
    pattern: 'Procrastination, unfinished projects, resistance to hard work that eventually demands payback',
  },
  14: {
    lesson:  'Responsible use of freedom',
    pattern: 'Addiction, overindulgence, recklessness, or conversely — fear of change and over-restriction',
  },
  16: {
    lesson:  'Ego dissolution and authentic love',
    pattern: 'Repeated loss in love or status until the ego submits; spiritual crises that feel like destruction',
  },
  19: {
    lesson:  'Healthy independence and receiving help',
    pattern: 'Isolation, self-sabotage of support, stubborn refusal of help — learning that strength includes vulnerability',
  },
}

export function getKarmicDebts(dob: string): KarmicDebt[] {
  const p = parseDOB(dob)
  if (!p) return []

  const debts: KarmicDebt[] = []
  const seen  = new Set<number>()

  const addDebt = (raw: number, position: string) => {
    if (KARMIC_NUMBERS.includes(raw) && !seen.has(raw)) {
      seen.add(raw)
      debts.push({
        number:   raw as 13 | 14 | 16 | 19,
        position,
        ...KARMIC_MEANINGS[raw],
      })
    }
  }

  // Check Life Path raw sum
  const digits   = `${String(p.day).padStart(2,'0')}${String(p.month).padStart(2,'0')}${p.year}`
    .split('').map(Number)
  const lpRaw    = digits.reduce((s, d) => s + d, 0)
  addDebt(lpRaw, 'Life Path')

  // Check birth day raw
  addDebt(p.day, 'Birth Day')

  // Check birth month (rare but possible)
  addDebt(p.month, 'Birth Month')

  // Check reduced year digits sum before final reduction
  const yearSum = digitSum(p.year)  // e.g. 1985 → 23
  addDebt(yearSum, 'Birth Year')

  return debts
}

// ─────────────────────────────────────────────────────────────
// DESTINY NUMBER (from full birth name)
// Pythagorean mapping — same as official calculator
// ─────────────────────────────────────────────────────────────
const LETTER_MAP: Record<string, number> = {
  a:1, j:1, s:1, b:2, k:2, t:2, c:3, l:3, u:3, d:4, m:4, v:4,
  e:5, n:5, w:5, f:6, o:6, x:6, g:7, p:7, y:7, h:8, q:8, z:8, i:9, r:9,
}

export function getDestinyNumber(fullName: string): {
  value:    number
  rawSum:   number
  isKarmic: boolean
} {
  if (!fullName) return { value: 1, rawSum: 1, isKarmic: false }
  const name   = fullName.toLowerCase().replace(/[^a-z]/g, '')
  const rawSum = name.split('').reduce((s, c) => s + (LETTER_MAP[c] ?? 0), 0)
  return { value: reduce(rawSum), rawSum, isKarmic: isKarmic(rawSum) }
}

// ─────────────────────────────────────────────────────────────
// CURRENT AGE
// ─────────────────────────────────────────────────────────────
export function getCurrentAge(dob: string, today = new Date()): number {
  const p = parseDOB(dob)
  if (!p) return 0
  const birth   = new Date(p.year, p.month - 1, p.day)
  const ageDiff = today.getTime() - birth.getTime()
  return Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25))
}

// ─────────────────────────────────────────────────────────────
// VIBRATION INTERPRETATIONS
// ─────────────────────────────────────────────────────────────
export interface VibrationMeaning {
  name:        string
  description: string
  embrace:     string
  avoid:       string
  guidance:    string
}

const VIBRATION_MEANINGS: Record<number, VibrationMeaning> = {
  1: {
    name:        'The Initiator',
    description: 'New beginnings, independence, leadership. A day for starting, asserting, and initiating.',
    embrace:     'Starting new projects, bold decisions, solo action, taking initiative',
    avoid:       'Hesitation, waiting for consensus, beginning too many things at once',
    guidance:    'Send the message you have been drafting. Begin the project. The window for initiation is today.',
  },
  2: {
    name:        'The Harmoniser',
    description: 'Cooperation, diplomacy, partnership. The answer will come through another person.',
    embrace:     'Listening, collaboration, gentle negotiation, patience',
    avoid:       'Forcing outcomes, confrontation, impulsive commitments',
    guidance:    'Receive more than you transmit. The right conversation is closer than you think.',
  },
  3: {
    name:        'The Alchemist',
    description: 'Creativity, expression, joy. Today rewards saying the unconventional thing.',
    embrace:     'Creative expression, social connection, inspired work, communication',
    avoid:       'Isolation, suppressing ideas, taking yourself too seriously',
    guidance:    'Make the thing in your head real. Say the unconventional thing. Today rewards expression.',
  },
  4: {
    name:        'The Architect',
    description: 'Stability, structure, diligent effort. The unglamorous task has compound interest.',
    embrace:     'Disciplined effort, building foundations, attending to details, long-view planning',
    avoid:       'Shortcuts, cutting corners, resisting all structure',
    guidance:    'The unglamorous task you have been postponing pays compound interest. Do it today.',
  },
  5: {
    name:        'The Seeker',
    description: 'Freedom, change, adaptability. The deviation is the point, not the detour.',
    embrace:     'Adaptability, curiosity, breaking old routines, embracing the unexpected',
    avoid:       'Rigidity, over-commitment, clinging to the familiar',
    guidance:    'Say yes to the unexpected invitation. The deviation is the point today.',
  },
  6: {
    name:        'The Keeper',
    description: 'Responsibility, nurturing, home. Small gestures land deeply today.',
    embrace:     'Nurturing relationships, beauty, acts of service, family',
    avoid:       'Neglecting your own needs to fix others, perfectionism',
    guidance:    'Tend to the relationship that has been quietly asking for attention.',
  },
  7: {
    name:        'The Oracle',
    description: 'Introspection, analysis, spirituality. The insight will not come from more research.',
    embrace:     'Solitude, deep study, trusting inner knowing, meditation',
    avoid:       'Small talk, surface decisions, overcrowding your schedule',
    guidance:    'Sit quietly for 15 minutes. The insight you need will not come from more input.',
  },
  8: {
    name:        'The Sovereign',
    description: 'Power, abundance, manifestation. Your authority is most legible today.',
    embrace:     'Executive decisions, owning authority, financial moves, confidence',
    avoid:       'Giving your power away, deferring what you know is right',
    guidance:    'Make the call you have been delegating to circumstance. Your authority is most legible today.',
  },
  9: {
    name:        'The Sage',
    description: 'Completion, compassion, release. New cycles follow clean endings.',
    embrace:     'Completion, generosity, releasing what no longer fits, forgiveness',
    avoid:       'Clinging, starting major new things, forcing fresh beginnings',
    guidance:    'Something is ready to be finished and released. Do that. New cycles follow clean endings.',
  },
  11: {
    name:        'The Visionary',
    description: 'Spiritual awakening, inspiration, intuition at its most acute.',
    embrace:     'Trusting intuition, inspired messages, spiritual practice, mindfulness',
    avoid:       'Ignoring intuitive warnings, overwhelming yourself, neglecting practical grounding',
    guidance:    'What arrives quietly today carries more weight than what arrives loudly.',
  },
  22: {
    name:        'The Master Builder',
    description: 'Grand visions meet practical manifestation. Large-scale work is supported.',
    embrace:     'Long-range planning, collaborative building, manifesting big vision practically',
    avoid:       'Thinking too small, losing yourself in details, working alone on big projects',
    guidance:    'The bridge between the ideal and the real is available today. Cross it.',
  },
  33: {
    name:        'The Master Teacher',
    description: 'Universal service, compassion, healing. A rare and elevated day.',
    embrace:     'Selfless service, healing, teaching with compassion, being a spiritual example',
    avoid:       'Burning out, neglecting personal needs, expecting perfection of yourself or others',
    guidance:    'The highest service today is presence. Be fully here with whoever needs you.',
  },
}

export function getVibrationMeaning(v: number): VibrationMeaning {
  return VIBRATION_MEANINGS[v] ?? VIBRATION_MEANINGS[reduce(v)]
}

// ─────────────────────────────────────────────────────────────
// COMPLETE SNAPSHOT — the single call for all dashboard needs
// ─────────────────────────────────────────────────────────────
export interface NumerologySnapshot {
  // Core
  lifePathValue:      number
  lifePathRaw:        number
  lifePathKarmic:     boolean

  // Timing
  universalYear:      number
  personalYear:       number
  monthlyVibration:   number
  weeklyVibration:    number
  dailyVibration:     number

  // Interpretation
  vibrationMeaning:   VibrationMeaning

  // Birthday system
  birthday:           BirthdaySystem

  // Pinnacles
  pinnacles:          Pinnacles
  pinnacleTiming:     PinnacleTiming
  pinnacleNumbers:    { current: number; challenge: number }
  pinnaclesChallenges: PinnacleChallenges

  // Karmic debts
  karmicDebts:        KarmicDebt[]
  hasKarmicDebt:      boolean

  // Optional (requires name)
  destiny?:           { value: number; rawSum: number; isKarmic: boolean }

  // Meta
  currentAge:         number
}

export function getNumerologySnapshot(
  dob:      string,
  today     = new Date(),
  fullName? : string
): NumerologySnapshot {
  const p          = parseDOB(dob)
  const birthDay   = p?.day ?? 1
  const currentAge = getCurrentAge(dob, today)
  const lp         = getLifePath(dob)
  const pyv        = getPersonalYear(dob, today)
  const monthly    = getMonthlyVibration(dob, today)
  const weekly     = getWeeklyVibration(dob, today)
  const daily      = getDailyVibration(dob, today)
  const pinn       = getPinnacles(dob)
  const timing     = getPinnacleTiming(lp.value, currentAge)
  const challenges = getPinnacleChallenges(dob)
  const birthday   = getBirthdaySystem(birthDay)
  const karmic     = getKarmicDebts(dob)
  const uYear      = getUniversalYear(today)

  // Current pinnacle details
  const currentPinnacleNum       = pinn[`P${timing.currentPinnacle}` as keyof Pinnacles]
  const currentPinnacleChallenge = challenges[`C${timing.currentPinnacle}` as keyof PinnacleChallenges]

  const snapshot: NumerologySnapshot = {
    lifePathValue:      lp.value,
    lifePathRaw:        lp.rawSum,
    lifePathKarmic:     lp.isKarmic,

    universalYear:      uYear,
    personalYear:       pyv,
    monthlyVibration:   monthly,
    weeklyVibration:    weekly,
    dailyVibration:     daily,

    vibrationMeaning:   getVibrationMeaning(daily),

    birthday,

    pinnacles:          pinn,
    pinnacleTiming:     timing,
    pinnacleNumbers:    { current: currentPinnacleNum, challenge: currentPinnacleChallenge },
    pinnaclesChallenges: challenges,

    karmicDebts:        karmic,
    hasKarmicDebt:      karmic.length > 0,

    currentAge,
  }

  if (fullName) {
    snapshot.destiny = getDestinyNumber(fullName)
  }

  return snapshot
}

// ─────────────────────────────────────────────────────────────
// QUICK HELPERS (for components that only need one value)
// ─────────────────────────────────────────────────────────────
export const getPersonalMonth = getMonthlyVibration
export const getPersonalWeek  = getWeeklyVibration
export const getPersonalDay   = getDailyVibration