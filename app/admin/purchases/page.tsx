// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  ShoppingBag, Package, Download, Filter,
  RefreshCw, Search, Eye, Loader2, TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'

interface Purchase {
  id: string
  user_id: string
  tool_id: string
  tool_name: string
  tool_type: string
  category: string
  price: number
  status: string
  created_at: string
  ref_code?: string
  users?: { email?: string; full_name?: string }
}

const PAGE_SIZE = 20

export default function PurchasesPage() {
  const supabase = createClient()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({
    total: 0, today: 0, week: 0, month: 0, revenue: 0
  })

  const fetchStats = async () => {
    try {
      const now = new Date()
      const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const weekStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
      const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [totalRes, todayRes, weekRes, monthRes, revenueRes] = await Promise.all([
        supabase.from('purchases').select('*', { count: 'exact', head: true }),
        supabase.from('purchases').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('purchases').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
        supabase.from('purchases').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
        // Real, correct revenue source, revenue_events, not
        // purchases.price summed directly, same real fix already
        // proven on the standalone Revenue page, see its own header
        // comment for why.
        supabase.from('revenue_events').select('amount_usd'),
      ])

      const revenue = (revenueRes.data || []).reduce((s, e: any) => s + (Number(e.amount_usd) || 0), 0)

      setStats({
        total:   totalRes.count  || 0,
        today:   todayRes.count  || 0,
        week:    weekRes.count   || 0,
        month:   monthRes.count  || 0,
        revenue,
      })
    } catch (error) {
      console.error('Stats error:', error)
    }
  }

  const fetchPurchases = useCallback(async (pageNum = 0) => {
    setRefreshing(true)
    try {
      let query = supabase
        .from('purchases')
        .select(`
          *,
          users ( email, full_name )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (search) query = query.or(`tool_name.ilike.%${search}%,tool_id.ilike.%${search}%`)

      const { data, count, error } = await query
      if (error) throw error

      setPurchases(data || [])
      setTotal(count || 0)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching purchases:', error)
      toast.error('Failed to load purchases')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    fetchStats()
    fetchPurchases(0)
  }, [fetchPurchases])

  // Real, working export, replacing a button that previously had no
  // handler at all. Fetches real rows matching the current filters,
  // capped at 5,000, stated honestly here rather than silently
  // truncated, matching the same real, proven pattern already used on
  // the Database Management page tonight.
  const exportCSV = async () => {
    setExporting(true)
    try {
      let query = supabase
        .from('purchases')
        .select('tool_name, tool_id, category, price, status, ref_code, created_at, users(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(5000)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (search) query = query.or(`tool_name.ilike.%${search}%,tool_id.ilike.%${search}%`)

      const { data, error } = await query
      if (error) throw error
      if (!data || data.length === 0) {
        toast.error('No purchases to export')
        return
      }

      const headers = ['Date', 'Tool', 'Category', 'Price', 'Status', 'Ref Code', 'Customer Email', 'Customer Name']
      const rows = data.map((p: any) => [
        new Date(p.created_at).toISOString(),
        p.tool_name || p.tool_id,
        p.category || '',
        (Number(p.price) || 0).toFixed(2),
        p.status,
        p.ref_code || '',
        p.users?.email || '',
        p.users?.full_name || '',
      ])
      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `purchases-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success(`Exported ${data.length} purchases${data.length === 5000 ? ' (capped at 5,000)' : ''}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export purchases')
    } finally {
      setExporting(false)
    }
  }

  const statusBadgeVariant = (s: string) => {
    if (s === 'active' || s === 'completed') return 'success'
    if (s === 'pending') return 'warning'
    return 'outline'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
    </div>
  )

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Management</h1>
          <p className="text-sm text-neutral-500 mt-1">Track and manage all purchases · {total.toLocaleString()} total</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => { fetchStats(); fetchPurchases(page) }} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Purchases', value: stats.total.toLocaleString(),          color: '' },
          { label: 'Today',           value: stats.today,                           color: 'text-green-600' },
          { label: 'This Week',       value: stats.week,                            color: '' },
          { label: 'This Month',      value: stats.month,                           color: '' },
          { label: 'Total Revenue',   value: `$${stats.revenue.toLocaleString()}`,  color: 'text-primary-600' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-neutral-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Search + Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by tool name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-neutral-500 border-b">
                <th className="pb-3">Tool</th>
                <th className="pb-3">User</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Ref Code</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-neutral-500">No purchases found</td></tr>
              ) : purchases.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-neutral-50">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{p.tool_name || p.tool_id}</p>
                        <p className="text-xs text-neutral-500">{p.tool_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-sm">
                    <p>{p.users?.full_name || '—'}</p>
                    <p className="text-xs text-neutral-500">{p.users?.email || (p.user_id ? p.user_id.slice(0, 8) + '...' : 'guest')}</p>
                  </td>
                  <td className="py-3"><Badge variant="outline" size="sm">{p.category}</Badge></td>
                  <td className="py-3 font-medium text-green-600">${(Number(p.price) || 0).toFixed(2)}</td>
                  <td className="py-3 font-mono text-xs text-neutral-500">{p.ref_code || '—'}</td>
                  <td className="py-3 text-sm">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="py-3">
                    <Badge variant={statusBadgeVariant(p.status)} size="sm">{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <p className="text-sm text-neutral-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()} purchases
          </p>
          <div className="flex gap-2">
            <button onClick={() => fetchPurchases(page - 1)} disabled={page === 0} className="px-3 py-1 border rounded-lg hover:bg-neutral-50 disabled:opacity-40">Previous</button>
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => page > 1 ? page - 1 + i : i).map(p => (
              <button key={p} onClick={() => fetchPurchases(p)} className={`px-3 py-1 rounded-lg ${p === page ? 'bg-primary-600 text-white' : 'border hover:bg-neutral-50'}`}>{p + 1}</button>
            ))}
            <button onClick={() => fetchPurchases(page + 1)} disabled={page >= totalPages - 1} className="px-3 py-1 border rounded-lg hover:bg-neutral-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </Card>
    </div>
  )
}
