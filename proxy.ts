import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { v4 as uuidv4 } from 'uuid'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // PUBLIC PATHS - No authentication required
  const publicPaths = [
    '/', 
    '/about', 
    '/pricing', 
    '/privacy', 
    '/terms',
    '/onboarding',
    '/onboarding/basic',
    '/onboarding/choose-path',
    '/onboarding/upload',
    '/onboarding/processing',
    '/domain',
    '/purchase',
    '/api/public',
    '/api/affiliate/click',
    // Auth routes
    '/auth/login',
    '/auth/register',
    '/auth/confirm',
    '/auth/magic',
    '/auth/check-email',
    '/auth/reset-password',
    '/auth/callback',
    // ALL ADMIN ROUTES - Make them all public
    '/admin',
    '/admin/login',
    '/admin/dashboard',
    '/admin/analytics',
    '/admin/payouts',
    '/admin/settings',
    '/admin/users',
    '/admin/affiliates',
    '/admin/tools',
    '/admin/fraud',
    '/admin/health',
    '/admin/reports',
    // Member referral routes
    '/member/referral/register',
    '/member/referral/login',
    '/member/referral/dashboard',
  ]

  // Check if current path is public
  const isPublicPath = publicPaths.some(p => path === p || path.startsWith(p + '/')) ||
                       path.includes('.') || // static files
                       path.startsWith('/_next') ||
                       path.startsWith('/api/public')

  // Initialize Supabase client for auth
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if needed
  await supabase.auth.getUser()

  // ============================================
  // AFFILIATE LINK HANDLING
  // ============================================

  // Check for shortened affiliate links
  if (path.startsWith('/r/') || path.startsWith('/ref/')) {
    const code = path.split('/')[2]
    if (code) {
      const redirectUrl = new URL(`/api/affiliate/click?ref=${code}`, request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Check for referral parameter
  const url = request.nextUrl
  const ref = url.searchParams.get('ref')
  const toolId = url.pathname.split('/').pop()

  if (ref && path.startsWith('/purchase/')) {
    const redirectUrl = new URL(`/api/affiliate/click?ref=${ref}&tool=${toolId}`, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // ============================================
  // TRACKING
  // ============================================

  // Get or create anonymous session ID for tracking
  let sessionId = request.cookies.get('kayal_anon_session')?.value

  if (!sessionId) {
    sessionId = uuidv4()
    supabaseResponse.cookies.set('kayal_anon_session', sessionId, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  // Get geolocation data
  const geo = request.geo || {}
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const userAgent = request.headers.get('user-agent') || ''
  const referer = request.headers.get('referer') || ''
  const landingPage = request.nextUrl.pathname

  // Parse UTM parameters
  const utmSource = url.searchParams.get('utm_source')
  const utmMedium = url.searchParams.get('utm_medium')
  const utmCampaign = url.searchParams.get('utm_campaign')
  const utmTerm = url.searchParams.get('utm_term')
  const utmContent = url.searchParams.get('utm_content')

  // Create tracking data
  const trackingData = {
    sessionId,
    ipAddress: ip,
    country: geo.country,
    city: geo.city,
    region: geo.region,
    latitude: geo.latitude,
    longitude: geo.longitude,
    timezone: geo.timezone,
    userAgent,
    referrer: referer,
    landingPage,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent
  }

  // Store in request headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-session-id', sessionId)
  requestHeaders.set('x-tracking-data', Buffer.from(JSON.stringify(trackingData)).toString('base64'))

  // Update response with modified headers
  supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Re-apply the session cookie
  supabaseResponse.cookies.set('kayal_anon_session', sessionId, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  // ✅ FOR PUBLIC PATHS - Just track and return
  if (isPublicPath) {
    // Track in background (don't await)
    trackVisitor(trackingData, supabase).catch(console.error)
    return supabaseResponse
  }

  // ============================================
  // PROTECTED PATHS - Check authentication
  // ============================================

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser()

  // If no user, redirect to appropriate login
  if (!user) {
    if (path.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Admin routes check - only for protected admin paths that require authentication
  if (path.startsWith('/admin') && !publicPaths.includes(path)) {
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!adminData) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Track and return
  trackVisitor(trackingData, supabase).catch(console.error)
  return supabaseResponse
}

// Background tracking function
async function trackVisitor(data: any, supabase: any) {
  try {
    const deviceInfo = parseUserAgent(data.userAgent)

    const { data: existing } = await supabase
      .from('user_tracking')
      .select('id, visit_count')
      .eq('session_id', data.sessionId)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('user_tracking')
        .update({
          last_visit: new Date().toISOString(),
          visit_count: existing.visit_count + 1,
          ip_address: data.ipAddress,
          country: data.country,
          city: data.city,
          region: data.region,
          latitude: data.latitude,
          longitude: data.longitude,
          user_agent: data.userAgent,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', data.sessionId)
    } else {
      await supabase
        .from('user_tracking')
        .insert({
          session_id: data.sessionId,
          ip_address: data.ipAddress,
          country: data.country,
          city: data.city,
          region: data.region,
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          browser_version: deviceInfo.browserVersion,
          os: deviceInfo.os,
          os_version: deviceInfo.osVersion,
          user_agent: data.userAgent,
          referrer: data.referrer,
          landing_page: data.landingPage,
          utm_source: data.utmSource,
          utm_medium: data.utmMedium,
          utm_campaign: data.utmCampaign,
          utm_term: data.utmTerm,
          utm_content: data.utmContent,
          first_visit: new Date().toISOString(),
          last_visit: new Date().toISOString(),
          visit_count: 1
        })
    }
  } catch (error) {
    console.error('Error tracking visitor:', error)
  }
}

// Parse user agent
function parseUserAgent(ua: string) {
  const uaLower = ua.toLowerCase()

  const isMobile = /mobile|android|iphone|ipod|blackberry|windows phone/i.test(uaLower)
  const isTablet = /tablet|ipad|kindle|playbook|silk/i.test(uaLower)

  let deviceType = 'desktop'
  if (isMobile) deviceType = 'mobile'
  if (isTablet) deviceType = 'tablet'

  let browser = 'unknown'
  let browserVersion = 'unknown'

  if (uaLower.includes('chrome') && !uaLower.includes('edg')) {
    browser = 'chrome'
    const match = ua.match(/Chrome\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : 'unknown'
  } else if (uaLower.includes('firefox')) {
    browser = 'firefox'
    const match = ua.match(/Firefox\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : 'unknown'
  } else if (uaLower.includes('safari') && !uaLower.includes('chrome')) {
    browser = 'safari'
    const match = ua.match(/Version\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : 'unknown'
  } else if (uaLower.includes('edg')) {
    browser = 'edge'
    const match = ua.match(/Edg\/(\d+\.\d+)/)
    browserVersion = match ? match[1] : 'unknown'
  }

  let os = 'unknown'
  let osVersion = 'unknown'

  if (uaLower.includes('windows')) {
    os = 'windows'
    const match = ua.match(/Windows NT (\d+\.\d+)/)
    osVersion = match ? match[1] : 'unknown'
  } else if (uaLower.includes('mac os')) {
    os = 'macos'
    const match = ua.match(/Mac OS X (\d+[._]\d+)/)
    osVersion = match ? match[1].replace('_', '.') : 'unknown'
  } else if (uaLower.includes('linux')) {
    os = 'linux'
  } else if (uaLower.includes('android')) {
    os = 'android'
    const match = ua.match(/Android (\d+\.\d+)/)
    osVersion = match ? match[1] : 'unknown'
  } else if (uaLower.includes('iphone') || uaLower.includes('ipad')) {
    os = 'ios'
    const match = ua.match(/OS (\d+[._]\d+)/)
    osVersion = match ? match[1].replace('_', '.') : 'unknown'
  }

  return {
    deviceType,
    browser,
    browserVersion,
    os,
    osVersion
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}