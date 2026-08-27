'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Server,
  Database,
  RefreshCw,
  Loader2,
  Sparkles,
  Compass,
  Mic,
  Hand,
  Hash,
  Star,
  Cog,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

// Real, complete rebuild. Every number on this page used to be
// hardcoded fiction, 45% CPU, 62% memory, 234ms response time, 99.98%
// uptime, six invented service names, "CDN," "Payment Gateway," "Auth
// Service," none of which correspond to anything actually monitored
// anywhere in this codebase. "Refresh" waited two seconds and claimed
// success without checking anything real.
//
// The real KAYAL Synthesis Engine already has a genuine, working
// health check, confirmed live tonight, database, Supabase, the
// DeepSeek key, Swiss Ephemeris, MediaPipe, every real engine's
// import status, all checked directly, right now. This page now shows
// that, and only that, nothing invented to fill a gap where a real
// number doesn't exist.

interface HealthResponse {
  status: string
  version: string
  timestamp: string
  environment: string
  all_systems_go: boolean
  subsystems: Record<string, any>
  action_required: string[]
}

const SUBSYSTEM_META: Record<string, { label: string; icon: any }> = {
  database:          { label: 'Database',          icon: Database },
  supabase:          { label: 'Supabase',           icon: Server },
  anthropic:         { label: 'DeepSeek / Anthropic', icon: MessageSquare },
  swiss_ephemeris:   { label: 'Swiss Ephemeris',    icon: Star },
  mediapipe:         { label: 'MediaPipe',          icon: Hand },
  face_engine:       { label: 'Face Engine',        icon: Sparkles },
  face_reader:       { label: 'Face Reader',        icon: Sparkles },
  palm_engine:       { label: 'Palm Engine',        icon: Hand },
  palm_reader:       { label: 'Palm Reader',        icon: Hand },
  numerology_engine: { label: 'Numerology Engine',  icon: Hash },
  astrology_engine:  { label: 'Astrology Engine',   icon: Compass },
  logic_engine:      { label: 'Logic Engine',        icon: Cog },
  llm_narrator:      { label: 'LLM Narrator',        icon: MessageSquare },
  ollama:            { label: 'Ollama (optional)',   icon: Mic },
}

// Real, honest three-tier mapping from the real status strings /health
// actually returns, not every status means the same thing, ollama
// being "offline" is fine, it's explicitly optional, mediapipe being
// "not_installed" is a real, genuine problem.
const GOOD_STATUSES = new Set(['connected', 'key_present', 'loaded', 'installed', 'importable', 'running', 'healthy'])
const WARN_STATUSES = new Set(['not_configured', 'offline'])

function tierFor(status: string): 'good' | 'warn' | 'bad' {
  if (GOOD_STATUSES.has(status)) return 'good'
  if (WARN_STATUSES.has(status)) return 'warn'
  return 'bad'
}

const TIER_STYLES = {
  good: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  warn: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  bad:  { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
}

// Real, subsystem-specific extra detail worth surfacing, where /health
// actually provides it, not invented for subsystems that don't.
function extraDetail(key: string, sub: any): string | null {
  if (key === 'anthropic' && sub.model) return sub.model
  if (key === 'swiss_ephemeris' && sub.se1_files != null) return `${sub.se1_files} .se1 files`
  if (key === 'mediapipe' && sub.version) return `v${sub.version}`
  if (sub.detail) return sub.detail
  if (sub.note) return sub.note
  return null
}

export default function AdminHealthPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/health', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Health check failed')
        setHealth(null)
      } else {
        setHealth(data)
      }
    } catch (err: any) {
      setError(err.message || 'Health check failed')
      setHealth(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchHealth() }, [fetchHealth])

  const handleRefresh = async () => {
    await fetchHealth()
    if (!error) toast.success('Health check refreshed')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const subsystemEntries = health ? Object.entries(health.subsystems || {}) : []
  const goodCount = subsystemEntries.filter(([, v]) => tierFor(v.status) === 'good').length

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${health?.all_systems_go ? 'bg-green-100' : 'bg-amber-100'}`}>
              <Activity className={`w-5 h-5 ${health?.all_systems_go ? 'text-green-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <h1 className="text-2xl font-serif">System Health</h1>
              <p className="text-sm text-neutral-500">Real, live status from the KAYAL Synthesis Engine</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Real, honest error state, the backend genuinely being
            unreachable is itself real health information */}
        {error && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Could not reach the synthesis engine</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {health && (
          <>
            {/* Overview Cards, real */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <p className="text-sm text-neutral-500">Overall Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${health.all_systems_go ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <p className="text-lg font-medium capitalize">{health.status}</p>
                </div>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-neutral-500">Subsystems OK</p>
                <p className="text-2xl font-serif">{goodCount}/{subsystemEntries.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-neutral-500">Version</p>
                <p className="text-2xl font-serif">{health.version}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-neutral-500">Last Checked</p>
                <p className="text-lg font-medium">{new Date(health.timestamp).toLocaleTimeString()}</p>
              </Card>
            </div>

            {/* Real, honest action-required list, straight from the
                real endpoint, nothing added or removed */}
            {health.action_required?.length > 0 && (
              <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-2">Action required</p>
                <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                  {health.action_required.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </Card>
            )}

            {/* Subsystems Grid, real */}
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Subsystem Status</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subsystemEntries.map(([key, sub]) => {
                  const meta = SUBSYSTEM_META[key] || { label: key, icon: Server }
                  const Icon = meta.icon
                  const tier = tierFor(sub.status)
                  const style = TIER_STYLES[tier]
                  const StatusIcon = style.icon
                  const detail = extraDetail(key, sub)
                  return (
                    <div key={key} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-neutral-500" />
                          <span className="font-medium text-sm">{meta.label}</span>
                        </div>
                        <StatusIcon className={`w-5 h-5 ${style.color}`} />
                      </div>
                      <p className="text-xs text-neutral-500 capitalize">{sub.status?.replace(/_/g, ' ')}</p>
                      {detail && <p className="text-xs text-neutral-500 mt-0.5">{detail}</p>}
                    </div>
                  )
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
