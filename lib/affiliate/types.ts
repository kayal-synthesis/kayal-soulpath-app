export interface AffiliateStats {
  totalClicks: number
  uniqueVisitors: number
  totalConversions: number
  conversionRate: number
  totalEarnings: number
  pendingCommissions: number
  paidCommissions: number
  lifetimeValue: number
  averageOrderValue: number
  recurringRevenue: number
  rank: number
  percentile: number
}

export interface AffiliateLink {
  id: string
  name: string
  toolId?: string
  toolName?: string
  toolEmoji?: string
  url: string
  shortUrl: string
  type: 'general' | 'tool_specific' | 'campaign'
  campaign?: string
  source?: string
  medium?: string
  createdAt: string
  clicks: number
  uniqueClicks: number
  conversions: number
  conversionRate: number
  earnings: number
  status: 'active' | 'paused' | 'archived'
  tags: string[]
}

export interface AffiliateData {
  id: string
  name: string
  email: string
  joinDate: string
  status: 'active' | 'suspended' | 'pending'
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  accountType: 'affiliate' | 'customer_advocate'
  
  stats: AffiliateStats
  
  monthlyStats: {
    month: string
    clicks: number
    conversions: number
    earnings: number
  }[]
  
  links: AffiliateLink[]
  
  commissionRates: {
    base: number
    tier: number
    recurring: number
    total: number
  }
  
  paymentMethods: {
    bank?: {
      bankName: string
      accountNumber: string
      accountName: string
      swiftCode: string
    }
    paypal?: {
      email: string
    }
  }
  
  nextMilestone: {
    type: string
    needed: number
    current: number
    reward: string
  }
  
  topTools: {
    toolId: string
    toolName: string
    toolEmoji: string
    clicks: number
    conversions: number
    earnings: number
    conversionRate: number
  }[]
  
  recentConversions: {
    id: string
    customerEmail: string
    toolName: string
    amount: number
    commission: number
    date: string
    status: 'pending' | 'paid'
  }[]
}

export interface Tool {
  id: string
  name: string
  emoji: string
  category: string
  subcategory: string
  description: string
  price: number
  commission: number
  avgConversion: number
  monthlySales: number
  isNew: boolean
  isPopular: boolean
  isTrending: boolean
  tags: string[]
}