export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error'
  context?: {
    type: 'insight' | 'report' | 'compatibility' | 'daily'
    data: any
    confidence?: number
  }
  attachments?: ChatAttachment[]
  reactions?: ChatReaction[]
  replyTo?: {
    id: string
    content: string
    sender: string
  }
}

export interface ChatAttachment {
  id: string
  type: 'image' | 'report' | 'link' | 'file'
  url: string
  name: string
  size?: number
  thumbnail?: string
  metadata?: any
}

export interface ChatReaction {
  emoji: string
  count: number
  users: string[]
  userReacted?: boolean
}

export interface ChatSession {
  id: string
  userId: string
  startedAt: Date
  lastMessageAt: Date
  messageCount: number
  topics: ChatTopic[]
  sentiment?: 'positive' | 'neutral' | 'negative'
  tags: string[]
  isActive: boolean
}

export interface ChatTopic {
  name: string
  confidence: number
  messages: string[]
}

export interface SuggestedQuestion {
  id: string
  text: string
  category: 'love' | 'career' | 'spiritual' | 'health' | 'general' | 'numerology' | 'palmistry'
  context?: string
  popularity?: number
  icon?: string
  keywords: string[]
}

export interface ChatContext {
  userProfile: {
    id: string
    name: string
    dob: string
    lifePath?: number
    soulUrge?: number
    personality?: string
  }
  recentInsights?: any[]
  currentMood?: string
  timeContext: {
    hour: number
    day: number
    month: number
    personalDay?: number
    season?: string
  }
  previousMessages: ChatMessage[]
}

export interface AIResponse {
  id: string
  content: string
  confidence: number
  suggestions?: string[]
  actions?: AIAction[]
  metadata: {
    model: string
    processingTime: number
    tokens: number
    contextUsed: string[]
  }
}

export interface AIAction {
  type: 'generate_report' | 'check_compatibility' | 'show_insight' | 'recommend'
  label: string
  data: any
}