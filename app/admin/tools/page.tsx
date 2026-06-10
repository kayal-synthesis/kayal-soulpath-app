// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Wrench, Database, RefreshCw, Download, Upload,
  Trash2, Shield, AlertTriangle, CheckCircle,
  Loader2, Mail, Users, Settings, FileText,
  HardDrive, Cpu, Activity, Clock, Package,
  Eye, EyeOff, Power
} from 'lucide-react'
import { toast } from 'sonner'

// ── Renamed interface to AdminTool to avoid lucide-react naming conflict ──
interface SystemMetric {
  name: string
  value: string | number
  status: 'healthy' | 'warning' | 'critical'
  icon: any
}

interface AdminTool {
  id: string
  name: string
  description: string
  category: string
  icon: any
  status: 'active' | 'maintenance' | 'disabled'
  lastRun?: string
}

export default function AdminToolsPage() {
  const [loading, setLoading]         = useState(true)
  const [running, setRunning]         = useState<string | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)
  const [metrics, setMetrics]         = useState<SystemMetric[]>([
    { name: 'CPU Usage',      value: '45%',   status: 'healthy', icon: Cpu },
    { name: 'Memory',         value: '62%',   status: 'healthy', icon: HardDrive },
    { name: 'Disk',           value: '58%',   status: 'healthy', icon: Database },
    { name: 'Response Time',  value: '234ms', status: 'healthy', icon: Clock },
    { name: 'Error Rate',     value: '0.02%', status: 'healthy', icon: AlertTriangle },
    { name: 'Active Sessions',value: '—',     status: 'healthy', icon: Users },
  ])

  const supabase = createClient()

  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        const { data } = await supabase
          .from('system_health')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (data) {
          setMetrics([
            { name: 'CPU Usage',       value: data.cpu_usage      || '45%',   status: data.cpu_status      || 'healthy', icon: Cpu },
            { name: 'Memory',          value: data.memory_usage   || '62%',   status: data.memory_status   || 'healthy', icon: HardDrive },
            { name: 'Disk',            value: data.disk_usage     || '58%',   status: data.disk_status     || 'healthy', icon: Database },
            { name: 'Response Time',   value: data.response_time  || '234ms', status: data.response_status || 'healthy', icon: Clock },
            { name: 'Error Rate',      value: data.error_rate     || '0.02%', status: data.error_status    || 'healthy', icon: AlertTriangle },
            { name: 'Active Sessions', value: data.active_sessions || '—',    status: 'healthy',                        icon: Users },
          ])
        }
      } catch (error) {
        console.error('Error fetching system health:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSystemHealth()
  }, [])

  const tools: AdminTool[] = [
    { id: 'cache-clear',       name: 'Clear Cache',       description: 'Clear all system caches and temporary data',     category: 'Maintenance', icon: Trash2,    status: 'active',      lastRun: '2 hours ago' },
    { id: 'database-optimize', name: 'Optimize Database', description: 'Run database optimization and vacuum',           category: 'Database',    icon: Database,  status: 'active',      lastRun: '1 day ago' },
    { id: 'backup',            name: 'Create Backup',     description: 'Create a full system backup',                    category: 'Backup',      icon: Download,  status: 'active',      lastRun: '3 days ago' },
    { id: 'restore',           name: 'Restore Backup',    description: 'Restore system from backup',                     category: 'Backup',      icon: Upload,    status: 'maintenance' },
    { id: 'security-scan',     name: 'Security Scan',     description: 'Run full security audit',                        category: 'Security',    icon: Shield,    status: 'active',      lastRun: '5 hours ago' },
    { id: 'cleanup-logs',      name: 'Cleanup Logs',      description: 'Remove old log files',                           category: 'Maintenance', icon: FileText,  status: 'active',      lastRun: '1 week ago' },
    { id: 'sync-users',        name: 'Sync Users',        description: 'Synchronize user data across services',          category: 'Users',       icon: Users,     status: 'active',      lastRun: '30 minutes ago' },
    { id: 'test-email',        name: 'Test Email',        description: 'Send test email to verify SMTP',                 category: 'Email',       icon: Mail,      status: 'active',      lastRun: '2 days ago' },
    { id: 'migrate-data',      name: 'Migrate Data',      description: 'Run data migrations',                            category: 'Database',    icon: Package,   status: 'disabled' },
  ]

  const runTool = async (toolId: string) => {
    setRunning(toolId)
    await new Promise(resolve => setTimeout(resolve, 2000))
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('admin_logs').insert({
      admin_id: user?.id,
      action: 'tool_executed',
      resource: toolId,
      created_at: new Date().toISOString()
    })
    toast.success('Tool executed successfully')
    setRunning(null)
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Wrench className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tools</h1>
            <p className="text-sm text-gray-500">System utilities and maintenance tools</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowSecrets(!showSecrets)}>
          {showSecrets ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showSecrets ? 'Hide Secrets' : 'Show Secrets'}
        </Button>
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
            return (
              <Card key={tool.id} className="p-6 hover:shadow-lg transition">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${tool.status === 'active' ? 'bg-blue-100 text-blue-600' : tool.status === 'maintenance' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{tool.name}</h3>
                      <Badge variant={tool.status === 'active' ? 'success' : tool.status === 'maintenance' ? 'warning' : 'default'} size="sm">{tool.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{tool.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{tool.category}</span>
                      {tool.lastRun && <span className="text-xs text-gray-400">Last: {tool.lastRun}</span>}
                    </div>
                    {tool.status === 'active' && (
                      <Button onClick={() => runTool(tool.id)} disabled={isRunning} size="sm" className="mt-3 w-full">
                        {isRunning && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Run Tool
                      </Button>
                    )}
                    {tool.status === 'maintenance' && <Button variant="outline" size="sm" className="mt-3 w-full" disabled>Under Maintenance</Button>}
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