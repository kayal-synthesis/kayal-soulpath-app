// ============================================================
// KAYAL WELCOME ENGINE — Official Numerology Calculator
// Uses KAYAL official formulas exactly as specified
// Pure client-side. Zero API calls. Zero cost.
// ============================================================

export interface NumerologyProfile {
  lifePathNumber:       number
  destinyNumber:        number
  personalYear:         number
  monthlyVibration:     number
  weeklyVibration:      number
  dailyVibration:       number
  currentPinnacle:      number
  currentChallenge:     number
  birthdayGift:         number
  birthdayChallenge:    number
  allPinnacles:         { P1: number; P2: number; P3: number; P4: number }
  allChallenges:        { C1: number; C2: number; C3: number; C4: number }
  pinnacleNumber:       number  // which pinnacle (1-4)
  pinnacleStartAge:     number
  pinnacleEndAge:       number
  universalYear:        number
  age:                  number
  firstName:            string
  birthDay:             number
  birthMonth:           number
  birthYear:            number
}

const MASTER = [11, 22, 33]

// ── Official KAYAL reduce ─────────────────────────────────────
function reduce(n: number): number {
  if (MASTER.includes(n)) return n
  while (n > 9 && !MASTER.includes(n)) {
    n = n.toString().split('').reduce((s, d) => s + parseInt(d), 0)
  }
  return n
}

function digitSum(n: number): number {
  return n.toString().split('').map(Number).reduce((s, d) => s + d, 0)
}

// ── FORMULA 1: Life Path — sum ALL digits of full DOB ────────
function calcLifePath(day: number, month: number, year: number): number {
  const dob = `${String(day).padStart(2,'0')}${String(month).padStart(2,'0')}${year}`
  return reduce(dob.split('').map(Number).reduce((s, d) => s + d, 0))
}

// ── FORMULA 2: Universal Year ─────────────────────────────────
function calcUniversalYear(date: Date): number {
  return reduce(digitSum(date.getFullYear()))
}

// ── FORMULA 3: Personal Year = BirthDay + BirthMonth + UY ────
function calcPersonalYear(day: number, month: number, date: Date): number {
  const uy = calcUniversalYear(date)
  return reduce(day + month + uy)
}

// ── FORMULA 4: Monthly = PYV + CurrentMonth(reduced) ─────────
function calcMonthlyVibration(pyv: number, date: Date): number {
  const m  = date.getMonth() + 1
  const ms = m.toString().split('').map(Number).reduce((s, d) => s + d, 0)
  return reduce(pyv + ms)
}

// ── FORMULA 5: Weekly = PYV + Month + WeekOfMonth ────────────
function calcWeeklyVibration(pyv: number, date: Date): number {
  const m   = date.getMonth() + 1
  const ms  = m.toString().split('').map(Number).reduce((s, d) => s + d, 0)
  const fd  = new Date(date.getFullYear(), date.getMonth(), 1)
  const wom = Math.ceil((date.getDate() + fd.getDay()) / 7)
  return reduce(pyv + ms + wom)
}

// ── FORMULA 6: Daily = PYV + Month + WeekOfMonth + DayOfWeek ─
function calcDailyVibration(day: number, month: number, date: Date): number {
  const pyv = calcPersonalYear(day, month, date)
  const m   = date.getMonth() + 1
  const ms  = m.toString().split('').map(Number).reduce((s, d) => s + d, 0)
  const fd  = new Date(date.getFullYear(), date.getMonth(), 1)
  const wom = Math.ceil((date.getDate() + fd.getDay()) / 7)
  let dow   = date.getDay()
  if (dow === 0) dow = 7
  return reduce(pyv + ms + wom + dow)
}

// ── Pinnacles ─────────────────────────────────────────────────
function calcPinnacles(day: number, month: number, year: number) {
  const M = reduce(month)
  const D = reduce(day)
  const Y = reduce(digitSum(year))
  return {
    P1: reduce(M + D),
    P2: reduce(D + Y),
    P3: reduce(reduce(M + D) + reduce(D + Y)),
    P4: reduce(M + Y),
  }
}

// ── Pinnacle Timing ───────────────────────────────────────────
function calcPinnacleTiming(lp: number, age: number) {
  const end1 = 36 - lp
  if (age <= end1)       return { p: 1, start: 0,        end: end1       }
  if (age <= end1 + 9)   return { p: 2, start: end1,     end: end1 + 9   }
  if (age <= end1 + 18)  return { p: 3, start: end1 + 9, end: end1 + 18  }
  return                        { p: 4, start: end1 + 18, end: 999        }
}

// ── Challenges ────────────────────────────────────────────────
function calcChallenges(day: number, month: number, year: number) {
  const M  = reduce(month)
  const D  = reduce(day)
  const Y  = reduce(digitSum(year))
  const ri = (n: number) => n > 9 ? reduce(n) : n
  const C1 = ri(Math.abs(D - M))
  const C2 = ri(Math.abs(D - Y))
  const C3 = ri(Math.abs(C1 - C2))
  const C4 = ri(Math.abs(M - Y))
  return { C1, C2, C3, C4 }
}

// ── Birthday System ───────────────────────────────────────────
function calcBirthdaySystem(day: number) {
  let challenge: number
  if (day <= 9)           challenge = day
  else if (MASTER.includes(day)) challenge = 0
  else {
    const d = day.toString().split('').map(Number)
    challenge = Math.abs(d[0] - d[1])
  }
  const gift = Math.abs(challenge - 9)
  return { challenge: reduce(challenge), gift: reduce(gift) }
}

// ── Destiny Number ────────────────────────────────────────────
function calcDestiny(name: string): number {
  const map: Record<string, number> = {
    a:1,j:1,s:1, b:2,k:2,t:2, c:3,l:3,u:3, d:4,m:4,v:4,
    e:5,n:5,w:5, f:6,o:6,x:6, g:7,p:7,y:7, h:8,q:8,z:8, i:9,r:9,
  }
  return reduce(
    name.toLowerCase().replace(/[^a-z]/g, '').split('')
      .reduce((s, c) => s + (map[c] || 0), 0)
  )
}

// ── Age ───────────────────────────────────────────────────────
function calcAge(day: number, month: number, year: number): number {
  const today = new Date()
  const birth = new Date(year, month - 1, day)
  const diff  = today.getTime() - birth.getTime()
  return Math.abs(new Date(diff).getUTCFullYear() - 1970)
}

// ── Main export ───────────────────────────────────────────────
export function buildNumerologyProfile(name: string, dob: string): NumerologyProfile {
  // dob format: YYYY-MM-DD
  const [yearStr, monthStr, dayStr] = dob.split('-')
  const year  = parseInt(yearStr)
  const month = parseInt(monthStr)
  const day   = parseInt(dayStr)

  const today    = new Date()
  const lp       = calcLifePath(day, month, year)
  const uy       = calcUniversalYear(today)
  const pyv      = calcPersonalYear(day, month, today)
  const mv       = calcMonthlyVibration(pyv, today)
  const wv       = calcWeeklyVibration(pyv, today)
  const dv       = calcDailyVibration(day, month, today)
  const pins     = calcPinnacles(day, month, year)
  const age      = calcAge(day, month, year)
  const timing   = calcPinnacleTiming(lp, age)
  const challs   = calcChallenges(day, month, year)
  const bday     = calcBirthdaySystem(day)
  const destiny  = calcDestiny(name)

  const currentPinnacle  = pins[`P${timing.p}` as keyof typeof pins]
  const currentChallenge = challs[`C${timing.p}` as keyof typeof challs]

  return {
    lifePathNumber:    lp,
    destinyNumber:     destiny,
    personalYear:      pyv,
    monthlyVibration:  mv,
    weeklyVibration:   wv,
    dailyVibration:    dv,
    currentPinnacle,
    currentChallenge,
    birthdayGift:      bday.gift,
    birthdayChallenge: bday.challenge,
    allPinnacles:      pins,
    allChallenges:     challs,
    pinnacleNumber:    timing.p,
    pinnacleStartAge:  timing.start,
    pinnacleEndAge:    timing.end,
    universalYear:     uy,
    age,
    firstName:         name.trim().split(' ')[0],
    birthDay:          day,
    birthMonth:        month,
    birthYear:         year,
  }
}