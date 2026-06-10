'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Mic, 
  MicOff, 
  Volume2, 
  PhoneOff, 
  Loader2,
  ArrowLeft, 
  Headphones, 
  Radio, 
  History
} from 'lucide-react'

// ============================================
// SIMPLE TOOL PROFILES
// ============================================

const toolProfiles: Record<string, any> = {
  'the-prophets-voice': {
    name: 'The Prophet\'s Voice',
    emoji: '👑',
    color: 'purple',
    greeting: 'I am the Ancient One. Your soul speaks through time itself.'
  },
  'the-hearts-echo': {
    name: 'The Heart\'s Echo',
    emoji: '💞',
    color: 'pink',
    greeting: 'Beloved seeker, your heart speaks volumes. Let me listen.'
  },
  'the-wealth-whisperer': {
    name: 'The Wealth Whisperer',
    emoji: '💰',
    color: 'emerald',
    greeting: 'I hear the call of abundance in your voice.'
  }
}

// ============================================
// SIMPLE TEXT-TO-SPEECH
// ============================================

const speakText = (text: string, onEnd?: () => void) => {
  if (!window.speechSynthesis) return
  
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.9
  utterance.pitch = 1
  utterance.onend = onEnd || null
  window.speechSynthesis.speak(utterance)
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AudioPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAnonymousStore()
  const toolId = params.toolId as string
  
  const profile = toolProfiles[toolId] || toolProfiles['the-prophets-voice']
  
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [duration, setDuration] = useState(0)
  const [messages, setMessages] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isConnected) {
      interval = setInterval(() => setDuration(prev => prev + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isConnected])

  const startSession = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setIsConnected(true)
      
      const welcomeMsg = {
        id: Date.now(),
        role: 'assistant',
        text: profile.greeting,
        time: new Date().toLocaleTimeString()
      }
      setMessages([welcomeMsg])
      setIsSpeaking(true)
      speakText(profile.greeting, () => setIsSpeaking(false))
    } catch (error) {
      console.error('Microphone access denied')
    }
  }

  const endSession = () => {
    window.speechSynthesis?.cancel()
    setIsConnected(false)
    setIsSpeaking(false)
    setDuration(0)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 text-center max-w-sm">
          <h2 className="text-xl font-serif mb-2">Session Not Found</h2>
          <Button onClick={() => router.push('/domain/voice-of-prophecy')}>
            Return
          </Button>
        </Card>
      </div>
    )
  }

  const getBgColor = () => {
    switch(profile.color) {
      case 'purple': return 'from-purple-900 to-indigo-900'
      case 'pink': return 'from-rose-900 to-pink-900'
      case 'emerald': return 'from-emerald-900 to-teal-900'
      default: return 'from-slate-900 to-slate-800'
    }
  }

  const getAccentColor = () => {
    switch(profile.color) {
      case 'purple': return 'text-purple-400 bg-purple-500/20'
      case 'pink': return 'text-pink-400 bg-pink-500/20'
      case 'emerald': return 'text-emerald-400 bg-emerald-500/20'
      default: return 'text-white bg-white/10'
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getBgColor()}`}>
      {/* Simple Header */}
      <div className="border-b border-white/10 bg-black/20">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => isConnected ? endSession() : router.push('/domain/voice-of-prophecy')}
              className="flex items-center gap-2 text-white/70 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">{isConnected ? 'End' : 'Back'}</span>
            </button>

            <div className="flex items-center gap-4">
              <span className="text-2xl">{profile.emoji}</span>
              <span className="text-white font-medium hidden sm:inline">{profile.name}</span>

              {isConnected && (
                <>
                  <span className="text-sm text-white/70">{formatTime(duration)}</span>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                  >
                    <History className="w-4 h-4 text-white/70" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-12">
        {!isConnected ? (
          /* Start Screen */
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center text-5xl">
              {profile.emoji}
            </div>
            <h1 className="text-2xl font-serif text-white mb-2">{profile.name}</h1>
            <p className="text-white/60 mb-8">Live voice conversation</p>
            
            <Button
              onClick={startSession}
              className="bg-white text-slate-900 hover:bg-white/90 px-8 py-4 rounded-xl text-lg"
            >
              <Headphones className="w-5 h-5 mr-2" />
              Start Session
            </Button>
          </div>
        ) : (
          /* Live Session */
          <div className="space-y-6">
            {/* Main Interface */}
            <Card className="bg-white/10 backdrop-blur border-white/20 p-6">
              <div className="text-center">
                {/* Status Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 ${getAccentColor()}`}>
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span className="text-xs font-medium">Live</span>
                </div>
                
                {/* Avatar */}
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <div className={`absolute inset-0 bg-${profile.color}-500/20 rounded-full blur-xl`} />
                  <div className="relative w-full h-full bg-white/10 rounded-full flex items-center justify-center text-4xl">
                    {profile.emoji}
                  </div>
                </div>
                
                {/* Status */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-white/30'}`} />
                  <span className="text-white/70 text-sm">
                    {isSpeaking ? 'Speaking' : isMuted ? 'Muted' : 'Listening'}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition ${
                      isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={endSession}
                    className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>

                  <div className="p-4 rounded-full bg-white/10 text-white/50 cursor-not-allowed">
                    <Volume2 className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Simple Transcript */}
            <Card className="bg-white/5 backdrop-blur border-white/10 p-4 max-h-48 overflow-y-auto">
              <h3 className="text-xs font-medium text-white/50 mb-2">Transcript</h3>
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <span className={msg.role === 'assistant' ? 'text-purple-400' : 'text-green-400'}>
                      {msg.role === 'assistant' ? '→ ' : '← '}
                    </span>
                    <span className="text-white/80">{msg.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* History Sidebar */}
        {showHistory && (
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900 shadow-xl border-l border-white/10 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">History</h3>
              <button onClick={() => setShowHistory(false)} className="text-white/50 hover:text-white">
                ✕
              </button>
            </div>
            {messages.length === 0 ? (
              <p className="text-white/40 text-sm">No messages yet</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="mb-3 p-2 bg-white/5 rounded">
                  <p className="text-xs text-white/50">{msg.time}</p>
                  <p className="text-sm text-white/90">{msg.text}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}