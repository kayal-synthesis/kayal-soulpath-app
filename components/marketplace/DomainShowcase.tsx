'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Crown, Mic, BookOpen, Clock, Heart, Briefcase, 
  TrendingUp, Moon, Zap, Star, Sparkles, ArrowRight
} from 'lucide-react'

interface Domain {
  id: string
  name: string
  icon: any
  color: string
  bgColor: string
  tools: number
  href: string
  isNew?: boolean
  isPopular?: boolean
  tier: number
}

const domains: Domain[] = [
  { 
    id: 'omni-seer-sanctum', 
    name: 'Omni-Seer\'s Sanctum', 
    icon: Crown, 
    color: 'text-primary-600', 
    bgColor: 'bg-primary-50',
    tools: 23,
    href: '/domain/omni-seer-sanctum',
    isPopular: true,
    tier: 1
  },
  { 
    id: 'voice-of-prophecy', 
    name: 'Voice of Prophecy', 
    icon: Mic, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50',
    tools: 10,
    href: '/domain/voice-of-prophecy',
    isNew: true,
    tier: 2
  },
  { 
    id: 'sacred-script', 
    name: 'Sacred Script', 
    icon: BookOpen, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50',
    tools: 10,
    href: '/domain/sacred-script',
    isNew: true,
    tier: 2
  },
  { 
    id: 'time-keeper', 
    name: 'Eternal Clock', 
    icon: Clock, 
    color: 'text-indigo-600', 
    bgColor: 'bg-indigo-50',
    tools: 5,
    href: '/domain/time-keeper',
    tier: 3
  },
  { 
    id: 'love', 
    name: 'Heart\'s Destiny', 
    icon: Heart, 
    color: 'text-rose-600', 
    bgColor: 'bg-rose-50',
    tools: 17,
    href: '/domain/love',
    isPopular: true,
    tier: 4
  },
  { 
    id: 'career', 
    name: 'Summit Path', 
    icon: Briefcase, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50',
    tools: 17,
    href: '/domain/career',
    tier: 4
  },
  { 
    id: 'wealth', 
    name: 'Abyss of Abundance', 
    icon: TrendingUp, 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-50',
    tools: 17,
    href: '/domain/wealth',
    tier: 4
  },
  { 
    id: 'spiritual', 
    name: 'Soul\'s Journey', 
    icon: Moon, 
    color: 'text-violet-600', 
    bgColor: 'bg-violet-50',
    tools: 17,
    href: '/domain/spiritual',
    tier: 4
  },
  { 
    id: 'health', 
    name: 'Temple of Vitality', 
    icon: Zap, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50',
    tools: 17,
    href: '/domain/health',
    tier: 4
  },
  { 
    id: 'life-path', 
    name: 'Path of Destiny', 
    icon: Star, 
    color: 'text-primary-600', 
    bgColor: 'bg-primary-50',
    tools: 17,
    href: '/domain/life-path',
    isPopular: true,
    tier: 4
  }
]

export const DomainShowcase = () => {
  const router = useRouter()

  // Group by tiers for visual hierarchy
  const tier1 = domains.filter(d => d.tier === 1)
  const tier2 = domains.filter(d => d.tier === 2)
  const tier3 = domains.filter(d => d.tier === 3)
  const tier4 = domains.filter(d => d.tier === 4)

  const allDomains = [...tier1, ...tier2, ...tier3, ...tier4]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-serif flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-600" />
          All Domains
        </h2>
        <span className="text-xs text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
          10 domains • 140 tools
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {allDomains.map((domain, index) => {
          const Icon = domain.icon
          return (
            <motion.div
              key={domain.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => router.push(domain.href)}
              className="cursor-pointer relative"
            >
              <Card className="p-4 hover:shadow-lg transition-all group border-2 border-transparent hover:border-primary-200">
                <div className={`w-12 h-12 mx-auto rounded-xl ${domain.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${domain.color}`} />
                </div>
                
                <h3 className="text-xs font-medium text-center line-clamp-2 group-hover:text-primary-600 transition">
                  {domain.name}
                </h3>
                
                <p className="text-[10px] text-neutral-500 text-center mt-1">
                  {domain.tools} tools
                </p>

                {/* Popular/New indicators */}
                {domain.isPopular && (
                  <Badge size="sm" className="absolute -top-2 -right-2 bg-amber-500 text-white border-0 text-[8px] px-1.5">
                    🔥
                  </Badge>
                )}
                {domain.isNew && (
                  <Badge size="sm" className="absolute -top-2 -right-2 bg-green-500 text-white border-0 text-[8px] px-1.5">
                    NEW
                  </Badge>
                )}
              </Card>
            </motion.div>
          )
        })}

        {/* "More Coming Soon" placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="cursor-pointer"
        >
          <Card className="p-4 hover:shadow-lg transition-all border-2 border-dashed border-neutral-200 hover:border-primary-200 bg-neutral-50">
            <div className="w-12 h-12 mx-auto rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
              <span className="text-2xl opacity-30">✨</span>
            </div>
            <h3 className="text-xs font-medium text-center text-neutral-400">More Coming</h3>
            <p className="text-[10px] text-neutral-300 text-center mt-1">Soon</p>
          </Card>
        </motion.div>
      </div>

      {/* Quick stats footer */}
      <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t">
        <div className="flex items-center gap-4">
          <span>🏛️ Flagship: 23</span>
          <span>🎤 Voice: 10</span>
          <span>📜 Script: 10</span>
          <span>⏳ Time: 5</span>
        </div>
        <button className="text-primary-600 hover:text-primary-700 flex items-center gap-1">
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}