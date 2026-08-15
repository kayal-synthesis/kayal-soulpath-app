// app/api/reading/job/[jobId]/route.ts
// Fix: when job is completed, fetch content from reading_results table
// and return it, the original only returned job.result which is always null.
//
// Second fix: this had no ownership check at all, any authenticated
// request, or none, could fetch any reading by guessing or being
// handed a jobId. Now requires a valid session, 401 with no valid one.
//
// Third fix: a strict job.user_id === requester.id check breaks every
// guest reading, permanently, not intermittently. A guest's job is
// created with a device id string (device_abc123...) as user_id, since
// no real account exists yet at that point. Once they click their
// magic link email, Supabase gives them a real account with a real
// UUID, which will never equal that original device-id string.
// Ownership now falls back to matching the requester's email against
// pending_checkouts.email for that same job_id, the one identifier
// that's genuinely durable across the guest-to-real-account transition,
// rather than the user_id, which isn't.

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    // Verify the requester's real, server-validated identity, never
    // trust a userId the client claims, that could be spoofed by anyone
    // editing the request. The Bearer token itself is what's checked.
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !requester) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: job, error } = await supabaseAdmin
      .from('reading_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    let owns = job.user_id === requester.id

    if (!owns && requester.email) {
      // Fallback for the guest → real-account transition, see the file
      // header comment. pending_checkouts.job_id links back to this
      // exact job, and its email is the one the checkout was actually
      // placed under, compared case-insensitively since email casing
      // isn't meaningful for matching identity.
      const { data: checkout } = await supabaseAdmin
        .from('pending_checkouts')
        .select('email')
        .eq('job_id', jobId)
        .maybeSingle()

      if (checkout?.email && checkout.email.toLowerCase() === requester.email.toLowerCase()) {
        owns = true
      }
    }

    if (!owns) {
      return NextResponse.json({ error: 'This reading does not belong to your account' }, { status: 403 })
    }

    // If completed, fetch the actual content from reading_results
    if (job.status === 'completed') {
      const { data: resultRow } = await supabaseAdmin
        .from('reading_results')
        .select('content')
        .eq('job_id', jobId)
        .single()

      return NextResponse.json({
        jobId:     job.id,
        status:    job.status,
        progress:  job.progress,
        result:    resultRow?.content || job.result || null,
        error:     job.error,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      })
    }

    // Still processing or failed, return status only
    return NextResponse.json({
      jobId:     job.id,
      status:    job.status,
      progress:  job.progress  || 0,
      result:    null,
      error:     job.error     || null,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    })
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
