'use client'
export const dynamic = 'force-dynamic'
export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic, 
  MicOff, 
  Send, 
  Play, 
  Pause, 
  Square,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Share2,
  ThumbsUp,
  Heart,
  Briefcase,
  TrendingUp,
  Sparkles,
  Activity,
  Star,
  Gem,
  Clock,
  MessageCircle,
  Headphones,
  Waves,
  X,
  Loader2,
  ArrowLeft,
  MoreVertical,
  Download,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { ShareButton } from '@/components/ui/ShareButton'
import { toast } from 'sonner'
import { useUserStore } from '@/lib/store/userStore'
import { getToolById } from '@/lib/constants/tools'

interface Message {
  id: string
  content: string
  sender: 'user' | 'oracle'
  oracleId?: string
  timestamp: Date
  audioUrl?: string
  isPlaying?: boolean
  isLiked?: boolean
  waveform?: number[]
}

interface Oracle {
  id: string
  name: string
  icon: any
  color: string
  bg: string
  description: string
}

export default function AgencyChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const toolId = searchParams.get('tool')
  const { user } = useUserStore()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: "Hello, I'm your Oracle. I know your past, present, and future. What would you like to explore today?",
      sender: 'oracle',
      oracleId: toolId || 'the-seer-voice',
      timestamp: new Date(),
      waveform: [0.2, 0.5, 0.8, 1.0, 0.9, 0.7, 0.4, 0.1, 0.3, 0.6, 0.9, 0.7, 0.4, 0.2]
    }
  ])
  
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isPlaying, setIsPlaying] = useState<string | null>(null)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [selectedOracle, setSelectedOracle] = useState<string>(toolId || 'the-seer-voice')
  const [showOracleSelector, setShowOracleSelector] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()

  // All 10 oracles from THE ORACLE AGENCY
  const oracles: Oracle[] = [
    { 
      id: 'the-seer-voice', 
      name: '🔮 THE SEER', 
      icon: Gem, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100',
      description: 'The all-knowing oracle - past, present, future'
    },
    { 
      id: 'heart-oracle', 
      name: '💞 The Heart Oracle', 
      icon: Heart, 
      color: 'text-rose-600', 
      bg: 'bg-rose-100',
      description: 'Love & relationships'
    },
    { 
      id: 'prosperity-oracle', 
      name: '💼 The Prosperity Oracle', 
      icon: Briefcase, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100',
      description: 'Wealth & money'
    },
    { 
      id: 'summit-oracle', 
      name: '📈 The Summit Oracle', 
      icon: TrendingUp, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-100',
      description: 'Career & purpose'
    },
    { 
      id: 'mystic-oracle', 
      name: '🌙 The Mystic Oracle', 
      icon: Sparkles, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100',
      description: 'Spiritual growth'
    },
    { 
      id: 'vitality-oracle', 
      name: '⚡ The Vitality Oracle', 
      icon: Activity, 
      color: 'text-teal-600', 
      bg: 'bg-teal-100',
      description: 'Health & wellness'
    },
    { 
      id: 'destiny-oracle', 
      name: '🌟 The Destiny Oracle', 
      icon: Star, 
      color: 'text-amber-600', 
      bg: 'bg-amber-100',
      description: 'Life path & purpose'
    },
    { 
      id: 'daily-companion', 
      name: '🎙️ The Daily Companion', 
      icon: MessageCircle, 
      color: 'text-orange-600', 
      bg: 'bg-orange-100',
      description: 'Your constant friend'
    },
    { 
      id: 'voice-of-time', 
      name: '🔮 The Voice of Time', 
      icon: Clock, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-100',
      description: 'Forecasts & timing'
    },
    { 
      id: 'conversation-starter', 
      name: '🗣️ The Conversation Starter', 
      icon: MessageCircle, 
      color: 'text-fuchsia-600', 
      bg: 'bg-fuchsia-100',
      description: 'Quick answers'
    }
  ]

  const currentOracle = oracles.find(o => o.id === selectedOracle) || oracles[0]
  const Icon = currentOracle.icon

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Clean up audio recording
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Setup audio visualization
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      
      const updateLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = Array.from(dataArray).reduce((a, b) => a + b, 0) / dataArray.length
          setAudioLevel(average / 128)
          animationFrameRef.current = requestAnimationFrame(updateLevel)
        }
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        
        // Add voice message to chat
        const voiceMessage: Message = {
          id: Date.now().toString(),
          content: '🎤 Voice message',
          sender: 'user',
          timestamp: new Date(),
          audioUrl: url,
          waveform: [0.2, 0.5, 0.8, 1.0, 0.9, 0.7, 0.4, 0.1, 0.3, 0.6, 0.9, 0.7, 0.4, 0.2]
        }
        setMessages(prev => [...prev, voiceMessage])
        
        // Simulate oracle response
        setTimeout(() => {
          const oracleMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: "I hear your voice. The energy in your words tells me you're seeking clarity about something important. What would you like to know?",
            sender: 'oracle',
            oracleId: selectedOracle,
            timestamp: new Date(),
            waveform: [0.3, 0.6, 0.9, 1.0, 0.8, 0.5, 0.2, 0.4, 0.7, 1.0, 0.8, 0.5, 0.3, 0.1]
          }
          setMessages(prev => [...prev, oracleMessage])
        }, 2000)
        
        stream.getTracks().forEach(track => track.stop())
        cancelAnimationFrame(animationFrameRef.current!)
        setAudioLevel(0)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      updateLevel()
      
      const startTime = Date.now()
      const timer = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      
      return () => clearInterval(timer)
      
    } catch (error) {
      console.error('Error accessing microphone:', error)
      toast.error('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setRecordingTime(0)
    }
  }

  const handleSendText = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate oracle typing and response
    setTimeout(() => {
      const responses = [
        "I see your path clearly. The energy around you right now suggests you're at a threshold of transformation.",
        "Your heart line shows deep capacity for love. Someone from your past may be re-entering your life.",
        "The stars align for you this week. Watch for opportunities on Thursday.",
        "Your wealth window opens in 3 months. Prepare now for what's coming.",
        "I sense you're carrying something heavy. Would you like to talk about it?",
        "The patterns in your life are not random. They're guiding you toward your destiny.",
        "Your soul has lived through this before. That's why you recognize the feeling."
      ]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      const oracleMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: randomResponse,
        sender: 'oracle',
        oracleId: selectedOracle,
        timestamp: new Date(),
        waveform: [0.2, 0.5, 0.8, 1.0, 0.9, 0.7, 0.4, 0.1, 0.3, 0.6, 0.9, 0.7, 0.4, 0.2]
      }
      setMessages(prev => [...prev, oracleMessage])
      setIsTyping(false)
    }, 1500)
  }

  const togglePlayback = (messageId: string, audioUrl?: string) => {
    if (!audioUrl) return
    
    if (isPlaying === messageId) {
      setIsPlaying(null)
    } else {
      setIsPlaying(messageId)
      // Implement actual audio playback here
      setTimeout(() => setIsPlaying(null), 5000)
    }
  }

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    toast.success('Message copied')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const likeMessage = (id: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, isLiked: !msg.isLiked } : msg
    ))
    toast.success('Thanks for your feedback!')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Oracle Selector Sidebar */}
      <AnimatePresence>
        {showOracleSelector && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            className="w-80 bg-white border-r border-neutral-200 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-serif">Choose Oracle</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowOracleSelector(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {oracles.map((oracle) => {
                  const OracleIcon = oracle.icon
                  const isSelected = selectedOracle === oracle.id
                  return (
                    <button
                      key={oracle.id}
                      onClick={() => {
                        setSelectedOracle(oracle.id)
                        setShowOracleSelector(false)
                        // Add system message about oracle change
                        const systemMessage: Message = {
                          id: Date.now().toString(),
                          content: `You are now speaking with ${oracle.name}. ${oracle.description}`,
                          sender: 'oracle',
                          oracleId: oracle.id,
                          timestamp: new Date()
                        }
                        setMessages(prev => [...prev, systemMessage])
                      }}
                      className={`w-full p-4 rounded-xl transition-all ${
                        isSelected 
                          ? 'bg-gradient-to-r from-primary-50 to-secondary-50 border-2 border-primary-200' 
                          : 'hover:bg-neutral-50 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${oracle.bg} rounded-full flex items-center justify-center`}>
                          <OracleIcon className={`w-5 h-5 ${oracle.color}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{oracle.name}</p>
                          <p className="text-xs text-neutral-500">{oracle.description}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowOracleSelector(!showOracleSelector)}
              className="lg:hidden"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
            
            <div className="relative">
              <div className={`w-12 h-12 ${currentOracle.bg} rounded-2xl flex items-center justify-center shadow-lg`}>
                <Icon className={`w-6 h-6 ${currentOracle.color}`} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            
            <div>
              <h1 className="text-xl font-serif font-semibold">{currentOracle.name}</h1>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500">●</span>
                <span className="text-neutral-600">{currentOracle.description}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className={isAudioEnabled ? 'text-primary-600' : ''}
            >
              {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          <AnimatePresence>
            {messages.map((message, index) => {
              const messageOracle = oracles.find(o => o.id === message.oracleId)
              const OracleIcon = messageOracle?.icon || currentOracle.icon
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    {message.sender === 'oracle' && (
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 ${messageOracle?.bg || currentOracle.bg} rounded-full flex items-center justify-center shadow-md`}>
                          <OracleIcon className={`w-5 h-5 ${messageOracle?.color || currentOracle.color}`} />
                        </div>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={`space-y-1 ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-2xl p-4 ${
                          message.sender === 'user'
                            ? 'bg-primary-600 text-white rounded-tr-none'
                            : 'bg-white border border-neutral-200 rounded-tl-none shadow-sm'
                        }`}
                      >
                        {/* Voice Message */}
                        {message.audioUrl && message.waveform ? (
                          <div className="w-64 space-y-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => togglePlayback(message.id, message.audioUrl)}
                                className="p-2 hover:bg-black/5 rounded-full transition"
                              >
                                {isPlaying === message.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex-1 flex items-center gap-0.5 h-8">
                                {message.waveform.map((value, i) => (
                                  <div
                                    key={i}
                                    className="flex-1 bg-current rounded-full"
                                    style={{
                                      height: `${value * 32}px`,
                                      opacity: isPlaying === message.id ? 1 : 0.5,
                                      backgroundColor: message.sender === 'user' ? 'white' : 'currentColor'
                                    }}
                                  />
                                ))}
                              </div>
                              <span className="text-xs opacity-70">0:15</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>

                      {/* Message Footer */}
                      <div className={`flex items-center gap-2 px-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-neutral-400">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        {message.sender === 'oracle' && (
                          <>
                            <button
                              onClick={() => likeMessage(message.id)}
                              className="p-1 hover:bg-neutral-100 rounded transition"
                            >
                              <ThumbsUp className={`w-3 h-3 ${message.isLiked ? 'fill-primary-600 text-primary-600' : 'text-neutral-400'}`} />
                            </button>
                            
                            <button
                              onClick={() => copyMessage(message.content, message.id)}
                              className="p-1 hover:bg-neutral-100 rounded transition"
                            >
                              {copiedId === message.id ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3 text-neutral-400" />
                              )}
                            </button>
                            
                            <ShareButton
                              title={`Chat with ${currentOracle.name}`}
                              text={message.content}
                              url={`/agency/chat?message=${message.id}`}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className={`w-10 h-10 ${currentOracle.bg} rounded-full flex items-center justify-center shadow-md`}>
                <Icon className={`w-5 h-5 ${currentOracle.color}`} />
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl rounded-tl-none p-4 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-700">Recording voice message...</span>
                <span className="text-sm text-red-600">{formatTime(recordingTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 h-6">
                  {[...Array(30)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full"
                      style={{
                        height: `${Math.max(4, audioLevel * 24 * (Math.sin(i * 0.5) * 0.5 + 0.5))}px`,
                        opacity: 0.3 + (audioLevel * 0.7)
                      }}
                    />
                  ))}
                </div>
                <Button size="sm" variant="destructive" onClick={stopRecording}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t border-neutral-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendText()}
                  placeholder={`Ask ${currentOracle.name} anything...`}
                  rows={1}
                  className="w-full px-5 py-4 bg-transparent border-0 focus:ring-0 resize-none max-h-32"
                  style={{ minHeight: '56px' }}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={isRecording ? 'destructive' : 'outline'}
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  className="relative"
                >
                  {isRecording ? (
                    <Square className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>

                <Button
                  onClick={handleSendText}
                  disabled={!input.trim()}
                  className="px-6"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>

            <p className="text-xs text-neutral-400 mt-3 text-center">
              Tap the microphone to speak • Type to chat • Your oracle remembers everything
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}