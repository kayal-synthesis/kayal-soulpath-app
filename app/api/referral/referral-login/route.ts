import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // TODO: Add referral login logic
    if (email && password) {
      return NextResponse.json({
        id: 'ref_' + Date.now(),
        email,
        name: email.split('@')[0],
        referralCode: email.split('@')[0].substring(0, 3).toUpperCase() + Date.now().toString().slice(-4)
      })
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}