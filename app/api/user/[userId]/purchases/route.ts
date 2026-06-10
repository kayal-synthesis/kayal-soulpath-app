import { NextRequest, NextResponse } from 'next/server'

// Mock database - replace with your actual database
// This would typically come from PostgreSQL, MongoDB, etc.
const userPurchases: Record<string, any[]> = {
  // Example user - you would get this from your database
  'user_123': [
    { 
      id: 'the-love-saga', 
      name: 'The Love Saga', 
      emoji: '💞', 
      type: 'sacred-script',
      status: 'active', 
      lastUsed: 'Today', 
      sessions: 3, 
      color: 'pink',
      purchaseDate: 'Mar 4, 2026',
      destination: 'chat'
    },
    { 
      id: 'the-prophets-voice', 
      name: 'Prophet\'s Voice', 
      emoji: '🎤', 
      type: 'voice',
      status: 'active', 
      lastUsed: 'Yesterday', 
      sessions: 5, 
      color: 'purple',
      purchaseDate: 'Mar 1, 2026',
      destination: 'audio'
    },
    { 
      id: 'eternal-clock', 
      name: 'Eternal Clock', 
      emoji: '⏳', 
      type: 'time-keeper',
      status: 'active', 
      lastUsed: '2 days ago', 
      sessions: 2, 
      color: 'stone',
      purchaseDate: 'Feb 28, 2026',
      destination: 'reading'
    }
  ]
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId
  
  // In a real app, you would:
  // 1. Verify the user is authenticated
  // 2. Fetch from your database
  // 3. Return the data
  
  // For demo purposes, return mock data
  // Replace this with your actual database query
  const tools = userPurchases[userId] || []
  
  return NextResponse.json({ tools })
}

// Optional: POST endpoint to add a new purchase
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    const body = await request.json()
    
    // In a real app, you would:
    // 1. Verify the user is authenticated
    // 2. Save to your database
    // 3. Return success
    
    // For demo purposes, just return success
    return NextResponse.json({ success: true })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add purchase' },
      { status: 500 }
    )
  }
}