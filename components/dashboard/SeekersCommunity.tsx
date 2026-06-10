'use client'

import { motion } from 'framer-motion'
import { Users, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const SeekersCommunity = () => {
  
  const trendingTopics = [
    { topic: 'Full Moon Rituals', posts: 234, emoji: '🌕' },
    { topic: 'Soulmate Signs', posts: 189, emoji: '💞' },
    { topic: 'Past Life Regression', posts: 156, emoji: '🕯️' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-medium text-neutral-800">Community</h3>
        </div>
      </div>

      {/* Trending Topics - All link to Telegram */}
      <div className="p-5">
        <h4 className="text-sm font-medium text-neutral-500 mb-3 flex items-center gap-1">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Trending
        </h4>
        <div className="space-y-3">
          {trendingTopics.map((topic) => (
            <a
              key={topic.topic}
              href="https://t.me/kayalsoulpath"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-lg transition group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{topic.emoji}</span>
                <span className="text-sm text-neutral-700 group-hover:text-indigo-600 transition">{topic.topic}</span>
              </div>
              <span className="text-xs text-neutral-500">{topic.posts}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Join CTA - Connected to Telegram */}
      <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-100">
        <a
          href="https://t.me/kayalsoulpath"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between group"
        >
          <span className="text-sm font-medium text-indigo-600">Join discussion</span>
          <ArrowRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-1 transition" />
        </a>
      </div>
    </motion.div>
  )
}