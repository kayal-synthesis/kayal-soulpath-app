/**
 * KAYAL LifeOS — Email Service
 *
 * Client-side helper that calls /api/email/send.
 * Import this in the purchase page and anywhere else emails are triggered.
 *
 * Server-side (backend / worker) calls the same endpoint.
 */

import { templates } from './templates'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.kayalsoulpath.com'

async function send(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })
    const data = await res.json()
    if (!data.success) console.error('[emailService] send failed:', data.error)
    return !!data.success
  } catch (err) {
    console.error('[emailService] fetch error:', err)
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called immediately after payment is confirmed.
 * Works for both guests and account holders.
 */
export async function sendPurchaseConfirmation(opts: {
  to: string
  firstName: string
  toolName: string
  toolEmoji: string
  price: number
  jobId: string | null
  requiresImages: boolean
  imageType?: string
  isGuest: boolean
}) {
  const html = templates.purchaseConfirmation({
    ...opts,
    dashboardUrl: `${BASE_URL}/member/dashboard${opts.jobId ? `?pending=${opts.jobId}` : ''}`,
  })
  return send(opts.to, `✓ Order confirmed — ${opts.toolName}`, html)
}

/**
 * Called after the user uploads their images post-payment.
 */
export async function sendImagesReceived(opts: {
  to: string
  firstName: string
  toolName: string
  toolEmoji: string
  jobId: string
}) {
  const html = templates.imagesReceived(opts)
  return send(opts.to, `📸 Images received — generating your ${opts.toolName}`, html)
}

/**
 * Called after account creation.
 * Sends welcome email with login instructions.
 */
export async function sendWelcomeAndLogin(opts: {
  to: string
  firstName: string
  email: string
  toolName: string
  toolEmoji: string
  jobId: string | null
}) {
  const html = templates.welcomeAndLogin(opts)
  return send(opts.to, `Welcome to KAYAL LifeOS — your dashboard is ready`, html)
}

/**
 * Called when user chooses "Continue as guest".
 * Sends order confirmation with guest reading link.
 *
 * guestToken: a signed JWT or UUID generated server-side for one-click access
 */
export async function sendGuestAccess(opts: {
  to: string
  firstName: string
  email: string
  toolName: string
  toolEmoji: string
  jobId: string | null
  guestToken: string
}) {
  const html = templates.guestAccess(opts)
  return send(opts.to, `Your ${opts.toolName} order is confirmed`, html)
}

/**
 * Called by the backend worker when a reading job completes.
 * (Also called server-side via /api/email/send directly)
 */
export async function sendReadingReady(opts: {
  to: string
  firstName: string
  toolName: string
  toolEmoji: string
  jobId: string
  isGuest: boolean
  guestAccessUrl?: string
  relatedTools?: { name: string; emoji: string; price: number; id: string }[]
}) {
  const html = templates.readingReady(opts)
  return send(opts.to, `🌟 Your ${opts.toolName} reading is ready`, html)
}

/**
 * Upsell — sent ~24h after reading delivered.
 * Typically scheduled by the backend, not the purchase page.
 */
export async function sendUpsell(opts: {
  to: string
  firstName: string
  completedToolName: string
  completedToolEmoji: string
  recommendedTools: { name: string; emoji: string; price: number; id: string; tagline: string }[]
  bundleCode?: string
  bundleDiscount?: number
}) {
  const html = templates.upsell(opts)
  return send(opts.to, `Continue your Soul Blueprint journey, ${opts.firstName}`, html)
}

/**
 * Login reminder — sent if user hasn't logged in 48h after purchase.
 * Scheduled by backend cron job.
 */
export async function sendLoginReminder(opts: {
  to: string
  firstName: string
  email: string
  toolName: string
  toolEmoji: string
  jobId: string | null
}) {
  const html = templates.loginReminder(opts)
  return send(opts.to, `Your ${opts.toolName} reading is waiting for you 🌙`, html)
}

export const emailService = {
  sendPurchaseConfirmation,
  sendImagesReceived,
  sendWelcomeAndLogin,
  sendGuestAccess,
  sendReadingReady,
  sendUpsell,
  sendLoginReminder,
}
