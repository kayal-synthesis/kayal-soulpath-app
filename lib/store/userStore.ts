import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Define ALL interfaces OUTSIDE the store
export interface User {
  id: string
  name: string
  email: string
  username?: string
  avatar?: string
  createdAt: string
  role?: 'user' | 'admin' | 'superadmin'
  subscription?: {
    plan: 'free' | 'premium' | 'lifetime'
    expiresAt?: string
  }
  ipInfo?: {
    ip: string
    country: string
    city?: string
    region?: string
    firstSeen: Date
    lastSeen: Date
  }
}

export interface Onboarding {
  step: number
  name: string
  dob: string
  birthTime?: string
  birthLocation?: string
  handImage?: string | null
  faceImage?: string | null
  selectedPath?: 'basic' | 'hand' | 'face' | 'both' | null
  completed: boolean
}

export interface UserPreferences {
  toolCardView: 'compact' | 'grid' | 'list' | 'mobile'
  theme?: 'light' | 'dark' | 'system'
  notifications?: boolean
  emailUpdates?: boolean
}

interface UserState {
  // Data
  user: User | null
  token: string | null
  onboarding: Onboarding
  preferences: UserPreferences
  
  // UI State
  isLoading: boolean
  error: string | null
  
  // Actions
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  updateOnboarding: (data: Partial<Onboarding>) => void
  resetOnboarding: () => void
  updatePreferences: (prefs: Partial<UserPreferences>) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      token: null,
      isLoading: false,
      error: null,
      onboarding: {
        step: 1,
        name: '',
        dob: '',
        birthTime: '',
        birthLocation: '',
        handImage: null,
        faceImage: null,
        selectedPath: null,
        completed: false,
      },
      preferences: {
        toolCardView: 'compact',
        theme: 'system',
        notifications: true,
        emailUpdates: true,
      },
      
      // Actions
      setUser: (user) => set({ user }),
      
      setToken: (token) => set({ token }),
      
      updateOnboarding: (data) =>
        set((state) => ({
          onboarding: {
            ...state.onboarding,
            ...data,
            step: state.onboarding.step + 1,
          },
        })),
      
      resetOnboarding: () =>
        set({
          onboarding: {
            step: 1,
            name: '',
            dob: '',
            birthTime: '',
            birthLocation: '',
            handImage: null,
            faceImage: null,
            selectedPath: null,
            completed: false,
          },
        }),
      
      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...prefs,
          },
        })),
      
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('kayal-storage')
        }
        set({ 
          user: null, 
          token: null,
          onboarding: {
            step: 1,
            name: '',
            dob: '',
            birthTime: '',
            birthLocation: '',
            handImage: null,
            faceImage: null,
            selectedPath: null,
            completed: false,
          },
          preferences: {
            toolCardView: 'compact',
            theme: 'system',
            notifications: true,
            emailUpdates: true,
          },
        })
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
    }),
    {
      name: 'kayal-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        onboarding: state.onboarding,
        preferences: state.preferences,
      }),
    }
  )
)