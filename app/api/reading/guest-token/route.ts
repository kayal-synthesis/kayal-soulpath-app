/**
 * POST /api/reading/guest-token
 *
 * Creates a short-lived signed token for guest reading access.
 * Returns: { token: string }
 *
 * The token is stored in the readings table and used to generate
 * the guest reading URL: /guest/reading/[token]
 *
 * Env vars required:
 *   GUEST_TOKEN_SECRET — random 32-char string for signing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SECRET = process.env.GUEST_TOKEN_SECRET || 'change-me-in-production'

function signToken(payload: string): string {
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 16)
  return Buffer.from(payload).toString('base64url') + '.' + sig
}

export async function POST(req: NextRequest) {
  try {
    const { jobId, email } = await req.json()

    // Generate token: jobId + expiry (30 days)
    const expires = Date.now() + 30 * 24 * 60 * 60 * 1000
    const payload = JSON.stringify({ jobId, email, expires })
    const token   = signToken(payload)

    // Store in DB so we can validate later
    if (jobId) {
      await supabase
        .from('reading_jobs')
        .update({ guest_token: token, guest_email: email })
        .eq('id', jobId)
    }

    return NextResponse.json({ token })
  } catch (err: any) {
    console.error('[guest-token]', err)
    return NextResponse.json({ token: jobId || '' })
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// BACKEND WORKER HOOK
//
// Add this to your Python worker (worker/main.py or worker/deliver.py)
// after a reading job completes and the report is stored:
//
//   import requests
//
//   def notify_reading_ready(job: dict, related_tools: list):
//       """Called after report is written to storage."""
//       payload = {
//           "to":        job["email"],
//           "firstName": job["full_name"].split(" ")[0],
//           "toolName":  job["tool_name"],
//           "toolEmoji": job["tool_emoji"],
//           "jobId":     job["id"],
//           "isGuest":   not job.get("user_id"),
//           "guestAccessUrl": f"{BASE_URL}/guest/reading/{job.get('guest_token', job['id'])}",
//           "relatedTools": related_tools,
//       }
//       requests.post(
//           f"{BASE_URL}/api/email/reading-ready",
//           json=payload,
//           headers={"x-api-key": os.environ["INTERNAL_API_KEY"]},
//       )
//
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TRIGGER ENDPOINTS
// These are called by the backend worker, not the browser.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/email/reading-ready
 * Called by backend when job completes.
 *
 * Body: { to, firstName, toolName, toolEmoji, jobId, isGuest, guestAccessUrl?, relatedTools? }
 */

// app/api/email/reading-ready/route.ts
export const readingReadyRouteHandler = async (req: NextRequest) => {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { templates } = await import('@/lib/email/templates')
    const html = templates.readingReady(body)
    const res  = await fetch(new URL('/api/email/send', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:      body.to,
        subject: `🌟 Your ${body.toolName} reading is ready`,
        html,
      }),
    })
    return NextResponse.json(await res.json())
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/email/upsell
 * Called by a scheduled cron job ~24h after reading delivered.
 *
 * Body: { to, firstName, completedToolName, completedToolEmoji,
 *         recommendedTools[], bundleCode?, bundleDiscount? }
 */
export const upsellRouteHandler = async (req: NextRequest) => {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { templates } = await import('@/lib/email/templates')
    const html = templates.upsell(body)
    const res  = await fetch(new URL('/api/email/send', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:      body.to,
        subject: `Continue your Soul Blueprint journey, ${body.firstName}`,
        html,
      }),
    })
    return NextResponse.json(await res.json())
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/email/login-reminder
 * Called by cron if user hasn't logged in 48h after purchase.
 *
 * Body: { to, firstName, email, toolName, toolEmoji, jobId }
 */
export const loginReminderRouteHandler = async (req: NextRequest) => {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { templates } = await import('@/lib/email/templates')
    const html = templates.loginReminder(body)
    const res  = await fetch(new URL('/api/email/send', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:      body.to,
        subject: `Your ${body.toolName} reading is waiting for you 🌙`,
        html,
      }),
    })
    return NextResponse.json(await res.json())
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
