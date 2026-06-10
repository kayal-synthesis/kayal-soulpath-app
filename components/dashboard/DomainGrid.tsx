'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Crown,
  Clock,
  Headphones,
  Heart, 
  Briefcase, 
  TrendingUp, 
  Sparkles, 
  Activity, 
  Star
} from 'lucide-react'

interface Domain {
  id: string
  name: string
  href: string
  icon: any
  color: string
  bgColor: string
  description: string
  isNew?: boolean
  isPopular?: boolean
  type: 'special' | 'core'
}

const domains: Domain[] = [
  // SPECIAL DOMAINS (Top 3)
  { 
    id: 'oracle-temple', 
    name: '🏛️ Oracle Temple', 
    href: '/domain/oracle-temple', 
    icon: Crown, 
    color: 'text-primary-600', 
    bgColor: 'bg-primary-50',
    description: '23 legendary PDF oracles',
    isPopular: true,
    type: 'special'
  },
  { 
    id: 'time-keeper', 
    name: '📅 Time Keeper', 
    href: '/domain/time-keeper', 
    icon: Clock, 
    color: 'text-indigo-600', 
    bgColor: 'bg-indigo-50',
    description: 'Daily to 9-year forecasts',
    isNew: true,
    type: 'special'
  },
  { 
    id: 'daily-oracle-agency', 
    name: '🎙️ Daily Oracle', 
    href: '/domain/daily-oracle-agency', 
    icon: Headphones, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50',
    description: '10 voice companions',
    isNew: true,
    type: 'special'
  },
  
  // CORE DOMAINS (Original 6)
  { 
    id: 'love', 
    name: '💞 Love', 
    href: '/domain/love', 
    icon: Heart, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    description: 'Relationships, romance',
    isPopular: true,
    type: 'core'
  },
  { 
    id: 'career', 
    name: '💼 Career', 
    href: '/domain/career', 
    icon: Briefcase, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50',
    description: 'Work, purpose, success',
    type: 'core'
  },
  { 
    id: 'wealth', 
    name: '💰 Wealth', 
    href: '/domain/wealth', 
    icon: TrendingUp, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50',
    description: 'Money, abundance',
    type: 'core'
  },
  { 
    id: 'spiritual', 
    name: '🌙 Spiritual', 
    href: '/domain/spiritual', 
    icon: Sparkles, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50',
    description: 'Soul, purpose, growth',
    type: 'core'
  },
  { 
    id: 'health', 
    name: '⚡ Health', 
    href: '/domain/health', 
    icon: Activity, 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-50',
    description: 'Wellness, vitality',
    type: 'core'
  },
  { 
    id: 'life-path', 
    name: '🌟 Life Path', 
    href: '/domain/life-path', 
    icon: Star, 
    color: 'text-primary-600', 
    bgColor: 'bg-primary-50',
    description: 'Destiny, purpose',
    isPopular: true,
    type: 'core'
  }
]

export const DomainGrid = () => {
  const specialDomains = domains.filter(d => d.type === 'special')
  const coreDomains = domains.filter(d => d.type === 'core')

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="space-y-8">
      {/* Special Domains Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-primary-600 rounded-full" />
          <h3 className="text-lg font-serif text-primary-900">✨ Special Domains</h3>
          <Badge variant="primary" size="sm" className="ml-2">New</Badge>
        </div>
        
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {specialDomains.map((domain) => {
            const Icon = domain.icon
            return (
              <motion.div key={domain.id} variants={item}>
                <Link href={domain.href}>
                  <Card className="p-5 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden border-2 hover:border-primary-200">
                    <div className={`absolute inset-0 ${domain.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${domain.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className={`w-6 h-6 ${domain.color}`} />
                        </div>
                        <div className="flex gap-1">
                          {domain.isNew && (
                            <Badge variant="secondary" size="sm">New</Badge>
                          )}
                          {domain.isPopular && (
                            <Badge variant="primary" size="sm">🔥</Badge>
                          )}
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-serif mb-2 group-hover:text-primary-600 transition-colors">
                        {domain.name}
                      </h3>
                      
                      <p className="text-sm text-neutral-600 line-clamp-2">
                        {domain.description}
                      </p>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Core Domains Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-neutral-400 rounded-full" />
          <h3 className="text-lg font-serif text-neutral-700">📚 Core Domains</h3>
        </div>
        
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          {coreDomains.map((domain) => {
            const Icon = domain.icon
            return (
              <motion.div key={domain.id} variants={item}>
                <Link href={domain.href}>
                  <Card className="p-4 hover:shadow-lg transition-all group">
                    <div className={`p-2.5 rounded-xl ${domain.bgColor} w-fit mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-5 h-5 ${domain.color}`} />
                    </div>
                    <h3 className="font-medium mb-1 group-hover:text-primary-600 transition-colors">
                      {domain.name}
                    </h3>
                    <p className="text-xs text-neutral-500 line-clamp-2">
                      {domain.description}
                    </p>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}