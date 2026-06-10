'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Gift, Star, Award, Check, Lock, Sparkles, Crown } from 'lucide-react'
import { toast } from 'sonner'

interface Reward {
  id: string
  name: string
  description: string
  threshold: number
  current: number
  type: 'report' | 'month' | 'credit' | 'lifetime'
  claimed: boolean
  icon?: any
}

export const RewardTracker = () => {
  const rewards: Reward[] = [
    { id: '1', name: 'Free Report', description: 'The Love Oracle', threshold: 1, current: 1, type: 'report', claimed: true, icon: Gift },
    { id: '2', name: 'Free Report', description: 'The Wealth Code', threshold: 2, current: 2, type: 'report', claimed: true, icon: Gift },
    { id: '3', name: 'Free Report', description: 'The Soul Compass', threshold: 3, current: 3, type: 'report', claimed: true, icon: Gift },
    { id: '4', name: 'Free Month', description: 'Premium access for 30 days', threshold: 5, current: 3, type: 'month', claimed: false, icon: Star },
    { id: '5', name: '3 Free Months', description: 'Extended premium access', threshold: 10, current: 3, type: 'month', claimed: false, icon: Sparkles },
    { id: '6', name: 'Free Year', description: '12 months of premium', threshold: 25, current: 3, type: 'month', claimed: false, icon: Crown }
  ]

  const claimReward = (id: string) => {
    toast.success('Reward claimed! Check your email for access.')
  }

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'report': return 'bg-primary-100 text-primary-600'
      case 'month': return 'bg-secondary-100 text-secondary-600'
      case 'lifetime': return 'bg-purple-100 text-purple-600'
      default: return 'bg-neutral-100 text-neutral-600'
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium">Your Rewards</h3>
        <span className="px-3 py-1 bg-primary-50 text-primary-600 text-sm rounded-full">
          {rewards.filter(r => r.claimed).length} claimed
        </span>
      </div>

      <div className="space-y-4">
        {rewards.map((reward) => {
          const Icon = reward.icon || Gift
          const isAvailable = reward.current >= reward.threshold
          const typeColor = getTypeColor(reward.type)

          return (
            <div
              key={reward.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition
                ${reward.claimed ? 'bg-neutral-50 border-neutral-200' : 
                  isAvailable ? 'bg-success/5 border-success/30' : 'bg-white border-neutral-200'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${typeColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{reward.name}</p>
                    {reward.claimed && (
                      <span className="px-2 py-0.5 bg-neutral-200 text-xs rounded-full">Claimed</span>
                    )}
                    {!reward.claimed && isAvailable && (
                      <span className="px-2 py-0.5 bg-success/10 text-success text-xs rounded-full">Ready</span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500">{reward.description}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {reward.current}/{reward.threshold} referrals
                  </p>
                </div>
              </div>
              <div>
                {reward.claimed ? (
                  <Check className="w-5 h-5 text-success" />
                ) : isAvailable ? (
                  <Button size="sm" onClick={() => claimReward(reward.id)}>Claim</Button>
                ) : (
                  <Lock className="w-5 h-5 text-neutral-400" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}