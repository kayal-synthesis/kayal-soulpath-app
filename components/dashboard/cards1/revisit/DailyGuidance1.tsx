'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Sparkles, 
  Sun, 
  Moon, 
  Zap, 
  Activity, 
  ArrowRight, 
  BarChart2, 
  Compass,
  X,
  Star,
  Calendar,
  Clock,
  Heart,
  TrendingUp,
  Users,
  Download,
  Eye,
  MessageCircle,
  Headphones,
  FileText,
  BookOpen,
  Mic,
  Crown,
  Infinity,
  Briefcase,
  Moon as MoonIcon
} from 'lucide-react'

// Import all your tool constants
import { omniSeerTools } from '@/lib/constants/omni-seer-tools'
import { voiceTools } from '@/lib/constants/voice-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools } from '@/lib/constants/time-keeper-tools'
import { loveTools } from '@/lib/constants/love-tools'
import { careerTools } from '@/lib/constants/career-tools'
import { wealthTools } from '@/lib/constants/wealth-tools'
import { spiritualTools } from '@/lib/constants/spiritual-tools'
import { healthTools } from '@/lib/constants/health-tools'
import { lifePathTools } from '@/lib/constants/life-path-tools'

// Combine all tools
const allTools = [
  ...omniSeerTools,
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

interface DailyGuidanceProps {
  userName: string
  greeting: string
  date: string
  time: string
  personalDay: number
  vibration?: string
  vibrationMeaning?: string
  energyLevel?: number // 1-5
  energyDescription?: string
  insightMessage?: string
  userId?: string // Add userId to fetch user's purchase history
}

interface Tool {
  id: string
  name: string
  emoji: string
  category: string
  price: number
  description?: string
  features?: string[]
  isPopular?: boolean
  isNew?: boolean
  requiresImage?: boolean
  estimatedReadTime?: number
  subtitle?: string
}

export const DailyGuidance = ({ 
  userName, 
  greeting, 
  date, 
  time, 
  personalDay,
  vibration = 'High',
  vibrationMeaning = 'Today your energy is amplified. What you think manifests quickly.',
  energyLevel = 4,
  energyDescription = 'Peak energy from 10 AM - 2 PM',
  insightMessage = "Today's vibration aligns with Omni-Seer readings. 23 people with your energy discovered their path. Your intuition is at its peak right now.",
  userId
}: DailyGuidanceProps) => {
  
  const router = useRouter()
  const supabase = createClient()
  const firstName = userName.split(' ')[0]
  const [showMatchingToolsModal, setShowMatchingToolsModal] = useState(false)
  const [showFullInsightsModal, setShowFullInsightsModal] = useState(false)
  const [matchedTools, setMatchedTools] = useState<any[]>([])
  const [purchasedToolIds, setPurchasedToolIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [coupons, setCoupons] = useState<any[]>([])

  // Fetch user's purchase history and active coupons
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return

      try {
        // Fetch user's purchases
        const { data: purchases } = await supabase
          .from('purchases')
          .select('tool_id')
          .eq('user_id', userId)

        if (purchases) {
          setPurchasedToolIds(new Set(purchases.map(p => p.tool_id)))
        }

        // Fetch active coupons
        const { data: activeCoupons } = await supabase
          .from('coupons')
          .select('*')
          .eq('is_active', true)
          .lte('start_date', new Date().toISOString())
          .or(`end_date.gte.${new Date().toISOString()},end_date.is.null`)

        setCoupons(activeCoupons || [])
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    fetchUserData()
  }, [userId])

  // Find matching tools based on vibration, energy, and personal day
  useEffect(() => {
    if (showMatchingToolsModal) {
      findMatchingTools()
    }
  }, [showMatchingToolsModal])

  const findMatchingTools = () => {
    setLoading(true)

    // Score each tool based on various factors
    const scored = allTools.map(tool => {
      let score = 0

      // Base score from personal day (1-100)
      score += (personalDay % 10) * 3

      // Vibration matching
      if (vibration === 'High') {
        if (tool.category === 'oracle-temple' || tool.category === 'spiritual') score += 25
        if (tool.isPopular) score += 15
      } else if (vibration === 'Medium') {
        if (tool.category === 'love' || tool.category === 'life-path') score += 20
        if (tool.estimatedReadTime && tool.estimatedReadTime < 30) score += 10
      } else {
        if (tool.category === 'health' || tool.category === 'voice') score += 20
        if (tool.requiresImage) score += 5
      }

      // Energy level matching
      if (energyLevel >= 4) {
        if (tool.price > 50) score += 15 // High energy = ready for investment
        if (tool.category === 'wealth' || tool.category === 'career') score += 20
      } else if (energyLevel >= 3) {
        if (tool.price < 40) score += 10 // Balanced energy = moderate price
        if (tool.category === 'love' || tool.category === 'life-path') score += 15
      } else {
        if (tool.price < 30) score += 15 // Low energy = gentle, affordable
        if (tool.category === 'health' || tool.category === 'spiritual') score += 20
      }

      // New and popular tools get bonus
      if (tool.isNew) score += 10
      if (tool.isPopular) score += 15

      // Penalize if already purchased
      if (purchasedToolIds.has(tool.id)) {
        score = 0 // Don't show purchased tools
      }

      // Check for available coupons
      const availableCoupon = coupons.find(c => 
        c.applies_to?.includes(tool.id) || c.applies_to?.length === 0
      )

      return {
        ...tool,
        matchScore: Math.min(Math.round(score), 100),
        hasCoupon: !!availableCoupon,
        couponCode: availableCoupon?.code,
        discountValue: availableCoupon?.discount_value
      }
    })

    // Sort by score and take top 6
    const topMatches = scored
      .filter(t => t.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6)

    setMatchedTools(topMatches)
    setLoading(false)
  }

  const getToolIcon = (category: string) => {
    const icons: Record<string, any> = {
      'love': Heart,
      'career': Briefcase,
      'wealth': TrendingUp,
      'spiritual': MoonIcon,
      'health': Zap,
      'life-path': Crown,
      'oracle-temple': Crown,
      'time-keeper': Clock,
      'voice': Mic,
      'sacred-script': BookOpen,
      'universal': Infinity
    }
    return icons[category] || FileText
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'love': 'bg-red-100 text-red-600',
      'career': 'bg-blue-100 text-blue-600',
      'wealth': 'bg-green-100 text-green-600',
      'spiritual': 'bg-purple-100 text-purple-600',
      'health': 'bg-yellow-100 text-yellow-600',
      'life-path': 'bg-amber-100 text-amber-600',
      'oracle-temple': 'bg-indigo-100 text-indigo-600',
      'time-keeper': 'bg-indigo-100 text-indigo-600',
      'voice': 'bg-purple-100 text-purple-600',
      'sacred-script': 'bg-amber-100 text-amber-600'
    }
    return colors[category] || 'bg-neutral-100 text-neutral-600'
  }

  // Vibration color based on level
  const getVibrationColor = () => {
    switch(vibration.toLowerCase()) {
      case 'high': return 'from-emerald-400 to-green-400'
      case 'medium': return 'from-amber-400 to-yellow-400'
      case 'low': return 'from-orange-400 to-red-400'
      default: return 'from-purple-400 to-pink-400'
    }
  }

  // Matching Tools Modal with REAL data - FIXED SIZES
  const MatchingToolsModal = () => (
    <AnimatePresence>
      {showMatchingToolsModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowMatchingToolsModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Compass className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-serif text-white">Tools Matching Your Vibration</h2>
                </div>
                <button
                  onClick={() => setShowMatchingToolsModal(false)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="text-sm text-white/80 mt-2">
                Based on your {vibration} vibration and personal energy
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
                </div>
              ) : matchedTools.length === 0 ? (
                <div className="text-center py-12">
                  <Compass className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-600">No matching tools found</p>
                  <p className="text-sm text-neutral-400 mt-2">Try checking back tomorrow</p>
                </div>
              ) : (
                <>
                  {/* Match Score Summary */}
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-indigo-700">Best Match Score</span>
                      <span className="text-2xl font-serif text-indigo-600">
                        {matchedTools[0]?.matchScore}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-indigo-100 rounded-full">
                      <div 
                        className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" 
                        style={{ width: `${matchedTools[0]?.matchScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Top Matches */}
                  <h3 className="text-lg font-serif text-neutral-800">Your Top Matches Today</h3>
                  
                  <div className="space-y-3">
                    {matchedTools.map((tool) => {
                      const Icon = getToolIcon(tool.category)
                      const colorClass = getCategoryColor(tool.category)
                      
                      return (
                        <motion.div
                          key={tool.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-white border border-neutral-200 rounded-xl p-3 hover:shadow-md transition cursor-pointer"
                          onClick={() => {
                            setShowMatchingToolsModal(false)
                            router.push(`/purchase/${tool.id}`)
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {/* 🔥 FIXED: Smaller emoji - just the emoji, no icon */}
                            <div className={`w-8 h-8 ${colorClass} rounded-lg flex items-center justify-center text-base`}>
                              {tool.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                {/* 🔥 FIXED: Smaller font for tool name */}
                                <h4 className="text-sm font-medium text-neutral-800 truncate">{tool.name}</h4>
                                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                                  {tool.hasCoupon && (
                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                      {tool.discountValue}% OFF
                                    </span>
                                  )}
                                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                    {tool.matchScore}%
                                  </span>
                                </div>
                              </div>
                              {/* 🔥 FIXED: Smaller description text */}
                              <p className="text-xs text-neutral-500 mb-1.5 line-clamp-1">
                                {tool.description || tool.subtitle || 'Powerful tool for insight'}
                              </p>
                              {/* 🔥 FIXED: Smaller metadata */}
                              <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 text-amber-500" />
                                  {tool.isPopular ? '4.9' : '4.7'}
                                </span>
                                {tool.estimatedReadTime && (
                                  <>
                                    <span>•</span>
                                    <span>{tool.estimatedReadTime} min</span>
                                  </>
                                )}
                                <span className="text-indigo-600 font-medium ml-auto">
                                  ${tool.price}
                                  {tool.hasCoupon && (
                                    <span className="text-[9px] text-green-600 ml-1 line-through opacity-50">
                                      ${Math.round(tool.price * 1.2)}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* View All Button */}
                  <button 
                    onClick={() => {
                      setShowMatchingToolsModal(false)
                      router.push('/dashboard?matched=true')
                    }}
                    className="w-full bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm"
                  >
                    View All {matchedTools.length} Matched Tools
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Full Insights Modal (keeping your existing design)
  const FullInsightsModal = () => (
    <AnimatePresence>
      {showFullInsightsModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFullInsightsModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <BarChart2 className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-serif text-white">Complete Daily Insights</h2>
                </div>
                <button
                  onClick={() => setShowFullInsightsModal(false)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="text-sm text-white/80 mt-2">
                {date} • Day {personalDay} • {vibration} Vibration
              </p>
            </div>

            {/* Content - Keeping your existing beautiful design */}
            <div className="p-6 space-y-6">
              {/* Energy Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-50 rounded-xl p-4">
                  <Zap className="w-5 h-5 text-amber-600 mb-2" />
                  <p className="text-xs text-neutral-500">Energy Level</p>
                  <p className="text-2xl font-serif text-amber-600">{vibration}</p>
                  <p className="text-xs text-neutral-400 mt-1">{energyDescription}</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4">
                  <Activity className="w-5 h-5 text-indigo-600 mb-2" />
                  <p className="text-xs text-neutral-500">Vibration</p>
                  <p className="text-2xl font-serif text-indigo-600">{vibration}</p>
                  <p className="text-xs text-neutral-400 mt-1">Amplified today</p>
                </div>
              </div>

              {/* Vibration Meaning */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5">
                <h3 className="text-base font-medium text-indigo-900 mb-2">What This Means</h3>
                <p className="text-sm text-indigo-700">{vibrationMeaning}</p>
              </div>

              {/* Hour-by-Hour Forecast */}
              <div>
                <h3 className="text-lg font-serif text-neutral-800 mb-3">Energy Forecast</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm text-neutral-600">6 AM - 10 AM</span>
                    <span className="text-sm font-medium text-emerald-600">Building ✦</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm text-neutral-600">10 AM - 2 PM</span>
                    <span className="text-sm font-medium text-amber-600">{energyDescription} ⚡</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm text-neutral-600">2 PM - 6 PM</span>
                    <span className="text-sm font-medium text-blue-600">Creative Flow ✨</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm text-neutral-600">6 PM - 10 PM</span>
                    <span className="text-sm font-medium text-indigo-600">Integration 🌙</span>
                  </div>
                </div>
              </div>

              {/* Community Insight */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-sm font-medium text-indigo-900 mb-1">Community Insight</h3>
                    <p className="text-sm text-indigo-700">{insightMessage}</p>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-white border border-indigo-100 rounded-xl p-5">
                <h3 className="text-base font-medium text-neutral-800 mb-3">Today's Recommendations</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-neutral-600">
                    <span className="text-indigo-600 font-bold">•</span>
                    Best time for important decisions: 11:30 AM
                  </li>
                  <li className="flex items-start gap-2 text-sm text-neutral-600">
                    <span className="text-indigo-600 font-bold">•</span>
                    Perfect for starting new projects
                  </li>
                  <li className="flex items-start gap-2 text-sm text-neutral-600">
                    <span className="text-indigo-600 font-bold">•</span>
                    Evening reflection recommended
                  </li>
                </ul>
              </div>

              {/* Download Button */}
              <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition font-medium flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Download Full Insights (PDF)
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl shadow-lg border border-indigo-100/50 overflow-hidden"
      >
        {/* Vibrant gradient line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
        
        <div className="p-6">
          {/* Top row - Greeting + Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-sm">
                <span className="text-2xl">{greeting.includes('Morning') ? '☀️' : greeting.includes('Afternoon') ? '⛅' : '🌙'}</span>
              </div>
              <div>
                <h2 className="text-xl font-serif text-indigo-900">Hello, {firstName}</h2>
                <p className="text-sm text-indigo-300">{date} • {time}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Vibration Badge */}
              <motion.div 
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`flex items-center gap-1.5 bg-gradient-to-r ${getVibrationColor()} px-4 py-2 rounded-full shadow-md`}
              >
                <Activity className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white tracking-wide">
                  {vibration.toUpperCase()} VIBE
                </span>
              </motion.div>
              
              {/* Personal Day Badge */}
              <div className="flex items-center gap-1.5 bg-indigo-100 px-4 py-2 rounded-full shadow-sm">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-medium text-indigo-700">Day {personalDay}</span>
              </div>
            </div>
          </div>

          {/* Energy Visualization */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium text-indigo-800">Today's Energy</span>
              </div>
              <span className="text-xs text-indigo-400">{energyDescription}</span>
            </div>
            
            {/* Energy Bars */}
            <div className="flex gap-1.5 mb-3">
              {[1, 2, 3, 4, 5].map((level) => (
                <div key={level} className="flex-1">
                  <div 
                    className={`h-2.5 rounded-full transition-all ${
                      level <= energyLevel 
                        ? 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-sm' 
                        : 'bg-indigo-100'
                    }`}
                  />
                </div>
              ))}
            </div>
            
            {/* Energy Interpretation */}
            <p className="text-sm text-indigo-600">
              {energyLevel >= 4 ? '⚡ High energy - take action on important matters' :
               energyLevel >= 3 ? '✨ Balanced energy - steady progress today' :
               '🌿 Gentle energy - rest and reflection'}
            </p>
          </div>

          {/* Vibration Meaning */}
          <div className="mb-6 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-indigo-900 mb-1">Your Vibration Today</h3>
                <p className="text-sm text-indigo-700">{vibrationMeaning}</p>
              </div>
            </div>
          </div>

          {/* Insight Message */}
          <div className="bg-white rounded-xl p-5 mb-6 border-l-4 border-indigo-400 shadow-sm">
            <p className="text-sm text-indigo-900 italic leading-relaxed">
              "{insightMessage}"
            </p>
          </div>

          {/* Two CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => setShowMatchingToolsModal(true)}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 px-4 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition flex items-center justify-center gap-2 text-sm font-medium shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              Find Matching Tools
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => setShowFullInsightsModal(true)}
              className="flex-1 bg-gradient-to-r from-indigo-400 to-purple-400 text-white py-3 px-4 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition flex items-center justify-center gap-2 text-sm font-medium shadow-md"
            >
              <BarChart2 className="w-4 h-4" />
              View Full Insights
            </button>
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      <MatchingToolsModal />
      <FullInsightsModal />
    </>
  )
}