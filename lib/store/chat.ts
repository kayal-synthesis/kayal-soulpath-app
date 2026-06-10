// lib/types/chat.ts
export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  context?: {
    type: 'insight' | 'report' | 'compatibility' | 'daily'
    data: any
    confidence?: number
  }
  attachments?: {
    type: 'image' | 'report' | 'link'
    url: string
    thumbnail?: string
  }[]
  reactions?: {
    likes: number
    userLiked: boolean
    saves: number
  }
  metadata?: {
    tokens?: number
    processingTime?: number
    model?: string
  }
}

export interface ChatSession {
  id: string
  userId: string
  startedAt: Date
  lastMessageAt: Date
  messageCount: number
  topics: string[]
  sentiment?: 'positive' | 'neutral' | 'negative'
}

export interface SuggestedQuestion {
  id: string
  text: string
  category: 'love' | 'career' | 'spiritual' | 'health' | 'general' | 'numerology' | 'palmistry'
  context?: string
  popularity?: number
  icon?: string
}

export interface ChatContext {
  userProfile: {
    name: string
    dob: string
    lifePath?: number
    soulUrge?: number
  }
  recentInsights?: any[]
  currentMood?: string
  timeContext: {
    hour: number
    day: number
    month: number
    personalDay?: number
  }
}