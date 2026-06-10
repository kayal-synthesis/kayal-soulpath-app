// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  DollarSign, TrendingUp, Download, RefreshCw,
  Eye, EyeOff, Wallet, CreditCard, Receipt,
  FileText, Loader2
} from 'lucide-react'

interface Transaction {
  id: string
  created_at: string
  tool_name: string
  tool_id: string
  price: number
  status: string
  user_id: string
  ref_code?: string
  users?: { email?: string; full_name?: string }
}

export default function RevenuePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAmounts, setShowAmounts] = useState(true)
  const [timeRange, setTimeRange] = useState<'today'|'week'|'month'|'year'>('month')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState({
    total: 0, today: 0, week: 0, month: 0,
    refunds: 0, avgValue: 0, growth: 0
  })
  const [chartData, setChartData] = useState<number[]>(new Array(30).fill(0))

  const fetchRevenue = useCallback(async () => {
    setRefreshing(true)
    try {
      const now = new Date()
      const todayStr  = now.toISOString().split('T')[0]
      const weekAgo   = new Date(Date.now() - 7*86400000).toISOString()
      const monthAgo  = new Date(Date.now() - 30*86400000).toISOString()
      const yearAgo   = new Date(Date.now() - 365*86400000).toISOString()

      // All purchases
      const { data: all } = await supabase
        .from('purchases')
        .select('price, created_at, status')

      const totalRev  = all?.reduce((s,p)=>s+(Number(p.price)||0),0)||0
      const todayRev  = all?.filter(p=>p.created_at?.startsWith(todayStr)).reduce((s,p)=>s+(Number(p.price)||0),0)||0
      const weekRev   = all?.filter(p=>p.created_at&&p.created_at>=weekAgo).reduce((s,p)=>s+(Number(p.price)||0),0)||0
      const monthRev  = all?.filter(p=>p.created_at&&p.created_at>=monthAgo).reduce((s,p)=>s+(Number(p.price)||0),0)||0
      const refunds   = all?.filter(p=>p.status==='refunded').reduce((s,p)=>s+(Number(p.price)||0),0)||0
      const avgValue  = all?.length ? totalRev/all.length : 0

      // Month-over-month growth
      const prevMonthAgo = new Date(Date.now()-60*86400000).toISOString()
      const prevRev = all?.filter(p=>p.created_at&&p.created_at>=prevMonthAgo&&p.created_at<monthAgo).reduce((s,p)=>s+(Number(p.price)||0),0)||0
      const growth = prevRev>0 ? ((monthRev-prevRev)/prevRev)*100 : 0

      setStats({ total:totalRev, today:todayRev, week:weekRev, month:monthRev, refunds, avgValue, growth:Math.round(growth*10)/10 })

      // Daily chart for last 30 days
      const daily = Array.from({length:30},(_,i)=>{
        const d = new Date(Date.now()-(29-i)*86400000).toISOString().split('T')[0]
        return all?.filter(p=>p.created_at?.startsWith(d)).reduce((s,p)=>s+(Number(p.price)||0),0)||0
      })
      setChartData(daily)

      // Recent transactions with user join
      const { data: recent } = await supabase
        .from('purchases')
        .select('*, users(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(20)

      setTransactions(recent||[])
    } catch (error) {
      console.error('Revenue error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchRevenue() }, [fetchRevenue])

  const displayValue = (n:number) => showAmounts ? `$${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}` : '••••'
  const maxChart = Math.max(...chartData, 1)

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
          <p className="text-sm text-neutral-500 mt-1">Live earnings from purchases</p>
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
        <h3 className="font-medium mb-4">Daily Revenue — Last 30 Days</h3>
        <div className="h-48 flex items-end justify-between gap-1">
          {chartData.map((v,i)=>(
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full relative" style={{height:'120px'}}>
                <div className="absolute bottom-0 w-full bg-primary-600 rounded-t group-hover:bg-primary-700 transition"
                  style={{height:`${(v/maxChart)*100}%`,minHeight:v>0?'3px':'0'}}>
                  {v>0&&<div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">${v.toFixed(0)}</div>}
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

      {/* Recent Transactions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Recent Transactions</h3>
          <Badge variant="outline">{transactions.length} loaded</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-neutral-500 border-b">
                <th className="pb-3">Date</th><th className="pb-3">Tool</th>
                <th className="pb-3">Customer</th><th className="pb-3">Ref Code</th>
                <th className="pb-3">Amount</th><th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length===0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-neutral-400">No transactions yet</td></tr>
              ) : transactions.map(t=>(
                <tr key={t.id} className="border-b last:border-0 hover:bg-neutral-50">
                  <td className="py-3 text-sm">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="py-3 text-sm font-medium">{t.tool_name||t.tool_id}</td>
                  <td className="py-3 text-sm">
                    <p>{(t.users as any)?.full_name||'—'}</p>
                    <p className="text-xs text-neutral-400">{(t.users as any)?.email||t.user_id.slice(0,8)+'...'}</p>
                  </td>
                  <td className="py-3 text-xs font-mono text-neutral-500">{t.ref_code||'—'}</td>
                  <td className={`py-3 text-sm font-medium ${Number(t.price)>=0?'text-green-600':'text-red-600'}`}>
                    {displayValue(Math.abs(Number(t.price)))}
                  </td>
                  <td className="py-3">
                    <Badge variant={t.status==='active'||t.status==='completed'?'success':t.status==='refunded'?'destructive':'warning'} size="sm">
                      {t.status}
                    </Badge>
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
