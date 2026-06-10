// app/api/affiliate/track-click/route.ts
// Increments click count on affiliate_links when a visitor lands on a tool page
// with a ?ref= parameter. Called silently — never blocks the page load.

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

// Use service role key so this works without a user session
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { ref, tool_id } = await request.json()

    if (!ref) {
      return NextResponse.json({ error: 'No ref provided' }, { status: 400 })
    }

    // Get visitor IP for unique click detection
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Find the affiliate_links row — ref is the affiliate's auth UUID
    // Match on affiliate_id and optionally tool_id for more accurate tracking
    const query = supabase
      .from('affiliate_links')
      .select('id, clicks, unique_clicks')
      .eq('affiliate_id', ref)
      .eq('status', 'active')

    if (tool_id) {
      query.eq('tool_id', tool_id)
    }

    const { data: links, error: fetchError } = await query.order('created_at', { ascending: false }).limit(1)

    if (fetchError || !links || links.length === 0) {
      // No matching link found — ref may be a direct affiliate ID not tied to a specific link
      // Try to find any active link for this affiliate
      const { data: anyLink, error: anyError } = await supabase
        .from('affiliate_links')
        .select('id, clicks, unique_clicks')
        .eq('affiliate_id', ref)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (anyError || !anyLink) {
        return NextResponse.json({ tracked: false })
      }

      await supabase
        .from('affiliate_links')
        .update({
          clicks:        anyLink.clicks        + 1,
          unique_clicks: anyLink.unique_clicks + 1,
          last_used:     new Date().toISOString(),
          updated_at:    new Date().toISOString(),
        })
        .eq('id', anyLink.id)

      return NextResponse.json({ tracked: true })
    }

    const link = links[0]

    // Increment clicks
    const { error: updateError } = await supabase
      .from('affiliate_links')
      .update({
        clicks:        link.clicks        + 1,
        unique_clicks: link.unique_clicks + 1,
        last_used:     new Date().toISOString(),
        updated_at:    new Date().toISOString(),
      })
      .eq('id', link.id)

    if (updateError) {
      console.error('Error updating clicks:', updateError)
      return NextResponse.json({ tracked: false }, { status: 500 })
    }

    return NextResponse.json({ tracked: true })

  } catch (error) {
    console.error('Track click error:', error)
    return NextResponse.json({ tracked: false }, { status: 500 })
  }
}
