'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Home, 
  Heart, 
  Briefcase, 
  Sparkles, 
  TrendingUp, 
  Users,
  MessageCircle,
  Award,
  ChevronRight,
  Star,
  Moon,
  Sun
} from 'lucide-react'

interface NavigationProps {
  collapsed?: boolean
  onToggle?: () => void
}

export const Navigation = ({ collapsed = false, onToggle }: NavigationProps) => {
  const pathname = usePathname()

  const mainNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
    { name: 'Compatibility', href: '/compatibility', icon: Heart },
    { name: 'Referrals', href: '/referral', icon: Users },
  ]

  const domainItems = [
    { name: 'Love', href: '/domain/love', icon: Heart, color: 'text-red-500' },
    { name: 'Career', href: '/domain/career', icon: Briefcase, color: 'text-blue-500' },
    { name: 'Wealth', href: '/domain/wealth', icon: TrendingUp, color: 'text-green-500' },
    { name: 'Spirituality', href: '/domain/spirituality', icon: Sparkles, color: 'text-purple-500' },
    { name: 'Health', href: '/domain/health', icon: Sun, color: 'text-yellow-500' },
    { name: 'Life Path', href: '/domain/life-path', icon: Star, color: 'text-primary-600' },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname?.startsWith(href)
  }

  return (
    <nav className={`h-full bg-white border-r border-neutral-200 transition-all duration-300 ${
      collapsed ? 'w-20' : 'w-64'
    }`}>
      <div className="p-4">
        {/* Toggle button */}
        <button
          onClick={onToggle}
          className="w-full flex justify-end mb-6 p-2 hover:bg-neutral-50 rounded-lg transition-colors"
        >
          <ChevronRight className={`w-5 h-5 text-neutral-500 transition-transform ${
            collapsed ? 'rotate-180' : ''
          }`} />
        </button>

        {/* Main Navigation */}
        <div className="space-y-1 mb-8">
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all relative ${
                  active 
                    ? 'bg-primary-50 text-primary-600' 
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${
                  active ? 'text-primary-600' : ''
                }`} />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.name}</span>
                )}
                {active && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute left-0 w-1 h-6 bg-primary-600 rounded-r-full"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>

        {/* Domains Section */}
        {!collapsed && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-3 mb-2">
              Domains
            </h3>
          </div>
        )}
        
        <div className="space-y-1">
          {domainItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  active 
                    ? 'bg-neutral-100' 
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${item.color}`} />
                {!collapsed && (
                  <span className="text-sm">{item.name}</span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Rewards Badge */}
        {!collapsed && (
          <div className="mt-8 p-4 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-secondary-500" />
              <span className="text-sm font-medium">Referral Rewards</span>
            </div>
            <p className="text-xs text-neutral-600 mb-2">
              You've earned 3 free reports!
            </p>
            <Link href="/referral">
              <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                View rewards →
              </button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}