// @ts-nocheck
'use client'
// app/admin/affiliate/payouts/page.tsx
// Dedicated payout review page — gives a cleaner workflow than
// the payouts section inside admin/affiliates.
// Shows all pending payout requests with payment details visible,
// lets admin mark each as paid, rejected, or failed.

import { useState, useEffect, useCallback } from 'react'
import { createClient }                      from '@/lib/supabase/client'
import { Card }                              from '@/components/ui/Card'
import { Button }                            from '@/components/ui/Button'
import { Badge }                             from '@/components/ui/Badge'
import {
  DollarSign, CheckCircle, XCircle,
  Clock, RefreshCw, Loader2, AlertCircle,
  Download, Filter,
} from 'lucide-react'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface PayoutRequest {
  id:              string
  affiliate_id:    string
  amount:          number
  method:          string
  payment_details: Record<string, string>
  status:          'pending' | 'processing' | 'paid' | 'failed' | 'rejected'
  admin_note?:     string
  requested_at:    string
  processed_at?:   string
  // Joined from users
  affiliate_name:  string
  affiliate_email: string
  pending_balance: number
  total_paid:      number
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function AdminAffiliatePayoutsPage() {
  const supabase = createClient()

  const [requests,    setRequests]    = useState<PayoutRequest[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [processing,  setProcessing]  = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('pending_processing')

  const [stats, setStats] = useState({
    pending:    0,
    processing: 0,
    paidToday:  0,
    totalValue: 0,
  })

  // ── Fetch payout requests with affiliate details ───────────

  const fetchRequests = useCallback(async () => {
    setRefreshing(true)
    try {
      let query = supabase
        .from('payout_requests')
        .select(`
          id, affiliate_id, amount, method, payment_details,
          status, admin_note, requested_at, processed_at
        `)
        .order('requested_at', { ascending: true })

      if (statusFilter === 'pending_processing') {
        query = query.in('status', ['pending', 'processing'])
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data: payouts, error } = await query

      if (error) throw error

      // Enrich with affiliate profile data
      const enriched: PayoutRequest[] = await Promise.all(
        (payouts as any[] || []).map(async (p: any) => {
          const { data: profile } = await supabase
            .from('users')
            .select('full_name, email, pending_balance, total_paid_out')
            .eq('id', p.affiliate_id)
            .single()

          return {
            ...p,
            affiliate_name:  profile?.full_name    || 'Unknown',
            affiliate_email: profile?.email        || '',
            pending_balance: Number(profile?.pending_balance || 0),
            total_paid:      Number(profile?.total_paid_out  || 0),
          }
        })
      )

      setRequests(enriched)

      // Stats from all requests (regardless of filter)
      const { data: all } = await supabase
        .from('payout_requests')
        .select('status, amount, processed_at')

      const today  = new Date().toDateString()
      setStats({
        pending:    all?.filter(r => r.status === 'pending').length    || 0,
        processing: all?.filter(r => r.status === 'processing').length || 0,
        paidToday:  all?.filter(r =>
          r.status === 'paid' &&
          r.processed_at &&
          new Date(r.processed_at).toDateString() === today
        ).length || 0,
        totalValue: (all || [])
          .filter(r => ['pending','processing'].includes(r.status))
          .reduce((s, r) => s + Number(r.amount), 0),
      })

    } catch (err) {
      console.error('fetchRequests:', err)
      toast.error('Failed to load payout requests')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  // ── Mark as paid ──────────────────────────────────────────

  const markPaid = async (req: PayoutRequest) => {
    if (!confirm(
      `Confirm: $${req.amount.toFixed(2)} paid to ${req.affiliate_name} via ${req.method}?`
    )) return

    setProcessing(req.id)
    try {
      // 1. Update payout_requests
      const { error: payoutError } = await supabase
        .from('payout_requests')
        .update({
          status:       'paid',
          processed_at: new Date().toISOString(),
        })
        .eq('id', req.id)

      if (payoutError) throw payoutError

      // 2. Update affiliate profile balances
      const { error: profileError } = await supabase
        .from('users')
        .update({
          pending_balance: Math.max(0, req.pending_balance - req.amount),
          total_paid_out:  req.total_paid + req.amount,
        })
        .eq('id', req.affiliate_id)

      if (profileError) throw profileError

      // 3. Write ledger entry
      await supabase.from('earnings_ledger').insert({
        affiliate_id:  req.affiliate_id,
        payout_id:     req.id,
        type:          'paid_out',
        amount:        req.amount,
        description:   `Payout via ${req.method} — marked paid by admin`,
        balance_after: Math.max(0, req.pending_balance - req.amount),
        created_at:    new Date().toISOString(),
      })

      // 4. Log to admin_logs
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('admin_logs').insert({
        admin_id:   user?.id,
        action:     'payout_marked_paid',
        details:    { payout_id: req.id, affiliate_id: req.affiliate_id, amount: req.amount, method: req.method },
        created_at: new Date().toISOString(),
      })

      toast.success(`Payout of $${req.amount.toFixed(2)} marked as paid`)
      fetchRequests()

    } catch (err: any) {
      console.error('markPaid:', err)
      toast.error('Failed to mark payout as paid')
    } finally {
      setProcessing(null)
    }
  }

  // ── Reject / fail a payout ────────────────────────────────

  const updateStatus = async (
    req: PayoutRequest,
    newStatus: 'rejected' | 'failed',
    note: string
  ) => {
    setProcessing(req.id)
    try {
      await supabase
        .from('payout_requests')
        .update({
          status:       newStatus,
          admin_note:   note,
          processed_at: new Date().toISOString(),
        })
        .eq('id', req.id)

      // Restore balance if rejecting (money was already reserved)
      if (newStatus === 'rejected') {
        await supabase
          .from('users')
          .update({ pending_balance: req.pending_balance + req.amount })
          .eq('id', req.affiliate_id)
      }

      toast.success(`Payout ${newStatus}`)
      fetchRequests()
    } catch (err) {
      toast.error('Failed to update payout status')
    } finally {
      setProcessing(null)
    }
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Affiliate Payouts</h1>
            <p className="text-sm text-gray-500">Review and process pending payout requests</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchRequests}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending',           value: stats.pending,                             colour: 'text-amber-600' },
          { label: 'Processing',        value: stats.processing,                           colour: 'text-blue-600'  },
          { label: 'Paid today',        value: stats.paidToday,                            colour: 'text-green-600' },
          { label: 'Total to send',     value: `$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            colour: 'text-primary-600' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.colour}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {[
            { value: 'pending_processing', label: 'Action needed' },
            { value: 'paid',               label: 'Paid'          },
            { value: 'rejected',           label: 'Rejected'      },
            { value: 'all',                label: 'All'           },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                statusFilter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Requests list */}
      {requests.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500">No payout requests matching this filter</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <Card key={req.id} className={`p-5 ${
              ['pending','processing'].includes(req.status)
                ? 'border-amber-200 bg-amber-50/30'
                : ''
            }`}>
              <div className="flex items-start gap-4 flex-wrap lg:flex-nowrap">

                {/* Affiliate info */}
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold text-gray-900">{req.affiliate_name}</p>
                  <p className="text-xs text-gray-500">{req.affiliate_email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Requested: {new Date(req.requested_at).toLocaleDateString()}
                  </p>
                  {req.processed_at && (
                    <p className="text-xs text-gray-400">
                      Processed: {new Date(req.processed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Amount + method */}
                <div className="flex-1 min-w-[140px]">
                  <p className="text-2xl font-bold text-gray-900">
                    ${req.amount.toFixed(2)}
                  </p>
                  <p className="text-sm capitalize text-gray-600">{req.method}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Remaining balance: ${Math.max(0, req.pending_balance - req.amount).toFixed(2)}
                  </p>
                </div>

                {/* Payment details */}
                <div className="flex-1 min-w-[180px]">
                  <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                    Send to
                  </p>
                  {Object.entries(req.payment_details || {})
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <p key={k} className="text-sm font-mono text-gray-800 break-all">
                        {v}
                      </p>
                    ))}
                  {Object.keys(req.payment_details || {}).length === 0 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> No payment details on file
                    </p>
                  )}
                </div>

                {/* Status + actions */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    req.status === 'paid'       ? 'bg-green-100 text-green-700' :
                    req.status === 'processing' ? 'bg-blue-100  text-blue-700'  :
                    req.status === 'rejected'   ? 'bg-red-100   text-red-700'   :
                    req.status === 'failed'     ? 'bg-red-100   text-red-700'   :
                                                  'bg-amber-100 text-amber-700'
                  }`}>
                    {req.status}
                  </span>

                  {['pending','processing'].includes(req.status) && (
                    <div className="flex gap-2">
                      {/* Mark paid */}
                      <Button
                        size="sm"
                        onClick={() => markPaid(req)}
                        disabled={processing === req.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {processing === req.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          : <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        }
                        Mark paid
                      </Button>

                      {/* Reject */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const note = prompt('Rejection reason (shown to affiliate):')
                          if (note !== null) updateStatus(req, 'rejected', note)
                        }}
                        disabled={processing === req.id}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}

                  {req.admin_note && (
                    <p className="text-xs text-gray-500 max-w-[200px] text-right">
                      Note: {req.admin_note}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

