'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, X, Star, Clock, Heart, TrendingUp,
  BookOpen, Mic, Crown, ArrowRight, Download,
  Activity, Users, ChevronDown, Compass
} from 'lucide-react'

// ─── Corrected imports — aligned with actual export names ────
import { omniTools }         from '@/lib/constants/omni-seer-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'

const allTools = [
  ...omniTools, ...voiceTools, ...sacredScriptTools,
  ...timeKeeperTools, ...loveTools, ...wealthTools,
  ...wellnessTools, ...lifePathTools,
]

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface DailyGuidanceProps {
  userName:          string
  greeting:          string
  date:              string
  time:              string
  personalDay:       number
  vibration?:        string
  vibrationMeaning?: string
  energyLevel?:      number   // 1–5
  energyDescription?: string
  insightMessage?:   string
  userId?:           string
}

// ─────────────────────────────────────────────────────────────
// Personal Day archetypes
// ─────────────────────────────────────────────────────────────
const DAY_ARCHETYPES: Record<number, { name: string; glyph: string; colour: string; action: string }> = {
  1: { name: 'The Pioneer',     glyph: '✦', colour: '#F59E0B', action: 'Initiate. Lead. Begin.' },
  2: { name: 'The Weaver',      glyph: '◈', colour: '#A78BFA', action: 'Connect. Receive. Rest.' },
  3: { name: 'The Alchemist',   glyph: '✵', colour: '#34D399', action: 'Create. Express. Share.' },
  4: { name: 'The Architect',   glyph: '⬡', colour: '#60A5FA', action: 'Build. Structure. Commit.' },
  5: { name: 'The Seeker',      glyph: '◉', colour: '#F97316', action: 'Adapt. Explore. Change.' },
  6: { name: 'The Keeper',      glyph: '❋', colour: '#EC4899', action: 'Nurture. Harmonise. Heal.' },
  7: { name: 'The Oracle',      glyph: '✶', colour: '#818CF8', action: 'Reflect. Study. Trust.' },
  8: { name: 'The Sovereign',   glyph: '◈', colour: '#6EE7B7', action: 'Decide. Execute. Own.' },
  9: { name: 'The Sage',        glyph: '✦', colour: '#FCD34D', action: 'Complete. Release. Give.' },
}

// ─────────────────────────────────────────────────────────────
// Animated Arc — energy visualisation
// ─────────────────────────────────────────────────────────────
function EnergyArc({ level }: { level: number }) {
  const pct   = level / 5
  const r     = 54
  const circ  = 2 * Math.PI * r
  const dash  = circ * 0.75   // 270° arc
  const gap   = circ - dash
  const fill  = dash * pct

  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28">
      {/* Track */}
      <circle
        cx="60" cy="60" r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="8"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={circ * 0.125}
        strokeLinecap="round"
      />
      {/* Fill — animated */}
      <motion.circle
        cx="60" cy="60" r={r}
        fill="none"
        stroke="url(#arcGrad)"
        strokeWidth="8"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeDashoffset={circ * 0.125}
        strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${fill} ${circ - fill}` }}
        transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
      />
      {/* Gradient */}
      <defs>
        <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      {/* Centre label */}
      <text x="60" y="56" textAnchor="middle" fill="white" fontSize="20" fontFamily="serif" fontWeight="700">
        {level}
      </text>
      <text x="60" y="70" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="sans-serif" letterSpacing="2">
        OF 5
      </text>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// Floating particle (pure CSS animation via motion)
// ─────────────────────────────────────────────────────────────
function Particle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <motion.div
      className="absolute w-0.5 h-0.5 rounded-full bg-amber-300/60 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{ y: [0, -18, 0], opacity: [0.3, 0.8, 0.3] }}
      transition={{ duration: 3 + delay, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  )
}

const PARTICLES = [
  { x: 8,  y: 30, delay: 0   }, { x: 18, y: 60, delay: 0.5 },
  { x: 75, y: 20, delay: 1   }, { x: 85, y: 55, delay: 0.3 },
  { x: 50, y: 80, delay: 1.2 }, { x: 92, y: 75, delay: 0.8 },
  { x: 35, y: 15, delay: 0.6 }, { x: 62, y: 40, delay: 1.5 },
]

// ─────────────────────────────────────────────────────────────
// Tool category config
// ─────────────────────────────────────────────────────────────
const CAT_CONFIG: Record<string, { icon: any; colour: string; bg: string }> = {
  'love':          { icon: Heart,     colour: 'text-rose-300',   bg: 'bg-rose-500/15 border-rose-400/20' },
  'wealth':        { icon: TrendingUp,colour: 'text-emerald-300',bg: 'bg-emerald-500/15 border-emerald-400/20' },
  'wellness':      { icon: Sparkles,  colour: 'text-purple-300', bg: 'bg-purple-500/15 border-purple-400/20' },
  'life-path':     { icon: Crown,     colour: 'text-amber-300',  bg: 'bg-amber-500/15 border-amber-400/20' },
  'oracle-temple': { icon: Crown,     colour: 'text-indigo-300', bg: 'bg-indigo-500/15 border-indigo-400/20' },
  'time-keeper':   { icon: Clock,     colour: 'text-teal-300',   bg: 'bg-teal-500/15 border-teal-400/20' },
  'voice':         { icon: Mic,       colour: 'text-violet-300', bg: 'bg-violet-500/15 border-violet-400/20' },
  'sacred-script': { icon: BookOpen,  colour: 'text-amber-300',  bg: 'bg-amber-500/15 border-amber-400/20' },
}
const DEFAULT_CAT = { icon: Sparkles, colour: 'text-white/60', bg: 'bg-white/10 border-white/10' }

// ─────────────────────────────────────────────────────────────
// Tool Match Card (inside modal)
// ─────────────────────────────────────────────────────────────
function MatchCard({ tool, idx, onSelect }: { tool: any; idx: number; onSelect: () => void }) {
  const cat = CAT_CONFIG[tool.domain] ?? DEFAULT_CAT
  const Icon = cat.icon
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      onClick={onSelect}
      className={`w-full text-left flex items-start gap-3.5 p-3.5 rounded-2xl border
        ${cat.bg} hover:border-white/20 hover:bg-white/10 transition-all group`}
    >
      <div className={`w-9 h-9 rounded-xl ${cat.bg} border flex items-center justify-center flex-shrink-0 text-lg`}>
        {tool.emoji ?? <Icon className={`w-4 h-4 ${cat.colour}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <span className="text-sm font-medium text-white/90 leading-snug truncate group-hover:text-white transition">
            {tool.name}
          </span>
          <span className="text-[11px] font-bold text-amber-300 flex-shrink-0 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
            {tool.matchScore}%
          </span>
        </div>
        <p className="text-[11px] text-white/45 leading-snug line-clamp-1 mb-1.5">
          {tool.tagline ?? tool.hook?.slice(0, 80) ?? 'A powerful synthesis reading'}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-2.5 h-2.5 ${s <= 5 ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} />
            ))}
          </div>
          <span className="text-[10px] text-white/35">{tool.reviewCount?.toLocaleString() ?? '—'} reviews</span>
          <span className="ml-auto text-sm font-bold text-amber-300">${tool.price}</span>
        </div>
      </div>
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────
// Matching Tools Modal
// ─────────────────────────────────────────────────────────────
function MatchingModal({
  open, onClose, tools, vibration, loading, router
}: { open: boolean; onClose: () => void; tools: any[]; vibration: string; loading: boolean; router: any }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(6,5,20,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg,#0f0c29 0%,#1a1040 50%,#0d1117 100%)', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(ellipse,rgba(167,139,250,0.25) 0%,transparent 70%)' }} />

            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-white/8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-amber-400/70 uppercase mb-1">
                    Vibrational Match
                  </p>
                  <h2 className="text-lg font-serif text-white">Tools Aligned To You Today</h2>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
              <p className="text-xs text-white/40 mt-1">Based on your {vibration} vibration</p>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-4 space-y-2.5" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 rounded-full border-2 border-amber-400/30 border-t-amber-400" />
                </div>
              ) : tools.length === 0 ? (
                <div className="text-center py-16">
                  <Compass className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No aligned tools found today</p>
                </div>
              ) : (
                tools.map((tool, i) => (
                  <MatchCard key={tool.id} tool={tool} idx={i} onSelect={() => {
                    onClose()
                    router.push(`/purchase/${tool.id}`)
                  }} />
                ))
              )}
            </div>

            {/* Footer CTA */}
            {tools.length > 0 && (
              <div className="px-5 pb-6 pt-2">
                <button
                  onClick={() => { onClose(); router.push('/dashboard') }}
                  className="w-full py-3 rounded-2xl font-semibold text-sm text-amber-950 transition hover:brightness-110"
                  style={{ background: 'linear-gradient(90deg,#F59E0B,#FBBF24)' }}
                >
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
// Full Insights Modal
// ─────────────────────────────────────────────────────────────
function InsightsModal({
  open, onClose, date, personalDay, vibration, vibrationMeaning, energyLevel, energyDescription, insightMessage
}: any) {
  const forecast = [
    { range: '6 AM – 10 AM',  label: 'Building',        accent: '#34D399' },
    { range: '10 AM – 2 PM',  label: energyDescription, accent: '#F59E0B' },
    { range: '2 PM – 6 PM',   label: 'Creative Flow',   accent: '#818CF8' },
    { range: '6 PM – 10 PM',  label: 'Integration',     accent: '#60A5FA' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(6,5,20,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg,#0f0c29 0%,#1a1040 50%,#0d1117 100%)', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Ambient */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(ellipse,rgba(245,158,11,0.15) 0%,transparent 70%)' }} />

            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-white/8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-amber-400/70 uppercase mb-1">Complete Reading</p>
                  <h2 className="text-lg font-serif text-white">Daily Insights</h2>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
              <p className="text-xs text-white/40 mt-1">{date} · Personal Day {personalDay} · {vibration} Vibration</p>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-5" style={{ maxHeight: 'calc(92vh - 120px)' }}>

              {/* Energy summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <p className="text-[10px] font-bold text-amber-400/60 tracking-widest uppercase mb-2">Energy</p>
                  <p className="text-2xl font-serif text-amber-300">{vibration}</p>
                  <div className="flex gap-0.5 mt-2">
                    {[1,2,3,4,5].map(l => (
                      <div key={l} className={`flex-1 h-1 rounded-full transition-all ${l <= energyLevel ? 'bg-amber-400' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.15)' }}>
                  <p className="text-[10px] font-bold text-indigo-400/60 tracking-widest uppercase mb-2">Personal Day</p>
                  <p className="text-2xl font-serif text-indigo-300">{personalDay}</p>
                  <p className="text-[10px] text-white/35 mt-2 leading-snug">{DAY_ARCHETYPES[personalDay]?.name ?? 'The Seeker'}</p>
                </div>
              </div>

              {/* Vibration meaning */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-3">What This Means</p>
                <p className="text-sm text-white/75 leading-relaxed">{vibrationMeaning}</p>
              </div>

              {/* Hour forecast */}
              <div>
                <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-3">Energy Forecast</p>
                <div className="space-y-2">
                  {forecast.map(({ range, label, accent }) => (
                    <div key={range} className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs text-white/45">{range}</span>
                      <span className="text-xs font-medium" style={{ color: accent }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Community insight */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-white/65 leading-relaxed">{insightMessage}</p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-3">Today's Guidance</p>
                <ul className="space-y-2.5">
                  {[
                    'Best moment for important decisions: 11:30 AM',
                    'Favourable for initiating new projects or conversations',
                    'Evening reflection amplifies tomorrow\'s clarity',
                  ].map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-amber-400 text-xs mt-0.5">✦</span>
                      <span className="text-sm text-white/60">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Download */}
              <button className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition hover:brightness-110"
                style={{ background: 'linear-gradient(90deg,rgba(245,158,11,0.15),rgba(167,139,250,0.15))', border: '1px solid rgba(245,158,11,0.25)', color: '#FBBF24' }}>
                <Download className="w-4 h-4" />
                Download Full Insights PDF
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export const DailyGuidance = ({
  userName,
  greeting,
  date,
  time,
  personalDay,
  vibration        = 'High',
  vibrationMeaning = 'Today your energy is amplified. What you think manifests quickly.',
  energyLevel      = 4,
  energyDescription = 'Peak energy from 10 AM – 2 PM',
  insightMessage   = "Today's vibration aligns with Omni-Seer readings. 23 people with your energy discovered their path. Your intuition is at its peak right now.",
  userId,
}: DailyGuidanceProps) => {
  const router = useRouter()
  const supabase = createClient()
  const firstName = userName.split(' ')[0]

  const [showMatchModal,   setShowMatchModal]   = useState(false)
  const [showInsightModal, setShowInsightModal] = useState(false)
  const [matchedTools,     setMatchedTools]     = useState<any[]>([])
  const [purchasedIds,     setPurchasedIds]     = useState<Set<string>>(new Set())
  const [coupons,          setCoupons]          = useState<any[]>([])
  const [loading,          setLoading]          = useState(false)

  const archetype   = DAY_ARCHETYPES[personalDay] ?? DAY_ARCHETYPES[5]
  const greetEmoji  = greeting.includes('Morning') ? '☀️' : greeting.includes('Afternoon') ? '⛅' : '🌙'

  // ── Fetch user data ────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const fetchUserData = async () => {
      try {
        const { data: purchases } = await supabase.from('purchases').select('tool_id').eq('user_id', userId)
        if (purchases) setPurchasedIds(new Set(purchases.map((p: any) => p.tool_id)))
        const { data: activeCoupons } = await supabase.from('coupons').select('*').eq('is_active', true)
        setCoupons(activeCoupons ?? [])
      } catch {}
    }
    fetchUserData()
  }, [userId])

  // ── Find matching tools ─────────────────────────────────────
  const findMatchingTools = () => {
    setLoading(true)
    const scored = allTools.map((tool: any) => {
      let score = (personalDay % 9 || 9) * 3
      const dom  = (tool.domain ?? tool.category ?? '') as string

      if (vibration === 'High') {
        if (dom === 'oracle-temple' || dom === 'wellness') score += 25
        if (tool.isPopular)    score += 15
      } else if (vibration === 'Medium') {
        if (dom === 'love' || dom === 'life-path') score += 20
      } else {
        if (dom === 'wellness' || dom === 'voice') score += 20
      }
      if (energyLevel >= 4) { if (tool.price > 50) score += 15; if (dom === 'wealth' || dom === 'oracle-temple') score += 20 }
      else if (energyLevel >= 3) { if (tool.price < 40) score += 10; if (dom === 'love' || dom === 'life-path') score += 15 }
      else { if (tool.price < 30) score += 15; if (dom === 'wellness') score += 20 }
      if (tool.isNew)       score += 10
      if (tool.isPopular)   score += 15
      if (purchasedIds.has(tool.id)) score = 0
      const coupon = coupons.find(c => !c.applies_to?.length || c.applies_to?.includes(tool.id))
      return { ...tool, matchScore: Math.min(Math.round(score), 99), hasCoupon: !!coupon }
    })
    const top = scored.filter(t => t.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore).slice(0, 6)
    setMatchedTools(top)
    setLoading(false)
  }

  useEffect(() => { if (showMatchModal) findMatchingTools() }, [showMatchModal])

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="relative rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(145deg,#0d0b1e 0%,#120e2e 45%,#0a0d1a 100%)', border: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full blur-3xl opacity-40"
            style={{ background: `radial-gradient(ellipse,${archetype.colour}33 0%,transparent 70%)` }} />
          <div className="absolute -bottom-16 right-0 w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(ellipse,rgba(129,140,248,0.35) 0%,transparent 70%)' }} />
          {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}
        </div>

        {/* Decorative top bar */}
        <div className="relative h-px w-full" style={{ background: `linear-gradient(90deg,transparent,${archetype.colour}88,rgba(129,140,248,0.6),transparent)` }} />

        <div className="relative p-6 sm:p-7">

          {/* ── Row 1: Greeting ─────────────────────────────────── */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3.5">
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {greetEmoji}
              </motion.div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-0.5"
                  style={{ color: archetype.colour + 'AA' }}>
                  {greeting}
                </p>
                <h2 className="text-xl font-serif text-white leading-none">{firstName}</h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/30 leading-none">{time}</p>
              <p className="text-[10px] text-white/20 mt-0.5 max-w-[120px] text-right leading-snug">{date}</p>
            </div>
          </div>

          {/* ── Row 2: Personal Day Hero + Arc ──────────────────── */}
          <div className="flex items-center gap-5 mb-6 pb-6"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

            {/* Giant Day Number */}
            <div className="relative flex-shrink-0">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 16, stiffness: 180 }}
                className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center"
                style={{ background: `linear-gradient(135deg,${archetype.colour}22,${archetype.colour}08)`, border: `1px solid ${archetype.colour}33` }}
              >
                <span className="text-4xl font-serif leading-none" style={{ color: archetype.colour }}>
                  {personalDay}
                </span>
                <span className="text-[9px] font-bold tracking-[0.15em] text-white/30 uppercase mt-0.5">Day</span>
              </motion.div>
              {/* Glyph badge */}
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: archetype.colour, color: '#0d0b1e' }}>
                {archetype.glyph}
              </div>
            </div>

            {/* Archetype text */}
            <div className="flex-1 min-w-0">
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1"
                style={{ color: archetype.colour + '99' }}
              >
                Personal Day Archetype
              </motion.p>
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-serif text-white mb-1.5"
              >
                {archetype.name}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs font-medium tracking-wide"
                style={{ color: archetype.colour + 'BB' }}
              >
                {archetype.action}
              </motion.p>
            </div>

            {/* Energy Arc */}
            <div className="flex-shrink-0 hidden sm:block">
              <EnergyArc level={energyLevel} />
            </div>
          </div>

          {/* ── Mobile Energy Bar ───────────────────────────────── */}
          <div className="sm:hidden mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold tracking-widest uppercase text-white/35">Energy</p>
              <p className="text-[10px] text-white/30">{energyDescription}</p>
            </div>
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map(l => (
                <motion.div key={l} className="flex-1 h-1.5 rounded-full"
                  style={{ background: l <= energyLevel ? `linear-gradient(90deg,#F59E0B,#A78BFA)` : 'rgba(255,255,255,0.08)' }}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: l * 0.1, duration: 0.4 }}
                />
              ))}
            </div>
          </div>

          {/* ── Vibration Oracle Quote ───────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="relative mb-6 px-5 py-4 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', borderLeft: `3px solid ${archetype.colour}66`, border: `1px solid rgba(255,255,255,0.07)`, borderLeftColor: archetype.colour + '66', borderLeftWidth: '3px' }}
          >
            {/* Vibration badge */}
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: archetype.colour }}
              />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase"
                style={{ color: archetype.colour + '99' }}>
                {vibration} Vibration
              </span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed italic">
              "{vibrationMeaning}"
            </p>
          </motion.div>

          {/* ── Insight strip ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl"
            style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.14)' }}
          >
            <Activity className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/55 leading-relaxed">{insightMessage}</p>
          </motion.div>

          {/* ── CTAs ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            {/* Primary — Find Matching Tools */}
            <button
              onClick={() => setShowMatchModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl text-sm font-bold tracking-wide text-amber-950 transition hover:brightness-110 active:scale-95"
              style={{ background: 'linear-gradient(90deg,#F59E0B,#FBBF24,#F59E0B)', backgroundSize: '200% auto', animation: 'shimmer 3s linear infinite' }}
            >
              <Sparkles className="w-4 h-4" />
              Find Aligned Tools
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Secondary — Full Insights */}
            <button
              onClick={() => setShowInsightModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl text-sm font-semibold text-white/75 transition hover:text-white hover:bg-white/10 active:scale-95"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <Activity className="w-4 h-4" />
              Full Insights
            </button>
          </motion.div>

        </div>

        {/* Bottom energy bar */}
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg,transparent,${archetype.colour}44,rgba(129,140,248,0.4),transparent)` }} />
      </div>

      {/* Shimmer keyframe injection */}
      <style>{`@keyframes shimmer{0%{background-position:0% center}100%{background-position:200% center}}`}</style>

      {/* Modals */}
      <MatchingModal
        open={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        tools={matchedTools}
        vibration={vibration}
        loading={loading}
        router={router}
      />
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
      />
    </>
  )
}
