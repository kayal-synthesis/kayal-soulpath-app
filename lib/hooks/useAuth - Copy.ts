'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  dob?: string
  createdAt: string
  membership?: 'free' | 'premium' | 'vip'
}

interface AuthReturn {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string, userData?: any) => Promise<any>
  logout: () => Promise<void>
  transferAnonymousData: (userId: string, data: any) => Promise<void>
}

export const useAuth = (): AuthReturn => {
  const router = useRouter()
  const { user: anonymousUser, clearAnonymousUser } = useAnonymousStore()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check localStorage first
        const storedUser = localStorage.getItem('kayal_user')
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        } else {
          // Verify with server
          const response = await fetch('/api/auth/session')
          if (response.ok) {
            const sessionData = await response.json()
            if (sessionData.user) {
              setUser(sessionData.user)
              localStorage.setItem('kayal_user', JSON.stringify(sessionData.user))
            }
          }
        }
      } catch (error) {
        console.error('Failed to check session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Login failed')
        return false
      }

      const userData = await response.json()
      setUser(userData)
      localStorage.setItem('kayal_user', JSON.stringify(userData))
      
      // Transfer anonymous data if exists
      if (anonymousUser) {
        await transferAnonymousData(userData.id, anonymousUser)
        clearAnonymousUser()
      }
      
      toast.success('Welcome back!')
      return true
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Login failed. Please try again.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Sign up function
  const signUp = async (email: string, password: string, userData?: any): Promise<any> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password,
          name: userData?.name,
          dob: userData?.dob,
          ...userData?.onboardingData 
        })
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Registration failed')
        return null
      }

      const newUser = await response.json()
      setUser(newUser)
      localStorage.setItem('kayal_user', JSON.stringify(newUser))
      
      toast.success('Account created successfully!')
      return newUser
    } catch (error) {
      console.error('Signup error:', error)
      toast.error('Failed to create account')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      localStorage.removeItem('kayal_user')
      toast.success('Logged out successfully')
      router.push('/')
    }
  }

  // Transfer anonymous data to user account
  const transferAnonymousData = async (userId: string, data: any): Promise<void> => {
    try {
      await fetch('/api/user/transfer-anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, anonymousData: data })
      })
    } catch (error) {
      console.error('Failed to transfer anonymous data:', error)
    }
  }

  // Add purchase to user account
  const addPurchase = async (userId: string, toolId: string, images?: any): Promise<boolean> => {
    try {
      const response = await fetch('/api/user/add-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          toolId,
          images,
          purchaseDate: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add purchase')
      }

      return true
    } catch (error) {
      console.error('Failed to add purchase:', error)
      return false
    }
  }

  // Join referral community
  const joinReferral = async (userId: string, data: any): Promise<boolean> => {
    try {
      const response = await fetch('/api/referral/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data })
      })

      if (!response.ok) {
        throw new Error('Failed to join referral')
      }

      return true
    } catch (error) {
      console.error('Failed to join referral:', error)
      return false
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signUp,
    logout,
    transferAnonymousData,
    // Additional helper functions (not in return type but useful)
    // You can add these to the return type if needed
  }
}

// Optional: Export additional helpers
export const useAuthHelpers = () => {
  const { user } = useAuth()
  
  const addPurchase = async (toolId: string, images?: any) => {
    if (!user) return false
    
    try {
      const response = await fetch('/api/user/add-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          toolId,
          images,
          purchaseDate: new Date().toISOString()
        })
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  const joinReferral = async (data: any) => {
    if (!user) return false
    
    try {
      const response = await fetch('/api/referral/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...data })
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  return { addPurchase, joinReferral }
}