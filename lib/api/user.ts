import { api } from './client'

export interface UserProfile {
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
  subscription?: {
    plan: 'free' | 'premium' | 'lifetime'
    expiresAt?: string
    features: string[]
  }
  stats?: {
    reportsGenerated: number
    compatibilityChecks: number
    referralsCount: number
    creditsEarned: number
  }
}

export interface UpdateProfileData {
  name?: string
  username?: string
  avatar?: string
  bio?: string
  dateOfBirth?: string
  birthTime?: string
  birthLocation?: string
  phone?: string
}

export interface UploadImageResponse {
  url: string
  thumbnailUrl?: string
}

export interface HandImageData {
  image: string | File
  hand: 'left' | 'right' | 'dominant'
}

export interface FaceImageData {
  image: string | File
  angle: 'front' | 'left' | 'right' | 'profile'
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

export const userApi = {
  /**
   * Get current user profile
   */
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/api/user/profile')
    return response.data
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: UpdateProfileData): Promise<UserProfile> => {
    const response = await api.put('/api/user/profile', data)
    return response.data
  },

  /**
   * Upload hand image
   */
  uploadHandImage: async (data: HandImageData): Promise<UploadImageResponse> => {
    const formData = new FormData()
    formData.append('image', data.image)
    formData.append('hand', data.hand)
    
    const response = await api.post('/api/user/upload-hand', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Upload face image
   */
  uploadFaceImage: async (data: FaceImageData): Promise<UploadImageResponse> => {
    const formData = new FormData()
    formData.append('image', data.image)
    formData.append('angle', data.angle)
    
    const response = await api.post('/api/user/upload-face', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Get user images
   */
  getImages: async (): Promise<{
    hand?: { url: string; thumbnail: string; uploadedAt: string }
    face?: { url: string; thumbnail: string; uploadedAt: string }
  }> => {
    const response = await api.get('/api/user/images')
    return response.data
  },

  /**
   * Delete image
   */
  deleteImage: async (type: 'hand' | 'face'): Promise<{ message: string }> => {
    const response = await api.delete(`/api/user/images/${type}`)
    return response.data
  },

  /**
   * Get user statistics
   */
  getStats: async (): Promise<UserProfile['stats']> => {
    const response = await api.get('/api/user/stats')
    return response.data
  },

  /**
   * Get notification settings
   */
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    const response = await api.get('/api/user/notifications')
    return response.data
  },

  /**
   * Update notification settings
   */
  updateNotificationSettings: async (settings: Partial<NotificationSettings>): Promise<NotificationSettings> => {
    const response = await api.put('/api/user/notifications', settings)
    return response.data
  },

  /**
   * Get subscription details
   */
  getSubscription: async (): Promise<UserProfile['subscription']> => {
    const response = await api.get('/api/user/subscription')
    return response.data
  },

  /**
   * Update subscription (upgrade/downgrade)
   */
  updateSubscription: async (plan: 'free' | 'premium' | 'lifetime'): Promise<UserProfile['subscription']> => {
    const response = await api.post('/api/user/subscription', { plan })
    return response.data
  },

  /**
   * Cancel subscription
   */
  cancelSubscription: async (): Promise<{ message: string }> => {
    const response = await api.post('/api/user/subscription/cancel')
    return response.data
  },

  /**
   * Delete user account
   */
  deleteAccount: async (password?: string): Promise<{ message: string }> => {
    const response = await api.delete('/api/user/account', { data: { password } })
    return response.data
  },

  /**
   * Get user activity log
   */
  getActivityLog: async (limit?: number): Promise<Array<{
    id: string
    action: string
    details: any
    createdAt: string
  }>> => {
    const response = await api.get('/api/user/activity', { params: { limit } })
    return response.data
  },

  /**
   * Export user data (GDPR)
   */
  exportData: async (): Promise<{ url: string }> => {
    const response = await api.post('/api/user/export')
    return response.data
  }
}