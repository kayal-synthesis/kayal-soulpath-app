'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { DailyGuidance } from '@/components/dashboard/DailyGuidance'
import { ExploreByLifeArea } from '@/components/marketplace/ExploreByLifeArea'
import { BestsellerTools } from '@/components/marketplace/BestsellerTools'
import { NewArrivals } from '@/components/marketplace/NewArrivals'
import { RightWidgetSidebar } from '@/components/dashboard/RightWidgetSidebar'
import { NotificationCenter } from '@/components/dashboard/NotificationCenter'
import { UserProfileMenu } from '@/components/dashboard/UserProfileMenu'
import { CouponBanner } from '@/components/dashboard/CouponBanner'
import { couponService, type Coupon } from '@/lib/services/couponService'
import { getNumerologySnapshot } from '@/lib/utils/numerology'
import { AnimatePresence } from 'framer-motion'
import InnerSanctum from '@/components/marketplace/InnerSanctum'

// ─────────────────────────────────────────────────────────────
// Safe wrapper — renders null instead of crashing on bad import
// ─────────────────────────────────────────────────────────────
function SafeRender({
  component: Component,
  name,
  ...props
}: { component: any; name: string; [key: string]: any }) {
  if (!Component) {
    console.error(`❌ ${name} is undefined — check its export style`)
    return null
  }
  return <Component {...props} />
}

const mockNotifications = [
  { id: '1', type: 'message'  as const, title: 'New message',        message: 'Sarah replied to your comment',    time: '5 min ago',   read: false },
  { id: '2', type: 'success'  as const, title: 'Purchase successful', message: 'Your Omni-Seer reading is ready', time: '2 hours ago', read: true  },
  { id: '3', type: 'reminder' as const, title: 'Daily guidance',      message: 'Your daily vibration is ready',   time: '3 hours ago', read: false },
  { id: '4', type: 'promo'    as const, title: 'Special offer',       message: '50% off on Soul Journey',         time: '1 day ago',   read: true  },
]

export default function DashboardPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { user: anonymousUser, hasCompletedOnboarding, clearUser } = useAnonymousStore()

  const [supabaseUser,       setSupabaseUser]       = useState<any>(null)
  const [isLoading,          setIsLoading]          = useState(true)
  const [currentTime,        setCurrentTime]        = useState(new Date())
  const [isMobileMenuOpen,   setIsMobileMenuOpen]   = useState(false)
  const [searchQuery,        setSearchQuery]        = useState('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [coupons,            setCoupons]            = useState<Coupon[]>([])
  const [banners,            setBanners]            = useState<any[]>([])
  const [userContext,        setUserContext]        = useState<any>(null)
  const [dismissedBanners,   setDismissedBanners]   = useState<string[]>([])

  // ── Numerology snapshot — computed from user's DOB ──────────
  const [numerology, setNumerology] = useState<ReturnType<typeof getNumerologySnapshot> | null>(null)

  // ── Auth + clock ────────────────────────────────────────────
  useEffect(() => {
    const getSupabaseUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setSupabaseUser(user)
    }
    getSupabaseUser()
    if (!hasCompletedOnboarding()) router.push('/onboarding/basic')
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [hasCompletedOnboarding, router, supabase.auth])

  // ── Coupons — fixed: isLoading now always resolves ──────────
  useEffect(() => {
    const loadCoupons = async () => {
      // If no Supabase session, skip coupon fetch but still unblock loading
      if (!supabaseUser?.id) {
        setIsLoading(false)
        return
      }
      try {
        const context       = await couponService.getUserContext(supabaseUser.id)
        setUserContext(context)
        const activeCoupons = await couponService.getActiveCoupons(context, 'main')
        setCoupons(activeCoupons)
        const activeBanners = await couponService.getBannersForDashboard(context, 'main', activeCoupons)
        setBanners(activeBanners)
        const dismissed = JSON.parse(localStorage.getItem('dismissed_banners') || '[]')
        setDismissedBanners(dismissed)
      } catch (error) {
        console.error('Error loading coupons:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCoupons()
  }, [supabaseUser?.id])

  // ── Numerology — runs once anonymousUser is available ───────
  useEffect(() => {
    if (!anonymousUser) return

    // Try every common field name your onboarding store might use
    const dob: string =
      anonymousUser.dateOfBirth   ??   // most common
      anonymousUser.dob           ??   // short form
      anonymousUser.birthDate     ??   // camelCase variant
      anonymousUser.birth_date    ??   // snake_case variant
      anonymousUser.personalInfo?.dateOfBirth ??
      anonymousUser.personalInfo?.dob ??
      ''

    if (dob) {
      // Full personalised snapshot from the real birth date
      setNumerology(getNumerologySnapshot(dob))
    } else {
      // No DOB yet — show a real but impersonal reading based on today's date
      // (still changes daily, never shows stale hardcoded values)
      const today = new Date()
      const dateSum = today.getDate() + (today.getMonth() + 1) + today.getFullYear()
      const reduced = String(dateSum)
        .split('')
        .reduce((s, d) => s + Number(d), 0)
      const day = reduced > 9
        ? String(reduced).split('').reduce((s, d) => s + Number(d), 0)
        : reduced || 1

      setNumerology(getNumerologySnapshot('', today))
    }
  }, [anonymousUser])

  // ── Handlers ────────────────────────────────────────────────
  const handleDismissBanner = (bannerId: string) => {
    const next = [...dismissedBanners, bannerId]
    setDismissedBanners(next)
    localStorage.setItem('dismissed_banners', JSON.stringify(next))
  }

  const handleApplyCoupon = (code: string) => {
    sessionStorage.setItem('pending_coupon', code)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.clear()
      sessionStorage.clear()
      clearUser()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
      window.location.href = '/'
    }
  }

  // ── Derived display values ───────────────────────────────────
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })
  const getGreeting = () => {
    const h = currentTime.getHours()
    if (h < 12) return 'Good Morning'
    if (h < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  const referralData = { clicks: 124, earnings: 47, referrals: 8 }
  const userProfile  = {
    name:       anonymousUser?.name  || 'Sarah Chen',
    email:      supabaseUser?.email  || 'sarah@example.com',
    membership: 'free' as const,
    joinDate:   'Mar 2025',
    lastActive: 'Just now',
  }

  // ── Loading state ────────────────────────────────────────────
  if (isLoading || !anonymousUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50">

      <div className="hidden lg:block">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      <MobileHeader
        isOpen={isMobileMenuOpen}
        onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        userName={anonymousUser.name}
      />
      <MobileBottomNav userName={anonymousUser.name} />

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="w-64 h-full bg-white" onClick={e => e.stopPropagation()}>
            <Sidebar />
          </div>
        </div>
      )}

      <main className={`${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'} pb-32 lg:pb-0 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">

          {/* Desktop top bar */}
          <div className="hidden lg:flex items-center justify-end mb-6">
            <div className="flex items-center gap-3">
              <SafeRender
                component={NotificationCenter}
                name="NotificationCenter"
                notifications={mockNotifications}
                onNotificationClick={(id: string) => console.log('Clicked:', id)}
              />
              <SafeRender
                component={UserProfileMenu}
                name="UserProfileMenu"
                user={userProfile}
                onViewProfile={() => router.push('/dashboard/profile')}
                onSettings={() => router.push('/dashboard/settings')}
                onLogout={handleLogout}
              />
            </div>
          </div>

          {/* ── Daily Guidance — all props computed from real data ── */}
          {numerology ? (
            <SafeRender
              component={DailyGuidance}
              name="DailyGuidance"
              userName={anonymousUser.name}
              greeting={getGreeting()}
              date={formattedDate}
              time={formattedTime}
              userId={supabaseUser?.id}
              personalDay={numerology.personalDay}
              vibration={numerology.vibration}
              vibrationMeaning={numerology.vibrationMeaning}
              energyLevel={numerology.energyLevel}
              energyDescription={numerology.energyDescription}
              insightMessage={numerology.insightMessage}
            />
          ) : (
            // Skeleton while numerology computes (usually <10ms)
            <div className="h-28 rounded-2xl bg-indigo-50 animate-pulse border border-indigo-100" />
          )}

          {/* Coupon banners */}
          <AnimatePresence>
            {banners
              .filter(b => !dismissedBanners.includes(b.id))
              .map(banner => (
                <SafeRender
                  key={banner.id}
                  component={CouponBanner}
                  name="CouponBanner"
                  banner={banner}
                  onDismiss={handleDismissBanner}
                  onApply={handleApplyCoupon}
                />
              ))}
          </AnimatePresence>

          {/* Search */}
          <div className="mt-6 mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search 140+ journeys for self-discovery..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">🔍</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <select className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm">
              <option>All Categories</option>
              <option>Featured</option>
              <option>Love &amp; Relationships</option>
              <option>Wealth &amp; Career</option>
              <option>Wellness &amp; Spirituality</option>
              <option>Life Path &amp; Destiny</option>
            </select>
            <select className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm">
              <option>Price: All</option>
              <option>Under $20</option>
              <option>$20 - $40</option>
              <option>$40+</option>
            </select>
            <select className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm">
              <option>Sort: Popular</option>
              <option>Newest</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-9 space-y-6">
              <InnerSanctum />
              <SafeRender component={ExploreByLifeArea} name="ExploreByLifeArea" />
              <SafeRender component={BestsellerTools}   name="BestsellerTools" />
              <SafeRender component={NewArrivals}       name="NewArrivals" />
            </div>
            <div className="lg:col-span-3 space-y-6">
              <SafeRender
                component={RightWidgetSidebar}
                name="RightWidgetSidebar"
                referralData={referralData}
                userId={supabaseUser?.id}
                userPurchases={[]}
              />
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
