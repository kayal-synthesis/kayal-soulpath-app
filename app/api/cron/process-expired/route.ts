import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    // 🔐 Security: Verify cron secret
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`
    
    if (!process.env.CRON_SECRET) {
      console.warn('⚠️ CRON_SECRET not set - skipping authentication')
    } else if (authHeader !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      )
    }

    const now = new Date().toISOString()
    const results = {
      processed: 0,
      expired: 0,
      renewed: 0,
      notifications: 0,
      errors: [] as any[]
    }

    console.log('🕐 Running expired subscription check at:', now)

    // ============================================
    // STEP 1: Find expired subscriptions
    // ============================================
    const { data: expired, error: fetchError } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .lt('expires_at', now)
      .in('status', ['active', 'cancelled'])

    if (fetchError) {
      console.error('❌ Error fetching expired subscriptions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch expired subscriptions' },
        { status: 500 }
      )
    }

    console.log(`📊 Found ${expired?.length || 0} expired subscriptions to process`)

    // ============================================
    // STEP 2: Process each expired subscription
    // ============================================
    for (const sub of expired || []) {
      try {
        // Check if this is an active subscription that should auto-renew
        if (sub.status === 'active' && sub.auto_renew !== false) {
          // This would be where you integrate with Stripe/PayPal
          // const paymentResult = await processRenewal(sub)
          
          // For now, we'll just log that renewal would happen
          console.log(`🔄 Would auto-renew ${sub.tool_name} for user ${sub.user_id}`)
          
          // If renewal successful, extend expiration
          // const newExpiry = new Date()
          // newExpiry.setMonth(newExpiry.getMonth() + 1)
          
          // await supabaseAdmin
          //   .from('purchases')
          //   .update({
          //     expires_at: newExpiry.toISOString(),
          //     updated_at: now
          //   })
          //   .eq('id', sub.id)
          
          // results.renewed++
        } else {
          // Mark as expired (for cancelled or non-renewing subscriptions)
          const { error: updateError } = await supabaseAdmin
            .from('purchases')
            .update({
              status: 'expired',
              updated_at: now
            })
            .eq('id', sub.id)

          if (updateError) throw updateError
          
          results.expired++
          console.log(`✅ Marked ${sub.tool_name} as expired for user ${sub.user_id}`)
        }

        // ============================================
        // STEP 3: Send notification to user
        // ============================================
        const { error: notifError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: sub.user_id,
            type: 'subscription_expired',
            title: 'Subscription Expired',
            message: sub.status === 'cancelled'
              ? `Your ${sub.tool_name} subscription has ended as requested. Thank you for being with us!`
              : `Your ${sub.tool_name} subscription has expired. Renew now to continue access.`,
            data: { 
              tool_id: sub.tool_id,
              tool_name: sub.tool_name,
              was_cancelled: sub.status === 'cancelled'
            },
            created_at: now
          })

        if (notifError) {
          console.error('❌ Error sending notification:', notifError)
          // Don't throw - continue processing others
        } else {
          results.notifications++
        }

        results.processed++

      } catch (error) {
        console.error(`❌ Error processing subscription ${sub.id}:`, error)
        results.errors.push({
          subscription_id: sub.id,
          user_id: sub.user_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // ============================================
    // STEP 4: Clean up old cancellation logs (optional)
    // ============================================
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { error: cleanupError } = await supabaseAdmin
      .from('cancellation_logs')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())

    if (cleanupError) {
      console.error('❌ Error cleaning up old logs:', cleanupError)
      // Non-critical, don't fail the whole job
    }

    // ============================================
    // STEP 5: Return results
    // ============================================
    console.log('✅ Cron job completed:', results)

    return NextResponse.json({
      success: true,
      message: 'Expired subscriptions processed successfully',
      timestamp: now,
      results: {
        processed: results.processed,
        expired: results.expired,
        renewed: results.renewed,
        notifications: results.notifications,
        errors: results.errors.length
      },
      details: results.errors.length > 0 ? { errors: results.errors } : undefined
    })

  } catch (error) {
    console.error('❌ Fatal error in cron job:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process expired subscriptions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Optional: POST endpoint for manual triggering (admin only)
export async function POST(request: Request) {
  try {
    // Verify admin access (you'll need to implement this)
    const { data: { user } } = await supabaseAdmin.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin (you'll need an admin table)
    // const { data: admin } = await supabaseAdmin
    //   .from('admins')
    //   .select('id')
    //   .eq('id', user.id)
    //   .single()

    // if (!admin) {
    //   return NextResponse.json(
    //     { error: 'Forbidden - Admin access required' },
    //     { status: 403 }
    //   )
    // }

    // Call the same logic as GET
    const response = await GET(request)
    return response

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to trigger cron job' },
      { status: 500 }
    )
  }
}