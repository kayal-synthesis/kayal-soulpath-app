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

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Python FastAPI backend — reads from NEXT_PUBLIC_SYNTHESIS_ENGINE_URL
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

    // Start background processing — do NOT await
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
    // Update progress to 10%
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
    apiForm.append('user_token',    userToken || '')

    if (userData.birth_time)    apiForm.append('birth_time',     userData.birth_time)
    if (userData.birth_location)apiForm.append('birth_location', userData.birth_location)
    if (userData.gender)        apiForm.append('gender',         userData.gender)
    if (userData.partner_name)  apiForm.append('partner_name',   userData.partner_name)
    if (userData.partner_dob)   apiForm.append('partner_dob',    userData.partner_dob)
    if (userData.email)         apiForm.append('email',          userData.email)
    if (facialImage)            apiForm.append('facial_image',   facialImage)
    if (palmImage)              apiForm.append('palm_image',      palmImage)

    // Progress: 20% — sending to FastAPI
    await supabaseAdmin
      .from('reading_jobs')
      .update({ progress: 20, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const headers: Record<string, string> = {}
    if (SYNTHESIS_KEY) headers['X-API-Key'] = SYNTHESIS_KEY

    const apiResponse = await fetch(`${SYNTHESIS_API}/api/reading/submit`, {
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

    // Progress: 90% — storing result
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

  } catch (error: any) {
    console.error(`[reading/submit] Job ${jobId} failed:`, error.message)

    // Mark failed — dashboard shows error state
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
