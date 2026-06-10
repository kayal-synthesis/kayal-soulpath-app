'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { DailyGuidance } from '@/components/dashboard/DailyGuidance'
import { FeaturedDomains } from '@/components/marketplace/FeaturedDomains'
import { ExploreByLifeArea } from '@/components/marketplace/ExploreByLifeArea'
import { BestsellerTools } from '@/components/marketplace/BestsellerTools'
import { NewArrivals } from '@/components/marketplace/NewArrivals'
import { NotificationCenter } from '@/components/dashboard/NotificationCenter'
import { UserProfileMenu } from '@/components/dashboard/UserProfileMenu'

// Mock notifications
const mockNotifications = [
  {
    id: '1',
    type: 'message' as const,
    title: 'New message',
    message: 'Sarah replied to your comment',
    time: '5 min ago',
    read: false
  },
  {
    id: '2',
    type: 'success' as const,
    title: 'Purchase successful',
    message: 'Your Omni-Seer reading is ready',
    time: '2 hours ago',
    read: true
  },
  {
    id: '3',
    type: 'reminder' as const,
    title: 'Daily guidance',
    message: 'Your daily vibration is ready',
    time: '3 hours ago',
    read: false
  },
  {
    id: '4',
    type: 'promo' as const,
    title: 'Special offer',
    message: '50% off on Soul Journey',
    time: '1 day ago',
    read: true
  }
]

export default function DashboardPage() {
  const router = useRouter()
  const { user, hasCompletedOnboarding } = useAnonymousStore()
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      router.push('/onboarding/basic')
    }
    setIsLoading(false)

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [hasCompletedOnboarding, router])

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Mock user data for profile menu
  const userProfile = {
    name: user?.name || 'Sarah Chen',
    email: user?.email || 'sarah@example.com',
    membership: 'free' as const,
    joinDate: 'Mar 2025',
    lastActive: 'Just now'
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Desktop Sidebar - with collapsible state */}
      <div className="hidden lg:block">
        <Sidebar 
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Header - Only visible on mobile */}
      <MobileHeader 
        isOpen={isMobileMenuOpen}
        onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        userName={user.name}
      />

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <MobileBottomNav userName={user.name} />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="w-64 h-full bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content - with dynamic left margin based on sidebar state */}
      <main className={`${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'} pb-32 lg:pb-0 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
          {/* Desktop Top Bar - Hidden on mobile */}
          <div className="hidden lg:flex items-center justify-end mb-6">
            <div className="flex items-center gap-3">
              <NotificationCenter 
                notifications={mockNotifications}
                onNotificationClick={(id) => console.log('Clicked:', id)}
              />
              <UserProfileMenu 
                user={userProfile}
                onViewProfile={() => router.push('/profile')}
                onSettings={() => router.push('/settings')}
                onLogout={() => router.push('/logout')}
              />
            </div>
          </div>

          {/* Daily Guidance */}
          <DailyGuidance 
            userName={user.name}
            greeting={getGreeting()}
            date={formattedDate}
            time={formattedTime}
            personalDay={7}
            vibration="High"
            vibrationMeaning="Today your energy is amplified. What you think manifests quickly."
            energyLevel={4}
            energyDescription="Peak energy from 10 AM - 2 PM"
            insightMessage="Today's vibration aligns with Omni-Seer readings. 23 people with your energy discovered their path. Your intuition is at its peak right now."
          />

          {/* Search Bar */}
          <div className="mt-6 mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search 140+ journeys for self-discovery..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">🔍</span>
            </div>
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-2 mb-6">
            <select className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm">
              <option>All Categories</option>
              <option>Featured</option>
              <option>Love & Relationships</option>
              <option>Wealth & Career</option>
              <option>Wellness & Spirituality</option>
              <option>Life Path & Destiny</option>
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

          {/* Main Content - Full Width (no right sidebar) */}
          <div className="space-y-6">
            {/* Featured Domains */}
            <FeaturedDomains />

            {/* Explore by Life Area */}
            <ExploreByLifeArea />

            {/* Bestseller Tools */}
            <BestsellerTools />

            {/* New Arrivals */}
            <NewArrivals />
          </div>
        </div>
      </main>
    </div>
  )
}