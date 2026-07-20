'use client'

import { ToolCard, BundleSelector } from '@/components/ToolCards'
import { omniTools } from '@/lib/constants/omni-seer-tools'
import type { ToolData } from '@/components/ToolCards'
import { useMemo, useState } from 'react'
import { Crown, ArrowLeft, Search, X, TrendingUp, Clock, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'

const tools: ToolData[] = omniTools.map(t => ({
  ...t,
  domain: 'oracle-temple' as const,
}))

type SortValue = 'popular' | 'newest' | 'price-asc' | 'price-desc'

const sortOptions: { label: string; value: SortValue; icon: typeof TrendingUp }[] = [
  { label: 'Popular',     value: 'popular',    icon: TrendingUp },
  { label: 'Newest',      value: 'newest',     icon: Clock },
  { label: 'Price: Low',  value: 'price-asc',  icon: DollarSign },
  { label: 'Price: High', value: 'price-desc', icon: DollarSign },
]

export default function OmniSeerSanctumPage() {
  const router = useRouter()
  const [view, setView] = useState<'browse' | 'bundle'>('browse')
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<SortValue>('popular')

  const visibleTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    const filtered = q
      ? tools.filter(t =>
          t.name.toLowerCase().includes(q) ||
          t.tagline.toLowerCase().includes(q) ||
          (t.hook ?? '').toLowerCase().includes(q)
        )
      : tools

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        case 'newest':
          return Number(!!b.isNew) - Number(!!a.isNew)
        case 'popular':
        default: {
          const scoreA = Number(!!a.isBestSeller) * 2 + Number(!!a.isPopular) + (a.rating ?? 0) / 10
          const scoreB = Number(!!b.isBestSeller) * 2 + Number(!!b.isPopular) + (b.rating ?? 0) / 10
          return scoreB - scoreA
        }
      }
    })

    return sorted
  }, [searchQuery, sort])

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-yellow-50 rounded-2xl flex items-center justify-center text-3xl">
                👑
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs font-semibold text-yellow-600 uppercase tracking-widest">Grand Revelation</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Omni-Seer Sanctum</h1>
                <p className="text-neutral-500 mt-1 text-sm max-w-xl">Every system. Every domain. The most complete synthesis readings available — across {tools.length} dedicated readings.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setView('browse')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'browse' ? 'bg-yellow-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>Browse All</button>
              <button onClick={() => setView('bundle')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'bundle' ? 'bg-yellow-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>Bundle &amp; Save</button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {view === 'bundle' ? (
          <BundleSelector tools={tools} />
        ) : (
          <>
            {/* Search + Sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-neutral-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search readings..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 shadow-sm transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-4 flex items-center text-neutral-400 hover:text-neutral-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                {sortOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSort(opt.value)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
                      sort === opt.value
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-yellow-400'
                    }`}
                  >
                    <opt.icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-neutral-400 mb-4">
              {visibleTools.length} of {tools.length} readings
            </p>

            {visibleTools.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleTools.map(tool => (<ToolCard key={tool.id} tool={tool} />))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-neutral-500 font-medium">No readings found</p>
                <p className="text-neutral-400 text-sm mt-1">Try a different search term</p>
                <button onClick={() => setSearchQuery('')} className="mt-4 text-yellow-600 text-sm font-medium hover:underline">
                  Clear search
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
