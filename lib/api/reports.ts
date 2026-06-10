import { api } from './client'

export interface Report {
  id: string
  title: string
  subtitle?: string
  description: string
  type: 'numerology' | 'palmistry' | 'physiognomy' | 'compatibility'
  domain: 'love' | 'career' | 'wealth' | 'spiritual' | 'health' | 'life-path'
  price?: number
  isFree: boolean
  isOwned: boolean
  thumbnail?: string
  features: string[]
  createdAt: string
  updatedAt: string
}

export interface ReportDetail extends Report {
  content: {
    introduction: string
    sections: ReportSection[]
    conclusion: string
  }
  metadata: {
    wordCount: number
    readingTime: number
    generatedFor: {
      userId: string
      name: string
      date: string
    }
  }
  shareUrl: string
}

export interface ReportSection {
  id: string
  title: string
  content: string
  icon?: string
  likes: number
  userLiked?: boolean
  shareable: boolean
}

export interface FreeReportsResponse {
  reports: Report[]
  total: number
  hasMore: boolean
}

export interface PurchasedReportsResponse {
  reports: Report[]
  total: number
  hasMore: boolean
}

export interface DomainReportsResponse {
  domain: string
  reports: Report[]
  snapshot?: {
    title: string
    data: Record<string, any>
  }
}

export interface DailyGuidance {
  day: number
  theme: string
  guidance: string
  peakHours: string
  energy: 'high' | 'medium' | 'low'
  color: string
  shareable: boolean
}

export interface CompatibilityResult {
  score: number
  match: string
  categories: Array<{
    name: string
    score: number
    description: string
    icon?: string
  }>
  insights: Array<{
    title: string
    content: string
  }>
  shareUrl: string
}

export const reportsApi = {
  /**
   * Get free reports for user
   */
  getFreeReports: async (userId: string, page?: number, limit?: number): Promise<FreeReportsResponse> => {
    const response = await api.get(`/api/reports/free`, { params: { userId, page, limit } })
    return response.data
  },

  /**
   * Get purchased reports for user
   */
  getPurchasedReports: async (userId: string, page?: number, limit?: number): Promise<PurchasedReportsResponse> => {
    const response = await api.get(`/api/reports/purchased`, { params: { userId, page, limit } })
    return response.data
  },

  /**
   * Get single report by ID
   */
  getReport: async (toolId: string, userId?: string): Promise<ReportDetail> => {
    const response = await api.get(`/api/reports/${toolId}`, { params: { userId } })
    return response.data
  },

  /**
   * Get reports by domain
   */
  getDomainReports: async (domain: string, userId?: string): Promise<DomainReportsResponse> => {
    const response = await api.get(`/api/domain/${domain}`, { params: { userId } })
    return response.data
  },

  /**
   * Get daily guidance
   */
  getDailyGuidance: async (userId?: string): Promise<DailyGuidance> => {
    const response = await api.get('/api/daily-guidance', { params: { userId } })
    return response.data
  },

  /**
   * Calculate compatibility
   */
  calculateCompatibility: async (data: {
    userId?: string
    partnerName: string
    partnerDob: string
    partnerBirthTime?: string
  }): Promise<CompatibilityResult> => {
    const response = await api.post('/api/compatibility', data)
    return response.data
  },

  /**
   * Get compatibility history
   */
  getCompatibilityHistory: async (userId: string): Promise<Array<CompatibilityResult & { id: string; date: string }>> => {
    const response = await api.get('/api/compatibility/history', { params: { userId } })
    return response.data
  },

  /**
   * Like a report section
   */
  likeSection: async (reportId: string, sectionId: string): Promise<{ likes: number }> => {
    const response = await api.post(`/api/reports/${reportId}/sections/${sectionId}/like`)
    return response.data
  },

  /**
   * Unlike a report section
   */
  unlikeSection: async (reportId: string, sectionId: string): Promise<{ likes: number }> => {
    const response = await api.delete(`/api/reports/${reportId}/sections/${sectionId}/like`)
    return response.data
  },

  /**
   * Purchase a report
   */
  purchaseReport: async (reportId: string): Promise<{ success: boolean; reportUrl: string }> => {
    const response = await api.post(`/api/reports/${reportId}/purchase`)
    return response.data
  },

  /**
   * Generate share URL for report
   */
  generateShareUrl: async (reportId: string, sectionId?: string): Promise<{ url: string }> => {
    const response = await api.post(`/api/reports/${reportId}/share`, { sectionId })
    return response.data
  },

  /**
   * Download report as PDF
   */
  downloadReport: async (reportId: string): Promise<Blob> => {
    const response = await api.get(`/api/reports/${reportId}/download`, {
      responseType: 'blob'
    })
    return response.data
  },

  /**
   * Get recommended reports for user
   */
  getRecommendedReports: async (userId: string, limit?: number): Promise<Report[]> => {
    const response = await api.get('/api/reports/recommended', { params: { userId, limit } })
    return response.data
  },

  /**
   * Search reports
   */
  searchReports: async (query: string, domain?: string): Promise<Report[]> => {
    const response = await api.get('/api/reports/search', { params: { query, domain } })
    return response.data
  }
}