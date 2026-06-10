'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Star, ArrowRight, Upload, Sparkles, ChevronRight } from 'lucide-react'
import { domains } from '@/lib/tools/all-tools-index'

// ─────────────────────────────────────────────────────────────
// Domain accent colours — used for the card top bar + accents
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

// ─────────────────────────────────────────────────────────────
// Star rating row
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Single premium tool card
// ─────────────────────────────────────────────────────────────
function ToolCard({ tool, index }: { tool: any; index: number }) {
  const router  = useRouter()
  const accent  = DOMAIN_ACCENT[tool.category] ?? DEFAULT_ACCENT
  const features: string[] = Array.isArray(tool.features) ? tool.features.slice(0, 3) : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      onClick={() => router.push(`/purchase/${tool.id}`)}
      className="cursor-pointer group relative flex flex-col bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.07)',
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)`}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'}
    >
      {/* Domain accent bar */}
      <div className="h-0.5 w-full flex-shrink-0"
        style={{ background: `linear-gradient(90deg,${accent.from},${accent.to})` }} />

      <div className="flex flex-col flex-1 p-5">

        {/* Top row: emoji + badges */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: accent.bg, border: `1px solid ${accent.badge}` }}>
            {tool.emoji || '🔮'}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {tool.isBestSeller && (
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                style={{ background: accent.badge, color: accent.text }}>
                Best Seller
              </span>
            )}
            {tool.isPopular && !tool.isBestSeller && (
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                style={{ background: accent.badge, color: accent.text }}>
                Popular
              </span>
            )}
            {tool.isNew && (
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                New
              </span>
            )}
          </div>
        </div>

        {/* Domain label */}
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5"
          style={{ color: accent.text + 'BB' }}>
          {tool.domain}
        </p>

        {/* Tool name */}
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Rating */}
        <div className="mb-4">
          <StarRow rating={tool.rating ?? 4.9} count={tool.reviewCount} />
        </div>

        {/* Divider */}
        <div className="h-px bg-neutral-100 mb-4" />

        {/* Price + CTA */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-2xl font-serif font-bold text-neutral-900">${tool.price}</span>
            {tool.duration && (
              <span className="text-xs text-neutral-400 ml-1">{tool.duration}</span>
            )}
          </div>
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
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// BestsellerTools
// ─────────────────────────────────────────────────────────────
export const BestsellerTools = () => {
  const router = useRouter()
  const [tools, setTools]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Pull bestsellers first, then popular, then fill from all domains
    const all = domains.flatMap(d =>
      d.tools.map(t => ({ ...t, domainId: d.id }))
    )
    const bestsellers = all.filter(t => t.isBestSeller)
    const popular     = all.filter(t => t.isPopular && !t.isBestSeller)
    const rest        = all.filter(t => !t.isPopular && !t.isBestSeller)
    const merged      = [...bestsellers, ...popular, ...rest]

    // Deduplicate by id, take first 6
    const seen = new Set<string>()
    const deduped = merged.filter(t => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    }).slice(0, 6)

    setTools(deduped)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-neutral-100 rounded animate-pulse" />
          <div className="h-4 w-24 bg-neutral-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-neutral-100 animate-pulse space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 bg-neutral-100 rounded-2xl" />
                <div className="h-5 w-20 bg-neutral-100 rounded-full" />
              </div>
              <div className="h-4 bg-neutral-100 rounded w-3/4" />
              <div className="h-3 bg-neutral-100 rounded w-full" />
              <div className="h-3 bg-neutral-100 rounded w-5/6" />
              <div className="space-y-1.5">
                {[1,2,3].map(j => <div key={j} className="h-2.5 bg-neutral-100 rounded w-4/5" />)}
              </div>
              <div className="h-px bg-neutral-100" />
              <div className="flex items-center justify-between">
                <div className="h-7 w-12 bg-neutral-100 rounded" />
                <div className="h-8 w-28 bg-neutral-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-lg font-serif text-neutral-900">Featured Readings</h2>
          <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            Bestsellers
          </span>
        </div>
        <button
          onClick={() => router.push('/domains')}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium group transition-colors"
        >
          Browse all
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool, i) => (
          <ToolCard key={tool.id} tool={tool} index={i} />
        ))}
      </div>

      <p className="text-center text-xs text-neutral-400">
        All readings delivered within 20 minutes · Powered by your complete synthesis profile
      </p>
    </div>
  )
}
