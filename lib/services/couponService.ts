import { createClient } from '@/lib/supabase/client'

export interface Coupon {
  id: string
  code: string
  description: string
  discount_type: 'percentage' | 'fixed' | 'bundle'
  discount_value: number
  min_purchase?: number
  max_discount?: number
  applies_to: string[]
  excludes_tools: string[]
  usage_limit?: number
  per_user_limit?: number
  used_count: number
  start_date?: string
  end_date?: string
  is_active: boolean
  created_for_affiliate_id?: string
  applicable_dashboards: string[]
}

export interface UserContext {
  userId: string
  purchaseCount: number
  purchasedToolIds: Set<string>
  totalSpent: number
  lastPurchaseDate?: string
  isAffiliate: boolean
  affiliateId?: string
}

export interface ToolEligibility {
  toolId: string
  toolName: string
  toolPrice: number
  toolEmoji: string
  eligibleCoupons: Coupon[]
  badgePriority: number
  badgeText?: string
  badgeColor?: string
}

export class CouponService {
  private supabase = createClient()
  
  async getUserContext(userId: string): Promise<UserContext> {
    // Get user's purchase history
    const { data: purchases } = await this.supabase
      .from('purchases')
      .select('tool_id, price, created_at')
      .eq('user_id', userId)
    
    // Check if user is an affiliate
    const { data: affiliate } = await this.supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .eq('account_type', 'affiliate')
      .single()
    
    return {
      userId,
      purchaseCount: purchases?.length || 0,
      purchasedToolIds: new Set(purchases?.map(p => p.tool_id) || []),
      totalSpent: purchases?.reduce((sum, p) => sum + (p.price || 0), 0) || 0,
      lastPurchaseDate: purchases?.[purchases.length - 1]?.created_at,
      isAffiliate: !!affiliate,
      affiliateId: affiliate?.id
    }
  }
  
  async getActiveCoupons(context: UserContext, dashboardType: 'main' | 'member' | 'referral'): Promise<Coupon[]> {
    const now = new Date().toISOString()
    
    let query = this.supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', now)
      .or(`end_date.gte.${now},end_date.is.null`)
      .contains('applicable_dashboards', [dashboardType])
    
    // Affiliate-specific coupons
    if (context.isAffiliate && context.affiliateId) {
      query = query.or(`created_for_affiliate_id.eq.${context.affiliateId},created_for_affiliate_id.is.null`)
    } else {
      query = query.is('created_for_affiliate_id', null)
    }
    
    const { data } = await query
    return data || []
  }
  
  async getToolEligibility(
    tool: any,
    context: UserContext,
    coupons: Coupon[]
  ): Promise<ToolEligibility> {
    const eligibleCoupons = coupons.filter(coupon => {
      // Check tool-specific rules
      if (coupon.applies_to?.length > 0 && !coupon.applies_to.includes(tool.id)) {
        return false
      }
      
      if (coupon.excludes_tools?.includes(tool.id)) {
        return false
      }
      
      // Check min purchase
      if (coupon.min_purchase && tool.price < coupon.min_purchase) {
        return false
      }
      
      // Check if user already purchased this tool
      if (context.purchasedToolIds.has(tool.id)) {
        return false
      }
      
      return true
    })
    
    // Determine badge priority
    let badgePriority = 0
    let badgeText = ''
    let badgeColor = ''
    
    if (eligibleCoupons.length > 0) {
      // Welcome coupon (highest priority)
      const welcomeCoupon = eligibleCoupons.find(c => c.code === 'WELCOME20')
      if (welcomeCoupon && context.purchaseCount === 0) {
        badgePriority = 100
        badgeText = `🎁 ${welcomeCoupon.discount_value}% OFF First Tool`
        badgeColor = 'bg-primary-100 text-primary-700'
      } 
      // Seasonal coupons
      else {
        const seasonal = eligibleCoupons.find(c => c.code.includes('SEASON') || c.code.includes('HOLIDAY'))
        if (seasonal) {
          badgePriority = 80
          badgeText = `🌿 ${seasonal.discount_value}% OFF Limited`
          badgeColor = 'bg-green-100 text-green-700'
        }
        // Regular coupons
        else {
          const regular = eligibleCoupons[0]
          badgePriority = 60
          badgeText = `💰 ${regular.discount_value}% OFF`
          badgeColor = 'bg-amber-100 text-amber-700'
        }
      }
    }
    
    return {
      toolId: tool.id,
      toolName: tool.name,
      toolPrice: tool.price,
      toolEmoji: tool.emoji,
      eligibleCoupons,
      badgePriority,
      badgeText,
      badgeColor
    }
  }
  
  async validateCoupon(code: string, toolId: string, userId: string): Promise<{
    valid: boolean
    coupon?: Coupon
    error?: string
    finalPrice?: number
    discount?: number
  }> {
    try {
      // Get coupon
      const { data: coupon } = await this.supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single()
      
      if (!coupon) {
        return { valid: false, error: 'Invalid coupon code' }
      }
      
      // Check date range
      const now = new Date()
      if (coupon.start_date && new Date(coupon.start_date) > now) {
        return { valid: false, error: 'This coupon is not active yet' }
      }
      if (coupon.end_date && new Date(coupon.end_date) < now) {
        return { valid: false, error: 'This coupon has expired' }
      }
      
      // Check usage limit
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        return { valid: false, error: 'This coupon has reached its usage limit' }
      }
      
      // Check if applies to this tool
      if (coupon.applies_to?.length > 0 && !coupon.applies_to.includes(toolId)) {
        return { valid: false, error: 'This coupon does not apply to this tool' }
      }
      if (coupon.excludes_tools?.includes(toolId)) {
        return { valid: false, error: 'This coupon does not apply to this tool' }
      }
      
      // Get tool price (you'll need to pass this in)
      // For now, return coupon info
      
      return { 
        valid: true, 
        coupon,
        discount: coupon.discount_value
      }
      
    } catch (error) {
      return { valid: false, error: 'Error validating coupon' }
    }
  }
  
  async getBannersForDashboard(
    context: UserContext,
    dashboardType: 'main' | 'member' | 'referral',
    coupons: Coupon[]
  ) {
    const banners = []
    
    // Welcome banner (main dashboard only, new users)
    if (dashboardType === 'main' && context.purchaseCount === 0) {
      const welcomeCoupon = coupons.find(c => c.code === 'WELCOME20')
      if (welcomeCoupon) {
        banners.push({
          id: 'welcome',
          type: 'hero',
          title: '🎁 Welcome to Kayal LifeOS!',
          description: 'Get 20% off your first tool. Start your journey today.',
          code: welcomeCoupon.code,
          discount: welcomeCoupon.discount_value,
          cta: 'Browse Tools',
          ctaLink: '/marketplace',
          bgColor: 'bg-gradient-to-r from-primary-600 to-secondary-600',
          textColor: 'text-white',
          priority: 100
        })
      }
    }
    
    // Bundle banner (all dashboards, any user)
    const bundleCoupon = coupons.find(c => c.code === 'BUNDLE30')
    if (bundleCoupon) {
      banners.push({
        id: 'bundle',
        type: dashboardType === 'main' ? 'sidebar' : 'subtle',
        title: 'Bundle & Save 30%',
        description: 'Buy any 3 tools and get 30% off',
        code: bundleCoupon.code,
        discount: bundleCoupon.discount_value,
        cta: 'Build Your Bundle',
        ctaLink: '/bundle-builder',
        bgColor: 'bg-gradient-to-r from-amber-500 to-orange-500',
        textColor: 'text-white',
        priority: 60
      })
    }
    
    // Seasonal banner (check date)
    const seasonalCoupon = coupons.find(c => c.code.includes('SEASON') || c.code.includes('HOLIDAY'))
    if (seasonalCoupon) {
      banners.push({
        id: 'seasonal',
        type: dashboardType === 'main' ? 'hero' : 'compact',
        title: this.getSeasonalTitle(),
        description: `${seasonalCoupon.discount_value}% off selected tools`,
        code: seasonalCoupon.code,
        discount: seasonalCoupon.discount_value,
        cta: 'Shop Now',
        ctaLink: '/marketplace/seasonal',
        bgColor: 'bg-gradient-to-r from-green-600 to-emerald-600',
        textColor: 'text-white',
        priority: 80
      })
    }
    
    // Loyalty banner (member dashboard only, 3+ purchases)
    if (dashboardType === 'member' && context.purchaseCount >= 3) {
      banners.push({
        id: 'loyalty',
        type: 'subtle',
        title: '🎯 Complete Your Collection',
        description: 'You own 3 tools. Get 20% off your next purchase!',
        code: 'LOYALTY20',
        discount: 20,
        cta: 'Browse Tools',
        ctaLink: '/marketplace/recommended',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-200',
        priority: 70
      })
    }
    
    // Referral banner (affiliates only)
    if (dashboardType === 'referral' && context.isAffiliate) {
      banners.push({
        id: 'affiliate-tools',
        type: 'info',
        title: '📢 Share & Earn',
        description: 'Share these exclusive codes with your audience',
        cta: 'View Marketing Kit',
        ctaLink: '/member/referral/marketing',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        priority: 90
      })
    }
    
    return banners.sort((a, b) => b.priority - a.priority)
  }
  
  private getSeasonalTitle(): string {
    const now = new Date()
    const month = now.getMonth()
    const day = now.getDate()
    
    // Valentine's Day (Feb 1-14)
    if (month === 1 && day <= 14) {
      return '💝 Valentine\'s Day Special'
    }
    // Spring (March-May)
    if (month >= 2 && month <= 4) {
      return '🌸 Spring Renewal Sale'
    }
    // Summer (June-August)
    if (month >= 5 && month <= 7) {
      return '☀️ Summer Solstice Offers'
    }
    // Fall (September-November)
    if (month >= 8 && month <= 10) {
      return '🍂 Autumn Wisdom Sale'
    }
    // Winter (December)
    if (month === 11) {
      return '🎄 Holiday Special'
    }
    return '✨ Limited Time Offer'
  }
}

export const couponService = new CouponService()