 'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { domains, overallStats } from '@/lib/tools/all-tools-index'
import {
  Gift, Copy, Check, Share2, Users, DollarSign,
  TrendingUp, Clock, Award, BarChart, Settings,
  Loader2, RefreshCw, ChevronRight, Calendar,
  Wallet, CreditCard, Link2, Sparkles,
  Crown, Target, Zap, Shield, Phone,
  Twitter, Facebook, Linkedin, AlertCircle,
  Eye, EyeOff, Download, Home,
  Menu, X, Camera, Flame, Star,
  Headphones, MessageCircle, BookOpen, Infinity,
  LogOut, User, Key, Lock,
  ArrowLeft, Search, Filter, Plus,
  Edit, Trash2, ExternalLink
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

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
  conversions: number
  earnings: number
  conversionRate: number
  status: 'active' | 'paused'
}

interface DashboardData {
  profile: {
    id: string
    name: string
    email: string
    joinDate: string
    tier: 'bronze' | 'silver' | 'gold' | 'platinum'
    accountType: 'affiliate' | 'customer_advocate'
  }
  stats: AffiliateStats
  monthlyStats: Array<{
    month: string
    clicks: number
    conversions: number
    earnings: number
  }>
  topTools: Array<{
    toolId: string
    toolName: string
    toolEmoji: string
    clicks: number
    conversions: number
    earnings: number
    conversionRate: number
  }>
  recentConversions: Array<{
    id: string
    customerEmail: string
    toolName: string
    amount: number
    commission: number
    date: string
    status: 'pending' | 'paid'
  }>
  links: AffiliateLink[]
  commissionRates: {
    base: number
    tier: number
    recurring: number
    total: number
  }
  nextMilestone: {
    type: string
    needed: number
    current: number
    reward: string
  }
  paymentMethods: {
    paypal?: {
      email: string
    }
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AffiliateDashboard() {
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'analytics' | 'payouts' | 'settings'>('overview')
  const [showBalance, setShowBalance] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  
  // Domain view state
  const [selectedDomain, setSelectedDomain] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'domains' | 'tools'>('domains')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'popular'>('popular')
  const [selectedTool, setSelectedTool] = useState<any>(null)
  const [linkName, setLinkName] = useState('')
  const [campaign, setCampaign] = useState('')
  const [source, setSource] = useState('')
  const [medium, setMedium] = useState('')
  const [creating, setCreating] = useState(false)

  // ============================================
  // DATA FETCHING
  // ============================================

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)
      await fetchDashboardData(user.id)
    } catch (error) {
      console.error('Error checking user:', error)
      setLoading(false)
    }
  }

  const fetchDashboardData = async (userId: string) => {
    try {
      setRefreshing(true)
      
      // Mock data - replace with actual API call
      const mockData: DashboardData = {
        profile: {
          id: userId,
          name: 'Sarah Chen',
          email: user?.email || 'sarah@example.com',
          joinDate: '2025-06-15',
          tier: 'silver',
          accountType: 'affiliate'
        },
        stats: {
          totalClicks: 1247,
          uniqueVisitors: 892,
          totalConversions: 47,
          conversionRate: 3.8,
          totalEarnings: 2350.50,
          pendingCommissions: 350.00,
          paidCommissions: 2000.50,
          lifetimeValue: 4850.75,
          averageOrderValue: 52.50,
          recurringRevenue: 125.50,
          rank: 42,
          percentile: 15
        },
        monthlyStats: [
          { month: 'Jan', clicks: 245, conversions: 8, earnings: 320 },
          { month: 'Feb', clicks: 312, conversions: 12, earnings: 480 },
          { month: 'Mar', clicks: 289, conversions: 10, earnings: 400 },
          { month: 'Apr', clicks: 401, conversions: 17, earnings: 680 }
        ],
        topTools: [
          { toolId: 'love-saga', toolName: 'The Love Saga', toolEmoji: '💞', clicks: 456, conversions: 18, earnings: 486, conversionRate: 3.9 },
          { toolId: 'wealth-master', toolName: 'Wealth Mastery', toolEmoji: '💰', clicks: 389, conversions: 12, earnings: 564, conversionRate: 3.1 },
          { toolId: 'voice-pro', toolName: 'Voice of Prophecy', toolEmoji: '🎙️', clicks: 402, conversions: 17, earnings: 629, conversionRate: 4.2 }
        ],
        recentConversions: [
          { id: '1', customerEmail: 'john@example.com', toolName: 'The Love Saga', amount: 27, commission: 4.05, date: '2026-03-10', status: 'paid' },
          { id: '2', customerEmail: 'jane@example.com', toolName: 'Wealth Mastery', amount: 47, commission: 7.05, date: '2026-03-09', status: 'paid' },
          { id: '3', customerEmail: 'bob@example.com', toolName: 'Voice Pro', amount: 37, commission: 7.40, date: '2026-03-08', status: 'pending' }
        ],
        links: [],
        commissionRates: {
          base: 15,
          tier: 0,
          recurring: 10,
          total: 25
        },
        nextMilestone: {
          type: 'Gold Tier',
          needed: 100,
          current: 47,
          reward: '20% commission + $100 bonus'
        },
        paymentMethods: {
          paypal: {
            email: 'sarah@example.com'
          }
        }
      }

      setData(mockData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleRequestPayout = () => {
    if (!data?.stats) return
    if (data.stats.pendingCommissions < 50) {
      alert('Minimum payout amount is $50')
      return
    }
    setShowWithdrawModal(true)
  }

  const handleDomainClick = (domain: any) => {
    setSelectedDomain(domain)
    setViewMode('tools')
  }

  const handleBackToDomains = () => {
    setViewMode('domains')
    setSelectedDomain(null)
    setSearchQuery('')
  }

  const handleGenerateLink = (tool: any) => {
    setSelectedTool(tool)
    setLinkName(`${tool.name} Affiliate Link`)
    setShowLinkModal(true)
  }

  const createLink = async () => {
    if (!selectedTool || !linkName) return
    
    setCreating(true)
    
    // Simulate API call
    setTimeout(() => {
      setCreating(false)
      setShowLinkModal(false)
      setSelectedTool(null)
      setLinkName('')
      setCampaign('')
      setSource('')
      setMedium('')
      alert('Link created successfully!')
    }, 1000)
  }

  // Filter and sort tools
  const filteredTools = selectedDomain?.tools
    .filter((tool: any) => 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a: any, b: any) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'price') return a.price - b.price
      return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0)
    }) || []

  // ============================================
  // LOADING STATES
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-neutral-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Users className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-2xl font-serif mb-4">Not Signed In</h2>
          <p className="text-neutral-600 mb-6">Please sign in to view your dashboard.</p>
          <Button onClick={() => router.push('/auth/login')}>Sign In</Button>
        </Card>
      </div>
    )
  }

  const navigation = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'links', label: 'Link Manager', icon: Link2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { id: 'payouts', label: 'Payouts', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/member/dashboard')}
                className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Gift className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold">Affiliate Hub</span>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1 ml-4">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        activeTab === item.id
                          ? 'bg-primary-100 text-primary-700'
                          : 'hover:bg-neutral-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <Badge variant="primary" className="hidden sm:inline-flex">
                {data.profile.tier} Tier
              </Badge>

              <button
                onClick={() => fetchDashboardData(user.id)}
                disabled={refreshing}
                className="p-2 hover:bg-neutral-100 rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="hidden lg:flex items-center gap-2 pl-2 border-l">
                <span className="text-sm font-medium">{data.profile.name}</span>
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  {data.profile.name.charAt(0)}
                </div>
              </div>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs py-2 border-t text-neutral-500">
            <button onClick={() => router.push('/member/dashboard')} className="hover:text-primary-600">
              Dashboard
            </button>
            <ChevronRight className="w-3 h-3" />
            {viewMode === 'tools' && selectedDomain ? (
              <>
                <button onClick={handleBackToDomains} className="hover:text-primary-600">
                  Link Manager
                </button>
                <ChevronRight className="w-3 h-3" />
                <span className="text-primary-600 font-medium">{selectedDomain.name}</span>
              </>
            ) : (
              <span className="text-primary-600 font-medium">Affiliate Hub</span>
            )}
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden border-t py-2"
              >
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any)
                        setMobileMenuOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                        activeTab === item.id ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  )
                })}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-3 px-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      {data.profile.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{data.profile.name}</p>
                      <p className="text-xs text-neutral-500">{data.profile.email}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Welcome Card */}
            <Card className="p-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    Welcome back, {data.profile.name}! 👋
                  </h2>
                  <p className="text-primary-100 text-sm">
                    You're earning <span className="font-bold text-white">{data.commissionRates.total}%</span> commission
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-primary-200">Affiliate since</p>
                  <p className="text-sm font-medium">{new Date(data.profile.joinDate).toLocaleDateString()}</p>
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-neutral-500">Available</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-2xl font-bold text-primary-600">
                    {showBalance ? `$${data.stats.pendingCommissions}` : '••••'}
                  </p>
                  <button onClick={() => setShowBalance(!showBalance)}>
                    {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-xs text-neutral-500">Earnings</p>
                <p className="text-2xl font-bold mt-1">${data.stats.totalEarnings}</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs text-neutral-500">Clicks</p>
                <p className="text-2xl font-bold mt-1">{data.stats.totalClicks}</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs text-neutral-500">Conversions</p>
                <p className="text-2xl font-bold mt-1">{data.stats.totalConversions}</p>
              </Card>
            </div>

            {/* Performance Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Monthly Performance */}
              <Card className="p-5">
                <h3 className="text-sm font-medium mb-4">Monthly Performance</h3>
                <div className="h-48 flex items-end justify-between gap-2">
                  {data.monthlyStats.map((stat) => (
                    <div key={stat.month} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-primary-100 rounded-t-lg h-32 relative">
                        <div 
                          className="absolute bottom-0 w-full bg-primary-600 rounded-t-lg"
                          style={{ height: `${(stat.earnings / 700) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-500">{stat.month}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Top Tools */}
              <Card className="p-5">
                <h3 className="text-sm font-medium mb-4">Top Tools</h3>
                <div className="space-y-3">
                  {data.topTools.map((tool) => (
                    <div key={tool.toolId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{tool.toolEmoji}</span>
                        <div>
                          <p className="text-sm font-medium">{tool.toolName}</p>
                          <p className="text-xs text-neutral-500">{tool.clicks} clicks</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-primary-600">${tool.earnings}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Recent Conversions */}
            <Card className="p-5">
              <h3 className="text-sm font-medium mb-4">Recent Conversions</h3>
              <div className="space-y-3">
                {data.recentConversions.map((conv) => (
                  <div key={conv.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{conv.toolName}</p>
                      <p className="text-xs text-neutral-500">{conv.customerEmail}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-primary-600">+${conv.commission}</p>
                      <Badge variant={conv.status === 'paid' ? 'primary' : 'secondary'} size="sm">
                        {conv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Next Milestone */}
            <Card className="p-5 bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Next Milestone: {data.nextMilestone.type}</h3>
                <Badge variant="secondary">+{data.nextMilestone.reward}</Badge>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-amber-600 h-2 rounded-full"
                  style={{ width: `${(data.nextMilestone.current / data.nextMilestone.needed) * 100}%` }}
                />
              </div>
              <p className="text-sm text-amber-700">
                {data.nextMilestone.current} / {data.nextMilestone.needed} conversions
              </p>
            </Card>
          </div>
        )}

        {/* LINKS TAB */}
        {activeTab === 'links' && (
          <div className="space-y-6">
            {viewMode === 'domains' ? (
              /* Domain Cards View */
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">Link Manager</h2>
                  <Badge variant="primary">{overallStats.totalTools} tools</Badge>
                </div>

                {/* Domain Cards Grid - 3 per row */}
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
                      <Button className="w-full" size="sm">View Tools</Button>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              /* Tools View */
              selectedDomain && (
                <>
                  <div className="flex items-center gap-4">
                    <button onClick={handleBackToDomains} className="p-2 hover:bg-neutral-100 rounded-lg">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-medium">{selectedDomain.name}</h2>
                  </div>

                  {/* Search and Sort */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search tools..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border rounded-lg"
                      />
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="popular">Most Popular</option>
                      <option value="name">Name</option>
                      <option value="price">Price</option>
                    </select>
                  </div>

                  {/* Tools Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTools.map((tool: any) => (
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
                            <Badge variant="secondary" size="sm" className="bg-amber-100 text-amber-700">
                              <Flame className="w-3 h-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-neutral-600 line-clamp-2 mb-3">
                          {tool.subtitle || tool.shortDescription}
                        </p>

                        {tool.requiresImage && (
                          <div className="mb-3 text-xs text-amber-600 flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            Requires images
                          </div>
                        )}

                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleGenerateLink(tool)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Generate Link
                        </Button>
                      </Card>
                    ))}
                  </div>
                </>
              )
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Analytics</h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-neutral-500">CTR</p>
                <p className="text-2xl font-bold text-primary-600">{data.stats.conversionRate}%</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-neutral-500">AOV</p>
                <p className="text-2xl font-bold text-green-600">${data.stats.averageOrderValue}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-neutral-500">Recurring</p>
                <p className="text-2xl font-bold text-amber-600">${data.stats.recurringRevenue}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-neutral-500">Visitors</p>
                <p className="text-2xl font-bold">{data.stats.uniqueVisitors}</p>
              </Card>
            </div>
          </div>
        )}

        {/* PAYOUTS TAB */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Payouts</h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-5 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
                <p className="text-sm text-primary-100">Available</p>
                <p className="text-3xl font-bold mt-2">${data.stats.pendingCommissions}</p>
                <Button
                  onClick={handleRequestPayout}
                  size="sm"
                  className="mt-4 bg-white text-primary-700"
                  disabled={data.stats.pendingCommissions < 50}
                >
                  Request Payout
                </Button>
              </Card>

              <Card className="p-5">
                <p className="text-sm text-neutral-500">Paid</p>
                <p className="text-3xl font-bold text-green-600 mt-2">${data.stats.paidCommissions}</p>
              </Card>

              <Card className="p-5">
                <p className="text-sm text-neutral-500">Next</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">15th</p>
              </Card>
            </div>

            {/* Payment Method */}
            {data.paymentMethods.paypal && (
              <Card className="p-5">
                <h3 className="text-sm font-medium mb-3">Payment Method</h3>
                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72c.046-.307.308-.54.616-.54h5.768c2.466 0 4.244.754 5.265 2.242 1.02 1.488.946 3.713-.205 5.798-1.424 2.588-3.96 4.03-7.204 4.03h-1.96l-1.012 5.786a.642.642 0 0 1-.632.54z"/>
                    </svg>
                  </div>
                  <span className="text-sm">{data.paymentMethods.paypal.email}</span>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-lg font-medium">Settings</h2>
            
            {/* Profile */}
            <Card className="p-5">
              <h3 className="font-medium mb-3">Profile</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-neutral-500">Name</span>
                  <span className="font-medium">{data.profile.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-neutral-500">Email</span>
                  <span className="font-medium">{data.profile.email}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-neutral-500">Member since</span>
                  <span className="font-medium">{new Date(data.profile.joinDate).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>

            {/* Security */}
            <Card className="p-5">
              <h3 className="font-medium mb-3">Security</h3>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </Card>

            {/* Sign Out */}
            <Button 
              onClick={handleLogout}
              variant="outline" 
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        )}
      </main>

      {/* Generate Link Modal */}
      <AnimatePresence>
        {showLinkModal && selectedTool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowLinkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl max-w-md w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium mb-4">Generate Link</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
                  <span className="text-3xl">{selectedTool.emoji}</span>
                  <div>
                    <p className="font-medium">{selectedTool.name}</p>
                    <p className="text-sm text-primary-600">${selectedTool.price} · {data.commissionRates.base}% commission</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Link Name</label>
                  <input
                    type="text"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g., Facebook Campaign"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">UTM Parameters (Optional)</label>
                  <input
                    type="text"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    className="w-full p-2 border rounded-lg mb-2"
                    placeholder="Campaign"
                  />
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full p-2 border rounded-lg mb-2"
                    placeholder="Source"
                  />
                  <input
                    type="text"
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Medium"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={createLink} disabled={creating || !linkName} className="flex-1">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowLinkModal(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowWithdrawModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl max-w-md w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium mb-4">Request Withdrawal</h3>
              
              <div className="space-y-4">
                <div className="bg-primary-50 p-3 rounded-lg">
                  <p className="text-sm text-primary-700">Available Balance</p>
                  <p className="text-2xl font-bold text-primary-600">${data.stats.pendingCommissions}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg"
                    placeholder="Enter amount"
                    max={data.stats.pendingCommissions}
                    min={50}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setShowWithdrawModal(false)} className="flex-1">
                    Confirm
                  </Button>
                  <Button variant="outline" onClick={() => setShowWithdrawModal(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}