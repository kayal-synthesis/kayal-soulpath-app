// app/api/insights/route.ts
// ============================================================
// KAYAL LifeOS — Insights API
// Fetches published posts from Supabase blog_posts table
// Used by app.kayalsoulpath.com to display insights
// Same data source as kayalsoulpath.com/insights.html
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page     = parseInt(searchParams.get('page')     || '1')
  const limit    = parseInt(searchParams.get('limit')    || '7')
  const category = searchParams.get('category') || null
  const slug     = searchParams.get('slug')     || null

  const supabase = createClient()
  const from = (page - 1) * limit
  const to   = from + limit - 1

  try {
    // ── Single post by slug ───────────────────────────────────
    if (slug) {
      const { data: post, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()

      if (error || !post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }

      return NextResponse.json({ post })
    }

    // ── List posts ────────────────────────────────────────────
    let query = supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, category, image_url, published_at, reading_time, word_count, author_name', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(from, to)

    if (category && category !== 'all') {
      // Map filter slugs to DB category names
      const categoryMap: Record<string, string> = {
        'soul-blueprint': 'Soul Blueprint',
        'mind':           'Mind Development',
        'spirit':         'Spirit Science',
        'timing':         'Timing & Cycles',
      }
      const dbCategory = categoryMap[category] || category
      query = query.eq('category', dbCategory)
    }

    const { data: posts, count, error } = await query

    if (error) throw error

    const total   = count || 0
    const hasMore = (from + (posts?.length || 0)) < total

    return NextResponse.json({
      articles: posts || [],
      total,
      page,
      limit,
      hasMore,
    }, {
      headers: {
        // Allow kayalsoulpath.com to fetch from this API
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    })

  } catch (err: any) {
    console.error('Insights API error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
