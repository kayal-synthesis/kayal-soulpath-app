// app/api/affiliate/links/route.ts
//
// GET  /api/affiliate/links?affiliateId=xxx
//   Returns all affiliate links for this affiliate.
//   Used by AffiliateLinkGenerator to populate the saved links list.
//
// POST /api/affiliate/links
//   Creates a new affiliate link.
//   Returns the full link including the assigned lid (UUID).
//
// PATCH /api/affiliate/links/[linkId]
//   Updates link status (active | paused | archived).

import { NextResponse }  from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.kayalsoulpath.com'

// ── GET — list links ──────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const affiliateId      = searchParams.get('affiliateId')

    if (!affiliateId) {
      return NextResponse.json({ error: 'affiliateId required' }, { status: 400 })
    }

    // ── Auth guard ─────────────────────────────────────────────
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== affiliateId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: links, error } = await supabaseAdmin
      .from('affiliate_links')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[affiliate/links GET] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
    }

    // ── Shape to AffiliateLink interface ──────────────────────
    const shaped = (links || []).map(l => ({
      id:             l.id,
      name:           l.name              || 'Untitled Link',
      toolId:         l.tool_id           || undefined,
      toolName:       l.tool_name         || undefined,
      toolEmoji:      l.tool_emoji        || undefined,
      url:            l.url,
      shortUrl:       l.short_url         || l.url,
      code:           l.ref_code,
      type:           l.type              || 'general',
      campaign:       l.campaign          || undefined,
      source:         l.utm_source        || undefined,
      medium:         l.utm_medium        || undefined,
      content:        l.utm_content       || undefined,
      createdAt:      l.created_at,
      clicks:         l.clicks            || 0,
      uniqueClicks:   l.unique_clicks     || 0,
      conversions:    l.conversions       || 0,
      conversionRate: l.clicks
        ? Math.round((l.conversions || 0) / l.clicks * 10000) / 100
        : 0,
      earnings:       Number(l.earnings   || 0),
      status:         l.status            || 'active',
      tags:           l.tags              || [],
    }))

    return NextResponse.json(shaped)

  } catch (err) {
    console.error('[affiliate/links GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ── POST — create a new link ──────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      affiliateId,
      name,
      type = 'general',
      toolId,
      campaign,
      source,
      medium,
      content,
      tags = [],
    } = body

    if (!affiliateId || !name) {
      return NextResponse.json({ error: 'affiliateId and name required' }, { status: 400 })
    }

    // ── Auth guard ─────────────────────────────────────────────
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== affiliateId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Get the affiliate's ref_code ───────────────────────────
    const { data: affiliate } = await supabaseAdmin
      .from('users')
      .select('referral_code, affiliate_status')
      .eq('id', affiliateId)
      .single()

    if (!affiliate?.referral_code) {
      return NextResponse.json({ error: 'Affiliate referral code not found' }, { status: 400 })
    }

    if (affiliate.affiliate_status === 'suspended') {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }

    // ── Build the full tracking URL ────────────────────────────
    // lid will be assigned after insert; we update it immediately after
    const params = new URLSearchParams()
    params.set('ref', affiliate.referral_code)
    if (source)   params.set('utm_source',   source)
    if (medium)   params.set('utm_medium',   medium)
    if (campaign) params.set('utm_campaign', campaign)
    if (content)  params.set('utm_content',  content)

    const toolPath = toolId ? `/tool/${toolId}` : ''
    const baseUrl  = `${BASE_URL}${toolPath}?${params.toString()}`

    // ── Get tool details if tool-specific link ─────────────────
    let toolName: string | null = null
    let toolEmoji: string | null = null

    if (toolId) {
      // Look up tool name/emoji from affiliate_links if already known,
      // otherwise leave null — the frontend will pass these in the request body
      toolName  = body.toolName  || null
      toolEmoji = body.toolEmoji || null
    }

    // ── Insert the link ────────────────────────────────────────
    const { data: newLink, error: insertError } = await supabaseAdmin
      .from('affiliate_links')
      .insert({
        affiliate_id: affiliateId,
        name,
        ref_code:     affiliate.referral_code,
        tool_id:      toolId    || null,
        tool_name:    toolName  || null,
        tool_emoji:   toolEmoji || null,
        type,
        campaign:     campaign  || null,
        utm_source:   source    || null,
        utm_medium:   medium    || null,
        utm_content:  content   || null,
        url:          baseUrl,       // base URL before lid is appended
        short_url:    null,
        status:       'active',
        tags,
        clicks:       0,
        unique_clicks: 0,
        conversions:  0,
        earnings:     0,
        created_at:   new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('[affiliate/links POST] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
    }

    // ── Append lid=<uuid> to the URL now that we have the row ID ──
    const finalParams = new URLSearchParams(params)
    finalParams.set('lid', newLink.id)
    const finalUrl = `${BASE_URL}${toolPath}?${finalParams.toString()}`

    await supabaseAdmin
      .from('affiliate_links')
      .update({ url: finalUrl })
      .eq('id', newLink.id)

    // ── Return the shaped link ─────────────────────────────────
    return NextResponse.json({
      id:           newLink.id,
      name:         newLink.name,
      toolId:       newLink.tool_id      || undefined,
      toolName:     newLink.tool_name    || undefined,
      toolEmoji:    newLink.tool_emoji   || undefined,
      url:          finalUrl,
      shortUrl:     finalUrl,
      code:         newLink.ref_code,
      type:         newLink.type,
      campaign:     newLink.campaign     || undefined,
      source:       newLink.utm_source   || undefined,
      medium:       newLink.utm_medium   || undefined,
      content:      newLink.utm_content  || undefined,
      createdAt:    newLink.created_at,
      clicks:       0,
      uniqueClicks: 0,
      conversions:  0,
      conversionRate: 0,
      earnings:     0,
      status:       'active',
      tags:         newLink.tags || [],
    }, { status: 201 })

  } catch (err) {
    console.error('[affiliate/links POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ── PATCH — update link status ────────────────────────────────

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { linkId, status } = body

    if (!linkId || !status) {
      return NextResponse.json({ error: 'linkId and status required' }, { status: 400 })
    }

    if (!['active', 'paused', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // ── Auth: confirm caller owns this link ────────────────────
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: link } = await supabaseAdmin
      .from('affiliate_links')
      .select('affiliate_id')
      .eq('id', linkId)
      .single()

    if (!link || link.affiliate_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from('affiliate_links')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', linkId)

    if (error) {
      return NextResponse.json({ error: 'Failed to update link' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[affiliate/links PATCH] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
