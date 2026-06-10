'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Users, Copy, Check, Gift } from 'lucide-react'
import { toast } from 'sonner'

interface ReferralProgressProps {
  stats?: {
    invited: number
    target: number
    credits: number
    nextReward: string
    link: string
  }
}

export const ReferralProgress = ({ stats }: ReferralProgressProps) => {
  const [copied, setCopied] = useState(false)

  const referralData = stats || {
    invited: 3,
    target: 5,
    credits: 2,
    nextReward: 'Free Month',
    link: 'https://affiliate.kayalsoulpath.com/ref/demo'
  }

  const progress = (referralData.invited / referralData.target) * 100

  const copyLink = () => {
    navigator.clipboard.writeText(referralData.link)
    setCopied(true)
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="bg-gradient-to-r from-primary-50 to-secondary-50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-medium">Your Referral Circle</h2>
        </div>
        <div className="px-3 py-1 bg-white rounded-full text-sm">
          <Gift className="w-4 h-4 inline mr-1 text-secondary-500" />
          <span className="font-medium">{referralData.credits} credits</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span>{referralData.invited} of {referralData.target} friends</span>
          <span className="font-medium text-primary-600">{Math.round(progress)}%</span>
        </div>
        <ProgressBar value={referralData.invited} max={referralData.target} color="primary" size="md" />
        <p className="text-sm text-neutral-600 mt-2">
          {referralData.target - referralData.invited} more for a {referralData.nextReward}!
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={referralData.link}
            readOnly
            className="w-full px-3 py-2 bg-white border rounded-lg text-sm"
          />
          <button
            onClick={copyLink}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-neutral-100 rounded"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <Button variant="secondary" size="sm">Share</Button>
      </div>
    </Card>
  )
}
