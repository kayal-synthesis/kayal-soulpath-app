'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, X, Star, Clock, Activity, Users, Compass,
  ShieldAlert, Lightbulb, Zap, CheckCircle, Calendar,
  CalendarDays, ChevronDown, Loader2,
} from 'lucide-react'

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

function reduce(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split('').reduce((a, d) => a + parseInt(d), 0)
  }
  return n
}

function calcPersonalDay(dob: string): number {
  if (!dob) return 5
  try {
    const birth = new Date(dob)
    const today = new Date()
    const birthMonth = birth.getMonth() + 1
    const birthDay   = birth.getDate()
    const yearDigits = String(today.getFullYear()).split('').reduce((a, d) => a + parseInt(d), 0)
    const personalMonth = reduce(birthMonth + birthDay + yearDigits)
    const personalDay   = reduce(personalMonth + today.getDate())
    return personalDay || 5
  } catch { return 5 }
}

function calcUniversalDay(): { day: number; meaning: string } {
  const t = new Date()
  const day = reduce(t.getDate() + t.getMonth() + 1 + String(t.getFullYear()).split('').reduce((a,d)=>a+parseInt(d),0))
  const meanings: Record<number, string> = {
    1: 'A collective day of new beginnings. The shared energy supports fresh starts and bold decisions. Ideas launched today carry unusual forward momentum.',
    2: 'A collective day of connection and diplomacy. The shared energy favours cooperation and listening. Partnerships formed today tend to be enduring.',
    3: 'A collective day of creativity and expression. The shared energy amplifies communication and social connection. What you share today reaches further.',
    4: 'A collective day of structure and discipline. The shared energy rewards methodical effort and careful planning. Shortcuts are costly today.',
    5: 'A collective day of movement and change. The shared energy is restless and dynamic. Unexpected opportunities arise for those who stay flexible.',
    6: 'A collective day of responsibility and care. The shared energy turns toward home and community. Acts of service land with unusual depth today.',
    7: 'A collective day of introspection and wisdom. The shared energy supports deep study and inner knowing. Solitude is productive today.',
    8: 'A collective day of achievement and authority. The shared energy amplifies ambition and executive decisions. Power wielded wisely today compounds.',
    9: 'A collective day of completion and release. The shared energy supports endings and letting go. What you release today creates space for what is coming.',
    11: 'A collective Master Day of heightened intuition. The shared energy is spiritually charged. Synchronicities are amplified for everyone.',
    22: 'A collective Master Day of large-scale building. The shared energy supports ambitious visions made practical. What is built today is meant to last.',
  }
  return { day, meaning: meanings[day] ?? meanings[1] }
}

const ARCHETYPES: Record<number, {
  name: string; glyph: string; accent: string; bg: string; border: string
  tagline: string; vibrationMeaning: string
  embrace: string; avoid: string; advice: string
  energyLevel: number; energyDescription: string
}> = {
  1: {
    name: 'The Pioneer', glyph: '✦', accent: '#B45309', bg: '#FFFBEB', border: '#FDE68A',
    tagline: 'Initiate. The window for beginnings is open.',
    vibrationMeaning: 'Your Personal Day 1 carries the energy of initiation and independent will. This is a day where your choices carry unusual weight. What you begin now sets a tone that echoes for weeks. The 1 vibration sharpens your sense of individual direction and rewards those who act without waiting for permission.',
    embrace: 'Starting new things, bold decisions, solo action',
    avoid: 'Hesitation, waiting for approval, committee thinking',
    advice: 'Send the message you have been drafting. Begin the project. The window for initiation is today.',
    energyLevel: 4, energyDescription: 'Peak energy 9 AM to 1 PM',
  },
  2: {
    name: 'The Weaver', glyph: '◈', accent: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE',
    tagline: 'Receive. The answer will come through another person.',
    vibrationMeaning: 'Your Personal Day 2 carries the energy of receptivity and relational intelligence. This is a day built for listening more than speaking, and for noticing what is offered rather than forcing what you want. The 2 vibration heightens emotional sensitivity. Use it as a radar, not a wound.',
    embrace: 'Listening, collaboration, gentle negotiations',
    avoid: 'Forcing outcomes, confrontation, impulsive commitments',
    advice: 'Receive more than you transmit today. The right conversation is closer than you think.',
    energyLevel: 2, energyDescription: 'Quiet energy, honour stillness',
  },
  3: {
    name: 'The Alchemist', glyph: '✵', accent: '#065F46', bg: '#ECFDF5', border: '#A7F3D0',
    tagline: 'Express. Today rewards saying the unconventional thing.',
    vibrationMeaning: 'Your Personal Day 3 carries the energy of creative expression and joyful communication. This is not a day for hiding what you think or feel. The 3 vibration amplifies whatever you put out into the world. Creative work flows with unusual ease and the thing you almost did not say turns out to be exactly right.',
    embrace: 'Creative expression, social connection, inspired work',
    avoid: 'Isolation, suppressing ideas, taking yourself too seriously',
    advice: 'Make the thing in your head real. Say the unconventional thing. Today rewards expression.',
    energyLevel: 4, energyDescription: 'Creative peak 10 AM to 2 PM',
  },
  4: {
    name: 'The Architect', glyph: '⬡', accent: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE',
    tagline: 'Build. The unglamorous task has compound interest.',
    vibrationMeaning: 'Your Personal Day 4 carries the energy of disciplined effort and structural integrity. This is a day that rewards the unglamorous work. The task you have been putting off, the system you need to build. The 4 vibration does not reward shortcuts. It rewards those who show up and trust that solid foundations compound over time.',
    embrace: 'Disciplined effort, structure, long-view planning',
    avoid: 'Shortcuts, cutting corners, skipping foundations',
    advice: 'The unglamorous task you have been postponing pays compound interest. Do it today.',
    energyLevel: 3, energyDescription: 'Steady sustained focus',
  },
  5: {
    name: 'The Seeker', glyph: '◉', accent: '#9A3412', bg: '#FFF7ED', border: '#FED7AA',
    tagline: 'Adapt. The deviation is the point, not the detour.',
    vibrationMeaning: 'Your Personal Day 5 carries the energy of dynamic change and sensory aliveness. This is a day where rigidity is the enemy and curiosity is the asset. The 5 vibration breaks routines, not to create chaos, but to introduce the kind of unexpected input that shifts perspective and opens doors that planning alone cannot find.',
    embrace: 'Adaptability, curiosity, breaking old routines',
    avoid: 'Rigidity, over-commitment, clinging to what is familiar',
    advice: 'Say yes to the unexpected invitation. The deviation is the point today, not the detour.',
    energyLevel: 4, energyDescription: 'Dynamic energy, stay flexible',
  },
  6: {
    name: 'The Keeper', glyph: '❋', accent: '#9D174D', bg: '#FDF2F8', border: '#FBCFE8',
    tagline: 'Tend. Small gestures land deeply today.',
    vibrationMeaning: 'Your Personal Day 6 carries the energy of care, responsibility, and relational depth. This is a day when the people and commitments closest to you ask for genuine attention. The 6 vibration amplifies the weight of small gestures. A well-timed act of service or beauty today creates ripples far beyond what the gesture itself would suggest.',
    embrace: 'Nurturing relationships, beauty, acts of service',
    avoid: 'Neglecting your own needs to fix others, perfectionism',
    advice: 'Tend to the relationship that has been quietly asking for attention. Small gestures land today.',
    energyLevel: 3, energyDescription: 'Warm relational energy',
  },
  7: {
    name: 'The Oracle', glyph: '✶', accent: '#3730A3', bg: '#EEF2FF', border: '#C7D2FE',
    tagline: 'Reflect. The insight will not come from more research.',
    vibrationMeaning: 'Your Personal Day 7 carries the energy of deep introspection and inner knowing. This is a day that rewards solitude, study, and the kind of stillness that allows insight to surface without being forced. What you need today will not come from another conversation or another search. It will come from sitting with what you already know.',
    embrace: 'Solitude, deep study, trusting inner knowing',
    avoid: 'Small talk, surface decisions, overcrowding your schedule',
    advice: 'Sit quietly for 15 minutes. The insight you need will not come from more research.',
    energyLevel: 2, energyDescription: 'Reflective energy, go inward',
  },
  8: {
    name: 'The Sovereign', glyph: '◈', accent: '#065F46', bg: '#F0FDFA', border: '#99F6E4',
    tagline: 'Decide. Your authority is most legible today.',
    vibrationMeaning: 'Your Personal Day 8 carries the energy of executive authority and material momentum. This is a day when your capacity to lead, decide, and act with confidence is at its most visible. The 8 vibration amplifies the consequences of both bold action and unnecessary hesitation. Today is not a day to defer what you know is right.',
    embrace: 'Executive decisions, owning authority, financial moves',
    avoid: 'Giving your power away, deferring what you know is right',
    advice: 'Make the call you have been delegating to circumstance. Your authority is most legible today.',
    energyLevel: 5, energyDescription: 'Power peak 9 AM to 1 PM',
  },
  9: {
    name: 'The Sage', glyph: '✦', accent: '#92400E', bg: '#FFFBEB', border: '#FDE68A',
    tagline: 'Release. New cycles follow clean endings.',
    vibrationMeaning: 'Your Personal Day 9 carries the energy of completion, compassion, and conscious release. This is the last day of your personal cycle, designed for finishing what needs to be finished and letting go of what no longer belongs in the next chapter. New cycles do not begin until old ones are properly ended.',
    embrace: 'Completion, generosity, releasing what no longer fits',
    avoid: 'Clinging, starting new things, forcing fresh beginnings',
    advice: 'Something is ready to be finished and released. Do that. New cycles follow clean endings.',
    energyLevel: 3, energyDescription: 'Completion energy, finish well',
  },
  11: {
    name: 'The Visionary', glyph: '✦✦', accent: '#5B21B6', bg: '#F5F3FF', border: '#DDD6FE',
    tagline: 'Illuminate. Master energy amplifies everything.',
    vibrationMeaning: 'Your Personal Day 11 is a Master Day, rare, charged, and amplified. The 11 vibration heightens intuition to an unusual degree, making synchronicities more frequent. This is not a day for logical analysis alone. It is a day for trusting what you sense beyond what you can prove. Inspiration arrives in flashes today. Capture them immediately.',
    embrace: 'Intuition, inspired action, spiritual insight',
    avoid: 'Over-analysing, dismissing hunches, nervous energy',
    advice: 'The flash of insight you almost dismissed is the most important thing that happened today.',
    energyLevel: 5, energyDescription: 'Master Day, heightened awareness',
  },
  22: {
    name: 'The Master Builder', glyph: '⬡⬡', accent: '#1E3A8A', bg: '#EFF6FF', border: '#BFDBFE',
    tagline: 'Build at scale. What you construct today is meant to last.',
    vibrationMeaning: 'Your Personal Day 22 is the rarest Master Day, the energy of large-scale vision made practical. The 22 vibration bridges the gap between what seems impossible and what can actually be built. The ideas that feel too large to attempt are precisely the ones worth starting today.',
    embrace: 'Ambitious vision, practical execution, legacy thinking',
    avoid: 'Small thinking, scattered effort, ignoring the larger picture',
    advice: 'The vision you have been calling unrealistic deserves a first concrete step today.',
    energyLevel: 5, energyDescription: 'Master Builder energy, think big',
  },
}

const READING_TIERS = [
  { id: 'daily-personal-oracle',   icon: Clock,        label: 'Daily Oracle',      span: 'Every Day', price: 19, accent: '#B45309', promise: 'Personal Day energy, Moon phase, one action and one caution every morning.' },
  { id: 'monthly-cycle-navigator', icon: Calendar,     label: 'Monthly Navigator', span: '30 Days',   price: 29, accent: '#6D28D9', promise: 'Peak windows, challenge dates, domain of emphasis, monthly intention.' },
  { id: 'annual-arc-keeper',       icon: CalendarDays, label: 'Annual Arc',        span: 'Full Year', price: 47, accent: '#065F46', promise: 'All 12 Personal Months, Solar Return, three peak windows, two caution periods.' },
  { id: 'nine-year-arc-compass',   icon: Sparkles,     label: 'Nine-Year Compass', span: '9 Years',   price: 57, accent: '#1E40AF', promise: 'Every Personal Year, Pinnacle transitions, peak decade located, decade framework.' },
]

interface DailyGuidanceProps {
  userName: string; greeting: string; date: string; time: string
  personalDay: number; userId?: string; dob?: string
  birthTime?: string; birthLocation?: string
  vibration?: string; vibrationMeaning?: string
  energyLevel?: number; energyDescription?: string; insightMessage?: string
  openInsights?: boolean
}

function EnergyArc({ level, accent }: { level: number; accent: string }) {
  const r = 32, circ = 2 * Math.PI * r, arc = circ * 0.75, fill = arc * (level / 5)
  return (
    <svg viewBox="0 0 72 72" style={{ width: 64, height: 64 }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="5"
        strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={circ * 0.125} strokeLinecap="round" />
      <motion.circle cx="36" cy="36" r={r} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${fill} ${circ - fill}`} strokeDashoffset={circ * 0.125}
        initial={{ strokeDasharray: `0 ${circ}` }} animate={{ strokeDasharray: `${fill} ${circ - fill}` }}
        transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
        style={{ filter: `drop-shadow(0 0 3px ${accent}66)` }} />
      <text x="36" y="33" textAnchor="middle" fill={accent} fontSize="15" fontFamily="Georgia,serif" fontWeight="700">{level}</text>
      <text x="36" y="44" textAnchor="middle" fill="#9ca3af" fontSize="6" fontFamily="sans-serif" letterSpacing="1">OF 5</text>
    </svg>
  )
}

function UpsellPopover({ open, onClose, router, accent }: { open: boolean; onClose: () => void; router: any; accent: string }) {
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
          initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 12, borderRadius: 20, overflow: 'hidden', zIndex: 20, background: 'white', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 -8px 32px rgba(0,0,0,0.12)' }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #f3f4f6', background: 'linear-gradient(135deg, #fafafa, #f5f3ff)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#6D28D9', textTransform: 'uppercase', marginBottom: 2 }}>Deeper Personalised Readings</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Choose Your Time Horizon</p>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
            {READING_TIERS.map((tier, i) => {
              const Icon = tier.icon
              return (
                <motion.button key={tier.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => { onClose(); router.push(`/purchase/${tier.id}`) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, textAlign: 'left', background: `${tier.accent}08`, border: `1px solid ${tier.accent}20`, cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${tier.accent}15` }}>
                    <Icon style={{ width: 15, height: 15, color: tier.accent }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{tier.label}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 100, background: `${tier.accent}15`, color: tier.accent }}>{tier.span}</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tier.promise}</p>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: tier.accent }}>${tier.price}</span>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>/mo</span>
                  </div>
                </motion.button>
              )
            })}
          </div>
          <p style={{ fontSize: 10, textAlign: 'center', color: '#9CA3AF', padding: '8px 16px 12px' }}>Each reading is hyper-personalised to your blueprint</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const CAT_ACCENT: Record<string, string> = {
  love: '#BE185D', wealth: '#065F46', wellness: '#5B21B6',
  'life-path': '#B45309', 'oracle-temple': '#3730A3',
  'time-keeper': '#0F766E', voice: '#6D28D9', 'sacred-script': '#9A3412',
}

function MatchCard({ tool, idx, onSelect }: { tool: any; idx: number; onSelect: () => void }) {
  const accent = CAT_ACCENT[tool.domain ?? tool.category ?? ''] ?? '#3730A3'
  return (
    <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
      onClick={onSelect}
      style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 16, border: '1px solid #F3F4F6', background: 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, background: `${accent}10`, border: `1px solid ${accent}20` }}>
        {tool.emoji ?? '🔮'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tool.name}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 100, flexShrink: 0, background: `${accent}12`, color: accent }}>{tool.matchScore}%</span>
        </div>
        <p style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>
          {tool.tagline ?? tool.hook?.slice(0, 80) ?? 'A powerful synthesis reading'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex' }}>{[1,2,3,4,5].map(s => <Star key={s} style={{ width: 10, height: 10, fill: '#D97706', color: '#D97706' }} />)}</div>
          <span style={{ fontSize: 10, color: '#9CA3AF' }}>{tool.reviewCount?.toLocaleString() ?? '1,000'}+</span>
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: accent }}>${tool.price}</span>
        </div>
      </div>
    </motion.button>
  )
}

function MatchingModal({ open, onClose, tools, archName, loading, router }: any) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(17,14,50,0.5)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}>
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            style={{ width: '100%', maxWidth: 480, borderRadius: '28px 28px 0 0', overflow: 'hidden', background: 'white', maxHeight: '85vh', boxShadow: '0 -12px 40px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #F3F4F6', background: 'linear-gradient(135deg, #fafafa, #f5f3ff)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: '#6D28D9', textTransform: 'uppercase', marginBottom: 4 }}>Vibrational Match</p>
                  <h2 style={{ fontSize: 18, fontFamily: 'Georgia, serif', color: '#111827', fontWeight: 400 }}>Aligned Tools For Today</h2>
                </div>
                <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'white', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X style={{ width: 14, height: 14, color: '#6B7280' }} />
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Based on your {archName} energy today</p>
            </div>
            <div style={{ overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(85vh - 140px)' }}>
              {loading
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: 999, ease: 'linear' }}
                      style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #E5E7EB', borderTopColor: '#6D28D9' }} />
                  </div>
                : tools.length === 0
                  ? <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <Compass style={{ width: 36, height: 36, color: '#E5E7EB', margin: '0 auto 12px' }} />
                      <p style={{ fontSize: 14, color: '#9CA3AF' }}>No aligned tools found today</p>
                    </div>
                  : tools.map((t: any, i: number) => <MatchCard key={t.id} tool={t} idx={i} onSelect={() => { onClose(); router.push(`/purchase/${t.id}`) }} />)
              }
            </div>
            {tools.length > 0 && (
              <div style={{ padding: '12px 16px 24px', borderTop: '1px solid #F3F4F6' }}>
                <button onClick={() => { onClose(); router.push('/dashboard') }}
                  style={{ width: '100%', padding: '13px', borderRadius: 16, fontSize: 14, fontWeight: 600, color: 'white', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
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

function InsightsModal({ open, onClose, date, personalDay, arch, universalDay, router }: any) {
  const [showUpsell, setShowUpsell] = useState(false)
  const forecast = [
    { range: '6 AM to 10 AM',  label: 'Building',             color: '#065F46' },
    { range: '10 AM to 2 PM',  label: arch.energyDescription, color: '#B45309' },
    { range: '2 PM to 6 PM',   label: 'Creative Flow',        color: '#5B21B6' },
    { range: '6 PM to 10 PM',  label: 'Integration',          color: '#3730A3' },
  ]
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(17,14,50,0.5)', backdropFilter: 'blur(8px)' }}
          onClick={() => { onClose(); setShowUpsell(false) }}>
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            style={{ width: '100%', maxWidth: 540, borderRadius: '28px 28px 0 0', overflow: 'hidden', background: 'white', maxHeight: '92vh', boxShadow: '0 -12px 40px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #F3F4F6', background: `linear-gradient(135deg, ${arch.bg}, white)` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: arch.accent + 'AA', marginBottom: 4 }}>Personal Day Reading</p>
                  <h2 style={{ fontSize: 18, fontFamily: 'Georgia, serif', color: '#111827', fontWeight: 400 }}>Day {personalDay} · {arch.name}</h2>
                </div>
                <button onClick={() => { onClose(); setShowUpsell(false) }}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X style={{ width: 14, height: 14, color: '#6B7280' }} />
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{date} · {arch.tagline}</p>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: 'calc(92vh - 108px)' }}>
              <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ borderRadius: 16, padding: '14px 16px', background: arch.bg, border: `1px solid ${arch.border}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: arch.accent + '99', marginBottom: 8 }}>Energy Level</p>
                    <p style={{ fontSize: 18, fontFamily: 'Georgia, serif', color: arch.accent, marginBottom: 8 }}>
                      {arch.energyLevel >= 4 ? 'High' : arch.energyLevel >= 3 ? 'Medium' : 'Low'}
                    </p>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[1,2,3,4,5].map(l => (
                        <div key={l} style={{ flex: 1, height: 5, borderRadius: 3, background: l <= arch.energyLevel ? arch.accent : arch.accent + '20' }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ borderRadius: 16, padding: '14px 16px', background: '#F8F7FF', border: '1px solid #E5E7EB' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6D28D999', marginBottom: 8 }}>Archetype</p>
                    <p style={{ fontSize: 18, fontFamily: 'Georgia, serif', color: '#3730A3' }}>{arch.name}</p>
                    <p style={{ fontSize: 11, color: '#6D28D9', marginTop: 4 }}>{arch.glyph} Day {personalDay}</p>
                  </div>
                </div>

                <div style={{ borderRadius: 16, padding: '16px 18px', background: '#FAFAFA', border: '1px solid #F3F4F6' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 10 }}>Your Personal Day Vibration</p>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, textAlign: 'justify' }}>{arch.vibrationMeaning}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF' }}>Today's Personal Oracle</p>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, borderRadius: 14, padding: '13px 15px', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <CheckCircle style={{ width: 16, height: 16, color: '#059669', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#059669AA', marginBottom: 4 }}>Embrace</p>
                      <p style={{ fontSize: 13, color: '#065F46', textAlign: 'justify' }}>{arch.embrace}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, borderRadius: 14, padding: '13px 15px', background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                    <ShieldAlert style={{ width: 16, height: 16, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D97706AA', marginBottom: 4 }}>What To Avoid</p>
                      <p style={{ fontSize: 13, color: '#92400E', textAlign: 'justify' }}>{arch.avoid}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, borderRadius: 14, padding: '13px 15px', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <Lightbulb style={{ width: 16, height: 16, color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2563EBAA', marginBottom: 4 }}>Today's Guidance</p>
                      <p style={{ fontSize: 13, color: '#1E3A8A', lineHeight: 1.6, textAlign: 'justify' }}>{arch.advice}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 10 }}>Energy By Hour</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {forecast.map(({ range, label, color }) => (
                      <div key={range} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: '10px 14px', background: '#FAFAFA', border: '1px solid #F3F4F6' }}>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{range}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ borderRadius: 16, padding: '16px 18px', background: '#F8F7FF', border: '1px solid #E5E7EB' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6D28D9', marginBottom: 4 }}>Universal Day Energy · Day {universalDay.day}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 10 }}>This collective energy applies to everyone today, not just you.</p>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Users style={{ width: 15, height: 15, color: '#6D28D9', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 13, color: '#3730A3', lineHeight: 1.65, textAlign: 'justify' }}>{universalDay.meaning}</p>
                  </div>
                </div>

                <div style={{ position: 'relative', paddingBottom: 4 }}>
                  <UpsellPopover open={showUpsell} onClose={() => setShowUpsell(false)} router={router} accent={arch.accent} />
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowUpsell(v => !v)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 16, fontSize: 13, fontWeight: 700, color: 'white', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${arch.accent}, ${arch.accent}CC)`, boxShadow: `0 4px 16px ${arch.accent}30` }}>
                    <Zap style={{ width: 15, height: 15 }} />
                    Get Deeper Personalised Reading
                    <ChevronDown style={{ width: 14, height: 14, transform: showUpsell ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                  </motion.button>
                </div>

              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const DailyGuidance = ({
  userName, greeting, date, time, personalDay: personalDayProp,
  userId, dob, openInsights,
}: DailyGuidanceProps) => {
  const router    = useRouter()
  const supabase  = createClient()
  const firstName = userName.split(' ')[0]

  const personalDay  = dob ? calcPersonalDay(dob) : personalDayProp
  const universalDay = calcUniversalDay()
  const arch         = ARCHETYPES[personalDay] ?? ARCHETYPES[5]
  const greetEmoji   = greeting.includes('Morning') ? '☀️' : greeting.includes('Afternoon') ? '⛅' : '🌙'
  const vibLabel     = arch.energyLevel >= 4 ? 'High' : arch.energyLevel >= 3 ? 'Medium' : 'Low'

  const [showMatchModal,   setShowMatchModal]   = useState(false)
  const [showInsightModal, setShowInsightModal] = useState(false)
  useEffect(() => { if (openInsights) setShowInsightModal(true) }, [openInsights])
  const [matchedTools,     setMatchedTools]     = useState<any[]>([])
  const [purchasedIds,     setPurchasedIds]     = useState<Set<string>>(new Set())
  const [loadingTools,     setLoadingTools]     = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase.from('purchases').select('tool_id').eq('user_id', userId)
      .then(({ data: p }) => { if (p) setPurchasedIds(new Set(p.map((x: any) => x.tool_id))) })
  }, [userId])

  const findMatchingTools = useCallback(async () => {
    setLoadingTools(true)
    const scored = allTools.map((tool: any) => {
      let s = (personalDay % 9 || 9) * 3
      const d = (tool.domain ?? tool.category ?? '') as string
      if (arch.energyLevel >= 4) { if (['oracle-temple','wellness'].includes(d)) s += 25; if (tool.isPopular) s += 15 }
      else if (arch.energyLevel >= 3) { if (['love','life-path'].includes(d)) s += 20 }
      else { if (['wellness','voice'].includes(d)) s += 20 }
      if (tool.isNew) s += 10
      if (tool.isPopular) s += 15
      if (purchasedIds.has(tool.id)) s = 0
      return { ...tool, matchScore: Math.min(Math.round(s), 99) }
    })
    setMatchedTools(scored.filter(t => t.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore).slice(0, 6))
    setLoadingTools(false)
  }, [personalDay, arch.energyLevel, purchasedIds])

  useEffect(() => { if (showMatchModal) findMatchingTools() }, [showMatchModal, findMatchingTools])

  return (
    <>
      <div style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #ffffff, #faf8ff)',
        border: `1.5px solid ${arch.border}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px ${arch.accent}10`,
        position: 'relative',
      }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${arch.accent}, ${arch.accent}66, transparent)` }} />

        <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${arch.accent}08 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 16 }}
            style={{ position: 'relative', width: 58, height: 58, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: arch.bg, border: `1.5px solid ${arch.border}`, boxShadow: `0 2px 12px ${arch.accent}15` }}>
            <span style={{ fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 700, color: arch.accent, lineHeight: 1 }}>{personalDay}</span>
            <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: arch.accent + '80', marginTop: 2 }}>Day</span>
            <div style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: arch.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'white', boxShadow: `0 2px 6px ${arch.accent}50` }}>
              {arch.glyph}
            </div>
          </motion.div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{greetEmoji}</span>
                <span style={{ fontSize: 14, fontFamily: 'Georgia, serif', color: '#111827', fontWeight: 400 }}>{firstName}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>· {time}</span>
              </div>
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: 999 }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 100, background: arch.bg, border: `1px solid ${arch.border}` }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: arch.accent }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: arch.accent }}>{vibLabel}</span>
              </motion.div>
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: arch.accent, marginBottom: 3 }}>{arch.name}</p>
            <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{arch.tagline}</p>
          </div>

          <div style={{ flexShrink: 0 }}>
            <EnergyArc level={arch.energyLevel} accent={arch.accent} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '0 18px 12px' }}>
          {[1,2,3,4,5].map(l => (
            <motion.div key={l} style={{ flex: 1, height: 4, borderRadius: 2, background: l <= arch.energyLevel ? arch.accent : arch.accent + '15' }}
              initial={{ scaleX: 0, originX: '0%' }} animate={{ scaleX: 1 }} transition={{ delay: l * 0.07 }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 18px 16px' }}>
          <button onClick={() => setShowMatchModal(true)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, fontSize: 12, fontWeight: 700, color: 'white', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${arch.accent}, ${arch.accent}CC)`, boxShadow: `0 3px 12px ${arch.accent}25` }}>
            <Sparkles style={{ width: 13, height: 13 }} />
            Find Aligned Tools
          </button>
          <button onClick={() => setShowInsightModal(true)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: arch.accent, cursor: 'pointer', background: arch.bg, border: `1.5px solid ${arch.border}`, transition: 'all 0.2s' }}>
            <Activity style={{ width: 13, height: 13 }} />
            Full Insights
          </button>
        </div>
      </div>

      <MatchingModal open={showMatchModal} onClose={() => setShowMatchModal(false)}
        tools={matchedTools} archName={arch.name} loading={loadingTools} router={router} />

      <InsightsModal open={showInsightModal} onClose={() => setShowInsightModal(false)}
        date={date} personalDay={personalDay} arch={arch} universalDay={universalDay} router={router} />
    </>
  )
}