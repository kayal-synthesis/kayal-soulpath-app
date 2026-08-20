'use client'
/**
 * app/(app)/profile/page.tsx
 * ===========================
 * The user's sacred document.
 * Synthesis portrait, reading history, subscriptions, account.
 * Feels like a personal oracle dossier — not a settings page.
 *
 * v1.1, real bug fix, the fallback below pointed at localhost, the
 * same category of bug already found and fixed across several files
 * tonight. The actual endpoint call in this file, /api/reading/job/
 * latest, was already checked directly against main.py's real,
 * current routes and confirmed an exact match, nothing else needed
 * changing there.
 *
 * NOTE, real, pre-existing gap, not touched here: `subscriptions`
 * below is declared and never once populated, no fetch call anywhere
 * updates it, so the Subscriptions tab always shows "No active
 * subscriptions" regardless of what the user actually owns. The
 * correct fix would mirror checkSub() from
 * app/domain/voice-of-prophecy/new/page.tsx and
 * app/domain/sacred-script/new/page.tsx, checking
 * /api/subscription/tier against each real tool, that's genuinely new
 * work, not a quick correction, left flagged rather than built
 * silently as a side effect of this pass.
 */
import { useState, useEffect } from 'react'
import { useRouter }            from 'next/navigation'
import { useAuth }              from '@/lib/hooks/useAuth'
import { createClient }         from '@/lib/supabase/client'
import {
  Sparkles, ChevronRight, Download,
  CreditCard, Bell, Shield,
  Trash2, LogOut, Calendar,
  Star, Clock, User
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface SynthesisPortrait {
  full_name:         string
  date_of_birth:     string | null
  birth_location:    string | null
  birth_time_known:  boolean
  life_path:         number | null
  soul_urge:         number | null
  personality:       number | null
  expression:        number | null
  master_numbers:    number[]
  karmic_debts:      number[]
  sun_sign:          string | null
  moon_sign:         string | null
  rising_sign:       string | null
  personal_year:     number | null
  personal_year_theme: string | null
  pinnacle:          string | null
  pinnacle_theme:    string | null
  has_face:          boolean
  face_archetype:    string | null
  has_palm:          boolean
  palm_element:      string | null
  cultural_origin:   string | null
  reading_count:     number
  last_reading_at:   string | null
}
interface Subscription {
  tool_id:     string
  tool_name:   string
  domain:      string
  price:       number
  status:      string
  expires_at:  string | null
  // Real, honest omission: no per-session usage tracking exists
  // anywhere in this codebase yet, previously this interface had a
  // sessions_this_month field that was never actually populated by
  // anything, dropped rather than left silently fake.
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const API = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.kayalsoulpath.com').replace(/\/$/, '')

const LP_COLOUR: Record<number, string> = {
  1:'#c9a96e',2:'#d4856a',3:'#e8a060',4:'#7aaa8a',5:'#b89fd4',
  6:'#d4856a',7:'#8ba8d4',8:'#c9a96e',9:'#9a8ac4',
  11:'#b89fd4',22:'#c9a96e',33:'#e8a060',
}
const DOMAIN_COLOUR: Record<string, string> = {
  love:'#d4856a',wealth:'#b8966a',spiritual:'#9a8ac4',
  health:'#7aaa8a',purpose:'#7a9ac4',voice:'#c9a96e',all:'#c9a96e',
}
type ProfileSection = 'synthesis' | 'readings' | 'subscriptions' | 'account'

// ─────────────────────────────────────────────────────────────
// Numerology descriptor
// ─────────────────────────────────────────────────────────────
const LP_DESC: Record<number, string> = {
  1:'The Pioneer — independent, driven, the one who begins',
  2:'The Diplomat — sensitive, cooperative, the one who unites',
  3:'The Creator — expressive, joyful, the one who communicates',
  4:'The Builder — disciplined, reliable, the one who constructs',
  5:'The Explorer — free, adaptable, the one who experiences',
  6:'The Nurturer — caring, responsible, the one who serves',
  7:'The Seeker — introspective, analytical, the one who knows',
  8:'The Achiever — powerful, material, the one who manifests',
  9:'The Humanitarian — wise, compassionate, the one who completes',
  11:'The Illuminator — intuitive, visionary, the master channel',
  22:'The Master Builder — disciplined vision, the master architect',
  33:'The Master Teacher — selfless service, the master of love',
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router   = useRouter()
  const { user, signOut } = useAuth()
  const supabase = createClient()
  const [portrait,      setPortrait]      = useState<SynthesisPortrait | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [section,       setSection]       = useState<ProfileSection>('synthesis')
  const [loading,       setLoading]       = useState(true)
  const [managingSubscription, setManagingSubscription] = useState(false)

  // Real, direct Supabase query, matching the exact pattern already
  // proven in app/member/dashboard/page.tsx, previously this array was
  // declared and never once populated, always showing "No active
  // subscriptions" regardless of what the person actually owned.
  useEffect(() => {
    if (!user?.id) return
    const loadSubscriptions = async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('tool_id, tool_name, category, price, status, expires_at')
        .eq('user_id', user.id)
        .in('tool_type', ['chat', 'reading', 'audio'])
        .in('status', ['active', 'cancelled'])
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Subscriptions fetch error:', error)
        return
      }
      setSubscriptions((data || []).map(row => ({
        tool_id:    row.tool_id,
        tool_name:  row.tool_name,
        domain:     row.category ?? 'all',
        price:      row.price,
        status:     row.status,
        expires_at: row.expires_at,
      })))
    }
    loadSubscriptions()
  }, [user?.id])

  // Same real path as the member dashboard, one honest "manage
  // subscription" action, Stripe's own hosted portal, not a second,
  // competing custom flow.
  const handleManageSubscriptions = async () => {
    if (!user?.id || managingSubscription) return
    setManagingSubscription(true)
    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          returnUrl: window.location.href,
        })
      })
      const data = await response.json()
      if (response.ok && data.portalUrl) {
        window.location.href = data.portalUrl
      } else {
        alert(data.error || 'Could not open the subscription portal. Please try again.')
        setManagingSubscription(false)
      }
    } catch (error) {
      console.error('Manage subscriptions error:', error)
      alert('Could not open the subscription portal. Please try again.')
      setManagingSubscription(false)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        // Load synthesis
        const jobRes = await fetch(`${API}/api/reading/job/latest?user_id=${user.id}`)
        if (jobRes.ok) {
          const data = await jobRes.json()
          const r    = data.result ?? {}
          const num  = r.numerology ?? {}
          const pins = num.pinnacles ?? {}
          setPortrait({
            full_name:         r.full_name    ?? '',
            date_of_birth:     data.date_of_birth ?? r.date_of_birth ?? null,
            birth_location:    r.birth_location   ?? null,
            birth_time_known:  !!(r.birth_time_known ?? false),
            life_path:         r.life_path     ?? num.core?.life_path     ?? null,
            soul_urge:         r.soul_urge     ?? num.core?.soul_urge     ?? null,
            personality:       num.core?.personality ?? null,
            expression:        num.core?.expression  ?? num.core?.destiny ?? null,
            master_numbers:    num.master_numbers     ?? [],
            karmic_debts:      (num.karmic_debts ?? []).map((k:any) =>
              typeof k === 'object' ? k.number : k
            ).filter(Boolean),
            sun_sign:          r.sun_sign    ?? null,
            moon_sign:         r.moon_sign   ?? null,
            rising_sign:       r.rising_sign ?? null,
            personal_year:     r.personal_year ?? num.time_cycles?.personal_year ?? null,
            personal_year_theme: num.time_cycles?.personal_year_theme ?? null,
            pinnacle:          pins.current?.number ? `Pinnacle ${pins.current.number}` : null,
            pinnacle_theme:    pins.current?.theme ?? null,
            has_face:          !!(r.face_analysis?.archetype || r.face_archetype),
            face_archetype:    r.face_archetype ?? r.face_analysis?.archetype ?? null,
            has_palm:          !!(r.palm_analysis?.element || r.palm_element),
            palm_element:      r.palm_element ?? r.palm_analysis?.element ?? null,
            cultural_origin:   r.cultural_origin ?? null,
            reading_count:     1,
            last_reading_at:   data.completed_at ?? null,
          })
        }
      } catch { /* non-fatal */ }
      setLoading(false)
    }
    load()
  }, [user?.id])

  const lpColour = portrait?.life_path
    ? (LP_COLOUR[portrait.life_path] ?? '#c9a96e')
    : '#c9a96e'

  const sections: { id: ProfileSection; label: string }[] = [
    { id: 'synthesis',     label: 'Synthesis'     },
    { id: 'readings',      label: 'Readings'      },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'account',       label: 'Account'       },
  ]

  // ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto" style={{ fontFamily: 'var(--font-body)', minHeight: '100vh' }}>
      {/* ── Hero ────────────────────────────────────────── */}
      <div
        className="px-5 pt-8 pb-6"
        style={{
          background:   `radial-gradient(ellipse at 50% 0%, ${lpColour}0c 0%, transparent 70%)`,
          borderBottom: '1px solid var(--rim)',
        }}
      >
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton w-24 h-24 rounded-full mx-auto" />
            <div className="skeleton h-6 w-48 rounded mx-auto" />
            <div className="skeleton h-3 w-32 rounded mx-auto" />
          </div>
        ) : (
          <div className="text-center">
            {/* Avatar orb */}
            <div
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl animate-orb-breathe"
              style={{
                background: `radial-gradient(circle at 35% 30%, ${lpColour}22, ${lpColour}06)`,
                border:     `1px solid ${lpColour}28`,
              }}
            >
              {portrait?.life_path ?? '🔮'}
            </div>
            <h1
              className="text-2xl mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-parchment)' }}
            >
              {portrait?.full_name || user?.email?.split('@')[0] || 'Seeker'}
            </h1>
            {portrait?.life_path && (
              <p className="text-xs mb-3" style={{ color: 'var(--text-stone)' }}>
                {LP_DESC[portrait.life_path]?.split('—')[0].trim()}
              </p>
            )}
            {/* Quick pills */}
            <div className="flex flex-wrap justify-center gap-1.5">
              {portrait?.life_path && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-label tracking-widest uppercase"
                  style={{ background: `${lpColour}14`, color: lpColour, border: `1px solid ${lpColour}22` }}>
                  LP {portrait.life_path}
                </span>
              )}
              {portrait?.sun_sign && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-label tracking-widest uppercase"
                  style={{ background: 'var(--surface)', color: 'var(--text-stone)', border: '1px solid var(--rim)' }}>
                  ☉ {portrait.sun_sign}
                </span>
              )}
              {portrait?.personal_year && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-label tracking-widest uppercase"
                  style={{ background: 'var(--surface)', color: 'var(--text-stone)', border: '1px solid var(--rim)' }}>
                  PY {portrait.personal_year}
                </span>
              )}
              {portrait?.has_face && portrait.face_archetype && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-label tracking-widest uppercase"
                  style={{ background: 'var(--surface)', color: 'var(--text-stone)', border: '1px solid var(--rim)' }}>
                  {portrait.face_archetype}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      {/* ── Section tabs ──────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 flex gap-1 px-5 py-3 overflow-x-auto"
        style={{ background: 'var(--abyss)', borderBottom: '1px solid var(--rim)', scrollbarWidth: 'none' }}
      >
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] tracking-widest uppercase font-label transition-all"
            style={{
              background: section === s.id ? `${lpColour}14` : 'transparent',
              color:      section === s.id ? lpColour          : 'var(--text-void)',
              border:     `1px solid ${section === s.id ? `${lpColour}28` : 'transparent'}`,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {/* ── Sections ──────────────────────────────────────── */}
      <div className="px-5 py-5 space-y-4">
        {/* SYNTHESIS */}
        {section === 'synthesis' && portrait && (
          <>
            {/* Birth data */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}>
              <p className="text-[9px] tracking-widest uppercase font-label mb-3" style={{ color: 'var(--text-void)' }}>
                Birth Data
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Full name',      value: portrait.full_name },
                  { label: 'Date of birth',  value: portrait.date_of_birth },
                  { label: 'Birth location', value: portrait.birth_location },
                  { label: 'Birth time',     value: portrait.birth_time_known ? 'Known — chart is precise' : 'Unknown — solar chart used' },
                  { label: 'Tradition',      value: portrait.cultural_origin },
                ].filter(i => i.value).map(item => (
                  <div key={item.label} className="flex items-start justify-between gap-4">
                    <span className="text-[10px] font-label tracking-widest uppercase" style={{ color: 'var(--text-void)', flexShrink: 0 }}>
                      {item.label}
                    </span>
                    <span className="text-xs text-right" style={{ color: 'var(--text-scroll)' }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Numerology core */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}>
              <p className="text-[9px] tracking-widest uppercase font-label mb-3" style={{ color: 'var(--text-void)' }}>
                Numerology Core
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Life Path',   value: portrait.life_path,   note: portrait.life_path ? LP_DESC[portrait.life_path]?.split('—')[1]?.trim() : null },
                  { label: 'Soul Urge',   value: portrait.soul_urge,   note: null },
                  { label: 'Personality', value: portrait.personality, note: null },
                  { label: 'Expression',  value: portrait.expression,  note: null },
                ].filter(i => i.value).map(item => (
                  <div key={item.label}
                    className="rounded-xl p-3"
                    style={{ background: 'var(--surface)', border: '1px solid var(--rim)' }}>
                    <p
                      className="text-2xl font-display mb-0.5"
                      style={{ color: item.label === 'Life Path' ? lpColour : 'var(--text-vellum)' }}
                    >
                      {item.value}
                      {portrait.master_numbers.includes(item.value as number) && (
                        <span className="text-sm ml-1" style={{ color: 'var(--gold)' }}>✦</span>
                      )}
                    </p>
                    <p className="text-[9px] tracking-widest uppercase font-label" style={{ color: 'var(--text-void)' }}>
                      {item.label}
                    </p>
                    {item.note && (
                      <p className="text-[9px] mt-1 leading-relaxed" style={{ color: 'var(--text-stone)' }}>
                        {item.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {portrait.karmic_debts.length > 0 && (
                <div className="mt-3 px-3 py-2 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--divider)' }}>
                  <p className="text-[9px] tracking-widest uppercase font-label mb-1" style={{ color: 'var(--text-void)' }}>
                    Karmic Debts
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-scroll)' }}>
                    {portrait.karmic_debts.join(', ')} — patterns that repeat until resolved
                  </p>
                </div>
              )}
            </div>
            {/* Astrology */}
            {(portrait.sun_sign || portrait.moon_sign || portrait.rising_sign) && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}>
                <p className="text-[9px] tracking-widest uppercase font-label mb-3" style={{ color: 'var(--text-void)' }}>
                  Astrology
                </p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { symbol: '☉', label: 'Sun',     value: portrait.sun_sign    },
                    { symbol: '☽', label: 'Moon',    value: portrait.moon_sign   },
                    { symbol: '↑', label: 'Rising',  value: portrait.rising_sign },
                  ].filter(i => i.value).map(item => (
                    <div key={item.label}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: 'var(--surface)', border: '1px solid var(--rim)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-stone)' }}>{item.symbol}</span>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-vellum)' }}>{item.value}</p>
                        <p className="text-[9px] font-label tracking-widest uppercase" style={{ color: 'var(--text-void)' }}>
                          {item.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Physical readings */}
            {(portrait.has_face || portrait.has_palm) && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}>
                <p className="text-[9px] tracking-widest uppercase font-label mb-3" style={{ color: 'var(--text-void)' }}>
                  Physical Readings
                </p>
                <div className="space-y-2">
                  {portrait.has_face && portrait.face_archetype && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
                      style={{ background: 'var(--surface)', border: '1px solid var(--rim)' }}>
                      <span className="text-base">👁️</span>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-vellum)' }}>{portrait.face_archetype}</p>
                        <p className="text-[9px] font-label tracking-widest uppercase" style={{ color: 'var(--text-void)' }}>Face archetype</p>
                      </div>
                    </div>
                  )}
                  {portrait.has_palm && portrait.palm_element && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
                      style={{ background: 'var(--surface)', border: '1px solid var(--rim)' }}>
                      <span className="text-base">✋</span>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-vellum)' }}>{portrait.palm_element} element</p>
                        <p className="text-[9px] font-label tracking-widest uppercase" style={{ color: 'var(--text-void)' }}>Palm element</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Current timing */}
            {portrait.personal_year && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}>
                <p className="text-[9px] tracking-widest uppercase font-label mb-3" style={{ color: 'var(--text-void)' }}>
                  Current Timing
                </p>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[10px] font-label tracking-widest uppercase" style={{ color: 'var(--text-void)' }}>
                      Personal Year {portrait.personal_year}
                    </span>
                    {portrait.personal_year_theme && (
                      <span className="text-[10px] text-right" style={{ color: 'var(--text-scroll)' }}>
                        {portrait.personal_year_theme}
                      </span>
                    )}
                  </div>
                  {portrait.pinnacle && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[10px] font-label tracking-widest uppercase" style={{ color: 'var(--text-void)' }}>
                        {portrait.pinnacle}
                      </span>
                      {portrait.pinnacle_theme && (
                        <span className="text-[10px] text-right" style={{ color: 'var(--text-scroll)' }}>
                          {portrait.pinnacle_theme.slice(0, 50)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {/* READINGS */}
        {section === 'readings' && (
          <div className="space-y-3">
            <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}>
              <div className="text-3xl mb-3">📋</div>
              <p className="text-sm mb-1" style={{ color: 'var(--text-vellum)' }}>
                {portrait?.reading_count ?? 0} Reading{portrait?.reading_count !== 1 ? 's' : ''}
              </p>
              {portrait?.last_reading_at && (
                <p className="text-[10px]" style={{ color: 'var(--text-stone)' }}>
                  Last reading:{' '}
                  {new Date(portrait.last_reading_at).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric'
                  })}
                </p>
              )}
              <button
                onClick={() => router.push('/reading/new')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-label tracking-widest uppercase transition-all"
                style={{ background: 'var(--gold-surface)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}
              >
                New Reading
              </button>
            </div>
          </div>
        )}
        {/* SUBSCRIPTIONS */}
        {section === 'subscriptions' && (
          <div className="space-y-3">
            {subscriptions.length > 0 && (
              <button
                onClick={handleManageSubscriptions}
                disabled={managingSubscription}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-label tracking-widest uppercase transition-all"
                style={{ background: 'var(--gold-surface)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}
              >
                {managingSubscription ? 'Opening…' : 'Manage Subscriptions'}
              </button>
            )}
            {subscriptions.length === 0 ? (
              <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}>
                <CreditCard className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-void)' }} />
                <p className="text-sm mb-1" style={{ color: 'var(--text-vellum)' }}>
                  No active subscriptions
                </p>
                <p className="text-[10px] mb-4" style={{ color: 'var(--text-stone)' }}>
                  Subscribe to a tool to start personalised sessions
                </p>
                <button
                  onClick={() => router.push('/domains')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-label tracking-widest uppercase transition-all"
                  style={{ background: 'var(--gold-surface)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}
                >
                  Browse Tools
                </button>
              </div>
            ) : (
              subscriptions.map(sub => {
                const dc = DOMAIN_COLOUR[sub.domain] ?? '#c9a96e'
                return (
                  <div key={sub.tool_id}
                    className="rounded-2xl p-4"
                    style={{ background: 'var(--depth)', border: `1px solid ${dc}18` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: `${dc}12`, border: `1px solid ${dc}20` }}>
                        <CreditCard className="w-4 h-4" style={{ color: dc }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs" style={{ color: 'var(--text-vellum)' }}>{sub.tool_name}</p>
                        <p className="text-[9px] font-label tracking-widest uppercase" style={{ color: dc }}>
                          {sub.status} · ${sub.price}/mo
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-void)' }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px]" style={{ color: 'var(--text-stone)' }}>
                        {sub.status === 'cancelled' ? 'Access until' : 'Renews'}
                      </span>
                      {sub.expires_at && (
                        <span className="text-[9px]" style={{ color: 'var(--text-void)' }}>
                          {new Date(sub.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
        {/* ACCOUNT */}
        {section === 'account' && (
          <div className="space-y-3">
            {[
              { icon: Bell,    label: 'Notifications',       sub: 'Daily briefing, timing alerts', href: '/profile/notifications' },
              { icon: Shield,  label: 'Privacy & Data',      sub: 'Manage your synthesis data',     href: '/profile/privacy' },
              { icon: Download,label: 'Export Readings',     sub: 'Download all as PDF',            href: '/profile/export' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all"
                style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--divider)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--rim)')}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-stone)' }} />
                <div className="flex-1">
                  <p className="text-xs" style={{ color: 'var(--text-vellum)' }}>{item.label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-stone)' }}>{item.sub}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-void)' }} />
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--rim)', paddingTop: '12px' }}>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all"
                style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#b4545440')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--rim)')}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" style={{ color: '#b45454' }} />
                <span className="text-xs" style={{ color: '#b45454' }}>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
