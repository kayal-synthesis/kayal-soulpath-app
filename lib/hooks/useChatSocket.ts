import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
}

export function useChatSocket(userId?: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!userId) return

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000', {
      query: { userId },
      transports: ['websocket']
    })

    socketRef.current = socket

    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('message', (msg: Message) => setMessages(prev => [...prev, msg]))
    socket.on('typing', (typing: boolean) => setIsTyping(typing))
    socket.on('error', () => toast.error('Chat connection error'))

    return () => { socket.close() }
  }, [userId])

  const sendMessage = (content: string) => {
    if (!socketRef.current || !userId) return
    socketRef.current.emit('message', { userId, content })
  }

  const sendTyping = (typing: boolean) => {
    if (!socketRef.current || !userId) return
    socketRef.current.emit('typing', { userId, typing })
  }

  return { isConnected, messages, isTyping, sendMessage, sendTyping }
}