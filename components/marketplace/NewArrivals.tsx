'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ArrowRight, Upload, Sparkles, ChevronLeft, ChevronRight, Share2 } from 'lucide-react'
import { domains } from '@/lib/tools/all-tools-index'

// ─────────────────────────────────────────────────────────────
// Domain accent colours — matches BestsellerTools
// ─────────────────────────────────────────────────────────────
const DOMAIN_ACCENT: Record<string, { from: string; to: string; text: string; bg: string; badge: string }> = {
  'love':          { from: '#F43F5E', to: '#E11D48', text: '#BE123C', bg: '#FFF1F2', badge: '#FFE4E6' },
  'wealth':        { from: '#10B981', to: '#059669', text: '#065F46', bg: '#F0FDF4', badge: '#D1FAE5' },
  'spiritual':     { from: '#8B5CF6', to: '#7C3AED', text: '#5B21B6', bg: '#F5F3FF', badge: '#EDE9FE' },
  'life-path':     { from: '#F59E0B', to: '#D97706', text: '#92400E', bg: '#FFFBEB', badge: '#FEF3C7' },
  'oracle-temple': { from: '#6366F1', to: '#4F46E5', text: '#3730A3', bg: '#EEF2FF', badge: '#E0E7FF' },
  'time-keeper':   { from: '#14B8A6', to: '#0D9488', text: '#115E59', bg: '#F0FDFA', badge: '#CCFBF1' },
  'voice':         { from: '#7C3AED', to: '#6D28D9', text: '#4C1D95', bg: '#F5F3FF', badge: '#EDE9FE' },
  'sacred-script': { from: '#F97316', to: '#EA580C', text: '#9A3412', bg: '#FFF7ED', badge: '#FFEDD5' },
}
const DEFAULT_ACCENT = { from: '#6366F1', to: '#4F46E5', text: '#3730A3', bg: '#EEF2FF', badge: '#E0E7FF' }

function StarRow({ rating = 4.9, count }: { rating?: number; count?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1,2,3,4,5].map(s => (
          <Star key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 fill-neutral-200'}`} />
        ))}
      </div>
      <span className="text-[11px] text-neutral-400 font-medium">
        {rating.toFixed(1)}{count ? ` · ${count.toLocaleString()}` : ''}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Single new arrival card — slightly taller, full-column layout
// ─────────────────────────────────────────────────────────────
function ArrivalCard({ tool, index, direction }: { tool: any; index: number; direction: number }) {
  const router  = useRouter()
  const accent  = DOMAIN_ACCENT[tool.category] ?? DEFAULT_ACCENT
  const features: string[] = Array.isArray(tool.features) ? tool.features.slice(0, 3) : []

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (navigator.share) {
        await navigator.share({ title: tool.name, text: tool.description, url: `/purchase/${tool.id}` })
      }
    } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: direction * 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -30 }}
      transition={{ delay: index * 0.06, duration: 0.38, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      onClick={() => router.push(`/purchase/${tool.id}`)}
      className="cursor-pointer group flex flex-col bg-white rounded-2xl overflow-hidden h-full"
      style={{
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.07)',
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)`}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'}
    >
      {/* Accent bar */}
      <div className="h-0.5 w-full flex-shrink-0"
        style={{ background: `linear-gradient(90deg,${accent.from},${accent.to})` }} />

      <div className="flex flex-col flex-1 p-5">

        {/* Emoji + New badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: accent.bg, border: `1px solid ${accent.badge}` }}>
            {tool.emoji || '🔮'}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              New
            </span>
            {tool.isPopular && (
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                style={{ background: accent.badge, color: accent.text }}>
                Popular
              </span>
            )}
          </div>
        </div>

        {/* Domain label */}
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5"
          style={{ color: accent.text + 'BB' }}>
          {tool.domain}
        </p>

        {/* Name */}
        <h3 className="font-serif text-base font-semibold text-neutral-900 leading-snug mb-2 group-hover:text-indigo-700 transition-colors">
          {tool.name}
        </h3>

        {/* Tagline */}
        <p className="text-xs text-neutral-500 leading-relaxed mb-4 line-clamp-2">
          {tool.description}
        </p>

        {/* Features */}
        {features.length > 0 && (
          <ul className="space-y-1.5 mb-4">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: accent.from }} />
                <span className="text-[11px] text-neutral-500 leading-snug line-clamp-1">
                  {typeof f === 'string' ? f.split(' — ')[0].split(' - ')[0] : String(f)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Photo required */}
        {tool.requiresImage && (
          <div className="inline-flex items-center gap-1.5 mb-4 px-2.5 py-1 rounded-lg w-fit"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <Upload className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
              {tool.requiresImageType || 'Photo'} required
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* Rating */}
        <div className="mb-4">
          <StarRow rating={tool.rating ?? 4.9} count={tool.reviewCount} />
        </div>

        {/* Divider */}
        <div className="h-px bg-neutral-100 mb-4" />

        {/* Price + share + CTA */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-2xl font-serif font-bold text-neutral-900">${tool.price}</span>
            {tool.duration && (
              <span className="text-xs text-neutral-400 ml-1">{tool.duration}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-50 hover:bg-neutral-100 transition text-neutral-400 hover:text-neutral-600"
              aria-label="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); router.push(`/purchase/${tool.id}`) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
              style={{ background: `linear-gradient(90deg,${accent.from},${accent.to})` }}
            >
              {tool.requiresImage ? 'Upload & Read' : 'Get Reading'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// NewArrivals
// ─────────────────────────────────────────────────────────────
export const NewArrivals = () => {
  const router  = useRouter()
  const [tools,         setTools]         = useState<any[]>([])
  const [currentIndex,  setCurrentIndex]  = useState(0)
  const [direction,     setDirection]     = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [loading,       setLoading]       = useState(true)

  const PER_PAGE = 3

  useEffect(() => {
    // Pick 2 newest tools per domain — marked isNew, or fall back to most recently added
    const newest = domains.flatMap(domain =>
      domain.tools
        .filter(t => t.isNew)
        .slice(0, 2)
        .map(t => ({ ...t, domainId: domain.id }))
    )

    // If no isNew flags, take first tool from each domain as a fallback
    const fallback = domains.flatMap(domain =>
      domain.tools.slice(0, 1).map(t => ({ ...t, domainId: domain.id }))
    )

    const result = (newest.length >= 3 ? newest : fallback).slice(0, 9)
    setTools(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isAutoPlaying || tools.length <= PER_PAGE) return
    const interval = setInterval(() => {
      setDirection(1)
      setCurrentIndex(prev => prev + PER_PAGE >= tools.length ? 0 : prev + PER_PAGE)
    }, 5500)
    return () => clearInterval(interval)
  }, [isAutoPlaying, tools.length])

  const prev = () => {
    setIsAutoPlaying(false)
    setDirection(-1)
    setCurrentIndex(p => p - PER_PAGE < 0 ? Math.max(0, tools.length - PER_PAGE) : p - PER_PAGE)
  }
  const next = () => {
    setIsAutoPlaying(false)
    setDirection(1)
    setCurrentIndex(p => p + PER_PAGE >= tools.length ? 0 : p + PER_PAGE)
  }

  const visible   = tools.slice(currentIndex, currentIndex + PER_PAGE)
  const pageCount = Math.ceil(tools.length / PER_PAGE)
  const curPage   = Math.floor(currentIndex / PER_PAGE)

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="h-6 w-36 bg-neutral-100 rounded animate-pulse" />
          <div className="h-4 w-20 bg-neutral-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-neutral-100 animate-pulse space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 bg-neutral-100 rounded-2xl" />
                <div className="h-5 w-14 bg-neutral-100 rounded-full" />
              </div>
              <div className="h-4 bg-neutral-100 rounded w-2/3" />
              <div className="h-3 bg-neutral-100 rounded w-full" />
              <div className="h-3 bg-neutral-100 rounded w-5/6" />
              <div className="h-px bg-neutral-100" />
              <div className="flex items-center justify-between">
                <div className="h-7 w-10 bg-neutral-100 rounded" />
                <div className="h-8 w-28 bg-neutral-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (tools.length === 0) return null

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <h2 className="text-lg font-serif text-neutral-900">New Arrivals</h2>
          <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            Fresh
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={prev} disabled={currentIndex === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition disabled:opacity-30"
            aria-label="Previous">
            <ChevronLeft className="w-4 h-4 text-neutral-500" />
          </button>
          <button onClick={next} disabled={currentIndex + PER_PAGE >= tools.length}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition disabled:opacity-30"
            aria-label="Next">
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </button>
          <button onClick={() => router.push('/domains')}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium group transition-colors ml-1">
            View all
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visible.map((tool, i) => (
            <ArrivalCard key={`${tool.id}-${currentIndex}`} tool={tool} index={i} direction={direction} />
          ))}
        </div>
      </AnimatePresence>

      {/* Pagination dots */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => { setIsAutoPlaying(false); setDirection(i > curPage ? 1 : -1); setCurrentIndex(i * PER_PAGE) }}
              className="rounded-full transition-all duration-200"
              style={{
                width:      i === curPage ? 20 : 6,
                height:     6,
                background: i === curPage ? '#6366F1' : '#E5E7EB',
              }}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-neutral-400">
        New readings added weekly · All calibrated to your synthesis profile
      </p>
    </div>
  )
}
