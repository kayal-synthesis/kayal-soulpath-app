// app/auth/callback/route.ts
// Handles Supabase auth redirects for magic links and password resets.
// Without this file, clicking any email link from Supabase goes nowhere.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies }      from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://app.kayalsoulpath.com"

  const code      = searchParams.get('code')
  const error     = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')
  const next      = searchParams.get('next') ?? '/member/dashboard'

  if (error) {
    return NextResponse.redirect(
      origin + '/auth/login?error=' + encodeURIComponent(errorDesc || error)
    )
  }

  if (code) {
    const supabase = createClient(cookies())
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        origin + '/auth/login?error=' + encodeURIComponent(exchangeError.message)
      )
    }

    return NextResponse.redirect(origin + next)
  }

  return NextResponse.redirect(origin + '/auth/login')
}