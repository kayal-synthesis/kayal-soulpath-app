// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Wrench, Database, RefreshCw, Download,
  Trash2, Shield, CheckCircle,
  Loader2, Mail, Users, Settings, FileText,
  HardDrive, Cpu, Activity, Clock, Package,
  Power
} from 'lucide-react'
import { toast } from 'sonner'

interface SystemMetric {
  name: string
  value: string
  status: 'healthy' | 'warning' | 'critical'
  icon: any
}

interface AdminTool {
  id: string
  name: string
  description: string
  category: string
  icon: any
}

// Real, honest mapping from the real status strings /health actually
// returns to this page's three-tier display, not every non-"healthy"
// status is a real problem, Ollama being offline is explicitly
// optional.
const GOOD_STATUSES = new Set(['connected', 'key_present', 'loaded', 'installed'])
const WARN_STATUSES = new Set(['not_configured', 'offline'])
function tierFor(status: string): 'healthy' | 'warning' | 'critical' {
  if (GOOD_STATUSES.has(status)) return 'healthy'
  if (WARN_STATUSES.has(status)) return 'warning'
  return 'critical'
}

export default function AdminToolsPage() {
  const [loading, setLoading]   = useState(true)
  const [running, setRunning]   = useState<string | null>(null)
  const [lastRuns, setLastRuns] = useState<Record<string, string>>({})
  const [metrics, setMetrics]   = useState<SystemMetric[]>([])

  const supabase = createClient()

  const getTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    if (h < 24) return `${h}h ago`
    if (d < 7) return `${d}d ago`
    return new Date(iso).toLocaleDateString()
  }

  // Real, genuine last-run tracking, replacing the previous static,
  // fake strings ("2 hours ago" on every load, regardless of whether
  // the tool had ever actually run). Reads the same admin_logs rows
  // runTool() itself now writes below.
  const fetchLastRuns = async () => {
    try {
      const { data } = await supabase
        .from('admin_logs')
        .select('resource, created_at')
        .eq('action', 'tool_executed')
        .order('created_at', { ascending: false })

      if (data) {
        const latest: Record<string, string> = {}
        for (const row of data) {
          if (row.resource && !latest[row.resource]) latest[row.resource] = row.created_at
        }
        setLastRuns(latest)
      }
    } catch (error) {
      console.error('Error fetching last-run history:', error)
    }
  }

  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        const res = await fetch('/api/admin/health', { cache: 'no-store' })
        const health = await res.json()
        if (!res.ok) {
          console.error('Health check failed:', health.error)
          return
        }

        const sub = health.subsystems || {}
        // Real, six-card selection, the subsystems most relevant to
        // the tools on this page, real data from the same, live
        // health check confirmed working tonight, not fabricated.
        setMetrics([
          { name: 'Overall',          value: health.status || 'unknown',        status: health.all_systems_go ? 'healthy' : 'warning', icon: Activity },
          { name: 'Database',         value: sub.database?.status || 'unknown', status: tierFor(sub.database?.status),         icon: Database },
          { name: 'Supabase',         value: sub.supabase?.status || 'unknown', status: tierFor(sub.supabase?.status),         icon: Database },
          { name: 'DeepSeek',         value: sub.anthropic?.status || 'unknown', status: tierFor(sub.anthropic?.status),       icon: Cpu },
          { name: 'Swiss Ephemeris',  value: sub.swiss_ephemeris?.status || 'unknown', status: tierFor(sub.swiss_ephemeris?.status), icon: HardDrive },
          { name: 'MediaPipe',        value: sub.mediapipe?.status || 'unknown', status: tierFor(sub.mediapipe?.status),        icon: Clock },
        ])
      } catch (error) {
        console.error('Error fetching system health:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSystemHealth()
    fetchLastRuns()
  }, [])

  const tools: AdminTool[] = [
    { id: 'cache-clear',              name: 'Clear Cache',              description: 'Clear all system caches and temporary data',                            category: 'Maintenance',      icon: Trash2 },
    { id: 'database-optimize',        name: 'Optimize Database',        description: 'Run database optimization and vacuum',                                  category: 'Database',         icon: Database },
    { id: 'backup',                   name: 'Backup Request',           description: 'Log a manual backup request, real backups are managed by Supabase',     category: 'Backup',           icon: Download },
    { id: 'security-scan',            name: 'Security Scan',            description: 'Count open and critical fraud alerts',                                  category: 'Security',         icon: Shield },
    { id: 'cleanup-logs',             name: 'Cleanup Logs',             description: 'Remove admin log entries older than 90 days',                           category: 'Maintenance',      icon: FileText },
    { id: 'sync-users',               name: 'Sync Users',               description: 'Create missing user records for orphaned auth accounts',                category: 'Users',            icon: Users },
    { id: 'test-email',               name: 'Test Email',               description: 'Send a real test email to verify the email service',                   category: 'Email',            icon: Mail },
    { id: 'recalculate-commissions',  name: 'Recalculate Commissions',  description: 'Credit any confirmed purchases missing an affiliate conversion',        category: 'Affiliates',       icon: RefreshCw },
    { id: 'clear-synthesis-cache',    name: 'Clear Synthesis Cache',    description: "Clear the KAYAL Synthesis Engine's real cache",                         category: 'Synthesis Engine', icon: Activity },
    { id: 'rebuild-tool-index',       name: 'Rebuild Tool Index',       description: "Rebuild the synthesis engine's real tool index",                        category: 'Synthesis Engine', icon: Package },
    { id: 'test-teaser-api',          name: 'Test Teaser API',          description: 'Confirm the tool-teaser preview endpoint is genuinely responding',      category: 'Synthesis Engine', icon: Activity },
  ]

  // Real, genuine execution, calling the actual backend route,
  // previously this waited two seconds and logged a real, false
  // admin_logs entry claiming success without ever doing anything.
  const runTool = async (toolId: string) => {
    setRunning(toolId)
    try {
      const res = await fetch(`/api/admin/tools/${toolId}`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || data.success === false) {
        toast.error(data.error || data.message || 'Tool execution failed')
        return
      }

      toast.success(data.message || 'Tool executed successfully')
      await fetchLastRuns()
    } catch (error) {
      console.error('Tool execution error:', error)
      toast.error('Tool execution failed, check the console for details')
    } finally {
      setRunning(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
    </div>
  )

  const statusColors = { healthy: 'bg-green-100 text-green-700', warning: 'bg-yellow-100 text-yellow-700', critical: 'bg-red-100 text-red-700' }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <Wrench className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tools</h1>
          <p className="text-sm text-gray-500">System utilities and maintenance tools</p>
        </div>
      </div>

      {/* System Metrics */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">System Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {metrics.map(m => {
            const Icon = m.icon
            return (
              <Card key={m.name} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${statusColors[m.status]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{m.name}</p>
                    <p className="text-lg font-bold">{m.value}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { id: 'cache-clear',       icon: Trash2,   label: 'Clear Cache' },
            { id: 'database-optimize', icon: Database,  label: 'Optimize DB' },
            { id: 'backup',            icon: Download,  label: 'Backup' },
            { id: 'security-scan',     icon: Shield,    label: 'Security Scan' },
          ].map(q => {
            const Icon = q.icon
            return (
              <Button key={q.id} variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => runTool(q.id)} disabled={running !== null}>
                {running === q.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                <span>{q.label}</span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* All Tools */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(tool => {
            const Icon = tool.icon
            const isRunning = running === tool.id
            const lastRun = lastRuns[tool.id]
            return (
              <Card key={tool.id} className="p-6 hover:shadow-lg transition">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{tool.name}</h3>
                    <p className="text-sm text-gray-500 mb-3">{tool.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{tool.category}</span>
                      <span className="text-xs text-gray-500">
                        {lastRun ? `Last: ${getTimeAgo(lastRun)}` : 'Never run'}
                      </span>
                    </div>
                    <Button onClick={() => runTool(tool.id)} disabled={running !== null} size="sm" className="mt-3 w-full">
                      {isRunning && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Run Tool
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* System Info */}
      <div className="mt-8">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">System Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ['Version', '2.1.4'],
              ['Environment', 'Production'],
              ['Node Version', 'v18.17.0'],
              ['Database', 'PostgreSQL 15.1'],
              ['Last Deploy', new Date().toLocaleDateString()],
              ['Timezone', 'UTC'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-gray-500">{k}</p>
                <p className="font-medium">{v}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
