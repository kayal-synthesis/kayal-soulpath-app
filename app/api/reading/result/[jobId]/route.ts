// app/api/reading/result/[jobId]/route.ts
// GET /api/reading/result/[jobId]
// Polled every 3 seconds by member/dashboard to check if a reading is ready.
// Returns the job status and content when completed.

import { NextResponse }  from 'next/server'
import { createClient }  from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params

  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  }

  try {
    // Get job status
    const { data: job, error: jobError } = await supabaseAdmin
      .from('reading_jobs')
      .select('id, status, progress, error, tool_id, created_at, updated_at')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // If completed, fetch the actual content
    if (job.status === 'completed') {
      const { data: result } = await supabaseAdmin
        .from('reading_results')
        .select('content, created_at')
        .eq('job_id', jobId)
        .single()

      return NextResponse.json({
        status:   'completed',
        progress: 100,
        content:  result?.content || null,
        tool_id:  job.tool_id,
      })
    }

    // Return current status for pending/processing/failed
    return NextResponse.json({
      status:   job.status,
      progress: job.progress || 0,
      error:    job.error    || null,
      tool_id:  job.tool_id,
    })

  } catch (err) {
    console.error('[reading/result]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
