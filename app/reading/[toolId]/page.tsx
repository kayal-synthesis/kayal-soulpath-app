'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Share2,
  Sparkles,
  Sun,
  Moon,
  Star,
  TrendingUp,
  Heart,
  Briefcase,
  Loader2,
  User,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  BookmarkCheck,
  Award,
  Compass,
  Zap,
  Feather,
  Gem,
  Crown,
  Infinity,
  Eye,
  Copy,
  Check,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Bell,
  BellOff,
  AlertCircle,
  X,
  Hourglass,
  Timer,
  Watch,
  Sandglass,
  Sunrise,
  Sunset,
  Waves,
  Mountain
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

// Professional timeframe configurations
const timeframeConfig: Record<string, {
  gradient: string,
  accent: string,
  lightBg: string,
  border: string,
  icon: any,
  nextReading: string,
  description: string,
  darkGradient: string,
  darkBg: string
}> = {
  daily: {
    gradient: 'from-amber-600 to-amber-700',
    darkGradient: 'from-amber-500 to-amber-600',
    accent: 'amber',
    lightBg: 'bg-amber-50',
    darkBg: 'bg-amber-950/30',
    border: 'border-amber-200',
    icon: Sun,
    nextReading: 'Tomorrow at sunrise',
    description: 'Your daily guidance and insights'
  },
  weekly: {
    gradient: 'from-blue-600 to-blue-700',
    darkGradient: 'from-blue-500 to-blue-600',
    accent: 'blue',
    lightBg: 'bg-blue-50',
    darkBg: 'bg-blue-950/30',
    border: 'border-blue-200',
    icon: Calendar,
    nextReading: 'Next Sunday at dawn',
    description: 'Weekly patterns and opportunities'
  },
  monthly: {
    gradient: 'from-purple-600 to-purple-700',
    darkGradient: 'from-purple-500 to-purple-600',
    accent: 'purple',
    lightBg: 'bg-purple-50',
    darkBg: 'bg-purple-950/30',
    border: 'border-purple-200',
    icon: Moon,
    nextReading: 'March 1st',
    description: 'Monthly cycles and themes'
  },
  yearly: {
    gradient: 'from-emerald-600 to-emerald-700',
    darkGradient: 'from-emerald-500 to-emerald-600',
    accent: 'emerald',
    lightBg: 'bg-emerald-50',
    darkBg: 'bg-emerald-950/30',
    border: 'border-emerald-200',
    icon: Star,
    nextReading: 'Your birthday',
    description: 'Annual vision and destiny'
  },
  '9-year': {
    gradient: 'from-indigo-600 to-indigo-700',
    darkGradient: 'from-indigo-500 to-indigo-600',
    accent: 'indigo',
    lightBg: 'bg-indigo-50',
    darkBg: 'bg-indigo-950/30',
    border: 'border-indigo-200',
    icon: Infinity,
    nextReading: 'Next cycle',
    description: '9-year destiny cycle'
  },
  'eternal': {
    gradient: 'from-stone-600 to-stone-700',
    darkGradient: 'from-stone-500 to-stone-600',
    accent: 'stone',
    lightBg: 'bg-stone-50',
    darkBg: 'bg-stone-950/30',
    border: 'border-stone-200',
    icon: Hourglass,
    nextReading: 'Timeless wisdom',
    description: 'Eternal perspective and timeless truths'
  },
  // Fallback for tools without a timeframe
  default: {
    gradient: 'from-primary-600 to-primary-700',
    darkGradient: 'from-primary-500 to-primary-600',
    accent: 'primary',
    lightBg: 'bg-primary-50',
    darkBg: 'bg-primary-950/30',
    border: 'border-primary-200',
    icon: Sparkles,
    nextReading: 'Available now',
    description: 'Your personalised reading'
  },
}

const PEAK_HOURS = [
  { time: '06:00', label: 'Dawn (6:00 AM)',      emoji: '🌅' },
  { time: '12:00', label: 'Noon (12:00 PM)',      emoji: '☀️' },
  { time: '18:00', label: 'Dusk (6:00 PM)',       emoji: '🌆' },
  { time: '00:00', label: 'Midnight (12:00 AM)',  emoji: '🌙' },
]

export default function ReadingPage() {
  const params  = useParams()
  const router  = useRouter()
  const { user, hasCompletedOnboarding } = useAnonymousStore()
  const toolId  = params.toolId as string

  const [isLoading,            setIsLoading]            = useState(true)
  const [isSaved,              setIsSaved]              = useState(false)
  const [currentSection,       setCurrentSection]       = useState(0)
  const [copied,               setCopied]               = useState(false)
  const [showShareMenu,        setShowShareMenu]        = useState(false)
  const [darkMode,             setDarkMode]             = useState(false)
  const [notifications,        setNotifications]        = useState({
    enabled: false, peakHours: [] as string[], showSettings: false
  })
  const [showNotificationModal, setShowNotificationModal] = useState(false)

  // ── Find tool across ALL collections ────────────────────
  const tool   = allReadingTools.find(t => t.id === toolId) as any
  const config = tool
    ? (timeframeConfig[(tool as any).timeframe] || timeframeConfig['default'])
    : timeframeConfig['default']

  useEffect(() => {
    const savedDarkMode     = localStorage.getItem('darkMode') === 'true'
    const savedNotifications = localStorage.getItem('notifications')
    setDarkMode(savedDarkMode)
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications))
  }, [])

  useEffect(() => {
    localStorage.setItem('darkMode',       String(darkMode))
    localStorage.setItem('notifications',  JSON.stringify(notifications))
  }, [darkMode, notifications])

  useEffect(() => {
    if (!hasCompletedOnboarding()) router.push('/onboarding/basic')
  }, [hasCompletedOnboarding, router])

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [])

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

  if (!user) {
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
          <h2 className={`text-xl font-serif mb-2 ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>
            Reading Not Found
          </h2>
          <p className={`mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
            The reading you're looking for doesn't exist or hasn't been generated yet.
          </p>
          <Button onClick={() => router.push('/member/dashboard')}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  // ── Eternal Clock specific content ───────────────────────
  const getEternalContent = () => {
    if (tool.id !== 'eternal-clock') return null
    return {
      overview: `Time is not linear — it's a vast, eternal ocean. Your Eternal Clock reading reveals how past, present, and future intertwine in your soul's journey. Unlike standard time readings that focus on specific periods, this reading transcends time itself, showing you the patterns that repeat across lifetimes and the timeless wisdom that awaits you.

Your eternal perspective shows that you are not just living one life, but participating in a grand symphony of existence. The challenges you face now are echoes of lessons from other times, and the joys you experience are ripples from eternal sources.`,
      insights: [
        {
          title: 'Past Echoes',
          content: 'Three significant past life patterns are influencing your present: a life of solitude as a monk, a life of leadership in ancient times, and a life of creative expression. These lifetimes gifted you with wisdom, authority, and artistic sensitivity that you carry forward.'
        },
        {
          title: 'Present Moment',
          content: 'Right now, you stand at a convergence point where multiple timelines meet. The choices you make in this moment ripple forward and backward through your existence. This is why certain decisions feel so weighty — they matter across time.'
        },
        {
          title: 'Future Whispers',
          content: "Your future self is already reaching back to guide you. Pay attention to intuitive nudges and 'coincidences.' They are messages from your future self, helping you navigate toward the timeline where you fulfil your highest purpose."
        }
      ],
      guidance: `To work with eternal time rather than against it:

- Practice being fully present — eternity exists in each moment
- Notice recurring patterns — they are lessons across lifetimes
- Trust your intuition — it's memory from other times
- Release attachment to specific outcomes — many timelines exist
- Honour your ancestors — their wisdom flows through you
- Plant seeds for future generations — your legacy echoes eternally`,
      timeline: `Your eternal timeline reveals these key nexuses:

- Age 33 — A portal to past life memories opens
- Age 42 — You meet someone from another lifetime
- Age 55 — A choice that affects seven generations
- Age 70+ — You become an ancestor guide
- Beyond — Your soul's eternal journey continues`
    }
  }

  const eternalContent = getEternalContent()

  const sections = tool.id === 'eternal-clock' ? [
    { title: 'Eternal Overview',  icon: Infinity,  content: eternalContent?.overview  || tool.sampleContent || 'Your personalised eternal reading is being prepared...' },
    { title: 'Timeless Insights', icon: Sparkles,  content: eternalContent?.insights.map((i: any) => `**${i.title}:** ${i.content}`).join('\n\n') || 'Insights will appear here...' },
    { title: 'Eternal Guidance',  icon: Compass,   content: eternalContent?.guidance  || 'Personalised guidance will be provided here...' },
    { title: 'Timeline Nexus',    icon: Hourglass, content: eternalContent?.timeline  || 'Important nexus points across your eternal timeline will appear here...' },
  ] : [
    { title: 'Overview',  icon: Eye,     content: tool.sampleContent || tool.description || 'Your personalised reading is being prepared...' },
    { title: 'Insights',  icon: Sparkles, content: 'Based on your unique patterns and cosmic alignments, key insights will appear here...' },
    { title: 'Guidance',  icon: Compass,  content: 'Personalised guidance and recommendations will be provided here...' },
    { title: 'Timeline',  icon: Clock,    content: 'Important dates and timing for your reading will appear here...' },
  ]

  const SectionIcon = sections[currentSection].icon

  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-stone-900' : 'bg-stone-50'} flex items-center justify-center`}>
        <div className="text-center max-w-md">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${darkMode ? config.darkGradient : config.gradient} text-white flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg`}>
            {tool.emoji || '✨'}
          </div>
          <h2 className={`text-2xl font-serif mb-2 ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>{tool.name}</h2>
          <p className={`mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>{config.description}</p>
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
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
              <button
                onClick={handleBack}
                className={`flex items-center gap-2 transition-colors ${darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-primary-600'}`}
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back</span>
              </button>
              <div className={`h-6 w-px ${darkMode ? 'bg-stone-700' : 'bg-stone-200'}`} />
              <span className={`text-sm ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                {tool.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'text-stone-500 hover:bg-stone-100'}`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={requestNotificationPermission}
                className={`p-2 rounded-lg transition-colors relative ${notifications.enabled ? darkMode ? 'bg-stone-700 text-amber-400' : 'bg-amber-50 text-amber-600' : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}
              >
                {notifications.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                {notifications.enabled && notifications.peakHours.length > 0 && (
                  <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center ${darkMode ? 'bg-amber-500 text-stone-900' : 'bg-amber-500 text-white'}`}>
                    {notifications.peakHours.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`p-2 rounded-lg transition-colors ${isSaved ? darkMode ? 'bg-stone-700 text-amber-400' : 'bg-primary-50 text-primary-600' : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}
              >
                {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}
                >
                  <Share2 className="w-5 h-5" />
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
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-50 text-stone-600'}`}
                      >
                        <Icon className={`w-4 h-4 ${color}`} />{label}
                      </button>
                    ))}
                    <div className={`my-1 border-t ${darkMode ? 'border-stone-700' : 'border-stone-200'}`} />
                    <button onClick={handleCopyLink}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-50 text-stone-600'}`}
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Modal */}
      <AnimatePresence>
        {showNotificationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <Card className={`p-6 ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-serif ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>
                    Peak Hours Notifications
                  </h3>
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
                      <input
                        type="checkbox"
                        checked={notifications.peakHours.includes(hour.time)}
                        onChange={() => toggleNotification(hour.time)}
                        className="w-5 h-5 rounded accent-primary-600"
                      />
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => { setNotifications(prev => ({ ...prev, enabled: true })); setShowNotificationModal(false) }} className="flex-1">
                    Save Preferences
                  </Button>
                  <Button variant="outline" onClick={() => { setNotifications({ enabled: false, peakHours: [], showSettings: false }); setShowNotificationModal(false) }} className="flex-1">
                    Disable All
                  </Button>
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
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className={`text-2xl font-serif ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>{tool.name}</h1>
                <Badge variant="outline" className={`${darkMode ? 'bg-stone-700 border-stone-600 text-stone-300' : 'bg-primary-50 border-primary-200 text-primary-700'}`}>
                  {tool.timeframe ? `${tool.timeframe} reading` : 'personalised reading'}
                </Badge>
              </div>
              <p className={darkMode ? 'text-stone-400' : 'text-stone-500'}>{config.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
                <div className={`flex items-center gap-1.5 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                  <User className="w-4 h-4" />
                  <span>{user.name}</span>
                </div>
                <div className={`flex items-center gap-1.5 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                  <Clock className="w-4 h-4" />
                  <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className={`p-4 sticky top-24 transition-colors ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${darkMode ? 'text-stone-400' : 'text-stone-400'}`}>Sections</h3>
              <nav className="space-y-1">
                {sections.map((section, index) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentSection(index)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentSection === index
                          ? darkMode ? 'bg-primary-950/50 text-primary-300' : 'bg-primary-50 text-primary-700 font-medium'
                          : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${currentSection === index ? darkMode ? 'text-primary-400' : 'text-primary-600' : 'text-stone-400'}`} />
                      <span>{section.title}</span>
                    </button>
                  )
                })}
              </nav>

              <div className={`mt-6 pt-4 border-t ${darkMode ? 'border-stone-700' : 'border-stone-200'}`}>
                <div className={`p-3 rounded-lg ${darkMode ? config.darkBg : config.lightBg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${darkMode ? config.darkGradient : config.gradient} text-white flex items-center justify-center`}>
                      {(() => { const Icon = config.icon; return <Icon className="w-4 h-4" /> })()}
                    </div>
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>Next reading</p>
                      <p className={`text-sm font-medium ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>{config.nextReading}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`w-full justify-center ${darkMode ? 'bg-stone-800 border-stone-600 text-stone-300' : 'bg-white'}`}>
                    Active
                  </Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <Card className={`p-6 transition-colors ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
              <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${darkMode ? 'border-stone-700' : 'border-stone-200'}`}>
                <div className={`w-10 h-10 rounded-lg ${darkMode ? config.darkBg : config.lightBg} flex items-center justify-center`}>
                  <SectionIcon className={`w-5 h-5 ${darkMode ? 'text-primary-400' : 'text-primary-600'}`} />
                </div>
                <div>
                  <h2 className={`text-xl font-serif ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>{sections[currentSection].title}</h2>
                  <p className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>{tool.name}</p>
                </div>
              </div>

              <div className="prose max-w-none">
                <div className={`leading-relaxed whitespace-pre-line ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                  {sections[currentSection].content}
                </div>

                {currentSection === 0 && tool.sampleContent && tool.id !== 'eternal-clock' && (
                  <div className="mt-8 space-y-4">
                    <h3 className={`text-lg font-serif ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>Key Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { icon: Sparkles, label: 'Cosmic Alignment', text: 'The stars align favourably for new beginnings.' },
                        { icon: TrendingUp, label: 'Opportunity',    text: 'An unexpected opportunity presents itself soon.' },
                      ].map(({ icon: Icon, label, text }) => (
                        <div key={label} className={`p-4 rounded-lg ${darkMode ? 'bg-stone-700/50' : 'bg-stone-50'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-4 h-4 text-primary-500" />
                            <span className={`font-medium ${darkMode ? 'text-stone-200' : 'text-stone-700'}`}>{label}</span>
                          </div>
                          <p className={`text-sm ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentSection === 1 && tool.id === 'eternal-clock' && eternalContent?.insights && (
                  <div className="mt-8 space-y-6">
                    {eternalContent.insights.map((insight: any, index: number) => (
                      <div key={index} className={`p-5 rounded-lg ${darkMode ? 'bg-stone-700/50' : 'bg-stone-50'}`}>
                        <h3 className={`text-md font-serif mb-2 flex items-center gap-2 ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>
                          {index === 0 && <Hourglass className="w-4 h-4" />}
                          {index === 1 && <Timer className="w-4 h-4" />}
                          {index === 2 && <Watch className="w-4 h-4" />}
                          {insight.title}
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>{insight.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`flex items-center justify-between mt-8 pt-6 border-t ${darkMode ? 'border-stone-700' : 'border-stone-200'}`}>
                <button
                  onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
                  disabled={currentSection === 0}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-primary-600'}`}
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className={`text-sm ${darkMode ? 'text-stone-500' : 'text-stone-400'}`}>
                  Section {currentSection + 1} of {sections.length}
                </span>
                <button
                  onClick={() => setCurrentSection(prev => Math.min(sections.length - 1, prev + 1))}
                  disabled={currentSection === sections.length - 1}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-primary-600'}`}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </Card>
          </div>
        </div>

        {/* Related readings */}
        <div className="mt-8">
          <h3 className={`text-sm font-medium uppercase tracking-wider mb-4 ${darkMode ? 'text-stone-400' : 'text-stone-400'}`}>
            Explore Other Timeframes
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {timeKeeperTools
              .filter(t => t.id !== tool.id)
              .slice(0, 4)
              .map((otherTool: any) => {
                const otherConfig = timeframeConfig[otherTool.timeframe] || timeframeConfig['default']
                return (
                  <button key={otherTool.id} onClick={() => router.push(`/reading/${otherTool.id}`)} className="group text-left">
                    <Card className={`p-4 transition-all hover:shadow-md ${darkMode ? 'bg-stone-800 border-stone-700 hover:border-stone-600' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${darkMode ? otherConfig.darkGradient : otherConfig.gradient} text-white flex items-center justify-center text-xl`}>
                          {otherTool.emoji}
                        </div>
                        <div>
                          <h4 className={`font-serif text-sm transition-colors ${darkMode ? 'text-stone-300 group-hover:text-stone-200' : 'text-stone-800 group-hover:text-primary-600'}`}>
                            {otherTool.name}
                          </h4>
                          <p className={`text-xs capitalize ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                            {otherTool.timeframe}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </button>
                )
              })}
          </div>
        </div>

      </main>
    </div>
  )
}