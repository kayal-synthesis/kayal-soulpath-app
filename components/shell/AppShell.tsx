'use client'

/**
 * components/shell/AppShell.tsx
 * ==============================
 * Persistent navigation shell for all authenticated pages.
 *
 * Desktop: collapsible left sidebar
 * Mobile:  bottom tab bar
 *
 * Knows the active route, shows synthesis summary in sidebar,
 * and surfaces the daily briefing dot when a new one is available.
 */

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter }           from 'next/navigation'
import { useAuth }                          from '@/lib/hooks/useAuth'
import {
  Home, MessageSquare, Bookmark,
  Compass, User, Sparkles,
  ChevronLeft, ChevronRight,
  Bell, Search, Plus, Mic
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Nav items
// ─────────────────────────────────────────────────────────────
interface NavItem {
  id:     string
  label:  string
  href:   string
  Icon:   React.ElementType
  badge?: number | boolean  // number = count, true = dot
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',          label: 'Home',           href: '/home',          Icon: Home         },
  { id: 'conversations', label: 'Conversations',  href: '/conversations', Icon: MessageSquare },
  { id: 'saved',         label: 'Saved',          href: '/saved',         Icon: Bookmark     },
  { id: 'domains',       label: 'Explore',        href: '/domains',       Icon: Compass      },
  { id: 'profile',       label: 'Profile',        href: '/profile',       Icon: User         },
]

// ─────────────────────────────────────────────────────────────
// Domain colour map for synthesis display
// ─────────────────────────────────────────────────────────────
const LP_COLOUR: Record<number, string> = {
  1: '#c9a96e', 2: '#d4856a', 3: '#e8a060',
  4: '#7aaa8a', 5: '#b89fd4', 6: '#d4856a',
  7: '#8ba8d4', 8: '#c9a96e', 9: '#9a8ac4',
  11: '#b89fd4', 22: '#c9a96e', 33: '#e8a060',
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface SynthesisSummary {
  first_name:    string
  life_path:     number | null
  personal_year: number | null
  personal_day:  number | null
  pd_theme:      string | null
  sun_sign:      string | null
}

// ─────────────────────────────────────────────────────────────
// Shell component
// ─────────────────────────────────────────────────────────────
interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user } = useAuth()

  const [collapsed,  setCollapsed]  = useState(false)
  const [synthesis,  setSynthesis]  = useState<SynthesisSummary | null>(null)
  const [hasBriefing,setHasBriefing]= useState(false)
  const [unread,     setUnread]     = useState(0)

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Load synthesis summary for sidebar
  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')
        const res = await fetch(`${API}/api/reading/job/latest?user_id=${user.id}`)
        if (!res.ok) return
        const data = await res.json()
        const r    = data.result ?? {}
        const num  = r.numerology ?? {}
        setSynthesis({
          first_name:    (r.full_name ?? '').split(' ')[0] || 'Seeker',
          life_path:     r.life_path     ?? num.core?.life_path     ?? null,
          personal_year: r.personal_year ?? num.time_cycles?.personal_year ?? null,
          personal_day:  r.personal_day  ?? num.time_cycles?.personal_day  ?? null,
          pd_theme:      num.time_cycles?.personal_day_theme ?? null,
          sun_sign:      r.sun_sign ?? null,
        })
        // Check for daily briefing
        setHasBriefing(true)
      } catch { /* non-fatal */ }
    }
    load()
  }, [user?.id])

  const activeId = NAV_ITEMS.find(n => pathname.startsWith(n.href))?.id ?? 'home'
  const lpColour = synthesis?.life_path ? (LP_COLOUR[synthesis.life_path] ?? '#c9a96e') : '#c9a96e'

  const navigate = useCallback((href: string) => {
    router.push(href)
  }, [router])

  // ── Sidebar (desktop) ─────────────────────────────────────
  const Sidebar = () => (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-300"
      style={{
        width:      collapsed ? '64px' : '240px',
        background: 'var(--depth)',
        borderRight:'1px solid var(--rim)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--rim)', minHeight: 'var(--header-h)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base animate-orb-breathe"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${lpColour}30, ${lpColour}08)`,
            border:     `1px solid ${lpColour}30`,
          }}
        >
          🔮
        </div>
        {!collapsed && (
          <div>
            <p className="text-xs font-label tracking-widest uppercase"
              style={{ color: 'var(--gold)', lineHeight: 1.2 }}>
              KAYAL
            </p>
            <p className="text-[9px] tracking-widest uppercase"
              style={{ color: 'var(--text-stone)' }}>
              SoulPath
            </p>
          </div>
        )}
      </div>

      {/* Synthesis summary card */}
      {!collapsed && synthesis && (
        <div
          className="mx-3 mt-4 mb-2 rounded-xl p-3 flex-shrink-0"
          style={{ background: 'var(--surface)', border: `1px solid ${lpColour}20` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: lpColour }} />
            <span className="text-[10px] tracking-widest uppercase"
              style={{ color: lpColour }}>
              {synthesis.first_name}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {synthesis.life_path && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: `${lpColour}14`, color: `${lpColour}bb`, border: `1px solid ${lpColour}20` }}>
                LP {synthesis.life_path}
              </span>
            )}
            {synthesis.sun_sign && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--surface)', color: 'var(--text-stone)', border: '1px solid var(--rim)' }}>
                ☉ {synthesis.sun_sign}
              </span>
            )}
            {synthesis.personal_year && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--surface)', color: 'var(--text-stone)', border: '1px solid var(--rim)' }}>
                PY {synthesis.personal_year}
              </span>
            )}
          </div>
          {synthesis.personal_day && synthesis.pd_theme && (
            <p className="text-[9px] mt-2 leading-relaxed"
              style={{ color: 'var(--text-stone)' }}>
              Today: PD {synthesis.personal_day} — {synthesis.pd_theme.slice(0, 40)}
            </p>
          )}
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = activeId === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative"
              style={{
                background: isActive ? `${lpColour}14` : 'transparent',
                color:      isActive ? lpColour : 'var(--text-stone)',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'var(--surface)'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: lpColour }}
                />
              )}

              <item.Icon className="w-4 h-4 flex-shrink-0" />

              {!collapsed && (
                <span className="text-xs tracking-wide font-body">
                  {item.label}
                </span>
              )}

              {/* Badge */}
              {!collapsed && item.id === 'conversations' && unread > 0 && (
                <span
                  className="ml-auto text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-mono"
                  style={{ background: lpColour, color: 'var(--void)' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
              {!collapsed && item.id === 'home' && hasBriefing && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: lpColour }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* Quick new session button */}
      {!collapsed && (
        <div className="px-3 pb-4 flex-shrink-0">
          <button
            onClick={() => navigate('/conversations/new')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs tracking-wide transition-all duration-150"
            style={{
              background: 'var(--gold-surface)',
              color:      'var(--gold)',
              border:     '1px solid var(--gold-border)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-glow)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--gold-surface)')}
          >
            <Plus className="w-3.5 h-3.5" />
            New Session
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(p => !p)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full flex items-center justify-center transition-all"
        style={{
          background: 'var(--surface)',
          border:     '1px solid var(--rim)',
          color:      'var(--text-stone)',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-border)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--rim)')}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft  className="w-3 h-3" />
        }
      </button>
    </aside>
  )

  // ── Tab bar (mobile) ──────────────────────────────────────
  const TabBar = () => (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center"
      style={{
        height:     'var(--tabbar-h)',
        background: 'var(--depth)',
        borderTop:  '1px solid var(--rim)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = activeId === item.id
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.href)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all duration-150 relative"
            style={{ color: isActive ? lpColour : 'var(--text-void)' }}
          >
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                style={{ background: lpColour }}
              />
            )}
            <item.Icon className="w-5 h-5" />
            <span className="text-[9px] tracking-widest uppercase font-label">
              {item.label}
            </span>
            {item.id === 'conversations' && unread > 0 && (
              <span
                className="absolute top-1.5 right-[calc(50%-8px)] w-3.5 h-3.5 rounded-full text-[8px] flex items-center justify-center font-mono"
                style={{ background: lpColour, color: 'var(--void)' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
            {item.id === 'home' && hasBriefing && (
              <span className="absolute top-2 right-[calc(50%-8px)] w-1.5 h-1.5 rounded-full"
                style={{ background: lpColour }} />
            )}
          </button>
        )
      })}
    </nav>
  )

  // ── FAB (mobile new session) ──────────────────────────────
  const FAB = () => (
    <button
      className="md:hidden fixed z-50 flex items-center justify-center rounded-full shadow-lg transition-all duration-200 active:scale-95"
      style={{
        width:      '52px',
        height:     '52px',
        bottom:     `calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 16px)`,
        right:      '20px',
        background: `linear-gradient(135deg, ${lpColour}, ${lpColour}88)`,
        boxShadow:  `0 4px 24px ${lpColour}30`,
      }}
      onClick={() => navigate('/conversations/new')}
    >
      <Plus className="w-5 h-5" style={{ color: 'var(--void)' }} />
    </button>
  )

  // ── Layout ────────────────────────────────────────────────
  const sidebarOffset = isMobile ? '0px' : (collapsed ? '64px' : '240px')

  return (
    <div className="min-h-screen grain" style={{ background: 'var(--abyss)' }}>
      <Sidebar />
      <TabBar />
      <FAB />

      {/* Main content */}
      <main
        className="transition-all duration-300"
        style={{
          marginLeft:   isMobile ? 0 : sidebarOffset,
          paddingBottom: isMobile ? 'calc(var(--tabbar-h) + env(safe-area-inset-bottom))' : 0,
          minHeight:    '100vh',
        }}
      >
        {children}
      </main>
    </div>
  )
}
