// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Users, Search, MoreVertical, Ban, XCircle, Download, Loader2, RefreshCw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface AdminUser {
  id: string
  full_name: string | null
  email: string | null
  // FIX: use actual schema columns (no last_active/total_spent/referrals_count/status)
  created_at: string
  last_sign_in_at: string | null
  is_active: number | null
  affiliate_status: string | null
  dob: string | null
}

const PAGE_SIZE = 20

export default function AdminUsersPage() {
  const router = useRouter()
  const supabase = createClient()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ total:0, activeToday:0, affiliates:0, revenue:0 })
  const [deleteWarning, setDeleteWarning] = useState<{ user: AdminUser; recruitCount: number } | null>(null)
  const [exporting, setExporting] = useState(false)

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    const [totalRes, todayRes, affRes, revRes] = await Promise.all([
      supabase.from('users').select('*',{count:'exact',head:true}),
      supabase.from('users').select('*',{count:'exact',head:true}).gte('last_sign_in_at',today),
      // Real, confirmed source of truth, users, not affiliate_profiles,
      // confirmed empty, zero rows ever.
      supabase.from('users').select('*',{count:'exact',head:true}).eq('affiliate_status','active'),
      // Real, correct revenue source, revenue_events, not purchases.price
      // summed directly, same real fix already proven on the standalone
      // Revenue page, see its own header comment for why.
      supabase.from('revenue_events').select('amount_usd'),
    ])
    setStats({
      total: totalRes.count||0,
      activeToday: todayRes.count||0,
      affiliates: affRes.count||0,
      revenue: (revRes.data||[]).reduce((s:number,e:any)=>s+(Number(e.amount_usd)||0),0)
    })
  }

  const fetchUsers = useCallback(async (pageNum=0) => {
    setRefreshing(true)
    try {
      // FIX: only select columns that exist in the users table
      let query = supabase
        .from('users')
        .select('id, full_name, email, created_at, last_sign_in_at, is_active, affiliate_status, dob', { count:'exact' })
        .order('created_at', { ascending: false })
        .range(pageNum*PAGE_SIZE, pageNum*PAGE_SIZE+PAGE_SIZE-1)

      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
      // FIX: filter by affiliate_status not role/premium
      if (filter==='affiliates')   query = query.eq('affiliate_status','active')
      if (filter==='inactive')     query = query.eq('is_active',0)

      const { data, count, error } = await query
      if (error) throw error
      setUsers(data||[])
      setTotal(count||0)
      setPage(pageNum)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, filter])

  useEffect(()=>{ fetchStats(); fetchUsers(0) },[fetchUsers])

  // Real, working export, replacing a button that previously had no
  // handler at all, matching the same real, proven pattern already
  // used on the Purchases page tonight.
  const exportCSV = async () => {
    setExporting(true)
    try {
      let query = supabase
        .from('users')
        .select('full_name, email, created_at, last_sign_in_at, is_active, affiliate_status, referral_code')
        .order('created_at', { ascending: false })
        .limit(5000)

      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
      if (filter==='affiliates')   query = query.eq('affiliate_status','active')
      if (filter==='inactive')     query = query.eq('is_active',0)

      const { data, error } = await query
      if (error) throw error
      if (!data || data.length === 0) {
        toast.error('No users to export')
        return
      }

      const headers = ['Name', 'Email', 'Joined', 'Last Sign In', 'Active', 'Affiliate Status', 'Referral Code']
      const rows = data.map((u: any) => [
        u.full_name || '',
        u.email || '',
        new Date(u.created_at).toISOString(),
        u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString() : '',
        u.is_active === 0 ? 'No' : 'Yes',
        u.affiliate_status || '',
        u.referral_code || '',
      ])
      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success(`Exported ${data.length} users${data.length === 5000 ? ' (capped at 5,000)' : ''}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export users')
    } finally {
      setExporting(false)
    }
  }

  const handleSuspend = async (userId:string) => {
    try {
      // FIX: is_active is integer (0=inactive), not a status string
      const { error } = await supabase.from('users').update({ is_active:0 }).eq('id',userId)
      if (error) throw error
      toast.success('User deactivated')
      fetchUsers(page)
    } catch { toast.error('Failed to suspend user') }
  }

  // Checks whether this user has recruited any active sub-affiliates before
  // allowing deletion. Now that Tier-2 overrides are real, live money,
  // deleting a recruiter would silently orphan every sub-affiliate under
  // them, recruited_by would point at a user who no longer exists, and
  // their overrides would just quietly stop crediting with no error
  // anywhere. This surfaces that risk before it happens rather than after.
  const checkRecruits = async (user: AdminUser): Promise<number> => {
    // Real, confirmed source of truth, users, not affiliate_profiles,
    // confirmed empty, zero rows ever. This check queried a table with
    // no real data in it, meaning it silently never fired for anyone,
    // referral_code lives directly on the same real users row.
    const { data: profile } = await supabase
      .from('users')
      .select('referral_code')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.referral_code) return 0

    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('recruited_by', profile.referral_code)

    return count || 0
  }

  const handleDeleteClick = async (user: AdminUser) => {
    const recruitCount = await checkRecruits(user)
    if (recruitCount > 0) {
      setDeleteWarning({ user, recruitCount })
      return
    }
    performDelete(user.id)
  }

  const performDelete = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      const { error } = await supabase.from('users').delete().eq('id',userId)
      if (error) throw error
      toast.success('User deleted')
      fetchUsers(page)
    } catch { toast.error('Failed to delete user') }
  }

  const totalPages = Math.ceil(total/PAGE_SIZE)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600"/>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-sm text-neutral-500">{total.toLocaleString()} total users</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=>fetchUsers(page)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing?'animate-spin':''}`}/>Refresh
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Download className="w-4 h-4 mr-2"/>}
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total Users',    value:stats.total.toLocaleString(),       color:'' },
          { label:'Active Today',   value:stats.activeToday.toLocaleString(), color:'text-green-600' },
          { label:'Affiliates',     value:stats.affiliates.toLocaleString(),  color:'text-purple-600' },
          { label:'Total Revenue',  value:`$${stats.revenue.toLocaleString()}`, color:'text-primary-600' },
        ].map(s=>(
          <Card key={s.label} className="p-4">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Search + Filter */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg"/>
          </div>
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
            <option value="all">All Users</option>
            <option value="affiliates">Affiliates</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-neutral-500">
                <th className="pb-3 px-2">User</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2">Affiliate</th>
                <th className="pb-3 px-2">Joined</th>
                <th className="pb-3 px-2">Last Sign In</th>
                <th className="pb-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length===0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-neutral-400">No users found</td></tr>
              ) : users.map(u=>(
                <tr key={u.id} className="border-b hover:bg-neutral-50">
                  <td className="py-3 px-2">
                    <p className="font-medium">{u.full_name||'No name'}</p>
                    <p className="text-xs text-neutral-500">{u.email}</p>
                  </td>
                  <td className="py-3 px-2">
                    <Badge variant={u.is_active===1||u.is_active===null?'success':'warning'}>
                      {u.is_active===0?'Inactive':'Active'}
                    </Badge>
                  </td>
                  <td className="py-3 px-2">
                    {u.affiliate_status==='active'
                      ? <Badge variant="secondary">Affiliate</Badge>
                      : <span className="text-neutral-400 text-sm">—</span>}
                  </td>
                  <td className="py-3 px-2 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-2 text-sm">{u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleDateString():'Never'}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>handleSuspend(u.id)} className="p-1 hover:bg-yellow-100 rounded text-yellow-600" title="Deactivate"><Ban className="w-4 h-4"/></button>
                      <button onClick={()=>handleDeleteClick(u)} className="p-1 hover:bg-red-100 rounded text-red-600" title="Delete"><XCircle className="w-4 h-4"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <p className="text-sm text-neutral-500">
            Showing {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,total)} of {total.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button onClick={()=>fetchUsers(page-1)} disabled={page===0} className="px-3 py-1 border rounded-lg hover:bg-neutral-50 disabled:opacity-40">Previous</button>
            {Array.from({length:Math.min(3,totalPages)},(_,i)=>page>1?page-1+i:i).map(p=>(
              <button key={p} onClick={()=>fetchUsers(p)} className={`px-3 py-1 rounded-lg ${p===page?'bg-primary-600 text-white':'border hover:bg-neutral-50'}`}>{p+1}</button>
            ))}
            <button onClick={()=>fetchUsers(page+1)} disabled={page>=totalPages-1} className="px-3 py-1 border rounded-lg hover:bg-neutral-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </Card>

      {/* Delete warning modal */}
      {deleteWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteWarning(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-bold">This person has recruited affiliates</h2>
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              <strong>{deleteWarning.user.full_name || deleteWarning.user.email}</strong> has recruited <strong>{deleteWarning.recruitCount}</strong> {deleteWarning.recruitCount === 1 ? 'affiliate' : 'affiliates'}. Deleting this account leaves those affiliates' recruited_by pointing at a user that no longer exists, and any Tier-2 override they were generating for this person will simply stop crediting anyone, silently, no error, no record of why.
            </p>
            <p className="text-sm text-neutral-600 mb-6">
              Deactivating instead keeps the recruitment relationship intact and stops this person from earning further, without breaking anything for the affiliates underneath them.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => { handleSuspend(deleteWarning.user.id); setDeleteWarning(null) }}
                className="flex-1"
              >
                Deactivate Instead
              </Button>
              <Button
                variant="outline"
                onClick={() => { performDelete(deleteWarning.user.id); setDeleteWarning(null) }}
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                Delete Anyway
              </Button>
            </div>
            <button onClick={() => setDeleteWarning(null)} className="mt-3 text-sm text-neutral-400 hover:text-neutral-600 w-full text-center">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
