'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Gift, Percent, Sparkles, Clock, X, Copy, Check, Tag, Users } from 'lucide-react'

interface Coupon {
  id: string
  code: string
  description: string
  discount_value: number
  discount_type?: string
  min_purchase?: number
  end_date?: string
  is_active: boolean
  start_date: string
}

interface CouponWidgetsProps {
  userId?: string
  purchaseCount?: number
  dashboardType?: 'main' | 'member' | 'referral'
}

export function CouponWidgets({ userId, purchaseCount = 0, dashboardType = 'main' }: CouponWidgetsProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    console.log('🎯 CouponWidgets mounted:', { userId, purchaseCount, dashboardType })
    if (userId) {
      loadCoupons()
      loadDismissed()
    } else {
      setLoading(false)
    }
  }, [userId, purchaseCount, dashboardType])

  const loadCoupons = async () => {
    try {
      setLoading(true)
      console.log('🔍 Loading coupons for dashboard:', dashboardType, 'purchaseCount:', purchaseCount)
      
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)

      if (error) throw error

      console.log('📦 All active coupons:', data)

      if (!data || data.length === 0) {
        setCoupons([])
        return
      }

      // Filter by date
      const now = new Date()
      const validCoupons = data.filter(coupon => {
        const startValid = new Date(coupon.start_date) <= now
        const endValid = !coupon.end_date || new Date(coupon.end_date) >= now
        return startValid && endValid
      })

      console.log('📦 Date-valid coupons:', validCoupons.length)

      // Smart filtering based on dashboard type and purchase history
      let eligibleCoupons = validCoupons.filter(coupon => {
        const code = coupon.code?.toUpperCase() || ''
        const desc = coupon.description?.toLowerCase() || ''

        // Determine coupon type
        const isWelcome = code.includes('WELCOME') || desc.includes('welcome') || desc.includes('first')
        const isBundle = code.includes('BUNDLE') || (coupon.min_purchase && coupon.min_purchase > 1)
        const isAffiliate = code.includes('AFF') || code.includes('REF') || desc.includes('affiliate')

        console.log(`🔍 Checking coupon ${coupon.code}:`, { isWelcome, isBundle, isAffiliate })

        // Apply rules based on dashboard type
        switch(dashboardType) {
          case 'main':
            // Main dashboard: Show welcome to new users, bundle to existing
            if (purchaseCount === 0) {
              return isWelcome // New users see welcome coupons
            } else {
              return !isWelcome && (isBundle || !isAffiliate) // Existing users see non-welcome coupons
            }

          case 'member':
            // Member dashboard: NEVER show welcome coupons
            // Only show bundle or regular coupons
            return !isWelcome && !isAffiliate

          case 'referral':
            // Referral dashboard: Show affiliate coupons first, then bundle
            return isAffiliate || isBundle

          default:
            return true
        }
      })

      console.log('📦 Eligible coupons after smart filtering:', eligibleCoupons.length)
      console.log('📦 Eligible coupons:', eligibleCoupons)

      // Show up to 2 coupons
      setCoupons(eligibleCoupons.slice(0, 2))
      
    } catch (error) {
      console.error('❌ Error loading coupons:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDismissed = () => {
    if (userId) {
      const saved = localStorage.getItem(`dismissed_coupons_${userId}`)
      if (saved) {
        setDismissed(JSON.parse(saved))
      }
    }
  }

  const dismissCoupon = (couponId: string) => {
    const newDismissed = [...dismissed, couponId]
    setDismissed(newDismissed)
    if (userId) {
      localStorage.setItem(`dismissed_coupons_${userId}`, JSON.stringify(newDismissed))
    }
    setCoupons(coupons.filter(c => c.id !== couponId))
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const getCouponStyle = (coupon: Coupon) => {
    const code = coupon.code?.toUpperCase() || ''
    const desc = coupon.description?.toLowerCase() || ''

    if (code.includes('WELCOME') || desc.includes('welcome')) {
      return {
        bgColor: 'border-primary-200 bg-gradient-to-br from-primary-50 to-white',
        iconBg: 'bg-primary-100',
        icon: Gift,
        iconColor: 'text-primary-600',
        badgeColor: 'bg-primary-50 text-primary-700 border-primary-200',
        title: '🎁 Welcome Gift'
      }
    } else if (code.includes('BUNDLE') || (coupon.min_purchase && coupon.min_purchase > 1)) {
      return {
        bgColor: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',
        iconBg: 'bg-amber-100',
        icon: Percent,
        iconColor: 'text-amber-600',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        title: '💰 Bundle & Save'
      }
    } else if (code.includes('AFF') || code.includes('REF') || desc.includes('affiliate')) {
      return {
        bgColor: 'border-purple-200 bg-gradient-to-br from-purple-50 to-white',
        iconBg: 'bg-purple-100',
        icon: Users,
        iconColor: 'text-purple-600',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        title: '🤝 Affiliate Exclusive'
      }
    } else {
      return {
        bgColor: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white',
        iconBg: 'bg-emerald-100',
        icon: Sparkles,
        iconColor: 'text-emerald-600',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        title: '✨ Special Offer'
      }
    }
  }

  // Filter out dismissed coupons
  const visibleCoupons = coupons.filter(c => !dismissed.includes(c.id))

  console.log('🎯 Final visible coupons:', visibleCoupons.length)

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-500 px-1">Special Offers</h3>
        <Card className="p-4 animate-pulse">
          <div className="h-20 bg-neutral-200 rounded"></div>
        </Card>
      </div>
    )
  }

  if (visibleCoupons.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-500 px-1">
        {dashboardType === 'referral' ? '🤝 Affiliate Rewards' : 'Special Offers'}
      </h3>
      {visibleCoupons.map((coupon) => {
        const style = getCouponStyle(coupon)
        const Icon = style.icon
        
        return (
          <motion.div
            key={coupon.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Card className={`p-4 relative overflow-hidden border-2 ${style.bgColor}`}>
              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                <div className={`absolute top-0 right-0 w-16 h-16 transform rotate-45 translate-x-8 -translate-y-8 ${style.iconBg}`} />
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => dismissCoupon(coupon.id)}
                className="absolute top-2 right-2 p-1 hover:bg-neutral-200 rounded-full transition z-10"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>

              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${style.iconBg}`}>
                    <Icon className={`w-4 h-4 ${style.iconColor}`} />
                  </div>
                  <Badge variant="outline" className={style.badgeColor}>
                    {coupon.discount_value}% OFF
                  </Badge>
                </div>

                {/* Title and Description */}
                <h4 className="font-semibold text-lg mb-1">{style.title}</h4>
                <p className="text-sm text-neutral-600 mb-4">{coupon.description}</p>

                {/* Minimum purchase info */}
                {coupon.min_purchase && coupon.min_purchase > 1 && (
                  <div className="text-xs text-amber-600 mb-2">
                    Min. {coupon.min_purchase} tools required
                  </div>
                )}

                {/* Coupon Code */}
                <div className="bg-white border border-neutral-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-neutral-400" />
                      <code className="font-mono font-bold text-lg">{coupon.code}</code>
                    </div>
                    <button
                      onClick={() => handleCopy(coupon.code)}
                      className="p-2 hover:bg-neutral-100 rounded-lg transition"
                    >
                      {copied === coupon.code ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-neutral-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expiry */}
                {coupon.end_date && (
                  <div className="flex items-center gap-1 text-xs text-neutral-500 mb-3">
                    <Clock className="w-3 h-3" />
                    <span>Expires {new Date(coupon.end_date).toLocaleDateString()}</span>
                  </div>
                )}

                {/* CTA Button */}
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full"
                >
                  Browse Eligible Tools
                </Button>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}