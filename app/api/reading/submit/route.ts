// app/api/reading/submit/route.ts
// Calls your Python FastAPI backend at api.kayalsoulpath.com
// to generate a real AI reading using Claude.
//
// Flow:
//  1. Validate form data
//  2. Create reading_jobs row (status: processing)
//  3. In background: POST to FastAPI /synthesis endpoint
//  4. FastAPI generates reading with Claude (1-2 minutes)
//  5. Store result in reading_results
//  6. Update reading_jobs status to completed
//
// Dashboard polls /api/reading/job/[jobId] every 3 seconds
// until status === 'completed', then navigates to /report/[toolId]

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { Resend }                    from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// RESEND_API_KEY needs to be set in .env.local, the real key from your
// Resend dashboard, not a placeholder, same trap CRON_SECRET fell into
// earlier in this project.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.kayalsoulpath.com'

// Python FastAPI backend, reads from NEXT_PUBLIC_SYNTHESIS_ENGINE_URL
// which is already set to http://127.0.0.1:8000 in your .env.local
const SYNTHESIS_API = process.env.SYNTHESIS_API_URL
                   || process.env.NEXT_PUBLIC_SYNTHESIS_ENGINE_URL
                   || 'https://api.kayalsoulpath.com'
                   || 'https://api.kayalsoulpath.com'

const SYNTHESIS_KEY = process.env.SYNTHESIS_API_KEY
                   || process.env.INTERNAL_API_KEY
                   || ''

// ─────────────────────────────────────────────────────────────
// POST /api/reading/submit
// ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const formData    = await request.formData()
    const fullName    = formData.get('full_name')    as string
    const dateOfBirth = formData.get('date_of_birth') as string
    const toolId      = formData.get('tool_id')      as string
    const userToken   = formData.get('user_token')   as string
    const birthTime   = formData.get('birth_time')   as string | null
    const birthLoc    = formData.get('birth_location') as string | null
    const gender      = formData.get('gender')       as string | null
    const partnerName = formData.get('partner_name') as string | null
    const partnerDob  = formData.get('partner_dob')  as string | null
    const email       = formData.get('email')        as string | null
    const facialImage = formData.get('facial_image') as File | null
    const palmImage   = formData.get('palm_image')   as File | null

    if (!fullName || !dateOfBirth || !toolId || !userToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create job record
    const { error: jobError } = await supabaseAdmin
      .from('reading_jobs')
      .insert({
        id:         jobId,
        user_id:    userToken,
        tool_id:    toolId,
        status:     'processing',
        progress:   0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (jobError) {
      console.error('Failed to insert job:', jobError)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    // Start background processing, do NOT await
    processReading(jobId, userToken, toolId, {
      full_name:    fullName,
      date_of_birth: dateOfBirth,
      birth_time:   birthTime,
      birth_location: birthLoc,
      gender,
      partner_name: partnerName,
      partner_dob:  partnerDob,
      email,
    }, facialImage, palmImage).catch(err =>
      console.error(`Background processing failed for job ${jobId}:`, err)
    )

    return NextResponse.json({ job_id: jobId })
  } catch (error) {
    console.error('Unexpected error in /api/reading/submit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// Background: calls FastAPI backend to generate the reading
// ─────────────────────────────────────────────────────────────
async function processReading(
  jobId:      string,
  userId:     string,
  toolId:     string,
  userData:   Record<string, string | null>,
  facialImage: File | null,
  palmImage:   File | null
) {
  try {
    // Queued, waiting on real payment confirmation before anything
    // expensive runs. This job gets created here, on the purchase page,
    // *before* /api/checkout/initiate even runs, pending_checkouts for
    // this job_id may not exist yet the moment this loop starts, that's
    // expected, not an error, the loop just keeps waiting until it does.
    //
    // The only thing that ever flips pending_checkouts to 'completed' is
    // the real Stripe webhook, a genuine server-to-server confirmation
    // the charge actually went through, never the customer's browser,
    // never this function assuming anything on its own.
    await supabaseAdmin
      .from('reading_jobs')
      .update({ progress: 5, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const PAYMENT_TIMEOUT_MS = 30 * 60 * 1000 // generous, but not indefinite
    const POLL_INTERVAL_MS   = 5000
    const waitStartedAt      = Date.now()
    let paymentConfirmed     = false
    let paymentFailed        = false

    while (Date.now() - waitStartedAt < PAYMENT_TIMEOUT_MS) {
      const { data: checkout } = await supabaseAdmin
        .from('pending_checkouts')
        .select('status')
        .eq('job_id', jobId)
        .maybeSingle()

      if (checkout?.status === 'completed') {
        paymentConfirmed = true
        break
      }
      if (checkout?.status === 'failed') {
        paymentFailed = true
        break
      }
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }

    if (!paymentConfirmed) {
      // Either payment was explicitly marked failed, or the timeout
      // above ran out with no confirmation ever arriving, either way,
      // the expensive DeepSeek call below never happens. This is the
      // entire fix, nothing after this point runs without it.
      await supabaseAdmin
        .from('reading_jobs')
        .update({
          status: 'failed',
          error:  paymentFailed
            ? 'Payment failed, reading was not generated.'
            : 'Payment was not confirmed in time, reading was not generated.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
      console.log(`[reading/submit] Job ${jobId} stopped before generation, payment never confirmed`)
      return
    }

    // Update progress to 10%, payment is now genuinely confirmed
    await supabaseAdmin
      .from('reading_jobs')
      .update({ progress: 10, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // ── Call your FastAPI synthesis endpoint ──────────────────
    const apiForm = new FormData()
    apiForm.append('tool_id',       toolId)
    apiForm.append('full_name',     userData.full_name    || '')
    apiForm.append('date_of_birth', userData.date_of_birth || '')
    apiForm.append('job_id',        jobId)
    apiForm.append('user_token',    userId || '')
    if (userData.birth_time)    apiForm.append('birth_time',     userData.birth_time)
    if (userData.birth_location)apiForm.append('birth_location', userData.birth_location)
    if (userData.gender)        apiForm.append('gender',         userData.gender)
    if (userData.partner_name)  apiForm.append('partner_name',   userData.partner_name)
    if (userData.partner_dob)   apiForm.append('partner_dob',    userData.partner_dob)
    if (userData.email)         apiForm.append('email',          userData.email)
    if (facialImage)            apiForm.append('facial_image',   facialImage)
    if (palmImage)              apiForm.append('palm_image',      palmImage)

    // Progress: 20%, sending to FastAPI
    await supabaseAdmin
      .from('reading_jobs')
      .update({ progress: 20, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const headers: Record<string, string> = {}
    if (SYNTHESIS_KEY) headers['X-API-Key'] = SYNTHESIS_KEY

    const apiResponse = await fetch(`${SYNTHESIS_API}/predict`, {
      method:  'POST',
      headers,
      body:    apiForm,
      // 5 minute timeout for AI generation
      signal:  AbortSignal.timeout(5 * 60 * 1000),
    })

    if (!apiResponse.ok) {
      const errText = await apiResponse.text().catch(() => 'Unknown error')
      throw new Error(`FastAPI returned ${apiResponse.status}: ${errText}`)
    }

    const content = await apiResponse.json()

    // Progress: 90%, storing result
    await supabaseAdmin
      .from('reading_jobs')
      .update({ progress: 90, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // Store in reading_results
    const { error: resultError } = await supabaseAdmin
      .from('reading_results')
      .insert({
        user_id:    userId,
        tool_id:    toolId,
        job_id:     jobId,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (resultError) {
      throw new Error(`Failed to store reading: ${resultError.message}`)
    }

    // Mark completed
    await supabaseAdmin
      .from('reading_jobs')
      .update({
        status:     'completed',
        progress:   100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    console.log(`[reading/submit] Job ${jobId} completed successfully`)

    // Notify by email, real, both for guests (who have no dashboard
    // session and no other way to ever find out) and for logged-in
    // users, as a genuine convenience on top of the dashboard polling
    // that already exists for them. Wrapped in its own try/catch, a
    // failed email should never flip a genuinely completed reading back
    // to a failed state.
    //
    // The link below points at /report/{toolId}?jobId={jobId}, the
    // exact route the dashboard itself already uses for a completed
    // report. I have not confirmed that route permits viewing without
    // a login, which matters specifically for guests, if it requires
    // authentication, this link will not work for them even though the
    // email itself sends correctly. Worth verifying directly before
    // relying on this for anonymous delivery.
    // The upfront email field on the purchase page is optional now,
    // Stripe's own checkout page collects one as a normal part of
    // paying regardless, and the webhook saves that into
    // pending_checkouts.email if nothing was captured earlier. By this
    // point payment is confirmed, so that row holds whichever email
    // actually turned out to be the real one, userData.email alone,
    // from submission time, before checkout even started, isn't
    // reliable enough anymore on its own.
    let deliveryEmail = userData.email
    if (!deliveryEmail) {
      const { data: checkoutRow } = await supabaseAdmin
        .from('pending_checkouts')
        .select('email')
        .eq('job_id', jobId)
        .maybeSingle()
      deliveryEmail = checkoutRow?.email || null
    }

    if (deliveryEmail && resend) {
      try {
        // A plain link to /report/[toolId] was tried first and rejected,
        // that route used to identify "who's viewing" from local browser
        // state, not a real session, meaning the link would only work
        // by coincidence, on the same device and browser someone
        // purchased from, and showed sensitive, personal reading content
        // with no real access control behind it at all.
        //
        // A real Supabase magic link instead: single-use, time-limited,
        // and genuinely authenticates the recipient, creating an account
        // automatically on first use if they don't have one, no password
        // required. Points straight at the report page itself, not a
        // server-side /auth/callback route, that pattern was tried first
        // too and also rejected, this client (lib/supabase/client.ts)
        // stores sessions in localStorage under a custom key, not
        // cookies, and sets detectSessionInUrl: true, meaning the client
        // library itself already detects and exchanges the auth code the
        // moment the report page loads, no server hop needed or even
        // compatible with how sessions are actually stored here.
        const reportPath = `/report/${toolId}?jobId=${jobId}`
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type:    'magiclink',
          email:   deliveryEmail,
          options: { redirectTo: `${APP_URL}${reportPath}` },
        })

        const readingLink = linkError ? null : linkData?.properties?.action_link

        if (!readingLink) {
          console.error(`[reading/submit] Failed to generate magic link for job ${jobId}:`, linkError?.message)
        }

        await resend.emails.send({
          from:    'KAYAL SoulPath <readings@kayalsoulpath.com>',
          to:      deliveryEmail,
          subject: 'Your reading is ready',
          html: readingLink
            ? `
              <p>Hi ${userData.full_name || 'there'},</p>
              <p>Your reading is complete and ready to view.</p>
              <p><a href="${readingLink}">View your reading</a></p>
              <p>This link signs you in securely and is single-use. If it's already been opened, contact support and we'll send a fresh one.</p>
            `
            : `
              <p>Hi ${userData.full_name || 'there'},</p>
              <p>Your reading is complete. We ran into an issue generating your secure access link, please contact support and we'll get you access right away.</p>
            `,
        })
      } catch (emailErr: any) {
        console.error(`[reading/submit] Email send failed for job ${jobId}:`, emailErr.message)
      }
    } else if (!resend) {
      console.warn(`[reading/submit] RESEND_API_KEY not configured, skipped email for job ${jobId}`)
    }
  } catch (error: any) {
    console.error(`[reading/submit] Job ${jobId} failed:`, error.message)

    // Mark failed, dashboard shows error state
    await supabaseAdmin
      .from('reading_jobs')
      .update({
        status:     'failed',
        error:      error.message || 'Reading generation failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}
