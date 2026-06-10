'use client'

/**
 * lib/hooks/useThemeMode.ts
 * ==========================
 * Manages light/dark mode.
 * - Auto detects system preference on first load
 * - Manual override stored in localStorage
 * - Applies data-theme attribute to <html>
 * - Exported ThemeToggle button component included
 */

import { useState, useEffect, useCallback } from 'react'

export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'kayal_theme'

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function getStoredTheme(): ThemeMode | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {/**/}
  return null
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode)
}

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    const initial = stored ?? getSystemTheme()
    setMode(initial)
    applyTheme(initial)
    setMounted(true)

    // Listen for system changes (when no manual override)
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = (e: MediaQueryListEvent) => {
      if (!getStoredTheme()) {
        const next: ThemeMode = e.matches ? 'light' : 'dark'
        setMode(next)
        applyTheme(next)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggle = useCallback(() => {
    setMode(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      try { localStorage.setItem(STORAGE_KEY, next) } catch {/**/}
      return next
    })
  }, [])

  const set = useCallback((m: ThemeMode) => {
    setMode(m)
    applyTheme(m)
    try { localStorage.setItem(STORAGE_KEY, m) } catch {/**/}
  }, [])

  return { mode, toggle, set, mounted, isDark: mode === 'dark' }
}
