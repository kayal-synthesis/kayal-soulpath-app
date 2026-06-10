'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Gift, Copy, Check, UserPlus, Users, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const AFFILIATE_BASE = 'https://affiliate.kayalsoulpath.com'
const COMMISSION_RATE = 15 // percent

interface ReferralTeaserProps {
  clicks?:   number
  earnings?: number
  referrals?: number
}

export const ReferralTeaser = ({
  clicks    = 0,
  earnings  = 0,
  referrals = 0,
}: ReferralTeaserProps) => {
  const router = useRouter()
  const { user: anonymousUser } = useAnonymousStore()
  const { user: authUser }      = useAuth()

  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [loadingCode,  setLoadingCode]  = useState(false)
  const [copied,       setCopied]       = useState(false)

  const isPaidMember = !!authUser
  const isAnonymous  = !authUser && !!anonymousUser

  // Fetch real referral code from DB — only for authenticated users
  useEffect(() => {
    if (!authUser?.id) return
    let cancelled = false
    setLoadingCode(true)
    const supabase = createClient()
    supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', authUser.id)
      .single()
      .then(({ data }) => {
        if (!cancelled && data?.code) setReferralCode(data.code)
      })
      .finally(() => { if (!cancelled) setLoadingCode(false) })
    return () => { cancelled = true }
  }, [authUser?.id])

  const referralLink = referralCode
    ? `${AFFILIATE_BASE}/ref/${referralCode}`
    : null

  const handleCopyLink = () => {
    if (!authUser) {
      toast.info('Create an account to get your referral link')
      router.push('/member/referral/register')
      return
    }
    if (!referralLink) {
      toast.error('Your referral link is not ready yet. Please try again.')
      return
    }
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Referral link copied!')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl shadow-lg p-5 text-white"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <Gift className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">Refer & Earn</h3>
          <p className="text-sm text-primary-100">
            {isPaidMember
              ? `Earn ${COMMISSION_RATE}% commission on every subscription`
              : isAnonymous
              ? 'Join free and start earning commission'
              : 'Create an account to start earning'}
          </p>
        </div>
      </div>

      {/* Stats — only shown to paid members with real data */}
      {isPaidMember && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white/10 rounded-lg p-2 text-center backdrop-blur-sm">
            <Users className="w-4 h-4 mx-auto mb-1 text-primary-200" />
            <p className="text-xl font-bold">{referrals}</p>
            <p className="text-xs text-primary-100">Referrals</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center backdrop-blur-sm">
            <Sparkles className="w-4 h-4 mx-auto mb-1 text-primary-200" />
            <p className="text-xl font-bold">${earnings.toFixed(0)}</p>
            <p className="text-xs text-primary-100">Earned</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center backdrop-blur-sm">
            <Users className="w-4 h-4 mx-auto mb-1 text-primary-200" />
            <p className="text-xl font-bold">{clicks}</p>
            <p className="text-xs text-primary-100">Clicks</p>
          </div>
        </div>
      )}

      {/* CTAs */}
      {isPaidMember ? (
        <>
          <div className="mb-3">
            <p className="text-xs text-primary-100 mb-2">Your referral link</p>
            {loadingCode ? (
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary-200" />
                <span className="text-sm text-primary-200">Loading your link…</span>
              </div>
            ) : referralLink ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm truncate backdrop-blur-sm">
                  {referralLink}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition"
                >
                  {copied
                    ? <Check className="w-5 h-5 text-green-300" />
                    : <Copy  className="w-5 h-5" />}
                </button>
              </div>
            ) : (
              <div className="bg-white/10 rounded-lg px-3 py-2 text-sm text-primary-200">
                No referral link found. Contact support.
              </div>
            )}
          </div>

          <button
            onClick={() => router.push('/member/referral/dashboard')}
            className="w-full bg-white text-primary-700 hover:bg-primary-50 text-sm font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 shadow-lg"
          >
            <UserPlus className="w-5 h-5" />
            View Referral Dashboard
          </button>

          <p className="text-xs text-center text-primary-100 mt-3">
            {COMMISSION_RATE}% of every subscription your referral purchases
          </p>
        </>

      ) : isAnonymous ? (
        <>
          <div className="bg-white/10 rounded-lg p-3 mb-3">
            <p className="text-xs text-primary-100 mb-1">✨ Quick join with your info</p>
            <p className="text-sm text-white font-medium">{anonymousUser?.name}</p>
            <p className="text-xs text-white/80">We'll use your onboarding data</p>
          </div>

          <button
            onClick={() => router.push('/member/referral/register')}
            className="w-full bg-white text-primary-700 hover:bg-primary-50 text-sm font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 shadow-lg"
          >
            <UserPlus className="w-5 h-5" />
            Create Referral Account
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-center text-primary-100 mt-3">
            Earn {COMMISSION_RATE}% commission on every subscription your referral purchases
          </p>
        </>

      ) : (
        <>
          <button
            onClick={() => router.push('/member/referral/register')}
            className="w-full bg-white text-primary-700 hover:bg-primary-50 text-sm font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 shadow-lg"
          >
            <Sparkles className="w-5 h-5" />
            Join the Affiliate Programme
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-center text-primary-100 mt-3">
            Earn {COMMISSION_RATE}% commission on every subscription your referral purchases
          </p>
        </>
      )}
    </motion.div>
  )
}
