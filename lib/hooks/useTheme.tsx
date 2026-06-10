'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'cosmic' | 'sunset' | 'forest' | 'ocean'
type AccentColor = 'purple' | 'blue' | 'green' | 'red' | 'orange' | 'pink'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  accentColor: AccentColor
  setAccentColor: (color: AccentColor) => void
  fontSize: number
  setFontSize: (size: number) => void
  toggleTheme: () => void
  isDark: boolean
  isLight: boolean
  isCosmic: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>('light')
  const [accentColor, setAccentColor] = useState<AccentColor>('purple')
  const [fontSize, setFontSize] = useState(16)

  // Load saved preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const savedAccent = localStorage.getItem('accentColor') as AccentColor | null
    const savedFontSize = localStorage.getItem('fontSize')

    if (savedTheme) setTheme(savedTheme)
    if (savedAccent) setAccentColor(savedAccent)
    if (savedFontSize) setFontSize(parseInt(savedFontSize))
  }, [])

  // Save preferences when they change
  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor)
    document.documentElement.setAttribute('data-accent', accentColor)
  }, [accentColor])

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize.toString())
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [fontSize])

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'cosmic', 'sunset', 'forest', 'ocean']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const contextValue: ThemeContextType = {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    fontSize,
    setFontSize,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isCosmic: theme === 'cosmic'
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const useThemeStyles = () => {
  const { theme, accentColor } = useTheme()

  const getAccentColor = () => {
    switch (accentColor) {
      case 'purple': return '#7A5AF5'
      case 'blue': return '#3B82F6'
      case 'green': return '#10B981'
      case 'red': return '#EF4444'
      case 'orange': return '#F97316'
      case 'pink': return '#EC4899'
      default: return '#7A5AF5'
    }
  }

  const getGradient = () => {
    switch (theme) {
      case 'light':
        return 'from-neutral-50 to-white'
      case 'dark':
        return 'from-neutral-900 to-neutral-800'
      case 'cosmic':
        return 'from-purple-900 via-purple-800 to-indigo-900'
      case 'sunset':
        return 'from-orange-500 via-red-500 to-pink-500'
      case 'forest':
        return 'from-emerald-600 via-green-500 to-teal-500'
      case 'ocean':
        return 'from-blue-600 via-cyan-500 to-teal-400'
      default:
        return 'from-primary-600 to-primary-800'
    }
  }

  const getTextColor = () => {
    switch (theme) {
      case 'light':
        return 'text-neutral-900'
      case 'dark':
        return 'text-neutral-100'
      default:
        return 'text-white'
    }
  }

  const getBgColor = () => {
    switch (theme) {
      case 'light':
        return 'bg-neutral-50'
      case 'dark':
        return 'bg-neutral-900'
      case 'cosmic':
        return 'bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900'
      default:
        return `bg-gradient-to-br ${getGradient()}`
    }
  }

  return {
    accentColor: getAccentColor(),
    gradient: getGradient(),
    textColor: getTextColor(),
    bgColor: getBgColor()
  }
}

export const useSystemTheme = () => {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return systemTheme
}

export const useThemeTransition = () => {
  const [isTransitioning, setIsTransitioning] = useState(false)

  const withTransition = (callback: () => void) => {
    setIsTransitioning(true)
    document.documentElement.classList.add('theme-transition')
    
    callback()

    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
      setIsTransitioning(false)
    }, 300)
  }

  return { isTransitioning, withTransition }
}