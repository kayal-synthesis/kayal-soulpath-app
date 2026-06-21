'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Compass,
  Sparkles,
  MessageCircle,
  User,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface MobileBottomNavProps {
  userName?: string
}

export const MobileBottomNav = ({ userName = 'Seeker' }: MobileBottomNavProps) => {
  const router   = useRouter()
  const pathname = usePathname()

  const navItems = [
    { icon: LayoutDashboard, label: 'Home',    path: '/dashboard',         color: 'text-primary-600'  },
    { icon: Compass,         label: 'Explore', path: '/domain/omni-seer-sanctum', color: 'text-emerald-600' },
    { icon: Sparkles,        label: 'Daily',   path: '/daily',             color: 'text-amber-600'    },
    { icon: MessageCircle,   label: 'Chat',    path: '/chat',              color: 'text-blue-600'     },
    { icon: User,            label: 'Profile', path: '/dashboard/profile', color: 'text-purple-600'   },
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Blur background */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-xl border-t border-neutral-100 shadow-lg" />

      <div className="relative flex items-center justify-around px-2 py-1 safe-area-bottom">
        {navItems.map((item) => {
          const Icon     = item.icon
          const isActive = pathname === item.path || pathname?.startsWith(item.path + '/')

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="relative flex flex-col items-center py-2 px-3 min-w-[56px]"
            >
              {isActive && (
                <motion.div
                  layoutId="mobileBottomActiveTab"
                  className="absolute inset-0 bg-primary-50 rounded-2xl"
                  transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
                />
              )}
              <Icon className={`w-5 h-5 relative z-10 transition-colors ${
                isActive ? item.color : 'text-neutral-400'
              }`} />
              <span className={`text-[10px] mt-1 relative z-10 font-medium transition-colors ${
                isActive ? 'text-neutral-700' : 'text-neutral-400'
              }`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}