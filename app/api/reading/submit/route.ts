// app/api/reading/submit/route.ts
//
// No longer waits for payment inside this request at all, that used to
// live entirely in memory here, and died the instant the server
// restarted while a job was mid-wait, orphaning it forever with nothing
// left to ever finish or fail it, confirmed for real against an actual
// stuck job.
//
// Now: save everything durably, return immediately, and let
// app/api/cron/process-pending-readings/route.ts, running every minute,
// actually start generation the moment it sees real payment
// confirmation. A restart between now and then costs at most the
// remaining seconds until the next cron tick, not the rest of the job's
// life.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fileToStoredImage(file: File): Promise<{ data: string; type: string }> {
  const buffer = Buffer.from(await file.arrayBuffer())
  return { data: buffer.toString('base64'), type: file.type || 'image/jpeg' }
}

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
    const dominantHand= formData.get('dominant_hand') as string | null
    const facialImage = formData.get('facial_image') as File | null
    const palmImage   = formData.get('palm_image')   as File | null
    const palmLeft    = formData.get('palm_image_left')  as File | null
    const palmRight   = formData.get('palm_image_right') as File | null

    if (!fullName || !dateOfBirth || !toolId || !userToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Everything generation will need later, saved now, durably, while
    // it still actually exists as real, in-memory request data.
    const inputData: Record<string, any> = {
      full_name:      fullName,
      date_of_birth:  dateOfBirth,
      birth_time:     birthTime,
      birth_location: birthLoc,
      gender,
      partner_name:   partnerName,
      partner_dob:    partnerDob,
      email,
      dominant_hand:  dominantHand,
    }
    if (facialImage) inputData.facial_image     = await fileToStoredImage(facialImage)
    if (palmImage)   inputData.palm_image       = await fileToStoredImage(palmImage)
    if (palmLeft)    inputData.palm_image_left  = await fileToStoredImage(palmLeft)
    if (palmRight)   inputData.palm_image_right = await fileToStoredImage(palmRight)

    // 'pending', not 'processing', generation genuinely has not started,
    // it's awaiting real payment confirmation, the cron job is what
    // moves this to 'processing' once that's actually confirmed.
    const { error: jobError } = await supabaseAdmin
      .from('reading_jobs')
      .insert({
        id:         jobId,
        user_id:    userToken,
        tool_id:    toolId,
        status:     'pending',
        progress:   5,
        input_data: inputData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (jobError) {
      console.error('Failed to insert job:', jobError)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    return NextResponse.json({ job_id: jobId })
  } catch (error) {
    console.error('Unexpected error in /api/reading/submit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
