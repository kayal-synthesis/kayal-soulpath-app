// app/api/cron/process-pending-readings/route.ts
//
// Replaces the in-memory payment-wait loop that used to live inside
// app/api/reading/submit/route.ts. That loop died the instant the
// server restarted while a job was mid-wait, orphaning it forever,
// confirmed for real against an actual stuck customer job. This runs
// every minute instead, checking pending_checkouts directly rather than
// holding a live connection open and hoping the process survives long
// enough to see it resolve.
//
// Every minute, not once a day like refresh-fx-rates, generation should
// start the moment payment confirms, not on a schedule, the "~15-20
// minutes" messaging shown to customers is about how long real
// synthesis takes, or fair warning during a genuine backlog, never a
// deliberately imposed delay for a single reading with nothing else
// queued.
//
// Two separate things get checked here, not one:
//   1. Jobs still 'pending', awaiting payment, either start them the
//      moment pending_checkouts confirms, or fail them out after the
//      same 30-minute window the old in-memory timeout used.
//   2. Jobs stuck 'processing' with a stale updated_at, the exact
//      signature of a job orphaned mid-generation by a restart, these
//      get resumed automatically instead of sitting there until someone
//      notices and fixes it by hand.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateReading } from '@/lib/reading/generateReading'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CRON_SECRET = process.env.CRON_SECRET
const MAX_CONCURRENT_GENERATIONS = 10
const PAYMENT_TIMEOUT_MINUTES = 30
const STALE_PROCESSING_MINUTES = 10

// The real ceiling on how many readings generate at once, system-wide,
// not per tick. Each generation does real, meaningful work, astrology
// and numerology math, MediaPipe image analysis where relevant, and a
// genuine DeepSeek call for the narration itself, running very many of
// these truly simultaneously would exhaust server resources and very
// likely hit DeepSeek's own rate limits long before reaching anywhere
// near real scale. 10 is a conservative starting point, not a measured
// number, raise it once actual server and API throughput under real
// load has been observed directly, rather than guessed at.

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-cron-secret')
  if (!CRON_SECRET || authHeader !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const started: string[] = []
  const failed: string[] = []
  const resumed: string[] = []

  // Real, live count, not a per-tick local counter, this is what
  // actually bounds total concurrency correctly even across multiple
  // ticks, a flat "start N per minute" without checking what's already
  // running could still stack up unbounded if generation takes longer
  // than a minute, which it usually does.
  const { count: currentlyProcessing } = await supabaseAdmin
    .from('reading_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'processing')

  let remainingCapacity = MAX_CONCURRENT_GENERATIONS - (currentlyProcessing ?? 0)

  // 1. Jobs stuck mid-generation, the orphaned-by-restart case, handled
  //    first, deliberately, a real customer already waiting on a
  //    half-finished job should get priority over the capacity budget
  //    ahead of anyone brand new joining the queue.
  if (remainingCapacity > 0) {
    const staleThreshold = new Date(now - STALE_PROCESSING_MINUTES * 60000).toISOString()
    const { data: staleJobs } = await supabaseAdmin
      .from('reading_jobs')
      .select('id, user_id, tool_id, input_data')
      .eq('status', 'processing')
      .lt('updated_at', staleThreshold)
      .order('updated_at', { ascending: true })
      .limit(remainingCapacity)

    for (const job of staleJobs || []) {
      resumed.push(job.id)
      remainingCapacity--
      generateReading(job.id, job.user_id, job.tool_id, job.input_data || {}).catch(err =>
        console.error(`[process-pending-readings] resume failed for ${job.id}:`, err)
      )
    }
  }

  // 2. Jobs awaiting payment confirmation, oldest first, fair FIFO
  //    order, so a deep queue drains in the order people actually paid,
  //    not arbitrarily.
  const { data: pendingJobs } = await supabaseAdmin
    .from('reading_jobs')
    .select('id, user_id, tool_id, input_data, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  for (const job of pendingJobs || []) {
    const { data: checkout } = await supabaseAdmin
      .from('pending_checkouts')
      .select('status')
      .eq('job_id', job.id)
      .maybeSingle()

    if (checkout?.status === 'completed') {
      // Payment is genuinely confirmed, this job is real and paid for,
      // it never gets timed out for age past this point, only capacity
      // decides when it actually starts. A deep queue means a longer
      // wait, not a failure, those are different things.
      if (remainingCapacity > 0) {
        started.push(job.id)
        remainingCapacity--
        generateReading(job.id, job.user_id, job.tool_id, job.input_data || {}).catch(err =>
          console.error(`[process-pending-readings] generateReading failed for ${job.id}:`, err)
        )
      }
      continue
    }

    // Payment itself isn't confirmed yet, this is the only case the
    // 30-minute timeout applies to, a genuinely abandoned or failed
    // checkout, not a paid job waiting its turn in a busy queue.
    const ageMinutes = (now - new Date(job.created_at).getTime()) / 60000
    const explicitlyFailed = checkout?.status === 'failed'

    if (explicitlyFailed || ageMinutes > PAYMENT_TIMEOUT_MINUTES) {
      failed.push(job.id)
      await supabaseAdmin
        .from('reading_jobs')
        .update({
          status: 'failed',
          error: explicitlyFailed
            ? 'Payment failed, reading was not generated.'
            : 'Payment was not confirmed in time, reading was not generated.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    }
  }

  return NextResponse.json({
    started, failed, resumed,
    currentlyProcessing: currentlyProcessing ?? 0,
    stillQueued: (pendingJobs?.length ?? 0) - started.length - failed.length,
  })
}
