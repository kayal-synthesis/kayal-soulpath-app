// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Database,
  HardDrive,
  Activity,
  Clock,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'

// Every table name and row count below was previously hardcoded fiction,
// 12,847 users, a 1.2GB backup from a specific date, a 99.98% uptime
// figure, none of it came from a real query. "Backup Now" did nothing
// but wait 3 seconds and claim success. "Restore" did nothing at all.
//
// Real database backups are managed at the infrastructure level in
// Supabase (automatic daily backups, point-in-time recovery on paid
// plans), not something a client-side button in this app can safely or
// honestly trigger. Faking that button gave false confidence about
// something that actually matters. What this page can genuinely and
// safely do: show real row counts per table, and offer a real CSV
// export of the core tables as an actual, working, immediate download,
// while pointing to Supabase's own dashboard for real backup/restore.

const CORE_TABLES = [
  'users', 'affiliate_profiles', 'purchases', 'affiliate_conversions',
  'coupon_usage', 'notifications', 'admin_logs',
]

export default function AdminDatabasePage() {
  const supabase = createClient()
  const [tableCounts, setTableCounts] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  const fetchCounts = async () => {
    setRefreshing(true)
    try {
      const results = await Promise.all(
        CORE_TABLES.map(async (table) => {
          try {
            const { count, error } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true })
            return [table, error ? null : (count ?? 0)] as const
          } catch {
            return [table, null] as const
          }
        })
      )
      setTableCounts(Object.fromEntries(results))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchCounts() }, [])

  const totalRows = Object.values(tableCounts).reduce((s: number, n) => s + (n || 0), 0)

  const handleExport = async (table: string) => {
    setExporting(table)
    try {
      const { data, error } = await supabase.from(table).select('*').limit(5000)
      if (error) throw error
      if (!data || data.length === 0) {
        toast.info(`${table} has no rows to export`)
        return
      }
      const headers = Object.keys(data[0])
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(',')),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${table}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${data.length} rows from ${table}`)
    } catch (err: any) {
      toast.error(err.message || `Failed to export ${table}`)
    } finally {
      setExporting(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <Database className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-serif">Database Management</h1>
              <p className="text-sm text-neutral-500">Real row counts and data export, backups are managed in Supabase directly</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchCounts} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Honest notice about backups, replacing the fake button */}
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">Backups and restores are managed in your Supabase project dashboard</p>
            <p className="text-xs text-blue-600 mt-1">
              Automatic daily backups and point-in-time recovery are handled by Supabase infrastructure, not by anything this page can trigger. What this page can genuinely do is show real row counts and export any table's current data as CSV, below.
            </p>
          </div>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline flex-shrink-0"
          >
            Open Supabase <ExternalLink className="w-3 h-3" />
          </a>
        </Card>

        {/* Stats Cards, real now */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Tables Tracked</p>
            <p className="text-2xl font-serif">{CORE_TABLES.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Total Rows (tracked tables)</p>
            <p className="text-2xl font-serif">{totalRows.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Last Refreshed</p>
            <p className="text-2xl font-serif">{new Date().toLocaleTimeString()}</p>
          </Card>
        </div>

        {/* Tables List, real counts, real export */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Core Tables</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium">Table Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Row Count</th>
                  <th className="text-left py-3 px-4 text-sm font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {CORE_TABLES.map((table) => (
                  <tr key={table} className="border-b hover:bg-neutral-50">
                    <td className="py-3 px-4 font-medium">{table}</td>
                    <td className="py-3 px-4">
                      {tableCounts[table] === null
                        ? <Badge variant="outline" className="text-red-600 border-red-200">Query failed</Badge>
                        : (tableCounts[table] ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleExport(table)}
                        disabled={exporting === table}
                      >
                        {exporting === table
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <><Download className="w-3 h-3 mr-1" />Export CSV</>}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-400 mt-4">
            Export is capped at 5,000 rows per table for browser memory safety. For a full data dump, use Supabase's own export tools directly.
          </p>
        </Card>
      </div>
    </div>
  )
}
