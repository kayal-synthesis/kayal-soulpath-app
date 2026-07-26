'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, CheckCircle, ChevronDown, ChevronUp, ChevronRight,
  Upload, Clock, Users, Crown, Download, X, RefreshCw,
  Calendar, User, ArrowRight,
} from 'lucide-react'

export type Domain =
  | 'love' | 'wealth' | 'wellness' | 'life-path'
  | 'oracle-temple' | 'sacred-script' | 'time-keeper'
  | 'voice' | 'physical' | 'health' | 'brand'

interface DomainAccent {
  label: string; from: string; to: string
  accent: string; soft: string; pill: string; pillText: string
}

const ACCENTS: Record<string, DomainAccent> = {
  'love':          { label:'Love & Relationships',    from:'#8C3A47',to:'#6F2E38',accent:'#52222A',soft:'#F3EBED',pill:'#E6D4D7',pillText:'#5A252D' },
  'wealth':        { label:'Wealth & Career',         from:'#7A5C2E',to:'#5C4623',accent:'#3F2F18',soft:'#F2EFEA',pill:'#E2DBD1',pillText:'#46351A' },
  'wellness':      { label:'Wellness & Spirituality', from:'#5C6B4F',to:'#48543E',accent:'#343C2C',soft:'#EFF0ED',pill:'#DBDED8',pillText:'#394231' },
  'life-path':     { label:'Life Path & Destiny',     from:'#4A3B6B',to:'#382C51',accent:'#261E36',soft:'#EDEBF0',pill:'#D7D4DE',pillText:'#2A223D' },
  'oracle-temple': { label:'Omni-Seer Sanctum',       from:'#2D2340',to:'#1A1526',accent:'#08060B',soft:'#EAE9EC',pill:'#D1CFD5',pillText:'#0D0A12' },
  'sacred-script': { label:'Sacred Script',           from:'#5C4326',to:'#3F2E1A',accent:'#22190E',soft:'#EFECE9',pill:'#DBD6CF',pillText:'#291E11' },
  'time-keeper':   { label:'Eternal Clock',           from:'#3D5C56',to:'#2D433F',accent:'#1C2B28',soft:'#ECEFEE',pill:'#D4DBDA',pillText:'#21312E' },
  'voice':         { label:'Voice of Prophecy',       from:'#5C3A52',to:'#432A3C',accent:'#2A1A25',soft:'#EFEBEE',pill:'#DBD4D9',pillText:'#301E2B' },
  'physical':      { label:'Physical Readings',       from:'#8C5A3D',to:'#704831',accent:'#533524',soft:'#F3EEEC',pill:'#E6DBD4',pillText:'#5A3A27' },
  'health':        { label:'Health & Vitality',       from:'#3D5439',to:'#2B3C29',accent:'#1A2318',soft:'#ECEEEB',pill:'#D4D9D3',pillText:'#1E291C' },
  'brand':         { label:'Brand & Identity',        from:'#7A4A42',to:'#603A34',accent:'#452A25',soft:'#F2EDEC',pill:'#E2D7D5',pillText:'#4C2E29' },
}
const DEFAULT_ACCENT: DomainAccent = ACCENTS['oracle-temple']
const getAccent = (domain: string): DomainAccent => ACCENTS[domain] ?? DEFAULT_ACCENT

export interface ToolData {
  id:                  string
  name:                string
  tagline:             string
  hook:                string
  emoji:               string
  price:               number
  domain:              Domain
  isFlagship?:         boolean
  isPopular?:          boolean
  isBestSeller?:       boolean
  isNew?:              boolean
  deliveryMinutes?:    number
  whatYouGet:          string[]
  requiresImage?:      { type: 'face' | 'palm' | 'both' }
  toolType?:           'report' | 'voice' | 'chat'
  subscriptionPeriod?: 'session' | 'month'
  upsell?:             { id: string; name: string; price: number }
  rating?:             number
  reviewCount?:        number
  requiresPartner?:    boolean
  systemsCount?:       number
  guidanceType?:       'spiritual-remedy' | 'practical-solution' | 'daily-guidance'
  guidanceText?:       string
}

export type Tier = 1 | 2 | 3

export interface BundleSelection {
  tier: Tier; tools: ToolData[]
  subtotal: number; discount: number; savings: number; total: number
}

export type CardState = 'default' | 'selected' | 'owned' | 'disabled'

export interface OwnedToolStatus {
  purchaseDate: string
  status:       'ready' | 'generating' | 'failed'
}

export const BUNDLE_DISCOUNTS: Record<Tier, number> = { 1: 0, 2: 20, 3: 50 }
export const BUNDLE_LABELS:    Record<Tier, string>  = {
  1: 'Single Reading',
  2: '2 Readings — 20% off',
  3: '3 Readings — 50% off',
}

export function calculateBundle(tools: ToolData[], tier: Tier): Omit<BundleSelection,'tier'|'tools'> {
  const subtotal = tools.reduce((s, t) => s + t.price, 0)
  const pct      = BUNDLE_DISCOUNTS[tier] / 100
  const savings  = subtotal * pct
  return { subtotal, discount: BUNDLE_DISCOUNTS[tier], savings, total: subtotal - savings }
}

// ─── Partner Data Modal ───────────────────────────────────────
function PartnerModal({ tool, onClose, onConfirm }: {
  tool: ToolData
  onClose: () => void
  onConfirm: (partnerName: string, partnerDob: string) => void
}) {
  const [partnerName, setPartnerName] = useState('')
  const [partnerDob,  setPartnerDob]  = useState('')
  const [error,       setError]       = useState('')
  const a = getAccent(tool.domain)

  const handleSubmit = () => {
    if (!partnerName.trim()) { setError('Please enter your partner or company name'); return }
    if (!partnerDob)         { setError('Please enter your partner or company date of establishment'); return }
    setError('')
    onConfirm(partnerName.trim(), partnerDob)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          style={{ width: '100%', maxWidth: 420, borderRadius: 24, background: 'white', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ height: 4, background: `linear-gradient(90deg,${a.from},${a.to})` }} />
          <div style={{ padding: '24px 24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: a.soft }}>
                  {tool.emoji}
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: a.accent, marginBottom: 2 }}>Partner Details Required</p>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{tool.name}</h3>
                </div>
              </div>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: '#F3F4F6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X style={{ width: 14, height: 14, color: '#6B7280' }} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 20 }}>
              This reading analyses compatibility between you and your partner or company. Please provide their details to generate an accurate reading.
            </p>
          </div>

          {/* Form */}
          <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Partner Name */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>
                Partner / Company Name
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={partnerName}
                  onChange={e => { setPartnerName(e.target.value); setError('') }}
                  placeholder="Enter full name or company name"
                  style={{ width: '100%', padding: '11px 11px 11px 38px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = a.accent}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
            </div>

            {/* Partner DOB */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>
                Date of Birth / Date of Establishment
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9CA3AF', zIndex: 1 }} />
                <input
                  type="date"
                  value={partnerDob}
                  onChange={e => { setPartnerDob(e.target.value); setError('') }}
                  max={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '11px 11px 11px 38px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', colorScheme: 'light', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = a.accent}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 12, color: '#EF4444', marginTop: -6 }}>{error}</p>
            )}

            {/* Submit */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              style={{ width: '100%', padding: '13px', borderRadius: 14, fontSize: 14, fontWeight: 700, color: 'white', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${a.from},${a.to})`, boxShadow: `0 4px 16px ${a.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
              Continue to Purchase
              <ArrowRight style={{ width: 16, height: 16 }} />
            </motion.button>

            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
              Partner data is used only for your reading and never shared.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Shared sub-components ────────────────────────────────────
function StarRow({ rating = 4.9, count }: { rating?: number; count?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1,2,3,4,5].map(s => (
          <Star key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 fill-neutral-200'}`} />
        ))}
      </div>
      <span className="text-[11px] text-neutral-400 font-medium">
        {rating.toFixed(1)}{count ? ` · ${count.toLocaleString()} reviews` : ''}
      </span>
    </div>
  )
}

function ImagePill({ type }: { type: 'face' | 'palm' | 'both' }) {
  const label = type === 'both' ? 'Face & Palm' : type === 'face' ? 'Face photo' : 'Palm photo'
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
      style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
      <Upload className="w-3 h-3 text-amber-500 flex-shrink-0" />
      <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">{label} required</span>
    </div>
  )
}

function GuidancePill({ type }: { type: string }) {
  const map: Record<string,{label:string;bg:string;text:string;dot:string}> = {
    'spiritual-remedy':   { label:'Spiritual Remedy',   bg:'#F5F3FF', text:'#5B21B6', dot:'#7C3AED' },
    'practical-solution': { label:'Practical Solution', bg:'#F0FDF4', text:'#065F46', dot:'#10B981' },
    'daily-guidance':     { label:'Daily Guidance',     bg:'#FFFBEB', text:'#92400E', dot:'#F59E0B' },
  }
  const c = map[type]
  if (!c) return null
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

interface CardProps {
  tool:          ToolData
  state?:        CardState
  ownedStatus?:  OwnedToolStatus
  onAdd?:        (tool: ToolData) => void
  onRemove?:     (tool: ToolData) => void
  onDownload?:   (tool: ToolData) => void
  onAccess?:     (tool: ToolData) => void
  showAddButton?: boolean
  className?:    string
}

// ─── Standard Tool Card ───────────────────────────────────────
export function StandardToolCard({
  tool, state = 'default', ownedStatus,
  onAdd, onRemove, onDownload, onAccess,
  showAddButton = true, className = '',
}: CardProps) {
  const router     = useRouter()
  const a          = getAccent(tool.domain)
  const isOwned    = state === 'owned'
  const isSelected = state === 'selected'
  const isDisabled = state === 'disabled'
  const [expanded,      setExpanded]      = useState(false)
  const [showPartner,   setShowPartner]   = useState(false)
  const features  = tool.whatYouGet ?? []
  const LIMIT     = 5
  const visible   = expanded ? features : features.slice(0, LIMIT)

  const navigateToPurchase = (partnerName?: string, partnerDob?: string) => {
    if (partnerName && partnerDob) {
      sessionStorage.setItem(`kayal_reading_${tool.id}`, JSON.stringify({ partnerName, partnerDob }))
    }
    router.push(`/purchase/${tool.id}`)
  }

  const handleCTA = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isOwned && onAccess)    return onAccess(tool)
    if (isSelected && onRemove) return onRemove(tool)
    if (onAdd)                  return onAdd(tool)
    if (tool.requiresPartner) { setShowPartner(true); return }
    navigateToPurchase()
  }

  const handleCardClick = () => {
    if (isDisabled) return
    if (tool.requiresPartner) { setShowPartner(true); return }
    navigateToPurchase()
  }

  return (
    <>
      {showPartner && (
        <PartnerModal
          tool={tool}
          onClose={() => setShowPartner(false)}
          onConfirm={(name, dob) => { setShowPartner(false); navigateToPurchase(name, dob) }}
        />
      )}
      <motion.div layout
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        whileHover={!isDisabled ? { y: -3 } : {}}
        transition={{ duration: 0.3 }}
        onClick={handleCardClick}
        className={`relative flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
        style={{
          background: 'white',
          border:     isSelected ? `2px solid ${a.accent}` : isOwned ? '2px solid #10B981' : '1px solid rgba(0,0,0,0.08)',
          boxShadow:  isSelected ? `0 0 0 4px ${a.soft}, 0 8px 32px rgba(0,0,0,0.1)` : '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
        }}
        onMouseEnter={e => { if (!isDisabled && !isSelected) (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)' }}
        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)' }}
      >
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg,${a.from},${a.to})` }} />
        {isSelected && <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: a.soft, opacity: 0.25 }} />}

        <div className="relative flex flex-col flex-1 p-4 sm:p-5">
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-col items-end gap-1.5 z-10">
            {isOwned    && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-2.5 h-2.5" />Owned</span>}
            {isSelected && !isOwned && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: a.soft, borderColor: a.accent+'50', color: a.accent }}><CheckCircle className="w-2.5 h-2.5" />Selected</span>}
            {tool.isBestSeller && !isOwned && !isSelected && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: a.pill, color: a.pillText }}>Best Seller</span>}
            {tool.isPopular && !tool.isBestSeller && !isOwned && !isSelected && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: a.pill, color: a.pillText }}>Popular</span>}
            {tool.isNew && !isOwned && !isSelected && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700">New</span>}
          </div>

          <div className="flex items-start gap-3 mb-3 pr-16 sm:pr-20">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0"
              style={{ background: a.soft, border: `1px solid ${a.pill}` }}>
              {tool.emoji || '🔮'}
            </div>
            <div className="pt-1 min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: a.accent+'BB' }}>{a.label}</p>
              <h3 className="font-serif text-sm sm:text-base font-semibold text-neutral-900 leading-snug">{tool.name}</h3>
            </div>
          </div>

          <p className="text-xs text-neutral-500 leading-relaxed mb-2 italic">{tool.tagline}</p>

          {tool.hook && (
            <p className="text-xs text-neutral-600 leading-relaxed mb-3">{tool.hook}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-3">
            {tool.guidanceType  && <GuidancePill type={tool.guidanceType} />}
            {tool.requiresImage && <ImagePill type={tool.requiresImage.type} />}
            {tool.requiresPartner && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                <Users className="w-2.5 h-2.5" />Partner data needed
              </span>
            )}
          </div>

          {features.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 mb-2">What You Get</p>
              <ul className="space-y-1.5">
                {visible.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: a.from }} />
                    <span className="text-sm text-neutral-600 leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
              {features.length > LIMIT && (
                <button onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
                  className="mt-2 flex items-center gap-1 text-[11px] font-semibold" style={{ color: a.accent }}>
                  {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />+{features.length - LIMIT} more included</>}
                </button>
              )}
            </div>
          )}

          {isOwned && ownedStatus && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2">
                {ownedStatus.status === 'generating'
                  ? <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                  : <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                <p className="text-xs font-semibold text-emerald-800">
                  {ownedStatus.status === 'generating' ? 'Generating your reading' : 'Your reading is ready'}
                </p>
              </div>
            </div>
          )}

          <div className="flex-1" />
          <div className="mb-3"><StarRow rating={tool.rating ?? 4.9} count={tool.reviewCount} /></div>
          <div className="h-px bg-neutral-100 mb-3" />

          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-serif font-bold text-neutral-900">${tool.price}</span>
                {tool.subscriptionPeriod && <span className="text-xs text-neutral-400">/{tool.subscriptionPeriod}</span>}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-neutral-300" />
                <span className="text-[10px] text-neutral-400">{tool.deliveryMinutes ?? 20}-min delivery</span>
              </div>
            </div>
            {showAddButton && (
              <button onClick={handleCTA} disabled={isDisabled}
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 flex-shrink-0"
                style={{ background: isOwned ? '#10B981' : `linear-gradient(90deg,${a.from},${a.to})` }}>
                {isOwned
                  ? ownedStatus?.status === 'generating' ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Generating</> : <><Download className="w-3.5 h-3.5" />Access</>
                  : isSelected ? <><X className="w-3.5 h-3.5" />Remove</>
                  : <>{tool.requiresImage ? 'Upload & Read' : tool.requiresPartner ? 'Add Partner' : 'Get Reading'}<ChevronRight className="w-3.5 h-3.5" /></>
                }
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ─── Flagship Tool Card ───────────────────────────────────────
export function FlagshipToolCard({
  tool, state = 'default', ownedStatus,
  onAdd, onRemove, onDownload, onAccess,
  showAddButton = true, className = '',
}: CardProps) {
  const router     = useRouter()
  const a          = getAccent(tool.domain)
  const isOwned    = state === 'owned'
  const isSelected = state === 'selected'
  const isDisabled = state === 'disabled'
  const [expanded,    setExpanded]    = useState(false)
  const [showPartner, setShowPartner] = useState(false)
  const features  = tool.whatYouGet ?? []
  const LIMIT     = 5
  const visible   = expanded ? features : features.slice(0, LIMIT)

  const navigateToPurchase = (partnerName?: string, partnerDob?: string) => {
    if (partnerName && partnerDob) {
      sessionStorage.setItem(`kayal_reading_${tool.id}`, JSON.stringify({ partnerName, partnerDob }))
    }
    router.push(`/purchase/${tool.id}`)
  }

  const handleCTA = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isOwned && onAccess)    return onAccess(tool)
    if (isSelected && onRemove) return onRemove(tool)
    if (onAdd)                  return onAdd(tool)
    if (tool.requiresPartner) { setShowPartner(true); return }
    navigateToPurchase()
  }

  const handleCardClick = () => {
    if (isDisabled) return
    if (tool.requiresPartner) { setShowPartner(true); return }
    navigateToPurchase()
  }

  return (
    <>
      {showPartner && (
        <PartnerModal
          tool={tool}
          onClose={() => setShowPartner(false)}
          onConfirm={(name, dob) => { setShowPartner(false); navigateToPurchase(name, dob) }}
        />
      )}
      <motion.div layout
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        whileHover={!isDisabled ? { y: -3 } : {}}
        transition={{ duration: 0.3 }}
        onClick={handleCardClick}
        className={`relative flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
        style={{
          background: 'white',
          border:     isSelected ? `2px solid ${a.accent}` : isOwned ? '2px solid #10B981' : '1px solid rgba(0,0,0,0.08)',
          boxShadow:  isSelected ? `0 0 0 4px ${a.soft}, 0 12px 40px rgba(0,0,0,0.12)` : '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
        }}
        onMouseEnter={e => { if (!isDisabled && !isSelected) (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)' }}
        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)' }}
      >
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg,${a.from},${a.to})` }} />
        {isSelected && <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: a.soft, opacity: 0.25 }} />}

        <div className="relative flex flex-col flex-1 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-3.5 h-3.5" style={{ color: a.accent }} />
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: a.accent }}>Flagship Reading</span>
            {tool.systemsCount && <span className="ml-auto text-[10px] font-semibold text-neutral-400">{tool.systemsCount} systems</span>}
          </div>

          <div className="absolute top-4 right-4 sm:top-4 sm:right-5 flex flex-col items-end gap-1.5 z-10">
            {isOwned    && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-2.5 h-2.5" />Owned</span>}
            {isSelected && !isOwned && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: a.soft, borderColor: a.accent+'50', color: a.accent }}><CheckCircle className="w-2.5 h-2.5" />Selected</span>}
            {tool.isBestSeller && !isOwned && !isSelected && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: a.pill, color: a.pillText }}>Best Seller</span>}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0"
              style={{ background: a.soft, border: `1.5px solid ${a.pill}` }}>
              {tool.emoji || '🔮'}
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: a.accent+'BB' }}>{a.label}</p>
              <h3 className="font-serif text-base sm:text-lg font-bold text-neutral-900 leading-snug">{tool.name}</h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed mb-2 italic">{tool.tagline}</p>

          {tool.hook && (
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-3 sm:mb-4">{tool.hook}</p>
          )}

          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-5">
            {tool.guidanceType  && <GuidancePill type={tool.guidanceType} />}
            {tool.requiresImage && <ImagePill type={tool.requiresImage.type} />}
            {tool.requiresPartner && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                <Users className="w-2.5 h-2.5" />Partner data needed
              </span>
            )}
          </div>

          {features.length > 0 && (
            <div className="mb-4 sm:mb-5">
              <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 mb-2 sm:mb-3">What You Get</p>
              <ul className="space-y-2">
                {visible.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: a.soft }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.from }} />
                    </div>
                    <span className="text-sm text-neutral-600 leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
              {features.length > LIMIT && (
                <button onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
                  className="mt-2 sm:mt-3 flex items-center gap-1 text-[11px] font-semibold" style={{ color: a.accent }}>
                  {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />+{features.length - LIMIT} more included</>}
                </button>
              )}
            </div>
          )}

          {isOwned && ownedStatus && (
            <div className="mb-4 sm:mb-5 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2">
                {ownedStatus.status === 'generating' ? <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                <p className="text-xs font-semibold text-emerald-800">{ownedStatus.status === 'generating' ? 'Generating your reading' : 'Your reading is ready'}</p>
              </div>
            </div>
          )}

          <div className="flex-1" />
          <div className="mb-3 sm:mb-4"><StarRow rating={tool.rating ?? 4.9} count={tool.reviewCount} /></div>
          <div className="h-px bg-neutral-100 mb-3 sm:mb-4" />

          <div className="flex items-end justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-serif font-bold text-neutral-900">${tool.price}</span>
                {tool.subscriptionPeriod && <span className="text-xs text-neutral-400">/{tool.subscriptionPeriod}</span>}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-neutral-300" />
                <span className="text-[10px] text-neutral-400">{tool.deliveryMinutes ?? 20}-min delivery</span>
              </div>
            </div>
            {showAddButton && (
              <button onClick={handleCTA} disabled={isDisabled}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
                style={{ background: isOwned ? '#10B981' : `linear-gradient(90deg,${a.from},${a.to})` }}>
                {isOwned
                  ? <><Download className="w-3.5 sm:w-4 h-3.5 sm:h-4" />Access Reading</>
                  : isSelected ? <><X className="w-3.5 sm:w-4 h-3.5 sm:h-4" />Remove</>
                  : tool.requiresImage ? <><Upload className="w-3.5 sm:w-4 h-3.5 sm:h-4" />Upload & Read</> 
                  : tool.requiresPartner ? <><Users className="w-3.5 sm:w-4 h-3.5 sm:h-4" />Add Partner</>
                  : <>Get Reading<ChevronRight className="w-3.5 sm:w-4 h-3.5 sm:h-4" /></>
                }
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ─── Compact Card ─────────────────────────────────────────────
export function CompactToolCard({ tool, discountedPrice }: { tool: ToolData; discountedPrice?: number }) {
  const a = getAccent(tool.domain)
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-neutral-100">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: a.soft }}>{tool.emoji || '🔮'}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-800 truncate">{tool.name}</p>
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: a.accent+'AA' }}>{a.label}</p>
      </div>
      <div className="text-right flex-shrink-0">
        {discountedPrice !== undefined && discountedPrice < tool.price ? (
          <><p className="text-sm font-bold text-neutral-900">${discountedPrice.toFixed(0)}</p><p className="text-[10px] text-neutral-400 line-through">${tool.price}</p></>
        ) : (
          <p className="text-sm font-bold text-neutral-900">${tool.price}</p>
        )}
      </div>
    </div>
  )
}

// ─── Tool Card auto-router ────────────────────────────────────
export function ToolCard(props: CardProps) {
  return props.tool.isFlagship ? <FlagshipToolCard {...props} /> : <StandardToolCard {...props} />
}

// ─── Bundle Selector ──────────────────────────────────────────
export function BundleSelector({ tools, onProceedToCheckout }: {
  tools: ToolData[]
  onProceedToCheckout: (s: BundleSelection) => void
}) {
  const [tier,           setTier]          = useState<Tier>(1)
  const [selectedTools,  setSelectedTools] = useState<ToolData[]>([])
  const [domainFilter,   setDomainFilter]  = useState<string>('all')

  const bundle     = calculateBundle(selectedTools, tier)
  const slotsLeft  = tier - selectedTools.length
  const canCheckout = selectedTools.length === tier

  const domainIds = ['all', ...Array.from(new Set(tools.map(t => t.domain)))]
  const filtered  = domainFilter === 'all' ? tools : tools.filter(t => t.domain === domainFilter)

  const addTool    = (t: ToolData) => { if (selectedTools.length < tier && !selectedTools.find(s => s.id === t.id)) setSelectedTools(p => [...p, t]) }
  const removeTool = (t: ToolData) => setSelectedTools(p => p.filter(s => s.id !== t.id))
  const getState   = (t: ToolData): CardState => selectedTools.find(s => s.id === t.id) ? 'selected' : selectedTools.length >= tier ? 'disabled' : 'default'

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 mb-3">Choose Your Bundle</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {([1,2,3] as Tier[]).map(t => {
            const disc   = BUNDLE_DISCOUNTS[t]
            const active = tier === t
            return (
              <button key={t} onClick={() => { setTier(t); setSelectedTools([]) }}
                className="relative flex flex-col items-center p-3 sm:p-4 rounded-2xl border-2 transition-all"
                style={{ borderColor: active ? '#6366F1' : 'rgba(0,0,0,0.08)', background: active ? '#EEF2FF' : 'white', boxShadow: active ? '0 0 0 4px rgba(99,102,241,0.1)' : undefined }}>
                {t === 3 && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-400 text-amber-950">Best Value</span>}
                <span className="text-xl sm:text-2xl font-serif font-bold text-neutral-900 mb-0.5">{t}</span>
                <span className="text-[10px] text-neutral-500 mb-1">Reading{t > 1 ? 's' : ''}</span>
                {disc > 0 ? <span className="text-[10px] sm:text-[11px] font-bold text-indigo-600">{disc}% off</span> : <span className="text-[10px] sm:text-[11px] text-neutral-400">Full price</span>}
              </button>
            )
          })}
        </div>
      </div>

      {selectedTools.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">Selected ({selectedTools.length}/{tier})</p>
          {selectedTools.map(t => <CompactToolCard key={t.id} tool={t} discountedPrice={tier > 1 ? t.price * (1 - BUNDLE_DISCOUNTS[tier] / 100) : undefined} />)}
          {slotsLeft > 0 && <p className="text-xs text-indigo-600 text-center font-medium">Select {slotsLeft} more reading{slotsLeft > 1 ? 's' : ''} to unlock your discount</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {domainIds.map(d => {
          const acc    = d === 'all' ? null : getAccent(d)
          const active = domainFilter === d
          return (
            <button key={d} onClick={() => setDomainFilter(d)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
              style={{
                background:  active && acc ? acc.soft : active ? '#EEF2FF' : 'white',
                borderColor: active && acc ? acc.accent+'40' : active ? '#6366F180' : 'rgba(0,0,0,0.1)',
                color:       active && acc ? acc.accent : active ? '#4F46E5' : '#6B7280',
              }}>
              {d === 'all' ? 'All Domains' : acc?.label ?? d}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map(tool => (
          <ToolCard key={tool.id} tool={tool} state={getState(tool)} onAdd={addTool} onRemove={removeTool} />
        ))}
      </div>

      {selectedTools.length > 0 && (
        <div className="sticky bottom-4 rounded-2xl bg-white border border-neutral-200 shadow-2xl shadow-black/10 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">{selectedTools.length} reading{selectedTools.length > 1 ? 's' : ''}{bundle.discount > 0 ? ` · ${bundle.discount}% off` : ''}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-serif font-bold text-neutral-900">${bundle.total.toFixed(0)}</span>
                {bundle.savings > 0 && <><span className="text-sm text-neutral-400 line-through">${bundle.subtotal.toFixed(0)}</span><span className="text-sm font-bold text-emerald-600">Save ${bundle.savings.toFixed(0)}</span></>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Clock className="w-3 h-3" /><span>20-min delivery</span>
            </div>
          </div>
          <button disabled={!canCheckout}
            onClick={() => onProceedToCheckout({ tier, tools: selectedTools, ...bundle })}
            className="w-full py-3 sm:py-3.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: canCheckout ? 'linear-gradient(90deg,#6366F1,#4F46E5)' : 'rgba(0,0,0,0.05)',
              color: canCheckout ? 'white' : '#9CA3AF',
              cursor: canCheckout ? 'pointer' : 'not-allowed',
            }}>
            {canCheckout
              ? bundle.savings > 0 ? `Proceed to Checkout — Save $${bundle.savings.toFixed(0)}` : 'Proceed to Checkout'
              : `Select ${slotsLeft} more reading${slotsLeft > 1 ? 's' : ''} to continue`}
          </button>
        </div>
      )}
    </div>
  )
}