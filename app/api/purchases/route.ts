import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const cookieStore = cookies()
    
    const { 
      userId, 
      toolId, 
      toolName,
      toolType,
      category,
      destination,
      emoji,
      price,
      images, 
      purchaseDate,
      name,
      email 
    } = body

    // Validate required fields
    if (!userId || !toolId || !toolName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    if (!isUUID) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    // Check if user exists in public.users (create if not)
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!existingUser) {
      // Create user record
      await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: email || 'unknown@email.com',
          name: name || 'User',
          membership_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }

    // Prepare images as JSONB
    const imagesJson = images && typeof images === 'object' ? images : {}

    // Insert purchase into Supabase
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .insert({
        user_id: userId,
        tool_id: toolId,
        tool_name: toolName,
        tool_type: toolType || 'report',
        category: category || 'universal',
        destination: destination || toolType || 'report',
        emoji: emoji || '📦',
        price: price || 0,
        images: imagesJson,
        status: 'active',
        purchase_date: purchaseDate || new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (purchaseError) {
      console.error('❌ Purchase error:', purchaseError)
      return NextResponse.json(
        { error: purchaseError.message },
        { status: 500 }
      )
    }

    // ============================================
    // AFFILIATE TRACKING - CHECK FOR COOKIE
    // ============================================
    try {
      const cookieValue = cookieStore.get('affiliate_cookie')?.value

      if (cookieValue) {
        console.log('🍪 Affiliate cookie found:', cookieValue)

        // Get cookie from database
        const { data: cookie, error: cookieError } = await supabaseAdmin
          .from('affiliate_cookies')
          .select('*')
          .eq('cookie_value', cookieValue)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle()

        if (cookieError) {
          console.error('❌ Cookie fetch error:', cookieError)
        }

        if (cookie && !cookie.converted) {
          console.log('💰 Valid affiliate cookie found for affiliate:', cookie.affiliate_id)

          // Calculate commission (15% default, could be based on affiliate tier)
          const commissionRate = 15
          const commission = (price * commissionRate) / 100

          // Create conversion record
          const { data: conversion, error: conversionError } = await supabaseAdmin
            .from('affiliate_conversions')
            .insert({
              cookie_id: cookie.id,
              affiliate_id: cookie.affiliate_id,
              link_id: cookie.link_id,
              user_id: userId,
              purchase_id: purchase.id,
              tool_id: toolId,
              tool_name: toolName,
              amount: price,
              commission: commission,
              commission_rate: commissionRate,
              status: 'pending',
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (conversionError) {
            console.error('❌ Conversion creation error:', conversionError)
          } else {
            console.log('✅ Affiliate conversion recorded:', conversion.id)

            // Mark cookie as converted
            await supabaseAdmin
              .from('affiliate_cookies')
              .update({ 
                converted: true,
                conversion_id: conversion.id,
                conversion_amount: price,
                conversion_date: new Date().toISOString()
              })
              .eq('id', cookie.id)

            // Update link stats
            if (cookie.link_id) {
              await supabaseAdmin.rpc('increment_link_conversions', {
                link_id: cookie.link_id,
                commission_amount: commission
              })
            }

            // Create notification for affiliate
            await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: cookie.affiliate_id,
                type: 'affiliate_conversion',
                title: '🎉 New Sale!',
                message: `Someone purchased ${toolName} using your link. You earned $${commission.toFixed(2)}!`,
                data: { conversion_id: conversion.id, amount: commission },
                created_at: new Date().toISOString()
              })
          }
        } else if (cookie && cookie.converted) {
          console.log('⚠️ Cookie already converted')
        } else {
          console.log('❌ No valid cookie found')
        }
      }
    } catch (affiliateError) {
      // Don't fail the purchase if affiliate tracking fails
      console.error('❌ Affiliate tracking error:', affiliateError)
    }

    return NextResponse.json({ 
      success: true,
      purchase,
      message: 'Purchase saved successfully'
    })

  } catch (error) {
    console.error('❌ Error adding purchase:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add purchase' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    if (!isUUID) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    // Get purchases from Supabase
    const { data: purchases, error } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch purchases' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      purchases: purchases || []
    })

  } catch (error) {
    console.error('❌ Error fetching purchases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    )
  }
}