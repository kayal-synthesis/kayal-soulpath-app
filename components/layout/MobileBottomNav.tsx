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
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-6" />
        <h3 className="text-xl font-serif text-neutral-900 text-center mb-2">Begin Your Journey</h3>
        <p className="text-sm text-neutral-500 text-center mb-6">Choose how you would like to proceed</p>
        <div className="space-y-3">
          
            href="https://kayalsoulpath.com/courses"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 p-4 rounded-2xl border-2 border-primary-100 bg-primary-50 hover:border-primary-300 transition-all"
            onClick={onClose}
          >
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900">Course Enrollment</p>
              <p className="text-xs text-neutral-500 mt-0.5">Join our structured learning programs</p>
            </div>
          </a>
          
            href="https://kayalsoulpath.com/consultation"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 p-4 rounded-2xl border-2 border-amber-100 bg-amber-50 hover:border-amber-300 transition-all"
            onClick={onClose}
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900">Book a Consultation</p>
              <p className="text-xs text-neutral-500 mt-0.5">One-on-one session with a KAYAL guide</p>
            </div>
          </a>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-sm text-neutral-400 hover:text-neutral-600 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export const MobileBottomNav = ({ userName, onDailyClick }: MobileBottomNavProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const [showEnroll, setShowEnroll] = useState(false)

  const navItems = [
    { icon: LayoutDashboard, label: 'Home',      path: '/dashboard',                color: 'text-primary-600', action: () => router.push('/dashboard') },
    { icon: Compass,         label: 'Explore',   path: '/domains',                  color: 'text-emerald-600', action: () => router.push('/domains') },
    { icon: Sparkles,        label: 'Daily',     path: '/daily',                    color: 'text-amber-600',   action: () => onDailyClick ? onDailyClick() : router.push('/dashboard') },
    { icon: Heart,           label: 'Enroll',    path: '/enroll',                   color: 'text-rose-600',    action: () => setShowEnroll(true) },
    { icon: Users,           label: 'Affiliate', path: '/member/referral/dashboard', color: 'text-purple-600', action: () => router.push('/member/referral/dashboard') },
  ]

  return (
    <>
      {showEnroll && <EnrollConsultModal onClose={() => setShowEnroll(false)} />}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-white/95 backdrop-blur-xl border-t border-neutral-100 shadow-lg" />
        <div className="relative flex items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            const Icon = item.icon
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
    </>
  )
}