'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Compass, Sparkles, Users, Heart } from 'lucide-react'
import { motion } from 'framer-motion'

interface MobileBottomNavProps {
  userName?: string
  onDailyClick?: () => void
}

export const MobileBottomNav = ({ userName, onDailyClick }: MobileBottomNavProps) => {
  const router   = useRouter()
  const pathname = usePathname()

  const navItems = [
    {
      icon:    LayoutDashboard,
      label:   'Home',
      path:    '/dashboard',
      color:   'text-primary-600',
      action:  () => router.push('/dashboard'),
    },
    {
      icon:    Compass,
      label:   'Explore',
      path:    '/domains',
      color:   'text-emerald-600',
      action:  () => router.push('/domains'),
    },
    {
      icon:    Sparkles,
      label:   'Daily',
      path:    '/daily',
      color:   'text-amber-600',
      action:  () => onDailyClick ? onDailyClick() : router.push('/dashboard'),
    },
    {
      icon:    Heart,
      label:   'Enroll',
      path:    '/enroll',
      color:   'text-rose-600',
      action:  () => window.open('https://kayalsoulpath.com/courses', '_blank'),
    },
    {
      icon:    Users,
      label:   'Affiliate',
      path:    '/member/referral/dashboard',
      color:   'text-purple-600',
      action:  () => router.push('/member/referral/dashboard'),
    },
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-white/95 backdrop-blur-xl border-t border-neutral-100 shadow-lg" />
      <div className="relative flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const Icon     = item.icon
          const isActive = pathname === item.path || pathname?.startsWith(item.path + '/')
          return (
            <button
              key={item.path}
              onClick={item.action}
              className="relative flex flex-col items-center py-2 px-3 min-w-[56px]"
            >
              {isActive && (
                <motion.div
                  layoutId="mobileBottomActiveTab"
                  className="absolute inset-0 bg-primary-50 rounded-2xl"
                  transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
                />
              )}
              <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? item.color : 'text-neutral-400'}`} />
              <span className={`text-[10px] mt-1 relative z-10 font-medium transition-colors ${isActive ? 'text-neutral-700' : 'text-neutral-400'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}