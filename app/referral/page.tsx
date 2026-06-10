'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useReferralAuth } from '@/lib/hooks/useReferralAuth'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Gift, Copy, Check, Share2, Users, DollarSign,
  TrendingUp, Clock, Globe, Award, BarChart,
  LogOut, Settings, HelpCircle, MessageCircle,
  Sparkles, ArrowRight, ShoppingBag, User,
  Calendar, Download, Filter, ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

interface ReferralData {
  id: string
  name: string
  email: string
  referralCode: string
  joinDate: string
  source: 'anonymous' | 'post-purchase' | 'direct'
  linkedPaidAccount?: string
  stats: {
    totalClicks: number
    totalConversions: number
    totalEarnings: number
    pendingCommissions: number
    conversionRate: number
    rank: number
  }
  recentReferrals: Array<{
    id: string
    name: string
    date: string
    amount: number
    status: 'pending' | 'paid'
  }>
  payoutHistory: Array<{
    id: string
    date: string
    amount: number
    method: string
  }>
  referralLink: string
}

export default function ReferralDashboard() {
  const router = useRouter()
  const { user, logout, getStats } = useReferralAuth()
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Mock data - replace with real API calls
  const [referralData, setReferralData] = useState<ReferralData>({
    id: 'ref_123456',
    name: user?.name || 'Sarah Chen',
    email: user?.email || 'sarah@example.com',
    referralCode: user?.referralCode || 'SARAH123',
    joinDate: 'Jan 15, 2026',
    source: 'anonymous',
    linkedPaidAccount: 'usr_789012',
    stats: {
      totalClicks: 1247,
      totalConversions: 47,
      totalEarnings: 2350,
      pendingCommissions: 350,
      conversionRate: 3.8,
      rank: 42
    },
    recentReferrals: [
      { id: 'r1', name: 'John Smith', date: 'Mar 1, 2026', amount: 50, status: 'paid' },
      { id: 'r2', name: 'Emma Watson', date: 'Feb 28, 2026', amount: 50, status: 'paid' },
      { id: 'r3', name: 'Michael Chen', date: 'Feb 27, 2026', amount: 50, status: 'pending' }
    ],
    payoutHistory: [
      { id: 'p1', date: 'Feb 15, 2026', amount: 250, method: 'PayPal' },
      { id: 'p2', date: 'Jan 15, 2026', amount: 200, method: 'Bank Transfer' }
    ],
    referralLink: `https://kayal.life/ref/${user?.referralCode || 'SARAH123'}`
  })

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      if (user) {
        const stats = await getStats()
        if (stats) {
          setReferralData(prev => ({ ...prev, stats }))
        }
      }
      setTimeout(() => setIsLoading(false), 1000)
    }
    loadData()
  }, [user, getStats])

  const handleCopy = () => {
    navigator.clipboard.writeText(referralData.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Link copied to clipboard!')
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto mb-4" />
          <p className="text-neutral-600">Loading your referral dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-primary-600" />
              <span className="font-serif text-xl">Referral Community</span>
              <Badge variant="primary" size="sm">
                Rank #{referralData.stats.rank}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-neutral-100 rounded-lg">
                <Settings className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 pl-2 border-l">
                <span className="text-sm font-medium">{referralData.name}</span>
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  {referralData.name.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Show if they came from anonymous origin */}
      {referralData.source === 'anonymous' && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <Card className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6" />
                <div>
                  <h3 className="font-semibold">Ready to start your journey?</h3>
                  <p className="text-sm text-white/90">
                    Use your referral link to purchase tools and begin your spiritual journey!
                  </p>
                </div>
              </div>
              <Button 
                variant="secondary"
                onClick={() => router.push('/domain/voice-of-prophecy')}
                className="bg-white text-amber-700 hover:bg-amber-50"
              >
                Browse Tools
                <ShoppingBag className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-neutral-500">Total Earnings</p>
                <p className="text-2xl font-bold text-primary-600">${referralData.stats.totalEarnings}</p>
              </div>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-neutral-500">Conversions</p>
                <p className="text-2xl font-bold">{referralData.stats.totalConversions}</p>
              </div>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-neutral-500">Conversion Rate</p>
                <p className="text-2xl font-bold">{referralData.stats.conversionRate}%</p>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-neutral-500">Pending</p>
                <p className="text-2xl font-bold">${referralData.stats.pendingCommissions}</p>
              </div>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b overflow-x-auto pb-1">
          {['overview', 'referrals', 'payouts', 'resources'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Promotion Tools */}
            <div className="lg:col-span-2 space-y-6">
              {/* Referral Link */}
              <Card className="p-5">
                <h3 className="text-sm font-medium mb-3">Your Referral Link</h3>
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 bg-neutral-50 border rounded-lg px-3 py-2 text-sm truncate">
                    {referralData.referralLink}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Globe className="w-4 h-4 mr-2" />
                    Marketing Kit
                  </Button>
                </div>
              </Card>

              {/* Recent Referrals */}
              <Card className="p-5">
                <h3 className="text-sm font-medium mb-3">Recent Referrals</h3>
                <div className="space-y-3">
                  {referralData.recentReferrals.map(ref => (
                    <div key={ref.id} className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{ref.name}</p>
                        <p className="text-xs text-neutral-500">{formatDate(ref.date)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-primary-600">${ref.amount}</span>
                        <Badge variant={ref.status === 'paid' ? 'primary' : 'secondary'} size="sm">
                          {ref.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column - Payout Info */}
            <div className="space-y-6">
              {/* Pending Commissions */}
              <Card className="p-5 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
                <h3 className="text-sm font-medium mb-2">Pending Commissions</h3>
                <p className="text-3xl font-bold mb-1">${referralData.stats.pendingCommissions}</p>
                <p className="text-xs text-primary-100 mb-3">Will be available after 30 days</p>
                <Button variant="secondary" fullWidth className="bg-white text-primary-700">
                  Request Payout
                </Button>
              </Card>

              {/* Payout History */}
              <Card className="p-5">
                <h3 className="text-sm font-medium mb-3">Payout History</h3>
                <div className="space-y-2">
                  {referralData.payoutHistory.map(payout => (
                    <div key={payout.id} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-600">{formatDate(payout.date)}</span>
                      <span className="font-medium">${payout.amount}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Support */}
              <Card className="p-4 bg-neutral-50">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-neutral-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Need help?</p>
                    <p className="text-xs text-neutral-500">referral@kayal.com</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <Card className="p-5">
            <h3 className="text-lg font-serif mb-4">All Referrals</h3>
            <div className="space-y-3">
              {referralData.recentReferrals.map(ref => (
                <div key={ref.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{ref.name}</p>
                    <p className="text-xs text-neutral-500">Referred on {formatDate(ref.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-600">${ref.amount}</p>
                    <Badge variant={ref.status === 'paid' ? 'primary' : 'secondary'} size="sm">
                      {ref.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <Card className="p-5">
            <h3 className="text-lg font-serif mb-4">Payout History</h3>
            <div className="space-y-3">
              {referralData.payoutHistory.map(payout => (
                <div key={payout.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{formatDate(payout.date)}</p>
                    <p className="text-xs text-neutral-500">Via {payout.method}</p>
                  </div>
                  <p className="font-semibold text-primary-600">${payout.amount}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 text-center hover:shadow-md cursor-pointer">
              <Globe className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <h3 className="font-medium mb-1">Marketing Kit</h3>
              <p className="text-xs text-neutral-500">Banners, emails, and tips</p>
            </Card>
            <Card className="p-5 text-center hover:shadow-md cursor-pointer">
              <Users className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <h3 className="font-medium mb-1">Top Referrers</h3>
              <p className="text-xs text-neutral-500">Leaderboard and tips</p>
            </Card>
            <Card className="p-5 text-center hover:shadow-md cursor-pointer">
              <HelpCircle className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <h3 className="font-medium mb-1">Help Center</h3>
              <p className="text-xs text-neutral-500">FAQs and support</p>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}