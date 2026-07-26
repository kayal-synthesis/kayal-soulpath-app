// @ts-nocheck
'use client'

// app/admin/affiliates/page.tsx
//
// This is the missing piece the whole affiliate system has been waiting
// on: nothing anywhere in this codebase could actually set
// affiliate_profiles.approved = true, or assign a Strategic-tier
// commission_rate, or an override_rate for Tier-2 sub-affiliate credit.
// The commission-crediting logic in /api/user/add-purchase already reads
// all three; this page is what actually writes them.
//
// Approving someone here does two things together, deliberately, not one:
//   1. affiliate_profiles.approved = true (what the crediting logic and
//      ReferralTeaser.tsx both already check)
//   2. users.affiliate_status = 'active' (what the admin Users page and
//      the admin dashboard's affiliate count both already check)
// These were confirmed, across multiple independent files, to be two
// separate fields answering the same question, never written together
// anywhere. This is the one place in the whole system that writes both
// at once, so the two views of "is this person an affiliate" stop being
// able to disagree with each other.

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Users, CheckCircle, XCircle, Loader2, RefreshCw,
  Crown, Award, Target, Search, Edit2, X, Mail,
} from 'lucide-react'
import { toast } from 'sonner'

interface PendingAffiliate {
  id: string
  user_id: string
  referral_code: string | null
  approved: boolean | null
  status: string | null
  commission_rate: number | null
  override_rate: number | null
  created_at: string
  users?: { full_name?: string; email?: string }
}

const PAGE_SIZE = 20

// Standard/Performance tiers are automatic and computed at sale time in
// /api/user/add-purchase, they never need commission_rate set here.
// Strategic is the only tier an admin ever assigns manually, since it's
// the one described on the register page as "by application, negotiable".
function StrategicModal({
  affiliate,
  onClose,
  onSuccess,
}: {
  affiliate: PendingAffiliate
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const supabase = createClient()
  const [commissionRate, setCommissionRate] = useState('35')
  const [overrideRate, setOverrideRate] = useState('8')
  const [grantOverride, setGrantOverride] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    try {
      const rate = parseFloat(commissionRate)
      const override = grantOverride ? parseFloat(overrideRate) : null

      const { error: profileError } = await supabase
        .from('affiliate_profiles')
        .update({
          approved:        true,
          status:          'active',
          commission_rate: rate,
          override_rate:   override,
        })
        .eq('id', affiliate.id)
      if (profileError) throw profileError

      const { error: userError } = await supabase
        .from('users')
        .update({ affiliate_status: 'active' })
        .eq('id', affiliate.user_id)
      if (userError) throw userError

      const { data: { user: admin } } = await supabase.auth.getUser()
      await supabase.from('admin_logs').insert({
        admin_id:   admin?.id,
        action:     'affiliate_approved',
        resource:   affiliate.user_id,
        details:    { tier: 'strategic', commission_rate: rate, override_rate: override },
        created_at: new Date().toISOString(),
      })

      onSuccess(`Approved as Strategic (${rate}% commission${override ? `, ${override}% override` : ''})`)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Approve as Strategic
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-sm text-neutral-600 mb-4">
            {affiliate.users?.full_name || affiliate.users?.email || affiliate.user_id.slice(0, 8)}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Negotiated Commission Rate (%)</label>
              <input
                type="number"
                min={0} max={100} step={0.5}
                value={commissionRate}
                onChange={e => setCommissionRate(e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
              <p className="text-xs text-neutral-400 mt-1">
                Register page describes Strategic as 35% low-ticket / 40% high-ticket, this rate applies flat to every sale regardless of tool price, not the automatic low/high split Standard and Performance use.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <input type="checkbox" checked={grantOverride} onChange={e => setGrantOverride(e.target.checked)} />
                Grant Tier-2 sub-affiliate override
              </label>
              {grantOverride && (
                <input
                  type="number"
                  min={0} max={50} step={0.5}
                  value={overrideRate}
                  onChange={e => setOverrideRate(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Override % on sub-affiliate sales"
                />
              )}
              <p className="text-xs text-neutral-400 mt-1">
                If enabled, this person earns this percentage on sales made by anyone they personally recruit, one level only, on top of what the recruit keeps for themselves.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-6">
            <Button onClick={handleApprove} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve as Strategic'}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminAffiliatesPage() {
  const supabase = createClient()
  const [affiliates, setAffiliates] = useState<PendingAffiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<'pending' | 'active'>('pending')
  const [search, setSearch] = useState('')
  const [strategicTarget, setStrategicTarget] = useState<PendingAffiliate | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchAffiliates = useCallback(async () => {
    setRefreshing(true)
    try {
      let query = supabase
        .from('affiliate_profiles')
        .select('id, user_id, referral_code, approved, status, commission_rate, override_rate, created_at, users:user_id(full_name, email)')
        .order('created_at', { ascending: false })

      query = tab === 'pending' ? query.eq('approved', false) : query.eq('approved', true)

      const { data, error } = await query
      if (error) throw error
      setAffiliates(data || [])
    } catch (err) {
      console.error('Error fetching affiliates:', err)
      toast.error('Failed to load affiliates')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tab])

  useEffect(() => { fetchAffiliates() }, [fetchAffiliates])

  const handleApproveStandard = async (affiliate: PendingAffiliate) => {
    setProcessingId(affiliate.id)
    try {
      const { error: profileError } = await supabase
        .from('affiliate_profiles')
        .update({ approved: true, status: 'active' })
        .eq('id', affiliate.id)
      if (profileError) throw profileError

      const { error: userError } = await supabase
        .from('users')
        .update({ affiliate_status: 'active' })
        .eq('id', affiliate.user_id)
      if (userError) throw userError

      const { data: { user: admin } } = await supabase.auth.getUser()
      await supabase.from('admin_logs').insert({
        admin_id:   admin?.id,
        action:     'affiliate_approved',
        resource:   affiliate.user_id,
        details:    { tier: 'standard' },
        created_at: new Date().toISOString(),
      })

      toast.success('Approved at Standard tier')
      fetchAffiliates()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (affiliate: PendingAffiliate) => {
    if (!confirm('Reject this application? Their account stays active as a regular member, just without affiliate access.')) return
    setProcessingId(affiliate.id)
    try {
      const { error } = await supabase
        .from('affiliate_profiles')
        .update({ status: 'rejected' })
        .eq('id', affiliate.id)
      if (error) throw error

      const { data: { user: admin } } = await supabase.auth.getUser()
      await supabase.from('admin_logs').insert({
        admin_id:   admin?.id,
        action:     'affiliate_rejected',
        resource:   affiliate.user_id,
        created_at: new Date().toISOString(),
      })

      toast.success('Application rejected')
      fetchAffiliates()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject')
    } finally {
      setProcessingId(null)
    }
  }

  const tierBadge = (a: PendingAffiliate) => {
    if (a.commission_rate != null) {
      return <Badge variant="secondary" className="flex items-center gap-1"><Award className="w-3 h-3" />Strategic {a.commission_rate}%{a.override_rate ? ` + ${a.override_rate}% override` : ''}</Badge>
    }
    return <Badge variant="outline" className="flex items-center gap-1"><Target className="w-3 h-3" />Standard/Performance</Badge>
  }

  const filtered = affiliates.filter(a =>
    !search ||
    a.users?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.users?.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.referral_code?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <Crown className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Affiliate Applications</h1>
            <p className="text-sm text-neutral-500">Approve, reject, and manage affiliate tiers</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchAffiliates} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === 'pending' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500'}`}
        >
          Pending
        </button>
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === 'active' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500'}`}
        >
          Active Affiliates
        </button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, email, or referral code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg"
          />
        </div>
      </Card>

      {/* List */}
      <Card className="p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{tab === 'pending' ? 'No pending applications' : 'No active affiliates found'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => (
              <div key={a.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium">{a.users?.full_name || 'No name'}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                      <Mail className="w-3 h-3" />{a.users?.email || a.user_id.slice(0, 8) + '...'}
                      {a.referral_code && <span className="font-mono">· {a.referral_code}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {tab === 'active' && tierBadge(a)}
                  {tab === 'pending' ? (
                    <>
                      <Button size="sm" onClick={() => handleApproveStandard(a)} disabled={processingId === a.id}>
                        {processingId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" />Approve Standard</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setStrategicTarget(a)} disabled={processingId === a.id}>
                        <Award className="w-4 h-4 mr-1" />Approve Strategic
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(a)} disabled={processingId === a.id} className="text-red-600 border-red-200 hover:bg-red-50">
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setStrategicTarget(a)}>
                      <Edit2 className="w-4 h-4 mr-1" />Edit Tier
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {strategicTarget && (
        <StrategicModal
          affiliate={strategicTarget}
          onClose={() => setStrategicTarget(null)}
          onSuccess={(msg) => { toast.success(msg); fetchAffiliates() }}
        />
      )}
    </div>
  )
}
