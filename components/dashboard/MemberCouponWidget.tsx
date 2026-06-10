'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Percent, Sparkles, Clock, X, Copy, Check, Tag, ShoppingBag, AlertCircle } from 'lucide-react'

interface Coupon {
  id: string
  code: string
  description: string
  discount_value: number
  min_purchase?: number
  end_date?: string
  is_active: boolean
  start_date: string
}

interface MemberCouponWidgetProps {
  userId?: string
  purchaseCount?: number
}

export function MemberCouponWidget({ userId, purchaseCount = 0 }: MemberCouponWidgetProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [storageError, setStorageError] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (userId) {
      loadMemberCoupons()
      loadDismissed()
    } else {
      setLoading(false)
    }
  }, [userId])

  const loadMemberCoupons = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)

      if (error) throw error

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

      // Member dashboard: ONLY show bundle/upsell coupons (no welcome, no affiliate)
      const memberCoupons = validCoupons.filter(coupon => {
        const code = coupon.code?.toUpperCase() || ''
        const desc = coupon.description?.toLowerCase() || ''
        
        // Filter out welcome coupons
        if (code.includes('WELCOME') || desc.includes('welcome') || desc.includes('first')) {
          return false
        }
        
        // Filter out affiliate coupons
        if (code.includes('AFF') || code.includes('REF') || desc.includes('affiliate')) {
          return false
        }
        
        // Show bundle coupons and regular offers
        return true
      })

      setCoupons(memberCoupons.slice(0, 2))
      
    } catch (error) {
      console.error('Error loading member coupons:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDismissed = () => {
    if (!userId) return
    
    try {
      const saved = localStorage.getItem(`dismissed_coupons_${userId}`)
      if (saved) {
        setDismissed(JSON.parse(saved))
      }
      setStorageError(false)
    } catch (error) {
      console.error('Error loading dismissed coupons:', error)
      setStorageError(true)
      // Fallback to empty array
      setDismissed([])
    }
  }

  const dismissCoupon = (couponId: string) => {
    if (!userId) return
    
    const newDismissed = [...dismissed, couponId]
    setDismissed(newDismissed)
    
    try {
      localStorage.setItem(`dismissed_coupons_${userId}`, JSON.stringify(newDismissed))
      setStorageError(false)
    } catch (error) {
      console.error('Error saving dismissed coupon:', error)
      setStorageError(true)
      // Still update UI even if storage fails
    }
    
    setCoupons(coupons.filter(c => c.id !== couponId))
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const visibleCoupons = coupons.filter(c => !dismissed.includes(c.id))

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-500 px-1">Member Offers</h3>
        <Card className="p-4 animate-pulse">
          <div className="h-20 bg-neutral-200 rounded"></div>
        </Card>
      </div>
    )
  }

  if (storageError) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-500 px-1">Member Offers</h3>
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">Offers available - refresh to see</p>
          </div>
        </Card>
      </div>
    )
  }

  if (visibleCoupons.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-500 px-1 flex items-center gap-2">
        <ShoppingBag className="w-4 h-4" />
        Exclusive Member Offers
      </h3>
      {visibleCoupons.map((coupon) => (
        <motion.div
          key={coupon.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <Card className="p-4 relative overflow-hidden border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 transform rotate-45 translate-x-8 -translate-y-8 bg-amber-100" />
            </div>

            <button
              onClick={() => dismissCoupon(coupon.id)}
              className="absolute top-2 right-2 p-1 hover:bg-neutral-200 rounded-full transition z-10"
            >
              <X className="w-4 h-4 text-neutral-500" />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Percent className="w-4 h-4 text-amber-600" />
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  {coupon.discount_value}% OFF
                </Badge>
              </div>

              <h4 className="font-semibold text-lg mb-1">Member Exclusive</h4>
              <p className="text-sm text-neutral-600 mb-4">{coupon.description}</p>

              {coupon.min_purchase && coupon.min_purchase > 1 && (
                <div className="text-xs text-amber-600 mb-2">
                  Min. {coupon.min_purchase} tools required
                </div>
              )}

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

              {coupon.end_date && (
                <div className="flex items-center gap-1 text-xs text-neutral-500 mb-3">
                  <Clock className="w-3 h-3" />
                  <span>Expires {new Date(coupon.end_date).toLocaleDateString()}</span>
                </div>
              )}

              <Button size="sm" variant="outline" className="w-full">
                Shop Eligible Tools
              </Button>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}