// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX,
  AlertTriangle, AlertCircle, CheckCircle, XCircle,
  Ban, Flag, Users, Download, RefreshCw,
  Clock, Activity, Loader2, Eye
} from 'lucide-react'
import { toast } from 'sonner'

interface FraudAlert {
  id: string; severity: 'low'|'medium'|'high'|'critical'
  type: string; description: string; user_id: string
  created_at: string; status: 'open'|'investigating'|'resolved'
  users?: { email?: string }
}
interface LoginAttempt {
  id: string; created_at: string
  ip_address: string; success: boolean
  user_id?: string; users?: { email?: string }
}

const getTimeAgo = (d:string) => {
  const diff = Date.now()-new Date(d).getTime()
  const m=Math.floor(diff/60000), h=Math.floor(m/60)
  if (m<1) return 'just now'; if (m<60) return `${m}m ago`; if (h<24) return `${h}h ago`
  return new Date(d).toLocaleDateString()
}

export default function SecurityPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('24h')
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([])
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([])
  const [stats, setStats] = useState({ score:85, alerts:0, critical:0, failedLogins:0, successLogins:0, blockedIPs:0 })
  const [blockedIP, setBlockedIP] = useState('')
  const [updatingAlert, setUpdatingAlert] = useState<string|null>(null)

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const hours = timeRange==='1h'?1:timeRange==='24h'?24:timeRange==='7d'?168:720
      const since = new Date(Date.now()-hours*3600000).toISOString()

      const [{ data: alerts }, { data: logins }, { data: secEvents }] = await Promise.all([
        // Real fix, .order('severity') previously sorted alphabetically
        // on the raw text value, medium, low, high, critical, in that
        // literal order, the exact opposite of the intended real
        // priority. Fetched by recency here instead, then sorted
        // below using a real, numeric severity rank.
        supabase.from('fraud_alerts').select('*, users:user_id(email)').eq('status','open').order('created_at',{ascending:false}).limit(20),
        supabase.from('login_attempts').select('*, users:user_id(email)').gte('created_at',since).order('created_at',{ascending:false}).limit(30),
        supabase.from('security_events').select('*').gte('created_at',since).limit(10),
      ])

      // Real, numeric severity rank, critical genuinely sorts first
      // now, not last.
      const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
      const fa = ((alerts||[]) as FraudAlert[]).sort((a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0))
      const la = (logins||[]) as LoginAttempt[]

      const criticalCount = fa.filter(a=>a.severity==='critical').length
      const failedCount   = la.filter(l=>!l.success).length
      const successCount  = la.filter(l=>l.success).length
      const score = Math.max(40, 100 - criticalCount*15 - Math.min(failedCount,5)*5)

      setFraudAlerts(fa)
      setLoginAttempts(la)
      setStats({ score, alerts:fa.length, critical:criticalCount, failedLogins:failedCount, successLogins:successCount, blockedIPs:0 })
    } catch (error) {
      console.error('Security error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [timeRange])

  useEffect(()=>{ fetchData() },[fetchData])

  const updateAlertStatus = async (id:string, status:'investigating'|'resolved') => {
    setUpdatingAlert(id)
    try {
      const { error } = await supabase.from('fraud_alerts').update({ status }).eq('id',id)
      if (error) throw error
      toast.success(`Alert marked as ${status}`)
      fetchData()
    } catch { toast.error('Failed to update alert') }
    finally { setUpdatingAlert(null) }
  }

  const severityColors:Record<string,string> = {
    critical:'bg-red-100 text-red-700 border-red-200',
    high:    'bg-orange-100 text-orange-700 border-orange-200',
    medium:  'bg-yellow-100 text-yellow-700 border-yellow-200',
    low:     'bg-blue-100 text-blue-700 border-blue-200',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-primary-600"/>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Center</h1>
          <p className="text-sm text-neutral-500 mt-1">Live threat monitoring from your database</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={timeRange} onChange={e=>setTimeRange(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="1h">Last Hour</option><option value="24h">Last 24h</option>
            <option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option>
          </select>
          <Button variant="outline" onClick={fetchData} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing?'animate-spin':''}`}/>Refresh
          </Button>
        </div>
      </div>

      {/* Security Score */}
      <Card className={`p-6 ${stats.score>=80?'bg-gradient-to-br from-green-600 to-green-700':stats.score>=60?'bg-gradient-to-br from-yellow-500 to-yellow-600':'bg-gradient-to-br from-red-600 to-red-700'} text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Security Score</p>
            <p className="text-5xl font-bold mt-2">{stats.score}%</p>
            <p className="text-sm opacity-80 mt-2">
              {stats.critical>0?`${stats.critical} critical alerts require attention`:'No critical threats detected'}
            </p>
          </div>
          {stats.score>=80?<ShieldCheck className="w-20 h-20 opacity-30"/>:stats.score>=60?<Shield className="w-20 h-20 opacity-30"/>:<ShieldX className="w-20 h-20 opacity-30"/>}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label:'Open Alerts',     value:stats.alerts,        color:'text-red-600',    border:'border-red-500',    icon:ShieldAlert },
          { label:'Critical',        value:stats.critical,      color:'text-red-700',    border:'border-red-700',    icon:ShieldX },
          { label:'Failed Logins',   value:stats.failedLogins,  color:'text-yellow-600', border:'border-yellow-500', icon:AlertTriangle },
          { label:'Success Logins',  value:stats.successLogins, color:'text-green-600',  border:'border-green-500',  icon:CheckCircle },
          { label:'Active Sessions', value:'—',                 color:'text-blue-600',   border:'border-blue-500',   icon:Users },
        ].map(s=>{ const Icon=s.icon; return (
          <Card key={s.label} className={`p-4 border-l-4 ${s.border}`}>
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${s.color}`}/>
              <div>
                <p className="text-xs text-neutral-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </div>
          </Card>
        )})}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Alerts */}
        <Card className="p-6">
          <h3 className="font-medium mb-4">Open Fraud Alerts</h3>
          {fraudAlerts.length===0 ? (
            <div className="text-center py-8"><ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-2"/><p className="text-green-600">No open fraud alerts</p></div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {fraudAlerts.map(alert=>(
                <div key={alert.id} className={`p-3 border rounded-lg ${severityColors[alert.severity]}`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0"/>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold capitalize">{alert.severity} · {alert.type}</span>
                        <span className="text-xs opacity-70">{getTimeAgo(alert.created_at)}</span>
                      </div>
                      <p className="text-sm mt-0.5">{alert.description}</p>
                      <p className="text-xs opacity-70 mt-0.5">{alert.users?.email||'Unknown user'}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={()=>updateAlertStatus(alert.id,'investigating')}
                          disabled={updatingAlert===alert.id}
                          className="text-xs px-2 py-0.5 bg-white/60 rounded hover:bg-white/80 transition">
                          {updatingAlert===alert.id?<Loader2 className="w-3 h-3 animate-spin"/>:'Investigate'}
                        </button>
                        <button onClick={()=>updateAlertStatus(alert.id,'resolved')}
                          disabled={updatingAlert===alert.id}
                          className="text-xs px-2 py-0.5 bg-white/60 rounded hover:bg-white/80 transition">
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Login Attempts */}
        <Card className="p-6">
          <h3 className="font-medium mb-4">Recent Login Attempts</h3>
          {loginAttempts.length===0 ? (
            <p className="text-center text-neutral-500 py-8 text-sm">No login attempts in this period</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {loginAttempts.map(l=>(
                <div key={l.id} className={`flex items-center gap-3 p-2 rounded-lg ${l.success?'hover:bg-green-50':'hover:bg-red-50'}`}>
                  {l.success
                    ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0"/>
                    : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0"/>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{l.users?.email||'Unknown'}</p>
                    <p className="text-xs text-neutral-500">{l.ip_address||'Unknown IP'}</p>
                  </div>
                  <span className="text-xs text-neutral-500 flex-shrink-0">{getTimeAgo(l.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* IP Blocking UI */}
      <Card className="p-6">
        <h3 className="font-medium mb-4">IP Management</h3>
        <div className="flex gap-2 mb-4">
          <input value={blockedIP} onChange={e=>setBlockedIP(e.target.value)}
            placeholder="Enter IP address to flag..." className="flex-1 p-2 border rounded-lg text-sm"/>
          <Button onClick={async()=>{
            if (!blockedIP) return
            const { data:{ user } } = await supabase.auth.getUser()
            await supabase.from('security_events').insert({ type:'ip_blocked', details:{ ip:blockedIP }, created_by:user?.id, created_at:new Date().toISOString() })
            toast.success(`IP ${blockedIP} flagged`)
            setBlockedIP('')
          }}>Flag IP</Button>
        </div>
        <p className="text-[13px] text-neutral-500 leading-relaxed">Flagged IPs are logged to the security_events table. Configure actual blocking at your infrastructure/CDN level.</p>
      </Card>
    </div>
  )
}
