// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Activity, User, DollarSign,
  Settings, Mail, Download,
  Filter, Search, Calendar, Clock,
  AlertTriangle, CheckCircle, Info,
  Eye, Loader2, RefreshCw
} from 'lucide-react'

interface ActivityLog {
  id: string
  admin_id: string | null
  action: string
  resource?: string
  details?: any
  ip_address?: string
  created_at: string
  admin?: { name?: string; email?: string }
}

const ACTION_META: Record<string, { icon: any; color: string; severity: string }> = {
  login:              { icon: User,        color: 'bg-blue-100 text-blue-600',     severity: 'info' },
  settings_updated:   { icon: Settings,    color: 'bg-blue-100 text-blue-600',     severity: 'info' },
  tool_executed:      { icon: Activity,    color: 'bg-yellow-100 text-yellow-600', severity: 'info' },
  payout_marked_paid: { icon: DollarSign,  color: 'bg-purple-100 text-purple-600', severity: 'success' },
  user_created:       { icon: User,        color: 'bg-green-100 text-green-600',   severity: 'success' },
  newsletter_sent:    { icon: Mail,        color: 'bg-blue-100 text-blue-600',     severity: 'info' },
  affiliate_approved: { icon: CheckCircle, color: 'bg-green-100 text-green-600',   severity: 'success' },
  affiliate_rejected: { icon: AlertTriangle, color: 'bg-red-100 text-red-600',     severity: 'warning' },
}

const DEFAULT_META = { icon: Info, color: 'bg-gray-100 text-gray-600', severity: 'info' }

const PAGE_SIZE = 20

export default function ActivityPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  const fetchLogs = useCallback(async (pageNum = 0) => {
    setRefreshing(true)
    try {
      let query = supabase
        .from('admin_logs')
        .select('*, admin:admin_users(name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1)

      if (filter !== 'all') query = query.eq('action', filter)
      if (search)           query = query.ilike('action', `%${search}%`)

      const { data, count, error } = await query
      if (error) throw error
      setLogs(data || [])
      setTotal(count || 0)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter, search])

  useEffect(() => { fetchLogs(0) }, [fetchLogs])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    if (diff < 60000)    return `${Math.floor(diff/1000)}s ago`
    if (diff < 3600000)  return `${Math.floor(diff/60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
    return d.toLocaleDateString()
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
          <h1 className="text-2xl font-bold">Activity Log</h1>
          <p className="text-sm text-neutral-500 mt-1">Complete audit trail — {total.toLocaleString()} total entries</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => fetchLogs(page)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export Logs</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search activity..."
              value={search}
              onChange={e => { setSearch(e.target.value) }}
              className="w-full pl-9 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="all">All Activities</option>
            <option value="login">Logins</option>
            <option value="tool_executed">Admin Tools</option>
            <option value="payout_marked_paid">Payouts</option>
            <option value="user_created">New Users</option>
            <option value="settings_updated">Settings Changes</option>
          </select>
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-6">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No activity logs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => {
              const meta = ACTION_META[log.action] ?? DEFAULT_META
              const Icon = meta.icon
              return (
                <div key={log.id} className="flex items-start gap-4 p-3 hover:bg-neutral-50 rounded-lg">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
                      <span className="text-xs text-neutral-400 flex-shrink-0">{formatTime(log.created_at)}</span>
                    </div>
                    {log.admin && (
                      <p className="text-sm text-neutral-600 mt-0.5">
                        By: {log.admin.name || log.admin.email || log.admin_id}
                      </p>
                    )}
                    {log.resource && <p className="text-sm text-neutral-500">Resource: {log.resource}</p>}
                    {log.details && (
                      <p className="text-xs text-neutral-400 mt-1 truncate">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                      </p>
                    )}
                    {log.ip_address && <p className="text-xs text-neutral-400">IP: {log.ip_address}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <p className="text-sm text-neutral-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()} activities
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page === 0}
              className="px-3 py-1 border rounded-lg hover:bg-neutral-50 disabled:opacity-40"
            >Previous</button>
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => page > 1 ? page - 1 + i : i).map(p => (
              <button
                key={p}
                onClick={() => fetchLogs(p)}
                className={`px-3 py-1 rounded-lg ${p === page ? 'bg-primary-600 text-white' : 'border hover:bg-neutral-50'}`}
              >{p + 1}</button>
            ))}
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 border rounded-lg hover:bg-neutral-50 disabled:opacity-40"
            >Next</button>
          </div>
        </div>
      </Card>
    </div>
  )
}
