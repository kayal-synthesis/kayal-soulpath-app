'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Heart, TrendingUp, Moon, Star, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useRouter } from 'next/navigation'

// ============================================================
// EXPLORE BY LIFE AREA: 4 Main Domain Cards
// Fully animated with Framer Motion:
//   - Section fades in on scroll
//   - Cards stagger in from below (0.08s apart)
//   - Hover: y:-4, icon scale+rotate, shadow glow, arrow slide
//   - Colour-matched glow per domain
//   - Accent bar animates thicker on hover
//   - Emoji counter animates in on load
// ============================================================

// Import tool counts from constants
// (These must match your actual tool files)
const TOOL_COUNTS = {
  love:     12,   // loveTools.length
  wealth:   12,   // wealthTools.length + careerTools.length (12+12)
  wellness: 12,   // wellnessTools.length + spiritualTools.length (12+12)
  lifepath: 12,   // lifePathTools.length
}

const STAGGER = 0.09

const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

const areas = [
  {
    id: 'love',
    name: 'Love & Relations...',
    icon: Heart,
    emoji: '💞',
    domain: "Heart's Destiny",
    desc: 'See the pattern beneath your relationship history and when your blueprint opens for genuine connection.',
    tools: TOOL_COUNTS.love,
    href: '/domain/love-relationships',
    tag: 'Popular', tagCls: 'bg-rose-100 text-rose-700',
    from: '#F43F5E', to: '#E11D48',
    iconBg: 'bg-rose-50', iconTxt: 'text-rose-600',
    exploreTxt: 'text-rose-600',
    glow: 'rgba(244,63,94,0.14)',
  },
  {
    id: 'wealth',
    name: 'Wealth & Career',
    icon: TrendingUp,
    emoji: '💰',
    domain: 'Abyss of Abundance',
    desc: 'Name the pattern behind your income ceiling and find the work your blueprint shows you are built for.',
    tools: TOOL_COUNTS.wealth,
    href: '/domain/wealth-career',
    tag: 'Featured', tagCls: 'bg-emerald-100 text-emerald-700',
    from: '#10B981', to: '#059669',
    iconBg: 'bg-emerald-50', iconTxt: 'text-emerald-600',
    exploreTxt: 'text-emerald-600',
    glow: 'rgba(16,185,129,0.14)',
  },
  {
    id: 'wellness',
    name: 'Wellness & Spiritu...',
    icon: Moon,
    emoji: '🌙',
    domain: "Soul's Journey",
    desc: 'Map your energetic wiring, your recurring shadow patterns, and the practices your blueprint supports.',
    tools: TOOL_COUNTS.wellness,
    href: '/domain/wellness-spirituality',
    tag: 'Sacred', tagCls: 'bg-purple-100 text-purple-700',
    from: '#8B5CF6', to: '#7C3AED',
    iconBg: 'bg-purple-50', iconTxt: 'text-purple-600',
    exploreTxt: 'text-purple-600',
    glow: 'rgba(139,92,246,0.14)',
  },
  {
    id: 'lifepath',
    name: 'Life Path & Destiny',
    icon: Star,
    emoji: '🌟',
    domain: 'Path of Destiny',
    desc: 'Know where you are in your life arc and what your current chapter is asking of you right now.',
    tools: TOOL_COUNTS.lifepath,
    href: '/domain/life-path-destiny',
    tag: 'Deep', tagCls: 'bg-amber-100 text-amber-700',
    from: '#F59E0B', to: '#D97706',
    iconBg: 'bg-amber-50', iconTxt: 'text-amber-600',
    exploreTxt: 'text-amber-600',
    glow: 'rgba(245,158,11,0.14)',
  },
]

export const ExploreByLifeArea = () => {
  const router  = useRouter()
  const ref     = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, { once: true, margin: '-80px' })

  return (
    <div ref={ref} className="space-y-4">

      {/* Section header */}
      <motion.div
        variants={fadeUp} initial="hidden" animate={visible ? 'visible' : 'hidden'}
        className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
            <Star className="w-4 h-4 text-primary-600" />
          </motion.div>
          <h2 className="text-lg font-serif text-neutral-800">Explore by Life Area</h2>
          <Badge variant="primary" size="sm">{areas.length} Areas</Badge>
        </div>
        <motion.a href="/categories" whileHover={{ x: 3 }}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 group">
          View All
          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </motion.a>
      </motion.div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {areas.map((area, i) => {
          const Icon = area.icon
          return (
            <motion.div
              key={area.id}
              variants={fadeUp} initial="hidden"
              animate={visible ? 'visible' : 'hidden'}
              transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 + i * STAGGER }}
              whileHover={{ y: -4 }}
              onClick={() => router.push(area.href)}
              className="cursor-pointer group">

              <motion.div
                whileHover={{ boxShadow: `0 20px 40px ${area.glow}, 0 4px 16px rgba(0,0,0,0.07)` }}
                transition={{ duration: 0.25 }}
                className="relative rounded-xl border border-neutral-200/60 bg-white overflow-hidden h-full">

                {/* Animated accent bar */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: `linear-gradient(90deg,${area.from},${area.to})` }}
                  whileHover={{ height: '3px' }}
                  transition={{ duration: 0.2 }} />

                {/* Hover colour wash */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(135deg,${area.glow} 0%,transparent 55%)`, opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }} />

                <div className="relative p-5">

                  {/* Tag badge */}
                  <motion.div
                    className="absolute top-3 right-3"
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 + i }}>
                    <Badge variant="secondary" size="sm" className={area.tagCls}>{area.tag}</Badge>
                  </motion.div>

                  {/* Animated emoji icon */}
                  <motion.div
                    className={`w-16 h-16 ${area.iconBg} rounded-xl flex items-center justify-center text-4xl mb-4`}
                    whileHover={{ scale: 1.12, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 14 }}>
                    {area.emoji}
                  </motion.div>

                  {/* Name */}
                  <h3 className="font-medium text-lg mb-1 text-neutral-800 group-hover:text-neutral-900 transition-colors">
                    {area.name}
                  </h3>

                  {/* Domain subtitle */}
                  <p className={`text-xs ${area.iconTxt} mb-2 font-medium`}>{area.domain}</p>

                  {/* Description: full text visible, justified alignment, no clamp */}
                  <p className="text-sm text-neutral-600 mb-4 leading-relaxed text-center">
                    {area.desc}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                    {/* Tool count */}
                    <motion.span
                      className="text-xs bg-neutral-100 px-2 py-1 rounded-full text-neutral-600"
                      whileHover={{ scale: 1.05 }}>
                      {area.tools} tools
                    </motion.span>

                    {/* Explore arrow */}
                    <motion.span
                      className={`text-sm ${area.exploreTxt} font-medium flex items-center gap-1`}
                      whileHover={{ x: 3 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                      Explore
                      <motion.span
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 + i * 0.3 }}>
                        →
                      </motion.span>
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
