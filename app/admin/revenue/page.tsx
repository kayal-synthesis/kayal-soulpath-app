// @ts-nocheck
'use client'
/**
 * app/admin/revenue/page.tsx
 * ===========================
 * v2, real rebuild, not a patch. The original version summed rows
 * directly from purchases, which undercounts real revenue the moment
 * a subscription renews, tonight's own webhook work updates an
 * existing purchases row's expires_at on renewal rather than
 * inserting a new one, by design, that's correct for purchases
 * itself, access tracking, but it meant purchases was never a valid
 * source for a real revenue total over time.
 *
 * This version queries revenue_events instead, a real, dedicated,
 * append-only ledger where every purchase, renewal, and refund is its
 * own row, with refunds stored as negative amounts, so a plain
 * SUM(amount_usd) is always the true, net figure.
 *
 * Currency conversion, real now: non-USD renewals and refunds are
 * converted using fx_rates_cache, the same table built earlier
 * tonight for price display, a real, periodically refreshed rate, not
 * a live one, an honest, reasonable accuracy bar for internal revenue
 * reporting. A null amount_usd can still genuinely occur, only if a
 * specific currency is missing from that cache entirely, still
 * surfaced directly below, not hidden, rather than silently treated
 * as zero.
 */
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  DollarSign, TrendingUp, Download, RefreshCw,
  Eye, EyeOff, Wallet, CreditCard, Receipt,
  FileText, Loader2, AlertTriangle
} from 'lucide-react'

interface RevenueEvent {
  id: string
  created_at: string
  tool_id: string
  tool_name: string | null
  event_type: 'purchase' | 'renewal' | 'refund'
  amount_usd: number | null
  currency_charged: string | null
  amount_charged: number | null
  ref_code: string | null
  user_id: string | null
  users?: { email?: string; full_name?: string }
}

export default function RevenuePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAmounts, setShowAmounts] = useState(true)
  const [timeRange, setTimeRange] = useState<'today'|'week'|'month'|'year'>('month')
  const [events, setEvents] = useState<RevenueEvent[]>([])
  const [stats, setStats] = useState({
    total: 0, today: 0, week: 0, month: 0,
    refunds: 0, avgValue: 0, growth: 0,
    // Real, honest coverage tracking, not hidden, how many of the
    // events counted above genuinely have a converted USD figure
    // versus how many are sitting there with amount_usd null.
    unconvertedCount: 0,
  })
  const [chartData, setChartData] = useState<number[]>(new Array(30).fill(0))

  const fetchRevenue = useCallback(async () => {
    setRefreshing(true)
    try {
      const now = new Date()
      const todayStr  = now.toISOString().split('T')[0]
      const weekAgo   = new Date(Date.now() - 7*86400000).toISOString()
      const monthAgo  = new Date(Date.now() - 30*86400000).toISOString()

      // All revenue events, real, converted-USD events and
      // not-yet-converted ones both pulled here, so the unconverted
      // count below can be genuinely honest rather than invisible.
      const { data: all } = await supabase
        .from('revenue_events')
        .select('created_at, amount_usd, event_type')

      const converted = (all || []).filter(e => e.amount_usd !== null)
      const unconvertedCount = (all?.length || 0) - converted.length

      const totalRev  = converted.reduce((s,e)=>s+(Number(e.amount_usd)||0),0)
      const todayRev  = converted.filter(e=>e.created_at?.startsWith(todayStr)).reduce((s,e)=>s+(Number(e.amount_usd)||0),0)
      const weekRev   = converted.filter(e=>e.created_at&&e.created_at>=weekAgo).reduce((s,e)=>s+(Number(e.amount_usd)||0),0)
      const monthRev  = converted.filter(e=>e.created_at&&e.created_at>=monthAgo).reduce((s,e)=>s+(Number(e.amount_usd)||0),0)
      // Refunds are already negative in the ledger, by design, this
      // sum is naturally negative or zero, displayed as a positive
      // magnitude below for readability.
      const refunds   = Math.abs(converted.filter(e=>e.event_type==='refund').reduce((s,e)=>s+(Number(e.amount_usd)||0),0))
      const purchaseCount = converted.filter(e=>e.event_type!=='refund').length
      const avgValue  = purchaseCount ? (totalRev + refunds) / purchaseCount : 0

      // Month-over-month growth
      const prevMonthAgo = new Date(Date.now()-60*86400000).toISOString()
      const prevRev = converted.filter(e=>e.created_at&&e.created_at>=prevMonthAgo&&e.created_at<monthAgo).reduce((s,e)=>s+(Number(e.amount_usd)||0),0)
      const growth = prevRev>0 ? ((monthRev-prevRev)/prevRev)*100 : 0

      setStats({ total:totalRev, today:todayRev, week:weekRev, month:monthRev, refunds, avgValue, growth:Math.round(growth*10)/10, unconvertedCount })

      // Daily chart for last 30 days, net figure per day, purchases
      // and renewals add, refunds, already negative, subtract
      // naturally in the same sum.
      const daily = Array.from({length:30},(_,i)=>{
        const d = new Date(Date.now()-(29-i)*86400000).toISOString().split('T')[0]
        return converted.filter(e=>e.created_at?.startsWith(d)).reduce((s,e)=>s+(Number(e.amount_usd)||0),0)
      })
      setChartData(daily)

      // Recent events with user join, mirrors the original page's own
      // pattern, now against revenue_events instead of purchases, so
      // a renewal genuinely shows up as its own line here, not
      // invisible the way it always was before.
      const { data: recent } = await supabase
        .from('revenue_events')
        .select('*, users(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(20)
      setEvents(recent || [])
    } catch (error) {
      console.error('Revenue error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchRevenue() }, [fetchRevenue])

  const displayValue = (n:number) => showAmounts ? `$${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}` : '••••'
  const maxChart = Math.max(...chartData.map(Math.abs), 1)

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
          <h1 className="text-2xl font-bold">Revenue Analytics</h1>
          <p className="text-sm text-neutral-500 mt-1">Live earnings, purchases and renewals both counted</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={timeRange} onChange={e=>setTimeRange(e.target.value as any)} className="px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="today">Today</option><option value="week">This Week</option>
            <option value="month">This Month</option><option value="year">This Year</option>
          </select>
          <button onClick={()=>setShowAmounts(!showAmounts)} className="p-2 border rounded-lg hover:bg-neutral-50">
            {showAmounts?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
          </button>
          <Button variant="outline" onClick={fetchRevenue} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing?'animate-spin':''}`}/>Refresh
          </Button>
        </div>
      </div>

      {/* Real, honest coverage warning, not hidden */}
      {stats.unconvertedCount > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0"/>
            <div>
              <p className="text-sm font-medium text-amber-800">
                {stats.unconvertedCount} event{stats.unconvertedCount !== 1 ? 's' : ''} not yet counted in the totals below
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                These specific currencies are missing from the exchange rate cache, everything else converts automatically. Check fx_rates_cache for gaps.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total Revenue', value:stats.total, color:'text-primary-600', icon:DollarSign, bg:'bg-primary-100' },
          { label:'This Month',    value:stats.month,  color:'text-blue-600',    icon:TrendingUp,  bg:'bg-blue-100' },
          { label:'This Week',     value:stats.week,   color:'text-green-600',   icon:Wallet,      bg:'bg-green-100' },
          { label:'Refunds',       value:stats.refunds,color:'text-red-600',     icon:Receipt,     bg:'bg-red-100' },
        ].map(s=>{
          const Icon=s.icon
          return (
            <Card key={s.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{displayValue(s.value)}</p>
                  {s.label==='This Month'&&<p className="text-xs text-green-600 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/>+{stats.growth}% vs prev</p>}
                </div>
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`}/>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Chart */}
      <Card className="p-6">
        <h3 className="font-medium mb-4">Daily Net Revenue — Last 30 Days</h3>
        <div className="h-48 flex items-end justify-between gap-1">
          {chartData.map((v,i)=>(
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full relative" style={{height:'120px'}}>
                <div className={`absolute bottom-0 w-full rounded-t transition ${v>=0 ? 'bg-primary-600 group-hover:bg-primary-700' : 'bg-red-500 group-hover:bg-red-600'}`}
                  style={{height:`${(Math.abs(v)/maxChart)*100}%`,minHeight:v!==0?'3px':'0'}}>
                  {v!==0&&<div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">${v.toFixed(0)}</div>}
                </div>
              </div>
              {(i===0||i===14||i===29)&&<span className="text-xs text-gray-400">{new Date(Date.now()-(29-i)*86400000).toLocaleDateString('en',{month:'short',day:'numeric'})}</span>}
            </div>
          ))}
        </div>
      </Card>

      {/* Avg order value */}
      <Card className="p-4 bg-primary-50 border-primary-100">
        <div className="flex items-center gap-4">
          <CreditCard className="w-8 h-8 text-primary-600"/>
          <div>
            <p className="text-sm text-primary-700 font-medium">Average Order Value</p>
            <p className="text-2xl font-bold text-primary-600">{displayValue(stats.avgValue)}</p>
          </div>
        </div>
      </Card>

      {/* Recent Events */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Recent Revenue Events</h3>
          <Badge variant="outline">{events.length} loaded</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-neutral-500 border-b">
                <th className="pb-3">Date</th><th className="pb-3">Tool</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Customer</th><th className="pb-3">Ref Code</th>
                <th className="pb-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {events.length===0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-neutral-400">No revenue events yet</td></tr>
              ) : events.map(e=>(
                <tr key={e.id} className="border-b last:border-0 hover:bg-neutral-50">
                  <td className="py-3 text-sm">{new Date(e.created_at).toLocaleDateString()}</td>
                  <td className="py-3 text-sm font-medium">{e.tool_name||e.tool_id}</td>
                  <td className="py-3">
                    <Badge variant={e.event_type==='refund'?'destructive':e.event_type==='renewal'?'outline':'success'} size="sm">
                      {e.event_type}
                    </Badge>
                  </td>
                  <td className="py-3 text-sm">
                    <p>{(e.users as any)?.full_name||'—'}</p>
                    <p className="text-xs text-neutral-400">{(e.users as any)?.email||(e.user_id ? e.user_id.slice(0,8)+'...' : 'guest')}</p>
                  </td>
                  <td className="py-3 text-xs font-mono text-neutral-500">{e.ref_code||'—'}</td>
                  <td className={`py-3 text-sm font-medium ${e.amount_usd===null?'text-neutral-400 italic':Number(e.amount_usd)>=0?'text-green-600':'text-red-600'}`}>
                    {e.amount_usd===null ? `not converted (${e.currency_charged?.toUpperCase()})` : displayValue(Math.abs(Number(e.amount_usd)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Export */}
      <div className="flex justify-end gap-3">
        <Button variant="outline"><FileText className="w-4 h-4 mr-2"/>Export CSV</Button>
      </div>
    </div>
  )
}
