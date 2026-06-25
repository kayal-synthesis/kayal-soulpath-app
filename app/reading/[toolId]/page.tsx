'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Calendar, Clock, Share2, Sparkles, Sun, Moon, Star,
  TrendingUp, Loader2, User, ChevronRight, ChevronLeft, Bookmark,
  BookmarkCheck, Compass, Infinity, Eye, Copy, Check,
  Facebook, Twitter, Linkedin, Mail, Bell, BellOff, X, Hourglass,
  Timer, Watch, AlertCircle, Download, Play, Pause, Volume2, VolumeX,
} from 'lucide-react'

import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { omniTools }         from '@/lib/constants/omni-seer-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'
import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'

const allReadingTools = [
  ...timeKeeperTools, ...omniTools, ...voiceTools, ...loveTools,
  ...wealthTools, ...wellnessTools, ...lifePathTools, ...sacredScriptTools,
]

const timeframeConfig: Record<string, {
  gradient: string, accent: string, lightBg: string, border: string,
  icon: any, nextReading: string, description: string,
  darkGradient: string, darkBg: string
}> = {
  daily: {
    gradient: 'from-amber-600 to-amber-700', darkGradient: 'from-amber-500 to-amber-600',
    accent: 'amber', lightBg: 'bg-amber-50', darkBg: 'bg-amber-950/30', border: 'border-amber-200',
    icon: Sun, nextReading: 'Tomorrow at sunrise', description: 'Your daily guidance and insights'
  },
  weekly: {
    gradient: 'from-blue-600 to-blue-700', darkGradient: 'from-blue-500 to-blue-600',
    accent: 'blue', lightBg: 'bg-blue-50', darkBg: 'bg-blue-950/30', border: 'border-blue-200',
    icon: Calendar, nextReading: 'Next Sunday at dawn', description: 'Weekly patterns and opportunities'
  },
  monthly: {
    gradient: 'from-purple-600 to-purple-700', darkGradient: 'from-purple-500 to-purple-600',
    accent: 'purple', lightBg: 'bg-purple-50', darkBg: 'bg-purple-950/30', border: 'border-purple-200',
    icon: Moon, nextReading: 'Next month', description: 'Monthly cycles and themes'
  },
  yearly: {
    gradient: 'from-emerald-600 to-emerald-700', darkGradient: 'from-emerald-500 to-emerald-600',
    accent: 'emerald', lightBg: 'bg-emerald-50', darkBg: 'bg-emerald-950/30', border: 'border-emerald-200',
    icon: Star, nextReading: 'Your birthday', description: 'Annual vision and destiny'
  },
  '9-year': {
    gradient: 'from-indigo-600 to-indigo-700', darkGradient: 'from-indigo-500 to-indigo-600',
    accent: 'indigo', lightBg: 'bg-indigo-50', darkBg: 'bg-indigo-950/30', border: 'border-indigo-200',
    icon: Infinity, nextReading: 'Next cycle', description: '9-year destiny cycle'
  },
  eternal: {
    gradient: 'from-stone-600 to-stone-700', darkGradient: 'from-stone-500 to-stone-600',
    accent: 'stone', lightBg: 'bg-stone-50', darkBg: 'bg-stone-950/30', border: 'border-stone-200',
    icon: Hourglass, nextReading: 'Timeless wisdom', description: 'Eternal perspective and timeless truths'
  },
  default: {
    gradient: 'from-primary-600 to-primary-700', darkGradient: 'from-primary-500 to-primary-600',
    accent: 'primary', lightBg: 'bg-primary-50', darkBg: 'bg-primary-950/30', border: 'border-primary-200',
    icon: Sparkles, nextReading: 'Available now', description: 'Your personalised reading'
  },
}

const PEAK_HOURS = [
  { time: '06:00', label: 'Dawn (6:00 AM)',     emoji: '🌅' },
  { time: '12:00', label: 'Noon (12:00 PM)',     emoji: '☀️' },
  { time: '18:00', label: 'Dusk (6:00 PM)',      emoji: '🌆' },
  { time: '00:00', label: 'Midnight (12:00 AM)', emoji: '🌙' },
]

export default function ReadingPage() {
  const params       = useParams()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { user, hasCompletedOnboarding } = useAnonymousStore()
  const supabase     = createClient()
  const toolId       = params.toolId as string

  const [pageLoading,           setPageLoading]           = useState(true)
  const [isSaved,               setIsSaved]               = useState(false)
  const [currentSection,        setCurrentSection]        = useState(0)
  const [copied,                setCopied]                = useState(false)
  const [showShareMenu,         setShowShareMenu]         = useState(false)
  const [darkMode,              setDarkMode]              = useState(false)
  const [notifications,         setNotifications]         = useState({
    enabled: false, peakHours: [] as string[], showSettings: false
  })
  const [showNotificationModal, setShowNotificationModal] = useState(false)

  // Reading state
  const [jobId,          setJobId]          = useState<string | null>(searchParams.get('job'))
  const [readingStatus,  setReadingStatus]  = useState<'loading' | 'pending' | 'completed' | 'failed'>('loading')
  const [readingContent, setReadingContent] = useState<any>(null)
  const [pollCount,      setPollCount]      = useState(0)

  // Audio state
  const [isPlaying,    setIsPlaying]    = useState(false)
  const [isMuted,      setIsMuted]      = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const speechRef      = useRef<SpeechSynthesisUtterance | null>(null)
  const utteranceRef   = useRef<SpeechSynthesisUtterance | null>(null)

  const tool   = allReadingTools.find(t => t.id === toolId) as any
  const config = tool
    ? (timeframeConfig[(tool as any).timeframe] || timeframeConfig['default'])
    : timeframeConfig['default']

  useEffect(() => {
    const savedDarkMode      = localStorage.getItem('darkMode') === 'true'
    const savedNotifications = localStorage.getItem('notifications')
    setDarkMode(savedDarkMode)
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications))
  }, [])

  useEffect(() => {
    localStorage.setItem('darkMode',      String(darkMode))
    localStorage.setItem('notifications', JSON.stringify(notifications))
  }, [darkMode, notifications])

  useEffect(() => {
    if (!hasCompletedOnboarding()) router.push('/onboarding/basic')
  }, [hasCompletedOnboarding, router])

  // ── Load job_id from purchase if not in URL ──────────────
  useEffect(() => {
    const loadJobId = async () => {
      if (jobId) { setPageLoading(false); return }
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setPageLoading(false); return }
      const { data: purchase } = await supabase
        .from('purchases')
        .select('job_id')
        .eq('user_id', authUser.id)
        .eq('tool_id', toolId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (purchase?.job_id) setJobId(purchase.job_id)
      setPageLoading(false)
    }
    loadJobId()
  }, [toolId])

  // ── Poll reading result ──────────────────────────────────
  useEffect(() => {
    if (!jobId || pageLoading) return
    let cancelled = false

    const fetchResult = async () => {
      try {
        const res  = await fetch(`/api/reading/result/${jobId}`)
        const data = await res.json()
        if (cancelled) return
        if (data.status === 'completed' && data.content) {
          setReadingContent(data.content)
          setReadingStatus('completed')
        } else if (data.status === 'failed') {
          setReadingStatus('failed')
        } else {
          setReadingStatus('pending')
          setPollCount(c => c + 1)
        }
      } catch {
        if (!cancelled) setReadingStatus('failed')
      }
    }

    fetchResult()
    const interval = setInterval(() => {
      if (readingStatus !== 'completed' && readingStatus !== 'failed') fetchResult()
    }, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [jobId, pageLoading])

  // ── Stop audio on unmount ────────────────────────────────
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel() }
  }, [])

  // ── Build sections from real backend content ─────────────
  const buildSections = () => {
    if (!readingContent) return [
      { title: 'Overview',   icon: Eye,      content: tool?.description || 'Your personalised reading is being prepared...' },
      { title: 'Insights',   icon: Sparkles, content: 'Key insights will appear here once your reading is ready...' },
      { title: 'Guidance',   icon: Compass,  content: 'Personalised guidance will be provided here...' },
      { title: 'Numerology', icon: Star,     content: 'Your numerology breakdown will appear here...' },
    ]

    const sections: { title: string; icon: any; content: string }[] = []

    // ── 1. Main narrative reading ──────────────────────────
    if (readingContent.reading) {
      sections.push({ title: 'Your Reading', icon: Eye, content: readingContent.reading })
    }

    // ── 2. Numerology breakdown ────────────────────────────
    if (readingContent.numerology) {
      const num      = readingContent.numerology
      const core     = num.core         || {}
      const cycles   = num.time_cycles  || {}
      const pinnacle = num.pinnacles?.current || {}
      const debts    = num.karmic_debts || []

      let content = '── Core Numbers ──\n\n'
      if (core.life_path)    content += `Life Path:      ${core.life_path}\n`
      if (core.destiny)      content += `Destiny Number: ${core.destiny}\n`
      if (core.soul_urge)    content += `Soul Urge:      ${core.soul_urge}\n`
      if (core.personality)  content += `Personality:    ${core.personality}\n`
      if (core.birthday_gift) content += `Birthday Gift:  ${core.birthday_gift}\n`

      content += '\n── Current Time Cycles ──\n\n'
      if (cycles.personal_year)  content += `Personal Year:  ${cycles.personal_year}\n`
      if (cycles.personal_month) content += `Personal Month: ${cycles.personal_month}\n`
      if (cycles.personal_week)  content += `Personal Week:  ${cycles.personal_week}\n`
      if (cycles.personal_day)   content += `Personal Day:   ${cycles.personal_day}\n`

      if (pinnacle.number) {
        content += `\n── Current Pinnacle ──\n\n`
        content += `Pinnacle ${pinnacle.number} (Ages ${pinnacle.start_age}–${pinnacle.end_age || 'onwards'})\n`
        content += `${pinnacle.theme}\n`
        if (pinnacle.challenge) content += `Challenge Number: ${pinnacle.challenge}\n`
      }

      if (debts.length > 0) {
        content += `\n── Karmic Debts ──\n\n`
        debts.forEach((d: any) => { content += `• ${d.lesson}\n\n` })
      }

      sections.push({ title: 'Numerology', icon: Star, content: content.trim() })
    }

    // ── 3. Astrology breakdown ─────────────────────────────
    if (readingContent.astrology?.planets) {
      const planets = Object.values(readingContent.astrology.planets) as any[]

      const positive   = planets.filter((p: any) => p.tone === 'strongly_positive' || p.tone === 'positive')
      const challenging = planets.filter((p: any) => p.tone === 'challenging')

      let content = '── Favourable Alignments ──\n\n'
      positive.forEach((p: any) => { if (p.reading) content += `✦ ${p.reading}\n\n` })

      if (challenging.length > 0) {
        content += '── Growth Areas ──\n\n'
        challenging.forEach((p: any) => { if (p.reading) content += `◈ ${p.reading}\n\n` })
      }

      sections.push({ title: 'Astrology', icon: Sparkles, content: content.trim() })
    }

    // ── 4. Pipeline notes / warnings ──────────────────────
    if (readingContent.warnings?.length > 0 || readingContent.note) {
      let content = ''
      if (readingContent.note) content += `${readingContent.note}\n\n`
      if (readingContent.warnings?.length > 0) {
        content += 'System Notes:\n'
        readingContent.warnings.forEach((w: string) => { content += `• ${w}\n` })
      }
      sections.push({ title: 'Notes', icon: Compass, content: content.trim() })
    }

    if (sections.length === 0) {
      sections.push({ title: 'Reading', icon: Eye, content: 'Your reading content is being processed...' })
    }

    return sections
  }

  const sections    = buildSections()
  const SectionIcon = sections[currentSection]?.icon || Eye

  // ── Full reading text for audio & download ───────────────
  const getFullText = () => {
    if (!readingContent) return ''
    return sections.map(s => `${s.title}.\n\n${s.content}`).join('\n\n---\n\n')
  }

  // ── Audio playback using Web Speech API ──────────────────
  const handlePlayPause = () => {
    if (!window.speechSynthesis) {
      alert('Audio playback is not supported in this browser.')
      return
    }

    if (isPlaying) {
      window.speechSynthesis.pause()
      setIsPlaying(false)
      return
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setIsPlaying(true)
      return
    }

    window.speechSynthesis.cancel()
    const text = sections[currentSection]?.content || getFullText()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate   = 0.85
    utterance.pitch  = 1.0
    utterance.volume = isMuted ? 0 : 1

    // Pick a pleasant voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Karen') ||
      v.name.includes('Google UK') || v.name.includes('Female')
    )
    if (preferred) utterance.voice = preferred

    utterance.onend   = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setIsPlaying(true)
  }

  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
    if (utteranceRef.current) utteranceRef.current.volume = isMuted ? 1 : 0
  }

  const handleStopAudio = () => {
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
  }

  // ── Download reading as text file ────────────────────────
  const handleDownload = () => {
    const text = [
      `KAYAL LifeOS — ${tool?.name || 'Reading'}`,
      `Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      `For: ${user?.name || 'Seeker'}`,
      `\n${'─'.repeat(60)}\n`,
      getFullText(),
      `\n${'─'.repeat(60)}`,
      `© ${new Date().getFullYear()} KAYAL SoulPath Institute`,
      `app.kayalsoulpath.com`,
    ].join('\n')

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `KAYAL-${tool?.name?.replace(/\s+/g, '-') || 'Reading'}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBack = () => router.back()

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = (platform: string) => {
    const url   = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(`${tool?.name} Reading on KAYAL LifeOS`)
    const text  = encodeURIComponent(`Check out my reading from KAYAL LifeOS!`)
    let shareUrl = ''
    switch (platform) {
      case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`; break
      case 'twitter':  shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`; break
      case 'linkedin': shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`; break
      case 'email':    shareUrl = `mailto:?subject=${title}&body=${text}%0A%0A${url}`; break
    }
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
    setShowShareMenu(false)
  }

  const toggleNotification = (peakHour: string) => {
    setNotifications(prev => ({
      ...prev,
      peakHours: prev.peakHours.includes(peakHour)
        ? prev.peakHours.filter(h => h !== peakHour)
        : [...prev.peakHours, peakHour]
    }))
  }

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) { alert('This browser does not support notifications'); return }
    if (Notification.permission === 'granted') {
      setNotifications(prev => ({ ...prev, enabled: true }))
      setShowNotificationModal(true)
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotifications(prev => ({ ...prev, enabled: true }))
        setShowNotificationModal(true)
      }
    }
  }

  if (!user || pageLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-stone-900' : 'bg-stone-50'}`}>
        <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-stone-400' : 'text-primary-600'}`} />
      </div>
    )
  }

  if (!tool) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-stone-900' : 'bg-stone-50'}`}>
        <Card className={`p-8 text-center max-w-md ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h2 className={`text-xl font-serif mb-2 ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>Reading Not Found</h2>
          <p className={`mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
            The reading you're looking for doesn't exist or hasn't been generated yet.
          </p>
          <Button onClick={() => router.push('/member/dashboard')}>Back to Dashboard</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-stone-900 text-stone-200' : 'bg-stone-50 text-stone-800'}`}>

      {/* Header */}
      <header className={`sticky top-0 z-10 transition-colors duration-300 ${darkMode ? 'bg-stone-800/95 border-stone-700' : 'bg-white border-stone-200'} border-b backdrop-blur-sm`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={handleBack} className={`flex items-center gap-2 transition-colors ${darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-primary-600'}`}>
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back</span>
              </button>
              <div className={`h-6 w-px ${darkMode ? 'bg-stone-700' : 'bg-stone-200'}`} />
              <span className={`text-sm truncate max-w-[160px] ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>{tool.name}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Audio controls */}
              {readingContent && (
                <>
                  <button onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Listen to reading'}
                    className={`p-2 rounded-lg transition-colors ${isPlaying ? darkMode ? 'bg-primary-900 text-primary-300' : 'bg-primary-100 text-primary-700' : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button onClick={handleMuteToggle} title={isMuted ? 'Unmute' : 'Mute'}
                    className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button onClick={handleDownload} title="Download reading"
                    className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                    <Download className="w-4 h-4" />
                  </button>
                </>
              )}

              <button onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'text-stone-500 hover:bg-stone-100'}`}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button onClick={requestNotificationPermission}
                className={`p-2 rounded-lg transition-colors relative ${notifications.enabled ? darkMode ? 'bg-stone-700 text-amber-400' : 'bg-amber-50 text-amber-600' : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                {notifications.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                {notifications.enabled && notifications.peakHours.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white rounded-full text-[9px] flex items-center justify-center">
                    {notifications.peakHours.length}
                  </span>
                )}
              </button>

              <button onClick={() => setIsSaved(!isSaved)}
                className={`p-2 rounded-lg transition-colors ${isSaved ? darkMode ? 'bg-stone-700 text-amber-400' : 'bg-primary-50 text-primary-600' : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>

              <div className="relative">
                <button onClick={() => setShowShareMenu(!showShareMenu)}
                  className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                  <Share2 className="w-4 h-4" />
                </button>
                {showShareMenu && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border py-1 z-20 ${darkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'}`}>
                    {[
                      { platform: 'facebook', icon: Facebook, label: 'Facebook',  color: 'text-blue-600'  },
                      { platform: 'twitter',  icon: Twitter,  label: 'Twitter',   color: 'text-sky-500'   },
                      { platform: 'linkedin', icon: Linkedin, label: 'LinkedIn',  color: 'text-blue-700'  },
                      { platform: 'email',    icon: Mail,     label: 'Email',     color: 'text-stone-600' },
                    ].map(({ platform, icon: Icon, label, color }) => (
                      <button key={platform} onClick={() => handleShare(platform)}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-50 text-stone-600'}`}>
                        <Icon className={`w-4 h-4 ${color}`} />{label}
                      </button>
                    ))}
                    <div className={`my-1 border-t ${darkMode ? 'border-stone-700' : 'border-stone-200'}`} />
                    <button onClick={handleCopyLink}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-50 text-stone-600'}`}>
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy link'}
                    </button>
                    <button onClick={handleDownload}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-50 text-stone-600'}`}>
                      <Download className="w-4 h-4" /> Download (.txt)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Audio playing banner */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-primary-600 text-white px-4 py-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-medium">Reading aloud: {sections[currentSection]?.title}</span>
            </div>
            <button onClick={handleStopAudio} className="text-white/80 hover:text-white text-xs underline">
              Stop
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {showNotificationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md">
              <Card className={`p-6 ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-serif ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>Peak Hours Notifications</h3>
                  <button onClick={() => setShowNotificationModal(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-stone-700' : 'hover:bg-stone-100'}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className={`text-sm mb-4 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                  Choose when you'd like to receive notifications for your {tool.name} readings.
                </p>
                <div className="space-y-3 mb-6">
                  {PEAK_HOURS.map((hour) => (
                    <label key={hour.time} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${darkMode ? 'hover:bg-stone-700' : 'hover:bg-stone-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{hour.emoji}</span>
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-stone-200' : 'text-stone-700'}`}>{hour.label}</p>
                          <p className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>Peak cosmic energy</p>
                        </div>
                      </div>
                      <input type="checkbox" checked={notifications.peakHours.includes(hour.time)} onChange={() => toggleNotification(hour.time)} className="w-5 h-5 rounded accent-primary-600" />
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => { setNotifications(prev => ({ ...prev, enabled: true })); setShowNotificationModal(false) }} className="flex-1">Save Preferences</Button>
                  <Button variant="outline" onClick={() => { setNotifications({ enabled: false, peakHours: [], showSettings: false }); setShowNotificationModal(false) }} className="flex-1">Disable All</Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tool header */}
        <Card className={`p-6 mb-6 transition-colors ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
          <div className="flex items-start gap-5">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${darkMode ? config.darkGradient : config.gradient} text-white flex items-center justify-center text-3xl shadow-md flex-shrink-0`}>
              {tool.emoji || '✨'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className={`text-2xl font-serif ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>{tool.name}</h1>
                <Badge variant="outline" className={`${darkMode ? 'bg-stone-700 border-stone-600 text-stone-300' : 'bg-primary-50 border-primary-200 text-primary-700'}`}>
                  {readingContent ? '✅ Ready' : readingStatus === 'pending' ? '⏳ Generating...' : 'Personalised Reading'}
                </Badge>
              </div>
              {readingContent?.note && (
                <p className={`text-sm italic mt-1 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                  {readingContent.note}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
                <div className={`flex items-center gap-1.5 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                  <User className="w-4 h-4" /><span>{user.name}</span>
                </div>
                <div className={`flex items-center gap-1.5 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                  <Clock className="w-4 h-4" />
                  <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Audio + Download action bar */}
              {readingContent && (
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <button onClick={handlePlayPause}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isPlaying
                        ? 'bg-primary-600 text-white'
                        : darkMode ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                    }`}>
                    {isPlaying ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Listen</>}
                  </button>
                  <button onClick={handleDownload}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      darkMode ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}>
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Pending state */}
        {readingStatus === 'pending' && (
          <Card className={`p-8 mb-6 text-center ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            </div>
            <h3 className={`text-lg font-serif mb-2 ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>
              Your reading is being generated
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              Our AI oracle is preparing your personalised {tool.name} reading. This usually takes 2–5 minutes.
            </p>
            <div className="flex justify-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" style={{ animationDelay: '200ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
            <p className={`text-xs ${darkMode ? 'text-stone-500' : 'text-stone-400'}`}>
              Auto-refreshing every 5 seconds... ({pollCount} checks)
            </p>
          </Card>
        )}

        {/* Failed state */}
        {readingStatus === 'failed' && (
          <Card className={`p-8 mb-6 text-center ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className={`text-lg font-serif mb-2 ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>
              Reading generation failed
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              Something went wrong. Please contact support@kayalsoulpath.com with your job ID: <code className="bg-neutral-100 px-1 rounded text-xs">{jobId}</code>
            </p>
            <Button onClick={() => router.push('/member/dashboard')} variant="outline">Back to Dashboard</Button>
          </Card>
        )}

        {/* Reading content grid */}
        {(readingStatus === 'completed' || readingStatus === 'loading') && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className={`p-4 sticky top-24 transition-colors ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${darkMode ? 'text-stone-400' : 'text-stone-400'}`}>Sections</h3>
                <nav className="space-y-1">
                  {sections.map((section, index) => {
                    const Icon = section.icon
                    return (
                      <button key={index} onClick={() => { setCurrentSection(index); handleStopAudio() }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          currentSection === index
                            ? darkMode ? 'bg-primary-950/50 text-primary-300' : 'bg-primary-50 text-primary-700 font-medium'
                            : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100'
                        }`}>
                        <Icon className={`w-4 h-4 flex-shrink-0 ${currentSection === index ? darkMode ? 'text-primary-400' : 'text-primary-600' : 'text-stone-400'}`} />
                        <span className="truncate">{section.title}</span>
                      </button>
                    )
                  })}
                </nav>

                <div className={`mt-6 pt-4 border-t ${darkMode ? 'border-stone-700' : 'border-stone-200'}`}>
                  <div className={`p-3 rounded-lg ${darkMode ? config.darkBg : config.lightBg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${darkMode ? config.darkGradient : config.gradient} text-white flex items-center justify-center flex-shrink-0`}>
                        {(() => { const Icon = config.icon; return <Icon className="w-4 h-4" /> })()}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>Status</p>
                        <p className={`text-sm font-medium truncate ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                          {readingContent ? 'Ready to read' : 'Generating...'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`w-full justify-center text-xs ${darkMode ? 'bg-stone-800 border-stone-600 text-stone-300' : 'bg-white'}`}>
                      {readingContent ? '✅ Complete' : '⏳ Processing'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {readingContent && (
                    <button onClick={handleDownload}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${darkMode ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>
                      <Download className="w-3.5 h-3.5" /> Download Reading
                    </button>
                  )}
                  <Button variant="outline" fullWidth onClick={() => router.push('/member/dashboard')} className="text-xs">
                    ← My Dashboard
                  </Button>
                </div>
              </Card>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <Card className={`p-6 transition-colors ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
                <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${darkMode ? 'border-stone-700' : 'border-stone-200'}`}>
                  <div className={`w-10 h-10 rounded-lg ${darkMode ? config.darkBg : config.lightBg} flex items-center justify-center flex-shrink-0`}>
                    <SectionIcon className={`w-5 h-5 ${darkMode ? 'text-primary-400' : 'text-primary-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className={`text-xl font-serif ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>
                      {sections[currentSection]?.title}
                    </h2>
                    <p className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>{tool.name}</p>
                  </div>
                  {readingContent && (
                    <button onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Listen to this section'}
                      className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isPlaying ? 'bg-primary-100 text-primary-700' : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-400 hover:bg-stone-100'}`}>
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                <div className={`leading-relaxed whitespace-pre-line text-base ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                  {readingStatus === 'loading' ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`h-4 rounded animate-pulse ${darkMode ? 'bg-stone-700' : 'bg-stone-100'}`} style={{ width: `${90 - i * 8}%` }} />
                      ))}
                    </div>
                  ) : (
                    sections[currentSection]?.content
                  )}
                </div>

                <div className={`flex items-center justify-between mt-8 pt-6 border-t ${darkMode ? 'border-stone-700' : 'border-stone-200'}`}>
                  <button
                    onClick={() => { setCurrentSection(prev => Math.max(0, prev - 1)); handleStopAudio() }}
                    disabled={currentSection === 0}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-primary-600'}`}
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <span className={`text-sm ${darkMode ? 'text-stone-500' : 'text-stone-400'}`}>
                    {currentSection + 1} / {sections.length}
                  </span>
                  <button
                    onClick={() => { setCurrentSection(prev => Math.min(sections.length - 1, prev + 1)); handleStopAudio() }}
                    disabled={currentSection === sections.length - 1}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-primary-600'}`}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}