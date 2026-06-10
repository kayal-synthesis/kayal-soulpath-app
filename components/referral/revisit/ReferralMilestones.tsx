'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Gift, Star, Crown, Trophy, ChevronRight } from 'lucide-react'

interface Milestone {
  id: string
  name: string
  referrals: number
  reward: string
  achieved: boolean
  icon: any
}

export const ReferralMilestones = () => {
  const milestones: Milestone[] = [
    { id: '1', name: 'Starter', referrals: 1, reward: 'Free Report', achieved: true, icon: Gift },
    { id: '2', name: 'Bronze', referrals: 5, reward: '1 Month Premium', achieved: false, icon: Star },
    { id: '3', name: 'Silver', referrals: 15, reward: '3 Months Premium', achieved: false, icon: Trophy },
    { id: '4', name: 'Gold', referrals: 30, reward: '6 Months Premium', achieved: false, icon: Crown },
    { id: '5', name: 'Platinum', referrals: 50, reward: 'Lifetime Access', achieved: false, icon: Crown }
  ]

  return (
    <Card>
      <h3 className="text-lg font-medium mb-4">Referral Milestones</h3>
      <div className="space-y-4">
        {milestones.map((milestone) => {
          const Icon = milestone.icon
          return (
            <div key={milestone.id} className="relative">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  milestone.achieved ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-400'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">{milestone.name}</p>
                    <Badge variant={milestone.achieved ? 'success' : 'default'} size="sm">
                      {milestone.achieved ? 'Achieved' : `${milestone.referrals} referrals`}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-500">Reward: {milestone.reward}</p>
                </div>
              </div>
              {!milestone.achieved && (
                <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-neutral-200" />
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}