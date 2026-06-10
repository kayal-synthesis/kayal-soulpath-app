'use client'

import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Trophy, Medal, Award, TrendingUp, Crown } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  name: string
  referrals: number
  avatar?: string
  isCurrentUser?: boolean
  trend?: 'up' | 'down' | 'stable'
}

export const Leaderboard = () => {
  const entries: LeaderboardEntry[] = [
    { rank: 1, name: 'Priya K.', referrals: 47, trend: 'up' },
    { rank: 2, name: 'You', referrals: 32, isCurrentUser: true, trend: 'up' },
    { rank: 3, name: 'Michael T.', referrals: 28, trend: 'down' },
    { rank: 4, name: 'Sarah C.', referrals: 24, trend: 'stable' },
    { rank: 5, name: 'David L.', referrals: 21, trend: 'up' },
    { rank: 6, name: 'Emma W.', referrals: 19, trend: 'down' },
    { rank: 7, name: 'James P.', referrals: 17, trend: 'stable' },
    { rank: 8, name: 'Lisa M.', referrals: 15, trend: 'up' }
  ]

  const getRankIcon = (rank: number) => {
    switch(rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />
      case 2: return <Medal className="w-5 h-5 text-gray-400" />
      case 3: return <Award className="w-5 h-5 text-amber-600" />
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-neutral-500">{rank}</span>
    }
  }

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    if (!trend) return null
    return <TrendingUp className={`w-4 h-4 ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-warning rotate-180' : 'text-neutral-400'}`} />
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium">Leaderboard</h3>
        <Badge variant="secondary">Top Referrers</Badge>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors
              ${entry.isCurrentUser ? 'bg-primary-50 border border-primary-100' : 'hover:bg-neutral-50'}`}
          >
            <div className="w-8 flex justify-center">
              {getRankIcon(entry.rank)}
            </div>
            <Avatar src={entry.avatar} fallback={entry.name.charAt(0)} size="sm" />
            <div className="flex-1">
              <p className={`font-medium ${entry.isCurrentUser ? 'text-primary-600' : ''}`}>
                {entry.name} {entry.isCurrentUser && '(You)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-primary-600">{entry.referrals}</span>
              {getTrendIcon(entry.trend)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-600">Your Rank</span>
          <span className="font-medium text-primary-600">#2</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-neutral-600">Total Referrals</span>
          <span className="font-medium">32</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-neutral-600">To reach #1</span>
          <span className="font-medium">15 more referrals</span>
        </div>
      </div>
    </Card>
  )
}