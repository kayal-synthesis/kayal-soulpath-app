'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Heart, 
  Briefcase, 
  TrendingUp, 
  Sparkles, 
  Activity, 
  Star,
  ChevronRight,
  Lock,
  Unlock
} from 'lucide-react'

interface DomainShowcaseProps {
  progress?: {
    love: number
    career: number
    wealth: number
    spiritual: number
    health: number
    lifePath: number
  }
}

export const DomainShowcase = ({ progress }: DomainShowcaseProps) => {
  const domains = [
    { 
      id: 'love', 
      name: 'Love', 
      icon: Heart, 
      color: 'from-red-500 to-pink-500',
      bg: 'bg-red-50',
      textColor: 'text-red-600',
      description: 'Relationships, romance, heart',
      count: 12,
      progress: progress?.love || 8,
      features: ['Compatibility', 'Soulmate', 'Marriage']
    },
    { 
      id: 'career', 
      name: 'Career', 
      icon: Briefcase, 
      color: 'from-blue-500 to-indigo-500',
      bg: 'bg-blue-50',
      textColor: 'text-blue-600',
      description: 'Work, purpose, success',
      count: 12,
      progress: progress?.career || 6,
      features: ['Path', 'Promotion', 'Leadership']
    },
    { 
      id: 'wealth', 
      name: 'Wealth', 
      icon: TrendingUp, 
      color: 'from-green-500 to-emerald-500',
      bg: 'bg-green-50',
      textColor: 'text-green-600',
      description: 'Money, abundance, timing',
      count: 12,
      progress: progress?.wealth || 4,
      features: ['Code', 'Timing', 'Abundance']
    },
    { 
      id: 'spiritual', 
      name: 'Spiritual', 
      icon: Sparkles, 
      color: 'from-purple-500 to-violet-500',
      bg: 'bg-purple-50',
      textColor: 'text-purple-600',
      description: 'Soul, purpose, growth',
      count: 12,
      progress: progress?.spiritual || 7,
      features: ['Purpose', 'Gifts', 'Past Lives']
    },
    { 
      id: 'health', 
      name: 'Health', 
      icon: Activity, 
      color: 'from-yellow-500 to-amber-500',
      bg: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      description: 'Wellness, vitality, balance',
      count: 12,
      progress: progress?.health || 5,
      features: ['Blueprint', 'Vitality', 'Longevity']
    },
    { 
      id: 'life-path', 
      name: 'Life Path', 
      icon: Star, 
      color: 'from-primary-500 to-secondary-500',
      bg: 'bg-primary-50',
      textColor: 'text-primary-600',
      description: 'Destiny, purpose, journey',
      count: 12,
      progress: progress?.lifePath || 9,
      features: ['Number', 'Destiny', 'Soul Urge']
    }
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium">Explore Your Path</h3>
            <p className="text-sm text-neutral-500 mt-1">6 domains • 72 insights waiting</p>
          </div>
          <Badge variant="primary" className="px-3 py-1">
            {domains.filter(d => d.progress === 12).length}/6 Complete
          </Badge>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          {domains.map((domain) => {
            const Icon = domain.icon
            const progressPercent = (domain.progress / domain.count) * 100
            
            return (
              <motion.div key={domain.id} variants={item}>
                <Link href={`/domain/${domain.id}`}>
                  <div className="group relative overflow-hidden rounded-2xl bg-white border-2 border-transparent hover:border-primary-200 transition-all duration-300 hover:shadow-xl">
                    {/* Background Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${domain.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    
                    <div className="relative p-5">
                      {/* Icon with Glow */}
                      <div className="relative mb-4">
                        <div className={`absolute inset-0 bg-gradient-to-br ${domain.color} rounded-xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity`} />
                        <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${domain.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      {/* Domain Info */}
                      <h4 className="text-lg font-medium mb-1 group-hover:text-primary-600 transition">
                        {domain.name}
                      </h4>
                      <p className="text-xs text-neutral-500 mb-3 line-clamp-1">
                        {domain.description}
                      </p>

                      {/* Features Pills */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {domain.features.map((feature, i) => (
                          <span key={i} className="text-[10px] px-2 py-1 bg-neutral-100 rounded-full text-neutral-600">
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Progress</span>
                          <span className="font-medium text-primary-600">{domain.progress}/{domain.count}</span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className={`h-full bg-gradient-to-r ${domain.color}`}
                          />
                        </div>
                      </div>

                      {/* Hover Indicator */}
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className={`w-4 h-4 ${domain.textColor}`} />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </Card>
  )
}