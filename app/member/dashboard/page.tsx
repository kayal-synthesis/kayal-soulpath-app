 'use client'
import { Suspense } from 'react'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CancellationModal } from '@/components/subscription/CancellationModal'
import { 
  ArrowLeft,
  User,
  Heart,
  Briefcase,
  TrendingUp,
  Moon,
  Zap,
  Star,
  Crown,
  Clock,
  Headphones,
  Infinity,
  Mic,
  BookOpen,
  MessageCircle,
  Eye,
  FileText,
  Calendar,
  AlertCircle,
  ChevronRight,
  Gift,
  Users,
  Settings,
  LogOut,
  Loader2,
  CheckCircle,
  Sparkles,
  CreditCard,
  RefreshCw,
  Camera
} from 'lucide-react'
import { RightWidgetSidebar } from '@/components/dashboard/RightWidgetSidebar'

// Types for purchased tools
interface PurchasedTool {
  id: string
  tool_id: string
  tool_name: string
  tool_type: 'report' | 'chat' | 'reading' | 'audio'
  category: string
  destination?: 'report' | 'chat' | 'reading' | 'audio'
  price: number
  original_price?: number
  coupon_id?: string
  emoji?: string
  purchase_date: string
  expires_at?: string
  images?: Record<string, string>
  status: 'active' | 'pending' | 'expired' | 'cancelled'
  created_at: string
  auto_renew?: boolean
  job_id?: string
}

// Domain destinations (fallback if not in purchase)
const domainDestinations: Record<string, string> = {
  'voice': 'audio',
  'oracle-temple': 'report',
  'time-keeper': 'reading',
  'love': 'report',
  'career': 'report',
  'wealth': 'report',
  'spiritual': 'report',
  'health': 'report',
  'life-path': 'report',
  'sacred-script': 'chat'
}

// Define which tool types are subscriptions
const SUBSCRIPTION_TYPES = ['chat', 'reading', 'audio']

// Helper: get device ID (for guest)
const getDeviceId = () => {
  if (typeof window === 'undefined') return ''
  let deviceId = localStorage.getItem('kayal_device_id')
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('kayal_device_id', deviceId)
  }
  return deviceId
}

// ── FIX 1: Calculate real Personal Day from DOB + today ──────────────────────
function getPersonalDay(dob: string): number {
  const today = new Date()
  const born  = new Date(dob)

  const sum =
    today.getDate()          +
    (today.getMonth() + 1)   +   // getMonth() is 0-indexed
    born.getDate()           +
    (born.getMonth() + 1)    +
    born.getFullYear()           // use full birth year, not current year

  // Reduce to single digit 1–9
  let n = sum
  while (n > 9) {
    n = String(n).split('').reduce((a, d) => a + Number(d), 0)
  }
  return n || 9
}

function MemberDashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [user, setUser] = useState<any>(null)
  const [purchases, setPurchases] = useState<PurchasedTool[]>([])
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'reports' | 'interactive'>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [userContext, setUserContext] = useState<any>(null)
  
  const [cancellingTool, setCancellingTool] = useState<PurchasedTool | null>(null)

  const [jobStatuses, setJobStatuses] = useState<Record<string, { status: string, content?: any }>>({})
  const [pollingIntervals, setPollingIntervals] = useState<Record<string, NodeJS.Timeout>>({})

  // ✅ Updated: poll the correct endpoint /api/reading/result/[jobId]
  const startPolling = useCallback((jobId: string) => {
    if (pollingIntervals[jobId]) return
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/reading/result/${jobId}`)
        const data = await response.json()
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval)
          setPollingIntervals(prev => {
            const newIntervals = { ...prev }
            delete newIntervals[jobId]
            return newIntervals
          })
        }
        setJobStatuses(prev => ({
          ...prev,
          [jobId]: { status: data.status, content: data.content }
        }))
      } catch (err) {
        console.error(`Error polling job ${jobId}:`, err)
      }
    }, 3000)
    setPollingIntervals(prev => ({ ...prev, [jobId]: interval }))
  }, [pollingIntervals])

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        if (user) {
          console.log('✅ User authenticated:', user.id)
          await fetchPurchases(user.id)
          await fetchUserContext(user.id)
        } else {
          console.log('❌ No user found')
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth error:', error)
      } finally {
        setAuthLoading(false)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        fetchPurchases(session.user.id)
        fetchUserContext(session.user.id)
      } else {
        setPurchases([])
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals).forEach(interval => clearInterval(interval))
    }
  }, [pollingIntervals])

  // Handle pending job from URL query parameter
  useEffect(() => {
    const pendingJobId = searchParams.get('pending')
    if (pendingJobId && !jobStatuses[pendingJobId]) {
      startPolling(pendingJobId)
    }
  }, [searchParams, jobStatuses, startPolling])

  const fetchPurchases = async (userId: string) => {
    try {
      setLoading(true)
      console.log('📡 Fetching purchases for user:', userId)

      // purchases table — try user_id (Supabase auth UUID)
      let { data: purchases, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Supabase error:', error)
        return
      }
      console.log(`✅ Found ${purchases?.length || 0} purchases`)
      console.log('📋 Statuses present:', [...new Set((purchases || []).map((p: any) => p.status))])
      setPurchases(purchases || [])
      purchases?.forEach(tool => {
        if (tool.job_id && (tool.tool_type === 'report' || domainDestinations[tool.category] === 'report')) {
          if (!jobStatuses[tool.job_id]) {
            startPolling(tool.job_id)
          }
        }
      })
    } catch (error) {
      console.error('❌ Error fetching purchases:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchUserContext = async (userId: string) => {
    try {
      const { data: purchases } = await supabase
        .from('purchases')
        .select('price')
        .eq('user_id', userId)
      const totalSpent = purchases?.reduce((sum, p) => sum + (p.price || 0), 0) || 0

      // ── FIX 2: fetch token (PK), dob, birth_time, birth_location + affiliate_status ─
      // users table has id (uuid) — RLS auto-filters to current user
      // Select without filter relies on RLS; explicit .eq as fallback
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, name, affiliate_status, dob, birth_time, birth_location')
        .eq('id', userId)
        .maybeSingle()

      if (userError) console.warn('⚠ users query error:', userError.message, '— continuing without profile data')

      setUserContext({
        userId,
        // ── display name: prefer DB full_name, then metadata, then email ──
        name:            userData?.full_name
                         || userData?.name
                         || user?.user_metadata?.full_name
                         || user?.user_metadata?.name
                         || user?.email?.split('@')[0]
                         || 'Seeker',
        purchaseCount:   purchases?.length || 0,
        totalSpent,
        isAffiliate:     userData?.affiliate_status === 'active',
        // ── FIX 3: pass birth data so RightWidgetSidebar can calculate personalDay ──
        dob:             userData?.dob           || null,
        birthTime:       userData?.birth_time    || null,
        birthLocation:   userData?.birth_location || null,
        // ── pre-calculate personalDay so it is ready before RightWidgetSidebar mounts ─
        personalDay:     userData?.dob ? getPersonalDay(userData.dob) : 5,
      })
    } catch (error) {
      console.error('Error fetching user context:', error)
    }
  }

  const handleRefresh = async () => {
    if (!user) return
    setRefreshing(true)
    await fetchPurchases(user.id)
    await fetchUserContext(user.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleCancelSubscription = async (reason: string, feedback: string) => {
    if (!user || !cancellingTool) return
    const response = await fetch('/api/subscription/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        toolId: cancellingTool.tool_id,
        reason,
        feedback
      })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to cancel subscription')
    }
    await fetchPurchases(user.id)
  }

  const handleReactivate = async (toolId: string) => {
    if (!user) return
    const response = await fetch('/api/subscription/cancel', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        toolId
      })
    })
    if (response.ok) {
      await fetchPurchases(user.id)
    }
  }

  // Group purchases by type
  const groupedPurchases = {
    reports: purchases.filter(p => p.tool_type === 'report' || domainDestinations[p.category] === 'report'),
    chat: purchases.filter(p => p.tool_type === 'chat' || domainDestinations[p.category] === 'chat'),
    reading: purchases.filter(p => p.tool_type === 'reading' || domainDestinations[p.category] === 'reading'),
    audio: purchases.filter(p => p.tool_type === 'audio' || domainDestinations[p.category] === 'audio')
  }

  const getFilteredPurchases = () => {
    switch(activeTab) {
      case 'reports': return groupedPurchases.reports
      case 'interactive': return [...groupedPurchases.chat, ...groupedPurchases.reading, ...groupedPurchases.audio]
      default: return purchases
    }
  }

  const filteredPurchases = getFilteredPurchases()

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      'love': Heart,
      'career': Briefcase,
      'wealth': TrendingUp,
      'spiritual': Moon,
      'health': Zap,
      'life-path': Star,
      'oracle-temple': Crown,
      'time-keeper': Clock,
      'voice': Mic,
      'sacred-script': BookOpen,
      'universal': Infinity
    }
    return icons[category] || FileText
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'love': 'text-red-600 bg-red-50',
      'career': 'text-blue-600 bg-blue-50',
      'wealth': 'text-green-600 bg-green-50',
      'spiritual': 'text-purple-600 bg-purple-50',
      'health': 'text-yellow-600 bg-yellow-50',
      'life-path': 'text-amber-600 bg-amber-50',
      'oracle-temple': 'text-indigo-600 bg-indigo-50',
      'time-keeper': 'text-indigo-600 bg-indigo-50',
      'voice': 'text-purple-600 bg-purple-50',
      'sacred-script': 'text-amber-600 bg-amber-50'
    }
    return colors[category] || 'text-neutral-600 bg-neutral-50'
  }

  const getToolRoute = (tool: PurchasedTool) => {
    // Voice of Prophecy domain
    if (tool.tool_type === 'audio' || tool.category === 'voice') {
      return `/domain/voice-of-prophecy/${tool.tool_id}`
    }
    // Sacred Script domain
    if (tool.tool_type === 'chat' || tool.category === 'sacred-script') {
      return `/domain/sacred-script/${tool.tool_id}`
    }
    // Reports — include jobId if available
    if (tool.tool_type === 'report' || tool.destination === 'report' || domainDestinations[tool.category] === 'report') {
      return tool.job_id ? `/report/${tool.tool_id}?jobId=${tool.job_id}` : `/report/${tool.tool_id}`
    }
    // Reading tools
    if (tool.tool_type === 'reading' || tool.destination === 'reading') {
      return `/reading/${tool.tool_id}`
    }
    // Fallback
    const destination = tool.destination || domainDestinations[tool.category] || 'report'
    return tool.job_id ? `/${destination}/${tool.tool_id}?jobId=${tool.job_id}` : `/${destination}/${tool.tool_id}`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isSubscription = (tool: PurchasedTool) => {
    return SUBSCRIPTION_TYPES.includes(tool.tool_type)
  }

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false
    const expiry = new Date(expiresAt)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0
  }

  const getSavings = (tool: PurchasedTool) => {
    if (tool.original_price && tool.original_price > tool.price) {
      return tool.original_price - tool.price
    }
    return 0
  }

  const referralData = {
    clicks: purchases.length * 10 || 45,
    earnings: purchases.reduce((sum, p) => sum + (p.price * 0.15), 0) || 120,
    referrals: Math.floor(purchases.length / 2) || 3
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-neutral-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <User className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-2xl font-serif mb-4">Not Signed In</h2>
          <p className="text-neutral-600 mb-6">Please sign in to view your dashboard.</p>
          <Button onClick={() => router.push('/auth/login')}>Sign In</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-serif">Your Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleRefresh} disabled={refreshing} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors" title="Refresh purchases">
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">{user.email?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <div>
              <h2 className="text-2xl font-serif">Welcome back, {user.email?.split('@')[0] || 'Seeker'}!</h2>
              <p className="text-neutral-600">You have {purchases.length} purchased {purchases.length === 1 ? 'tool' : 'tools'}</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-2xl font-bold text-primary-600">{purchases.length}</p><p className="text-sm text-neutral-600">Total Tools</p></div>
                  <FileText className="w-8 h-8 text-primary-200" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-2xl font-bold text-green-600">{groupedPurchases.reports.length}</p><p className="text-sm text-neutral-600">PDF Reports</p></div>
                  <FileText className="w-8 h-8 text-green-200" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-2xl font-bold text-blue-600">{groupedPurchases.chat.length + groupedPurchases.reading.length + groupedPurchases.audio.length}</p><p className="text-sm text-neutral-600">Subscriptions</p></div>
                  <Clock className="w-8 h-8 text-blue-200" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-2xl font-bold text-purple-600">{purchases.filter(p => isSubscription(p)).length}</p><p className="text-sm text-neutral-600">Active Subs</p></div>
                  <CreditCard className="w-8 h-8 text-purple-200" />
                </div>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100'}`}>All Tools ({purchases.length})</button>
              <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'reports' ? 'bg-green-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100'}`}>PDF Reports ({groupedPurchases.reports.length})</button>
              <button onClick={() => setActiveTab('interactive')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'interactive' ? 'bg-blue-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100'}`}>Subscriptions ({groupedPurchases.chat.length + groupedPurchases.reading.length + groupedPurchases.audio.length})</button>
            </div>

            {/* Tools Grid */}
            {filteredPurchases.length === 0 ? (
              <Card className="text-center py-12">
                <Gift className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-xl font-serif mb-2">No Tools Yet</h3>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto">You haven't purchased any tools yet. Explore our domains and start your journey!</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button onClick={() => router.push('/domain/love-relationships')}>Love & Relationships</Button>
                  <Button variant="outline" onClick={() => router.push('/domain/wealth-career')}>Wealth & Career</Button>
                  <Button variant="outline" onClick={() => router.push('/domain/wellness-spirituality')}>Wellness & Spirituality</Button>
                  <Button variant="outline" onClick={() => router.push('/domain/life-path-destiny')}>Life Path & Destiny</Button>
                </div>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPurchases.map((tool, index) => {
                  const Icon = getCategoryIcon(tool.category)
                  const colorClass = getCategoryColor(tool.category)
                  const isReport = tool.tool_type === 'report' || domainDestinations[tool.category] === 'report'
                  const isSub = isSubscription(tool)
                  const isExpiring = isExpiringSoon(tool.expires_at)
                  const savings = getSavings(tool)

                  const jobId = tool.job_id
                  const jobStatus = jobId ? jobStatuses[jobId] : null
                  const isProcessing = jobStatus && (jobStatus.status === 'pending' || jobStatus.status === 'processing')
                  const isReady = jobStatus && jobStatus.status === 'completed'
                  const isFailed = jobStatus && jobStatus.status === 'failed'
                  
                  return (
                    <motion.div key={tool.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                      <Card className="h-full hover:shadow-xl transition-all group relative overflow-hidden">
                        {/* Status Badges */}
                        <div className="absolute top-0 right-0 flex flex-col gap-1 z-10">
                          {isExpiring && isSub && <div className="bg-amber-500 text-white px-3 py-1 rounded-bl-lg text-xs font-medium">Expiring Soon</div>}
                          {isReport && !isProcessing && !isReady && <div className="bg-green-500 text-white px-3 py-1 rounded-bl-lg text-xs font-medium flex items-center gap-1"><Infinity className="w-3 h-3" />Lifetime</div>}
                          {savings > 0 && <div className="bg-primary-500 text-white px-3 py-1 rounded-bl-lg text-xs font-medium">Saved ${savings.toFixed(2)}</div>}
                          {isProcessing && <div className="bg-blue-500 text-white px-3 py-1 rounded-bl-lg text-xs font-medium flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Processing</div>}
                          {isReady && <div className="bg-green-500 text-white px-3 py-1 rounded-bl-lg text-xs font-medium">Ready</div>}
                          {isFailed && <div className="bg-red-500 text-white px-3 py-1 rounded-bl-lg text-xs font-medium">Failed</div>}
                        </div>

                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${colorClass} group-hover:scale-110 transition-transform`}><Icon className="w-6 h-6" /></div>
                            <Badge variant="outline" className="capitalize">{tool.category || 'Universal'}</Badge>
                          </div>
                          <h3 className="text-lg font-medium mb-2 group-hover:text-primary-600 transition">{tool.tool_name}</h3>
                          <div className="flex items-center gap-2 mb-3">
                            {tool.destination === 'report' && <Badge variant="secondary" size="sm" className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF Report</Badge>}
                            {tool.destination === 'chat' && <Badge variant="secondary" size="sm" className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Live Chat<span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">Monthly</span></Badge>}
                            {tool.destination === 'reading' && <Badge variant="secondary" size="sm" className="flex items-center gap-1"><Eye className="w-3 h-3" /> Reading<span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1 rounded">Monthly</span></Badge>}
                            {tool.destination === 'audio' && <Badge variant="secondary" size="sm" className="flex items-center gap-1"><Headphones className="w-3 h-3" /> Voice Session<span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1 rounded">Monthly</span></Badge>}
                          </div>
                          {tool.original_price && tool.original_price > tool.price && <div className="flex items-center gap-2 text-xs mb-2"><span className="text-neutral-400 line-through">${tool.original_price}</span><span className="text-green-600 font-medium">${tool.price}</span><Badge variant="primary" size="sm">Coupon</Badge></div>}
                          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4"><Calendar className="w-3 h-3" />Purchased: {formatDate(tool.purchase_date)}</div>
                          {isSub && tool.expires_at && (
                            <div className={`text-xs mb-4 p-2 rounded-lg ${isExpiring ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                              {isExpiring ? <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>Expires {formatDate(tool.expires_at)}</span></div> : <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /><span>Active until {formatDate(tool.expires_at)}</span></div>}
                            </div>
                          )}
                          {tool.images && Object.keys(tool.images).length > 0 && (
                            <div className="flex gap-1 mb-4">{Object.entries(tool.images).map(([key]) => <div key={key} className="w-8 h-8 bg-neutral-100 rounded flex items-center justify-center" title={key}><Camera className="w-4 h-4 text-neutral-500" /></div>)}</div>
                          )}
                          <div className="pt-4 border-t">
                            {isReport ? (
                              isReady ? (
                                <Button onClick={() => router.push(getToolRoute(tool))} fullWidth className="group">
                                  <Eye className="w-4 h-4 mr-2" />View Report
                                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
                                </Button>
                              ) : isProcessing ? (
                                <Button disabled fullWidth variant="outline">
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...
                                </Button>
                              ) : isFailed ? (
                                <Button onClick={() => alert('This report failed to generate. Please contact support.')} fullWidth variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                                  <AlertCircle className="w-4 h-4 mr-2" />Failed – Contact Support
                                </Button>
                              ) : (
                                <Button onClick={() => router.push(getToolRoute(tool))} fullWidth className="group">
                                  <FileText className="w-4 h-4 mr-2" />View Report
                                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
                                </Button>
                              )
                            ) : isSub ? (
                              <div className="flex gap-2">
                                <Button onClick={() => router.push(getToolRoute(tool))} className="flex-1 group" size="sm">
                                  Access <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setCancellingTool(tool)} className="text-red-600 border-red-200 hover:bg-red-50">
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button onClick={() => router.push(getToolRoute(tool))} fullWidth className="group">
                                Access Tool <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-6">
            <RightWidgetSidebar referralData={referralData} userId={user?.id} userPurchases={purchases} dashboardType="member" userContext={userContext} />
          </div>
        </div>

        {/* Subscription Management Section */}
        {groupedPurchases.chat.length + groupedPurchases.reading.length + groupedPurchases.audio.length > 0 && (
          <Card className="mt-8 p-6 bg-gradient-to-r from-primary-50 to-transparent">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <CreditCard className="w-6 h-6 text-primary-600 mt-1" />
                <div>
                  <h3 className="font-medium text-lg mb-1">Manage Subscriptions</h3>
                  <p className="text-sm text-neutral-600 mb-4">View, upgrade, or cancel your active subscriptions</p>
                  <Button variant="outline" size="sm">Manage Subscriptions</Button>
                </div>
              </div>
              <Badge variant="primary" className="flex items-center gap-1">
                <Users className="w-3 h-3" />{groupedPurchases.chat.length + groupedPurchases.reading.length + groupedPurchases.audio.length} Active
              </Badge>
            </div>
          </Card>
        )}
      </div>

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={!!cancellingTool}
        onClose={() => setCancellingTool(null)}
        tool={cancellingTool ? {
          id: cancellingTool.tool_id,
          name: cancellingTool.tool_name,
          emoji: cancellingTool.emoji || '📦',
          expires_at: cancellingTool.expires_at || new Date().toISOString(),
          price: cancellingTool.price
        } : {
          id: '',
          name: '',
          emoji: '📦',
          expires_at: new Date().toISOString(),
          price: 0
        }}
        onConfirm={handleCancelSubscription}
      />
    </div>
  )
}

export default function MemberDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <MemberDashboardInner />
    </Suspense>
  )
}