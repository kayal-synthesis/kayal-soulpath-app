import { api } from './client'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  user: {
    id: string
    name: string
    email: string
    username?: string
    avatar?: string
    createdAt: string
  }
  token: string
}

export interface ForgotPasswordData {
  email: string
}

export interface ResetPasswordData {
  token: string
  password: string
}

export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/register', data)
    return response.data
  },

  /**
   * Login existing user
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/login', credentials)
    return response.data
  },

  /**
   * Logout current user
   */
  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout')
  },

  /**
   * Get current session/user
   */
  getSession: async (): Promise<{ user: AuthResponse['user'] } | null> => {
    try {
      const response = await api.get('/api/auth/session')
      return response.data
    } catch {
      return null
    }
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (data: ForgotPasswordData): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/forgot-password', data)
    return response.data
  },

  /**
   * Reset password with token
   */
  resetPassword: async (data: ResetPasswordData): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/reset-password', data)
    return response.data
  },

  /**
   * Verify email with token
   */
  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/verify-email', { token })
    return response.data
  },

  /**
   * Resend verification email
   */
  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/resend-verification', { email })
    return response.data
  },

  /**
   * OAuth authentication (Google, Facebook)
   */
  oauth: async (provider: 'google' | 'facebook', accessToken: string, profile: any): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/oauth', {
      provider,
      accessToken,
      profile
    })
    return response.data
  },

  /**
   * Refresh authentication token
   */
  refreshToken: async (): Promise<{ token: string }> => {
    const response = await api.post('/api/auth/refresh')
    return response.data
  },

  /**
   * Change password (authenticated)
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/change-password', {
      currentPassword,
      newPassword
    })
    return response.data
  }
}