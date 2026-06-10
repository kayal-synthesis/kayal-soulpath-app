'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  BellRing, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Mail,
  Sparkles,
  Heart,
  MessageCircle
} from 'lucide-react'

interface Notification {
  id: string
  type: 'message' | 'alert' | 'success' | 'reminder' | 'promo'
  title: string
  message: string
  time: string
  read: boolean
}

interface NotificationCenterProps {
  notifications: Notification[]
  onNotificationClick: (id: string) => void
}

export const NotificationCenter = ({ notifications, onNotificationClick }: NotificationCenterProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'message': return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'alert': return <AlertCircle className="w-4 h-4 text-amber-500" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'reminder': return <Bell className="w-4 h-4 text-purple-500" />
      case 'promo': return <Sparkles className="w-4 h-4 text-rose-500" />
      default: return <Info className="w-4 h-4 text-neutral-500" />
    }
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-neutral-100 rounded-lg transition"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-primary-600" />
        ) : (
          <Bell className="w-5 h-5 text-neutral-600" />
        )}
        {unreadCount > 0 && (
          <>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-800">Notifications</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-neutral-100 rounded"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.button
                    key={notification.id}
                    whileHover={{ backgroundColor: '#f9fafb' }}
                    onClick={() => {
                      onNotificationClick(notification.id)
                      setIsOpen(false)
                    }}
                    className={`w-full p-4 text-left border-b border-neutral-100 last:border-0 ${
                      !notification.read ? 'bg-primary-50/50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm font-medium ${
                            !notification.read ? 'text-neutral-900' : 'text-neutral-600'
                          }`}>
                            {notification.title}
                          </p>
                          <span className="text-[10px] text-neutral-400 whitespace-nowrap ml-2">
                            {notification.time}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-neutral-200 bg-neutral-50">
              <button className="w-full text-xs text-primary-600 hover:text-primary-700 font-medium">
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}