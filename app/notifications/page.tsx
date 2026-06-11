'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { 
  Bell, 
  Check, 
  X, 
  Gift, 
  Heart, 
  Star, 
  TrendingUp,
  ChevronRight,
  Settings,
  CheckCheck
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/formatting'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: 'referral' | 'report' | 'compatibility' | 'reward' | 'system'
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
  image?: string
}

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'referral',
      title: 'New Referral Signup!',
      message: 'Sarah joined using your link. You earned a credit!',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
      actionUrl: '/referral'
    },
    {
      id: '2',
      type: 'report',
      title: 'New Report Available',
      message: 'Your Love Oracle report is ready to view.',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      actionUrl: '/report/love-oracle'
    },
    {
      id: '3',
      type: 'reward',
      title: 'Reward Claimed!',
      message: 'You successfully claimed The Wealth Code report.',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      actionUrl: '/referral/rewards'
    },
    {
      id: '4',
      type: 'compatibility',
      title: 'New Compatibility Check',
      message: 'Michael checked compatibility with you!',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
      actionUrl: '/compatibility'
    },
    {
      id: '5',
      type: 'system',
      title: 'Welcome to Kayal LifeOS!',
      message: 'Thank you for joining. Complete your onboarding to get started.',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
      actionUrl: '/onboarding/basic'
    }
  ])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const getIcon = (type: string) => {
    switch(type) {
      case 'referral': return Gift
      case 'report': return Star
      case 'compatibility': return Heart
      case 'reward': return TrendingUp
      default: return Bell
    }
  }

  const getIconColor = (type: string) => {
    switch(type) {
      case 'referral': return 'text-green-600 bg-green-100'
      case 'report': return 'text-purple-600 bg-purple-100'
      case 'compatibility': return 'text-red-600 bg-red-100'
      case 'reward': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
    toast.success('All notifications marked as read')
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    toast.success('Notification deleted')
  }

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' ? true : !n.read
  )

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-primary-900">Notifications</h1>
            <p className="text-sm text-neutral-500">
              {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => router.push('/account?tab=notifications')}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white border hover:bg-neutral-50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            filter === 'unread'
              ? 'bg-primary-600 text-white'
              : 'bg-white border hover:bg-neutral-50'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary-200 text-primary-800 rounded-full text-xs">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">No notifications</h3>
          <p className="text-neutral-500 text-sm">
            {filter === 'unread' 
              ? 'You have no unread notifications' 
              : 'You\'re all caught up!'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = getIcon(notification.type)
            const iconColor = getIconColor(notification.type)
            
            return (
              <Card
                key={notification.id}
                className={`relative hover:shadow-md transition-all cursor-pointer ${
                  !notification.read ? 'border-l-4 border-l-primary-600' : ''
                }`}
                onClick={() => {
                  markAsRead(notification.id)
                  if (notification.actionUrl) {
                    router.push(notification.actionUrl)
                  }
                }}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`font-medium ${!notification.read ? 'text-primary-900' : ''}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-neutral-600 mt-1">
                          {notification.message}
                        </p>
                      </div>
                      <span className="text-xs text-neutral-400 whitespace-nowrap">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <span className="w-2 h-2 bg-primary-600 rounded-full" />
                        )}
                        {notification.actionUrl && (
                          <span className="text-xs text-primary-600 flex items-center">
                            View details
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                            className="p-1 hover:bg-neutral-100 rounded"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4 text-neutral-500" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                          className="p-1 hover:bg-neutral-100 rounded"
                          title="Delete"
                        >
                          <X className="w-4 h-4 text-neutral-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}