// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Bell, BellRing, BellOff, Mail,
  CheckCircle, AlertTriangle, Info,
  X, Check, Settings, Send,
  Trash2, Archive, Download, Filter
} from 'lucide-react'

export default function NotificationsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState('all')

  const notifications = [
    { id: 'n1', title: 'Security Alert', message: 'New login from unrecognized device', time: '5 min ago', read: false, type: 'alert' },
    { id: 'n2', title: 'Payout Processed', message: '$2,450 has been sent to your account', time: '1 hour ago', read: false, type: 'success' },
    { id: 'n3', title: 'System Update', message: 'Scheduled maintenance in 2 hours', time: '3 hours ago', read: true, type: 'info' },
    { id: 'n4', title: 'New User Registered', message: '500 new users joined today', time: '5 hours ago', read: true, type: 'info' },
    { id: 'n5', title: 'Backup Completed', message: 'Database backup successful', time: '12 hours ago', read: true, type: 'success' },
    { id: 'n6', title: 'Failed Payment', message: '3 payments failed in the last hour', time: '1 day ago', read: true, type: 'alert' },
  ]

  const unreadCount = notifications.filter(n => !n.read).length

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
          <Button variant="outline">
            <Check className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Notification Settings
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm ${filter === 'all' ? 'bg-primary-600 text-white' : 'hover:bg-neutral-100'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm ${filter === 'unread' ? 'bg-primary-600 text-white' : 'hover:bg-neutral-100'}`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm ${filter === 'read' ? 'bg-primary-600 text-white' : 'hover:bg-neutral-100'}`}
          >
            Read
          </button>
        </div>
      </Card>

      {/* Notifications List */}
      <Card className="p-6">
        <div className="space-y-3">
          {notifications.filter(n => 
            filter === 'all' || 
            (filter === 'unread' && !n.read) || 
            (filter === 'read' && n.read)
          ).map((notif) => (
            <div 
              key={notif.id} 
              className={`p-4 border rounded-lg hover:shadow-sm transition cursor-pointer ${
                !notif.read ? 'bg-primary-50/30 border-primary-200' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  notif.type === 'alert' ? 'bg-red-100' :
                  notif.type === 'success' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {notif.type === 'alert' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                  {notif.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {notif.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{notif.title}</h4>
                    <span className="text-xs text-neutral-400">{notif.time}</span>
                  </div>
                  <p className="text-sm text-neutral-600 mt-1">{notif.message}</p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t">
                <button className="p-1 hover:bg-neutral-100 rounded text-xs flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Mark Read
                </button>
                <button className="p-1 hover:bg-neutral-100 rounded text-xs flex items-center gap-1">
                  <Archive className="w-3 h-3" />
                  Archive
                </button>
                <button className="p-1 hover:bg-red-50 text-red-600 rounded text-xs flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <p className="text-sm text-neutral-500">Showing 1-6 of 24 notifications</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded-lg hover:bg-neutral-50">Previous</button>
            <button className="px-3 py-1 bg-primary-600 text-white rounded-lg">1</button>
            <button className="px-3 py-1 border rounded-lg hover:bg-neutral-50">2</button>
            <button className="px-3 py-1 border rounded-lg hover:bg-neutral-50">3</button>
            <button className="px-3 py-1 border rounded-lg hover:bg-neutral-50">4</button>
            <button className="px-3 py-1 border rounded-lg hover:bg-neutral-50">Next</button>
          </div>
        </div>
      </Card>
    </div>
  )
}