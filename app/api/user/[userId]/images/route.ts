import { NextResponse } from 'next/server'
import { authOptions } from '@/auth'
import { db } from '@/lib/db' // Your database connection

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.id !== params.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query your database for user's images
    // This is a mock - replace with your actual database query
    const images = {
      palm: {
        url: '/images/palm.jpg',
        thumbnail: '/images/palm-thumb.jpg',
        uploadedAt: new Date().toISOString(),
        hand: 'right' as const
      },
      face: {
        url: '/images/face.jpg',
        thumbnail: '/images/face-thumb.jpg',
        uploadedAt: new Date().toISOString(),
        angle: 'front' as const
      }
    }

    return NextResponse.json(images)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    )
  }
}