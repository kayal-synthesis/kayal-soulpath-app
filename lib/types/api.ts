export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ApiMeta
}

export interface ApiError {
  code: string
  message: string
  details?: any
  stack?: string
}

export interface ApiMeta {
  page?: number
  limit?: number
  total?: number
  hasMore?: boolean
  timestamp: string
  version: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number
    limit: number
    total: number
    pages: number
    hasMore: boolean
    timestamp: string
    version: string
  }
}

export interface ApiRequestOptions {
  headers?: Record<string, string>
  params?: Record<string, any>
  timeout?: number
  retries?: number
  cache?: boolean
}

export interface ApiEndpoints {
  auth: {
    login: string
    register: string
    logout: string
    session: string
    refresh: string
    forgotPassword: string
    resetPassword: string
    verifyEmail: string
    oauth: string
  }
  user: {
    profile: string
    update: string
    uploadHand: string
    uploadFace: string
    images: string
    stats: string
    notifications: string
    subscription: string
    activity: string
    export: string
  }
  reports: {
    free: string
    purchased: string
    recommended: string
    search: string
    dailyGuidance: string
  }
  compatibility: {
    calculate: string
    history: string
  }
  referral: {
    link: string
    stats: string
    rewards: string
    list: string
    leaderboard: string
  }
  payments: {
    createCheckout: string
    webhook: string
    subscription: string
    invoices: string
  }
}

export interface ApiConfig {
  baseURL: string
  timeout: number
  headers: Record<string, string>
  withCredentials: boolean
}

export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: string
  userId?: string
}

export interface WebSocketEvents {
  message: WebSocketMessage
  typing: { userId: string; typing: boolean }
  online: { userId: string; online: boolean }
  notification: { type: string; data: any }
}