import { api } from './client'

export interface ReferralStats {
  clicks: number
  signups: number
  purchases: number
  credits: number
  earnings: number
  conversionRate: number
}

export interface ReferralLink {
  id: string
  url: string
  code: string
  createdAt: string
  clicks: number
  conversions: number
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
}

export interface Referral {
  id: string
  name: string
  email?: string
  avatar?: string
  joinedAt: string
  status: 'pending' | 'active' | 'converted'
  rewardEarned?: {
    type: string
    value: string
    claimed: boolean
  }
  purchases?: number
  totalSpent?: number
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
}

export const referralApi = {
  /**
   * Get user's referral link
   */
  getReferralLink: async (userId: string): Promise<ReferralLink> => {
    const response = await api.get(`/api/referral/link`, { params: { userId } })
    return response.data
  },

  /**
   * Generate new referral link
   */
  generateReferralLink: async (userId: string): Promise<ReferralLink> => {
    const response = await api.post('/api/referral/link', { userId })
    return response.data
  },

  /**
   * Get referral statistics
   */
  getStats: async (userId: string): Promise<ReferralStats> => {
    const response = await api.get(`/api/referral/stats`, { params: { userId } })
    return response.data
  },

  /**
   * Get available rewards
   */
  getRewards: async (userId: string): Promise<Reward[]> => {
    const response = await api.get(`/api/referral/rewards`, { params: { userId } })
    return response.data
  },

  /**
   * Claim a reward
   */
  claimReward: async (userId: string, rewardId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/referral/claim', { userId, rewardId })
    return response.data
  },

  /**
   * Get referral list
   */
  getReferrals: async (userId: string, status?: 'pending' | 'active' | 'converted'): Promise<Referral[]> => {
    const response = await api.get(`/api/referral/list`, { params: { userId, status } })
    return response.data
  },

  /**
   * Get leaderboard
   */
  getLeaderboard: async (timeframe: 'week' | 'month' | 'all' = 'all', limit?: number): Promise<LeaderboardEntry[]> => {
    const response = await api.get('/api/referral/leaderboard', { params: { timeframe, limit } })
    return response.data
  },

  /**
   * Track referral click
   */
  trackClick: async (code: string): Promise<void> => {
    await api.post('/api/referral/track', { code, type: 'click' })
  },

  /**
   * Track referral conversion
   */
  trackConversion: async (code: string, purchaseAmount?: number): Promise<void> => {
    await api.post('/api/referral/track', { code, type: 'conversion', purchaseAmount })
  },

  /**
   * Get referral settings
   */
  getSettings: async (): Promise<ReferralSettings> => {
    const response = await api.get('/api/referral/settings')
    return response.data
  },

  /**
   * Send referral reminder
   */
  sendReminder: async (userId: string, friendId: string, method: 'email' | 'whatsapp'): Promise<{ success: boolean }> => {
    const response = await api.post('/api/referral/remind', { userId, friendId, method })
    return response.data
  },

  /**
   * Get referral earnings history
   */
  getEarningsHistory: async (userId: string): Promise<Array<{
    id: string
    amount: number
    type: string
    description: string
    createdAt: string
  }>> => {
    const response = await api.get('/api/referral/earnings', { params: { userId } })
    return response.data
  },

  /**
   * Withdraw earnings (if applicable)
   */
  withdrawEarnings: async (userId: string, amount: number, method: string): Promise<{ success: boolean; transactionId: string }> => {
    const response = await api.post('/api/referral/withdraw', { userId, amount, method })
    return response.data
  },

  /**
   * Get referral code info (public)
   */
  getReferralInfo: async (code: string): Promise<{
    valid: boolean
    referrerName?: string
    bonus?: string
  }> => {
    const response = await api.get(`/api/referral/info/${code}`)
    return response.data
  },

  /**
   * Apply referral code (when signing up)
   */
  applyReferralCode: async (code: string, newUserId: string): Promise<{ success: boolean; bonus: string }> => {
    const response = await api.post('/api/referral/apply', { code, newUserId })
    return response.data
  }
}