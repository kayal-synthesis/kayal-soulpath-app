import { NextResponse } from 'next/server'

// ✅ Export named function for POST method
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, dob } = body

    // TODO: Add your actual registration logic here
    // This is a mock implementation
    if (email && password) {
      return NextResponse.json({
        id: 'usr_' + Date.now(),
        email,
        name: name || email.split('@')[0],
        dob,
        createdAt: new Date().toISOString()
      })
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}

// Optional: Add other methods if needed
// export async function GET() {}
// export async function PUT() {}
// export async function DELETE() {}