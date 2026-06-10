// app/api/user/check-email/route.ts
// GET /api/user/check-email?email=xxx
// Returns whether an email has previous purchases.
// Called by detectReturningCustomer() in the purchase page.
// Public endpoint — only returns boolean flags, never private data.

import { NextResponse }  from 'next/server'
import { createClient }  from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email            = searchParams.get('email')?.toLowerCase().trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ hasPurchases: false, purchaseCount: 0 })
  }

  try {
    // Count purchases for this email
    const { data: purchases, error } = await supabaseAdmin
      .from('purchases')
      .select('id, tool_name, user_id')
      .eq('user_email', email)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (error) throw error

    const purchaseCount = purchases?.length || 0

    // Try to get their name from users table if we have a user_id
    let name: string | undefined
    if (purchases?.[0]?.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', purchases[0].user_id)
        .single()
      name = profile?.full_name || undefined
    }

    return NextResponse.json({
      hasPurchases:  purchaseCount > 0,
      purchaseCount,
      name,
      // Never return email, user_id, or tool details — public endpoint
    })

  } catch (err) {
    console.error('[check-email]', err)
    // Return safe default on error — do not expose internal errors
    return NextResponse.json({ hasPurchases: false, purchaseCount: 0 })
  }
}
