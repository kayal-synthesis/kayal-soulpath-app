import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query('SELECT id, email, name, role, "createdAt" FROM users LIMIT 10')
    return NextResponse.json({ users: result.rows })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name } = body

    const result = await query(
      `INSERT INTO users (id, email, name) 
       VALUES (gen_random_uuid(), $1, $2) 
       RETURNING id, email, name, "createdAt"`,
      [email, name]
    )

    return NextResponse.json({ user: result.rows[0] })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}