import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ReferralClick {
  id: string
  referrerId: string
  clickedAt: Date
  converted: boolean
}

interface ReferralState {
  clickedReferral: string | null
  referrerId: string | null
  pendingCommission: number
  totalEarnings: number
  qualifiedReferrals: number
  lastPayout: Date | null
  nextPayoutDate: Date | null
  
  setClickedReferral: (code: string, referrerId: string) => void
  clearClickedReferral: () => void
  updateEarnings: (amount: number) => void
  addQualifiedReferral: () => void
  resetPayoutCycle: () => void
}

export const useReferralStore = create<ReferralState>()(
  persist(
    (set) => ({
      clickedReferral: null,
      referrerId: null,
      pendingCommission: 0,
      totalEarnings: 0,
      qualifiedReferrals: 0,
      lastPayout: null,
      nextPayoutDate: null,

      setClickedReferral: (code, referrerId) => set({ 
        clickedReferral: code, 
        referrerId 
      }),

      clearClickedReferral: () => set({ 
        clickedReferral: null, 
        referrerId: null 
      }),

      updateEarnings: (amount) => set((state) => ({
        pendingCommission: state.pendingCommission + amount,
        totalEarnings: state.totalEarnings + amount
      })),

      addQualifiedReferral: () => set((state) => ({
        qualifiedReferrals: state.qualifiedReferrals + 1
      })),

      resetPayoutCycle: () => set((state) => ({
        pendingCommission: 0,
        qualifiedReferrals: 0,
        lastPayout: new Date(),
        nextPayoutDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days
      }))
    }),
    {
      name: 'referral-storage'
    }
  )
)