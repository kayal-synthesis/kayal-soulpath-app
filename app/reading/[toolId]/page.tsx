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
  ArrowLeft, Clock, Share2, Sparkles, Sun, Moon, Star,
  Loader2, User, ChevronRight, ChevronLeft, Bookmark,
  BookmarkCheck, Compass, Infinity, Eye, Copy, Check,
  Facebook, Twitter, Linkedin, Mail, Bell, BellOff, X, Hourglass,
  Heart, Briefcase, Coins, Leaf, Download, Play, Pause,
  Volume2, VolumeX, AlertCircle, Calendar,
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
  icon: any, description: string, darkGradient: string, darkBg: string
}> = {
  daily:   { gradient: 'from-amber-600 to-amber-700',   darkGradient: 'from-amber-500 to-amber-600',   accent: 'amber',   lightBg: 'bg-amber-50',   darkBg: 'bg-amber-950/30',   border: 'border-amber-200',   icon: Sun,      description: 'Your daily guidance and insights'          },
  weekly:  { gradient: 'from-blue-600 to-blue-700',     darkGradient: 'from-blue-500 to-blue-600',     accent: 'blue',    lightBg: 'bg-blue-50',    darkBg: 'bg-blue-950/30',    border: 'border-blue-200',    icon: Calendar, description: 'Weekly patterns and opportunities'         },
  monthly: { gradient: 'from-purple-600 to-purple-700', darkGradient: 'from-purple-500 to-purple-600', accent: 'purple',  lightBg: 'bg-purple-50',  darkBg: 'bg-purple-950/30',  border: 'border-purple-200',  icon: Moon,     description: 'Monthly cycles and themes'                 },
  yearly:  { gradient: 'from-emerald-600 to-emerald-700', darkGradient: 'from-emerald-500 to-emerald-600', accent: 'emerald', lightBg: 'bg-emerald-50', darkBg: 'bg-emerald-950/30', border: 'border-emerald-200', icon: Star,    description: 'Annual vision and destiny'                 },
  '9-year':{ gradient: 'from-indigo-600 to-indigo-700', darkGradient: 'from-indigo-500 to-indigo-600', accent: 'indigo',  lightBg: 'bg-indigo-50',  darkBg: 'bg-indigo-950/30',  border: 'border-indigo-200',  icon: Infinity, description: '9-year destiny cycle'                     },
  eternal: { gradient: 'from-stone-600 to-stone-700',   darkGradient: 'from-stone-500 to-stone-600',   accent: 'stone',   lightBg: 'bg-stone-50',   darkBg: 'bg-stone-950/30',   border: 'border-stone-200',   icon: Hourglass,description: 'Eternal perspective and timeless truths'   },
  default: { gradient: 'from-primary-600 to-primary-700', darkGradient: 'from-primary-500 to-primary-600', accent: 'primary', lightBg: 'bg-primary-50', darkBg: 'bg-primary-950/30', border: 'border-primary-200', icon: Sparkles, description: 'Your personalised reading'               },
}

const PEAK_HOURS = [
  { time: '06:00', label: 'Dawn (6:00 AM)',     emoji: '🌅' },
  { time: '12:00', label: 'Noon (12:00 PM)',     emoji: '☀️' },
  { time: '18:00', label: 'Dusk (6:00 PM)',      emoji: '🌆' },
  { time: '00:00', label: 'Midnight (12:00 AM)', emoji: '🌙' },
]

// ── Domain label map — plain English, no jargon ──────────
const domainConfig: Record<string, { label: string; emoji: string; icon: any; intro: string }> = {
  love:      { label: 'Your Love Life',       emoji: '💕', icon: Heart,    intro: 'Here is what your blueprint reveals about love, relationships, and emotional connection:'     },
  wealth:    { label: 'Your Money & Career',  emoji: '💰', icon: Coins,    intro: 'Here is what your blueprint reveals about money, abundance, and your professional path:'      },
  career:    { label: 'Your Life Purpose',    emoji: '🌟', icon: Briefcase, intro: 'Here is what your blueprint reveals about your calling, direction, and place in the world:'  },
  health:    { label: 'Your Wellbeing',       emoji: '🌿', icon: Leaf,     intro: 'Here is what your blueprint reveals about your vitality, body, and overall wellbeing:'        },
  character: { label: 'Who You Truly Are',    emoji: '✨', icon: Sparkles, intro: 'Here is what your blueprint reveals about your core nature, gifts, and deepest patterns:'     },
  spiritual: { label: 'Your Spiritual Path',  emoji: '🌙', icon: Moon,     intro: 'Here is what your blueprint reveals about your spiritual nature and soul\'s journey:'         },
}

// ── Convert tone to plain-English insight prefix ─────────
const toneToInsight = (tone: string): string => {
  switch (tone) {
    case 'strongly_positive': return '🌟 A powerful gift in your chart:'
    case 'positive':          return '✦ Something working in your favour:'
    case 'challenging':       return '◈ An area calling for your attention:'
    default:                  return '•'
  }
}

// ── Pinnacle themes translated to plain English ──────────
const pinnacleThemes: Record<number, string> = {
  1: 'You are in a chapter of new beginnings and personal identity. This is a time to trust yourself and step forward independently.',
  2: 'You are in a chapter of partnership, patience, and sensitivity. Relationships and cooperation are your greatest teachers right now.',
  3: 'You are in a chapter of creative expression and joy. Your voice, ideas, and personality are meant to shine.',
  4: 'You are in a chapter of building foundations. Hard work, discipline, and creating lasting structures define this period.',
  5: 'You are in a chapter of change, freedom, and adventure. Expect the unexpected — your life is expanding in new directions.',
  6: 'You are in a chapter of responsibility, home, and heart. Family, service, and beauty are your central themes.',
  7: 'You are in a chapter of deep inner work and wisdom. Solitude, study, and spiritual development are your path.',
  8: 'You are in a chapter of achievement, authority, and material success. The harvest of previous effort is available to you.',
  9: 'You are in a chapter of completion, letting go, and wisdom. A major cycle in your life is reaching its end.',
  11: 'You are in a master chapter of spiritual illumination and inspiration. Your sensitivity and intuition are heightened beyond the ordinary.',
  22: 'You are in a master chapter of building something that will last. Your actions carry the potential to impact many lives.',
  33: 'You are in a master chapter of unconditional service and healing. Your compassion is a force in the world.',
}

// ── Personal year meanings translated to plain English ───
const personalYearMeanings: Record<number, string> = {
  1: 'This is your year of fresh starts. Plant seeds, begin new projects, and trust your instincts.',
  2: 'This is your year of patience and connection. Focus on relationships and allow things to unfold gently.',
  3: 'This is your year to express yourself. Share your gifts, socialise, and let creativity lead.',
  4: 'This is your year to build. Focus, discipline, and practical effort will lay the groundwork for years to come.',
  5: 'This is your year of change and freedom. Be flexible — unexpected shifts are bringing you closer to your true path.',
  6: 'This is your year of love and responsibility. Home, family, and service to others are your priorities.',
  7: 'This is your year of reflection and inner growth. Quiet contemplation and deeper study will serve you well.',
  8: 'This is your year of power and achievement. Step into leadership and pursue your ambitions with confidence.',
  9: 'This is your year of completion and release. Let go of what no longer serves you to make room for what is coming.',
}

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
  const [jobId,          setJobId]          = useState<string | null>(searchParams.get('job'))
  const [readingStatus,  setReadingStatus]  = useState<'loading' | 'pending' | 'completed' | 'failed'>('loading')
  const [readingContent, setReadingContent] = useState<any>(null)
  const [pollCount,      setPollCount]      = useState(0)
  const [isPlaying,      setIsPlaying]      = useState(false)
  const [isMuted,        setIsMuted]        = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const tool   = allReadingTools.find(t => t.id === toolId) as any
  const config = tool ? (timeframeConfig[(tool as any).timeframe] || timeframeConfig['default']) : timeframeConfig['default']

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
      } catch { if (!cancelled) setReadingStatus('failed') }
    }
    fetchResult()
    const interval = setInterval(() => {
      if (readingStatus !== 'completed' && readingStatus !== 'failed') fetchResult()
    }, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [jobId, pageLoading])

  useEffect(() => { return () => { window.speechSynthesis?.cancel() } }, [])

  // ── Build sections — pure revelation, no jargon ──────────
  const buildSections = () => {
    if (!readingContent) return [
      { title: 'Your Reading',  icon: Eye,      content: tool?.description || 'Your personalised reading is being prepared...' },
      { title: 'Your Energy',   icon: Sparkles, content: 'Your energy insights will appear here...' },
      { title: 'Your Guidance', icon: Compass,  content: 'Personalised guidance will be provided here...' },
      { title: 'Right Now',     icon: Clock,    content: 'Your current moment insights will appear here...' },
    ]

    const sections: { title: string; icon: any; content: string }[] = []
    const firstName = user?.name?.split(' ')[0] || 'Seeker'

    // ── Section 1: The main narrative reading ─────────────
    if (readingContent.reading) {
      // Clean the reading — remove any technical references
      let narrative = readingContent.reading
        .replace(/Life Path \d+/gi, '')
        .replace(/Personal Year \d+/gi, '')
        .replace(/Pinnacle \d+/gi, '')
        .replace(/Karmic Debt \d+/gi, '')
        .replace(/\b(trine|sextile|square|conjunction|opposition|retrograde)\b/gi, '')
        .replace(/\b(numerology|astrology|palmistry|physiognomy)\b/gi, 'your blueprint')
        .replace(/\s{2,}/g, ' ')
        .trim()

      sections.push({
        title: 'Your Personal Reading',
        icon: Eye,
        content: narrative,
      })
    }

    // ── Section 2: Who you are right now ─────────────────
    const cycles   = readingContent.numerology?.time_cycles || {}
    const pinnacle = readingContent.numerology?.pinnacles?.current || {}

    let energyContent = `${firstName}, here is what your blueprint reveals about where you are right now.\n\n`

    if (pinnacle.number && pinnacleThemes[pinnacle.number]) {
      energyContent += `Your Life Chapter\n\n${pinnacleThemes[pinnacle.number]}\n\n`
      if (pinnacle.end_age) {
        energyContent += `This chapter runs until you are ${pinnacle.end_age}. Make the most of it.\n\n`
      }
    }

    if (cycles.personal_year && personalYearMeanings[cycles.personal_year]) {
      energyContent += `Your Year Ahead\n\n${personalYearMeanings[cycles.personal_year]}\n\n`
    }

    if (cycles.personal_month) {
      energyContent += `This Month\n\nYou are in a month-long cycle that asks you to focus on `
      const monthThemes: Record<number, string> = {
        1: 'taking initiative and starting fresh',
        2: 'patience, listening, and nurturing your closest relationships',
        3: 'expressing yourself and bringing more joy into your daily life',
        4: 'practical matters — organising, planning, and getting things done',
        5: 'embracing change and staying open to unexpected opportunities',
        6: 'home, family, and acts of care and service',
        7: 'quiet reflection, inner listening, and deeper understanding',
        8: 'stepping into your power and taking decisive action',
        9: 'releasing, forgiving, and closing what needs to end',
      }
      energyContent += `${monthThemes[cycles.personal_month] || 'inner alignment and steady progress'}.\n\n`
    }

    sections.push({
      title: 'Where You Are Right Now',
      icon: Clock,
      content: energyContent.trim(),
    })

    // ── Section 3+: Domain insights in plain English ──────
    if (readingContent.astrology?.planets) {
      const planets = Object.values(readingContent.astrology.planets) as any[]
      const domainGroups: Record<string, any[]> = {}

      planets.forEach((p: any) => {
        if (!p.domain || !p.reading) return
        if (!domainGroups[p.domain]) domainGroups[p.domain] = []
        domainGroups[p.domain].push(p)
      })

      // Priority order for domains
      const domainOrder = ['character', 'love', 'wealth', 'career', 'health', 'spiritual']

      domainOrder.forEach(domain => {
        const entries = domainGroups[domain]
        if (!entries || entries.length === 0) return
        const dc = domainConfig[domain]
        if (!dc) return

        let content = `${dc.intro}\n\n`

        // Strongest positive insight first
        const sorted = [...entries].sort((a, b) => (b.strength || 0) - (a.strength || 0))

        sorted.forEach((p: any) => {
          const prefix = toneToInsight(p.tone)
          // Translate reading to plain language — remove planet names
          const cleanReading = p.reading
            .replace(/\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Rahu|Ketu|Midheaven|Ascendant|House \d+)\b/gi, '')
            .replace(/\bin (Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/gi, '')
            .replace(/\bin the \d+(st|nd|rd|th) house\b/gi, '')
            .replace(/\b(trine|sextile|square|conjunction|opposition)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/^[\s—–-]+/, '')
            .trim()

          if (cleanReading.length > 10) {
            content += `${prefix}\n${cleanReading}\n\n`
          }
        })

        sections.push({
          title: dc.label,
          icon: dc.icon,
          content: content.trim(),
        })
      })
    }

    // ── Final section: Karmic lessons in plain English ────
    const debts = readingContent.numerology?.karmic_debts || []
    if (debts.length > 0) {
      let content = `${firstName}, your blueprint carries certain patterns from deep in your history — themes your soul has returned to work through in this lifetime.\n\n`
      debts.forEach((d: any) => {
        // Translate karmic debt to plain language
        const cleanLesson = d.lesson
          .replace(/Karmic Debt \d+/gi, 'A pattern in your soul history')
          .replace(/past life/gi, 'your deeper history')
          .trim()
        content += `${cleanLesson}\n\n`
      })
      content += `Understanding these patterns is not about limitation — it is about freedom. When you see the pattern, you can choose differently.\n`

      sections.push({
        title: 'Your Soul Patterns',
        icon: Infinity,
        content: content.trim(),
      })
    }

    if (sections.length === 0) {
      sections.push({ title: 'Your Reading', icon: Eye, content: 'Your reading content is being processed...' })
    }

    return sections
  }

  const sections    = buildSections()
  const SectionIcon = sections[currentSection]?.icon || Eye

  const getFullText = () => {
    if (!readingContent) return ''
    return [
      `KAYAL LifeOS — ${tool?.name || 'Reading'}`,
      `For: ${user?.name || 'Seeker'}`,
      `Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      '',
      ...sections.map(s => `${s.title}\n\n${s.content}`),
    ].join('\n\n─────────────────────────────────\n\n')
  }

  const handlePlayPause = () => {
    if (!window.speechSynthesis) { alert('Audio not supported in this browser.'); return }
    if (isPlaying) { window.speechSynthesis.pause(); setIsPlaying(false); return }
    if (window.speechSynthesis.paused) { window.speechSynthesis.resume(); setIsPlaying(true); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(sections[currentSection]?.content || '')
    utterance.rate   = 0.88
    utterance.pitch  = 1.0
    utterance.volume = isMuted ? 0 : 1
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Google UK English Female'))
    if (preferred) utterance.voice = preferred
    utterance.onend   = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setIsPlaying(true)
  }

  const handleStopAudio = () => { window.speechSynthesis?.cancel(); setIsPlaying(false) }
  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
    if (utteranceRef.current) utteranceRef.current.volume = isMuted ? 1 : 0
  }

  const handleDownload = () => {
    const blob = new Blob([getFullText()], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `KAYAL-${tool?.name?.replace(/\s+/g, '-') || 'Reading'}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = (platform: string) => {
    const url   = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(`${tool?.name} Reading on KAYAL LifeOS`)
    const text  = encodeURIComponent('Check out my reading from KAYAL LifeOS!')
    const map: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter:  `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      email:    `mailto:?subject=${title}&body=${text}%0A%0A${url}`,
    }
    window.open(map[platform], '_blank', 'noopener,noreferrer')
    setShowShareMenu(false)
  }

  const toggleNotification = (h: string) => setNotifications(prev => ({
    ...prev, peakHours: prev.peakHours.includes(h) ? prev.peakHours.filter(x => x !== h) : [...prev.peakHours, h]
  }))

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) { alert('Notifications not supported'); return }
    if (Notification.permission === 'granted') { setNotifications(p => ({ ...p, enabled: true })); setShowNotificationModal(true); return }
    if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') { setNotifications(p => ({ ...p, enabled: true })); setShowNotificationModal(true) }
    }
  }

  if (!user || pageLoading) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-stone-900' : 'bg-stone-50'}`}>
      <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-stone-400' : 'text-primary-600'}`} />
    </div>
  )

  if (!tool) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-stone-900' : 'bg-stone-50'}`}>
      <Card className={`p-8 text-center max-w-md ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">🔍</span></div>
        <h2 className={`text-xl font-serif mb-2 ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>Reading Not Found</h2>
        <p className={`mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>This reading doesn't exist or hasn't been generated yet.</p>
        <Button onClick={() => router.push('/member/dashboard')}>Back to Dashboard</Button>
      </Card>
    </div>
  )

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-stone-900 text-stone-200' : 'bg-stone-50 text-stone-800'}`}>

      {/* Header */}
      <header className={`sticky top-0 z-10 transition-colors duration-300 border-b backdrop-blur-sm ${darkMode ? 'bg-stone-800/95 border-stone-700' : 'bg-white border-stone-200'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className={`flex items-center gap-1.5 transition-colors ${darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-primary-600'}`}>
                <ArrowLeft className="w-5 h-5" /><span className="text-sm font-medium hidden sm:block">Back</span>
              </button>
              <div className={`h-6 w-px ${darkMode ? 'bg-stone-700' : 'bg-stone-200'}`} />
              <span className={`text-sm truncate max-w-[140px] sm:max-w-[220px] ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>{tool.name}</span>
            </div>

            <div className="flex items-center gap-1">
              {readingContent && <>
                <button onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Listen'}
                  className={`p-2 rounded-lg transition-colors ${isPlaying ? 'bg-primary-100 text-primary-700' : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={handleMuteToggle} className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button onClick={handleDownload} title="Download" className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                  <Download className="w-4 h-4" />
                </button>
              </>}
              <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-stone-700 text-stone-300' : 'text-stone-500 hover:bg-stone-100'}`}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={requestNotificationPermission} className={`p-2 rounded-lg transition-colors relative ${notifications.enabled ? 'bg-amber-50 text-amber-600' : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                {notifications.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                {notifications.enabled && notifications.peakHours.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white rounded-full text-[9px] flex items-center justify-center">{notifications.peakHours.length}</span>
                )}
              </button>
              <button onClick={() => setIsSaved(!isSaved)} className={`p-2 rounded-lg transition-colors ${isSaved ? 'bg-primary-50 text-primary-600' : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
              <div className="relative">
                <button onClick={() => setShowShareMenu(!showShareMenu)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                  <Share2 className="w-4 h-4" />
                </button>
                {showShareMenu && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl border py-1 z-20 ${darkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'}`}>
                    {[
                      { p: 'facebook', I: Facebook, l: 'Facebook',  c: 'text-blue-600'  },
                      { p: 'twitter',  I: Twitter,  l: 'Twitter',   c: 'text-sky-500'   },
                      { p: 'linkedin', I: Linkedin, l: 'LinkedIn',  c: 'text-blue-700'  },
                      { p: 'email',    I: Mail,     l: 'Email',     c: 'text-stone-600' },
                    ].map(({ p, I, l, c }) => (
                      <button key={p} onClick={() => handleShare(p)} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-50 text-stone-600'}`}>
                        <I className={`w-4 h-4 ${c}`} />{l}
                      </button>
                    ))}
                    <div className={`my-1 border-t ${darkMode ? 'border-stone-700' : 'border-stone-200'}`} />
                    <button onClick={handleCopyLink} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-50 text-stone-600'}`}>
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy link'}
                    </button>
                    <button onClick={handleDownload} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-50 text-stone-600'}`}>
                      <Download className="w-4 h-4" />Download (.txt)
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
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-primary-600 text-white px-4 py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span>Now reading: <strong>{sections[currentSection]?.title}</strong></span>
            </div>
            <button onClick={handleStopAudio} className="text-white/80 hover:text-white underline text-xs">Stop</button>
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
                  <h3 className={`text-lg font-serif ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>Notification Times</h3>
                  <button onClick={() => setShowNotificationModal(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-stone-700' : 'hover:bg-stone-100'}`}><X className="w-5 h-5" /></button>
                </div>
                <p className={`text-sm mb-4 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                  When would you like us to remind you to check in with your reading?
                </p>
                <div className="space-y-2 mb-6">
                  {PEAK_HOURS.map(h => (
                    <label key={h.time} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer ${darkMode ? 'hover:bg-stone-700' : 'hover:bg-stone-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{h.emoji}</span>
                        <p className={`font-medium text-sm ${darkMode ? 'text-stone-200' : 'text-stone-700'}`}>{h.label}</p>
                      </div>
                      <input type="checkbox" checked={notifications.peakHours.includes(h.time)} onChange={() => toggleNotification(h.time)} className="w-5 h-5 rounded accent-primary-600" />
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => { setNotifications(p => ({ ...p, enabled: true })); setShowNotificationModal(false) }} className="flex-1">Save</Button>
                  <Button variant="outline" onClick={() => { setNotifications({ enabled: false, peakHours: [], showSettings: false }); setShowNotificationModal(false) }} className="flex-1">Disable All</Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tool header card */}
        <Card className={`p-6 mb-6 ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${darkMode ? config.darkGradient : config.gradient} text-white flex items-center justify-center text-3xl shadow-md flex-shrink-0`}>
              {tool.emoji || '✨'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className={`text-xl sm:text-2xl font-serif ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>{tool.name}</h1>
                <Badge variant="outline" className={`${darkMode ? 'bg-stone-700 border-stone-600 text-stone-300' : 'bg-primary-50 border-primary-200 text-primary-700'} text-xs`}>
                  {readingContent ? '✅ Ready' : readingStatus === 'pending' ? '⏳ Generating...' : 'Personalised'}
                </Badge>
              </div>
              <div className={`flex items-center gap-3 text-sm flex-wrap ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{user.name}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              {readingContent && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button onClick={handlePlayPause} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isPlaying ? 'bg-primary-600 text-white' : darkMode ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'bg-primary-50 text-primary-700 hover:bg-primary-100'}`}>
                    {isPlaying ? <><Pause className="w-3.5 h-3.5" />Pause</> : <><Play className="w-3.5 h-3.5" />Listen to Reading</>}
                  </button>
                  <button onClick={handleDownload} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${darkMode ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>
                    <Download className="w-3.5 h-3.5" />Download
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Pending */}
        {readingStatus === 'pending' && (
          <Card className={`p-8 mb-6 text-center ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
            <h3 className={`text-lg font-serif mb-2 ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>Your reading is being prepared</h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              Our oracle is weaving your personalised {tool.name}. This usually takes 2–5 minutes.
            </p>
            <div className="flex justify-center gap-2 mb-3">
              {[0, 200, 400].map(d => <div key={d} className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" style={{ animationDelay: `${d}ms` }} />)}
            </div>
            <p className={`text-xs ${darkMode ? 'text-stone-500' : 'text-stone-400'}`}>Checking every 5 seconds… ({pollCount} checks)</p>
          </Card>
        )}

        {/* Failed */}
        {readingStatus === 'failed' && (
          <Card className={`p-8 mb-6 text-center ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className={`text-lg font-serif mb-2 ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>Something went wrong</h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              Please contact support@kayalsoulpath.com and quote reference: <code className="bg-neutral-100 px-1 rounded text-xs">{jobId}</code>
            </p>
            <Button onClick={() => router.push('/member/dashboard')} variant="outline">Back to Dashboard</Button>
          </Card>
        )}

        {/* Reading grid */}
        {(readingStatus === 'completed' || readingStatus === 'loading') && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className={`p-4 sticky top-24 ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-stone-400' : 'text-stone-400'}`}>Your Reading</h3>
                <nav className="space-y-1">
                  {sections.map((s, i) => {
                    const Icon = s.icon
                    return (
                      <button key={i} onClick={() => { setCurrentSection(i); handleStopAudio() }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                          currentSection === i
                            ? darkMode ? 'bg-primary-900/50 text-primary-300 font-medium' : 'bg-primary-50 text-primary-700 font-medium'
                            : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100'
                        }`}>
                        <Icon className={`w-4 h-4 flex-shrink-0 ${currentSection === i ? darkMode ? 'text-primary-400' : 'text-primary-600' : 'text-stone-400'}`} />
                        <span className="truncate leading-tight">{s.title}</span>
                      </button>
                    )
                  })}
                </nav>

                <div className="mt-5 space-y-2">
                  {readingContent && (
                    <button onClick={handleDownload}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${darkMode ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>
                      <Download className="w-3.5 h-3.5" />Download Reading
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
              <Card className={`p-6 ${darkMode ? 'bg-stone-800 border-stone-700' : ''}`}>
                <div className={`flex items-center justify-between gap-3 mb-6 pb-4 border-b ${darkMode ? 'border-stone-700' : 'border-stone-200'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${darkMode ? config.darkBg : config.lightBg} flex items-center justify-center flex-shrink-0`}>
                      <SectionIcon className={`w-5 h-5 ${darkMode ? 'text-primary-400' : 'text-primary-600'}`} />
                    </div>
                    <div className="min-w-0">
                      <h2 className={`text-lg sm:text-xl font-serif truncate ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>{sections[currentSection]?.title}</h2>
                      <p className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>{tool.name}</p>
                    </div>
                  </div>
                  {readingContent && (
                    <button onClick={handlePlayPause}
                      className={`p-2 rounded-xl flex-shrink-0 transition-colors ${isPlaying ? 'bg-primary-100 text-primary-700' : darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-400 hover:bg-stone-100'}`}>
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                <div className={`leading-relaxed whitespace-pre-line text-base ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                  {readingStatus === 'loading' ? (
                    <div className="space-y-3">
                      {[90, 82, 75, 88, 65].map((w, i) => (
                        <div key={i} className={`h-4 rounded-lg animate-pulse ${darkMode ? 'bg-stone-700' : 'bg-stone-100'}`} style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  ) : sections[currentSection]?.content}
                </div>

                <div className={`flex items-center justify-between mt-8 pt-5 border-t ${darkMode ? 'border-stone-700' : 'border-stone-200'}`}>
                  <button onClick={() => { setCurrentSection(p => Math.max(0, p - 1)); handleStopAudio() }} disabled={currentSection === 0}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100'}`}>
                    <ChevronLeft className="w-4 h-4" />Previous
                  </button>
                  <span className={`text-xs ${darkMode ? 'text-stone-500' : 'text-stone-400'}`}>{currentSection + 1} of {sections.length}</span>
                  <button onClick={() => { setCurrentSection(p => Math.min(sections.length - 1, p + 1)); handleStopAudio() }} disabled={currentSection === sections.length - 1}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${darkMode ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100'}`}>
                    Next<ChevronRight className="w-4 h-4" />
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