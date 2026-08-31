// @ts-nocheck
 'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  LayoutDashboard, Users, DollarSign, ShoppingBag,
  Layers, BarChart, FileText, Settings, LogOut,
  Menu, X, Bell, Shield, AlertTriangle, Activity,
  Gift, Target, Globe, HelpCircle,
  ChevronLeft, ChevronRight, UserCog, Wallet,
  TrendingUp, Calendar, Clock, Download, Filter,
  Search, Home, PieChart, Zap, Award, Crown,
  Package, CheckSquare
} from 'lucide-react'

interface AdminUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'moderator' | 'finance'
  permissions: any
}

interface NavBadgeCounts {
  purchases: number
  users: number
  affiliates: number
  security: number
  tasks: number
  notifications: number
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [badgeCounts, setBadgeCounts] = useState<NavBadgeCounts>({
    purchases: 0,
    users: 0,
    affiliates: 0,
    security: 0,
    tasks: 0,
    notifications: 0
  })

  useEffect(() => {
    checkAdmin()
    fetchBadgeCounts()
    
    // Set up real-time subscriptions for badge updates
    const purchasesChannel = supabase
      .channel('purchases-count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'purchases' },
        () => fetchBadgeCounts()
      )
      .subscribe()

    const usersChannel = supabase
      .channel('users-count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'users' },
        () => fetchBadgeCounts()
      )
      .subscribe()

    // Real, new affiliates are users table inserts now, confirmed
    // by tonight's schema check, affiliate_profiles is genuinely
    // empty, never written to, this subscription could never have
    // fired. The usersChannel above already covers this.

    const fraudChannel = supabase
      .channel('fraud-count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fraud_alerts' },
        () => fetchBadgeCounts()
      )
      .subscribe()

    // Refresh counts every 5 minutes
    const interval = setInterval(fetchBadgeCounts, 5 * 60 * 1000)

    return () => {
      supabase.removeChannel(purchasesChannel)
      supabase.removeChannel(usersChannel)
      supabase.removeChannel(fraudChannel)
      clearInterval(interval)
    }
  }, [])

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!adminData) {
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      setAdmin(adminData)

      await supabase
        .from('admin_logs')
        .insert({
          admin_id: adminData.id,
          action: 'login',
          details: { path: pathname },
          ip_address: 'captured_by_middleware',
          created_at: new Date().toISOString()
        })

    } catch (error) {
      console.error('Admin check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBadgeCounts = async () => {
    try {
      // Get today's date at midnight
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Purchases today
      const { count: purchasesToday } = await supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // New users today
      const { count: newUsersToday } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // Pending affiliates, real, confirmed source of truth, users,
      // not affiliate_profiles, confirmed genuinely empty tonight.
      const { count: pendingAffiliates } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_status', 'pending')

      // Open fraud alerts
      const { count: openFraudAlerts } = await supabase
        .from('fraud_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')

      // Critical fraud alerts (for security badge)
      const { count: criticalAlerts } = await supabase
        .from('fraud_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .eq('status', 'open')

      // Open tasks, real, genuine tasks table now exists.
      const { count: openTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'done')

      // Unread notifications
      const { data: { user } } = await supabase.auth.getUser()
      let unreadNotifications = 0
      if (user) {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false)
        unreadNotifications = count || 0
      }

      setBadgeCounts({
        purchases: purchasesToday || 0,
        users: newUsersToday || 0,
        affiliates: pendingAffiliates || 0,
        security: criticalAlerts || 0,
        tasks: openTasks || 0,
        notifications: unreadNotifications
      })

    } catch (error) {
      console.error('Error fetching badge counts:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  // Updated navItems with dynamic badge counts
  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'admin', 'moderator', 'finance']
    },
    {
      name: 'Revenue',
      href: '/admin/revenue',
      icon: DollarSign,
      roles: ['super_admin', 'admin', 'finance']
    },
    {
      name: 'Purchases',
      href: '/admin/purchases',
      icon: ShoppingBag,
      roles: ['super_admin', 'admin', 'finance'],
      badge: { count: badgeCounts.purchases, color: 'bg-green-500' }
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      roles: ['super_admin', 'admin', 'moderator'],
      badge: { count: badgeCounts.users, color: 'bg-blue-500' }
    },
    {
      name: 'Demographics',
      href: '/admin/demographics',
      icon: PieChart,
      roles: ['super_admin', 'admin', 'moderator']
    },
    {
      name: 'Affiliates',
      href: '/admin/affiliates',
      icon: Award,
      roles: ['super_admin', 'admin', 'finance'],
      badge: { count: badgeCounts.affiliates, color: 'bg-purple-500' }
    },
    {
      name: 'Tools',
      href: '/admin/tools',
      icon: Package,
      roles: ['super_admin', 'admin']
    },
    {
      name: 'Domains',
      href: '/admin/domains',
      icon: Globe,
      roles: ['super_admin', 'admin']
    },
    {
      name: 'Security',
      href: '/admin/security',
      icon: Shield,
      roles: ['super_admin', 'admin'],
      badge: { count: badgeCounts.security, color: 'bg-red-500' }
    },
    {
      name: 'Tasks',
      href: '/admin/tasks',
      icon: CheckSquare,
      roles: ['super_admin', 'admin', 'moderator'],
      badge: { count: badgeCounts.tasks, color: 'bg-yellow-500' }
    },
    {
      name: 'Activity',
      href: '/admin/activity',
      icon: Activity,
      roles: ['super_admin', 'admin']
    },
    {
      name: 'Notifications',
      href: '/admin/notifications',
      icon: Bell,
      roles: ['super_admin', 'admin', 'moderator'],
      badge: { count: badgeCounts.notifications, color: 'bg-red-500' }
    },
    {
      name: 'Reports',
      href: '/admin/reports',
      icon: FileText,
      roles: ['super_admin', 'admin', 'finance']
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      roles: ['super_admin']
    }
  ]

  const filteredNavItems = navItems.filter(item =>
    item.roles.includes(admin?.role || '')
  )

  if (!loading && !admin && pathname !== '/admin/login') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!admin && pathname !== '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-neutral-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg">Admin Panel</span>
            <Badge variant="primary" size="sm">
              {admin?.role?.replace('_', ' ') || 'Admin'}
            </Badge>
          </div>
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            {admin?.name?.charAt(0) || 'A'}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {admin && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={`fixed top-0 left-0 bottom-0 bg-white border-r z-30 transition-all ${
              sidebarCollapsed ? 'w-20' : 'w-64'
            } ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}
          >
            <div className="h-full flex flex-col">
              {/* Logo */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  {!sidebarCollapsed && (
                    <span className="font-serif font-bold">Admin Panel</span>
                  )}
                </div>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden lg:block p-1 hover:bg-neutral-100 rounded"
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="w-5 h-5" />
                  ) : (
                    <ChevronLeft className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Admin Info */}
              {!sidebarCollapsed && admin && (
                <div className="p-4 border-b">
                  <p className="font-medium">{admin.name}</p>
                  <p className="text-xs text-neutral-500">{admin.email}</p>
                  <Badge variant="primary" size="sm" className="mt-2">
                    {admin.role.replace('_', ' ')}
                  </Badge>
                </div>
              )}

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-3">
                <div className="space-y-1">
                  {filteredNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const badgeCount = item.badge?.count || 0

                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          router.push(item.href)
                          setMobileMenuOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition relative ${
                          isActive
                            ? 'bg-primary-100 text-primary-700'
                            : 'hover:bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-sm text-left">{item.name}</span>
                            {badgeCount > 0 && (
                              <span className={`text-xs text-white px-1.5 py-0.5 rounded-full ${item.badge?.color}`}>
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </span>
                            )}
                          </>
                        )}
                        {sidebarCollapsed && badgeCount > 0 && (
                          <span className={`absolute -top-1 -right-1 w-4 h-4 text-xs text-white rounded-full flex items-center justify-center ${item.badge?.color}`}>
                            {badgeCount > 9 ? '9+' : badgeCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </nav>

              {/* Logout */}
              <div className="p-3 border-t">
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition ${
                    sidebarCollapsed ? 'justify-center' : ''
                  }`}
                >
                  <LogOut className="w-5 h-5" />
                  {!sidebarCollapsed && <span className="text-sm">Logout</span>}
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`transition-all ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} pt-16 lg:pt-0`}>
        {/* Top Bar - Only show if admin is logged in */}
        {admin && (
          <div className="bg-white border-b sticky top-0 z-10">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden lg:block p-2 hover:bg-neutral-100 rounded-lg"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-serif">
                  {filteredNavItems.find(item =>
                    pathname === item.href || pathname.startsWith(item.href + '/')
                  )?.name || 'Dashboard'}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Quick search..."
                    className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Notifications */}
                <button className="relative p-2 hover:bg-neutral-100 rounded-lg">
                  <Bell className="w-5 h-5" />
                  {badgeCounts.notifications > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>

                {/* Date */}
                <div className="hidden lg:flex items-center gap-2 text-sm text-neutral-500">
                  <Calendar className="w-4 h-4" />
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
