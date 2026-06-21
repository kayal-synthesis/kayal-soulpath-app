'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  MessageCircle,
  Gift,
  Crown,
  Mic,
  BookOpen,
  Clock,
  Heart,
  TrendingUp,
  Moon,
  Star,
  Settings,
  LogOut,
  Sparkles,
  Compass,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'

// ─── Correct imports — aligned with actual export names ────────
import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'       // career is inside wealth
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { omniTools }         from '@/lib/constants/omni-seer-tools'    // was omniSeerTools
import { voiceTools }        from '@/lib/constants/voice-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'

interface NavItem {
  name:   string
  href:   string
  icon:   any
  count?: number
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard',              icon: LayoutDashboard },
  { name: 'Chat',      href: '/chat',                   icon: MessageCircle   },
  { name: 'Referrals', href: '/member/referral/dashboard', icon: Gift         },
]

const featuredNavItems: NavItem[] = [
  { name: "Omni-Seer's Sanctum", href: '/domain/omni-seer-sanctum',  icon: Crown,    count: omniTools.length         },
  { name: 'Voice of Prophecy',   href: '/domain/voice-of-prophecy',  icon: Mic,      count: voiceTools.length        },
  { name: 'Sacred Script',       href: '/domain/sacred-script',      icon: BookOpen, count: sacredScriptTools.length },
  { name: 'Eternal Clock',       href: '/domain/eternal-clock',      icon: Clock,    count: timeKeeperTools.length   },
]

const categoryNavItems: NavItem[] = [
  { name: 'Love & Relationships',    href: '/domain/love-relationships',   icon: Heart,      count: loveTools.length     },
  { name: 'Wealth & Career',         href: '/domain/wealth-career',        icon: TrendingUp, count: wealthTools.length   },
  { name: 'Wellness & Spirituality', href: '/domain/wellness-spirituality', icon: Moon,      count: wellnessTools.length },
  { name: 'Life Path & Destiny',     href: '/domain/life-path-destiny',    icon: Star,       count: lifePathTools.length },
]

const bottomNavItems: NavItem[] = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Logout',   href: '/logout',   icon: LogOut   },
]

interface SidebarProps {
  isCollapsed?: boolean
  onToggle?:    () => void
  mobileOpen?:  boolean
  onMobileClose?: () => void
}

export const Sidebar = ({ isCollapsed = false, onToggle, mobileOpen, onMobileClose }: SidebarProps) => {
  const pathname = usePathname()
  const [_isMobileOpen, _setIsMobileOpen] = useState(false)
  const isMobileOpen = mobileOpen !== undefined ? mobileOpen : _isMobileOpen
  const setIsMobileOpen = (v: boolean) => {
    _setIsMobileOpen(v)
    if (!v && onMobileClose) onMobileClose()
  }
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(isCollapsed)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const toggleDesktopCollapse = () => {
    setIsDesktopCollapsed(!isDesktopCollapsed)
    onToggle?.()
  }

  const iconOnly     = isDesktopCollapsed
  const sidebarWidth = isDesktopCollapsed ? 'w-20' : 'w-72'

  // ── Shared nav link renderer ───────────────────────────────
  const NavLink = ({
    item, compact = false, onClick,
  }: { item: NavItem; compact?: boolean; onClick?: () => void }) => {
    const Icon   = item.icon
    const active = isActive(item.href)

    return (
      <Link
        href={item.href}
        onClick={onClick}
        title={iconOnly ? item.name : ''}
        className={`flex items-center ${iconOnly ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg transition-all group relative ${
          active
            ? 'bg-primary-50 text-primary-700'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
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
            <span className={`${compact ? 'text-sm' : 'text-sm font-medium'} flex-1 truncate`}>
              {item.name}
            </span>
            {item.count !== undefined && (
              <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                {item.count}
              </span>
            )}
          </>
        )}
      </Link>
    )
  }

  // ── Section label ──────────────────────────────────────────
  const SectionLabel = ({ icon: Icon, label }: { icon?: any; label: string }) =>
    !iconOnly ? (
      <div className="flex items-center gap-2 px-3 mb-2">
        {Icon && <Icon className="w-3 h-3 text-neutral-400" />}
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{label}</p>
      </div>
    ) : null

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────── */}
      <aside className={`hidden lg:block fixed left-0 top-0 h-full ${sidebarWidth} bg-white border-r border-neutral-200 shadow-sm transition-all duration-300 z-40`}>
        <div className="flex flex-col h-full">

          {/* Logo + toggle */}
          <div className={`p-5 border-b border-neutral-200 flex items-center ${iconOnly ? 'justify-center' : 'justify-between'}`}>
            {!iconOnly ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl text-primary-600">☾</span>
                <span className="font-serif text-lg text-primary-900">Kayal LifeOS</span>
              </div>
            ) : (
              <span className="text-2xl text-primary-600">☾</span>
            )}
            <button
              onClick={toggleDesktopCollapse}
              className="p-1.5 hover:bg-neutral-100 rounded-lg transition"
              aria-label={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isDesktopCollapsed
                ? <ChevronRight className="w-4 h-4 text-neutral-500" />
                : <ChevronLeft  className="w-4 h-4 text-neutral-500" />}
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">

            {/* Main */}
            <div className="space-y-1">
              <SectionLabel label="Main" />
              {mainNavItems.map(item => <NavLink key={item.name} item={item} />)}
            </div>

            {/* Featured */}
            <div className="space-y-1">
              <SectionLabel icon={Crown} label="Featured" />
              {featuredNavItems.map(item => <NavLink key={item.name} item={item} compact />)}
            </div>

            {/* Life Areas */}
            <div className="space-y-1">
              <SectionLabel icon={Compass} label="Life Areas" />
              {categoryNavItems.map(item => <NavLink key={item.name} item={item} compact />)}
            </div>

            {/* Bottom */}
            <div className="pt-6 border-t border-neutral-200 space-y-1">
              {bottomNavItems.map(item => <NavLink key={item.name} item={item} compact />)}
            </div>

          </nav>

          {/* User energy strip */}
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



      {/* ── Mobile menu button ────────────────────────────────── */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-lg shadow-md border border-neutral-200"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-neutral-600" />
      </button>

      {/* ── Mobile sidebar overlay ───────────────────────────── */
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-72 bg-white shadow-xl z-50 lg:hidden overflow-y-auto"
            >
              {/* Mobile header */}
              <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl text-primary-600">☾</span>
                  <span className="font-serif text-lg text-primary-900">Kayal LifeOS</span>
                </div>
                <button onClick={() => setIsMobileOpen(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-lg transition">
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              {/* Mobile nav */}
              <nav className="p-4 space-y-6">

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-3 mb-2">Main</p>
                  {mainNavItems.map(item => {
                    const Icon   = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100'}`}>
                        <Icon className={`w-5 h-5 ${active ? 'text-primary-600' : 'text-neutral-400'}`} />
                        <span className="text-sm font-medium flex-1 truncate">{item.name}</span>
                      </Link>
                    )
                  })}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 px-3 mb-2">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Featured</p>
                  </div>
                  {featuredNavItems.map(item => {
                    const Icon   = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all ${active ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100'}`}>
                        <div className="flex items-center gap-3 truncate min-w-0">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary-600' : 'text-neutral-400'}`} />
                          <span className="text-sm truncate">{item.name}</span>
                        </div>
                        {item.count !== undefined && (
                          <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full flex-shrink-0">{item.count}</span>
                        )}
                      </Link>
                    )
                  })}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 px-3 mb-2">
                    <Compass className="w-3 h-3 text-primary-400" />
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Life Areas</p>
                  </div>
                  {categoryNavItems.map(item => {
                    const Icon   = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all ${active ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100'}`}>
                        <div className="flex items-center gap-3 truncate min-w-0">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary-600' : 'text-neutral-400'}`} />
                          <span className="text-sm truncate">{item.name}</span>
                        </div>
                        {item.count !== undefined && (
                          <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full flex-shrink-0">{item.count}</span>
                        )}
                      </Link>
                    )
                  })}
                </div>

                <div className="pt-4 border-t border-neutral-200 space-y-1">
                  {bottomNavItems.map(item => {
                    const Icon = item.icon
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setIsMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-all">
                        <Icon className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm">{item.name}</span>
                      </Link>
                    )
                  })}
                </div>

              </nav>

              <div className="p-4 border-t border-neutral-200 bg-neutral-50">
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  <span>Your synthesis is active</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
