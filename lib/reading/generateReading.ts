// lib/reading/generateReading.ts
//
// The real generation logic, extracted out of what used to be
// processReading() in app/api/reading/submit/route.ts, so both that
// route and the new cron-triggered resume path can call the exact same
// code rather than maintaining two copies that could quietly drift
// apart from each other over time.
//
// Takes inputData, a durable JSON blob already saved to
// reading_jobs.input_data, rather than raw in-memory File objects,
// since this can now run long after the original request that created
// the job has already finished and returned.

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SYNTHESIS_API = process.env.SYNTHESIS_API_URL
                   || process.env.NEXT_PUBLIC_SYNTHESIS_ENGINE_URL
                   || 'https://api.kayalsoulpath.com'
const SYNTHESIS_KEY = process.env.SYNTHESIS_API_KEY || process.env.INTERNAL_API_KEY || ''

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.kayalsoulpath.com'

interface StoredImage {
  data: string // base64
  type: string // mime type
}

interface ReadingInputData {
  full_name?: string | null
  date_of_birth?: string | null
  birth_time?: string | null
  birth_location?: string | null
  gender?: string | null
  partner_name?: string | null
  partner_dob?: string | null
  email?: string | null
  dominant_hand?: string | null
  facial_image?: StoredImage | null
  palm_image?: StoredImage | null
  palm_image_left?: StoredImage | null
  palm_image_right?: StoredImage | null
}

function base64ToBlob(image: StoredImage): Blob {
  const buffer = Buffer.from(image.data, 'base64')
  return new Blob([buffer], { type: image.type })
}

export async function generateReading(jobId: string, userId: string, toolId: string, inputData: ReadingInputData) {
  try {
    await supabaseAdmin
      .from('reading_jobs')
      .update({ status: 'processing', progress: 10, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const apiForm = new FormData()
    apiForm.append('tool_id',       toolId)
    apiForm.append('full_name',     inputData.full_name    || '')
    apiForm.append('date_of_birth', inputData.date_of_birth || '')
    apiForm.append('job_id',        jobId)
    apiForm.append('user_token',    userId || '')
    if (inputData.birth_time)     apiForm.append('birth_time',     inputData.birth_time)
    if (inputData.birth_location) apiForm.append('birth_location', inputData.birth_location)
    if (inputData.gender)         apiForm.append('gender',         inputData.gender)
    if (inputData.partner_name)   apiForm.append('partner_name',   inputData.partner_name)
    if (inputData.partner_dob)    apiForm.append('partner_dob',    inputData.partner_dob)
    if (inputData.dominant_hand)  apiForm.append('dominant_hand',  inputData.dominant_hand)
    if (inputData.facial_image)      apiForm.append('facial_image',      base64ToBlob(inputData.facial_image), 'facial.jpg')
    if (inputData.palm_image)        apiForm.append('palm_image',        base64ToBlob(inputData.palm_image), 'palm.jpg')
    if (inputData.palm_image_left)   apiForm.append('palm_image_left',   base64ToBlob(inputData.palm_image_left), 'palm_left.jpg')
    if (inputData.palm_image_right)  apiForm.append('palm_image_right',  base64ToBlob(inputData.palm_image_right), 'palm_right.jpg')

    await supabaseAdmin
      .from('reading_jobs')
      .update({ progress: 20, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const headers: Record<string, string> = {}
    if (SYNTHESIS_KEY) headers['X-API-Key'] = SYNTHESIS_KEY

    const apiResponse = await fetch(`${SYNTHESIS_API}/predict`, {
      method: 'POST',
      headers,
      body:   apiForm,
      signal: AbortSignal.timeout(5 * 60 * 1000),
    })

    if (!apiResponse.ok) {
      const errText = await apiResponse.text().catch(() => 'Unknown error')
      throw new Error(`FastAPI returned ${apiResponse.status}: ${errText}`)
    }

    const content = await apiResponse.json()

    await supabaseAdmin
      .from('reading_jobs')
      .update({ progress: 90, updated_at: new Date().toISOString() })
      .eq('id', jobId)

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

    await supabaseAdmin
      .from('reading_jobs')
      .update({ status: 'completed', progress: 100, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    console.log(`[generateReading] Job ${jobId} completed successfully`)

    // Same resolved-email and magic-link logic already confirmed
    // working, deliveryEmail falls back to pending_checkouts when the
    // upfront field was left blank, guests get a real, single-use
    // magic link, logged-in users get a direct link to their dashboard.
    let deliveryEmail = inputData.email
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
        const isGuest = userId.startsWith('device_')
        const reportPath = `/report/${toolId}?jobId=${jobId}`
        let reportUrl = `${APP_URL}${reportPath}`

        if (isGuest) {
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type:    'magiclink',
            email:   deliveryEmail,
            options: { redirectTo: `${APP_URL}${reportPath}` },
          })
          if (linkError) {
            console.error(`[generateReading] generateLink failed for job ${jobId}:`, linkError.message)
          } else if (linkData?.properties?.action_link) {
            reportUrl = linkData.properties.action_link
          }
        }

        await resend.emails.send({
          from:    'KAYAL SoulPath <readings@kayalsoulpath.com>',
          to:      deliveryEmail,
          subject: 'Your reading is ready',
          html: `
            <p>Hi ${inputData.full_name || 'there'},</p>
            <p>Your reading is complete and ready to view.</p>
            <p><a href="${reportUrl}">View your reading</a></p>
            <p>${isGuest
              ? 'This link signs you in securely, no password needed, and creates your free account automatically.'
              : 'You can also find this anytime in your dashboard.'}</p>
          `,
        })
      } catch (emailErr: any) {
        console.error(`[generateReading] Email send failed for job ${jobId}:`, emailErr.message)
      }
    } else if (!resend) {
      console.warn(`[generateReading] RESEND_API_KEY not configured, skipped email for job ${jobId}`)
    }
  } catch (error: any) {
    console.error(`[generateReading] Job ${jobId} failed:`, error.message)
    await supabaseAdmin
      .from('reading_jobs')
      .update({ status: 'failed', error: error.message || 'Reading generation failed', updated_at: new Date().toISOString() })
      .eq('id', jobId)
  }
}
