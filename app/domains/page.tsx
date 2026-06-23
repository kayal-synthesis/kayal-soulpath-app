'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Search, SlidersHorizontal, X, TrendingUp,
  Clock, DollarSign, ArrowRight, Camera, Hand, Scan
} from 'lucide-react'

import { omniTools }         from '@/lib/constants/omni-seer-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'

const allTools: any[] = [
  ...omniTools, ...voiceTools, ...sacredScriptTools, ...timeKeeperTools,
  ...loveTools, ...wealthTools, ...wellnessTools, ...lifePathTools,
]

const domains = [
  {
    id: 'oracle-temple',
    name: "Omni-Seer's Sanctum",
    shortName: 'Omni-Seer',
    icon: '👁️',
    tools: omniTools,
    color: 'from-purple-600 to-indigo-600',
    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200',
    description: 'Ancient wisdom and divination tools for profound life insights through numerology, astrology, face and palm readings.',
  },
  {
    id: 'voice',
    name: 'Voice of Prophecy',
    shortName: 'Voice',
    icon: '🎙️',
    tools: voiceTools,
    color: 'from-blue-600 to-cyan-600',
    bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',
    description: 'Live voice conversations with an AI oracle trained on your complete synthesis.',
  },
  {
    id: 'sacred-script',
    name: 'Sacred Script',
    shortName: 'Sacred',
    icon: '📜',
    tools: sacredScriptTools,
    color: 'from-amber-600 to-orange-600',
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
    description: 'Deep written dialogue with a sacred scribe trained on your complete synthesis.',
  },
  {
    id: 'time-keeper',
    name: 'Eternal Clock',
    shortName: 'Time',
    icon: '⏰',
    tools: timeKeeperTools,
    color: 'from-emerald-600 to-teal-600',
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
    description: 'Temporal wisdom tools to understand your relationship with time and destiny cycles.',
  },
  {
    id: 'love',
    name: 'Love & Relationships',
    shortName: 'Love',
    icon: '💞',
    tools: loveTools,
    color: 'from-red-600 to-pink-600',
    bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200',
    description: 'Deep relationship insights and romantic guidance for soul connections.',
  },
  {
    id: 'wealth',
    name: 'Wealth & Career',
    shortName: 'Wealth',
    icon: '💰',
    tools: wealthTools,
    color: 'from-green-600 to-emerald-600',
    bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200',
    description: 'Abundance manifestation tools for financial freedom and career success.',
  },
  {
    id: 'wellness',
    name: 'Wellness & Spirituality',
    shortName: 'Wellness',
    icon: '🌙',
    tools: wellnessTools,
    color: 'from-violet-600 to-purple-600',
    bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200',
    description: 'Spiritual growth and wellness tools for awakening and inner healing.',
  },
  {
    id: 'life-path',
    name: 'Life Path & Destiny',
    shortName: 'Life Path',
    icon: '🌟',
    tools: lifePathTools,
    color: 'from-amber-600 to-yellow-600',
    bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200',
    description: 'Life purpose and destiny revelation tools to discover why you are here.',
  },
]

const priceRanges = [
  { label: 'All Prices', value: 'all'      },
  { label: 'Under $39',  value: 'under-39' },
  { label: '$39 – $99',  value: '39-99'    },
  { label: '$99 – $149', value: '99-149'   },
  { label: '$149+',      value: 'over-149' },
]

const sortOptions = [
  { label: 'Popular',     value: 'popular',    icon: TrendingUp },
  { label: 'Newest',      value: 'newest',     icon: Clock      },
  { label: 'Price: Low',  value: 'price-asc',  icon: DollarSign },
  { label: 'Price: High', value: 'price-desc', icon: DollarSign },
]

function filterByPrice(tools: any[], range: string) {
  if (range === 'all')      return tools
  if (range === 'under-39') return tools.filter(t => (t.price ?? 0) < 39)
  if (range === '39-99')    return tools.filter(t => (t.price ?? 0) >= 39  && (t.price ?? 0) <= 99)
  if (range === '99-149')   return tools.filter(t => (t.price ?? 0) >= 99  && (t.price ?? 0) <= 149)
  if (range === 'over-149') return tools.filter(t => (t.price ?? 0) > 149)
  return tools
}

function sortTools(tools: any[], sort: string) {
  const arr = [...tools]
  if (sort === 'price-asc')  return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
  if (sort === 'price-desc') return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
  if (sort === 'newest')     return arr.reverse()
  return arr
}

// ── Image Badge ──────────────────────────────────────────
function ImageBadge({ type }: { type: 'face' | 'palm' | 'both' }) {
  if (type === 'face') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-semibold">
      <Camera className="w-2.5 h-2.5" /> Face
    </span>
  )
  if (type === 'palm') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-semibold">
      <Hand className="w-2.5 h-2.5" /> Palm
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-[10px] font-semibold">
      <Scan className="w-2.5 h-2.5" /> Face+Palm
    </span>
  )
}

// ── Tool Card ────────────────────────────────────────────
function ToolCard({ tool, onClick }: { tool: any; onClick: () => void }) {
  const imageType = tool.requiresImage?.type as 'face' | 'palm' | 'both' | undefined
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-200 cursor-pointer group p-5 flex flex-col"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl leading-none">{tool.emoji || '✨'}</div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-bold text-primary-600">${tool.price}</span>
          {tool.deliveryMinutes && (
            <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{tool.deliveryMinutes} min
            </span>
          )}
        </div>
      </div>
      <h3 className="font-serif font-semibold text-neutral-900 mb-1.5 group-hover:text-primary-600 transition-colors text-sm leading-snug line-clamp-2">
        {tool.name}
      </h3>
      <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 mb-3 flex-1">
        {tool.tagline || tool.hook || tool.description}
      </p>
      <div className="flex items-center justify-between pt-2 border-t border-neutral-50">
        <div>{imageType && <ImageBadge type={imageType} />}</div>
        <div className="flex items-center text-xs font-semibold text-primary-600 gap-1 group-hover:gap-2 transition-all">
          Get Reading <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
}

// ── Domain Card ──────────────────────────────────────────
function DomainCard({ domain, onClick }: { domain: typeof domains[0]; onClick: () => void }) {
  const imageTools = domain.tools.filter((t: any) => t.requiresImage).length
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-200 cursor-pointer group p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${domain.color} flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform duration-200`}>
          {domain.icon}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${domain.bg} ${domain.text} border ${domain.border}`}>
          {domain.tools.length} tools
        </span>
      </div>
      <h3 className="font-serif font-medium text-neutral-900 mb-2 group-hover:text-primary-600 transition-colors leading-tight text-sm">
        {domain.name}
      </h3>
      <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 mb-4">
        {domain.description}
      </p>
      <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
        {imageTools > 0 ? (
          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
            <Camera className="w-3 h-3" /> {imageTools} require photos
          </span>
        ) : <span />}
        <div className="flex items-center text-xs font-semibold text-primary-600 gap-1 group-hover:gap-2 transition-all">
          Browse <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
}

// ── Domain Hero ──────────────────────────────────────────
function DomainHero({ domain, toolCount }: { domain: typeof domains[0]; toolCount: number }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${domain.color} p-5 mb-5 text-white shadow-md`}>
      <div className="flex items-center gap-4">
        <div className="text-4xl">{domain.icon}</div>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif font-bold text-lg leading-tight">{domain.name}</h2>
          <p className="text-white/80 text-xs mt-1 leading-relaxed line-clamp-2">{domain.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold">{toolCount}</p>
          <p className="text-white/70 text-xs">tools</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────
export default function DomainsPage() {
  const router = useRouter()
  const [searchQuery,  setSearchQuery]  = useState('')
  const [activeDomain, setActiveDomain] = useState('all')
  const [activePrice,  setActivePrice]  = useState('all')
  const [activeSort,   setActiveSort]   = useState('popular')
  const [showFilters,  setShowFilters]  = useState(false)

  const totalTools     = allTools.length
  const selectedDomain = domains.find(d => d.id === activeDomain)

  const visibleTools = useMemo(() => {
    let tools = activeDomain === 'all' ? allTools : (selectedDomain?.tools ?? [])
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      tools = tools.filter((t: any) =>
        t.name?.toLowerCase().includes(q)        ||
        t.tagline?.toLowerCase().includes(q)     ||
        t.hook?.toLowerCase().includes(q)        ||
        t.description?.toLowerCase().includes(q)
      )
    }
    tools = filterByPrice(tools, activePrice)
    tools = sortTools(tools, activeSort)
    return tools
  }, [activeDomain, searchQuery, activePrice, activeSort, selectedDomain])

  const showingTools  = activeDomain !== 'all' || !!searchQuery.trim() || activePrice !== 'all'
  const activeFilters = (activePrice !== 'all' ? 1 : 0) + (activeSort !== 'popular' ? 1 : 0)

  const clearAll = () => {
    setSearchQuery('')
    setActivePrice('all')
    setActiveSort('popular')
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 lg:pb-8">

      {/* ── Header ── */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-neutral-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => activeDomain !== 'all' ? setActiveDomain('all') : router.back()}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-serif text-neutral-900 truncate">
                {selectedDomain ? selectedDomain.name : 'Explore Domains'}
              </h1>
              <p className="text-xs text-neutral-400">
                {showingTools
                  ? `${visibleTools.length} tool${visibleTools.length !== 1 ? 's' : ''} found`
                  : `${totalTools} tools · ${domains.length} domains`}
              </p>
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex-shrink-0 ${
                showFilters || activeFilters > 0
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilters > 0 && (
                <span className="w-4 h-4 bg-white/30 rounded-full text-[10px] flex items-center justify-center font-bold">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5">

        {/* ── Search ── */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tools by name or topic..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 bg-white border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Filter Panel ── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 mb-4 space-y-4">
                <div>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    Price Range
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {priceRanges.map(price => (
                      <button
                        key={price.value}
                        onClick={() => setActivePrice(price.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          activePrice === price.value
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-400 hover:text-primary-600'
                        }`}
                      >
                        {price.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    Sort By
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sortOptions.map(sort => (
                      <button
                        key={sort.value}
                        onClick={() => setActiveSort(sort.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          activeSort === sort.value
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-400 hover:text-primary-600'
                        }`}
                      >
                        <sort.icon className="w-3 h-3" />
                        {sort.label}
                      </button>
                    ))}
                  </div>
                </div>
                {activeFilters > 0 && (
                  <button
                    onClick={() => { setActivePrice('all'); setActiveSort('popular') }}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold"
                  >
                    ✕ Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Domain Pills — wrapping, compact short names ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveDomain('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeDomain === 'all'
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'
            }`}
          >
            All ({totalTools})
          </button>
          {domains.map(domain => (
            <button
              key={domain.id}
              onClick={() => setActiveDomain(domain.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeDomain === domain.id
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'
              }`}
            >
              <span className="text-sm leading-none">{domain.icon}</span>
              {domain.shortName} ({domain.tools.length})
            </button>
          ))}
        </div>

        {/* ── Domain Hero ── */}
        {selectedDomain && showingTools && (
          <DomainHero domain={selectedDomain} toolCount={visibleTools.length} />
        )}

        {/* ── All Domains View ── */}
        {!showingTools && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Domains',   value: domains.length,                                       color: 'text-primary-600' },
                { label: 'Tools',     value: totalTools,                                           color: 'text-emerald-600' },
                { label: 'w/ Photos', value: allTools.filter((t: any) => t.requiresImage).length, color: 'text-blue-600'    },
                { label: 'Categories', value: domains.length,                                      color: 'text-amber-600'   },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-3 text-center">
                  <p className={`text-xl font-serif font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Photo legend */}
            <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-white rounded-xl border border-neutral-100 shadow-sm">
              <span className="text-xs text-neutral-400 font-medium">Photo required:</span>
              <ImageBadge type="face" />
              <ImageBadge type="palm" />
              <ImageBadge type="both" />
            </div>

            {/* Domain grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {domains.map((domain, index) => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  onClick={() => setActiveDomain(domain.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Tools Grid ── */}
        {showingTools && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleTools.map((tool: any, index: number) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onClick={() => router.push(`/purchase/${tool.id}`)}
              />
            ))}

            {visibleTools.length === 0 && (
              <div className="col-span-full text-center py-16">
                <p className="text-5xl mb-4">🔍</p>
                <p className="text-neutral-600 font-semibold text-lg">No tools found</p>
                <p className="text-neutral-400 text-sm mt-1 mb-5">
                  Try adjusting your search or filters
                </p>
                <button
                  onClick={clearAll}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}