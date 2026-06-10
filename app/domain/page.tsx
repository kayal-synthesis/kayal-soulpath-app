'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, Search, ArrowRight } from 'lucide-react'

// Import ALL your domain constants
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

// REAL DOMAINS from your constants
const domains = [
  {
    id: 'oracle-temple',
    name: 'Omni-Seer\'s Sanctum',
    icon: '👁️',
    description: 'Ancient wisdom and divination tools for profound life insights. Connect with higher consciousness and receive guidance for your most important life decisions.',
    toolCount: omniSeerTools.length,
    color: 'from-purple-600 to-indigo-600',
    url: '/domain/omni-seer-sanctum'
  },
  {
    id: 'voice',
    name: 'Voice of Prophecy',
    icon: '🎙️',
    description: 'Transformative voice analysis tools that reveal your true power. Unlock your potential as a speaker, singer, or communicator.',
    toolCount: voiceTools.length,
    color: 'from-blue-600 to-cyan-600',
    url: '/domain/voice-of-prophecy'
  },
  {
    id: 'sacred-script',
    name: 'Sacred Script',
    icon: '📜',
    description: 'Sacred writing and manifestation tools for divine connection. Channel wisdom through sacred writing practices.',
    toolCount: sacredScriptTools.length,
    color: 'from-amber-600 to-orange-600',
    url: '/domain/sacred-script'
  },
  {
    id: 'time-keeper',
    name: 'Eternal Clock',
    icon: '⏰',
    description: 'Temporal wisdom tools to understand your relationship with time. Understand your past, navigate your present, and shape your future.',
    toolCount: timeKeeperTools.length,
    color: 'from-emerald-600 to-teal-600',
    url: '/domain/eternal-clock'
  },
  {
    id: 'love',
    name: '💞 Love & Relationships',
    icon: '💞',
    description: 'Deep relationship insights and romantic guidance. Understand soul connections, twin flame dynamics, and the true nature of your love life.',
    toolCount: loveTools.length,
    color: 'from-red-600 to-pink-600',
    url: '/domain/love-relationships'
  },
  {
    id: 'wealth',
    name: '💰 Wealth & Career',
    icon: '💰',
    description: 'Abundance manifestation tools for financial freedom and career success. Unlock your wealth potential and attract prosperity.',
    toolCount: wealthTools.length + careerTools.length,
    color: 'from-green-600 to-emerald-600',
    url: '/domain/wealth-career'
  },
  {
    id: 'spiritual',
    name: '🌙 Wellness & Spirituality',
    icon: '🌙',
    description: 'Comprehensive spiritual growth and wellness tools for awakening. Explore chakra healing, energy work, and connect with your higher self.',
    toolCount: spiritualTools.length + healthTools.length,
    color: 'from-violet-600 to-purple-600',
    url: '/domain/wellness-spirituality'
  },
  {
    id: 'life-path',
    name: '🌟 Life Path & Destiny',
    icon: '🌟',
    description: 'Life purpose and destiny revelation tools. Discover why you\'re here and what you\'re meant to do.',
    toolCount: lifePathTools.length,
    color: 'from-amber-600 to-yellow-600',
    url: '/domain/life-path-destiny'
  }
]

export default function DomainsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredDomains = domains.filter(domain =>
    domain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    domain.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            <h1 className="text-2xl font-serif">Explore All Domains</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <p className="text-2xl font-bold text-primary-600">{domains.length}</p>
            <p className="text-sm text-neutral-600">Total Domains</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-600">
              {domains.reduce((sum, d) => sum + d.toolCount, 0)}
            </p>
            <p className="text-sm text-neutral-600">Total Tools</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-600">4</p>
            <p className="text-sm text-neutral-600">Featured Domains</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-purple-600">4</p>
            <p className="text-sm text-neutral-600">Core Domains</p>
          </Card>
        </div>

        {/* Domains Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDomains.map((domain, index) => (
            <motion.div
              key={domain.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="p-6 hover:shadow-xl transition cursor-pointer group border-2 border-transparent hover:border-primary-200"
                onClick={() => router.push(domain.url)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${domain.color} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition`}>
                    {domain.icon}
                  </div>
                  <Badge variant="outline">{domain.toolCount} tools</Badge>
                </div>
                
                <h3 className="font-bold text-lg mb-2 group-hover:text-primary-600 transition">
                  {domain.name}
                </h3>
                
                <p className="text-sm text-neutral-600 mb-4 line-clamp-3">
                  {domain.description}
                </p>
                
                <Button 
                  className="w-full group-hover:bg-primary-700 transition"
                  size="sm"
                >
                  Explore Domain
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}