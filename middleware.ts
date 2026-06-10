import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect admin routes — redirect to admin login if no session
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = request.cookies.get('sb-auth-token') ?? 
                    request.cookies.get('kayal_auth')
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}