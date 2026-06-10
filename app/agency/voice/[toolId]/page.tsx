'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  Trash2,
  Calendar,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Coffee,
  Brain,
  Zap,
  Droplet,
  Wind,
  Feather,
  Compass,
  Infinity
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
  timestamp: Date
  audioUrl?: string
  isPlaying?: boolean
  isLiked?: boolean
  waveform?: number[]
}

interface Oracle {
  id: string
  name: string
  title: string
  icon: any
  color: string
  bg: string
  gradient: string
  description: string
  longDescription: string
  voiceStyle: string
  specialties: string[]
  questions: string[]
}

export default function VoiceToolPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { user } = useUserStore()
  const toolId = params.toolId as string

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isPlaying, setIsPlaying] = useState<string | null>(null)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [conversationCount, setConversationCount] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()

  // Get tool data
  const tool = getToolById(toolId)

  // Oracle definitions for all 10 voice tools
  const oracles: Record<string, Oracle> = {
    'the-seer-voice': {
      id: 'the-seer-voice',
      name: '🔮 THE SEER',
      title: 'The All-Knowing Oracle',
      icon: Gem,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      gradient: 'from-purple-500 to-indigo-600',
      description: 'The ultimate oracle that knows everything about your past, present, and future',
      longDescription: 'I have witnessed your journey across all lifetimes. I see the hidden patterns, the unspoken truths, and every possible future that awaits you. Ask me anything, and I will reveal what you need to know.',
      voiceStyle: 'Ancient, wise, timeless',
      specialties: ['Past lives', 'Future visions', 'Life purpose', 'Karmic patterns'],
      questions: [
        'Who was I in my past lives?',
        'What is my true life purpose?',
        'Show me my most important future path',
        'What karmic patterns am I repeating?',
        'Tell me something I need to know'
      ]
    },
    'heart-oracle': {
      id: 'heart-oracle',
      name: '💞 The Heart Oracle',
      title: 'Keeper of Emotional Wisdom',
      icon: Heart,
      color: 'text-rose-600',
      bg: 'bg-rose-100',
      gradient: 'from-rose-500 to-pink-600',
      description: 'Your personal relationship confidant who knows every pattern of your heart',
      longDescription: 'I remember every love you\'ve ever had, every heartbreak you\'ve survived, and every soulmate waiting to meet you. Your heart is safe with me.',
      voiceStyle: 'Warm, empathetic, nurturing',
      specialties: ['Relationship advice', 'Heart healing', 'Soulmate timing', 'Past life loves'],
      questions: [
        'Will I find my soulmate?',
        'Why do I keep attracting the same type?',
        'Help me heal from this breakup',
        'Is my current relationship meant to last?',
        'What should I know about love right now?'
      ]
    },
    'prosperity-oracle': {
      id: 'prosperity-oracle',
      name: '💼 The Prosperity Oracle',
      title: 'Guardian of Abundance',
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      gradient: 'from-blue-500 to-indigo-600',
      description: 'Your money mentor who guides every financial decision',
      longDescription: 'I have watched fortunes rise and fall across your lifetimes. I know exactly when money will flow to you and what blocks are standing in your way.',
      voiceStyle: 'Confident, wise, encouraging',
      specialties: ['Wealth windows', 'Investment timing', 'Money blocks', 'Abundance mindset'],
      questions: [
        'When will my next wealth window open?',
        'Why do I struggle with money?',
        'Is this investment right for me?',
        'How can I attract more abundance?',
        'What is my true wealth potential?'
      ]
    },
    'summit-oracle': {
      id: 'summit-oracle',
      name: '📈 The Summit Oracle',
      title: 'Architect of Professional Destiny',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      gradient: 'from-emerald-500 to-green-600',
      description: 'Your executive coach who knows your professional destiny',
      longDescription: 'I see the peaks you are meant to climb. Every career move, every promotion, every pivot is visible to me. Let me guide you to your summit.',
      voiceStyle: 'Clear, direct, inspiring',
      specialties: ['Career path', 'Promotion timing', 'Leadership', 'Work relationships'],
      questions: [
        'Am I on the right career path?',
        'When should I ask for a promotion?',
        'Should I take this job offer?',
        'How do I handle my difficult boss?',
        'What is my true professional calling?'
      ]
    },
    'mystic-oracle': {
      id: 'mystic-oracle',
      name: '🌙 The Mystic Oracle',
      title: 'Keeper of Sacred Wisdom',
      icon: Sparkles,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      gradient: 'from-purple-500 to-violet-600',
      description: 'Your soul guide through the depths of spirit',
      longDescription: 'I have walked with you through every lifetime. I know the spiritual gifts you carry and the awakening that awaits you.',
      voiceStyle: 'Ethereal, gentle, profound',
      specialties: ['Soul purpose', 'Spiritual gifts', 'Past lives', 'Spirit guides'],
      questions: [
        'What is my soul purpose?',
        'What spiritual gifts do I have?',
        'Tell me about my past lives',
        'How can I connect with my spirit guides?',
        'What stage of awakening am I in?'
      ]
    },
    'vitality-oracle': {
      id: 'vitality-oracle',
      name: '⚡ The Vitality Oracle',
      title: 'Guardian of Body Wisdom',
      icon: Activity,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
      gradient: 'from-teal-500 to-cyan-600',
      description: 'Your wellness whisperer who knows your body\'s language',
      longDescription: 'I hear every whisper of your body. I know when you need rest, when you need movement, and what your body is trying to tell you.',
      voiceStyle: 'Calm, soothing, knowledgeable',
      specialties: ['Energy forecast', 'Sleep guidance', 'Nutrition', 'Healing'],
      questions: [
        'How will my energy be today?',
        'Help me sleep better tonight',
        'What should I eat for my body type?',
        'Should I rest or exercise today?',
        'What is my body trying to tell me?'
      ]
    },
    'destiny-oracle': {
      id: 'destiny-oracle',
      name: '🌟 The Destiny Oracle',
      title: 'Chronicler of the Soul\'s Journey',
      icon: Star,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      gradient: 'from-amber-500 to-orange-600',
      description: 'Your life narrator who sees the full arc of your existence',
      longDescription: 'I hold the complete record of your soul\'s journey. Every life path number, every pinnacle, every challenge is known to me.',
      voiceStyle: 'Ancient, wise, timeless',
      specialties: ['Life path', 'Pinnacles', 'Karmic debts', 'Destiny'],
      questions: [
        'Tell me about my life path number',
        'What pinnacle am I in right now?',
        'What are my karmic debts?',
        'Why do I keep facing the same challenges?',
        'What is my ultimate destiny?'
      ]
    },
    'daily-companion': {
      id: 'daily-companion',
      name: '🎙️ The Daily Companion',
      title: 'Your Constant Friend',
      icon: MessageCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      gradient: 'from-orange-500 to-amber-600',
      description: 'Your always-there friend for daily conversation',
      longDescription: 'I am here for you every day, every moment. No judgment, no expectations - just a friend who truly listens and remembers everything.',
      voiceStyle: 'Warm, caring, playful',
      specialties: ['Daily check-ins', 'Emotional support', 'Goal tracking', 'Journaling'],
      questions: [
        'How should I approach today?',
        'I need someone to talk to',
        'Help me process my feelings',
        'How am I doing on my goals?',
        'What should I reflect on tonight?'
      ]
    },
    'voice-of-time': {
      id: 'voice-of-time',
      name: '🔮 The Voice of Time',
      title: 'Speaker of What\'s to Come',
      icon: Clock,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      gradient: 'from-indigo-500 to-purple-600',
      description: 'Your personal seer who speaks the future',
      longDescription: 'I see the threads of time unfolding. Ask me about any moment - today, tomorrow, next year - and I will tell you what waits there.',
      voiceStyle: 'Mysterious, clear, precise',
      specialties: ['Daily forecast', 'Weekly preview', 'Monthly outlook', 'Life timing'],
      questions: [
        'What does today hold for me?',
        'Tell me about my week ahead',
        'What\'s coming next month?',
        'When will I meet my soulmate?',
        'What is the best time for my next move?'
      ]
    },
    'conversation-starter': {
      id: 'conversation-starter',
      name: '🗣️ The Conversation Starter',
      title: 'Keeper of Quick Wisdom',
      icon: MessageCircle,
      color: 'text-fuchsia-600',
      bg: 'bg-fuchsia-100',
      gradient: 'from-fuchsia-500 to-pink-600',
      description: 'Quick voice answers to your daily questions',
      longDescription: 'I am here for the small moments - the quick questions, the gentle guidance, the daily wisdom you need right now.',
      voiceStyle: 'Warm, approachable, concise',
      specialties: ['Quick answers', 'Daily guidance', 'Small decisions', 'Gentle wisdom'],
      questions: [
        'Is now a good time to text them?',
        'Should I buy this today?',
        'How should I handle this meeting?',
        'Why am I feeling this way?',
        'What should I focus on right now?'
      ]
    }
  }

  const oracle = oracles[toolId] || oracles['the-seer-voice']
  const Icon = oracle.icon

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    // Add welcome message from oracle
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        content: `I am ${oracle.name}. ${oracle.longDescription} What would you like to explore today?`,
        sender: 'oracle',
        timestamp: new Date(),
        waveform: [0.2, 0.5, 0.8, 1.0, 0.9, 0.7, 0.4, 0.1, 0.3, 0.6, 0.9, 0.7, 0.4, 0.2]
      }
      setMessages([welcomeMessage])
    }
  }, [oracle])

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
        setConversationCount(prev => prev + 1)
        
        // Simulate oracle response
        setIsTyping(true)
        setTimeout(() => {
          const responses = [
            `I hear you, and I understand. ${oracle.specialties[Math.floor(Math.random() * oracle.specialties.length)]} is showing in your energy.`,
            `The wisdom you seek is already within you. Let me help you see it clearly.`,
            `I see patterns emerging in your path. Would you like me to reveal them?`,
            `Your question touches on something important. Here's what I see...`,
            `The universe is aligning to support you in this question.`
          ]
          const oracleMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: responses[Math.floor(Math.random() * responses.length)],
            sender: 'oracle',
            timestamp: new Date(),
            waveform: [0.3, 0.6, 0.9, 1.0, 0.8, 0.5, 0.2, 0.4, 0.7, 1.0, 0.8, 0.5, 0.3, 0.1]
          }
          setMessages(prev => [...prev, oracleMessage])
          setIsTyping(false)
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
    setConversationCount(prev => prev + 1)

    // Simulate oracle response
    setTimeout(() => {
      const responses = [
        `I see your question clearly. ${oracle.specialties[Math.floor(Math.random() * oracle.specialties.length)]} holds the key.`,
        `The answer is written in your stars. Let me read it to you...`,
        `I perceive the truth you're seeking. It relates to patterns from your past.`,
        `This question touches your soul's deepest knowing. Here's what I see...`,
        `The universe is responding to your inquiry. Be open to the signs.`
      ]
      const oracleMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        sender: 'oracle',
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
      // Simulate playback
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

  if (!oracle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-serif mb-4">Oracle Not Found</h1>
          <p className="text-neutral-600 mb-6">The oracle you're looking for doesn't exist.</p>
          <Link href="/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-white">
      {/* Header */}
      <div className={`bg-gradient-to-r ${oracle.gradient} text-white sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/domain/oracle-agency`}>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Agency
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                className="text-white hover:bg-white/20"
              >
                {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFavorite(!isFavorite)}
                className="text-white hover:bg-white/20"
              >
                <Star className={`w-5 h-5 ${isFavorite ? 'fill-yellow-300 text-yellow-300' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInfo(!showInfo)}
                className="text-white hover:bg-white/20"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Oracle Info */}
          <div className="flex items-center gap-6 mt-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Icon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-serif mb-1">{oracle.name}</h1>
              <p className="text-white/90 text-lg mb-2">{oracle.title}</p>
              <div className="flex items-center gap-4 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <Headphones className="w-4 h-4" />
                  {oracle.voiceStyle}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {conversationCount} conversations
                </span>
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-6 p-6 bg-white/10 backdrop-blur rounded-xl">
                  <p className="text-white/90 mb-4">{oracle.longDescription}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-white mb-2">Specialties</h3>
                      <ul className="space-y-1">
                        {oracle.specialties.map((s, i) => (
                          <li key={i} className="text-sm text-white/80 flex items-center gap-2">
                            <span className="w-1 h-1 bg-white rounded-full" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium text-white mb-2">Try Asking</h3>
                      <ul className="space-y-1">
                        {oracle.questions.slice(0, 3).map((q, i) => (
                          <li key={i} className="text-sm text-white/80 italic">
                            "{q}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Suggested Questions */}
        {messages.length === 1 && (
          <Card className="mb-8 p-6">
            <h3 className="text-lg font-serif mb-4">Try asking {oracle.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {oracle.questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="p-4 text-left bg-neutral-50 hover:bg-primary-50 border border-neutral-200 hover:border-primary-300 rounded-xl transition group"
                >
                  <p className="text-sm text-neutral-700 group-hover:text-primary-700">{q}</p>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Messages */}
        <div className="space-y-6 mb-8">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                {message.sender === 'oracle' && (
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 ${oracle.bg} rounded-full flex items-center justify-center shadow-md`}>
                      <Icon className={`w-5 h-5 ${oracle.color}`} />
                    </div>
                  </div>
                )}

                {/* Message Bubble */}
                <div>
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
                                  backgroundColor: message.sender === 'user' ? 'white' : oracle.color.replace('text-', 'bg-')
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
                  <div className={`flex items-center gap-2 mt-1 px-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                          title={`Conversation with ${oracle.name}`}
                          text={message.content}
                          url={`/agency/voice/${toolId}?message=${message.id}`}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className={`w-10 h-10 ${oracle.bg} rounded-full flex items-center justify-center shadow-md`}>
                <Icon className={`w-5 h-5 ${oracle.color}`} />
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
          <Card className="mb-4 p-4 bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-700">Recording voice message...</span>
                <span className="text-sm text-red-600">{formatTime(recordingTime)}</span>
              </div>
              <div className="flex items-center gap-4">
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
          </Card>
        )}

        {/* Input Area */}
        <Card className="p-4">
          <div className="flex gap-3">
            <div className="flex-1 bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendText()}
                placeholder={`Ask ${oracle.name} anything...`}
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
            Tap the microphone to speak • Type to chat • {oracle.name} remembers everything
          </p>
        </Card>

        {/* Session Info */}
        <div className="mt-4 text-center text-xs text-neutral-400">
          <span>Conversation #{conversationCount + 1} with {oracle.name}</span>
          <span className="mx-2">•</span>
          <span>{messages.length} messages</span>
          <span className="mx-2">•</span>
          <button 
            onClick={() => {
              setMessages([messages[0]])
              setConversationCount(0)
              toast.success('Conversation reset')
            }}
            className="text-primary-600 hover:underline"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}