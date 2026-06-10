'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ArrowRight, Mic, BookOpen, Sparkles, Heart, Clock } from 'lucide-react'

const newJourneys = [
  {
    id: 1,
    name: 'Voice of Prophecy',
    icon: Mic,
    description: 'Speak to your future self',
    journeys: 'New',
    color: 'blue',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    href: '/domain/voice-of-prophecy'
  },
  {
    id: 2,
    name: 'Sacred Script',
    icon: BookOpen,
    description: 'Decode your soul\'s code',
    journeys: 'New',
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    href: '/domain/sacred-script'
  },
  {
    id: 3,
    name: 'Mystic Reading',
    icon: Sparkles,
    description: 'Unveil your hidden gifts',
    journeys: 'New',
    color: 'purple',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    href: '/domain/mystic-reading'
  },
  {
    id: 4,
    name: "Heart's Destiny",
    icon: Heart,
    description: 'Discover your soulmate',
    journeys: 'New',
    color: 'red',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
    href: '/domain/hearts-destiny'
  },
  {
    id: 5,
    name: 'Eternal Clock',
    icon: Clock,
    description: 'Timing is everything',
    journeys: 'New',
    color: 'amber',
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
    href: '/domain/eternal-clock'
  },
  {
    id: 6,
    name: 'Abyss of Abundance',
    icon: Sparkles,
    description: 'Unlock unlimited wealth',
    journeys: 'New',
    color: 'green',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
    href: '/domain/abyss-of-abundance'
  },
  {
    id: 7,
    name: 'Soul\'s Journey',
    icon: Sparkles,
    description: 'Past life exploration',
    journeys: 'New',
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    href: '/domain/souls-journey'
  },
  {
    id: 8,
    name: 'Temple of Vitality',
    icon: Sparkles,
    description: 'Heal your energy',
    journeys: 'New',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    href: '/domain/temple-of-vitality'
  },
  {
    id: 9,
    name: 'Path of Destiny',
    icon: Sparkles,
    description: 'Walk your true path',
    journeys: 'New',
    color: 'pink',
    bgColor: 'bg-pink-50',
    iconColor: 'text-pink-600',
    href: '/domain/path-of-destiny'
  }
]

export const NewJourneysSwipe = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerView = 3
  const totalPages = Math.ceil(newJourneys.length / itemsPerView)
  
  const nextSlide = () => {
    if (currentIndex < totalPages - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const visibleJourneys = newJourneys.slice(
    currentIndex * itemsPerView,
    (currentIndex + 1) * itemsPerView
  )

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-serif text-purple-900 flex items-center gap-2">
          <span className="w-1 h-5 bg-purple-600 rounded-full" />
          New Journeys
        </h2>
        <a href="/new" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
          View All <ArrowRight className="w-3 h-3" />
        </a>
      </div>

      <div className="relative">
        {/* Swipe Navigation */}
        <div className="absolute -top-12 right-0 flex gap-2">
          <button
            onClick={prevSlide}
            disabled={currentIndex === 0}
            className={`p-2 rounded-full transition ${
              currentIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-purple-600 hover:bg-purple-100 shadow-sm'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            disabled={currentIndex === totalPages - 1}
            className={`p-2 rounded-full transition ${
              currentIndex === totalPages - 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-purple-600 hover:bg-purple-100 shadow-sm'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visibleJourneys.map((journey) => {
            const Icon = journey.icon
            return (
              <motion.a
                key={journey.id}
                href={journey.href}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={`${journey.bgColor} rounded-xl p-5 border hover:shadow-lg transition-all group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 ${journey.bgColor} rounded-xl flex items-center justify-center border-2 border-${journey.color}-200 group-hover:scale-110 transition`}>
                    <Icon className={`w-6 h-6 ${journey.iconColor}`} />
                  </div>
                  <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                    New
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{journey.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{journey.description}</p>
                <span className="text-sm text-purple-600 font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Begin <ArrowRight className="w-3 h-3" />
                </span>
              </motion.a>
            )
          })}
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-1 mt-4">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex
                  ? 'w-6 bg-purple-600'
                  : 'w-1.5 bg-gray-300 hover:bg-purple-400'
              }`}
            />
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-1">
          {currentIndex + 1} of {totalPages} • {newJourneys.length} new journeys
        </p>
      </div>
    </section>
  )
}