'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useReferralStore } from '@/lib/store/referralStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { 
  Copy, 
  Check, 
  Share2, 
  Users, 
  Gift, 
  DollarSign, 
  Calendar,
  TrendingUp,
  Lock,
  Unlock,
  Clock,
  Award
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

interface ReferralLinkProps {
  userId?: string
  username?: string
}

export const ReferralLink = ({ userId, username }: ReferralLinkProps) => {
  const { data: session } = useSession()
  const { 
    pendingCommission, 
    totalEarnings, 
    qualifiedReferrals,
    lastPayout,
    nextPayoutDate,
    addQualifiedReferral,
    updateEarnings,
    resetPayoutCycle
  } = useReferralStore()
  
  const [copied, setCopied] = useState(false)
  const [referrals, setReferrals] = useState<any[]>([])
  const [stats, setStats] = useState({
    clicks: 0,
    signups: 0,
    purchases: 0,
    qualified: 0
  })
  const [loading, setLoading] = useState(false)

  // For anonymous users, generate temporary code
  const anonymousCode = typeof window !== 'undefined' 
    ? localStorage.getItem('anonymous_ref_code') 
    : null
  
  const referralCode = userId 
    ? `${userId}-${generateCode(username)}` 
    : anonymousCode || generateTempCode()

  const referralLink = `https://affiliate.kayalsoulpath.com/r/${referralCode}`

  useEffect(() => {
    if (userId) {
      fetchReferralStats()
    }
  }, [userId])

  const fetchReferralStats = async () => {
    try {
      const response = await api.get(`/api/referral/stats?userId=${userId}`)
      setStats(response.data)
      setReferrals(response.data.referrals)
    } catch (error) {
      console.error('Failed to fetch referral stats')
    }
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `✨ Discover your true self with Kayal LifeOS!\n\n` +
      `I've been using their daily insights and they're amazing.\n\n` +
      `Use my link to get started: ${referralLink}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const canWithdraw = qualifiedReferrals >= 5 && pendingCommission > 0
  const progressToNextTier = Math.min((qualifiedReferrals / 5) * 100, 100)

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-medium">Your Referral Program</h2>
        </div>
        {userId ? (
          <div className="flex items-center gap-2 text-sm">
            <Award className="w-4 h-4 text-secondary-500" />
            <span>Tier {getTier(qualifiedReferrals)}</span>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/register?ref=' + referralCode}
          >
            Register to Earn
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Clicks"
          value={stats.clicks}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Signups"
          value={stats.signups}
          color="green"
        />
        <StatCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Purchases"
          value={stats.purchases}
          color="purple"
        />
        <StatCard
          icon={<Award className="w-4 h-4" />}
          label="Qualified"
          value={qualifiedReferrals}
          color="amber"
        />
      </div>

      {/* Progress to Threshold */}
      {userId && qualifiedReferrals < 5 && (
        <div className="mb-6 p-4 bg-amber-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">
                Need {5 - qualifiedReferrals} more purchases to unlock commissions
              </span>
            </div>
            <span className="text-xs text-amber-600">
              {qualifiedReferrals}/5
            </span>
          </div>
          <ProgressBar value={qualifiedReferrals} max={5} color="warning" size="sm" />
        </div>
      )}

      {/* Earnings Card */}
      {userId && (
        <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-neutral-600">Pending Commission</span>
            <span className="text-xl font-serif text-primary-600">
              ${pendingCommission.toFixed(2)}
            </span>
          </div>
          
          {canWithdraw ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Unlock className="w-4 h-4" />
                <span>✓ Commission unlocked! Ready for payout</span>
              </div>
              <Button 
                fullWidth 
                onClick={() => handleWithdraw()}
                loading={loading}
              >
                Withdraw Earnings
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="w-4 h-4" />
                <span>Need {5 - qualifiedReferrals} more qualified referrals</span>
              </div>
              {lastPayout && (
                <p className="text-xs text-neutral-500">
                  Last payout: {new Date(lastPayout).toLocaleDateString()}
                </p>
              )}
              {nextPayoutDate && (
                <p className="text-xs text-neutral-500">
                  Next payout: {new Date(nextPayoutDate).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Referral Link */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">
          Your Referral Link
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="w-full px-3 py-2 bg-neutral-50 border rounded-lg text-sm pr-10"
            />
            <button
              onClick={copyLink}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-neutral-200 rounded transition"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <Button variant="secondary" onClick={shareViaWhatsApp}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="mt-4 text-xs text-neutral-500">
        <p>• Commission unlocks after 5 qualified purchases</p>
        <p>• Payouts processed every 15 days</p>
        <p>• 7-day holding period for first payout</p>
        <p>• Commission rates: 10% (5-20), 15% (21-50), 20% (51+)</p>
      </div>
    </Card>
  )
}

const StatCard = ({ icon, label, value, color }: any) => (
  <div className="p-3 bg-neutral-50 rounded-lg">
    <div className={`flex items-center gap-1 text-${color}-600 mb-1`}>
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <p className="text-lg font-medium">{value}</p>
  </div>
)

function generateCode(username?: string): string {
  const random = Math.random().toString(36).substring(2, 8)
  return username ? `${username}-${random}` : random
}

function generateTempCode(): string {
  return 'temp-' + Math.random().toString(36).substring(2, 10)
}

function getTier(referrals: number): string {
  if (referrals >= 51) return '3'
  if (referrals >= 21) return '2'
  if (referrals >= 5) return '1'
  return '0'
}

async function handleWithdraw() {
  // Implement withdrawal logic
  toast.success('Withdrawal request submitted')
}
