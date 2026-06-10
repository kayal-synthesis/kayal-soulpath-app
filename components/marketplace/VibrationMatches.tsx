'use client'

import { ArrowRight } from 'lucide-react'

const matches = [
  {
    id: 1,
    name: 'Omni-Seer Sanctum',
    match: 98,
    description: 'Perfect for today\'s high vibe',
    price: 29,
    icon: '🔮',
    color: 'purple',
    href: '/domain/omni-seer-sanctum'
  },
  {
    id: 2,
    name: 'Eternal Clock',
    match: 87,
    description: 'Aligns with your moon',
    price: 15,
    icon: '⏳',
    color: 'amber',
    href: '/domain/eternal-clock'
  },
  {
    id: 3,
    name: 'Voice of Prophecy',
    match: 82,
    description: 'Your voice needs to be heard',
    price: 19,
    icon: '🎤',
    color: 'blue',
    href: '/domain/voice-of-prophecy'
  },
  {
    id: 4,
    name: "Heart's Destiny",
    match: 79,
    description: 'Love is calling you',
    price: 19,
    icon: '💞',
    color: 'red',
    href: '/domain/hearts-destiny'
  }
]

export const VibrationMatches = () => {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-serif text-purple-900 flex items-center gap-2">
          <span className="w-1 h-5 bg-purple-600 rounded-full" />
          Matches Your Vibration
        </h2>
        <a href="/matches" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
          View All Matches <ArrowRight className="w-3 h-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map((match) => (
          <a
            key={match.id}
            href={match.href}
            className="bg-white rounded-xl p-4 border border-purple-100 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className={`text-3xl bg-${match.color}-50 w-12 h-12 rounded-xl flex items-center justify-center`}>
                {match.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900">{match.name}</h3>
                  <span className={`text-xs font-medium text-${match.color}-600 bg-${match.color}-50 px-2 py-1 rounded-full`}>
                    {match.match}%
                  </span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}


