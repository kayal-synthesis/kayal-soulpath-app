'use client'

/**
 * app/(app)/home/page.tsx
 * ========================
 * Dashboard — the first screen after sign-in.
 * Everything is personalised to the user's synthesis.
 * Never generic. Always specific.
 */

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { useAuth }             from '@/lib/hooks/useAuth'
import {
  Sparkles, ChevronRight, Play,
  Mic, MessageSquare, Clock,
  TrendingUp, Moon, Sun, Zap
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface DailyBriefing {
  personal_day:   number
  pd_theme:       string
  pd_action:      string
  pd_caution:     string
  moon_phase:     string
  moon_note:      string
  energy_quality: string  // 'action' | 'reflection' | 'expression' | 'building' etc
}

interface RecentSession {
  id:            string
  tool_id:       string
  tool_name:     string
  tool_emoji:    string
  domain:        string
  last_message:  string
  updated_at:    string
  message_count: number
}

interface ActiveSubscription {
  tool_id:     string
  tool_name:   string
  tool_emoji:  string
  domain:      string
  price:       number
  sessions_this_month: number
}

interface Dashboard {
  first_name:        string
  life_path:         number | null
  soul_urge:         number | null
  sun_sign:          string | null
  personal_year:     number | null
  personal_year_theme: string | null
  personal_month:    number | null
  personal_day:      number | null
  pinnacle:          string | null
  pinnacle_theme:    string | null
  briefing:          DailyBriefing | null
  recent_sessions:   RecentSession[]
  subscriptions:     ActiveSubscription[]
  has_synthesis:     boolean
  has_face:          boolean
  has_palm:          boolean
}

// ─────────────────────────────────────────────────────────────
// Domain colours
// ─────────────────────────────────────────────────────────────
const DOMAIN_COLOUR: Record<string, string> = {
  love:      '#d4856a',
  wealth:    '#b8966a',
  spiritual: '#9a8ac4',
  health:    '#7aaa8a',
  purpose:   '#7a9ac4',
  voice:     '#c9a96e',
  'sacred-script': '#b8966a',
  'time-keeper':   '#a8c4a0',
  all:       '#c9a96e',
}

const LP_COLOUR: Record<number, string> = {
  1: '#c9a96e', 2: '#d4856a', 3: '#e8a060',
  4: '#7aaa8a', 5: '#b89fd4', 6: '#d4856a',
  7: '#8ba8d4', 8: '#c9a96e', 9: '#9a8ac4',
  11: '#b89fd4', 22: '#c9a96e', 33: '#e8a060',
}

const ENERGY_ICON: Record<string, React.ElementType> = {
  action:     Zap,
  reflection: Moon,
  expression: Sparkles,
  building:   TrendingUp,
  rest:       Moon,
  default:    Sun,
}

// ─────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────
const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

async function fetchDashboard(userId: string): Promise<Dashboard | null> {
  try {
    // Load synthesis
    const jobRes = await fetch(`${API}/api/reading/job/latest?user_id=${userId}`)
    if (!jobRes.ok) return null
    const jobData = await jobRes.json()
    const r       = jobData.result ?? {}
    const num     = r.numerology   ?? {}
    const cycles  = num.time_cycles ?? {}
    const pins    = num.pinnacles   ?? {}

    // Load recent conversations
    let recentSessions: RecentSession[] = []
    try {
      const convRes = await fetch(`${API}/user/${userId}/conversations`)
      if (convRes.ok) {
        const convData = await convRes.json()
        // Group by session_id and take the most recent ones
        const sessionMap: Record<string, any> = {}
        for (const c of (convData.conversations ?? [])) {
          if (!sessionMap[c.session_id]) sessionMap[c.session_id] = c
          else if (c.timestamp > sessionMap[c.session_id].timestamp) {
            sessionMap[c.session_id] = c
          }
        }
        recentSessions = Object.values(sessionMap)
          .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, 4)
          .map((c: any) => ({
            id:            c.session_id,
            tool_id:       c.tool_id ?? 'unknown',
            tool_name:     c.tool_name ?? 'Session',
            tool_emoji:    c.tool_emoji ?? '📜',
            domain:        c.domain ?? 'all',
            last_message:  c.content?.slice(0, 80) ?? '',
            updated_at:    c.timestamp,
            message_count: 0,
          }))
      }
    } catch { /* non-fatal */ }

    const pdNum   = cycles.personal_day  ?? null
    const pdTheme = cycles.personal_day_theme ?? null

    // Build a simple briefing from available data
    const briefing: DailyBriefing | null = pdNum ? {
      personal_day:   pdNum,
      pd_theme:       pdTheme ?? `Personal Day ${pdNum}`,
      pd_action:      getBriefingAction(pdNum),
      pd_caution:     getBriefingCaution(pdNum),
      moon_phase:     getMoonPhase(),
      moon_note:      'Waxing energy supports new beginnings',
      energy_quality: getEnergyQuality(pdNum),
    } : null

    return {
      first_name:          (r.full_name ?? '').split(' ')[0] || 'Seeker',
      life_path:           r.life_path     ?? num.core?.life_path     ?? null,
      soul_urge:           r.soul_urge     ?? num.core?.soul_urge     ?? null,
      sun_sign:            r.sun_sign      ?? null,
      personal_year:       r.personal_year ?? cycles.personal_year    ?? null,
      personal_year_theme: cycles.personal_year_theme ?? null,
      personal_month:      r.personal_month ?? cycles.personal_month  ?? null,
      personal_day:        pdNum,
      pinnacle:            pins.current?.number ? `Pinnacle ${pins.current.number}` : null,
      pinnacle_theme:      pins.current?.theme ?? null,
      briefing,
      recent_sessions:     recentSessions,
      subscriptions:       [],
      has_synthesis:       true,
      has_face:            !!(r.face_analysis?.archetype || r.face_archetype),
      has_palm:            !!(r.palm_analysis?.element   || r.palm_element),
    }
  } catch { return null }
}

// ── Simple briefing generators from PD number ──────────────
function getBriefingAction(pd: number): string {
  const actions: Record<number, string> = {
    1: 'Start one thing you have been postponing',
    2: 'Reach out to someone you have been meaning to connect with',
    3: 'Express something — write, speak, or create',
    4: 'Complete one task that requires sustained focus',
    5: 'Say yes to the unexpected invitation',
    6: 'Do one act of care for someone close to you',
    7: 'Spend 20 minutes alone in genuine silence',
    8: 'Make one financial or professional decision',
    9: 'Let go of something that is no longer serving you',
    11: 'Trust the impression that comes without explanation',
    22: 'Take one step toward a larger vision',
    33: 'Offer help to someone without expecting return',
  }
  return actions[pd] ?? 'Be present to what arises today'
}

function getBriefingCaution(pd: number): string {
  const cautions: Record<number, string> = {
    1: 'Avoid beginning too many things at once',
    2: 'Do not force a decision that needs more time',
    3: 'Avoid scattering energy across too many conversations',
    4: 'Do not resist the necessary discipline today',
    5: 'Avoid committing to things you cannot follow through on',
    6: 'Do not take on other people\'s problems as your own',
    7: 'Avoid mistaking solitude for isolation',
    8: 'Do not let ambition override relationships today',
    9: 'Avoid clinging to what is ready to complete',
    11: 'Do not dismiss subtle knowing as anxiety',
    22: 'Avoid grandiosity — stay practical and grounded',
    33: 'Do not sacrifice your own needs entirely',
  }
  return cautions[pd] ?? 'Stay present rather than anticipating'
}

function getEnergyQuality(pd: number): string {
  const qualities: Record<number, string> = {
    1: 'action', 2: 'reflection', 3: 'expression',
    4: 'building', 5: 'action', 6: 'reflection',
    7: 'rest', 8: 'action', 9: 'reflection',
    11: 'reflection', 22: 'building', 33: 'expression',
  }
  return qualities[pd] ?? 'default'
}

function getMoonPhase(): string {
  // Approximate from day of month
  const day = new Date().getDate()
  if (day < 4)  return 'New Moon'
  if (day < 8)  return 'Waxing Crescent'
  if (day < 12) return 'First Quarter'
  if (day < 16) return 'Waxing Gibbous'
  if (day < 19) return 'Full Moon'
  if (day < 23) return 'Waning Gibbous'
  if (day < 27) return 'Last Quarter'
  return 'Waning Crescent'
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)   return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const router   = useRouter()
  const { user } = useAuth()

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!user?.id) return
    fetchDashboard(user.id).then(d => {
      setDashboard(d)
      setLoading(false)
    })
  }, [user?.id])

  const lpColour  = dashboard?.life_path
    ? (LP_COLOUR[dashboard.life_path] ?? '#c9a96e')
    : '#c9a96e'

  const EnergyIcon = dashboard?.briefing
    ? (ENERGY_ICON[dashboard.briefing.energy_quality] ?? ENERGY_ICON.default)
    : Sun

  // ── Skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
        {[120, 200, 80, 140].map((h, i) => (
          <div key={i} className="skeleton rounded-xl" style={{ height: h }} />
        ))}
      </div>
    )
  }

  // ── No synthesis ──────────────────────────────────────────
  if (!dashboard?.has_synthesis) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12 text-center space-y-6 animate-fade-up">
        <div className="text-6xl">🔮</div>
        <div>
          <h1 className="text-3xl font-display mb-3" style={{ color: 'var(--text-parchment)' }}>
            Welcome to KAYAL
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-stone)' }}>
            Complete your first reading to unlock your personalised dashboard,
            daily briefing, and oracle sessions.
          </p>
        </div>
        <button
          onClick={() => router.push('/reading/new')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-label tracking-widest uppercase transition-all"
          style={{ background: 'var(--gold)', color: 'var(--void)' }}
        >
          Begin Your Reading
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      className="max-w-2xl mx-auto px-5 py-6 space-y-5"
      style={{ fontFamily: 'var(--font-body)' }}
    >

      {/* ── Greeting ───────────────────────────────────────── */}
      <div className="animate-fade-up">
        <h1
          className="text-2xl mb-0.5"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-parchment)' }}
        >
          {dashboard.first_name}
        </h1>
        <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-stone)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── Daily Briefing Card ────────────────────────────── */}
      {dashboard.briefing && (
        <div
          className="rounded-2xl p-5 animate-fade-up delay-1"
          style={{
            background: `radial-gradient(ellipse at 10% 0%, ${lpColour}10 0%, var(--depth) 60%)`,
            border:     `1px solid ${lpColour}22`,
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <EnergyIcon className="w-3.5 h-3.5" style={{ color: lpColour }} />
                <span className="text-[10px] tracking-widest uppercase font-label"
                  style={{ color: lpColour }}>
                  Personal Day {dashboard.briefing.personal_day} · Today's Briefing
                </span>
              </div>
              <h2
                className="text-xl leading-snug"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-parchment)' }}
              >
                {dashboard.briefing.pd_theme}
              </h2>
            </div>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
              style={{
                background: `${lpColour}14`,
                border:     `1px solid ${lpColour}28`,
              }}
            >
              {dashboard.briefing.personal_day}
            </div>
          </div>

          {/* Action + Caution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--rim)' }}>
              <p className="text-[9px] tracking-widest uppercase mb-1.5 font-label"
                style={{ color: 'var(--gold)' }}>
                Today's Action
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-vellum)' }}>
                {dashboard.briefing.pd_action}
              </p>
            </div>
            <div className="rounded-xl p-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--rim)' }}>
              <p className="text-[9px] tracking-widest uppercase mb-1.5 font-label"
                style={{ color: 'var(--text-stone)' }}>
                Today's Caution
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-vellum)' }}>
                {dashboard.briefing.pd_caution}
              </p>
            </div>
          </div>

          {/* Moon + CTA */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-3 h-3" style={{ color: 'var(--text-stone)' }} />
              <span className="text-[10px]" style={{ color: 'var(--text-stone)' }}>
                {dashboard.briefing.moon_phase}
              </span>
            </div>
            <button
              onClick={() => router.push('/domain/voice-of-prophecy/daily-voice-briefing')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] tracking-widest uppercase font-label transition-all"
              style={{
                background: `${lpColour}14`,
                color:      lpColour,
                border:     `1px solid ${lpColour}28`,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = `${lpColour}22`)}
              onMouseLeave={e => (e.currentTarget.style.background = `${lpColour}14`)}
            >
              <Play className="w-2.5 h-2.5" />
              Hear Full Briefing
            </button>
          </div>
        </div>
      )}

      {/* ── Synthesis Summary ──────────────────────────────── */}
      <div
        className="rounded-2xl p-4 animate-fade-up delay-2"
        style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-3 h-3" style={{ color: 'var(--gold)' }} />
          <span className="text-[10px] tracking-widest uppercase font-label"
            style={{ color: 'var(--gold)' }}>
            Your Synthesis
          </span>
          <button
            onClick={() => router.push('/profile/synthesis')}
            className="ml-auto text-[9px] tracking-widest uppercase font-label transition-colors"
            style={{ color: 'var(--text-void)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-stone)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-void)')}
          >
            View full
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Life Path',      value: dashboard.life_path,     colour: lpColour },
            { label: 'Soul Urge',      value: dashboard.soul_urge,     colour: 'var(--text-stone)' },
            { label: 'Personal Year',  value: dashboard.personal_year, colour: 'var(--text-stone)' },
            { label: 'Sun Sign',       value: dashboard.sun_sign,      colour: 'var(--text-stone)' },
          ].filter(i => i.value).map(item => (
            <div key={item.label}
              className="rounded-xl p-3 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--rim)' }}>
              <p className="text-lg font-display mb-0.5" style={{ color: item.colour as string }}>
                {item.value}
              </p>
              <p className="text-[9px] tracking-widest uppercase font-label"
                style={{ color: 'var(--text-stone)' }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {dashboard.pinnacle && (
          <div className="mt-3 px-3 py-2 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--rim)' }}>
            <span className="text-[9px] tracking-widest uppercase font-label mr-2"
              style={{ color: 'var(--text-stone)' }}>
              {dashboard.pinnacle}
            </span>
            {dashboard.pinnacle_theme && (
              <span className="text-[10px]" style={{ color: 'var(--text-scroll)' }}>
                {dashboard.pinnacle_theme.slice(0, 60)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Recent Conversations ───────────────────────────── */}
      {dashboard.recent_sessions.length > 0 && (
        <div className="animate-fade-up delay-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] tracking-widest uppercase font-label"
              style={{ color: 'var(--text-stone)' }}>
              Recent Conversations
            </span>
            <button
              onClick={() => router.push('/conversations')}
              className="text-[9px] tracking-widest uppercase font-label transition-colors"
              style={{ color: 'var(--text-void)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-stone)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-void)')}
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {dashboard.recent_sessions.map(session => {
              const dc = DOMAIN_COLOUR[session.domain] ?? '#c9a96e'
              return (
                <button
                  key={session.id}
                  onClick={() => router.push(`/conversations/${session.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${dc}30`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--rim)')}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base"
                    style={{ background: `${dc}12`, border: `1px solid ${dc}20` }}>
                    {session.tool_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-vellum)' }}>
                      {session.tool_name}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-stone)' }}>
                      {session.last_message || 'Start of session'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[9px]" style={{ color: 'var(--text-void)' }}>
                      {timeAgo(session.updated_at)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Quick Start ────────────────────────────────────── */}
      <div className="animate-fade-up delay-4">
        <p className="text-[10px] tracking-widest uppercase font-label mb-3"
          style={{ color: 'var(--text-stone)' }}>
          Start a Session
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/domain/voice-of-prophecy')}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl transition-all"
            style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-border)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--rim)')}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
              style={{ background: 'var(--gold-surface)', border: '1px solid var(--gold-border)' }}>
              🎙️
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-vellum)' }}>
                Voice Oracle
              </p>
              <p className="text-[9px]" style={{ color: 'var(--text-stone)' }}>
                Speak your question
              </p>
            </div>
          </button>

          <button
            onClick={() => router.push('/domain/sacred-script')}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl transition-all"
            style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-border)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--rim)')}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
              style={{ background: 'var(--gold-surface)', border: '1px solid var(--gold-border)' }}>
              📜
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-vellum)' }}>
                Sacred Script
              </p>
              <p className="text-[9px]" style={{ color: 'var(--text-stone)' }}>
                Write your question
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── PY theme banner ────────────────────────────────── */}
      {dashboard.personal_year_theme && (
        <div
          className="rounded-2xl px-5 py-4 animate-fade-up delay-5"
          style={{
            background: 'var(--depth)',
            border:     '1px solid var(--divider)',
          }}
        >
          <p className="text-[9px] tracking-widest uppercase font-label mb-1"
            style={{ color: 'var(--text-void)' }}>
            Personal Year {dashboard.personal_year}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-scroll)' }}>
            {dashboard.personal_year_theme}
          </p>
        </div>
      )}
    </div>
  )
}
