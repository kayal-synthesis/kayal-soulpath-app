'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Bell, CheckCircle, AlertTriangle, Info,
  Check, Settings, Trash2, Loader2, RefreshCw,
  DollarSign, Users,
} from 'lucide-react'
import { toast } from 'sonner'

// Real, complete rebuild. Every notification here used to be one of
// six hardcoded fake entries, "500 new users joined today," a fake
// "24" total with fake page buttons that always led to the exact same
// six rows. The real notifications table already exists and is
// already being written to, tonight's own commission logic inserts
// real rows here on every real sale, this page just never connected
// to it.

interface AdminNotification {
  id:         string
  title:      string
  message:    string
  type:       string
  read:       boolean
  created_at: string
  data?:      any
}

// Real type-to-visual mapping, matching the real notification types
// tonight's own commission logic actually writes, with an honest,
// generic fallback for any type not explicitly known, rather than
// breaking on an unrecognized one.
const TYPE_META: Record<string, { icon: any; bg: string; color: string }> = {
  affiliate_conversion:     { icon: DollarSign,    bg: 'bg-green-100', color: 'text-green-600' },
  affiliate_referral_bonus: { icon: Users,         bg: 'bg-purple-100', color: 'text-purple-600' },
  alert:                    { icon: AlertTriangle, bg: 'bg-red-100',   color: 'text-red-600' },
  success:                  { icon: CheckCircle,   bg: 'bg-green-100', color: 'text-green-600' },
}
const DEFAULT_META = { icon: Info, bg: 'bg-blue-100', color: 'text-blue-600' }

const getTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    setRefreshing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); setRefreshing(false); return }

      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, type, read, created_at, data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markRead = async (id: string) => {
    setProcessingId(id)
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
      if (error) throw error
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch {
      toast.error('Failed to mark as read')
    } finally {
      setProcessingId(null)
    }
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
      if (error) throw error
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast.success('All notifications marked read')
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const deleteNotification = async (id: string) => {
    setProcessingId(id)
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) throw error
      setNotifications(prev => prev.filter(n => n.id !== id))
      toast.success('Notification deleted')
    } catch {
      toast.error('Failed to delete notification')
    } finally {
      setProcessingId(null)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const filtered = notifications.filter(n =>
    filter === 'all' || (filter === 'unread' && !n.read) || (filter === 'read' && n.read)
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
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-neutral-500 mt-1">
            You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchNotifications} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
            <Check className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button onClick={() => router.push('/admin/settings')}>
            <Settings className="w-4 h-4 mr-2" />
            Notification Settings
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-2">
          {(['all', 'unread', 'read'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${filter === f ? 'bg-primary-600 text-white' : 'hover:bg-neutral-100'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      {/* Notifications List */}
      <Card className="p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-3 text-neutral-400 opacity-30" />
            <p className="text-neutral-500">No notifications{filter !== 'all' ? ` (${filter})` : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((notif) => {
              const meta = TYPE_META[notif.type] || DEFAULT_META
              const Icon = meta.icon
              return (
                <div
                  key={notif.id}
                  className={`p-4 border rounded-lg transition ${
                    !notif.read ? 'bg-primary-50/30 border-primary-200' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${meta.bg}`}>
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{notif.title}</h4>
                        <span className="text-xs text-neutral-500">{getTimeAgo(notif.created_at)}</span>
                      </div>
                      <p className="text-sm text-neutral-600 mt-1">{notif.message}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 bg-primary-600 rounded-full mt-2" />
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t">
                    {!notif.read && (
                      <button
                        onClick={() => markRead(notif.id)}
                        disabled={processingId === notif.id}
                        className="p-1 hover:bg-neutral-100 rounded text-xs flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      disabled={processingId === notif.id}
                      className="p-1 hover:bg-red-50 text-red-600 rounded text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
