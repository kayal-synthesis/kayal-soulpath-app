export interface User {
  id: string
  name: string
  email: string
  username?: string
  avatar?: string
  bio?: string
  dateOfBirth?: string
  birthTime?: string
  birthLocation?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

export interface UserProfile extends User {
  subscription: Subscription
  stats: UserStats
  images: UserImages
  settings: UserSettings
}

export interface Subscription {
  plan: 'free' | 'premium' | 'lifetime'
  status: 'active' | 'canceled' | 'expired'
  expiresAt?: string
  features: string[]
  paymentMethod?: PaymentMethod
}

export interface UserStats {
  reportsGenerated: number
  compatibilityChecks: number
  referralsCount: number
  creditsEarned: number
  totalSpent: number
  joinDate: string
  lastActive: string
}

export interface UserImages {
  hand?: {
    url: string
    thumbnail: string
    uploadedAt: string
    hand: 'left' | 'right' | 'dominant'
  }
  face?: {
    url: string
    thumbnail: string
    uploadedAt: string
    angle: 'front' | 'left' | 'right' | 'profile'
  }
}

export interface UserSettings {
  notifications: NotificationSettings
  privacy: PrivacySettings
  preferences: UserPreferences
}

export interface NotificationSettings {
  email: {
    dailyGuidance: boolean
    weeklySummary: boolean
    referralAlerts: boolean
    marketing: boolean
    reportUpdates: boolean
  }
  push: {
    newInsights: boolean
    referralUpdates: boolean
    chatMessages: boolean
  }
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends'
  showOnlineStatus: boolean
  allowDataSharing: boolean
  allowMarketingEmails: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  dateFormat: string
  timeFormat: '12h' | '24h'
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'paypal'
  last4?: string
  brand?: string
  expMonth?: number
  expYear?: number
  isDefault: boolean
}