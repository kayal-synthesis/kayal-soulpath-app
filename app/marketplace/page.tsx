'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  ArrowLeft, Search, Filter, Sparkles, Star,
  Heart, Briefcase, TrendingUp, Moon, Zap,
  Crown, Clock, Headphones, Mic, BookOpen,
  Eye, FileText, MessageCircle, Infinity,
  ChevronRight, Flame, Camera
} from 'lucide-react'

// Import all your tool constants
import { omniTools } from '@/lib/constants/omni-seer-tools'
import { voiceTools } from '@/lib/constants/voice-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools } from '@/lib/constants/time-keeper-tools'
import { loveTools } from '@/lib/constants/love-tools'
import { wealthTools as careerTools } from '@/lib/constants/wealth-tools'
import { wealthTools } from '@/lib/constants/wealth-tools'
import { wellnessTools as spiritualTools } from '@/lib/constants/wellness-spiritual'
import { wellnessTools as healthTools } from '@/lib/constants/wellness-spiritual'
import { lifePathTools } from '@/lib/constants/life-path-tools'

// Combine all tools
const allTools = [
  ...omniTools,
  ...voiceTools,
  ...sacredScriptTools,
  ...timeKeeperTools,
  ...loveTools,
  ...careerTools,
  ...wealthTools,
  ...spiritualTools,
  ...healthTools,
  ...lifePathTools
]

// Domain mapping for URLs
const domainUrls: Record<string, string> = {
  'oracle-temple': '/domain/omni-seer-sanctum',
  'voice': '/domain/voice-of-prophecy',
  'sacred-script': '/domain/sacred-script',
  'time-keeper': '/domain/eternal-clock',
  'love': '/domain/love-relationships',
  'wealth': '/domain/wealth-career',
  'spiritual': '/domain/wellness-spirituality',
  'life-path': '/domain/life-path-destiny'
}

export default function MarketplacePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [tools, setTools] = useState(allTools)

  const categories = [
    { id: 'all', name: 'All Tools', count: allTools.length },
    { id: 'oracle-temple', name: 'Omni-Seer', count: omniTools.length },
    { id: 'voice', name: 'Voice', count: voiceTools.length },
    { id: 'sacred-script', name: 'Sacred Script', count: sacredScriptTools.length },
    { id: 'time-keeper', name: 'Time Keeper', count: timeKeeperTools.length },
    { id: 'love', name: 'Love', count: loveTools.length },
    { id: 'wealth', name: 'Wealth', count: wealthTools.length + careerTools.length },
    { id: 'spiritual', name: 'Spiritual', count: spiritualTools.length + healthTools.length },
    { id: 'life-path', name: 'Life Path', count: lifePathTools.length }
  ]

  // Filter and sort tools
  const filteredTools = tools
    .filter(tool => {
      if (searchQuery && !tool.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (selectedCategory !== 'all' && tool.category !== selectedCategory) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0)
      if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0)
      if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0)
      if (sortBy === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)
      return 0
    })

  const getToolTypeIcon = (category: string) => {
    switch(category) {
      case 'voice': return <Headphones className="w-3 h-3" />
      case 'sacred-script': return <MessageCircle className="w-3 h-3" />
      case 'time-keeper': return <Eye className="w-3 h-3" />
      default: return <FileText className="w-3 h-3" />
    }
  }

  const getToolTypeLabel = (category: string) => {
    switch(category) {
      case 'voice': return 'Audio Session'
      case 'sacred-script': return 'Live Chat'
      case 'time-keeper': return 'Reading'
      default: return 'PDF Report'
    }
  }

  const getToolTypeColor = (category: string) => {
    switch(category) {
      case 'voice': return 'text-blue-600 bg-blue-50'
      case 'sacred-script': return 'text-purple-600 bg-purple-50'
      case 'time-keeper': return 'text-amber-600 bg-amber-50'
      default: return 'text-green-600 bg-green-50'
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-serif">Marketplace</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-serif mb-2">Discover Your Path</h2>
          <p className="text-primary-100 max-w-2xl">
            Explore our collection of over {allTools.length} spiritual tools across 8 domains. 
            Find the perfect guidance for your journey.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search tools by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white min-w-[150px]"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.count})
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white min-w-[150px]"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        {/* Results Count */}
        <p className="text-sm text-neutral-500 mb-4">
          Showing {filteredTools.length} of {allTools.length} tools
        </p>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool, index) => {
            const typeColor = getToolTypeColor(tool.category)
            const TypeIcon = getToolTypeIcon(tool.category)
            const typeLabel = getToolTypeLabel(tool.category)
            const domainUrl = domainUrls[tool.category] || '/domains'

            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-5 hover:shadow-xl transition border-2 border-transparent hover:border-primary-200">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-2xl">
                        {tool.emoji}
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">{tool.name}</h3>
                        <button
                          onClick={() => router.push(domainUrl)}
                          className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-0.5"
                        >
                          {tool.category}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {tool.isPopular && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 px-2 py-0.5">
                        <Flame className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                  </div>

                  {/* Type Badge */}
                  <div className="mb-3">
                    <Badge variant="outline" className={typeColor}>
                      {TypeIcon}
                      <span className="ml-1">{typeLabel}</span>
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                    {tool.description || tool.subtitle}
                  </p>

                  {/* Features Preview */}
                  {tool.features && tool.features.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {tool.features.slice(0, 2).map((feature: string, i: number) => (
                        <div key={i} className="flex items-start gap-1 text-xs">
                          <Sparkles className="w-3 h-3 text-primary-500 mt-0.5 flex-shrink-0" />
                          <span className="text-neutral-600 line-clamp-1">{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tool Details */}
                  <div className="flex items-center gap-3 text-xs text-neutral-500 mb-3">
                    {tool.estimatedReadTime && (
                      <>
                        <span>{tool.estimatedReadTime} min</span>
                        <span>•</span>
                      </>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      {tool.isPopular ? '4.9' : '4.7'} (120)
                    </span>
                  </div>

                  {/* Image Requirement */}
                  {tool.requiresImage && (
                    <div className="mb-3 text-xs flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg">
                      <Camera className="w-3 h-3" />
                      Requires: {tool.requiresImageType === 'both' ? 'Face + Palm' : 
                                tool.requiresImageType === 'face' ? 'Face' : 'Palm'}
                    </div>
                  )}

                  {/* Price and Action */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <span className="text-xl font-bold text-primary-600">${tool.price}</span>
                      <span className="text-xs text-neutral-400 ml-1">one-time</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/purchase/${tool.id}`)}
                    >
                      View Tool
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {filteredTools.length === 0 && (
          <Card className="p-12 text-center">
            <Search className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-2">No tools found</h3>
            <p className="text-sm text-neutral-500">Try adjusting your search or filters</p>
          </Card>
        )}
      </div>
    </div>
  )
}