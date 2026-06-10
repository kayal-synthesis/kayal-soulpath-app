export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
}

export interface ChatConversation {
  id: string
  toolId: string
  userId: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  messageCount: number
}

class ChatHistoryService {
  private storageKey = 'kayal-chat-history'

  async getConversations(userId: string, toolId: string): Promise<ChatConversation[]> {
    // In production, this would be an API call
    // For now, using localStorage
    const stored = localStorage.getItem(`${this.storageKey}-${userId}-${toolId}`)
    const conversations: ChatConversation[] = stored ? JSON.parse(stored) : []
    
    // Convert date strings back to Date objects
    return conversations.map(conv => ({
      ...conv,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      messages: conv.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }))
  }

  async getConversation(id: string): Promise<ChatConversation | null> {
    // In production, this would be an API call
    // For now, search all localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.storageKey)) {
        const stored = localStorage.getItem(key)
        if (stored) {
          const conversations: ChatConversation[] = JSON.parse(stored)
          const found = conversations.find(c => c.id === id)
          if (found) {
            return {
              ...found,
              createdAt: new Date(found.createdAt),
              updatedAt: new Date(found.updatedAt),
              messages: found.messages.map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              }))
            }
          }
        }
      }
    }
    return null
  }

  async saveConversation(conversation: ChatConversation): Promise<void> {
    // In production, this would be an API call
    const key = `${this.storageKey}-${conversation.userId}-${conversation.toolId}`
    const existing = await this.getConversations(conversation.userId, conversation.toolId)
    
    const index = existing.findIndex(c => c.id === conversation.id)
    if (index >= 0) {
      existing[index] = conversation
    } else {
      existing.unshift(conversation)
    }
    
    // Keep only last 50 conversations
    const trimmed = existing.slice(0, 50)
    localStorage.setItem(key, JSON.stringify(trimmed))
  }

  async deleteConversation(id: string): Promise<void> {
    // In production, this would be an API call
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.storageKey)) {
        const stored = localStorage.getItem(key)
        if (stored) {
          const conversations: ChatConversation[] = JSON.parse(stored)
          const filtered = conversations.filter(c => c.id !== id)
          localStorage.setItem(key, JSON.stringify(filtered))
        }
      }
    }
  }

  async updateConversationTitle(id: string, title: string): Promise<void> {
    // In production, this would be an API call
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.storageKey)) {
        const stored = localStorage.getItem(key)
        if (stored) {
          const conversations: ChatConversation[] = JSON.parse(stored)
          const index = conversations.findIndex(c => c.id === id)
          if (index >= 0) {
            conversations[index].title = title
            localStorage.setItem(key, JSON.stringify(conversations))
          }
        }
      }
    }
  }

  async clearAllHistory(userId: string, toolId: string): Promise<void> {
    const key = `${this.storageKey}-${userId}-${toolId}`
    localStorage.removeItem(key)
  }
}

export const chatHistoryService = new ChatHistoryService()