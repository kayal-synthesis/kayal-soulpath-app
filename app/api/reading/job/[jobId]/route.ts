// app/api/reading/job/[jobId]/route.ts
// Fix: when job is completed, fetch content from reading_results table
// and return it — the original only returned job.result which is always null

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

    const { data: job, error } = await supabaseAdmin
      .from('reading_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
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

    // Still processing or failed — return status only
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
