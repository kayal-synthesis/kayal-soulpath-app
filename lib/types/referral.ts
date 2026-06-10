export interface ReferralLink {
  id: string
  url: string
  code: string
  createdAt: string
  clicks: number
  conversions: number
  conversionRate: number
  earnings: number
}

export interface ReferralStats {
  clicks: number
  signups: number
  purchases: number
  credits: number
  earnings: number
  conversionRate: number
  averageOrderValue: number
  topReferrals: ReferralContact[]
}

export interface ReferralContact {
  id: string
  name: string
  email?: string
  avatar?: string
  joinedAt: string
  status: 'pending' | 'active' | 'converted'
  purchases?: number
  totalSpent?: number
  rewardEarned?: Reward
}

export interface Reward {
  id: string
  name: string
  description: string
  type: 'report' | 'month' | 'credit' | 'lifetime'
  value: string
  threshold: number
  progress: number
  claimed: boolean
  claimedAt?: string
  expiresAt?: string
  imageUrl?: string
}

export interface ReferralTier {
  name: string
  threshold: number
  rewards: Reward[]
  benefits: string[]
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  avatar?: string
  referrals: number
  earnings: number
  trend: 'up' | 'down' | 'stable'
  isCurrentUser: boolean
  badges?: string[]
}

export interface ReferralSettings {
  rewards: {
    signupBonus: string
    firstPurchaseBonus: string
    tierThresholds: {
      tier1: number
      tier2: number
      tier3: number
    }
  }
  shareMessage: string
  emailTemplate: string
  socialMessages: {
    twitter: string
    facebook: string
    whatsapp: string
    email: string
  }
}

export interface ReferralHistory {
  id: string
  type: 'click' | 'signup' | 'purchase' | 'reward'
  amount?: number
  description: string
  createdAt: string
  referrer?: string
}