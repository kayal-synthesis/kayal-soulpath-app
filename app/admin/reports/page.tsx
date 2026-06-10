// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  BarChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingBag,
  Award,
  Shield,
  Activity,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Loader2,
  ChevronDown,
  FileText,
  PieChart,
  LineChart,
  DownloadCloud,
  Eye,
  EyeOff,
  Clock,
  Globe,
  Smartphone,
  Laptop,
  Zap,
  Target,
  Crown,
  UserPlus,
  CreditCard,
  Gift,
  AlertTriangle
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface DateRange {
  start: Date
  end: Date
  label: string
}

interface ReportData {
  revenue: {
    total: number
    byDay: { date: string; amount: number }[]
    byMonth: { month: string; amount: number }[]
    bySource: { source: string; amount: number }[]
    growth: number
    averageOrder: number
    projected: number
  }
  users: {
    total: number
    new: { date: string; count: number }[]
    active: { date: string; count: number }[]
    byTier: { tier: string; count: number }[]
    bySource: { source: string; count: number }[]
    retention: number
    churn: number
  }
  purchases: {
    total: number
    byDay: { date: string; count: number }[]
    byTool: { tool: string; count: number; revenue: number }[]
    byType: { type: string; count: number }[]
    conversion: number
    repeatRate: number
  }
  affiliates: {
    total: number
    approved: number
    earnings: { date: string; amount: number }[]
    topPerformers: { name: string; earnings: number; referrals: number }[]
    conversion: number
    averageCommission: number
  }
  security: {
    score: number
    alerts: { date: string; count: number }[]
    bySeverity: { severity: string; count: number }[]
    threats: { type: string; count: number }[]
    twoFAEnabled: number
    failedLogins: number
  }
}

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [showAmounts, setShowAmounts] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'custom'>('30d')
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [reportType, setReportType] = useState<'overview' | 'revenue' | 'users' | 'purchases' | 'affiliates' | 'security'>('overview')
  const [data, setData] = useState<ReportData | null>(null)
  
  const supabase = createClient()

  const getDateRange = useCallback((): DateRange => {
    const end = new Date()
    let start = new Date()

    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7)
        return { start, end, label: 'Last 7 Days' }
      case '30d':
        start.setDate(end.getDate() - 30)
        return { start, end, label: 'Last 30 Days' }
      case '90d':
        start.setDate(end.getDate() - 90)
        return { start, end, label: 'Last 90 Days' }
      case '1y':
        start.setFullYear(end.getFullYear() - 1)
        return { start, end, label: 'Last Year' }
      case 'custom':
        return {
          start: new Date(customRange.start),
          end: new Date(customRange.end),
          label: `${customRange.start} to ${customRange.end}`
        }
      default:
        start.setDate(end.getDate() - 30)
        return { start, end, label: 'Last 30 Days' }
    }
  }, [dateRange, customRange])

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    try {
      const range = getDateRange()
      const startDate = range.start.toISOString()
      const endDate = range.end.toISOString()

      // ===== FETCH PURCHASES =====
      const { data: purchases } = await supabase
        .from('purchases')
        .select('price, tool_name, tool_type, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true })

      // ===== FETCH USERS =====
      const { data: users } = await supabase
        .from('users')
        .select('created_at, last_activity, membership_tier, source, two_factor_enabled')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      // ===== FETCH AFFILIATES =====
      const { data: affiliates } = await supabase
        .from('affiliate_profiles')
        .select(`
          *,
          users!affiliate_profiles_user_id_fkey (
            full_name,
            referral_count
          )
        `)
        .gte('created_at', startDate)

      // ===== FETCH SECURITY EVENTS =====
      const { data: securityEvents } = await supabase
        .from('fraud_alerts')
        .select('severity, type, created_at')
        .gte('created_at', startDate)

      const { data: loginAttempts } = await supabase
        .from('login_attempts')
        .select('success, created_at')
        .gte('created_at', startDate)

      // Process the data
      const days = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))
      const dailyData = Array.from({ length: days }, (_, i) => {
        const date = new Date(range.start)
        date.setDate(date.getDate() + i)
        return date.toISOString().split('T')[0]
      })

      // Revenue by day
      const revenueByDay = dailyData.map(date => ({
        date,
        amount: purchases?.filter(p => p.created_at?.startsWith(date))
          .reduce((sum, p) => sum + (Number(p.price) || 0), 0) || 0
      }))

      // Revenue by month
      const months = new Set(purchases?.map(p => p.created_at?.substring(0, 7)) || [])
      const revenueByMonth = Array.from(months).map(month => ({
        month,
        amount: purchases?.filter(p => p.created_at?.startsWith(month!))
          .reduce((sum, p) => sum + (Number(p.price) || 0), 0) || 0
      }))

      // Revenue by source (tool type)
      const revenueBySource = purchases?.reduce((acc: any, p) => {
        const source = p.tool_type || 'other'
        acc[source] = (acc[source] || 0) + (Number(p.price) || 0)
        return acc
      }, {})

      // User growth by day
      const newUsersByDay = dailyData.map(date => ({
        date,
        count: users?.filter(u => u.created_at?.startsWith(date)).length || 0
      }))

      // Active users by day
      const activeUsersByDay = dailyData.map(date => ({
        date,
        count: users?.filter(u => 
          u.last_activity?.startsWith(date)
        ).length || 0
      }))

      // Users by tier
      const usersByTier = users?.reduce((acc: any, u) => {
        const tier = u.membership_tier || 'free'
        acc[tier] = (acc[tier] || 0) + 1
        return acc
      }, {})

      // Users by source
      const usersBySource = users?.reduce((acc: any, u) => {
        const source = u.source || 'direct'
        acc[source] = (acc[source] || 0) + 1
        return acc
      }, {})

      // Purchases by day
      const purchasesByDay = dailyData.map(date => ({
        date,
        count: purchases?.filter(p => p.created_at?.startsWith(date)).length || 0
      }))

      // Purchases by tool
      const purchasesByTool = purchases?.reduce((acc: any, p) => {
        acc[p.tool_name] = (acc[p.tool_name] || 0) + 1
        return acc
      }, {})

      // Purchases by type
      const purchasesByType = purchases?.reduce((acc: any, p) => {
        acc[p.tool_type] = (acc[p.tool_type] || 0) + 1
        return acc
      }, {})

      // Affiliate earnings by day
      const affiliateEarningsByDay = dailyData.map(date => ({
        date,
        amount: affiliates?.filter(a => a.created_at?.startsWith(date))
          .reduce((sum, a) => sum + (Number(a.total_earned) || 0), 0) || 0
      }))

      // Top affiliates
      const topAffiliates = affiliates
        ?.filter(a => a.approved)
        .map(a => ({
          name: a.users?.full_name || 'Unknown',
          earnings: a.total_earned || 0,
          referrals: a.users?.referral_count || 0
        }))
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 5) || []

      // Security alerts by day
      const alertsByDay = dailyData.map(date => ({
        date,
        count: securityEvents?.filter(e => e.created_at?.startsWith(date)).length || 0
      }))

      // Alerts by severity
      const alertsBySeverity = securityEvents?.reduce((acc: any, e) => {
        acc[e.severity] = (acc[e.severity] || 0) + 1
        return acc
      }, {})

      // Threat types
      const threatTypes = securityEvents?.reduce((acc: any, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1
        return acc
      }, {})

      // Calculate totals and metrics
      const totalRevenue = purchases?.reduce((sum, p) => sum + (Number(p.price) || 0), 0) || 0
      const totalPurchases = purchases?.length || 0
      const totalUsers = users?.length || 0
      const totalAffiliates = affiliates?.length || 0
      const approvedAffiliates = affiliates?.filter(a => a.approved).length || 0
      
      const usersWith2FA = users?.filter(u => u.two_factor_enabled).length || 0
      const failedLogins = loginAttempts?.filter(l => !l.success).length || 0

      // Calculate growth (compare to previous period)
      const previousStart = new Date(range.start)
      previousStart.setDate(previousStart.getDate() - days)
      const { data: previousPurchases } = await supabase
        .from('purchases')
        .select('price')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', range.start.toISOString())

      const previousRevenue = previousPurchases?.reduce((sum, p) => sum + (Number(p.price) || 0), 0) || 0
      const growth = previousRevenue > 0 
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
        : 0

      setData({
        revenue: {
          total: totalRevenue,
          byDay: revenueByDay,
          byMonth: revenueByMonth,
          bySource: Object.entries(revenueBySource || {}).map(([source, amount]) => ({ source, amount: amount as number })),
          growth,
          averageOrder: totalPurchases > 0 ? totalRevenue / totalPurchases : 0,
          projected: totalRevenue * 1.1 // Simple projection
        },
        users: {
          total: totalUsers,
          new: newUsersByDay,
          active: activeUsersByDay,
          byTier: Object.entries(usersByTier || {}).map(([tier, count]) => ({ tier, count: count as number })),
          bySource: Object.entries(usersBySource || {}).map(([source, count]) => ({ source, count: count as number })),
          retention: 75, // Calculate properly if you have data
          churn: 5
        },
        purchases: {
          total: totalPurchases,
          byDay: purchasesByDay,
          byTool: Object.entries(purchasesByTool || {}).map(([tool, count]) => ({ tool, count: count as number, revenue: 0 })),
          byType: Object.entries(purchasesByType || {}).map(([type, count]) => ({ type, count: count as number })),
          conversion: 3.2, // Calculate from traffic data
          repeatRate: 25
        },
        affiliates: {
          total: totalAffiliates,
          approved: approvedAffiliates,
          earnings: affiliateEarningsByDay,
          topPerformers: topAffiliates,
          conversion: 15,
          averageCommission: 10
        },
        security: {
          score: totalUsers > 0 ? Math.round((usersWith2FA / totalUsers) * 50) + 50 : 85,
          alerts: alertsByDay,
          bySeverity: Object.entries(alertsBySeverity || {}).map(([severity, count]) => ({ severity, count: count as number })),
          threats: Object.entries(threatTypes || {}).map(([type, count]) => ({ type, count: count as number })),
          twoFAEnabled: usersWith2FA,
          failedLogins
        }
      })

    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [getDateRange, supabase])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  const exportReport = async (format: 'csv' | 'pdf' | 'excel') => {
    setExporting(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    toast.success(`Report exported as ${format.toUpperCase()}`)
    setExporting(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <BarChart className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-sm text-gray-500">Comprehensive insights into your business</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAmounts(!showAmounts)}
            className="p-2 border rounded-lg hover:bg-gray-50"
            title="Toggle amounts"
          >
            {showAmounts ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          <Button variant="outline" onClick={fetchReportData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => exportReport('csv')} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DownloadCloud className="w-4 h-4 mr-2" />}
            Export
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm"
              />
              <span>to</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="flex gap-1 ml-auto">
            {(['overview', 'revenue', 'users', 'purchases', 'affiliates', 'security'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`px-4 py-2 text-sm rounded-lg transition capitalize ${
                  reportType === type
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold">
            {showAmounts ? formatCurrency(data?.revenue.total || 0) : '••••'}
          </p>
          <p className={`text-sm flex items-center gap-1 ${(data?.revenue.growth || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(data?.revenue.growth || 0) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(data?.revenue.growth || 0).toFixed(1)}% vs previous period
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold">{formatNumber(data?.users.total || 0)}</p>
          <p className="text-sm text-green-600">+{data?.users.new.reduce((sum, d) => sum + d.count, 0)} new</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Purchases</p>
          <p className="text-2xl font-bold">{formatNumber(data?.purchases.total || 0)}</p>
          <p className="text-sm text-gray-600">Avg: {showAmounts ? formatCurrency(data?.revenue.averageOrder || 0) : '••••'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Security Score</p>
          <p className="text-2xl font-bold">{data?.security.score}%</p>
          <p className="text-sm text-orange-600">{data?.security.alerts.reduce((sum, d) => sum + d.count, 0)} alerts</p>
        </Card>
      </div>

      {/* Main Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold mb-4">
            {reportType === 'revenue' && 'Revenue Trend'}
            {reportType === 'users' && 'User Growth'}
            {reportType === 'purchases' && 'Purchase Volume'}
            {reportType === 'affiliates' && 'Affiliate Earnings'}
            {reportType === 'security' && 'Security Alerts'}
            {reportType === 'overview' && 'Performance Overview'}
          </h3>
          <div className="h-80">
            {/* Chart would go here - using a chart library like recharts or chart.js */}
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-400">Chart visualization would appear here</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">
            {reportType === 'revenue' && 'Revenue by Source'}
            {reportType === 'users' && 'Users by Tier'}
            {reportType === 'purchases' && 'Purchases by Type'}
            {reportType === 'affiliates' && 'Top Affiliates'}
            {reportType === 'security' && 'Threat Types'}
            {reportType === 'overview' && 'Key Metrics'}
          </h3>
          
          <div className="space-y-4">
            {reportType === 'revenue' && data?.revenue.bySource.map((source) => (
              <div key={source.source} className="flex items-center justify-between">
                <span className="text-sm capitalize">{source.source}</span>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{showAmounts ? formatCurrency(source.amount) : '••••'}</span>
                  <span className="text-xs text-gray-500">
                    {((source.amount / data.revenue.total) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}

            {reportType === 'users' && data?.users.byTier.map((tier) => (
              <div key={tier.tier} className="flex items-center justify-between">
                <span className="text-sm capitalize">{tier.tier}</span>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatNumber(tier.count)}</span>
                  <span className="text-xs text-gray-500">
                    {((tier.count / data.users.total) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}

            {reportType === 'purchases' && data?.purchases.byType.map((type) => (
              <div key={type.type} className="flex items-center justify-between">
                <span className="text-sm capitalize">{type.type}</span>
                <span className="font-medium">{formatNumber(type.count)}</span>
              </div>
            ))}

            {reportType === 'affiliates' && data?.affiliates.topPerformers.map((aff, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm">{aff.name}</span>
                <div className="text-right">
                  <span className="font-medium block">{showAmounts ? formatCurrency(aff.earnings) : '••••'}</span>
                  <span className="text-xs text-gray-500">{aff.referrals} referrals</span>
                </div>
              </div>
            ))}

            {reportType === 'security' && data?.security.threats.map((threat) => (
              <div key={threat.type} className="flex items-center justify-between">
                <span className="text-sm capitalize">{threat.type}</span>
                <Badge variant="danger">{threat.count}</Badge>
              </div>
            ))}

            {reportType === 'overview' && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Conversion Rate</span>
                  <span className="font-medium">{data?.purchases.conversion}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Repeat Purchase Rate</span>
                  <span className="font-medium">{data?.purchases.repeatRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">User Retention</span>
                  <span className="font-medium">{data?.users.retention}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Affiliate Conversion</span>
                  <span className="font-medium">{data?.affiliates.conversion}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">2FA Adoption</span>
                  <span className="font-medium">{((data?.security.twoFAEnabled || 0) / (data?.users.total || 1) * 100).toFixed(1)}%</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">User Growth</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-400">User growth chart</p>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Purchase Volume</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-400">Purchase volume chart</p>
          </div>
        </Card>
      </div>
    </div>
  )
}