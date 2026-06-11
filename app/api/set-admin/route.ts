// @ts-nocheck
import { NextResponse } from 'next/server'
import { authOptions } from '@/auth'

const prisma = null

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  try {
    const { email } = await request.json()

    const user = await ({} as any).user.update({
      where: { email },
      data: { role: 'admin' }
    })

    return NextResponse.json({ 
      success: true, 
      message: `${email} is now an admin` 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to set admin' }, { status: 500 })
  }
}