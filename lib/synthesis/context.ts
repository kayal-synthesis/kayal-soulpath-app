/**
 * lib/synthesis/context.ts
 * ========================
 * Single source of truth for loading and injecting
 * user synthesis context into voice and chat sessions.
 *
 * Key rules:
 *  - Never inject face/palm data that wasn't actually collected
 *  - Always inject: full name, DOB numerics, sun sign, timing cycles
 *  - Conditionally inject: face archetype, palm element (only if present)
 *  - Always inject: full reading narration + domain sections
 *  - Domain section for the active tool goes first in context
 *  - Timing themes spelled out, not just numbers
 *  - Astrology filtered to domain-relevant planets only
 *  - Synthesis block always sits at history[0], never trimmed
 *
 * v1.1, real bug fix, the fallback below still pointed at localhost,
 * the same real bug already found and fixed in lib/api.ts and
 * ChatSession.tsx, now that .env.local correctly sets
 * NEXT_PUBLIC_API_URL, this fallback should never actually trigger in
 * production, fixed anyway to match the same safe pattern used
 * consistently everywhere else, in case that variable is ever missing
 * during a future build. Every real API call in this file was checked
 * directly against main.py's actual, current route list, both
 * /api/subscription/tier and /api/reading/job/latest are already
 * exact matches, nothing else needed changing.
 */

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────
const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.kayalsoulpath.com'
).replace(/\/$/, '')

// ─────────────────────────────────────────────────────────────
// Domain → relevant astrology planets
// ─────────────────────────────────────────────────────────────
const DOMAIN_PLANETS: Record<string, string[]> = {
  love:      ['Venus', 'Moon', 'Mars', 'Jupiter'],
  wealth:    ['Jupiter', 'Saturn', 'Sun', 'Mars'],
  wellness:  ['Moon', 'Neptune', 'Chiron'],
  spiritual: ['Neptune', 'Pluto', 'Uranus', 'South_Node', 'North_Node'],
  purpose:   ['Sun', 'Jupiter', 'Saturn', 'North_Node'],
  timing:    ['Sun', 'Moon', 'Saturn'],
  grief:     ['Moon', 'Neptune', 'Chiron', 'Pluto'],
  health:    ['Moon', 'Saturn', 'Mars'],
  all:       [], // include everything
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface AstroplanetReading {
  sign?:     string
  house?:    number
  reading:   string
  domain:    string
  retrograde?: boolean
}

export interface SynthesisContext {
  // Identity
  full_name:         string
  first_name:        string
  date_of_birth:     string | null   // YYYY-MM-DD
  birth_location:    string | null   // city/country if available
  birth_time_known:  boolean

  // Numerology core
  life_path:         number | null
  soul_urge:         number | null
  personality:       number | null
  expression:        number | null
  master_numbers:    number[]
  karmic_debts:      number[]

  // Timing — numbers + themes
  personal_year:        number | null
  personal_year_theme:  string | null
  personal_month:       number | null
  personal_month_theme: string | null
  personal_day:         number | null
  personal_day_theme:   string | null

  // Pinnacle
  pinnacle_number:  number | null
  pinnacle_theme:   string | null
  pinnacle_label:   string | null   // "Pinnacle 5 ✦" etc

  // Astrology
  sun_sign:         string | null
  moon_sign:        string | null
  rising_sign:      string | null
  planets:          Record<string, AstroplanetReading>

  // Physical readings — only set if data was actually collected
  has_face:         boolean
  face_shape:       string | null
  face_archetype:   string | null
  face_element:     string | null
  has_palm:         boolean
  palm_shape:       string | null
  palm_element:     string | null
  palm_ruling_planet: string | null

  // Reading content
  full_reading:     string          // complete narration
  domain_sections:  Record<string, string>  // domain → section text
  cultural_origin:  string | null

  // Meta
  job_id:           string | null
  has_synthesis:    boolean
}

export interface SubTier {
  tier:       string
  active:     boolean
  expires_at: string | null
}

// ─────────────────────────────────────────────────────────────
// Empty context
// ─────────────────────────────────────────────────────────────
export const EMPTY_SYNTHESIS: SynthesisContext = {
  full_name: '', first_name: 'Seeker',
  date_of_birth: null, birth_location: null, birth_time_known: false,
  life_path: null, soul_urge: null, personality: null, expression: null,
  master_numbers: [], karmic_debts: [],
  personal_year: null, personal_year_theme: null,
  personal_month: null, personal_month_theme: null,
  personal_day: null, personal_day_theme: null,
  pinnacle_number: null, pinnacle_theme: null, pinnacle_label: null,
  sun_sign: null, moon_sign: null, rising_sign: null, planets: {},
  has_face: false, face_shape: null, face_archetype: null, face_element: null,
  has_palm: false, palm_shape: null, palm_element: null, palm_ruling_planet: null,
  full_reading: '', domain_sections: {},
  cultural_origin: null, job_id: null, has_synthesis: false,
}

// ─────────────────────────────────────────────────────────────
// Fetch subscription tier
// ─────────────────────────────────────────────────────────────
export async function fetchSubTier(
  userId:    string,
  toolId:    string,
  authToken?: string,
): Promise<SubTier> {
  try {
    const res = await fetch(
      `${API_BASE}/api/subscription/tier?user_id=${userId}&tool_id=${toolId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      }
    )
    if (!res.ok) return { tier: 'free', active: false, expires_at: null }
    return res.json()
  } catch {
    return { tier: 'free', active: false, expires_at: null }
  }
}

// ─────────────────────────────────────────────────────────────
// Fetch and parse synthesis context
// scope: the domain of the active tool (e.g. 'love', 'wealth', 'all')
// ─────────────────────────────────────────────────────────────
export async function fetchSynthesis(
  userId:    string,
  scope:     string,
  authToken?: string,
): Promise<SynthesisContext> {
  try {
    const res = await fetch(
      `${API_BASE}/api/reading/job/latest?user_id=${userId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      }
    )
    if (!res.ok) return EMPTY_SYNTHESIS
    const data = await res.json()
    if (!data?.result) return EMPTY_SYNTHESIS

    const r = data.result

    // ── Identity ───────────────────────────────────────────
    const fullName  = (r.full_name ?? data.full_name ?? '').trim()
    const firstName = fullName.split(' ')[0] || 'Seeker'

    // ── Numerology core ────────────────────────────────────
    const num       = r.numerology ?? {}
    const core      = num.core     ?? {}
    const cycles    = num.time_cycles ?? {}
    const pinnacles = num.pinnacles   ?? {}

    const lifePathRaw  = r.life_path    ?? core.life_path    ?? null
    const soulUrgeRaw  = r.soul_urge    ?? core.soul_urge    ?? null
    const personalityRaw = core.personality ?? null
    const expressionRaw  = core.expression  ?? core.destiny   ?? null

    const masterNumbers: number[] = num.master_numbers ?? []
    const karmicDebts:   number[] = (num.karmic_debts ?? []).map(
      (k: any) => typeof k === 'object' ? k.number : k
    ).filter(Boolean)

    // ── Timing ─────────────────────────────────────────────
    const pyNum   = r.personal_year  ?? cycles.personal_year  ?? null
    const pmNum   = r.personal_month ?? cycles.personal_month ?? null
    const pdNum   = r.personal_day   ?? cycles.personal_day   ?? null

    const pyTheme  = cycles.personal_year_theme  ?? null
    const pmTheme  = cycles.personal_month_theme ?? null
    const pdTheme  = cycles.personal_day_theme   ?? null

    // ── Pinnacle ───────────────────────────────────────────
    const cp         = pinnacles.current ?? null
    const pinNum     = cp?.number ?? null
    const pinTheme   = cp?.theme  ?? null
    const pinLabel   = pinNum
      ? `Pinnacle ${pinNum}${masterNumbers.includes(pinNum) ? ' ✦' : ''}`
      : null

    // ── Astrology ──────────────────────────────────────────
    const astro         = r.astrology ?? {}
    const allPlanets: Record<string, AstroplanetReading> = {}
    const relevantKeys  = DOMAIN_PLANETS[scope] ?? []

    for (const [key, val] of Object.entries(astro.planets ?? {})) {
      const p = val as any
      // Include if: scope is 'all', or planet is domain-relevant, or it has a reading
      if (
        scope === 'all' ||
        relevantKeys.some(k => key.toLowerCase().includes(k.toLowerCase())) ||
        (p.reading && p.domain === scope)
      ) {
        allPlanets[key] = {
          sign:      p.sign      ?? undefined,
          house:     p.house     ?? undefined,
          reading:   p.reading   ?? p.tone ?? '',
          domain:    p.domain    ?? '',
          retrograde: p.retrograde ?? false,
        }
      }
    }

    // ── Face — only if actually collected ─────────────────
    const faceAnalysis = r.face_analysis ?? {}
    const hasFace = !!(
      faceAnalysis.face_shape ||
      faceAnalysis.archetype  ||
      r.face_archetype
    )
    const faceShape     = faceAnalysis.face_shape  ?? null
    const faceArchetype = faceAnalysis.archetype   ?? r.face_archetype ?? null
    const faceElement   = faceAnalysis.element     ?? null

    // ── Palm — only if actually collected ─────────────────
    const palmAnalysis = r.palm_analysis ?? {}
    const hasPalm = !!(
      palmAnalysis.hand_shape ||
      palmAnalysis.element    ||
      r.palm_element
    )
    const palmShape         = palmAnalysis.hand_shape     ?? null
    const palmElement       = palmAnalysis.element        ?? r.palm_element ?? null
    const palmRulingPlanet  = palmAnalysis.ruling_planet  ?? null

    // ── Reading content ────────────────────────────────────
    const fullReading    = r.reading         ?? ''
    const domainSections = r.domain_sections ?? {}

    // ── Cultural origin ────────────────────────────────────
    const culturalOrigin = r.cultural_origin ?? null

    // ── Birth details ──────────────────────────────────────
    const dob           = data.date_of_birth ?? r.date_of_birth ?? null
    const birthLocation = r.birth_location   ?? r.birth_place   ?? null
    const birthTimeKnown = !!(r.birth_time_known ?? r.hour_known ?? false)

    return {
      full_name:         fullName,
      first_name:        firstName,
      date_of_birth:     dob,
      birth_location:    typeof birthLocation === 'object'
        ? birthLocation?.place_name ?? birthLocation?.city ?? null
        : birthLocation,
      birth_time_known:  birthTimeKnown,

      life_path:         lifePathRaw,
      soul_urge:         soulUrgeRaw,
      personality:       personalityRaw,
      expression:        expressionRaw,
      master_numbers:    masterNumbers,
      karmic_debts:      karmicDebts,

      personal_year:         pyNum,
      personal_year_theme:   pyTheme,
      personal_month:        pmNum,
      personal_month_theme:  pmTheme,
      personal_day:          pdNum,
      personal_day_theme:    pdTheme,

      pinnacle_number:  pinNum,
      pinnacle_theme:   pinTheme,
      pinnacle_label:   pinLabel,

      sun_sign:    r.sun_sign   ?? astro.sun_sign   ?? null,
      moon_sign:   r.moon_sign  ?? astro.moon_sign  ?? null,
      rising_sign: r.rising_sign ?? astro.rising_sign ?? null,
      planets:     allPlanets,

      has_face:       hasFace,
      face_shape:     faceShape,
      face_archetype: faceArchetype,
      face_element:   faceElement,
      has_palm:           hasPalm,
      palm_shape:         palmShape,
      palm_element:       palmElement,
      palm_ruling_planet: palmRulingPlanet,

      full_reading:    fullReading,
      domain_sections: domainSections,
      cultural_origin: culturalOrigin,

      job_id:        data.id ?? null,
      has_synthesis: true,
    }
  } catch {
    return EMPTY_SYNTHESIS
  }
}

// ─────────────────────────────────────────────────────────────
// Build synthesis badge pills for UI display
// ─────────────────────────────────────────────────────────────
export function buildSynthesisPills(ctx: SynthesisContext): string[] {
  const pills: string[] = []

  if (ctx.life_path)     pills.push(`Life Path ${ctx.life_path}${ctx.master_numbers.includes(ctx.life_path) ? ' ✦' : ''}`)
  if (ctx.soul_urge)     pills.push(`Soul ${ctx.soul_urge}`)
  if (ctx.sun_sign)      pills.push(`☉ ${ctx.sun_sign}`)
  if (ctx.moon_sign)     pills.push(`☽ ${ctx.moon_sign}`)
  if (ctx.personal_year) pills.push(`PY ${ctx.personal_year}`)
  if (ctx.personal_month)pills.push(`PM ${ctx.personal_month}`)
  if (ctx.personal_day)  pills.push(`PD ${ctx.personal_day}`)
  if (ctx.pinnacle_label)pills.push(ctx.pinnacle_label)

  // Only show face/palm if actually collected
  if (ctx.has_face && ctx.face_archetype) pills.push(ctx.face_archetype)
  if (ctx.has_palm && ctx.palm_element)   pills.push(`Palm · ${ctx.palm_element}`)

  return pills
}

// ─────────────────────────────────────────────────────────────
// Build the synthesis history block injected as assistant[0]
//
// Structure:
//  1. WHO THIS PERSON IS — core identity, birth data
//  2. TIMING RIGHT NOW — full themes, not just numbers
//  3. ASTROLOGY — domain-filtered planets with readings
//  4. PHYSICAL READINGS — only if face/palm were collected
//  5. DOMAIN SECTION — the specific domain reading for this tool
//  6. FULL READING — complete narration (up to 5000 chars)
//  7. CONVERSATION INSTRUCTIONS — how to behave across turns
//
// Called once per session (voice) or once per message (chat).
// For chat: also appends accumulated conversation turns.
// ─────────────────────────────────────────────────────────────
export function buildSynthesisBlock(
  ctx:      SynthesisContext,
  toolName: string,
  scope:    string,
  isVoice:  boolean,
): string {
  const lines: string[] = []

  // ── 1. Identity ───────────────────────────────────────────
  lines.push(`═══════════════════════════════════════`)
  lines.push(`KAYAL SYNTHESIS — ${ctx.full_name || 'this user'}`)
  lines.push(`Session: ${toolName}`)
  lines.push(`═══════════════════════════════════════`)
  lines.push('')

  lines.push('WHO THIS PERSON IS')
  lines.push('──────────────────')
  if (ctx.full_name)       lines.push(`Full name:        ${ctx.full_name}`)
  if (ctx.date_of_birth)   lines.push(`Date of birth:    ${ctx.date_of_birth}`)
  if (ctx.birth_location)  lines.push(`Birth location:   ${ctx.birth_location}`)
  if (ctx.birth_time_known) lines.push(`Birth time:       known (chart is precise)`)
  else                      lines.push(`Birth time:       unknown (solar chart used)`)
  lines.push('')

  // Core numerology
  if (ctx.life_path) {
    const masterTag = ctx.master_numbers.includes(ctx.life_path) ? ' (Master Number)' : ''
    lines.push(`Life Path:        ${ctx.life_path}${masterTag}`)
  }
  if (ctx.soul_urge)   lines.push(`Soul Urge:        ${ctx.soul_urge}`)
  if (ctx.personality) lines.push(`Personality:      ${ctx.personality}`)
  if (ctx.expression)  lines.push(`Expression:       ${ctx.expression}`)
  if (ctx.master_numbers.length > 0)
    lines.push(`Master Numbers:   ${ctx.master_numbers.join(', ')}`)
  if (ctx.karmic_debts.length > 0)
    lines.push(`Karmic Debts:     ${ctx.karmic_debts.join(', ')} — these patterns repeat until resolved`)
  lines.push('')

  // Astrology
  if (ctx.sun_sign || ctx.moon_sign || ctx.rising_sign) {
    if (ctx.sun_sign)    lines.push(`Sun Sign:         ${ctx.sun_sign}`)
    if (ctx.moon_sign)   lines.push(`Moon Sign:        ${ctx.moon_sign}`)
    if (ctx.rising_sign) lines.push(`Rising Sign:      ${ctx.rising_sign}`)
    lines.push('')
  }

  // ── 2. Timing right now ───────────────────────────────────
  lines.push('TIMING RIGHT NOW')
  lines.push('────────────────')
  if (ctx.personal_year) {
    lines.push(`Personal Year ${ctx.personal_year}${ctx.master_numbers.includes(ctx.personal_year) ? ' ✦' : ''}:`)
    if (ctx.personal_year_theme) lines.push(`  → ${ctx.personal_year_theme}`)
  }
  if (ctx.personal_month) {
    lines.push(`Personal Month ${ctx.personal_month}:`)
    if (ctx.personal_month_theme) lines.push(`  → ${ctx.personal_month_theme}`)
  }
  if (ctx.personal_day) {
    lines.push(`Personal Day ${ctx.personal_day}:`)
    if (ctx.personal_day_theme) lines.push(`  → ${ctx.personal_day_theme}`)
  }
  if (ctx.pinnacle_label) {
    lines.push(`${ctx.pinnacle_label}:`)
    if (ctx.pinnacle_theme) lines.push(`  → ${ctx.pinnacle_theme}`)
  }
  lines.push('')

  // ── 3. Astrology planets (domain-filtered) ────────────────
  const planetEntries = Object.entries(ctx.planets)
  if (planetEntries.length > 0) {
    lines.push('ASTROLOGY (domain-relevant)')
    lines.push('───────────────────────────')
    for (const [planet, data] of planetEntries) {
      const sign    = data.sign ? ` in ${data.sign}` : ''
      const house   = data.house ? ` (${data.house}th house)` : ''
      const retro   = data.retrograde ? ' ℞' : ''
      lines.push(`${planet}${sign}${house}${retro}:`)
      if (data.reading) lines.push(`  → ${data.reading}`)
    }
    lines.push('')
  }

  // ── 4. Physical readings — ONLY if collected ──────────────
  if (ctx.has_face) {
    lines.push('FACE READING (collected)')
    lines.push('────────────────────────')
    if (ctx.face_shape)     lines.push(`Shape:      ${ctx.face_shape}`)
    if (ctx.face_archetype) lines.push(`Archetype:  ${ctx.face_archetype}`)
    if (ctx.face_element)   lines.push(`Element:    ${ctx.face_element}`)
    lines.push('')
  }
  if (ctx.has_palm) {
    lines.push('PALM READING (collected)')
    lines.push('────────────────────────')
    if (ctx.palm_shape)          lines.push(`Shape:          ${ctx.palm_shape}`)
    if (ctx.palm_element)        lines.push(`Element:        ${ctx.palm_element}`)
    if (ctx.palm_ruling_planet)  lines.push(`Ruling planet:  ${ctx.palm_ruling_planet}`)
    lines.push('')
  }
  if (!ctx.has_face && !ctx.has_palm) {
    lines.push('NOTE: No face or palm reading was collected for this user.')
    lines.push('Do not reference face shape, palm lines, or physical features.')
    lines.push('')
  }

  // ── 5. Domain section (most relevant content first) ───────
  const domainSection = ctx.domain_sections[scope]
    ?? ctx.domain_sections[scope.replace('-', '_')]
    ?? null
  if (domainSection) {
    lines.push(`${scope.toUpperCase()} DOMAIN READING`)
    lines.push('─────────────────────────────────────')
    lines.push(domainSection.slice(0, 3000))
    lines.push('')
  }

  // ── 6. Full narration ─────────────────────────────────────
  if (ctx.full_reading) {
    lines.push('COMPLETE SYNTHESIS READING')
    lines.push('──────────────────────────')
    lines.push(ctx.full_reading.slice(0, 5000))
    lines.push('')
  }

  // ── 7. Conversation instructions ─────────────────────────
  lines.push('SESSION INSTRUCTIONS')
  lines.push('────────────────────')
  lines.push(`You are speaking with ${ctx.first_name}.`)
  lines.push('')
  lines.push('CORE BEHAVIOURS:')
  lines.push('- Use the synthesis above as your primary knowledge base for this person')
  lines.push('- Every answer must feel written specifically for them — never generic')
  lines.push(`- Use their name (${ctx.first_name}) occasionally, naturally — not in every message`)
  lines.push('- Connect across systems: a love question may have a numerology root, a wealth')
  lines.push('  question may have a karmic debt pattern, a purpose question may show in the timing')
  lines.push('- Notice what they are really asking beneath the surface question')
  lines.push('- Reference their specific numbers, signs, and patterns by name')
  lines.push('')
  lines.push('ACROSS THE CONVERSATION:')
  lines.push('- Build on what has already been said — never repeat yourself')
  lines.push('- Notice patterns emerging across the conversation')
  lines.push('- Deepen with each exchange — the tenth message should go further than the first')
  lines.push('- If they circle back to a topic, acknowledge the return and go deeper')
  lines.push('- Connect their questions to their current timing — what does PY '
    + (ctx.personal_year ?? '?') + ' mean for this?')
  lines.push('')
  if (!ctx.has_face && !ctx.has_palm) {
    lines.push('IMPORTANT: No physical readings were collected. Do not reference face shape,')
    lines.push('palm lines, hand shape, or any physiognomy. Work only from numerology and astrology.')
    lines.push('')
  }
  lines.push(isVoice
    ? 'FORMAT: Natural spoken sentences only. No bullet points, no headers, no markdown.'
    : 'FORMAT: Paragraphs. No bullet points unless explicitly asked. No headers. Write as a reader speaking.'
  )

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// Build full history array for API call
// synthesis always at [0], never trimmed
// ─────────────────────────────────────────────────────────────
export interface ConversationTurn {
  role:    'user' | 'assistant'
  content: string
}

export function buildHistory(
  ctx:       SynthesisContext,
  toolName:  string,
  scope:     string,
  isVoice:   boolean,
  turns:     Array<{ role: 'user' | 'scribe' | 'oracle'; content: string; streaming?: boolean }>,
  maxTurns:  number = 20,
): ConversationTurn[] {
  const synthesisText = buildSynthesisBlock(ctx, toolName, scope, isVoice)

  // Filter completed turns only, map roles
  const completedTurns = turns
    .filter(t => !t.streaming && t.content.trim())
    .map(t => ({
      role:    (t.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: t.content,
    }))

  // Keep last N turns — synthesis block is always [0] regardless
  const recentTurns = completedTurns.slice(-maxTurns * 2)

  return [
    { role: 'assistant', content: synthesisText },
    ...recentTurns,
  ]
}
