import { api } from './client'

export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: string
  audioUrl?: string
}

export interface ChatResponse {
  message: string
  audioUrl?: string
  context?: any
}

export const chatApi = {
  /**
   * Send a message to the AI assistant
   */
  sendMessage: async (message: string, userId: string, audioFile?: File): Promise<ChatResponse> => {
    const formData = new FormData()
    formData.append('message', message)
    formData.append('userId', userId)
    
    if (audioFile) {
      formData.append('audio', audioFile)
    }

    const response = await api.post('/api/chat', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Get chat history for a user
   */
  getHistory: async (userId: string, limit: number = 50): Promise<{ messages: ChatMessage[] }> => {
    const response = await api.get('/api/chat/history', {
      params: { userId, limit }
    })
    return response.data
  },

  /**
   * Stream a response (for real-time)
   */
  streamResponse: async (message: string, userId: string, onChunk: (chunk: string) => void) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('kayal_token')}`,
      },
      body: JSON.stringify({ message, userId }),
    })

    if (!response.body) return

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      onChunk(chunk)
    }
  },

  /**
   * Send voice message for transcription and response
   */
  sendVoiceMessage: async (audioBlob: Blob, userId: string): Promise<ChatResponse> => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('userId', userId)

    const response = await api.post('/api/chat/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Clear chat history
   */
  clearHistory: async (userId: string): Promise<{ success: boolean }> => {
    const response = await api.delete('/api/chat/history', {
      data: { userId }
    })
    return response.data
  }
}