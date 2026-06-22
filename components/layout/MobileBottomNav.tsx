'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Compass, Sparkles, Users, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface MobileBottomNavProps {
  userName?: string
  onDailyClick?: () => void
}

export const MobileBottomNav = ({ userName, onDailyClick }: MobileBottomNavProps) => {
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    {
      icon: LayoutDashboard,
      label: 'Home',
      path: '/dashboard',
      activeColor: 'text-primary-600',
      activeBg: 'from-primary-500 to-indigo-600',
      action: () => router.push('/dashboard'),
    },
    {
      icon: Compass,
      label: 'Explore',
      path: '/domains',
      activeColor: 'text-emerald-600',
      activeBg: 'from-emerald-500 to-teal-600',
      action: () => router.push('/domains'),
    },
    {
      icon: Sparkles,
      label: 'Daily',
      path: '/daily',
      activeColor: 'text-amber-600',
      activeBg: 'from-amber-400 to-orange-500',
      action: () => onDailyClick ? onDailyClick() : router.push('/dashboard'),
    },
    {
      icon: MessageCircle,
      label: 'Consult',
      path: '/consult',
      activeColor: 'text-rose-600',
      activeBg: 'from-rose-500 to-pink-600',
      action: () => window.open('https://kayalsoulpath.com/consultation', '_blank'),
    },
    {
      icon: Users,
      label: 'Affiliate',
      path: '/member/referral/dashboard',
      activeColor: 'text-purple-600',
      activeBg: 'from-purple-500 to-violet-600',
      action: () => router.push('/member/referral/dashboard'),
    },
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      <div
        className="absolute inset-0 bg-white/98 backdrop-blur-2xl border-t border-neutral-100"
        style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.08)' }}
      />
      <div className="relative flex items-center justify-around px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path || pathname?.startsWith(item.path + '/')
          return (
            <button
              key={item.path}
              onClick={item.action}
              className="relative flex flex-col items-center gap-1 py-1 px-2 min-w-[56px] group"
            >
              <div className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-br ' + item.activeBg + ' shadow-lg'
                  : 'bg-transparent group-active:bg-neutral-100'
              }`}>
                {isActive && (
                  <motion.div
                    layoutId="mobileNavGlow"
                    className={'absolute inset-0 rounded-2xl bg-gradient-to-br ' + item.activeBg + ' opacity-20 blur-md'}
                    transition={{ type: 'spring', duration: 0.4 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 transition-all duration-300 ${
                  isActive ? 'text-white scale-110' : 'text-neutral-400 group-hover:text-neutral-600'
                }`} />
              </div>
              <span className={`text-[9px] font-semibold tracking-wide transition-all duration-300 ${
                isActive ? item.activeColor : 'text-neutral-400'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="mobileNavDot"
                  className={'absolute -bottom-0.5 w-1 h-1 rounded-full bg-gradient-to-r ' + item.activeBg}
                  transition={{ type: 'spring', duration: 0.4 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}