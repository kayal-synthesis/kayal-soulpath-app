import { NextRequest, NextResponse } from 'next/server'

// app/ref/[code]/route.ts
//
// The single entry point for every shared affiliate link
// (https://affiliate.kayalsoulpath.com/ref/{code}). A click here can turn
// into either a purchase (ref_code lands on the purchases row) or a new
// affiliate signing up themselves (recruited_by lands on their user row),
// and since it is the same link for both, this handler's only job is to
// remember the code for 60 days, matching the commission window already
// established in the register page's terms, then send the visitor on to
// browse normally. It does not redirect straight to registration, since
// most people clicking a shared link are there to buy something, not to
// become an affiliate themselves.

const COOKIE_NAME     = 'kayal_ref'
const COOKIE_MAX_AGE  = 60 * 60 * 24 * 60 // 60 days in seconds

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } },
) {
  const code    = params.code?.trim()
  const homeUrl = new URL('/', request.url)

  if (!code) {
    return NextResponse.redirect(homeUrl)
  }

  const response = NextResponse.redirect(homeUrl)
  response.cookies.set(COOKIE_NAME, code, {
    maxAge:   COOKIE_MAX_AGE,
    path:     '/',
    sameSite: 'lax',
    secure:   true,
    // Not httpOnly: the purchase page and register page both need to read
    // this from client-side JS to include it explicitly in what they send
    // to the backend, the same pattern already used for the device id,
    // rather than relying on the cookie being implicitly forwarded across
    // what may be different domains (the main app vs. this affiliate
    // subdomain).
  })

  return response
}
