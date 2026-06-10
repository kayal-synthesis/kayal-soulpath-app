'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'

export const useTracking = () => {
  const pathname = usePathname()
  const { user, updateUser } = useAnonymousStore()

  // Track page views
  useEffect(() => {
    if (!user) return

    const trackVisit = async () => {
      try {
        const response = await fetch('/api/track/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: user.sessionId,
            page: pathname,
            timestamp: new Date().toISOString(),
            dayNumber: user.dayCount || 1
          })
        })

        if (response.ok) {
          updateUser({
            lastVisit: new Date(),
            visitCount: (user.visitCount || 0) + 1
          })
        }
      } catch (error) {
        console.error('Tracking error:', error)
      }
    }

    trackVisit()
  }, [pathname, user, updateUser])

  // Track premium teaser clicks
  const trackTeaserClick = async (teaserType: string) => {
    if (!user) return

    try {
      await fetch('/api/track/teaser-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: user.sessionId,
          teaserType,
          dayNumber: user.dayCount,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Teaser tracking error:', error)
    }
  }

  // Track upgrade intent
  const trackUpgradeIntent = async (source: string) => {
    if (!user) return

    try {
      await fetch('/api/track/upgrade-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: user.sessionId,
          source,
          dayNumber: user.dayCount,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Upgrade intent tracking error:', error)
    }
  }

  // Track custom events
  const trackEvent = async (eventName: string, data: any = {}) => {
    if (!user) return

    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'event',
          event: eventName,
          ...data,
          sessionId: user.sessionId,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Event tracking error:', error)
    }
  }

  return {
    trackTeaserClick,
    trackUpgradeIntent,
    trackEvent
  }
}