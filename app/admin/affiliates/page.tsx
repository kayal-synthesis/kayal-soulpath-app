// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Award, Users, DollarSign, TrendingUp, Search,
  MoreVertical, CheckCircle, XCircle, Loader2,
  Calendar, ExternalLink, RefreshCw, Filter,
  Download, Mail, Phone, Globe, Clock,
  AlertCircle, Shield, Ban, Check
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Affiliate {
  id: string
  user_id: string
  company_name: string | null
  referral_code: string | null
  commission_rate: number | null
  total_earned: number | null
  pending_balance: number | null
  total_paid: number | null
  payout_method: string | null
  payout_details: any
  approved: boolean | null
  approved_at: string | null
  approved_by: string | null
  referred_by: string | null
  created_at: string
  users?: {
    email: string
    full_name: string | null
    phone: string | null
  }
}

export default function AdminAffiliatesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({
    total: 0, approved: 0, pending: 0,
    totalEarnings: 0, pendingPayouts: 0, totalPaid: 0
  })

  const fetchAffiliates = async () => {
    setRefreshing(true)
    try {
      // ── FIX: only select columns that exist in users table ──────
      const { data, error } = await supabase
        .from('affiliate_profiles')
        .select(`
          *,
          users (
            email,
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setAffiliates(data || [])

      const approved      = data?.filter(a => a.approved === true).length || 0
      const pending       = data?.filter(a => a.approved === false).length || 0
      const totalEarnings = data?.reduce((s, a) => s + (Number(a.total_earned) || 0), 0) || 0
      const pendingPayouts = data?.reduce((s, a) => s + (Number(a.pending_balance) || 0), 0) || 0
      const totalPaid     = data?.reduce((s, a) => s + (Number(a.total_paid) || 0), 0) || 0

      setStats({ total: data?.length || 0, approved, pending, totalEarnings, pendingPayouts, totalPaid })
    } catch (error) {
      console.error('Error fetching affiliates:', error)
      toast.error('Failed to load affiliates')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchAffiliates() }, [])

  const approveAffiliate = async (affiliateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('affiliate_profiles')
        .update({ approved: true, approved_at: new Date().toISOString(), approved_by: user?.id })
        .eq('id', affiliateId)
      if (error) throw error
      toast.success('Affiliate approved')
      fetchAffiliates()
    } catch { toast.error('Failed to approve affiliate') }
  }

  const rejectAffiliate = async (affiliateId: string) => {
    if (!confirm('Reject this affiliate?')) return
    try {
      const { error } = await supabase.from('affiliate_profiles').delete().eq('id', affiliateId)
      if (error) throw error
      toast.success('Affiliate rejected')
      fetchAffiliates()
    } catch { toast.error('Failed to reject affiliate') }
  }

  const processPayout = async (affiliateId: string, amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('payout_requests').insert({
        affiliate_id: affiliateId, amount,
        status: 'pending',
        requested_at: new Date().toISOString(),
        requested_by: user?.id
      })
      if (error) throw error
      toast.success('Payout request created')
      fetchAffiliates()
    } catch { toast.error('Failed to create payout') }
  }

  const filteredAffiliates = affiliates.filter(aff => {
    if (search) {
      const s = search.toLowerCase()
      if (
        !aff.users?.full_name?.toLowerCase().includes(s) &&
        !aff.users?.email?.toLowerCase().includes(s) &&
        !aff.company_name?.toLowerCase().includes(s) &&
        !aff.referral_code?.toLowerCase().includes(s)
      ) return false
    }
    if (filter === 'approved')      return aff.approved === true
    if (filter === 'pending')       return aff.approved === false
    if (filter === 'has_earnings')  return (aff.total_earned || 0) > 0
    if (filter === 'pending_payout') return (aff.pending_balance || 0) > 0
    return true
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Affiliates</h1>
            <p className="text-sm text-gray-500">Manage your affiliate partners · Flat 30% commission</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAffiliates} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Total',           value: stats.total,                           color: '' },
          { label: 'Approved',        value: stats.approved,                        color: 'text-green-600' },
          { label: 'Pending',         value: stats.pending,                         color: 'text-yellow-600' },
          { label: 'Total Earned',    value: `$${stats.totalEarnings.toLocaleString()}`, color: '' },
          { label: 'Pending Payout',  value: `$${stats.pendingPayouts.toLocaleString()}`, color: 'text-orange-600' },
          { label: 'Commission Rate', value: '30%',                                  color: 'text-primary-600' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Search + Filter */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search by name, email, company, or referral code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
            <option value="all">All Affiliates</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Approval</option>
            <option value="has_earnings">Has Earnings</option>
            <option value="pending_payout">Pending Payout</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="py-3 px-4">Affiliate</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Referral Code</th>
                <th className="py-3 px-4">Commission</th>
                <th className="py-3 px-4">Earned</th>
                <th className="py-3 px-4">Pending</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAffiliates.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">No affiliates found</td></tr>
              ) : filteredAffiliates.map(aff => (
                <tr key={aff.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <p className="font-medium">{aff.users?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{aff.users?.email}</p>
                    {aff.users?.phone && <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" />{aff.users.phone}</p>}
                  </td>
                  <td className="py-3 px-4">{aff.company_name || '-'}</td>
                  <td className="py-3 px-4">
                    {aff.approved
                      ? <Badge variant="success">Approved</Badge>
                      : <Badge variant="warning">Pending</Badge>}
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">{aff.referral_code || '-'}</td>
                  {/* FIX: flat 30% — not 10% */}
                  <td className="py-3 px-4">{aff.commission_rate ? `${aff.commission_rate}%` : '30%'}</td>
                  <td className="py-3 px-4 font-medium">${(aff.total_earned || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-orange-600">${(aff.pending_balance || 0).toLocaleString()}</td>
                  <td className="py-3 px-4">${(aff.total_paid || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm">{new Date(aff.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {!aff.approved && (
                        <>
                          <button onClick={() => approveAffiliate(aff.id)} className="p-1 hover:bg-green-100 rounded text-green-600" title="Approve"><Check className="w-4 h-4" /></button>
                          <button onClick={() => rejectAffiliate(aff.id)} className="p-1 hover:bg-red-100 rounded text-red-600" title="Reject"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                      {(aff.pending_balance || 0) > 0 && (
                        <button onClick={() => processPayout(aff.id, aff.pending_balance!)} className="p-1 hover:bg-blue-100 rounded text-blue-600" title="Process Payout"><DollarSign className="w-4 h-4" /></button>
                      )}
                      <button className="p-1 hover:bg-gray-200 rounded"><Mail className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
