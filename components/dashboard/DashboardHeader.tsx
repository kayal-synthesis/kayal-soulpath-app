'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  HelpCircle,
  Sparkles,
  Gift,
  Heart,
  TrendingUp
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'

export const DashboardHeader = () => {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  
  const searchRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Mock notifications data
  const notifications = [
    {
      id: '1',
      title: 'New Insight Available',
      message: 'Your daily guidance is ready',
      time: '5 min ago',
      read: false,
      icon: Sparkles,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
    {
      id: '2',
      title: 'Referral Earned',
      message: 'Sarah joined using your link',
      time: '1 hour ago',
      read: false,
      icon: Gift,
      color: 'text-green-600',
      bg: 'bg-green-100'
    }
  ]

  const unreadCount = notifications.filter(n => !n.read).length

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/')
    toast.success('Logged out successfully')
  }

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg transition"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-serif text-primary-900">☾</span>
              <span className="font-serif text-primary-900 hidden sm:block">Kayal LifeOS</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search insights, tools, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Right Section - Icons & User Menu */}
          <div className="flex items-center gap-2">
            {/* Search Icon for Mobile */}
            <button className="md:hidden p-2 hover:bg-neutral-100 rounded-lg transition">
              <Search className="w-5 h-5 text-neutral-600" />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-neutral-100 rounded-lg transition"
              >
                <Bell className="w-5 h-5 text-neutral-600" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute top-1 right-1 w-2 h-2 bg-secondary-500 rounded-full animate-ping" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-secondary-500 rounded-full" />
                  </>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-neutral-200">
                      <h3 className="font-medium">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => {
                        const Icon = notification.icon
                        return (
                          <div
                            key={notification.id}
                            className={`flex items-start gap-3 p-4 hover:bg-neutral-50 transition ${
                              !notification.read ? 'bg-primary-50/50' : ''
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full ${notification.bg} flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-4 h-4 ${notification.color}`} />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">{notification.title}</p>
                              <p className="text-xs text-neutral-500">{notification.message}</p>
                              <p className="text-[10px] text-neutral-400 mt-1">{notification.time}</p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary-600 rounded-full" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 pl-2 border-l border-neutral-200 hover:bg-neutral-50 rounded-lg transition p-2"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{session?.user?.name || 'Guest'}</p>
                  <p className="text-xs text-neutral-500">Free Member</p>
                </div>
                <Avatar 
                  src={session?.user?.avatar} 
                  fallback={session?.user?.name?.charAt(0) || 'U'} 
                  size="md"
                />
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-neutral-200">
                      <p className="font-medium">{session?.user?.name || 'Guest User'}</p>
                      <p className="text-xs text-neutral-500">{session?.user?.email || 'guest@example.com'}</p>
                      <Badge variant="primary" size="sm" className="mt-2">Free Member</Badge>
                    </div>

                    <div className="p-2">
                      {/* FIXED: Changed from '/profile' to '/dashboard/profile' */}
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          router.push('/dashboard/profile')  // ← FIXED HERE
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-50 transition text-left"
                      >
                        <User className="w-4 h-4 text-neutral-500" />
                        <span className="text-sm">Your Profile</span>
                      </button>

                      {/* FIXED: This one is correct - '/account' exists */}
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          router.push('/account')  // ← This is correct
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-50 transition text-left"
                      >
                        <Settings className="w-4 h-4 text-neutral-500" />
                        <span className="text-sm">Account Settings</span>
                      </button>

                      {/* FIXED: Added Help & Support option */}
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          router.push('/faq')  // ← Help page
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-50 transition text-left"
                      >
                        <HelpCircle className="w-4 h-4 text-neutral-500" />
                        <span className="text-sm">Help & Support</span>
                      </button>

                      <div className="border-t border-neutral-200 my-1" />
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 transition text-left text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-neutral-200"
            >
              <div className="py-3 space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-neutral-50 transition">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span>Love</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-neutral-50 transition">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span>Wealth</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
