'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { X, Crown, Gift, Sparkles } from 'lucide-react'

export const AdWidget = () => {
  const [isVisible, setIsVisible] = useState(true)
  const [currentAd, setCurrentAd] = useState(0)

  const ads = [
    {
      title: 'Temple Access',
      description: 'Get all 23 legendary oracles',
      icon: Crown,
      color: 'from-primary-600 to-primary-800',
      badge: 'Limited',
      cta: 'Learn More',
      discount: 'Save $584'
    },
    {
      title: 'Referral Bonus',
      description: 'Earn $47 for each friend',
      icon: Gift,
      color: 'from-secondary-600 to-secondary-700',
      badge: 'Double',
      cta: 'Share Now',
      discount: '2x Credits'
    }
  ]

  if (!isVisible) return null
  const ad = ads[currentAd]
  const Icon = ad.icon

  return (
    <Card className={`p-0 overflow-hidden bg-gradient-to-br ${ad.color} text-white`}>
      <div className="p-4 relative">
        <button 
          onClick={() => setIsVisible(false)} 
          className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition"
        >
          <X className="w-3 h-3" />
        </button>
        
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-5 h-5 text-secondary-400" />
          <h3 className="text-sm font-medium">{ad.title}</h3>
          <Badge variant="secondary" size="sm" className="bg-secondary-500/20 text-secondary-300 border-0 ml-auto">
            {ad.badge}
          </Badge>
        </div>
        
        <p className="text-xs text-white/80 mb-3">{ad.description}</p>
        
        <Button size="sm" variant="secondary" fullWidth className="mb-2">
          {ad.cta}
        </Button>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {ads.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentAd(i)} 
                className={`h-1 rounded-full transition-all ${i === currentAd ? 'w-4 bg-white' : 'w-2 bg-white/40'}`} 
              />
            ))}
          </div>
          <span className="text-[10px] text-white/80">{ad.discount}</span>
        </div>
      </div>
    </Card>
  )
}