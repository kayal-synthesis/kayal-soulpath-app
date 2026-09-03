'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import {
  COMMISSION_RATES,
  TIER_LABELS,
  TIER_SUBLABELS,
  PERFORMANCE_TIER_SALES_THRESHOLD,
  PERFORMANCE_TIER_WINDOW_DAYS,
  STRATEGIC_TIER_SALES_THRESHOLD,
  STRATEGIC_TIER_WINDOW_DAYS,
  STRATEGIC_TIER_LIFETIME_EARNINGS_USD,
  qualifiesForStrategicTier,
  FIRST_PAYOUT_POINTS_THRESHOLD,
  RECURRING_PAYOUT_MINIMUM,
  REFERRAL_BONUS_RATE,
  getTicketType,
  getPointsForSale,
  type CommissionTier,
} from '@/lib/affiliate/affiliate-commission'
import { 
  Gift, Copy, Check, Share2, Users, DollarSign,
  TrendingUp, Clock, Globe, Award, BarChart,
  Settings, HelpCircle, Loader2, RefreshCw, 
  ChevronRight, Calendar, Wallet, CreditCard, 
  Mail, Link2, Sparkles, Crown, Target, Zap, 
  Shield, Phone, Twitter, Facebook, Linkedin, 
  AlertCircle, Banknote, Eye, EyeOff, Download,
  Repeat, UserCheck, Plus, Trash2, Edit,
  MousePointer, Percent, Home, LayoutDashboard,
  Menu, X as CloseIcon, Camera, Flame, Star,
  Headphones, MessageCircle, BookOpen, Infinity,
  ArrowLeft, Search, Filter, Sparkle, Gem,
  Rocket, Compass, Scroll, Feather, BookMarked,
  FileText, Mic, Eye as EyeIcon, MessageSquare,
  LogOut, User, Bell, Moon, Sun, Lock,
  Key, RotateCcw, Play,
  Smartphone, Tablet, Laptop, DownloadIcon,
  FileTextIcon, UsersIcon, RepeatIcon, TrendingUpIcon,
  MousePointerIcon, Tag, PercentCircle, BadgePercent, ShoppingBag
} from 'lucide-react'

import { omniRelationshipTools }   from '@/lib/constants/omni-seer-relationships'
import { omniSelfPurposeTools }    from '@/lib/constants/omni-seer-self-purpose'
import { omniPhysicalTimingTools } from '@/lib/constants/omni-seer-physical-timing'
import { voiceTools } from '@/lib/constants/voice-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools } from '@/lib/constants/time-keeper-tools'
import { loveTools } from '@/lib/constants/love-tools'
import { wealthTools } from '@/lib/constants/wealth-tools'
import { wellnessTools } from '@/lib/constants/wellness-spiritual'
import { lifePathTools } from '@/lib/constants/life-path-tools'

const omniSeerTools = [...omniRelationshipTools, ...omniSelfPurposeTools, ...omniPhysicalTimingTools]

const getFeatureText = (feature: any): string => {
  if (typeof feature === 'string') {
    let text = feature.replace(/\*\*/g, '')
    if (text.includes(' - ')) text = text.split(' - ')[0]
    return text
  }
  if (feature && typeof feature === 'object') {
    return feature.title || feature.name || feature.description || '✓'
  }
  return '✓'
}

const domainDestinations: Record<string, string> = {
  'oracle-temple': 'report',
  'voice': 'audio',
  'sacred-script': 'chat',
  'time-keeper': 'reading',
  'love': 'report',
  'wealth': 'report',
  'spiritual': 'report',
  'life-path': 'report'
}

const domains = [
  {
    id: 'oracle-temple',
    name: 'Omni-Seer\'s Sanctum',
    icon: '👁️',
    color: 'from-purple-600 to-indigo-600',
    url: '/domain/omni-seer-sanctum',
    destination: 'report',
    tools: omniSeerTools,
    count: omniSeerTools.length,
    description: 'Ancient wisdom and divination tools for profound life insights. Connect with higher consciousness and receive guidance for your most important life decisions.'
  },
  {
    id: 'voice',
    name: 'Voice of Prophecy',
    icon: '🎙️',
    color: 'from-blue-600 to-cyan-600',
    url: '/domain/voice-of-prophecy',
    destination: 'audio',
    tools: voiceTools,
    count: voiceTools.length,
    description: 'Transformative voice analysis tools that reveal your true power. Unlock your potential as a speaker, singer, or communicator.'
  },
  {
    id: 'sacred-script',
    name: 'Sacred Script',
    icon: '📜',
    color: 'from-amber-600 to-orange-600',
    url: '/domain/sacred-script',
    destination: 'chat',
    tools: sacredScriptTools,
    count: sacredScriptTools.length,
    description: 'Sacred writing and manifestation tools for divine connection. Channel wisdom through sacred writing practices.'
  },
  {
    id: 'time-keeper',
    name: 'Eternal Clock',
    icon: '⏰',
    color: 'from-emerald-600 to-teal-600',
    url: '/domain/eternal-clock',
    destination: 'reading',
    tools: timeKeeperTools,
    count: timeKeeperTools.length,
    description: 'Temporal wisdom tools to understand your relationship with time. Understand your past, navigate your present, and shape your future.'
  },
  {
    id: 'love',
    name: 'Love & Relationships',
    icon: '💞',
    color: 'from-red-600 to-pink-600',
    url: '/domain/love-relationships',
    destination: 'report',
    tools: loveTools,
    count: loveTools.length,
    description: 'Deep relationship insights and romantic guidance. Understand soul connections, twin flame dynamics, and the true nature of your love life.'
  },
  {
    id: 'wealth',
    name: 'Wealth & Career',
    icon: '💰',
    color: 'from-green-600 to-emerald-600',
    url: '/domain/wealth-career',
    destination: 'report',
    tools: [...wealthTools],
    count: wealthTools?.length || 0,
    description: 'Abundance manifestation tools for financial freedom and career success. Unlock your wealth potential and attract prosperity.'
  },
  {
    id: 'spiritual',
    name: 'Wellness & Spirituality',
    icon: '🌙',
    color: 'from-violet-600 to-purple-600',
    url: '/domain/wellness-spirituality',
    destination: 'report',
    tools: [...wellnessTools],
    count: wellnessTools?.length || 0,
    description: 'Comprehensive spiritual growth and wellness tools for awakening. Explore chakra healing, energy work, and connect with your higher self.'
  },
  {
    id: 'life-path',
    name: 'Life Path & Destiny',
    icon: '🌟',
    color: 'from-amber-600 to-yellow-600',
    url: '/domain/life-path-destiny',
    destination: 'report',
    tools: lifePathTools,
    count: lifePathTools.length,
    description: 'Life purpose and destiny revelation tools. Discover why you\'re here and what you\'re meant to do.'
  },
  {
    id: 'free-tools',
    name: 'Free Tools',
    icon: '🎁',
    color: 'from-teal-600 to-emerald-600',
    url: '/domain/free-tools',
    destination: 'free',
    tools: [
      { id: 'life-blueprint',      name: 'Life Blueprint',          emoji: '🔢' },
      { id: 'face-reader',         name: 'Face Energy Reader',      emoji: '👁️' },
      { id: 'hand-map',            name: 'Hand Map Reader',         emoji: '🤚' },
      { id: 'body-energy',         name: 'Vitality Blueprint',      emoji: '🔥' },
      { id: 'compatibility',       name: 'Compatibility Blueprint', emoji: '💞' },
      { id: 'environment-pattern', name: 'Environment Blueprint',   emoji: '🌍' },
      { id: 'name-vibration',      name: 'Name Vibration Reader',   emoji: '✨' },
      { id: 'soul-timing',         name: 'Soul Timing Window',      emoji: '🌙' },
      { id: 'universal-day',       name: 'Universal Day Reading',   emoji: '📅' },
    ],
    count: 9,
    description: 'Free, no-signup tools that reveal a genuine slice of someone\'s real blueprint, the natural, low-friction entry point for anyone who isn\'t ready to buy yet.'
  }
]

const overallStats = {
  totalTools: domains.reduce((sum, d) => sum + d.tools.length, 0),
  totalDomains: domains.length
}

interface AffiliateStats {
  totalClicks: number
  uniqueVisitors: number
  totalConversions: number
  conversionRate: number
  totalEarnings: number
  pendingCommissions: number
  paidCommissions: number
  lifetimeValue: number
  averageOrderValue: number
  recurringRevenue: number
  rank: number
  percentile: number
}

interface AffiliateLink {
  id: string
  name: string
  toolId: string
  toolName: string
  toolEmoji: string
  domainId: string
  domainName: string
  url: string
  shortUrl: string
  createdAt: string
  clicks: number
  uniqueClicks: number
  conversions: number
  earnings: number
  conversionRate: number
  status: 'active' | 'paused'
}

interface AffiliateData {
  id: string
  name: string
  email: string
  referralCode: string
  joinDate: string
  status: 'active' | 'suspended' | 'pending'
  tier: CommissionTier
  accountType: 'affiliate' | 'customer_advocate'
  avatar?: string
  preferences: {
    darkMode: boolean
    emailNotifications: boolean
    pushNotifications: boolean
    currency: 'USD' | 'EUR' | 'GBP'
    timezone: string
  }
  stats: AffiliateStats
  monthlyStats: {
    month: string
    clicks: number
    conversions: number
    earnings: number
  }[]
  links: AffiliateLink[]
  commissionRates: {
    low: number
    high: number
  }
  // Real, confirmed fields from users, not the previous mocked
  // bank/paypal/crypto sub-objects, none of which matched the real,
  // live schema at all.
  paymentMethods: {
    payoutMethod?:   string
    bankName?:       string
    accountLast4?:   string
    payoutCurrency?: string
    // Real, full values, needed to genuinely pre-fill the real
    // payment-details form, not just the masked, display-only
    // fields above.
    accountName?:    string
    accountNumber?:  string
    swiftCode?:      string
    paypalEmail?:    string
  }
  // Real, new Stripe Connect state, separate from paymentMethods
  // above, since this is about onboarding status, not display data,
  // stripeConnectOnboarded only ever becomes true once the real
  // webhook confirms it, not the moment an account is merely created.
  stripeConnect: {
    accountId?: string
    onboarded:  boolean
  }
  // Real, points-based first-payout progress, replacing the previous
  // fabricated lifetime-dollar milestone system, matches the real
  // rules agreed and confirmed tonight, no dollar minimum on the
  // first payout, a real 5-point threshold instead.
  firstPayoutProgress: {
    activated:     boolean
    pointsEarned:  number
    pointsNeeded:  number
  }
  topTools: {
    toolId: string
    toolName: string
    toolEmoji: string
    clicks: number
    conversions: number
    earnings: number
    conversionRate: number
  }[]
  recentConversions: {
    id: string
    customerEmail: string
    toolName: string
    amount: number
    commission: number
    date: string
    status: 'pending' | 'paid'
    isReferralBonus: boolean
  }[]
  notifications: Notification[]
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'payout'
  read: boolean
  time: string
}

interface AffiliateCoupon {
  id: string
  code: string
  discount: number
  description: string
  tools: string[]
  expiresAt?: string
  usageCount: number
  maxUses: number
  earnings: number
}

const getToolTypeInfo = (domainId: string) => {
  switch(domainId) {
    case 'voice':
      return { 
        icon: Headphones, 
        label: 'Audio Session', 
        color: 'text-blue-600 bg-blue-50',
        destination: '/audio/[toolId]'
      }
    case 'sacred-script':
      return { 
        icon: MessageCircle, 
        label: 'Chat Session', 
        color: 'text-purple-600 bg-purple-50',
        destination: '/chat/[toolId]',
        isSubscription: true 
      }
    case 'time-keeper':
      return { 
        icon: EyeIcon, 
        label: 'Reading', 
        color: 'text-amber-600 bg-amber-50',
        destination: '/reading/[toolId]'
      }
    default:
      return { 
        icon: FileText, 
        label: 'PDF Report', 
        color: 'text-green-600 bg-green-50',
        destination: '/report/[toolId]'
      }
  }
}

function VideoEmbed({ url, label = 'Watch overview' }: { url: string; label?: string }) {
  const getSrc = (raw: string) => {
    const yt = raw.match(/youtu\.be\/([^?&]+)/) || raw.match(/[?&]v=([^&]+)/) || raw.match(/embed\/([^?&]+)/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`
    const vimeo = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/)
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?title=0&byline=0`
    return raw
  }
  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#1c1917' }}>
      <iframe
        src={getSrc(url)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        title={label}
        loading="lazy"
      />
    </div>
  )
}

export default function AffiliateDashboard() {
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'analytics' | 'payouts' | 'settings'>('overview')
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ bankName: '', accountName: '', accountNumber: '', swiftCode: '', paypalEmail: '' })
  const [savingPayment, setSavingPayment] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  // Real, new state for Stripe Connect onboarding, country is
  // required up front, see connect-stripe/route.ts's own comment for
  // why it can't be deferred to Stripe's hosted flow.
  const [connectCountry, setConnectCountry] = useState('')
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showBalance, setShowBalance] = useState(false)
  const [selectedLink, setSelectedLink] = useState<AffiliateLink | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [affiliateCoupons, setAffiliateCoupons] = useState<AffiliateCoupon[]>([])
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<AffiliateCoupon | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'domains' | 'tools'>('domains')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'popular'>('popular')
  const [filteredTools, setFilteredTools] = useState<any[]>([])

  const [newLink, setNewLink] = useState({
    name: '',
    toolId: '',
    domainId: '',
    campaign: '',
    source: '',
    medium: '',
    tags: [] as string[],
    type: 'tool_specific' as 'general' | 'tool_specific' | 'campaign'
  })

  const AFFILIATE_EXPLAINER_VIDEO_URL = ''

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/member/referral/login')
          return
        }

        setUser(user)
        await fetchAffiliateData(user.id)
        await fetchAffiliateCoupons(user.id)
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const fetchAffiliateCoupons = async (userId: string) => {
    try {
      const mockCoupons: AffiliateCoupon[] = [
        {
          id: 'c1',
          code: `AFF${userId.slice(0, 4).toUpperCase()}20`,
          discount: 20,
          description: 'Share with your audience - 20% off any tool',
          tools: [],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          usageCount: 3,
          maxUses: 50,
          earnings: 124.50
        },
        {
          id: 'c2',
          code: `BUNDLE${userId.slice(0, 4).toUpperCase()}`,
          discount: 25,
          description: '25% off when you refer a bundle purchase',
          tools: ['wealth-master', 'career-path', 'love-saga'],
          usageCount: 1,
          maxUses: 25,
          earnings: 67.50
        }
      ]
      setAffiliateCoupons(mockCoupons)
    } catch (error) {
      console.error('Error fetching affiliate coupons:', error)
    }
  }

  useEffect(() => {
    if (selectedDomain && selectedDomain.tools) {
      const filtered = selectedDomain.tools.filter((tool: any) => 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tool.description && tool.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tool.subtitle && tool.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      
      const sorted = filtered.sort((a: any, b: any) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'price') return a.price - b.price
        return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0)
      })
      
      setFilteredTools(sorted)
    } else {
      setFilteredTools([])
    }
  }, [selectedDomain, searchQuery, sortBy])

  // Real, small helper, needed for the real notifications fetch
  // below, matching the same pattern already used elsewhere tonight.
  const getNotificationTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    if (h < 24) return `${h}h ago`
    if (d < 7) return `${d}d ago`
    return new Date(iso).toLocaleDateString()
  }

  const fetchAffiliateData = async (userId: string) => {
    try {
      setRefreshing(true)

      // Real, confirmed source of truth, users, not affiliate_profiles.
      // The comment this replaced was itself written before tonight's
      // later, real, live schema checks, the trigger that creates
      // every real account, and the credit_commission function every
      // real sale actually runs through, both confirmed directly
      // against users, not affiliate_profiles, which has zero rows,
      // ever. This dashboard was reading a real, correctly-shaped
      // table that simply has no rows in it for any real affiliate.
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
      }

      const { data: links, error: linksError } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('affiliate_id', userId)
        .order('created_at', { ascending: false })

      if (linksError) {
        console.error('Error fetching links:', linksError)
      }

      // Real, confirmed source of truth for earnings, affiliate_conversions,
      // the exact table the Stripe webhook now correctly writes to.
      // referral_earnings, used previously, was never confirmed as
      // written to by anything real reviewed tonight, dropped
      // entirely rather than silently trusted. No .limit() here,
      // deliberately, the real tier calculation and points progress
      // both need the complete, real history, not just the most
      // recent ten rows.
      const { data: allConversions, error: conversionsError } = await supabase
        .from('affiliate_conversions')
        .select('*')
        .eq('affiliate_id', userId)
        .order('created_at', { ascending: false })

      if (conversionsError) {
        console.error('Error fetching conversions:', conversionsError)
      }

      const conversions = allConversions || []

      // Real, honest separation, referral bonus rows share the same
      // real table as direct commission, distinguished by
      // commission_rate === REFERRAL_BONUS_RATE, the one real signal
      // available, confirmed directly against how the webhook writes
      // both kinds of rows.
      const directConversions = conversions.filter(c => c.commission_rate !== REFERRAL_BONUS_RATE)
      const referralConversions = conversions.filter(c => c.commission_rate === REFERRAL_BONUS_RATE)

      const totalClicks = links?.reduce((sum, l) => sum + (l.clicks || 0), 0) || 0
      const uniqueVisitors = links?.reduce((sum, l) => sum + (l.unique_clicks || 0), 0) || 0
      const totalConversions = conversions.length
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

      // Real, authoritative balance. None of the three old field names
      // exist on users, total_earned and total_paid were real columns
      // on affiliate_profiles, a table with no rows for any real
      // affiliate. total_earnings is now genuinely summed from real
      // conversion rows, the same, real source already used
      // everywhere else on this page. pending and paid come from
      // users.pending_balance and users.total_paid_out, the exact two
      // real, confirmed columns credit_commission itself maintains on
      // every real sale.
      const totalEarnings   = conversions.reduce((sum, c) => sum + (c.commission_amount || 0), 0)
      const pendingEarnings = profile?.pending_balance || 0
      const paidEarnings    = profile?.total_paid_out  || 0

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const currentMonth = new Date().getMonth()
      const monthlyStats = []

      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12
        monthlyStats.push({
          month: months[monthIndex],
          clicks: 0,
          conversions: 0,
          earnings: 0
        })
      }

      conversions.forEach(c => {
        const date = new Date(c.created_at)
        const month = months[date.getMonth()]
        const monthStat = monthlyStats.find(m => m.month === month)
        if (monthStat) {
          monthStat.earnings += (c.commission_amount || 0)
        }
      })

      const toolEarnings = new Map()
      directConversions.forEach(c => {
        const current = toolEarnings.get(c.tool_id) || { earnings: 0, conversions: 0, clicks: 0 }
        toolEarnings.set(c.tool_id, {
          earnings: current.earnings + (c.commission_amount || 0),
          conversions: current.conversions + 1,
          clicks: current.clicks
        })
      })

      const allTools = [
        ...omniSeerTools,
        ...voiceTools,
        ...sacredScriptTools,
        ...timeKeeperTools,
        ...loveTools,
        ...wealthTools,
        ...wellnessTools,
        ...lifePathTools
      ]

      const topTools = Array.from(toolEarnings.entries())
        .map(([toolId, data]) => ({
          toolId,
          toolName: allTools.find(t => t.id === toolId)?.name || 'Unknown Tool',
          toolEmoji: allTools.find(t => t.id === toolId)?.emoji || '🔮',
          ...data,
          conversionRate: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0
        }))
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 3)

      const recentConversions = conversions.slice(0, 10).map(c => ({
        id: c.id,
        customerEmail: c.customer_email || 'customer@example.com',
        toolName: c.tool_name || 'Unknown Tool',
        amount: c.purchase_amount || 0,
        commission: c.commission_amount || 0,
        date: new Date(c.created_at).toLocaleDateString(),
        status: c.status || 'pending',
        isReferralBonus: c.commission_rate === REFERRAL_BONUS_RATE,
      }))

      // Real tier, computed the same way the Stripe webhook itself
      // should, using the real, automatic Strategic trigger agreed
      // directly, replacing manual, email-based approval entirely.
      // profile.commission_rate, if an admin has genuinely set one for
      // a special, individually negotiated case, still overrides the
      // rate itself, but no longer gates entry into the tier, reaching
      // Strategic is now fully automatic either way.
      const strategicWindowStart = new Date(Date.now() - STRATEGIC_TIER_WINDOW_DAYS * 86400000)
      const salesInStrategicWindow = directConversions.filter(
        c => new Date(c.created_at) >= strategicWindowStart
      ).length

      let tier: CommissionTier = 'standard'
      if (qualifiesForStrategicTier({
        salesInWindow:    salesInStrategicWindow,
        lifetimeEarnings: totalEarnings,
      })) {
        tier = 'strategic'
      } else {
        const performanceWindowStart = new Date(Date.now() - PERFORMANCE_TIER_WINDOW_DAYS * 86400000)
        const recentSales = directConversions.filter(c => new Date(c.created_at) >= performanceWindowStart).length
        if (recentSales >= PERFORMANCE_TIER_SALES_THRESHOLD) tier = 'performance'
      }

      // Real points progress toward first-payout activation, the
      // real, agreed rule, 5 points, no dollar minimum, 1.0 per
      // low-ticket sale, 1.5 per high-ticket sale. Used directly
      // below to determine real activation too, no separate,
      // non-existent payout_activated column involved.
      const pointsEarned = directConversions.reduce(
        (sum, c) => sum + getPointsForSale(c.purchase_amount || 0), 0
      )

      // Real, genuine notifications, from the same, live table the
      // webhook already writes real rows to on every real sale,
      // affiliate_conversion and affiliate_referral_bonus, previously
      // hardcoded to an empty array here, meaning an affiliate could
      // earn a real, live commission and never see it show up
      // anywhere on their own dashboard.
      const { data: realNotifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError)
      }

      const realData: AffiliateData = {
        id: userId,
        name: user?.user_metadata?.full_name || 'Affiliate Partner',
        email: user?.email || '',
        referralCode: profile?.referral_code || '',
        joinDate: profile?.created ? new Date(profile.created).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }) : new Date().toLocaleDateString(),
        status: profile?.affiliate_status || 'pending',
        tier,
        accountType: 'affiliate',
        avatar: undefined,
        preferences: {
          darkMode: false,
          emailNotifications: true,
          pushNotifications: true,
          currency: 'USD',
          timezone: 'America/New_York'
        },
        stats: {
          totalClicks,
          uniqueVisitors,
          totalConversions,
          conversionRate: Number(conversionRate.toFixed(1)),
          totalEarnings,
          pendingCommissions: pendingEarnings,
          paidCommissions: paidEarnings,
          lifetimeValue: totalEarnings,
          averageOrderValue: totalConversions > 0 ? totalEarnings / totalConversions : 0,
          recurringRevenue: conversions.filter(c => c.is_recurring).reduce((sum, c) => sum + (c.commission_amount || 0), 0),
          // Real rank and percentile genuinely require comparing
          // against every other affiliate's real numbers, not
          // computable from this one account's own data alone.
          // Deliberately left at 0 here, with no fabricated fallback
          // anywhere in the render below, rather than showing a fake
          // number to every real affiliate the way this page
          // previously did, always, for everyone, regardless of
          // their real, actual standing.
          rank: 0,
          percentile: 0
        },
        monthlyStats,
        links: (links || []).map(l => ({
          id: l.id,
          name: l.name || 'Untitled Link',
          toolId: l.tool_id,
          toolName: l.tool_name || 'Unknown Tool',
          toolEmoji: l.tool_emoji || '🔮',
          domainId: l.domain_id || 'oracle-temple',
          domainName: l.domain_name || 'Omni-Seer\'s Sanctum',
          url: l.destination_url,
          shortUrl: l.short_url || l.destination_url,
          createdAt: new Date(l.created_at).toLocaleDateString(),
          clicks: l.clicks || 0,
          uniqueClicks: l.unique_clicks || 0,
          conversions: l.conversions || 0,
          earnings: l.earnings || 0,
          conversionRate: l.clicks ? ((l.conversions || 0) / l.clicks * 100) : 0,
          status: l.status || 'active'
        })),
        // Real, dual rates for the affiliate's real, current tier,
        // matching COMMISSION_RATES exactly, the same real constant
        // the webhook itself reads from. No manual override field
        // exists on users, that path was never real here, Strategic
        // is reached automatically now, the same way the webhook
        // itself determines it.
        commissionRates: {
          low:  COMMISSION_RATES[tier].low,
          high: COMMISSION_RATES[tier].high,
        },
        // Real, actual fields on users, paypal_email, bank_name,
        // account_name, account_number, swift_code, not the old,
        // never-real payout_method/account_last4/payout_currency
        // shape. Method is determined honestly by whichever real
        // field is actually filled in, and the last 4 digits are
        // genuinely derived from the real, full account number on
        // file, not read from a separate, pre-masked column that
        // never existed.
        paymentMethods: {
          payoutMethod:   profile?.paypal_email ? 'paypal' : profile?.bank_name ? 'bank' : undefined,
          bankName:       profile?.bank_name || undefined,
          accountLast4:   profile?.account_number ? profile.account_number.slice(-4) : undefined,
          payoutCurrency: undefined,
          accountName:    profile?.account_name || undefined,
          accountNumber:  profile?.account_number || undefined,
          swiftCode:      profile?.swift_code || undefined,
          paypalEmail:    profile?.paypal_email || undefined,
        },
        stripeConnect: {
          accountId: profile?.stripe_connect_account_id || undefined,
          onboarded: !!profile?.stripe_connect_onboarded,
        },
        firstPayoutProgress: {
          // Real, live activation, computed directly from the same,
          // real points figure shown just below, rather than a
          // payout_activated column that never existed on users.
          // This is more correct, not less, it can never disagree
          // with the number sitting right next to it.
          activated:    pointsEarned >= FIRST_PAYOUT_POINTS_THRESHOLD,
          pointsEarned: Number(pointsEarned.toFixed(1)),
          pointsNeeded: FIRST_PAYOUT_POINTS_THRESHOLD,
        },
        topTools,
        recentConversions,
        // Real, genuine notifications, mapped from the actual, raw
        // rows just fetched above. NOTIF_TYPE_MAP translates the
        // real, confirmed type strings the webhook actually writes,
        // affiliate_conversion and affiliate_referral_bonus, into the
        // UI's own real type enum, with an honest, generic fallback
        // for anything else.
        notifications: (realNotifications || []).map((n: any) => ({
          id:      n.id,
          title:   n.title,
          message: n.message,
          type:    (n.type === 'affiliate_conversion' || n.type === 'affiliate_referral_bonus') ? 'success' as const : 'info' as const,
          read:    !!n.read,
          time:    getNotificationTimeAgo(n.created_at),
        }))
      }

      setAffiliateData(realData)
    } catch (error) {
      console.error('Error fetching affiliate data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCreateLink = async () => {
    if (!newLink.name || !newLink.toolId) {
      alert('Please fill in required fields')
      return
    }

    try {
      const baseUrl = window.location.origin
      const destination = domainDestinations[newLink.domainId] || 'report'
      // Real, the one, new, actual branch, free tools live on a
      // genuinely different, real domain, kayalsoulpath.com, not
      // app.kayalsoulpath.com, with their own, real, static
      // pages/tool-{id}.html URL shape, nothing else about this
      // function changes for every other, real, existing domain.
      let destinationUrl = newLink.domainId === 'free-tools'
        ? `https://kayalsoulpath.com/pages/tool-${newLink.toolId}.html?ref=${user?.id}`
        : `${baseUrl}/tool/${newLink.toolId}?ref=${user?.id}`
      
      if (newLink.campaign) {
        destinationUrl += `&utm_campaign=${encodeURIComponent(newLink.campaign)}`
      }
      if (newLink.source) {
        destinationUrl += `&utm_source=${encodeURIComponent(newLink.source)}`
      }
      if (newLink.medium) {
        destinationUrl += `&utm_medium=${encodeURIComponent(newLink.medium)}`
      }

      const tool = selectedDomain?.tools.find((t: any) => t.id === newLink.toolId)

      const { error } = await supabase
        .from('affiliate_links')
        .insert({
          affiliate_id:    user.id,
          name:            newLink.name,
          link_type:       newLink.type || 'tool_specific',
          tool_id:         newLink.toolId       || null,
          tool_name:       tool?.name           || null,
          tool_emoji:      tool?.emoji          || null,
          domain_id:       newLink.domainId     || null,
          domain_name:     selectedDomain?.name || null,
          destination_url: destinationUrl,
          short_url:       destinationUrl,
          utm_campaign:    newLink.campaign     || null,
          utm_source:      newLink.source       || null,
          utm_medium:      newLink.medium       || null,
          tags:            newLink.tags.length ? newLink.tags : null,
          status:          'active',
          ref_code:        user.id,
          created_at:      new Date().toISOString(),
        })

      if (error) throw error

      await fetchAffiliateData(affiliateData!.id)
      setShowCreateLinkModal(false)
      setNewLink({ 
        name: '', 
        toolId: '', 
        domainId: '', 
        campaign: '', 
        source: '', 
        medium: '', 
        tags: [], 
        type: 'tool_specific' 
      })
      
      toast.success('Link created successfully!')
      
    } catch (error) {
      console.error('Error creating link:', error)
      alert('Failed to create link')
    }
  }

  const handleGenerateLink = (tool: any) => {
    setNewLink({
      ...newLink,
      toolId: tool.id,
      domainId: selectedDomain?.id || '',
      name: `${tool.name} Affiliate Link`
    })
    setShowCreateLinkModal(true)
  }

  const handleDomainClick = (domain: any) => {
    setSelectedDomain(domain)
    setViewMode('tools')
    setSearchQuery('')
  }

  const handleBackToDomains = () => {
    setViewMode('domains')
    setSelectedDomain(null)
    setSearchQuery('')
  }

  const handleShareLink = (link: AffiliateLink) => {
    setSelectedLink(link)
    setShowShareModal(true)
  }

  const handleShare = async (platform: string, link: AffiliateLink) => {
    const shareText = `Discover the wisdom of ${link.toolName} on Kayal LifeOS! ${link.url}`
    
    switch(platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`)
        break
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`)
        break
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link.url)}`)
        break
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link.url)}`)
        break
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent('Discover Kayal LifeOS')}&body=${encodeURIComponent(shareText)}`)
        break
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('affiliate_links')
        .delete()
        .eq('id', linkId)

      if (error) throw error

      await fetchAffiliateData(affiliateData!.id)
    } catch (error) {
      console.error('Error deleting link:', error)
      alert('Failed to delete link')
    }
  }

  // Real, shared handler, pre-fills the form with whatever real
  // values are already on file, rather than always opening blank
  // regardless of what was genuinely saved before.
  const openPaymentModal = () => {
    setPaymentForm({
      bankName:      affiliateData?.paymentMethods.bankName || '',
      accountName:   affiliateData?.paymentMethods.accountName || '',
      accountNumber: affiliateData?.paymentMethods.accountNumber || '',
      swiftCode:     affiliateData?.paymentMethods.swiftCode || '',
      paypalEmail:   affiliateData?.paymentMethods.paypalEmail || '',
    })
    setShowPaymentModal(true)
  }

  // Real, working payment-details save, previously this button
  // just closed the modal, nothing was ever actually written
  // anywhere. An affiliate could type a real bank account number
  // and a real SWIFT code, click "Save Changes", and none of it
  // was ever saved, silently discarded the moment the modal closed.
  const handleSavePaymentDetails = async () => {
    if (!affiliateData) return
    setSavingPayment(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          bank_name:      paymentForm.bankName || null,
          account_name:   paymentForm.accountName || null,
          account_number: paymentForm.accountNumber || null,
          swift_code:     paymentForm.swiftCode || null,
          paypal_email:   paymentForm.paypalEmail || null,
        })
        .eq('id', affiliateData.id)

      if (error) throw error

      // Real, immediate local update, so the new, real values show
      // right away, not only after a full, later refresh.
      setAffiliateData(prev => prev ? {
        ...prev,
        paymentMethods: {
          ...prev.paymentMethods,
          payoutMethod:  paymentForm.paypalEmail ? 'paypal' : paymentForm.bankName ? 'bank' : undefined,
          bankName:      paymentForm.bankName || undefined,
          accountLast4:  paymentForm.accountNumber ? paymentForm.accountNumber.slice(-4) : undefined,
          accountName:   paymentForm.accountName || undefined,
          accountNumber: paymentForm.accountNumber || undefined,
          swiftCode:     paymentForm.swiftCode || undefined,
          paypalEmail:   paymentForm.paypalEmail || undefined,
        }
      } : prev)

      toast.success('Payment details saved')
      setShowPaymentModal(false)
    } catch (error: any) {
      console.error('Error saving payment details:', error)
      toast.error(error.message || 'Failed to save payment details')
    } finally {
      setSavingPayment(false)
    }
  }

  const handleRequestPayout = () => {
    if (!affiliateData) return

    if (!affiliateData.firstPayoutProgress.activated) {
      alert(`Your first payout activates automatically once you reach ${affiliateData.firstPayoutProgress.pointsNeeded} points, no dollar minimum. You're at ${affiliateData.firstPayoutProgress.pointsEarned} now.`)
      return
    }

    if (affiliateData.stats.pendingCommissions < RECURRING_PAYOUT_MINIMUM) {
      alert(`Minimum recurring payout amount is $${RECURRING_PAYOUT_MINIMUM}`)
      return
    }

    setShowWithdrawModal(true)
  }

  // Real, working withdrawal request, previously this button closed
  // the modal and showed a browser alert claiming success, nothing
  // was ever actually written anywhere. An affiliate could hit their
  // real points threshold, click this, see "submitted", and
  // genuinely believe they'd requested their money, while the real
  // admin Payouts page showed nothing at all, because nothing real
  // was ever created.
  const handleConfirmWithdrawal = async () => {
    if (!affiliateData) return

    const amount = parseFloat(withdrawAmount)
    if (!withdrawAmount || isNaN(amount) || amount < RECURRING_PAYOUT_MINIMUM) {
      toast.error(`Enter a real amount of at least $${RECURRING_PAYOUT_MINIMUM}`)
      return
    }
    if (amount > affiliateData.stats.pendingCommissions) {
      toast.error(`Can't withdraw more than your real, available balance of $${affiliateData.stats.pendingCommissions}`)
      return
    }

    // Real, honest requirement, a payout can't genuinely be sent
    // anywhere without a real, actual payment method on file, this
    // refuses to create a request that would have nowhere real to go.
    const { paymentMethods } = affiliateData
    if (!paymentMethods.payoutMethod) {
      toast.error('Add a real payment method first, under Payment on this page.')
      return
    }

    setWithdrawing(true)
    try {
      const paymentDetails = paymentMethods.payoutMethod === 'paypal'
        ? { method: 'paypal', last4: paymentMethods.accountLast4 }
        : { method: 'bank', bankName: paymentMethods.bankName, last4: paymentMethods.accountLast4 }

      const { error } = await supabase.from('payout_requests').insert({
        affiliate_id:    affiliateData.id,
        amount,
        payment_method:  paymentMethods.payoutMethod,
        payment_details: paymentDetails,
        status:          'pending',
        created_at:      new Date().toISOString(),
      })

      if (error) throw error

      toast.success('Withdrawal requested, an admin will review it shortly')
      setShowWithdrawModal(false)
      setWithdrawAmount('')
    } catch (error: any) {
      console.error('Withdrawal request error:', error)
      toast.error(error.message || 'Failed to submit withdrawal request')
    } finally {
      setWithdrawing(false)
    }
  }

  // Real, new handler, calls connect-stripe/route.ts to create or
  // resume the affiliate's real Stripe Connect Express account, then
  // redirects to Stripe's own hosted onboarding page. Errors are
  // surfaced directly, real, honest failures, not silently swallowed.
  const handleConnectStripe = async () => {
    if (!/^[A-Za-z]{2}$/.test(connectCountry)) {
      alert('Please enter a valid two-letter country code, e.g. US, GB, NG')
      return
    }
    setConnectingStripe(true)
    try {
      const res = await fetch('/api/affiliate/connect-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: connectCountry.toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        alert(data.error || 'Could not start Stripe onboarding, please try again.')
        return
      }
      window.location.href = data.url
    } catch (err) {
      console.error('Error starting Stripe Connect onboarding:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setConnectingStripe(false)
    }
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setSortBy('popular')
    if (selectedDomain) {
      setFilteredTools(selectedDomain.tools)
    }
  }

  const unreadCount = affiliateData?.notifications?.filter(n => !n.read).length || 0

  const handleShareCoupon = (coupon: AffiliateCoupon) => {
    const shareText = `Use code ${coupon.code} for ${coupon.discount}% off at Kayal LifeOS!`
    navigator.clipboard.writeText(coupon.code)
    toast.success('Coupon code copied!')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-neutral-600">Loading your affiliate dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !affiliateData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Users className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-2xl font-serif mb-4">Not Signed In</h2>
          <p className="text-neutral-600 mb-6">Please sign in to view your dashboard.</p>
          <Button onClick={() => router.push('/member/referral/login')}>Sign In</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/member/dashboard')}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors lg:hidden"
                title="Back to Member Dashboard"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Gift className="w-4 h-4 text-primary-600" />
                </div>
                <span className="font-serif text-lg hidden sm:block">Affiliate Dashboard</span>
              </div>

              <nav className="hidden lg:flex items-center gap-1 ml-4">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'overview' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('links')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'links' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'
                  }`}
                >
                  Link Manager
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'analytics' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('payouts')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'payouts' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'
                  }`}
                >
                  Payouts
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'settings' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'
                  }`}
                >
                  Settings
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 hover:bg-neutral-100 rounded-lg hidden sm:block"
                title="Toggle dark mode"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-neutral-100 rounded-lg relative"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border z-50">
                    <div className="p-3 border-b font-medium text-sm">Notifications</div>
                    <div className="max-h-80 overflow-y-auto">
                      {(!affiliateData?.notifications || affiliateData.notifications.length === 0) ? (
                        <p className="text-center text-neutral-400 py-6 text-sm">No notifications yet</p>
                      ) : (
                        affiliateData.notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={async () => {
                              if (n.read) return
                              await supabase.from('notifications').update({ read: true }).eq('id', n.id)
                              setAffiliateData(prev => prev ? {
                                ...prev,
                                notifications: prev.notifications.map(x => x.id === n.id ? { ...x, read: true } : x)
                              } : prev)
                            }}
                            className={`p-3 border-b last:border-0 cursor-pointer hover:bg-neutral-50 ${!n.read ? 'bg-primary-50/40' : ''}`}
                          >
                            <p className="text-sm font-medium">{n.title}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">{n.message}</p>
                            <p className="text-xs text-neutral-400 mt-1">{n.time}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => fetchAffiliateData(user.id)}
                disabled={refreshing}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => window.open('/support', '_blank')}
                className="p-2 hover:bg-neutral-100 rounded-lg hidden sm:block"
                title="Help & Support"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg"
              >
                {mobileMenuOpen ? <CloseIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="relative hidden sm:block">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 pl-2 border-l hover:bg-neutral-50 rounded-lg p-1"
                >
                  <span className="text-sm font-medium">{affiliateData.name}</span>
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {affiliateData.avatar ? (
                      <img src={affiliateData.avatar} alt={affiliateData.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      affiliateData.name.charAt(0)
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-neutral-200 bg-gradient-to-r from-primary-50 to-secondary-50">
                        <p className="font-medium">{affiliateData.name}</p>
                        <p className="text-xs text-neutral-500">{affiliateData.email}</p>
                        <Badge variant="primary" size="sm" className="mt-2">{affiliateData.tier} tier</Badge>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            setActiveTab('settings')
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition text-left"
                        >
                          <User className="w-4 h-4" />
                          <span className="text-sm">My Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            setActiveTab('settings')
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition text-left"
                        >
                          <Settings className="w-4 h-4" />
                          <span className="text-sm">Account Settings</span>
                        </button>
                        <div className="border-t border-neutral-200 my-2"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm">Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm py-2 border-t">
            <button 
              onClick={() => router.push('/member/dashboard')}
              className="text-neutral-500 hover:text-primary-600 transition flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
            <span className="text-primary-600 font-medium">Affiliate Dashboard</span>
            {viewMode === 'tools' && selectedDomain && (
              <>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
                <span className="text-primary-600 font-medium">{selectedDomain.name}</span>
              </>
            )}
          </div>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden border-t py-2"
              >
                <div className="flex flex-col gap-1">
                  <button onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false) }} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'overview' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'}`}>Overview</button>
                  <button onClick={() => { setActiveTab('links'); setMobileMenuOpen(false) }} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'links' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'}`}>Link Manager</button>
                  <button onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false) }} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'analytics' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'}`}>Analytics</button>
                  <button onClick={() => { setActiveTab('payouts'); setMobileMenuOpen(false) }} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'payouts' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'}`}>Payouts</button>
                  <button onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false) }} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'settings' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'}`}>Settings</button>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {affiliateData.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{affiliateData.name}</p>
                    <p className="text-xs text-neutral-500">{affiliateData.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="primary" size="sm">{affiliateData.tier} tier</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button onClick={() => setDarkMode(!darkMode)} className="flex-1 p-2 bg-neutral-100 rounded-lg flex items-center justify-center gap-2">
                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span className="text-sm">Theme</span>
                  </button>
                  <button onClick={handleLogout} className="flex-1 p-2 bg-red-50 text-red-600 rounded-lg flex items-center justify-center gap-2">
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-serif mb-2">
                    Welcome back, {affiliateData.name}! 👋
                  </h2>
                  <p className="text-primary-100 text-sm">
                    You're earning <span className="font-bold text-white">{affiliateData.commissionRates.low}% / {affiliateData.commissionRates.high}%</span> commission
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-primary-200">Affiliate since</p>
                  <p className="text-sm font-medium">{affiliateData.joinDate}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-primary-200 bg-primary-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-primary-800">Your Commission Structure</h3>
                <Badge variant="primary">{TIER_LABELS[affiliateData.tier]} tier</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {(['standard', 'performance', 'strategic'] as const).map(t => (
                  <div key={t} className={`p-2 rounded-lg text-center ${affiliateData.tier === t ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600'}`}>
                    <p className={`text-xs font-medium ${affiliateData.tier === t ? 'text-primary-100' : 'text-neutral-500'}`}>{TIER_LABELS[t]}</p>
                    <p className={`text-lg font-bold ${affiliateData.tier === t ? 'text-white' : 'text-neutral-800'}`}>{COMMISSION_RATES[t].low}% / {COMMISSION_RATES[t].high}%</p>
                    <p className={`text-xs ${affiliateData.tier === t ? 'text-primary-200' : 'text-neutral-500'}`}>{TIER_SUBLABELS[t]}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-primary-700">
                Currently earning <strong>{affiliateData.commissionRates.low}% / {affiliateData.commissionRates.high}%</strong> (low-ticket / high-ticket).
                {affiliateData.tier === 'standard' && ` Reach ${PERFORMANCE_TIER_SALES_THRESHOLD} sales in any rolling ${PERFORMANCE_TIER_WINDOW_DAYS}-day window to auto-upgrade to Performance.`}
                {affiliateData.tier === 'performance' && ` Reach ${STRATEGIC_TIER_SALES_THRESHOLD} sales in a rolling ${STRATEGIC_TIER_WINDOW_DAYS}-day window, or $${STRATEGIC_TIER_LIFETIME_EARNINGS_USD.toLocaleString()} lifetime earnings, to auto-upgrade to Strategic. No application needed, either path triggers it automatically.`}
              </p>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-neutral-500">Available Balance</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold text-primary-600">
                        {showBalance ? `$${affiliateData.stats.pendingCommissions}` : '••••'}
                      </p>
                      <button onClick={() => setShowBalance(!showBalance)} className="text-neutral-400 hover:text-neutral-600">
                        {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-green-600 mt-1">Next payout: {new Date().getDate() > 15 ? 'Next month 15th' : 'This month 15th'}</p>
                  </div>
                  <Wallet className="w-5 h-5 text-green-500" />
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-neutral-500">Total Earnings</p>
                    <p className="text-xl font-bold">${affiliateData.stats.totalEarnings}</p>
                    <p className="text-xs text-blue-600 mt-1">Lifetime: ${affiliateData.stats.lifetimeValue}</p>
                  </div>
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-neutral-500">Conversions</p>
                    <p className="text-xl font-bold">{affiliateData.stats.totalConversions}</p>
                    <p className="text-xs text-emerald-600 mt-1">{affiliateData.stats.conversionRate}% conversion</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-neutral-500">Your Rank</p>
                    {affiliateData.stats.rank > 0 ? (
                      <>
                        <p className="text-xl font-bold">#{affiliateData.stats.rank}</p>
                        <p className="text-xs text-amber-600 mt-1">Top {affiliateData.stats.percentile}%</p>
                      </>
                    ) : (
                      <p className="text-sm text-neutral-500 mt-1">Ranking coming soon</p>
                    )}
                  </div>
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button onClick={() => setActiveTab('links')} className="p-4 bg-white rounded-lg border hover:border-primary-300 hover:shadow-md transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition"><Link2 className="w-5 h-5 text-primary-600" /></div>
                  <div className="text-left"><p className="font-medium text-sm">Create Links</p><p className="text-xs text-neutral-500">For any tool</p></div>
                </div>
              </button>
              <button onClick={handleRequestPayout} className="p-4 bg-white rounded-lg border hover:border-green-300 hover:shadow-md transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition"><Wallet className="w-5 h-5 text-green-600" /></div>
                  <div className="text-left"><p className="font-medium text-sm">Withdraw</p><p className="text-xs text-neutral-500">${affiliateData.stats.pendingCommissions} available</p></div>
                </div>
              </button>
              <button onClick={openPaymentModal} className="p-4 bg-white rounded-lg border hover:border-purple-300 hover:shadow-md transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition"><CreditCard className="w-5 h-5 text-purple-600" /></div>
                  <div className="text-left"><p className="font-medium text-sm">Payment</p><p className="text-xs text-neutral-500">Update method</p></div>
                </div>
              </button>
              <button onClick={() => window.open('/marketing-kit', '_blank')} className="p-4 bg-white rounded-lg border hover:border-amber-300 hover:shadow-md transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition"><Download className="w-5 h-5 text-amber-600" /></div>
                  <div className="text-left"><p className="font-medium text-sm">Marketing</p><p className="text-xs text-neutral-500">Tools & banners</p></div>
                </div>
              </button>
            </div>

            {/* Real, working recruitment link, the referral_code and
                the real, live 5% bonus already existed and already
                worked, this is the missing, real bridge between them,
                the one thing an affiliate could actually share. */}
            {affiliateData.referralCode && (
              <Card className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0"><UserCheck className="w-5 h-5 text-indigo-600" /></div>
                  <div>
                    <h3 className="text-sm font-medium">Recruit an affiliate</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Earn 5% of every sale they make, for as long as they're active, share this real link to invite them.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/member/referral/register?ref=${affiliateData.referralCode}`}
                    className="flex-1 p-2 bg-neutral-50 border rounded-lg text-sm"
                  />
                  <button
                    onClick={() => handleCopy(`${window.location.origin}/member/referral/register?ref=${affiliateData.referralCode}`, 'recruit-link')}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    {copied === 'recruit-link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </Card>
            )}

            {AFFILIATE_EXPLAINER_VIDEO_URL && (
              <Card className="p-5">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary-600" />
                  How to Get Your First Commission
                </h3>
                <VideoEmbed url={AFFILIATE_EXPLAINER_VIDEO_URL} label="Affiliate programme walkthrough" />
                <p className="text-xs text-neutral-500 mt-2 text-center">
                  4-minute walkthrough · Dashboard tour · Your first promotional move
                </p>
              </Card>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {domains.slice(0, 4).map(domain => (
                <Card 
                  key={domain.id} 
                  className="p-3 cursor-pointer hover:shadow-md transition border-2 border-transparent hover:border-primary-200"
                  onClick={() => {
                    setSelectedDomain(domain)
                    setViewMode('tools')
                    setActiveTab('links')
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{domain.icon}</span>
                    <span className="text-xs font-medium truncate">{domain.name}</span>
                  </div>
                  <p className="text-lg font-bold text-primary-600">{domain.tools.length}</p>
                  <p className="text-xs text-neutral-500">tools available</p>
                </Card>
              ))}
              
              <Card 
                className="p-3 cursor-pointer hover:shadow-md transition border-2 border-dashed border-neutral-300 hover:border-primary-200 flex items-center justify-center"
                onClick={() => {
                  setViewMode('domains')
                  setActiveTab('links')
                }}
              >
                <div className="text-center">
                  <span className="text-sm font-medium text-primary-600">View All</span>
                  <p className="text-xs text-neutral-500">{domains.length} domains</p>
                </div>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-5">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary-600" />
                  Your Top Performing Tools
                </h3>
                {affiliateData.topTools.length > 0 ? (
                  <div className="space-y-3">
                    {affiliateData.topTools.map((tool, index) => (
                      <div key={tool.toolId} className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-sm">{tool.toolEmoji}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tool.toolName}</p>
                            <p className="text-xs text-neutral-500">{tool.clicks} clicks · {tool.conversions} sales</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary-600">${tool.earnings}</p>
                          <p className="text-xs text-green-600">{tool.conversionRate.toFixed(1)}% conv.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-8">No sales yet</p>
                )}
                <button 
                  onClick={() => setActiveTab('links')}
                  className="mt-4 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  Browse all tools
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-green-600" />
                  Recent Conversions
                </h3>
                {affiliateData.recentConversions.length > 0 ? (
                  <div className="space-y-3">
                    {affiliateData.recentConversions.map(conv => (
                      <div key={conv.id} className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{conv.toolName}</p>
                          <p className="text-xs text-neutral-500">{conv.customerEmail}</p>
                          <p className="text-xs text-neutral-500">{conv.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary-600">${conv.commission}</p>
                          <Badge 
                            variant={conv.status === 'paid' ? 'primary' : 'secondary'} 
                            size="sm"
                          >
                            {conv.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-8">No conversions yet</p>
                )}
              </Card>
            </div>

            <Card className="p-5 bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
              {affiliateData.firstPayoutProgress.activated ? (
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800">First payout activated, you're on the regular monthly schedule now.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">First Payout Progress</h3>
                    <Badge variant="secondary">No minimum, paid within 7 working days</Badge>
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-amber-600 h-2 rounded-full"
                      style={{ width: `${Math.min((affiliateData.firstPayoutProgress.pointsEarned / affiliateData.firstPayoutProgress.pointsNeeded) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-amber-700">
                    {affiliateData.firstPayoutProgress.pointsEarned} / {affiliateData.firstPayoutProgress.pointsNeeded} points, low-ticket sales earn 1.0pt, high-ticket earn 1.5pts
                  </p>
                </>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="space-y-6">
            {affiliateData.links.length > 0 && viewMode === 'domains' && (
              <Card className="p-5">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary-600" />
                  Your Generated Links ({affiliateData.links.length})
                </h3>
                <div className="space-y-3">
                  {affiliateData.links.map(link => (
                    <div key={link.id} className="p-3 border rounded-lg hover:bg-neutral-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{link.toolEmoji}</span>
                            <p className="text-sm font-medium truncate">{link.name}</p>
                            <Badge variant={link.status === 'active' ? 'primary' : 'secondary'} size="sm">{link.status}</Badge>
                          </div>
                          <div className="flex items-center gap-2 bg-neutral-50 border rounded px-2 py-1">
                            <p className="text-xs text-neutral-500 truncate flex-1">{link.url}</p>
                            <button
                              onClick={() => handleCopy(link.url, link.id)}
                              className="flex-shrink-0 p-1 hover:bg-neutral-200 rounded"
                              title="Copy link"
                            >
                              {copied === link.id
                                ? <Check className="w-3 h-3 text-green-600" />
                                : <Copy className="w-3 h-3 text-neutral-500" />}
                            </button>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                            <span>{link.clicks} clicks</span>
                            <span>{link.conversions} conversions</span>
                            <span>${link.earnings} earned</span>
                            <span>Created {link.createdAt}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleShareLink(link)}
                            className="p-1.5 hover:bg-neutral-100 rounded-lg"
                            title="Share"
                          >
                            <Share2 className="w-4 h-4 text-neutral-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteLink(link.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {viewMode === 'domains' ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">Link Manager</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="primary">{overallStats.totalTools} tools</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {domains.map((domain) => (
                    <Card 
                      key={domain.id} 
                      className="p-5 hover:shadow-md transition cursor-pointer"
                      onClick={() => handleDomainClick(domain)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${domain.color} flex items-center justify-center text-2xl`}>
                          {domain.icon}
                        </div>
                        <Badge variant="outline">{domain.tools.length} tools</Badge>
                      </div>
                      <h3 className="font-medium mb-2">{domain.name}</h3>
                      <p className="text-sm text-neutral-500 line-clamp-2 mb-3">{domain.description}</p>
                      <Button className="w-full" size="sm">View Tools</Button>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              selectedDomain && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={handleBackToDomains} className="p-2 hover:bg-neutral-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h2 className="text-lg font-medium">{selectedDomain.name}</h2>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleResetFilters} className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" /> Reset Filters
                    </Button>
                  </div>

                  <Card className="p-4 bg-primary-50 border-primary-200">
                    <p className="text-sm text-primary-700">{selectedDomain.description}</p>
                  </Card>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input type="text" placeholder="Search tools..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg" />
                    </div>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-2 border rounded-lg bg-white">
                      <option value="popular">Most Popular</option>
                      <option value="name">Name</option>
                      <option value="price">Price</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTools.map((tool: any) => {
                      const typeInfo = getToolTypeInfo(selectedDomain.id)
                      const TypeIcon = typeInfo.icon
                      
                      return (
                        <Card key={tool.id} className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-xl">
                                {tool.emoji}
                              </div>
                              <div>
                                <h4 className="font-medium">{tool.name}</h4>
                                <p className="text-sm text-primary-600">${tool.price}</p>
                              </div>
                            </div>
                            {tool.isPopular && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                <Flame className="w-3 h-3 mr-1" /> Popular
                              </Badge>
                            )}
                          </div>
                          <div className="mb-3">
                            <Badge variant="outline" className={typeInfo.color}>
                              <TypeIcon className="w-3 h-3 mr-1" />
                              {typeInfo.label}
                              {typeInfo.isSubscription && <span className="ml-1 text-xs">(Monthly)</span>}
                            </Badge>
                          </div>
                          <p className="text-sm text-neutral-600 line-clamp-2 mb-3">
                            {tool.description || tool.subtitle || tool.shortDescription}
                          </p>
                          {tool.features && tool.features.length > 0 && (
                            <div className="space-y-1 mb-3">
                              {tool.features.slice(0, 3).map((feature: any, i: number) => (
                                <div key={i} className="flex items-start gap-1 text-xs">
                                  <Sparkles className="w-3 h-3 text-primary-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-neutral-600 line-clamp-1">{getFeatureText(feature)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {tool.requiresImage && (
                            <div className="mb-3 text-xs flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg">
                              <Camera className="w-3 h-3" />
                              Requires: {tool.requiresImageType === 'both' ? 'Face + Palm photos' : tool.requiresImageType === 'face' ? 'Face photo' : 'Palm photos'}
                            </div>
                          )}
                          <Button size="sm" className="w-full" onClick={() => handleGenerateLink(tool)}>
                            <Plus className="w-4 h-4 mr-2" /> Generate Link
                          </Button>
                        </Card>
                      )
                    })}
                  </div>

                  {filteredTools.length === 0 && (
                    <Card className="p-12 text-center">
                      <Search className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium mb-2">No tools found</h3>
                      <p className="text-sm text-neutral-500">Try adjusting your search or filters</p>
                    </Card>
                  )}
                </>
              )
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <Card className="p-6">
            <h2 className="text-xl font-serif mb-4">Performance Analytics</h2>
            <div className="mb-8">
              <h3 className="text-sm font-medium mb-4">Monthly Performance</h3>
              <div className="h-64 flex items-end justify-between gap-2">
                {affiliateData.monthlyStats.map((stat) => (
                  <div key={stat.month} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-primary-100 rounded-t-lg relative" style={{ height: '120px' }}>
                      <div className="absolute bottom-0 w-full bg-primary-600 rounded-t-lg transition-all" style={{ height: `${(stat.earnings / 700) * 100}%` }} />
                    </div>
                    <span className="text-xs text-neutral-500">{stat.month}</span>
                    <span className="text-xs font-medium">${stat.earnings}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-neutral-50 rounded-lg"><p className="text-xs text-neutral-500">Total Clicks</p><p className="text-lg font-bold">{affiliateData.stats.totalClicks}</p></div>
              <div className="p-3 bg-neutral-50 rounded-lg"><p className="text-xs text-neutral-500">Unique Visitors</p><p className="text-lg font-bold">{affiliateData.stats.uniqueVisitors}</p></div>
              <div className="p-3 bg-neutral-50 rounded-lg"><p className="text-xs text-neutral-500">Avg Order Value</p><p className="text-lg font-bold">${affiliateData.stats.averageOrderValue.toFixed(2)}</p></div>
              <div className="p-3 bg-neutral-50 rounded-lg"><p className="text-xs text-neutral-500">Recurring Revenue</p><p className="text-lg font-bold">${affiliateData.stats.recurringRevenue}</p></div>
            </div>
          </Card>
        )}

        {activeTab === 'payouts' && (
          <Card className="p-6">
            <h2 className="text-xl font-serif mb-4">Payouts & Earnings</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
                <p className="text-sm text-primary-100">Available for Payout</p>
                <p className="text-2xl font-bold">${affiliateData.stats.pendingCommissions}</p>
                <Button variant="secondary" size="sm" className="mt-3 bg-white text-primary-700" onClick={handleRequestPayout} disabled={affiliateData.stats.pendingCommissions < 50}>Request Payout</Button>
              </Card>
              <Card className="p-4"><p className="text-sm text-neutral-500">Total Paid</p><p className="text-2xl font-bold text-green-600">${affiliateData.stats.paidCommissions}</p><p className="text-xs text-neutral-500 mt-2">Lifetime earnings</p></Card>
              <Card className="p-4"><p className="text-sm text-neutral-500">Next Payout Date</p><p className="text-2xl font-bold text-amber-600">15th</p><p className="text-xs text-neutral-500 mt-2">Monthly on 15th</p></Card>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-amber-800 mb-2">Payment Schedule</h3>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>• <strong>First payout:</strong> within 7 working days of your first qualifying sale</li>
                <li>• <strong>All subsequent payouts:</strong> 15th of every month</li>
                <li>• <strong>Minimum threshold:</strong> $50, balances below this roll to next month</li>
                <li>• <strong>Methods:</strong> PayPal or international bank transfer</li>
              </ul>
            </div>

            <div className="text-center py-8"><Wallet className="w-12 h-12 text-neutral-300 mx-auto mb-3" /><p className="text-neutral-600">No payout history yet</p><p className="text-sm text-neutral-500 mt-1">Your payouts will appear here</p></div>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card className="p-6">
            <h2 className="text-xl font-serif mb-4">Account Settings</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Payment Methods</h3>
                <div className="space-y-3">
                  {affiliateData.paymentMethods.bankName ? (
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <p className="text-sm font-medium mb-1">🏦 Bank Account</p>
                      <p className="text-xs text-neutral-600">{affiliateData.paymentMethods.bankName}</p>
                      {affiliateData.paymentMethods.accountLast4 && (
                        <p className="text-xs text-neutral-600">Account ending in {affiliateData.paymentMethods.accountLast4}</p>
                      )}
                      {affiliateData.paymentMethods.payoutCurrency && (
                        <p className="text-xs text-neutral-600">Paid in {affiliateData.paymentMethods.payoutCurrency}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500 text-center py-4">No payment method added</p>
                  )}
                  <Button variant="outline" size="sm" onClick={openPaymentModal}><CreditCard className="w-4 h-4 mr-2" />Update Payment Methods</Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Payout Account (Stripe)</h3>
                {affiliateData.stripeConnect.onboarded ? (
                  <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800">Connected, ready to receive real payouts.</span>
                  </div>
                ) : affiliateData.stripeConnect.accountId ? (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-800 mb-2">Onboarding started but not yet finished.</p>
                    <Button variant="outline" size="sm" onClick={handleConnectStripe} disabled={connectingStripe}>
                      {connectingStripe ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Finish onboarding'}
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 bg-neutral-50 rounded-lg space-y-2">
                    <p className="text-sm text-neutral-600">Connect a real bank account to receive your commission payouts, in USD, via Stripe.</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={connectCountry}
                        onChange={(e) => setConnectCountry(e.target.value.toUpperCase())}
                        placeholder="Country code, e.g. US"
                        maxLength={2}
                        className="w-40 p-2 border rounded-lg text-sm uppercase"
                      />
                      <Button size="sm" onClick={handleConnectStripe} disabled={connectingStripe}>
                        {connectingStripe ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect with Stripe'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Commission Structure</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-primary-50 rounded-lg"><p className="text-xs text-primary-600">Tier</p><p className="text-lg font-bold text-primary-700">{TIER_LABELS[affiliateData.tier]}</p></div>
                  <div className="p-3 bg-green-50 rounded-lg"><p className="text-xs text-green-600">Low-ticket</p><p className="text-lg font-bold text-green-700">{affiliateData.commissionRates.low}%</p></div>
                  <div className="p-3 bg-purple-50 rounded-lg"><p className="text-xs text-purple-600">High-ticket</p><p className="text-lg font-bold text-purple-700">{affiliateData.commissionRates.high}%</p></div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">First Payout Progress</h3>
                <Card className="p-4 bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
                  {affiliateData.firstPayoutProgress.activated ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">Activated, you're on the regular monthly schedule now.</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2"><span className="font-medium">{affiliateData.firstPayoutProgress.pointsEarned} / {affiliateData.firstPayoutProgress.pointsNeeded} points</span><Badge variant="secondary">No minimum</Badge></div>
                      <div className="w-full bg-amber-200 rounded-full h-2 mb-2"><div className="bg-amber-600 h-2 rounded-full" style={{ width: `${Math.min((affiliateData.firstPayoutProgress.pointsEarned / affiliateData.firstPayoutProgress.pointsNeeded) * 100, 100)}%` }} /></div>
                      <p className="text-xs text-amber-700">Low-ticket sales earn 1.0pt, high-ticket earn 1.5pts, paid within 7 working days once you hit {affiliateData.firstPayoutProgress.pointsNeeded}</p>
                    </>
                  )}
                </Card>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Preferences</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-3"><Bell className="w-4 h-4 text-neutral-500" /><div><p className="text-sm font-medium">Email Notifications</p><p className="text-xs text-neutral-500">Receive updates about your earnings</p></div></div>
                    <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" defaultChecked={affiliateData.preferences.emailNotifications} onChange={(e) => { setAffiliateData({ ...affiliateData, preferences: { ...affiliateData.preferences, emailNotifications: e.target.checked } }) }} /><div className="w-11 h-6 bg-neutral-200 rounded-full peer peer-checked:bg-primary-600"></div></label>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-neutral-500" /><div><p className="text-sm font-medium">Currency</p><p className="text-xs text-neutral-500">Display earnings in</p></div></div>
                    <select className="p-2 border rounded-lg bg-white text-sm" value={affiliateData.preferences.currency} onChange={(e) => { setAffiliateData({ ...affiliateData, preferences: { ...affiliateData.preferences, currency: e.target.value as 'USD' | 'EUR' | 'GBP' } }) }}><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option></select>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </main>

      <AnimatePresence>
        {showCreateLinkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateLinkModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-serif">Generate Affiliate Link</h3><button onClick={() => setShowCreateLinkModal(false)} className="p-2 hover:bg-neutral-100 rounded-lg"><CloseIcon className="w-5 h-5" /></button></div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Link Name *</label><input type="text" value={newLink.name} onChange={(e) => setNewLink({...newLink, name: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="e.g., Facebook Campaign" /></div>
                  <div className="border-t pt-4"><h4 className="text-sm font-medium mb-3">Tracking Parameters (Optional)</h4><div className="space-y-3"><input type="text" value={newLink.campaign} onChange={(e) => setNewLink({...newLink, campaign: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Campaign (e.g., spring_sale)" /><input type="text" value={newLink.source} onChange={(e) => setNewLink({...newLink, source: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Source (e.g., facebook)" /><input type="text" value={newLink.medium} onChange={(e) => setNewLink({...newLink, medium: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Medium (e.g., cpc, social)" /></div></div>
                  <div className="bg-primary-50 p-3 rounded-lg">
                    <p className="text-xs text-primary-700 mb-1">Commission Rate</p>
                    <p className="text-sm font-medium">You'll earn <span className="text-primary-600 font-bold">{affiliateData.commissionRates.low}% / {affiliateData.commissionRates.high}%</span> per sale (low-ticket / high-ticket)</p>
                    <p className="text-xs text-primary-600 mt-1">60-day cookie, any purchase within 60 days earns commission</p>
                    {affiliateData.tier === 'standard' && (
                      <p className="text-xs text-primary-500 mt-1">Reach {PERFORMANCE_TIER_SALES_THRESHOLD} sales in any rolling {PERFORMANCE_TIER_WINDOW_DAYS}-day window to auto-upgrade to Performance</p>
                    )}
                    {affiliateData.tier === 'performance' && (
                      <p className="text-xs text-primary-500 mt-1">Reach {STRATEGIC_TIER_SALES_THRESHOLD} sales in {STRATEGIC_TIER_WINDOW_DAYS} days, or ${STRATEGIC_TIER_LIFETIME_EARNINGS_USD.toLocaleString()} lifetime, to auto-upgrade to Strategic</p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4"><Button onClick={handleCreateLink} className="flex-1">Generate Link</Button><Button variant="outline" className="flex-1" onClick={() => setShowCreateLinkModal(false)}>Cancel</Button></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareModal && selectedLink && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-serif mb-4">Share Your Link</h3>
              <div className="space-y-3">
                <Button onClick={() => handleShare('whatsapp', selectedLink)} fullWidth className="bg-green-600 hover:bg-green-700"><Phone className="w-4 h-4 mr-2" />Share on WhatsApp</Button>
                <Button onClick={() => handleShare('twitter', selectedLink)} fullWidth className="bg-blue-400 hover:bg-blue-500"><Twitter className="w-4 h-4 mr-2" />Share on Twitter</Button>
                <Button onClick={() => handleShare('facebook', selectedLink)} fullWidth className="bg-blue-600 hover:bg-blue-700"><Facebook className="w-4 h-4 mr-2" />Share on Facebook</Button>
                <Button onClick={() => handleShare('linkedin', selectedLink)} fullWidth className="bg-blue-700 hover:bg-blue-800"><Linkedin className="w-4 h-4 mr-2" />Share on LinkedIn</Button>
                <Button onClick={() => handleShare('email', selectedLink)} fullWidth variant="outline"><Mail className="w-4 h-4 mr-2" />Share via Email</Button>
              </div>
              <div className="mt-4 pt-4 border-t"><p className="text-xs text-neutral-500 mb-2">Or copy link directly:</p><div className="flex gap-2"><input type="text" value={selectedLink.url} readOnly className="flex-1 p-2 bg-neutral-50 border rounded-lg text-sm" /><button onClick={() => handleCopy(selectedLink.url, 'share-modal')} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{copied === 'share-modal' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button></div></div>
              <button onClick={() => setShowShareModal(false)} className="mt-4 text-sm text-neutral-500 hover:text-neutral-700 w-full text-center">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowWithdrawModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-serif mb-4">Request Withdrawal</h3>
              <div className="space-y-4">
                <div className="bg-primary-50 p-4 rounded-lg"><p className="text-sm text-primary-700 mb-1">Available Balance</p><p className="text-2xl font-bold text-primary-600">${affiliateData.stats.pendingCommissions}</p></div>
                <div><label className="block text-sm font-medium mb-2">Amount to Withdraw</label><input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Enter amount" max={affiliateData.stats.pendingCommissions} min={50} /><p className="text-xs text-neutral-500 mt-1">Minimum: $50</p></div>
                <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-700">
                  <p className="font-medium mb-1">⏰ Payment Schedule</p>
                  <p>• First payment: within 7 working days of first qualifying sale</p>
                  <p>• All subsequent payments: 15th of each month</p>
                  <p>• Minimum payout: $50 · PayPal or bank transfer</p>
                </div>
                <div className="flex gap-2 pt-4"><Button onClick={handleConfirmWithdrawal} disabled={withdrawing} className="flex-1">{withdrawing ? 'Submitting...' : 'Confirm Withdrawal'}</Button><Button variant="outline" className="flex-1" onClick={() => setShowWithdrawModal(false)} disabled={withdrawing}>Cancel</Button></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPaymentModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-serif mb-4">Payment Methods</h3>
              <div className="space-y-4">
                <div className="border rounded-lg p-4"><h4 className="font-medium mb-3 flex items-center gap-2"><Banknote className="w-4 h-4" />Bank Transfer</h4><input type="text" value={paymentForm.bankName} onChange={e => setPaymentForm({ ...paymentForm, bankName: e.target.value })} placeholder="Bank Name" className="w-full p-2 border rounded-lg mb-2" /><input type="text" value={paymentForm.accountName} onChange={e => setPaymentForm({ ...paymentForm, accountName: e.target.value })} placeholder="Account Name" className="w-full p-2 border rounded-lg mb-2" /><input type="text" value={paymentForm.accountNumber} onChange={e => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })} placeholder="Account Number" className="w-full p-2 border rounded-lg mb-2" /><input type="text" value={paymentForm.swiftCode} onChange={e => setPaymentForm({ ...paymentForm, swiftCode: e.target.value })} placeholder="SWIFT Code" className="w-full p-2 border rounded-lg" /></div>
                <div className="border rounded-lg p-4"><h4 className="font-medium mb-3 flex items-center gap-2"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72c.046-.307.308-.54.616-.54h5.768c2.466 0 4.244.754 5.265 2.242 1.02 1.488.946 3.713-.205 5.798-1.424 2.588-3.96 4.03-7.204 4.03h-1.96l-1.012 5.786a.642.642 0 0 1-.632.54z"/></svg>PayPal</h4><input type="email" value={paymentForm.paypalEmail} onChange={e => setPaymentForm({ ...paymentForm, paypalEmail: e.target.value })} placeholder="PayPal Email" className="w-full p-2 border rounded-lg" /></div>
                <div className="flex gap-2 pt-4"><Button onClick={handleSavePaymentDetails} disabled={savingPayment} className="flex-1">{savingPayment ? 'Saving...' : 'Save Changes'}</Button><Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)} disabled={savingPayment}>Cancel</Button></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
