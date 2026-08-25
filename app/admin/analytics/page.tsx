'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Download,
  Info,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

// Every number and every month of both charts on this page used to be a
// hardcoded array, $187,234 total revenue, 8,234 active users, none of
// it from a real query. Revenue and user growth below are now real,
// grouped from actual purchases/users rows. The Engagement tab is left
// honest rather than replaced with a different set of invented numbers:
// session duration, bounce rate, and device breakdown aren't derivable
// from anything in this codebase, that needs a real analytics service
// (Google Analytics, Mixpanel, etc.), not a Supabase query pretending
// to be one.

function monthLabel(d: Date) {
  return d.toLocaleDateString('en', { month: 'short' })
}

export default function AdminAnalyticsPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('revenue')
  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [userData, setUserData] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalRevenue: 0, revenueGrowth: 0,
    activeUsers: 0, userGrowth: 0,
    avgOrderValue: 0,
  })

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        const now = new Date()
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

        const [{ data: purchases }, { data: users }, { data: revenueEvents }] = await Promise.all([
          supabase.from('purchases').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
          supabase.from('users').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
          // Real, correct revenue source, revenue_events, not
          // purchases.price summed directly, same real fix already
          // proven on the standalone Revenue page, see its own header
          // comment for why.
          supabase.from('revenue_events').select('amount_usd, created_at').gte('created_at', sixMonthsAgo.toISOString()).not('amount_usd', 'is', null),
        ])

        // Group into 6 real monthly buckets
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
          return { key: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabel(d), start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1) }
        })

        const revByMonth = months.map(m => {
          const inMonth = (revenueEvents || []).filter(e => {
            const t = new Date(e.created_at)
            return t >= m.start && t < m.end
          })
          return {
            month: m.label,
            revenue: inMonth.reduce((s, e) => s + (Number(e.amount_usd) || 0), 0),
          }
        })

        const usersByMonth = months.map(m => {
          const newInMonth = (users || []).filter(u => {
            const t = new Date(u.created_at)
            return t >= m.start && t < m.end
          }).length
          return { month: m.label, new: newInMonth }
        })

        // Running total for "total users" line
        let running = 0
        const usersWithTotal = usersByMonth.map(u => {
          running += u.new
          return { ...u, total: running }
        })

        setRevenueData(revByMonth)
        setUserData(usersWithTotal)

        const totalRevenue = revByMonth.reduce((s, m) => s + m.revenue, 0)
        const thisMonth = revByMonth[revByMonth.length - 1]?.revenue || 0
        const lastMonth = revByMonth[revByMonth.length - 2]?.revenue || 0
        const revenueGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0

        const { count: activeUsers } = await supabase.from('users').select('*', { count: 'exact', head: true })
        const totalOrders = (purchases || []).length
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

        setStats({
          totalRevenue,
          revenueGrowth: Math.round(revenueGrowth * 10) / 10,
          activeUsers: activeUsers || 0,
          userGrowth: 0, // needs a real prior-period comparison, left at 0 rather than invented
          avgOrderValue,
        })
      } catch (err) {
        console.error('Analytics fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  // Real, working export, replacing a button that previously had no
  // handler at all. Exports the same real, monthly revenue and user
  // data already shown in the two charts on this page, matching the
  // same real, proven pattern already used elsewhere tonight.
  const exportCSV = () => {
    if (revenueData.length === 0) {
      toast.error('No data to export')
      return
    }
    const headers = ['Month', 'Revenue', 'New Users', 'Total Users']
    const rows = revenueData.map((r, i) => [
      r.month,
      r.revenue.toFixed(2),
      userData[i]?.new ?? '',
      userData[i]?.total ?? '',
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-6mo-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported 6-month analytics')
  }

  const tabs = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'users', label: 'Users' },
    { id: 'engagement', label: 'Engagement' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-serif">Analytics</h1>
              <p className="text-sm text-neutral-500">Real revenue and user data from the last 6 months</p>
            </div>
          </div>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Stats Cards, real now */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Total Revenue (6mo)</p>
            <p className="text-2xl font-serif">${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className={`text-xs ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth}% vs last month
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Total Users</p>
            <p className="text-2xl font-serif">{stats.activeUsers.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Avg. Order Value</p>
            <p className="text-2xl font-serif">${stats.avgOrderValue.toFixed(2)}</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

        {/* Revenue Chart, real data */}
        {activeTab === 'revenue' && (
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Revenue, Last 6 Months</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#5D3FD3" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Users Chart, real data */}
        {activeTab === 'users' && (
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">User Growth, Last 6 Months</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#5D3FD3" strokeWidth={2} name="Total Users" />
                  <Line type="monotone" dataKey="new" stroke="#D4AF37" strokeWidth={2} name="New This Month" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Engagement, honest empty state instead of fabricated numbers */}
        {activeTab === 'engagement' && (
          <Card className="p-8 text-center">
            <Info className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-2">Engagement metrics aren't tracked yet</h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              Session duration, bounce rate, and device breakdown need a real analytics service, Google Analytics, Plausible, or similar, connected to the site. Nothing in the current database tracks these, so this tab previously showed invented numbers rather than admit that. Connect a real analytics tool to populate this honestly.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
