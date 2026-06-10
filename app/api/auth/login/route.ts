import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // TODO: Add your actual authentication logic here
    // This is a mock implementation
    if (email && password) {
      const user = {
        id: 'usr_' + Date.now(),
        email,
        name: email.split('@')[0],
        createdAt: new Date().toISOString()
      }

      // Set session cookie
      cookies().set('session', JSON.stringify(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      })

      return NextResponse.json(user)
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