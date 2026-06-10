import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AnonymousUser {
  sessionId: string
  name: string
  dob: string
  birthTime?: string
  birthLocation?: string
  email?: string
  receiveUpdates?: boolean
  firstVisit: Date
  lastVisit: Date
  visitCount: number
  viewedTools: string[]
}

interface AnonymousStore {
  user: AnonymousUser | null
  hasSeenWelcomeModal: boolean
  setAnonymousUser: (user: AnonymousUser) => void
  setUserEmail: (email: string, receiveUpdates: boolean) => void
  clearAnonymousUser: () => void
  setHasSeenWelcomeModal: (value: boolean) => void
  hasCompletedOnboarding: () => boolean
}

export const useAnonymousStore = create<AnonymousStore>()(
  persist(
    (set, get) => ({
      user: null,
      hasSeenWelcomeModal: false,
      
      setAnonymousUser: (user) => set({ user }),
      
      setUserEmail: (email, receiveUpdates) => set((state) => ({
        user: state.user ? { 
          ...state.user, 
          email, 
          receiveUpdates 
        } : null
      })),
      
      clearAnonymousUser: () => set({ user: null, hasSeenWelcomeModal: false }),
      
      setHasSeenWelcomeModal: (value) => set({ hasSeenWelcomeModal: value }),
      
      hasCompletedOnboarding: () => {
        const { user } = get()
        return !!user
      }
    }),
    {
      name: 'anonymous-storage'
    }
  )
)