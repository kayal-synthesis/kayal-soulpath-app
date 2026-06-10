'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Search, Filter, X, Sparkles, TrendingUp, 
  Heart, Briefcase, TrendingUp as WealthIcon,
  Moon, Zap, Crown, Infinity, Mic, BookOpen,
  Eye, Target, Award, Gift, Percent,
  ChevronLeft, ChevronRight, Grid3x3, List,
  SlidersHorizontal, RotateCcw, BookmarkPlus,
  Bookmark, ChevronDown, ChevronUp, Star,
  Clock, DollarSign, Users, BarChart
} from 'lucide-react'

interface Tool {
  id: string
  name: string
  emoji: string
  category: string
  subcategory: string
  description: string
  price: number
  commission: number
  avgConversion: number
  monthlySales: number
  isNew: boolean
  isPopular: boolean
  isTrending: boolean
  tags: string[]
}

interface ToolSelectorProps {
  onSelect: (toolId: string, toolName: string) => void
  selectedToolId?: string
  multiSelect?: boolean
  maxSelections?: number
}

export function ToolSelector({ 
  onSelect, 
  selectedToolId,
  multiSelect = false,
  maxSelections = 5
}: ToolSelectorProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('recommended')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTools, setSelectedTools] = useState<string[]>(
    selectedToolId ? [selectedToolId] : []
  )
  const [favoriteTools, setFavoriteTools] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('favoriteTools')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  // Save favorites to localStorage
  const toggleFavorite = (toolId: string) => {
    const newFavorites = favoriteTools.includes(toolId)
      ? favoriteTools.filter(id => id !== toolId)
      : [...favoriteTools, toolId]
    
    setFavoriteTools(newFavorites)
    localStorage.setItem('favoriteTools', JSON.stringify(newFavorites))
  }

  // Mock tools data (140+ tools)
  const allTools: Tool[] = useMemo(() => {
    const categories = [
      { id: 'love', name: 'Love & Relationships', emoji: '💞', count: 18 },
      { id: 'wealth', name: 'Wealth & Career', emoji: '💰', count: 22 },
      { id: 'health', name: 'Health & Wellness', emoji: '🌿', count: 15 },
      { id: 'spiritual', name: 'Spiritual Growth', emoji: '🕉️', count: 20 },
      { id: 'voice', name: 'Voice Tools', emoji: '🎙️', count: 12 },
      { id: 'oracle', name: 'Oracle & Divination', emoji: '🔮', count: 25 },
      { id: 'time', name: 'Time & Destiny', emoji: '⏰', count: 18 },
      { id: 'script', name: 'Sacred Scripts', emoji: '📜', count: 10 }
    ]

    const tools: Tool[] = []
    
    categories.forEach(cat => {
      for (let i = 1; i <= cat.count; i++) {
        tools.push({
          id: `${cat.id}-${i}`,
          name: `${cat.name} Tool ${i}`,
          emoji: cat.emoji,
          category: cat.id,
          subcategory: 'General',
          description: `Powerful ${cat.name.toLowerCase()} tool for transformation and insight.`,
          price: Math.floor(Math.random() * 150) + 27,
          commission: Math.floor(Math.random() * 15) + 10,
          avgConversion: Number((Math.random() * 8 + 2).toFixed(1)),
          monthlySales: Math.floor(Math.random() * 200) + 20,
          isNew: Math.random() > 0.7,
          isPopular: Math.random() > 0.8,
          isTrending: Math.random() > 0.85,
          tags: [cat.name, 'featured', 'bestseller'].slice(0, Math.floor(Math.random() * 3) + 1)
        })
      }
    })
    
    return tools.sort((a, b) => b.monthlySales - a.monthlySales)
  }, [])

  const categories = [
    { id: 'all', name: 'All Tools', count: allTools.length },
    { id: 'love', name: 'Love', count: allTools.filter(t => t.category === 'love').length },
    { id: 'wealth', name: 'Wealth', count: allTools.filter(t => t.category === 'wealth').length },
    { id: 'health', name: 'Health', count: allTools.filter(t => t.category === 'health').length },
    { id: 'spiritual', name: 'Spiritual', count: allTools.filter(t => t.category === 'spiritual').length },
    { id: 'voice', name: 'Voice', count: allTools.filter(t => t.category === 'voice').length },
    { id: 'oracle', name: 'Oracle', count: allTools.filter(t => t.category === 'oracle').length },
    { id: 'time', name: 'Time', count: allTools.filter(t => t.category === 'time').length },
    { id: 'script', name: 'Script', count: allTools.filter(t => t.category === 'script').length },
  ]

  const filteredTools = useMemo(() => {
    return allTools
      .filter(tool => {
        if (search) {
          const searchLower = search.toLowerCase()
          return tool.name.toLowerCase().includes(searchLower) ||
                 tool.description.toLowerCase().includes(searchLower)
        }
        return true
      })
      .filter(tool => selectedCategory === 'all' || tool.category === selectedCategory)
      .sort((a, b) => {
        switch (sortBy) {
          case 'commission': return b.commission - a.commission
          case 'conversion': return b.avgConversion - a.avgConversion
          case 'price-high': return b.price - a.price
          case 'price-low': return a.price - b.price
          case 'popular': return b.monthlySales - a.monthlySales
          case 'trending': return (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0)
          default:
            // Recommended algorithm
            const scoreA = (a.avgConversion * 0.3) + (a.commission * 0.3) + (a.monthlySales * 0.2) + (a.isPopular ? 10 : 0)
            const scoreB = (b.avgConversion * 0.3) + (b.commission * 0.3) + (b.monthlySales * 0.2) + (b.isPopular ? 10 : 0)
            return scoreB - scoreA
        }
      })
  }, [allTools, search, selectedCategory, sortBy])

  const handleSelect = (tool: Tool) => {
    if (multiSelect) {
      if (selectedTools.includes(tool.id)) {
        setSelectedTools(selectedTools.filter(id => id !== tool.id))
      } else if (selectedTools.length < maxSelections) {
        setSelectedTools([...selectedTools, tool.id])
        onSelect(tool.id, tool.name)
      }
    } else {
      onSelect(tool.id, tool.name)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
          <p className="text-xs text-primary-100">Total Tools</p>
          <p className="text-xl font-bold">{allTools.length}+</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-neutral-500">Avg Commission</p>
          <p className="text-xl font-bold text-primary-600">
            {Math.round(allTools.reduce((sum, t) => sum + t.commission, 0) / allTools.length)}%
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-neutral-500">Top Commission</p>
          <p className="text-xl font-bold text-green-600">
            {Math.max(...allTools.map(t => t.commission))}%
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-neutral-500">Price Range</p>
          <p className="text-xl font-bold text-amber-600">
            ${Math.min(...allTools.map(t => t.price))}-${Math.max(...allTools.map(t => t.price))}
          </p>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search 140+ tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white min-w-[120px]"
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
            className="px-3 py-2 border rounded-lg bg-white min-w-[140px]"
          >
            <option value="recommended">✨ Recommended</option>
            <option value="commission">💰 Highest Commission</option>
            <option value="conversion">📈 Best Converting</option>
            <option value="popular">🔥 Most Popular</option>
            <option value="trending">⚡ Trending</option>
            <option value="price-high">💵 Price: High-Low</option>
            <option value="price-low">💵 Price: Low-High</option>
          </select>

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 border rounded-lg hover:bg-neutral-50"
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 border rounded-lg hover:bg-neutral-50 transition ${
              showFilters ? 'bg-primary-50 border-primary-200' : ''
            }`}
            title="Toggle filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {(search || selectedCategory !== 'all' || sortBy !== 'recommended') && (
            <button
              onClick={() => {
                setSearch('')
                setSelectedCategory('all')
                setSortBy('recommended')
              }}
              className="px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Commission Range</label>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm">
                      All
                    </button>
                    <button className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm">
                      10-15%
                    </button>
                    <button className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm">
                      16-20%
                    </button>
                    <button className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm">
                      20%+
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Price Range</label>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm">
                      All
                    </button>
                    <button className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm">
                      Under $50
                    </button>
                    <button className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm">
                      $50-$100
                    </button>
                    <button className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm">
                      $100+
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tool Status</label>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm">
                      All
                    </button>
                    <button className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm">
                      New
                    </button>
                    <button className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm">
                      Popular
                    </button>
                    <button className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm">
                      Trending
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Results Stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          Showing {filteredTools.length} of {allTools.length} tools
          {search && ` matching "${search}"`}
        </p>
        
        {multiSelect && selectedTools.length > 0 && (
          <Badge variant="primary">
            {selectedTools.length} selected
          </Badge>
        )}
      </div>

      {/* Tools Grid/List */}
      <div className={viewMode === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
        : 'space-y-2'
      }>
        {filteredTools.map((tool, index) => {
          const isSelected = selectedTools.includes(tool.id)
          const isFavorited = favoriteTools.includes(tool.id)

          return viewMode === 'grid' ? (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <Card 
                className={`p-4 cursor-pointer transition-all relative group ${
                  isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:shadow-lg'
                }`}
                onClick={() => handleSelect(tool)}
              >
                {/* Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(tool.id)
                  }}
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition"
                >
                  {isFavorited ? (
                    <Bookmark className="w-4 h-4 fill-primary-600 text-primary-600" />
                  ) : (
                    <BookmarkPlus className="w-4 h-4 text-neutral-400 hover:text-primary-600" />
                  )}
                </button>

                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-xl">
                    {tool.emoji}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {tool.category}
                  </Badge>
                </div>

                {/* Content */}
                <h3 className="font-medium text-sm mb-1 line-clamp-1">{tool.name}</h3>
                <p className="text-xs text-neutral-500 mb-2 line-clamp-2">{tool.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-1 mb-2">
                  <div className="bg-primary-50 p-1.5 rounded text-center">
                    <p className="text-xs text-primary-600">Comm</p>
                    <p className="text-sm font-bold text-primary-700">{tool.commission}%</p>
                  </div>
                  <div className="bg-green-50 p-1.5 rounded text-center">
                    <p className="text-xs text-green-600">Price</p>
                    <p className="text-sm font-bold text-green-700">${tool.price}</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {tool.isNew && <Badge variant="primary" size="sm">New</Badge>}
                  {tool.isPopular && <Badge variant="secondary" size="sm">🔥 Popular</Badge>}
                  {tool.isTrending && <Badge variant="outline" size="sm">📈 Trending</Badge>}
                </div>

                {/* Selection Indicator */}
                {multiSelect && isSelected && (
                  <div className="absolute top-2 left-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </Card>
            </motion.div>
          ) : (
            <Card 
              key={tool.id}
              className={`p-3 cursor-pointer hover:shadow-md transition ${
                isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : ''
              }`}
              onClick={() => handleSelect(tool)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-lg">
                  {tool.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{tool.name}</h3>
                    {tool.isNew && <Badge variant="primary" size="sm">New</Badge>}
                    {tool.isPopular && <Badge variant="secondary" size="sm">🔥</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-primary-600">{tool.commission}%</span>
                    <span className="text-green-600">${tool.price}</span>
                    <span className="text-amber-600">{tool.avgConversion}% conv.</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(tool.id)
                  }}
                >
                  {isFavorited ? (
                    <Bookmark className="w-4 h-4 fill-primary-600 text-primary-600" />
                  ) : (
                    <BookmarkPlus className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      {filteredTools.length === 0 && (
        <Card className="p-8 text-center">
          <Search className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">No tools found</h3>
          <p className="text-sm text-neutral-500">Try adjusting your search or filters</p>
        </Card>
      )}
    </div>
  )
}

function Check(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}