import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, ...trackingData } = body
    
    // Update tracking with any additional client-side data
    const { error } = await supabaseAdmin
      .from('user_tracking')
      .update({
        ...trackingData,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}