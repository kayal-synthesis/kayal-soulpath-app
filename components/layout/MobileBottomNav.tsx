'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Compass, Sparkles, Users, Heart, BookOpen, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface MobileBottomNavProps {
  userName?: string
  onDailyClick?: () => void
}

function EnrollConsultModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: 'rgba(15,10,30,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-primary-400 via-amber-400 to-rose-400" />
        <div className="p-6 pb-10">
          <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-5" />
          <h3 className="text-2xl font-serif text-neutral-900 text-center mb-1">
            Begin Your Journey
          </h3>
          <p className="text-sm text-neutral-400 text-center mb-6">
            Choose how you would like to proceed with KAYAL
          </p>
          <div className="space-y-3">
            
              href="https://kayalsoulpath.com/courses"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 p-4 rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50 to-indigo-50 hover:from-primary-100 hover:to-indigo-100 transition-all group"
              onClick={onClose}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-primary-200 group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-neutral-900">Course Enrollment</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Join structured learning programs and master your path
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600 text-sm font-bold">→</span>
              </div>
            </a>
            
              href="https://kayalsoulpath.com/consultation"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 p-4 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-all group"
              onClick={onClose}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-200 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-neutral-900">Book a Consultation</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  One-on-one session with a KAYAL guide for deep insights
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-600 text-sm font-bold">→</span>
              </div>
            </a>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 text-xs text-neutral-400 hover:text-neutral-600 transition"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}

export const MobileBottomNav = ({ userName, onDailyClick }: MobileBottomNavProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const [showEnroll, setShowEnroll] = useState(false)

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
      icon: Heart,
      label: 'Enroll',
      path: '/enroll',
      activeColor: 'text-rose-600',
      activeBg: 'from-rose-500 to-pink-600',
      action: () => setShowEnroll(true),
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
    <>
      {showEnroll && <EnrollConsultModal onClose={() => setShowEnroll(false)} />}

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-white/98 backdrop-blur-2xl border-t border-neutral-100" style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.08)' }} />
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
                    ? `bg-gradient-to-br ${item.activeBg} shadow-lg`
                    : 'bg-transparent group-active:bg-neutral-100'
                }`}>
                  {isActive && (
                    <motion.div
                      layoutId="mobileNavGlow"
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.activeBg} opacity-20 blur-md`}
                      transition={{ type: 'spring', duration: 0.4 }}
                    />
                  )}
                  <Icon
                    className={`w-5 h-5 relative z-10 transition-all duration-300 ${
                      isActive ? 'text-white scale-110' : 'text-neutral-400 group-hover:text-neutral-600'
                    }`}
                  />
                </div>
                <span
                  className={`text-[9px] font-semibold tracking-wide transition-all duration-300 ${
                    isActive ? item.activeColor : 'text-neutral-400'
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobileNavDot"
                    className={`absolute -bottom-0.5 w-1 h-1 rounded-full bg-gradient-to-r ${item.activeBg}`}
                    transition={{ type: 'spring', duration: 0.4 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}