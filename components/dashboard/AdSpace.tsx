'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { X, Sparkles, Crown, Gift } from 'lucide-react'

interface AdSpaceProps {
  variant?: 'premium' | 'referral' | 'special'
  onClose?: () => void
}

export const AdSpace = ({ variant = 'premium', onClose }: AdSpaceProps) => {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const ads = {
    premium: {
      icon: Crown,
      title: 'Go Premium',
      description: 'Unlock all 72+ reports and get unlimited access',
      cta: 'Upgrade Now',
      bgColor: 'from-primary-900 to-primary-800',
      textColor: 'text-white'
    },
    referral: {
      icon: Gift,
      title: 'Refer & Earn',
      description: 'Invite friends and earn free reports',
      cta: 'Share Link',
      bgColor: 'from-secondary-500 to-secondary-600',
      textColor: 'text-white'
    },
    special: {
      icon: Sparkles,
      title: 'Limited Time Offer',
      description: 'Get 30% off on all premium tools',
      cta: 'Claim Offer',
      bgColor: 'from-purple-600 to-pink-600',
      textColor: 'text-white'
    }
  }

  const ad = ads[variant]
  const Icon = ad.icon

  const handleClose = () => {
    setDismissed(true)
    onClose?.()
  }

  return (
    <Card className={`bg-gradient-to-br ${ad.bgColor} ${ad.textColor} overflow-hidden relative group p-6`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-white rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-white rounded-full blur-2xl" />
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded-full transition z-10"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium mb-1">{ad.title}</h3>
            <p className="text-sm text-white/80">{ad.description}</p>
          </div>
        </div>

        <Button 
          variant="secondary" 
          fullWidth
          className="bg-white text-primary-900 hover:bg-white/90"
        >
          {ad.cta}
        </Button>

        <p className="text-xs text-white/60 text-center mt-3">
          *Limited time offer. Terms apply.
        </p>
      </div>
    </Card>
  )
}