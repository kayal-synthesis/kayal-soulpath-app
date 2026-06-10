// app/api/admin/tools/[toolId]/route.ts
// Handles POST requests from admin/tools/page.tsx when an admin clicks Run Tool.
// Each toolId maps to a real action. Unknown toolIds return 404.
//
// Deploy: create the folder app/api/admin/tools/[toolId]/
//         and place this file as route.ts inside it.

import { NextResponse }  from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─────────────────────────────────────────────────────────────
// POST /api/admin/tools/[toolId]
// ─────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: { toolId: string } }
) {
  const { toolId } = params

  // ── Auth: must be a logged-in admin ───────────────────────
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminUser } = await supabaseAdmin
    .from('admin_users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!adminUser) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // ── Route to tool handler ──────────────────────────────────
  try {
    switch (toolId) {

      // ── Standard system tools ────────────────────────────────

      case 'cache-clear':
        return await runCacheClear()

      case 'database-optimize':
        return await runDatabaseOptimize()

      case 'backup':
        return await runBackup()

      case 'security-scan':
        return await runSecurityScan()

      case 'cleanup-logs':
        return await runCleanupLogs()

      case 'sync-users':
        return await runSyncUsers()

      case 'test-email':
        return await runTestEmail(user.email || '')

      // ── KAYAL-specific tools ──────────────────────────────────

      case 'recalculate-commissions':
        return await runRecalculateCommissions()

      case 'clear-synthesis-cache':
        return await runClearSynthesisCache()

      case 'rebuild-tool-index':
        return await runRebuildToolIndex()

      case 'test-teaser-api':
        return await runTestTeaserApi()

      default:
        return NextResponse.json(
          { error: `Tool '${toolId}' not found` },
          { status: 404 }
        )
    }
  } catch (err: any) {
    console.error(`[admin/tools/${toolId}] Error:`, err)
    return NextResponse.json(
      { error: err.message || 'Tool execution failed' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────
// TOOL IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────

// ── cache-clear ────────────────────────────────────────────
async function runCacheClear() {
  // Next.js does not expose a public cache clear API.
  // For Vercel: use the revalidateTag/revalidatePath approach in your pages.
  // For self-hosted: this clears the synthesis cache on the Python backend too.
  await clearSynthesisCache()
  return NextResponse.json({ success: true, message: 'Cache cleared' })
}

// ── database-optimize ─────────────────────────────────────
async function runDatabaseOptimize() {
  // Supabase PostgreSQL — VACUUM ANALYZE on key tables
  // Requires a Postgres function with SECURITY DEFINER since
  // the service role cannot run VACUUM directly.
  // Create this function in Supabase SQL editor:
  //   CREATE OR REPLACE FUNCTION admin_vacuum_analyze()
  //   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  //   BEGIN
  //     VACUUM ANALYZE purchases;
  //     VACUUM ANALYZE affiliate_clicks;
  //     VACUUM ANALYZE affiliate_conversions;
  //     VACUUM ANALYZE earnings_ledger;
  //   END; $$;

  const { error } = await supabaseAdmin.rpc('admin_vacuum_analyze')
  if (error) {
    // RPC may not exist yet — return informative message
    return NextResponse.json({
      success: false,
      message: 'admin_vacuum_analyze() RPC not yet created. ' +
               'Run the SQL in supabase/migrations/admin_tools.sql to enable this.',
    })
  }
  return NextResponse.json({ success: true, message: 'Database optimized' })
}

// ── backup ────────────────────────────────────────────────
async function runBackup() {
  // Supabase handles automated backups on Pro plan.
  // This logs the backup request — actual backup is managed by Supabase.
  await supabaseAdmin.from('admin_logs').insert({
    action:     'backup_requested',
    details:    { note: 'Manual backup trigger — managed by Supabase' },
    created_at: new Date().toISOString(),
  })
  return NextResponse.json({
    success: true,
    message: 'Backup request logged. Supabase Pro handles automated backups.',
  })
}

// ── security-scan ─────────────────────────────────────────
async function runSecurityScan() {
  // Count open fraud alerts
  const { count: openAlerts } = await supabaseAdmin
    .from('fraud_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open')

  const { count: criticalAlerts } = await supabaseAdmin
    .from('fraud_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open')
    .eq('severity', 'critical')

  return NextResponse.json({
    success: true,
    message: `Security scan complete. Open alerts: ${openAlerts || 0}. Critical: ${criticalAlerts || 0}.`,
    data: { openAlerts, criticalAlerts },
  })
}

// ── cleanup-logs ──────────────────────────────────────────
async function runCleanupLogs() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const { count, error } = await supabaseAdmin
    .from('admin_logs')
    .delete()
    .lt('created_at', cutoff.toISOString())
    .select('*', { count: 'exact', head: true })

  if (error) throw error

  return NextResponse.json({
    success: true,
    message: `Deleted ${count || 0} admin log entries older than 90 days`,
  })
}

// ── sync-users ────────────────────────────────────────────
async function runSyncUsers() {
  // Ensure every auth.users row has a corresponding public.users row
  // This fixes orphaned accounts from failed registrations
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  let synced = 0

  for (const authUser of authUsers?.users || []) {
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle()

    if (!existing) {
      await supabaseAdmin.from('users').insert({
        id:           authUser.id,
        email:        authUser.email,
        full_name:    authUser.user_metadata?.full_name || null,
        created_at:   authUser.created_at,
        is_active:    true,
        email_verified: !!authUser.email_confirmed_at,
      }).catch(() => {/* already exists race condition */})
      synced++
    }
  }

  return NextResponse.json({
    success: true,
    message: `Synced ${synced} orphaned user account${synced === 1 ? '' : 's'}`,
  })
}

// ── test-email ────────────────────────────────────────────
async function runTestEmail(adminEmail: string) {
  // Calls your email service to send a test message
  // Replace with your actual email provider (Resend, SendGrid, etc.)
  const emailEndpoint = process.env.EMAIL_SERVICE_URL
  if (!emailEndpoint) {
    return NextResponse.json({
      success: false,
      message: 'EMAIL_SERVICE_URL not set in environment variables',
    })
  }

  const res = await fetch(emailEndpoint + '/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to:      adminEmail,
      subject: 'KAYAL LifeOS — Email Test',
      text:    'This is a test email from the KAYAL admin tools panel.',
    }),
  })

  if (!res.ok) throw new Error(`Email service returned ${res.status}`)
  return NextResponse.json({ success: true, message: `Test email sent to ${adminEmail}` })
}

// ── recalculate-commissions ───────────────────────────────
// Scans confirmed purchases with a ref_code that have no matching
// affiliate_conversions row, and credits commission for each.
async function runRecalculateCommissions() {
  const { data: uncredited } = await supabaseAdmin
    .from('purchases')
    .select('id, ref_code, tool_id, tool_name, amount, stripe_session_id')
    .eq('status', 'completed')
    .not('ref_code', 'is', null)

  let credited = 0
  let skipped  = 0

  for (const purchase of uncredited || []) {
    // Check if conversion already exists
    const { data: existing } = await supabaseAdmin
      .from('affiliate_conversions')
      .select('id')
      .eq('stripe_session_id', purchase.stripe_session_id)
      .maybeSingle()

    if (existing) { skipped++; continue }

    // Look up affiliate
    const { data: affiliate } = await supabaseAdmin
      .from('users')
      .select('id, affiliate_status')
      .eq('referral_code', purchase.ref_code)
      .single()

    if (!affiliate || affiliate.affiliate_status === 'suspended') { skipped++; continue }

    const commissionAmount = Math.round(Number(purchase.amount) * 0.30 * 100) / 100

    // Insert conversion and credit
    const { data: conversion } = await supabaseAdmin
      .from('affiliate_conversions')
      .insert({
        affiliate_id:      affiliate.id,
        tool_id:           purchase.tool_id,
        tool_name:         purchase.tool_name,
        ref_code:          purchase.ref_code,
        stripe_session_id: purchase.stripe_session_id,
        purchase_amount:   Number(purchase.amount),
        commission_rate:   30.00,
        commission_amount: commissionAmount,
        is_recurring:      false,
        status:            'pending',
        created_at:        new Date().toISOString(),
      })
      .select('id')
      .single()

    if (conversion) {
      await supabaseAdmin.rpc('credit_commission', {
        p_affiliate_id:    affiliate.id,
        p_conversion_id:   conversion.id,
        p_purchase_amount: Number(purchase.amount),
      })
      credited++
    }
  }

  return NextResponse.json({
    success: true,
    message: `Commission recalculation complete. Credited: ${credited}, Skipped: ${skipped}`,
    data: { credited, skipped },
  })
}

// ── clear-synthesis-cache ─────────────────────────────────
async function runClearSynthesisCache() {
  return await clearSynthesisCache()
}

async function clearSynthesisCache() {
  const apiUrl = process.env.SYNTHESIS_API_URL || 'https://api.kayalsoulpath.com'
  const apiKey = process.env.SYNTHESIS_API_KEY  || ''

  try {
    const res = await fetch(`${apiUrl}/admin/cache/clear`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-Admin-Key':   apiKey,
      },
    })

    if (!res.ok) throw new Error(`Synthesis API returned ${res.status}`)
    return NextResponse.json({ success: true, message: 'Synthesis cache cleared' })

  } catch (err: any) {
    // Backend may not be available — return informative message
    return NextResponse.json({
      success: false,
      message: `Could not reach synthesis API: ${err.message}. Clear manually or restart the backend.`,
    })
  }
}

// ── rebuild-tool-index ────────────────────────────────────
async function runRebuildToolIndex() {
  const apiUrl = process.env.SYNTHESIS_API_URL || 'https://api.kayalsoulpath.com'
  const apiKey = process.env.SYNTHESIS_API_KEY  || ''

  try {
    const res = await fetch(`${apiUrl}/admin/tools/rebuild-index`, {
      method:  'POST',
      headers: { 'X-Admin-Key': apiKey },
    })

    if (!res.ok) throw new Error(`Synthesis API returned ${res.status}`)
    const data = await res.json()
    return NextResponse.json({
      success: true,
      message: `Tool index rebuilt. ${data.tool_count || '?'} tools indexed.`,
    })

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: `Could not reach synthesis API: ${err.message}`,
    })
  }
}

// ── test-teaser-api ───────────────────────────────────────
async function runTestTeaserApi() {
  try {
    const testPayload = {
      tool_id:    'birthday-blueprint',
      name:       'Test User',
      dob:        '1990-01-15',
      is_preview: true,
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/tool-teaser`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(testPayload),
      }
    )

    if (!res.ok) throw new Error(`Teaser API returned ${res.status}`)
    const data = await res.json()
    const hasContent = data.teaser?.length > 0 || data.preview?.length > 0

    return NextResponse.json({
      success: true,
      message: hasContent
        ? 'Teaser API is responding correctly'
        : 'Teaser API responded but returned empty content',
      data: { status: res.status, hasContent },
    })

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: `Teaser API test failed: ${err.message}`,
    })
  }
}
