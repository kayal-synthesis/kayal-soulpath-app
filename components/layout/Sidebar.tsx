'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, MessageCircle, Gift, Crown, Mic,
  BookOpen, Clock, Heart, TrendingUp, Moon, Star,
  Settings, LogOut, Sparkles, Compass,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { omniTools }         from '@/lib/constants/omni-seer-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'

interface NavItem { name: string; href: string; icon: any; count?: number }

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard',                 icon: LayoutDashboard },
  { name: 'Chat',      href: '/chat',                      icon: MessageCircle   },
  { name: 'Referrals', href: '/member/referral/dashboard', icon: Gift            },
]

const featuredNavItems: NavItem[] = [
  { name: "Omni-Seer's Sanctum", href: '/domain/omni-seer-sanctum',  icon: Crown,    count: omniTools.length         },
  { name: 'Voice of Prophecy',   href: '/domain/voice-of-prophecy',  icon: Mic,      count: voiceTools.length        },
  { name: 'Sacred Script',       href: '/domain/sacred-script',      icon: BookOpen, count: sacredScriptTools.length },
  { name: 'Eternal Clock',       href: '/domain/eternal-clock',      icon: Clock,    count: timeKeeperTools.length   },
]

const categoryNavItems: NavItem[] = [
  { name: 'Love & Relationships',    href: '/domain/love-relationships',    icon: Heart,      count: loveTools.length     },
  { name: 'Wealth & Career',         href: '/domain/wealth-career',         icon: TrendingUp, count: wealthTools.length   },
  { name: 'Wellness & Spirituality', href: '/domain/wellness-spirituality', icon: Moon,       count: wellnessTools.length },
  { name: 'Life Path & Destiny',     href: '/domain/life-path-destiny',     icon: Star,       count: lifePathTools.length },
]

const bottomNavItems: NavItem[] = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Logout',   href: '/logout',   icon: LogOut   },
]

interface SidebarProps { isCollapsed?: boolean; onToggle?: () => void }

export const Sidebar = ({ isCollapsed = false, onToggle }: SidebarProps) => {
  const pathname             = usePathname()
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(isCollapsed)

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const toggleDesktopCollapse = () => {
    setIsDesktopCollapsed(!isDesktopCollapsed)
    onToggle?.()
  }

  const iconOnly     = isDesktopCollapsed
  const sidebarWidth = isDesktopCollapsed ? 'w-20' : 'w-72'

  const NavLink = ({ item, compact = false }: { item: NavItem; compact?: boolean }) => {
    const Icon   = item.icon
    const active = isActive(item.href)
    return (
      <Link
        href={item.href}
        title={iconOnly ? item.name : ''}
        className={`flex items-center ${iconOnly ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg transition-all relative ${
          active ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
        }`}
      >
        {active && !iconOnly && !compact && (
          <motion.div
            layoutId="activeNavDesktop"
            className="absolute left-0 w-1 h-6 bg-primary-500 rounded-r-full"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <Icon className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0 ${active ? 'text-primary-600' : 'text-neutral-400'}`} />
        {!iconOnly && (
          <>
            <span className={`${compact ? 'text-sm' : 'text-sm font-medium'} flex-1 truncate`}>{item.name}</span>
            {item.count !== undefined && (
              <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full flex-shrink-0">{item.count}</span>
            )}
          </>
        )}
      </Link>
    )
  }

  const SectionLabel = ({ icon: Icon, label }: { icon?: any; label: string }) =>
    !iconOnly ? (
      <div className="flex items-center gap-2 px-3 mb-2">
        {Icon && <Icon className="w-3 h-3 text-neutral-400" />}
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{label}</p>
      </div>
    ) : null

  return (
    <aside className={`hidden lg:block fixed left-0 top-0 h-full ${sidebarWidth} bg-white border-r border-neutral-200 shadow-sm transition-all duration-300 z-40`}>
      <div className="flex flex-col h-full">

        <div className={`p-5 border-b border-neutral-200 flex items-center ${iconOnly ? 'justify-center' : 'justify-between'}`}>
          {!iconOnly ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl text-primary-600">☾</span>
              <span className="font-serif text-lg text-primary-900">Kayal LifeOS</span>
            </div>
          ) : (
            <span className="text-2xl text-primary-600">☾</span>
          )}
          <button onClick={toggleDesktopCollapse} className="p-1.5 hover:bg-neutral-100 rounded-lg transition">
            {isDesktopCollapsed
              ? <ChevronRight className="w-4 h-4 text-neutral-500" />
              : <ChevronLeft  className="w-4 h-4 text-neutral-500" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
          <div className="space-y-1">
            <SectionLabel label="Main" />
            {mainNavItems.map(item => <NavLink key={item.name} item={item} />)}
          </div>
          <div className="space-y-1">
            <SectionLabel icon={Crown} label="Featured" />
            {featuredNavItems.map(item => <NavLink key={item.name} item={item} compact />)}
          </div>
          <div className="space-y-1">
            <SectionLabel icon={Compass} label="Life Areas" />
            {categoryNavItems.map(item => <NavLink key={item.name} item={item} compact />)}
          </div>
          <div className="pt-6 border-t border-neutral-200 space-y-1">
            {bottomNavItems.map(item => <NavLink key={item.name} item={item} compact />)}
          </div>
        </nav>

        {!iconOnly && (
          <div className="p-4 border-t border-neutral-200 bg-neutral-50">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span>Your synthesis is active</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}