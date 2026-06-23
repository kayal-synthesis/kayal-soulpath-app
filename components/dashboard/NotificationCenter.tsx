'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, BellRing, X, CheckCircle, AlertCircle,
  Info, Sparkles, MessageCircle
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

  const getIcon = (type: string) => {
    switch(type) {
      case 'message':  return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'alert':    return <AlertCircle   className="w-4 h-4 text-amber-500" />
      case 'success':  return <CheckCircle   className="w-4 h-4 text-green-500" />
      case 'reminder': return <Bell          className="w-4 h-4 text-purple-500" />
      case 'promo':    return <Sparkles      className="w-4 h-4 text-rose-500" />
      default:         return <Info          className="w-4 h-4 text-neutral-500" />
    }
  }

  return (
    <>
      {/* Full-screen backdrop — closes dropdown on tap outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[90]"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="relative">
        {/* Bell Button */}
        <button
          onClick={() => setIsOpen(o => !o)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition relative"
        >
          {unreadCount > 0 ? (
            <BellRing className="w-4 h-4 text-primary-600" />
          ) : (
            <Bell className="w-4 h-4 text-neutral-500" />
          )}
          {unreadCount > 0 && (
            <>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </>
          )}
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-[100]"
              style={{ width: 'min(320px, calc(100vw - 2rem))' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-neutral-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition"
                >
                  <X className="w-3.5 h-3.5 text-neutral-500" />
                </button>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto overscroll-contain">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="text-sm text-neutral-500">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { onNotificationClick(n.id); setIsOpen(false) }}
                      className={`w-full p-4 text-left border-b border-neutral-50 last:border-0 hover:bg-neutral-50 transition-colors ${
                        !n.read ? 'bg-primary-50/40' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">{getIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className={`text-xs font-semibold truncate ${!n.read ? 'text-neutral-900' : 'text-neutral-600'}`}>
                              {n.title}
                            </p>
                            <span className="text-[10px] text-neutral-400 whitespace-nowrap ml-2 flex-shrink-0">
                              {n.time}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                        {!n.read && (
                          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-xs text-primary-600 hover:text-primary-700 font-semibold text-center"
                >
                  View all notifications
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}