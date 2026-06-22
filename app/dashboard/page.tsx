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

function SafeRender({ component: Component, name, ...props }: { component: any; name: string; [key: string]: any }) {
  if (!Component) { console.error(`❌ ${name} is undefined`); return null }
  return <Component {...props} />
}

const mockNotifications = [
  { id: '1', type: 'message'  as const, title: 'New message',        message: 'Sarah replied to your comment',    time: '5 min ago',   read: false },
  { id: '2', type: 'success'  as const, title: 'Purchase successful', message: 'Your Omni-Seer reading is ready', time: '2 hours ago', read: true  },
  { id: '3', type: 'reminder' as const, title: 'Daily guidance',      message: 'Your daily vibration is ready',   time: '3 hours ago', read: false },
  { id: '4', type: 'promo'    as const, title: 'Special offer',       message: '50% off on Soul Journey',         time: '1 day ago',   read: true  },
]

const domainFilters = [
  { label: 'All',           value: '',           href: '/dashboard'                    },
  { label: '✨ Featured',   value: 'featured',   href: '/domain/omni-seer-sanctum'     },
  { label: '❤️ Love',      value: 'love',       href: '/domain/love-relationships'    },
  { label: '💰 Wealth',    value: 'wealth',     href: '/domain/wealth-career'         },
  { label: '🌙 Wellness',  value: 'wellness',   href: '/domain/wellness-spirituality' },
  { label: '⭐ Life Path', value: 'life-path',  href: '/domain/life-path-destiny'     },
  { label: '🎙️ Voice',    value: 'voice',      href: '/domain/voice-of-prophecy'     },
  { label: '📖 Sacred',    value: 'sacred',     href: '/domain/sacred-script'         },
  { label: '⏱️ Time',      value: 'time',       href: '/domain/eternal-clock'         },
]

export default function DashboardPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { user: anonymousUser, hasCompletedOnboarding, clearUser } = useAnonymousStore()

  const [supabaseUser,       setSupabaseUser]       = useState<any>(null)
  const [isLoading,          setIsLoading]          = useState(true)
  const [currentTime,        setCurrentTime]        = useState(new Date())
  const [searchQuery,        setSearchQuery]        = useState('')
  const [activeFilter,       setActiveFilter]       = useState('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [coupons,            setCoupons]            = useState<Coupon[]>([])
  const [banners,            setBanners]            = useState<any[]>([])
  const [dismissedBanners,   setDismissedBanners]   = useState<string[]>([])
  const [numerology,         setNumerology]         = useState<ReturnType<typeof getNumerologySnapshot> | null>(null)
  const [showDailyModal,     setShowDailyModal]     = useState(false)

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

  useEffect(() => {
    const loadCoupons = async () => {
      if (!supabaseUser?.id) { setIsLoading(false); return }
      try {
        const context       = await couponService.getUserContext(supabaseUser.id)
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

  useEffect(() => {
    if (!anonymousUser) return
    const dob: string =
      anonymousUser.dateOfBirth ?? anonymousUser.dob ?? anonymousUser.birthDate ??
      anonymousUser.birth_date  ?? anonymousUser.personalInfo?.dateOfBirth ??
      anonymousUser.personalInfo?.dob ?? ''
    setNumerology(dob ? getNumerologySnapshot(dob) : getNumerologySnapshot('', new Date()))
  }, [anonymousUser])

  const handleDismissBanner = (bannerId: string) => {
    const next = [...dismissedBanners, bannerId]
    setDismissedBanners(next)
    localStorage.setItem('dismissed_banners', JSON.stringify(next))
  }

  const handleApplyCoupon = (code: string) => sessionStorage.setItem('pending_coupon', code)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.clear(); sessionStorage.clear(); clearUser()
      router.push('/'); router.refresh()
    } catch { window.location.href = '/' }
  }

  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const getGreeting   = () => { const h = currentTime.getHours(); return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening' }

  const referralData = { clicks: 124, earnings: 47, referrals: 8 }
  const userProfile  = { name: anonymousUser?.name || 'Seeker', email: supabaseUser?.email || '', membership: 'free' as const, joinDate: 'Mar 2025', lastActive: 'Just now' }

  if (isLoading || !anonymousUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
          <p className="text-sm text-neutral-400">Preparing your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* Desktop Sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Header — logo + search + notifications + profile */}
      <MobileHeader userName={anonymousUser.name} />

      {/* Mobile Bottom Nav — home, explore, daily, chat, profile */}
      <MobileBottomNav userName={anonymousUser.name} onDailyClick={() => setShowDailyModal(true)} />

      {/* Main content */}
      <main className={`${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'} pb-24 lg:pb-0 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">

          {/* Desktop top bar */}
          <div className="hidden lg:flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-serif text-neutral-900">
                {getGreeting()}, {anonymousUser.name?.split(' ')[0] || 'Seeker'} ✨
              </h1>
              <p className="text-sm text-neutral-400 mt-0.5">{formattedDate}</p>
            </div>
            <div className="flex items-center gap-3">
              <SafeRender component={NotificationCenter} name="NotificationCenter" notifications={mockNotifications} onNotificationClick={(id: string) => console.log('Clicked:', id)} />
              <SafeRender component={UserProfileMenu} name="UserProfileMenu" user={userProfile} onViewProfile={() => router.push('/dashboard/profile')} onSettings={() => router.push('/dashboard/settings')} onLogout={handleLogout} />
            </div>
          </div>

          {/* Mobile greeting */}
          <div className="lg:hidden mb-4">
            <h1 className="text-lg font-serif text-neutral-900">
              {getGreeting()}, {anonymousUser.name?.split(' ')[0] || 'Seeker'} ✨
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">{formattedDate}</p>
          </div>

          {/* Daily Guidance */}
          {numerology ? (
            <SafeRender
              component={DailyGuidance}
              name="DailyGuidance"
              userName={anonymousUser.name}
              greeting={getGreeting()}
              date={formattedDate}
              time={formattedTime}
              personalDay={numerology.personalDay}
              dob={anonymousUser.dob ?? anonymousUser.personalInfo?.dob ?? ''}
              vibration={numerology.vibration}
              vibrationMeaning={numerology.vibrationMeaning}
              energyLevel={numerology.energyLevel}
              energyDescription={numerology.energyDescription}
              insightMessage={numerology.insightMessage}
            />
          ) : (
            <div className="h-28 rounded-2xl bg-indigo-50 animate-pulse border border-indigo-100" />
          )}

          {/* Coupon banners */}
          <AnimatePresence>
            {banners.filter(b => !dismissedBanners.includes(b.id)).map(banner => (
              <SafeRender key={banner.id} component={CouponBanner} name="CouponBanner" banner={banner} onDismiss={handleDismissBanner} onApply={handleApplyCoupon} />
            ))}
          </AnimatePresence>

          {/* Search bar */}
          <div className="mt-5 mb-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="text-neutral-400">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Search 149 tools across 8 domains..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 bg-white border border-neutral-200 rounded-2xl text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 shadow-sm hover:shadow-md transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-4 flex items-center text-neutral-400 hover:text-neutral-600 text-lg">×</button>
              )}
            </div>
          </div>

          {/* Domain filter pills */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {domainFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setActiveFilter(filter.value)
                  if (filter.value !== '') router.push(filter.href)
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                  activeFilter === filter.value
                    ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-9 space-y-6">
              <InnerSanctum />
              <SafeRender component={ExploreByLifeArea} name="ExploreByLifeArea" />
              <SafeRender component={BestsellerTools}   name="BestsellerTools"   />
              <SafeRender component={NewArrivals}       name="NewArrivals"       />
            </div>
            <div className="lg:col-span-3 space-y-6">
              <SafeRender component={RightWidgetSidebar} name="RightWidgetSidebar" referralData={referralData} userId={supabaseUser?.id} userPurchases={[]} />
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}