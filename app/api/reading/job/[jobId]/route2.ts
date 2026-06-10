import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Fetch job status from reading_jobs
    const { data: job, error: jobError } = await supabase
      .from('reading_jobs')
      .select('status, progress, error')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // If not completed, return status only
    if (job.status !== 'completed') {
      return NextResponse.json({
        jobId,
        status: job.status,
        progress: job.progress,
        error: job.error,
      });
    }

    // Fetch the reading result from reading_results
    const { data: result, error: resultError } = await supabase
      .from('reading_results')
      .select('content')
      .eq('job_id', jobId)
      .single();

    if (resultError || !result) {
      return NextResponse.json({ error: 'Reading result not found' }, { status: 404 });
    }

    // Return the completed result
    return NextResponse.json({
      jobId,
      status: 'completed',
      result: result.content,   // This matches what the report page expects (data.result)
    });
  } catch (error) {
    console.error('Error in /api/reading/job/[jobId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}