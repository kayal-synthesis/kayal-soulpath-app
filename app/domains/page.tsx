'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, SlidersHorizontal, X, TrendingUp, Clock, DollarSign, ArrowRight, ChevronLeft } from 'lucide-react'

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
  { id: 'oracle-temple', name: "Omni-Seer's Sanctum",    icon: '👁️',  tools: omniTools,         color: 'from-purple-600 to-indigo-600',  bg: 'bg-purple-50',  text: 'text-purple-700', url: '/domain/omni-seer-sanctum',     description: 'Ancient wisdom and divination tools for profound life insights.'                        },
  { id: 'voice',         name: 'Voice of Prophecy',       icon: '🎙️',  tools: voiceTools,        color: 'from-blue-600 to-cyan-600',      bg: 'bg-blue-50',    text: 'text-blue-700',   url: '/domain/voice-of-prophecy',     description: 'Live voice conversations with an AI oracle trained on your complete synthesis.'         },
  { id: 'sacred-script', name: 'Sacred Script',           icon: '📜',  tools: sacredScriptTools, color: 'from-amber-600 to-orange-600',   bg: 'bg-amber-50',   text: 'text-amber-700',  url: '/domain/sacred-script',         description: 'Deep written dialogue with a sacred scribe trained on your complete synthesis.'         },
  { id: 'time-keeper',   name: 'Eternal Clock',           icon: '⏰',  tools: timeKeeperTools,   color: 'from-emerald-600 to-teal-600',   bg: 'bg-emerald-50', text: 'text-emerald-700', url: '/domain/eternal-clock',         description: 'Temporal wisdom tools to understand your relationship with time.'                       },
  { id: 'love',          name: 'Love & Relationships',    icon: '💞',  tools: loveTools,         color: 'from-red-600 to-pink-600',       bg: 'bg-red-50',     text: 'text-red-700',    url: '/domain/love-relationships',    description: 'Deep relationship insights and romantic guidance for soul connections.'                 },
  { id: 'wealth',        name: 'Wealth & Career',         icon: '💰',  tools: wealthTools,       color: 'from-green-600 to-emerald-600',  bg: 'bg-green-50',   text: 'text-green-700',  url: '/domain/wealth-career',         description: 'Abundance manifestation tools for financial freedom and career success.'                },
  { id: 'wellness',      name: 'Wellness & Spirituality', icon: '🌙',  tools: wellnessTools,     color: 'from-violet-600 to-purple-600',  bg: 'bg-violet-50',  text: 'text-violet-700', url: '/domain/wellness-spirituality',  description: 'Spiritual growth and wellness tools for awakening and inner healing.'                   },
  { id: 'life-path',     name: 'Life Path & Destiny',     icon: '🌟',  tools: lifePathTools,     color: 'from-amber-600 to-yellow-600',   bg: 'bg-yellow-50',  text: 'text-yellow-700', url: '/domain/life-path-destiny',     description: 'Life purpose and destiny revelation tools to discover why you are here.'                },
]

const priceRanges = [
  { label: 'All Prices', value: 'all'      },
  { label: 'Under $20',  value: 'under-20' },
  { label: '$20 - $40',  value: '20-40'    },
  { label: '$40+',       value: 'over-40'  },
]

const sortOptions = [
  { label: 'Popular',     value: 'popular',    icon: TrendingUp },
  { label: 'Newest',      value: 'newest',     icon: Clock      },
  { label: 'Price: Low',  value: 'price-asc',  icon: DollarSign },
  { label: 'Price: High', value: 'price-desc', icon: DollarSign },
]

function filterByPrice(tools: any[], priceRange: string) {
  if (priceRange === 'all') return tools
  if (priceRange === 'under-20') return tools.filter(t => t.price < 20)
  if (priceRange === '20-40')    return tools.filter(t => t.price >= 20 && t.price <= 40)
  if (priceRange === 'over-40')  return tools.filter(t => t.price > 40)
  return tools
}

function sortTools(tools: any[], sort: string) {
  const arr = [...tools]
  if (sort === 'price-asc')  return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
  if (sort === 'price-desc') return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
  if (sort === 'newest')     return arr.reverse()
  return arr
}

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
    tools = tools.filter((t: any) =>
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    tools = filterByPrice(tools, activePrice)
    tools = sortTools(tools, activeSort)
    return tools
  }, [activeDomain, searchQuery, activePrice, activeSort, selectedDomain])

  const showingTools = activeDomain !== 'all' || searchQuery || activePrice !== 'all'

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 lg:pb-0">

      {/* Header */}
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
              <h1 className="text-lg font-serif text-neutral-900">
                {selectedDomain ? selectedDomain.name : 'Explore All Domains'}
              </h1>
              <p className="text-xs text-neutral-400">
                {showingTools ? `${visibleTools.length} tools found` : `${totalTools} tools across ${domains.length} domains`}
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                showFilters || activePrice !== 'all' || activeSort !== 'popular'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-neutral-600 border-neutral-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {(activePrice !== 'all' || activeSort !== 'popular') && (
                <span className="w-4 h-4 bg-white/30 rounded-full text-[10px] flex items-center justify-center">
                  {(activePrice !== 'all' ? 1 : 0) + (activeSort !== 'popular' ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5">

        {/* Search */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-neutral-400" />
          </div>
          <input
            type="text"
            placeholder="Search tools and domains..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 bg-white border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 shadow-sm transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-4 flex items-center text-neutral-400 hover:text-neutral-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 mb-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Price Range</p>
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
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Sort By</p>
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
                {(activePrice !== 'all' || activeSort !== 'popular') && (
                  <button
                    onClick={() => { setActivePrice('all'); setActiveSort('popular') }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Domain Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveDomain('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              activeDomain === 'all'
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-400'
            }`}
          >
            All ({totalTools})
          </button>
          {domains.map(domain => (
            <button
              key={domain.id}
              onClick={() => setActiveDomain(domain.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                activeDomain === domain.id
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-400'
              }`}
            >
              <span>{domain.icon}</span>
              {domain.name} ({domain.tools.length})
            </button>
          ))}
        </div>

        {/* Domain Cards View */}
        {!showingTools && (
          <>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Domains', value: domains.length, color: 'text-primary-600' },
                { label: 'Tools',   value: totalTools,     color: 'text-emerald-600' },
                { label: 'Featured', value: 4,             color: 'text-amber-600'   },
                { label: 'New',      value: 12,            color: 'text-rose-600'    },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-3 text-center">
                  <p className={`text-xl font-serif font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {domains.map((domain, index) => (
                <motion.div
                  key={domain.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setActiveDomain(domain.id)}
                  className="bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all cursor-pointer group p-5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${domain.color} flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform`}>
                      {domain.icon}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${domain.bg} ${domain.text}`}>
                      {domain.tools.length} tools
                    </span>
                  </div>
                  <h3 className="font-serif font-semibold text-neutral-900 mb-2 group-hover:text-primary-600 transition-colors leading-tight">
                    {domain.name}
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 mb-4">
                    {domain.description}
                  </p>
                  <div className="flex items-center text-xs font-semibold text-primary-600 gap-1 group-hover:gap-2 transition-all">
                    Browse Tools <ArrowRight className="w-3 h-3" />
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Tools View */}
        {showingTools && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleTools.map((tool: any, index: number) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                onClick={() => router.push(`/purchase/${tool.id}`)}
                className="bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all cursor-pointer group p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{tool.emoji || '✨'}</div>
                  <span className="text-sm font-bold text-primary-600">${tool.price}</span>
                </div>
                <h3 className="font-serif font-semibold text-neutral-900 mb-1.5 group-hover:text-primary-600 transition-colors text-sm leading-tight">
                  {tool.name}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 mb-4">
                  {tool.tagline || tool.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">{tool.deliveryMinutes || 20} min</span>
                  <div className="flex items-center text-xs font-semibold text-primary-600 gap-1 group-hover:gap-2 transition-all">
                    Get Reading <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </motion.div>
            ))}

            {visibleTools.length === 0 && (
              <div className="col-span-full text-center py-16">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-neutral-500 font-medium">No tools found</p>
                <p className="text-neutral-400 text-sm mt-1">Try adjusting your filters</p>
                <button
                  onClick={() => { setSearchQuery(''); setActivePrice('all'); setActiveSort('popular') }}
                  className="mt-4 text-primary-600 text-sm font-medium hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}