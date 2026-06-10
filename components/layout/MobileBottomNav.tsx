'use client'

import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Compass, 
  MessageCircle, 
  User,
  Sparkles
} from 'lucide-react'
import { motion } from 'framer-motion'

interface MobileBottomNavProps {
  userName?: string  // Keep as optional with ?
}

export const MobileBottomNav = ({ userName = 'Seeker' }: MobileBottomNavProps) => {
  const router = useRouter()
  const pathname = usePathname()
  
  // Safe to use userName here if needed, with fallback
  const displayName = userName ? userName.split(' ')[0] : 'Seeker'
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard', color: 'text-primary-600' },
    { icon: Compass, label: 'Explore', path: '/explore', color: 'text-emerald-600' },
    { icon: Sparkles, label: 'Daily', path: '/daily', color: 'text-amber-600' },
    { icon: MessageCircle, label: 'Chat', path: '/chat', color: 'text-blue-600' },
    { icon: User, label: 'Profile', path: '/profile', color: 'text-purple-600' },
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-neutral-200 px-2 py-1 z-50 shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path
          
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="relative flex flex-col items-center py-2 px-3"
            >
              {isActive && (
                <motion.div
                  layoutId="mobileBottomActiveTab"
                  className="absolute inset-0 bg-primary-50 rounded-xl"
                  transition={{ type: "spring", duration: 0.5 }}
                />
              )}
              <Icon className={`w-5 h-5 relative z-10 ${
                isActive ? item.color : 'text-neutral-400'
              }`} />
              <span className={`text-[10px] mt-1 relative z-10 ${
                isActive ? 'text-neutral-700 font-medium' : 'text-neutral-400'
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