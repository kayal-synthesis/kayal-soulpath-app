import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, toolId, reason, feedback } = body

    if (!userId || !toolId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the subscription
    const { data: purchase, error: fetchError } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('tool_id', toolId)
      .eq('status', 'active')
      .single()

    if (fetchError || !purchase) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // 🔥 FIX: Always cancel at period end, NO refunds
    const updates = {
      status: 'cancelled', // Will not auto-renew
      cancelled_at: new Date().toISOString(),
      will_expire_at: purchase.expires_at, // Keep original expiry
      auto_renew: false, // Explicitly disable auto-renewal
      cancellation_reason: reason || null
    }

    // Update the subscription
    const { error: updateError } = await supabaseAdmin
      .from('purchases')
      .update(updates)
      .eq('id', purchase.id)

    if (updateError) {
      throw updateError
    }

    // Log the cancellation in the new table
    const { error: logError } = await supabaseAdmin
      .from('cancellation_logs')
      .insert({
        user_id: userId,
        tool_id: toolId,
        tool_name: purchase.tool_name,
        purchase_id: purchase.id,
        cancel_type: 'end_of_period',
        reason: reason || null,
        feedback: feedback || null,
        original_expiry: purchase.expires_at,
        cancelled_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Error logging cancellation:', logError)
      // Don't throw - main operation succeeded
    }

    // Send confirmation email (implement this separately)
    // await sendCancellationEmail(userId, toolId, purchase.expires_at)

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      expires_at: purchase.expires_at,
      note: 'You will continue to have access until your current billing period ends. No refunds will be issued for unused time.'
    })

  } catch (error) {
    console.error('Cancellation error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

// Reactivate a cancelled subscription
export async function PUT(request: Request) {
  try {
    const { userId, toolId } = await request.json()

    const { data: purchase, error: fetchError } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('tool_id', toolId)
      .eq('status', 'cancelled')
      .single()

    if (fetchError || !purchase) {
      return NextResponse.json(
        { error: 'No cancelled subscription found' },
        { status: 404 }
      )
    }

    // Check if already expired
    if (new Date(purchase.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Subscription has already expired. Please purchase a new one.' },
        { status: 400 }
      )
    }

    // Reactivate the subscription
    const { error: updateError } = await supabaseAdmin
      .from('purchases')
      .update({
        status: 'active',
        cancelled_at: null,
        will_expire_at: null,
        auto_renew: true,
        cancellation_reason: null
      })
      .eq('id', purchase.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully'
    })

  } catch (error) {
    console.error('Reactivation error:', error)
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    )
  }
}

// Get cancellation history for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const { data: logs, error } = await supabaseAdmin
      .from('cancellation_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      logs: logs || [] 
    })

  } catch (error) {
    console.error('Error fetching cancellation logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cancellation history' },
      { status: 500 }
    )
  }
}