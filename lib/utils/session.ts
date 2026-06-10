import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// Generate or retrieve anonymous session ID
export function getAnonymousSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = localStorage.getItem('kayal_anon_session')
  if (!sessionId) {
    sessionId = uuidv4()
    localStorage.setItem('kayal_anon_session', sessionId)
    
    // Track first visit
    trackFirstVisit(sessionId)
  }
  return sessionId
}

// Track first visit
async function trackFirstVisit(sessionId: string) {
  const trackingData = JSON.parse(localStorage.getItem('kayal_tracking_data') || '{}')
  
  const response = await fetch('/api/tracking/first-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      ...trackingData
    })
  })
}

// Update tracking data with geo info (called from middleware)
export function setTrackingData(data: any) {
  if (typeof window === 'undefined') return
  localStorage.setItem('kayal_tracking_data', JSON.stringify(data))
}

// Link anonymous session to user after signup
export async function linkSessionToUser(userId: string) {
  const sessionId = localStorage.getItem('kayal_anon_session')
  if (!sessionId) return
  
  await fetch('/api/tracking/link-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, userId })
  })
}