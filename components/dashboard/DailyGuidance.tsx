'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, X, Star, Clock, ArrowRight, Download,
  Activity, Users, Compass, ShieldAlert, Lightbulb,
  ChevronRight, Zap, CheckCircle, Calendar, CalendarDays,
  ChevronDown, Loader2, RefreshCw, WifiOff,
} from 'lucide-react'

// ─── Wildcard imports — resilient to old/new file versions ───
import * as _omniMod     from '@/lib/constants/omni-seer-tools'
import * as _voiceMod    from '@/lib/constants/voice-tools'
import * as _sacredMod   from '@/lib/constants/sacred-script-tools'
import * as _timeMod     from '@/lib/constants/time-keeper-tools'
import * as _loveMod     from '@/lib/constants/love-tools'
import * as _wealthMod   from '@/lib/constants/wealth-tools'
import * as _wellnessMod from '@/lib/constants/wellness-spiritual'
import * as _lpMod       from '@/lib/constants/life-path-tools'

const allTools: any[] = [
  ...((_omniMod     as any).omniTools        ?? []),
  ...((_voiceMod    as any).voiceTools        ?? []),
  ...((_sacredMod   as any).sacredScriptTools ?? []),
  ...((_timeMod     as any).timeKeeperTools   ?? []),
  ...((_loveMod     as any).loveTools         ?? []),
  ...((_wealthMod   as any).wealthTools       ?? []),
  ...((_wellnessMod as any).wellnessTools     ?? []),
  ...((_lpMod       as any).lifePathTools     ?? []),
]

// ─────────────────────────────────────────────────────────────
// Backend API base — reads from env var
// ─────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.kayalsoulpath.com'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface DailyGuidanceProps {
  userName:           string
  greeting:           string
  date:               string
  time:               string
  // These are now fallback values — real data comes from backend
  personalDay:        number
  vibration?:         string
  vibrationMeaning?:  string
  energyLevel?:       number
  energyDescription?: string
  insightMessage?:    string
  userId?:            string
  // User birth data — passed to backend for synthesis
  dob?:               string   // YYYY-MM-DD
  birthTime?:         string   // HH:MM
  birthLocation?:     string   // city, country
}

// Shape returned by GET /daily-card
interface BackendGuidance {
  personalDay:        number
  vibration:           string
  vibrationMeaning:   string
  energyLevel:        number
  energyDescription:  string
  insightMessage:     string
  moon_phase?:         string
  universal_day?:      number
  recommended_tools?:  string[]   // tool IDs from synthesis engine
  embrace?:            string
  avoid?:              string
  advice?:             string
}

// ─────────────────────────────────────────────────────────────
// Personal Day archetypes — used when backend data is absent
// ─────────────────────────────────────────────────────────────
const ARCHETYPES: Record<number, {
  name: string; glyph: string; accent: string; light: string
  tagline: string
  embrace: string
  avoid:   string
  advice:  string
}> = {
  1: {
    name: 'The Pioneer', glyph: '✦', accent: '#F59E0B', light: '#FFFBEB',
    tagline:  'Initiate. The window for beginnings is open.',
    embrace:  'Starting new things, bold decisions, solo action',
    avoid:    'Hesitation, waiting for approval, committee thinking',
    advice:   'Send the message you\'ve been drafting. Begin the project. The window for initiation is today.',
  },
  2: {
    name: 'The Weaver', glyph: '◈', accent: '#A78BFA', light: '#F5F3FF',
    tagline:  'Receive. The answer will come through another person.',
    embrace:  'Listening, collaboration, gentle negotiations',
    avoid:    'Forcing outcomes, confrontation, impulsive commitments',
    advice:   'Receive more than you transmit today. The right conversation is closer than you think.',
  },
  3: {
    name: 'The Alchemist', glyph: '✵', accent: '#10B981', light: '#ECFDF5',
    tagline:  'Express. Today rewards saying the unconventional thing.',
    embrace:  'Creative expression, social connection, inspired work',
    avoid:    'Isolation, suppressing ideas, taking yourself too seriously',
    advice:   'Make the thing in your head real. Say the unconventional thing. Today rewards expression.',
  },
  4: {
    name: 'The Architect', glyph: '⬡', accent: '#3B82F6', light: '#EFF6FF',
    tagline:  'Build. The unglamorous task has compound interest.',
    embrace:  'Disciplined effort, structure, long-view planning',
    avoid:    'Shortcuts, cutting corners, skipping foundations',
    advice:   'The unglamorous task you\'ve been postponing pays compound interest. Do it today.',
  },
  5: {
    name: 'The Seeker', glyph: '◉', accent: '#F97316', light: '#FFF7ED',
    tagline:  'Adapt. The deviation is the point, not the detour.',
    embrace:  'Adaptability, curiosity, breaking old routines',
    avoid:    'Rigidity, over-commitment, clinging to what\'s familiar',
    advice:   'Say yes to the unexpected invitation. The deviation is the point today, not the detour.',
  },
  6: {
    name: 'The Keeper', glyph: '❋', accent: '#EC4899', light: '#FDF2F8',
    tagline:  'Tend. Small gestures land deeply today.',
    embrace:  'Nurturing relationships, beauty, acts of service',
    avoid:    'Neglecting your own needs to fix others, perfectionism',
    advice:   'Tend to the relationship that has been quietly asking for attention. Small gestures land today.',
  },
  7: {
    name: 'The Oracle', glyph: '✶', accent: '#6366F1', light: '#EEF2FF',
    tagline:  'Reflect. The insight won\'t come from more research.',
    embrace:  'Solitude, deep study, trusting inner knowing',
    avoid:    'Small talk, surface decisions, overcrowding your schedule',
    advice:   'Sit quietly for 15 minutes. The insight you need will not come from more research.',
  },
  8: {
    name: 'The Sovereign', glyph: '◈', accent: '#0D9488', light: '#F0FDFA',
    tagline:  'Decide. Your authority is most legible today.',
    embrace:  'Executive decisions, owning authority, financial moves',
    avoid:    'Giving your power away, deferring what you know is right',
    advice:   'Make the call you\'ve been delegating to circumstance. Your authority is most legible today.',
  },
  9: {
    name: 'The Sage', glyph: '✦', accent: '#D97706', light: '#FFFBEB',
    tagline:  'Release. New cycles follow clean endings.',
    embrace:  'Completion, generosity, releasing what no longer fits',
    avoid:    'Clinging, starting new things, forcing fresh beginnings',
    advice:   'Something is ready to be finished and released. Do that. New cycles follow clean endings.',
  },
}

// ─────────────────────────────────────────────────────────────
// Deeper Reading upsell tiers
// ─────────────────────────────────────────────────────────────
const READING_TIERS = [
  {
    id: 'daily-personal-oracle', icon: Clock,
    label: 'Daily Oracle', span: 'Every Day', price: 19, accent: '#F59E0B',
    promise: 'Personal Day energy, Moon phase, one action and one caution — every morning.',
  },
  {
    id: 'monthly-cycle-navigator', icon: Calendar,
    label: 'Monthly Navigator', span: '30 Days', price: 29, accent: '#A78BFA',
    promise: 'Peak windows, challenge dates, domain of emphasis, monthly intention.',
  },
  {
    id: 'annual-arc-keeper', icon: CalendarDays,
    label: 'Annual Arc', span: 'Full Year', price: 47, accent: '#10B981',
    promise: 'All 12 Personal Months, Solar Return, three peak windows, two caution periods.',
  },
  {
    id: 'nine-year-arc-compass', icon: Sparkles,
    label: 'Nine-Year Compass', span: '9 Years', price: 57, accent: '#3B82F6',
    promise: 'Every Personal Year, Pinnacle transitions, peak decade located, decade framework.',
  },
]

// ─────────────────────────────────────────────────────────────
// Compact Energy Arc
// ─────────────────────────────────────────────────────────────
function EnergyArc({ level, accent }: { level: number; accent: string }) {
  const r = 36, circ = 2 * Math.PI * r, arc = circ * 0.75, fill = arc * (level / 5)
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(0,0,0,0.07)"
        strokeWidth="6" strokeDasharray={`${arc} ${circ - arc}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round" />
      <motion.circle cx="40" cy="40" r={r} fill="none" stroke={accent}
        strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${fill} ${circ - fill}`} strokeDashoffset={circ * 0.125}
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${fill} ${circ - fill}` }}
        transition={{ duration: 1.3, ease: 'easeOut', delay: 0.2 }}
        style={{ filter: `drop-shadow(0 0 4px ${accent}55)` }} />
      <text x="40" y="36" textAnchor="middle" fill="#1e1b4b"
        fontSize="16" fontFamily="Georgia,serif" fontWeight="700">{level}</text>
      <text x="40" y="48" textAnchor="middle" fill="#9ca3af"
        fontSize="6" fontFamily="sans-serif" letterSpacing="1.5">OF 5</text>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// Upsell Popover
// ─────────────────────────────────────────────────────────────
function UpsellPopover({ open, onClose, router }: { open: boolean; onClose: () => void; router: any }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div ref={ref}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="absolute bottom-full left-0 right-0 mb-3 rounded-2xl overflow-hidden z-20 bg-white"
          style={{ border: '1px solid rgba(99,102,241,0.14)', boxShadow: '0 -10px 40px rgba(99,102,241,0.13)' }}>

          <div className="px-4 py-3 border-b border-indigo-50 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] text-indigo-400 uppercase">Hyper-Personalised</p>
              <p className="text-sm font-semibold text-indigo-900 mt-0.5">Choose Your Time Horizon</p>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition">
              <X className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          </div>

          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {READING_TIERS.map((tier, i) => {
              const Icon = tier.icon
              return (
                <motion.button key={tier.id}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => { onClose(); router.push(`/purchase/${tier.id}`) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left group transition-all hover:shadow-md"
                  style={{ background: `${tier.accent}0D`, border: `1px solid ${tier.accent}22` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${tier.accent}1A` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: tier.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-semibold text-neutral-800">{tier.label}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${tier.accent}18`, color: tier.accent }}>{tier.span}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 line-clamp-1">{tier.promise}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <span className="text-sm font-bold" style={{ color: tier.accent }}>${tier.price}</span>
                    <span className="text-[10px] text-neutral-400">/mo</span>
                  </div>
                </motion.button>
              )
            })}
          </div>
          <p className="text-[10px] text-center text-neutral-400 px-4 pb-3">
            Hyper-personalised to your complete synthesis profile
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────
// Tool match card
// ─────────────────────────────────────────────────────────────
const CAT_ACCENT: Record<string, string> = {
  'love': '#EC4899', 'wealth': '#10B981', 'wellness': '#8B5CF6',
  'life-path': '#F59E0B', 'oracle-temple': '#6366F1',
  'time-keeper': '#14B8A6', 'voice': '#7C3AED', 'sacred-script': '#F97316',
}
function MatchCard({ tool, idx, onSelect }: { tool: any; idx: number; onSelect: () => void }) {
  const accent = CAT_ACCENT[tool.domain ?? tool.category ?? ''] ?? '#6366F1'
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      onClick={onSelect}
      className="w-full text-left flex items-start gap-3 p-3.5 rounded-2xl border border-neutral-100 hover:border-indigo-200 hover:shadow-md bg-white transition-all group">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
        style={{ background: `${accent}12`, border: `1px solid ${accent}22` }}>
        {tool.emoji ?? '🔮'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <span className="text-sm font-semibold text-neutral-800 line-clamp-1 group-hover:text-indigo-700 transition">{tool.name}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: `${accent}15`, color: accent }}>{tool.matchScore}%</span>
        </div>
        <p className="text-[11px] text-neutral-400 line-clamp-1 mb-1.5">
          {tool.tagline ?? tool.hook?.slice(0, 80) ?? 'A powerful synthesis reading'}
        </p>
        <div className="flex items-center gap-1.5">
          <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />)}</div>
          <span className="text-[10px] text-neutral-400">{tool.reviewCount?.toLocaleString() ?? '1,000'}+</span>
          <span className="ml-auto text-sm font-bold" style={{ color: accent }}>${tool.price}</span>
        </div>
      </div>
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────
// Matching modal
// ─────────────────────────────────────────────────────────────
function MatchingModal({ open, onClose, tools, vibration, loading, router }: any) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(17,14,50,0.65)', backdropFilter: 'blur(10px)' }}
          onClick={onClose}>
          <motion.div
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden bg-white"
            style={{ maxHeight: '90vh', boxShadow: '0 -20px 60px rgba(99,102,241,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b border-indigo-50"
              style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] text-indigo-400 uppercase mb-1">Vibrational Match</p>
                  <h2 className="text-lg font-serif text-indigo-900">Aligned Tools For Today</h2>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition shadow-sm">
                  <X className="w-4 h-4 text-indigo-400" />
                </button>
              </div>
              <p className="text-xs text-indigo-400/70 mt-1">Based on your {vibration} vibration today</p>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-2" style={{ maxHeight: 'calc(90vh - 160px)' }}>
              {loading
                ? <div className="flex items-center justify-center py-16">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500" />
                  </div>
                : tools.length === 0
                  ? <div className="text-center py-16">
                      <Compass className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
                      <p className="text-neutral-400 text-sm">No aligned tools found today</p>
                    </div>
                  : tools.map((t: any, i: number) => (
                      <MatchCard key={t.id} tool={t} idx={i}
                        onSelect={() => { onClose(); router.push(`/purchase/${t.id}`) }} />
                    ))
              }
            </div>
            {tools.length > 0 && (
              <div className="px-5 pb-5 pt-2 border-t border-neutral-100">
                <button onClick={() => { onClose(); router.push('/dashboard') }}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-white hover:brightness-110 transition"
                  style={{ background: 'linear-gradient(90deg,#6366F1,#8B5CF6)' }}>
                  Browse All Tools
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────
// safeStr — backend sometimes returns objects instead of strings.
// Safely extracts a renderable string from any shape.
// ─────────────────────────────────────────────────────────────
function safeStr(val: any, fallback = ''): string {
  if (!val) return fallback
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    return val.description ?? val.guidance ?? val.advice ?? val.name ?? fallback
  }
  return String(val)
}

// ─────────────────────────────────────────────────────────────
// Full Insights Modal
// ─────────────────────────────────────────────────────────────
function InsightsModal({ open, onClose, date, personalDay, vibration, vibrationMeaning,
  energyLevel, energyDescription, insightMessage, embrace, avoid, advice,
  downloadingPdf, onDownloadPdf, router }: any) {

  const [showUpsell, setShowUpsell] = useState(false)
  const arch = ARCHETYPES[personalDay] ?? ARCHETYPES[5]

  // Use backend values when available, fall back to archetype defaults
  // safeStr guards against backend returning objects instead of strings
  const embraceText  = safeStr(embrace,  arch.embrace)
  const avoidText    = safeStr(avoid,    arch.avoid)
  const adviceText   = safeStr(advice,   arch.advice)

  const forecast = [
    { range: '6 AM – 10 AM',  label: 'Building',                                    accent: '#10B981' },
    { range: '10 AM – 2 PM',  label: safeStr(energyDescription, 'Peak Focus'),       accent: '#F59E0B' },
    { range: '2 PM – 6 PM',   label: 'Creative Flow',                               accent: '#8B5CF6' },
    { range: '6 PM – 10 PM',  label: 'Integration',                                 accent: '#6366F1' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(17,14,50,0.65)', backdropFilter: 'blur(10px)' }}
          onClick={() => { onClose(); setShowUpsell(false) }}>
          <motion.div
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden bg-white"
            style={{ maxHeight: '92vh', boxShadow: '0 -20px 60px rgba(99,102,241,0.12)' }}
            onClick={e => e.stopPropagation()}>

            <div className="px-6 pt-5 pb-4 border-b border-neutral-100"
              style={{ background: `linear-gradient(135deg,${arch.light},white)` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1"
                    style={{ color: arch.accent + 'AA' }}>Full Reading</p>
                  <h2 className="text-lg font-serif text-neutral-900">
                    Day {personalDay} — {arch.name}
                  </h2>
                </div>
                <button onClick={() => { onClose(); setShowUpsell(false) }}
                  className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition">
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-1">{date} · {vibration} Vibration</p>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 108px)' }}>
              <div className="px-6 py-5 space-y-4">

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl p-4 border"
                    style={{ background: arch.light, borderColor: arch.accent + '28' }}>
                    <p className="text-[10px] font-bold tracking-widest uppercase mb-2"
                      style={{ color: arch.accent + '88' }}>Energy</p>
                    <p className="text-xl font-serif mb-2" style={{ color: arch.accent }}>{safeStr(vibration)}</p>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(l => (
                        <div key={l} className="flex-1 h-1.5 rounded-full"
                          style={{ background: l <= energyLevel ? arch.accent : arch.accent + '20' }} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl p-4 bg-indigo-50 border border-indigo-100">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-indigo-400/70 mb-2">Archetype</p>
                    <p className="text-xl font-serif text-indigo-700">{arch.name}</p>
                    <p className="text-xs text-indigo-500 mt-1">{arch.glyph} Day {personalDay}</p>
                  </div>
                </div>

                <div className="rounded-2xl p-5 bg-neutral-50 border border-neutral-100">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 mb-2">Vibration Reading</p>
                  <p className="text-sm text-neutral-700 leading-relaxed">{safeStr(vibrationMeaning)}</p>
                </div>

                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">Today's Oracle</p>

                  <div className="flex items-start gap-3 rounded-xl p-4"
                    style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-600/70 mb-0.5">Embrace</p>
                      <p className="text-sm text-emerald-800">{embraceText}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl p-4"
                    style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                    <ShieldAlert className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-orange-500/70 mb-0.5">What To Avoid</p>
                      <p className="text-sm text-orange-800">{avoidText}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl p-4"
                    style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-blue-500/70 mb-0.5">Today's Guidance</p>
                      <p className="text-sm text-blue-800 leading-relaxed">{adviceText}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 mb-3">Energy By Hour</p>
                  <div className="space-y-2">
                    {forecast.map(({ range, label, accent }) => (
                      <div key={range}
                        className="flex items-center justify-between rounded-xl px-4 py-3 bg-neutral-50 border border-neutral-100">
                        <span className="text-xs text-neutral-500">{range}</span>
                        <span className="text-xs font-semibold" style={{ color: accent }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl p-5 bg-indigo-50 border border-indigo-100">
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-indigo-700 leading-relaxed">{safeStr(insightMessage)}</p>
                  </div>
                </div>

                <div className="relative pb-1">
                  <UpsellPopover open={showUpsell} onClose={() => setShowUpsell(false)} router={router} />
                  <div className="flex gap-2.5">
                    {/* ── Download PDF — calls backend ──────────── */}
                    <button
                      onClick={onDownloadPdf}
                      disabled={downloadingPdf}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 transition disabled:opacity-60">
                      {downloadingPdf
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                      {downloadingPdf ? 'Generating…' : 'Download PDF'}
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowUpsell(v => !v)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white hover:brightness-110 shadow-md transition"
                      style={{ background: `linear-gradient(90deg,${arch.accent},${arch.accent}CC)` }}>
                      <Zap className="w-4 h-4" />
                      Deeper Reading
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showUpsell ? 'rotate-180' : ''}`} />
                    </motion.button>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────
// Skeleton loader — shown while fetching from backend
// ─────────────────────────────────────────────────────────────
function GuidanceSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse"
      style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1px solid rgba(99,102,241,0.13)' }}>
      <div className="h-0.5 w-full bg-indigo-200/50" />
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-14 h-14 rounded-2xl bg-white/50" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/50 rounded w-1/3" />
          <div className="h-2.5 bg-white/40 rounded w-1/4" />
          <div className="h-2 bg-white/30 rounded w-2/3" />
        </div>
        <div className="w-16 h-16 rounded-full bg-white/30 hidden sm:block" />
      </div>
      <div className="px-5 pb-4 flex gap-2.5">
        <div className="flex-1 h-9 rounded-xl bg-white/30" />
        <div className="flex-1 h-9 rounded-xl bg-white/20" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Error state — shown when backend is unreachable
// ─────────────────────────────────────────────────────────────
function GuidanceError({ onRetry, arch }: { onRetry: () => void; arch: any }) {
  return (
    <div className="rounded-2xl overflow-hidden px-5 py-4 flex items-center justify-between gap-4"
      style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1px solid rgba(99,102,241,0.13)' }}>
      <div className="flex items-center gap-3">
        <WifiOff className="w-5 h-5 text-indigo-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-indigo-900">Using cached guidance</p>
          <p className="text-xs text-indigo-400">Live synthesis unavailable right now</p>
        </div>
      </div>
      <button onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white text-indigo-700 transition">
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN — DailyGuidance component
// ─────────────────────────────────────────────────────────────
export const DailyGuidance = ({
  userName,
  greeting,
  date,
  time,
  personalDay:        personalDayProp,
  vibration:          vibrationProp         = 'High',
  vibrationMeaning:   vibrationMeaningProp  = 'Today your energy is amplified. What you think manifests quickly.',
  energyLevel:        energyLevelProp       = 4,
  energyDescription:  energyDescProp        = 'Peak energy from 10 AM – 2 PM',
  insightMessage:     insightMsgProp        = "Today's vibration aligns with Omni-Seer readings. 23 people with your energy discovered their path.",
  userId,
  dob,
  birthTime,
  birthLocation,
}: DailyGuidanceProps) => {
  const router   = useRouter()
  const supabase = createClient()
  const firstName = userName.split(' ')[0]

  // ── Backend state ─────────────────────────────────────────
  const [backendData,    setBackendData]    = useState<BackendGuidance | null>(null)
  const [fetchState,     setFetchState]     = useState<'loading'|'success'|'error'|'idle'>('idle')
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // ── UI state ──────────────────────────────────────────────
  const [showMatchModal,   setShowMatchModal]   = useState(false)
  const [showInsightModal, setShowInsightModal] = useState(false)
  const [matchedTools,     setMatchedTools]     = useState<any[]>([])
  const [purchasedIds,     setPurchasedIds]     = useState<Set<string>>(new Set())
  const [loadingTools,     setLoadingTools]     = useState(false)

  // ── Resolved values — backend wins, prop is fallback ─────
  const personalDay       = backendData?.personalDay       ?? personalDayProp
  const vibration         = backendData?.vibration          ?? vibrationProp
  const vibrationMeaning  = backendData?.vibrationMeaning  ?? vibrationMeaningProp
  const energyLevel       = backendData?.energyLevel       ?? energyLevelProp
  const energyDescription = backendData?.energyDescription ?? energyDescProp
  const insightMessage    = backendData?.insightMessage    ?? insightMsgProp

  const arch       = ARCHETYPES[personalDay] ?? ARCHETYPES[5]
  const greetEmoji = greeting.includes('Morning') ? '☀️' : greeting.includes('Afternoon') ? '⛅' : '🌙'

  // ── Fetch daily guidance from backend ────────────────────
  const fetchGuidance = async () => {
    // Skip external API on localhost — use prop fallbacks instead
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('DailyGuidance: localhost detected, skipping external API call')
      return
    }

    if (!dob && !userId) {
      setFetchState('idle')
      return
    }
    setFetchState('loading')
    try {
      const params = new URLSearchParams()
      if (dob)           params.set('dob',            dob)
      if (birthTime)     params.set('birth_time',     birthTime)
      if (birthLocation) params.set('birth_location', birthLocation)
      if (userId)        params.set('user_id',        userId)

      const isPersonal = !!(dob && userId)
      const endpoint = isPersonal
        ? `${API_BASE}/daily-insight/${userId}`
        : `${API_BASE}/daily-card?${params.toString()}`
      const fetchOptions: RequestInit = isPersonal
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: userName || '',
              dob: dob,
              birth_time: birthTime || null,
              birth_location: birthLocation || null,
            }),
          }
        : {
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
          }
      const res = await fetch(endpoint, fetchOptions)

      if (!res.ok) throw new Error(`API ${res.status}`)

      const raw = await res.json()
      // Normalise field names — /daily-insight uses different keys
      const data: BackendGuidance = {
        ...raw,
        embrace: raw.embrace ?? raw.opportunities ?? undefined,
        avoid:   raw.avoid   ?? raw.avoidToday    ?? undefined,
        advice:  raw.advice  ?? raw.insightMessage ?? undefined,
      }
      setBackendData(data)
      setFetchState('success')
    } catch (err) {
      console.warn('DailyGuidance: backend unavailable, using prop fallbacks', err)
      setFetchState('error')
    }
  }

  useEffect(() => { fetchGuidance() }, [dob, userId])

  // ── Fetch purchased tools ─────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const run = async () => {
      try {
        const { data: p } = await supabase.from('purchases').select('tool_id').eq('user_id', userId)
        if (p) setPurchasedIds(new Set(p.map((x: any) => x.tool_id)))
      } catch {}
    }
    run()
  }, [userId])

  // ── Tool matching — backend recommendations first ─────────
  const findMatchingTools = async () => {
    setLoadingTools(true)

    // Try to use backend recommended tool IDs first
    if (backendData?.recommended_tools && backendData.recommended_tools.length > 0) {
      const recommended = backendData.recommended_tools
        .map(id => allTools.find(t => t.id === id))
        .filter(Boolean)
        .filter((t: any) => !purchasedIds.has(t.id))
        .map((t: any, i) => ({ ...t, matchScore: Math.max(99 - i * 5, 70) }))

      if (recommended.length > 0) {
        setMatchedTools(recommended.slice(0, 6))
        setLoadingTools(false)
        return
      }
    }

    // Fallback — local scoring algorithm
    const scored = allTools.map((tool: any) => {
      let s   = (personalDay % 9 || 9) * 3
      const d = (tool.domain ?? tool.category ?? '') as string
      if (vibration === 'High')        { if (d === 'oracle-temple' || d === 'wellness') s += 25; if (tool.isPopular) s += 15 }
      else if (vibration === 'Medium') { if (d === 'love' || d === 'life-path') s += 20 }
      else                             { if (d === 'wellness' || d === 'voice') s += 20 }
      if (energyLevel >= 4)      { if (tool.price > 50) s += 15; if (d === 'wealth') s += 20 }
      else if (energyLevel >= 3) { if (tool.price < 40) s += 10; if (d === 'love') s += 15 }
      else                       { if (tool.price < 30) s += 15 }
      if (tool.isNew)     s += 10
      if (tool.isPopular) s += 15
      if (purchasedIds.has(tool.id)) s = 0
      return { ...tool, matchScore: Math.min(Math.round(s), 99) }
    })
    setMatchedTools(scored.filter(t => t.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore).slice(0, 6))
    setLoadingTools(false)
  }

  useEffect(() => { if (showMatchModal) findMatchingTools() }, [showMatchModal])

  // ── Download PDF — calls backend ──────────────────────────
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const params = new URLSearchParams()
      if (dob)           params.set('dob',            dob)
      if (birthTime)     params.set('birth_time',     birthTime)
      if (birthLocation) params.set('birth_location', birthLocation)
      if (userId)        params.set('user_id',        userId ?? '')
      params.set('name', userName)

      const res = await fetch(`${API_BASE}/daily-card/pdf?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) throw new Error('PDF generation failed')

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `KAYAL-Daily-Guidance-${date.replace(/\s/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download failed:', err)
      // Silently fail — PDF is a nice-to-have
    } finally {
      setDownloadingPdf(false)
    }
  }

  // ── Render ────────────────────────────────────────────────
  if (fetchState === 'loading') return <GuidanceSkeleton />

  return (
    <>
      {fetchState === 'error' && (
        <GuidanceError onRetry={fetchGuidance} arch={arch} />
      )}

      <div className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg,#f5f3ff 0%,#ede9fe 55%,#e0e7ff 100%)',
          border: '1px solid rgba(99,102,241,0.13)',
          boxShadow: '0 2px 20px rgba(99,102,241,0.08)',
        }}>

        <div className="absolute -top-8 -left-8 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-50"
          style={{ background: `radial-gradient(ellipse,${arch.accent}30 0%,transparent 70%)` }} />

        <div className="h-0.5 w-full"
          style={{ background: `linear-gradient(90deg,${arch.accent},rgba(99,102,241,0.6),transparent)` }} />

        <div className="relative flex items-center gap-4 px-5 py-4">

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 18 }}
            className="relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 bg-white shadow-sm"
            style={{ border: `1.5px solid ${arch.accent}40` }}>
            <span className="text-2xl font-serif leading-none" style={{ color: arch.accent }}>{personalDay}</span>
            <span className="text-[7px] font-bold tracking-widest text-neutral-400 uppercase mt-0.5">Day</span>
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] shadow-sm"
              style={{ background: arch.accent, color: 'white' }}>{arch.glyph}</div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{greetEmoji}</span>
                <span className="text-sm font-serif text-neutral-900">{firstName}</span>
                <span className="text-xs text-neutral-400">· {time}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Live indicator — shown when backend data is fresh */}
                {fetchState === 'success' && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 border border-green-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-green-700 tracking-widest uppercase">Live</span>
                  </span>
                )}
                <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2.5, repeat: Infinity }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: arch.accent + '18', border: `1px solid ${arch.accent}30` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: arch.accent }} />
                  <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: arch.accent }}>
                    {safeStr(vibration)}
                  </span>
                </motion.div>
              </div>
            </div>

            <p className="text-[11px] font-semibold mb-1" style={{ color: arch.accent }}>
              {arch.name}
            </p>

            <p className="text-xs text-neutral-600 leading-snug line-clamp-2">{arch.tagline}</p>
          </div>

          <div className="flex-shrink-0 hidden sm:block">
            <EnergyArc level={energyLevel} accent={arch.accent} />
          </div>

        </div>

        <div className="sm:hidden flex gap-1 px-5 pb-3">
          {[1,2,3,4,5].map(l => (
            <motion.div key={l} className="flex-1 h-1 rounded-full"
              style={{ background: l <= energyLevel ? arch.accent : arch.accent + '20' }}
              initial={{ scaleX: 0, originX: '0%' }} animate={{ scaleX: 1 }}
              transition={{ delay: l * 0.07 }} />
          ))}
        </div>

        <div className="px-5 pb-4 flex gap-2.5">
          <button
            onClick={() => setShowMatchModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition hover:brightness-110 active:scale-95 shadow-sm"
            style={{ background: `linear-gradient(90deg,${arch.accent},${arch.accent}BB)` }}>
            <Sparkles className="w-3.5 h-3.5" />
            Find Aligned Tools
          </button>
          <button
            onClick={() => setShowInsightModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-white/80 border border-indigo-100 text-indigo-700 hover:shadow-sm transition active:scale-95">
            <Activity className="w-3.5 h-3.5" />
            Full Insights
          </button>
        </div>

      </div>

      <MatchingModal open={showMatchModal} onClose={() => setShowMatchModal(false)}
        tools={matchedTools} vibration={vibration} loading={loadingTools} router={router} />

      <InsightsModal
        open={showInsightModal}
        onClose={() => setShowInsightModal(false)}
        date={date}
        personalDay={personalDay}
        vibration={vibration}
        vibrationMeaning={vibrationMeaning}
        energyLevel={energyLevel}
        energyDescription={energyDescription}
        insightMessage={insightMessage}
        embrace={backendData?.embrace}
        avoid={backendData?.avoid}
        advice={backendData?.advice}
        downloadingPdf={downloadingPdf}
        onDownloadPdf={handleDownloadPdf}
        router={router}
      />
    </>
  )
}
