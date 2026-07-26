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
  Download, Play, Pause, Volume2, VolumeX, AlertCircle, Calendar,
} from 'lucide-react'

import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { omniRelationshipTools }   from '@/lib/constants/omni-seer-relationships'
import { omniSelfPurposeTools }    from '@/lib/constants/omni-seer-self-purpose'
import { omniPhysicalTimingTools } from '@/lib/constants/omni-seer-physical-timing'
import { voiceTools }        from '@/lib/constants/voice-tools'
import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'

const omniTools = [...omniRelationshipTools, ...omniSelfPurposeTools, ...omniPhysicalTimingTools]

const allReadingTools = [
  ...timeKeeperTools, ...omniTools, ...voiceTools, ...loveTools,
  ...wealthTools, ...wellnessTools, ...lifePathTools, ...sacredScriptTools,
]

const timeframeConfig: Record<string, {
  gradient: string, accent: string, lightBg: string, border: string,
  icon: any, description: string, darkGradient: string, darkBg: string
}> = {
  daily:    { gradient: 'from-amber-600 to-amber-700',   darkGradient: 'from-amber-500 to-amber-600',   accent: 'amber',   lightBg: 'bg-amber-50',   darkBg: 'bg-amber-950/30',   border: 'border-amber-200',   icon: Sun,      description: 'Your daily guidance and insights'        },
  weekly:   { gradient: 'from-blue-600 to-blue-700',     darkGradient: 'from-blue-500 to-blue-600',     accent: 'blue',    lightBg: 'bg-blue-50',    darkBg: 'bg-blue-950/30',    border: 'border-blue-200',    icon: Calendar, description: 'Weekly patterns and opportunities'       },
  monthly:  { gradient: 'from-purple-600 to-purple-700', darkGradient: 'from-purple-500 to-purple-600', accent: 'purple',  lightBg: 'bg-purple-50',  darkBg: 'bg-purple-950/30',  border: 'border-purple-200',  icon: Moon,     description: 'Monthly cycles and themes'               },
  yearly:   { gradient: 'from-emerald-600 to-emerald-700', darkGradient: 'from-emerald-500 to-emerald-600', accent: 'emerald', lightBg: 'bg-emerald-50', darkBg: 'bg-emerald-950/30', border: 'border-emerald-200', icon: Star,   description: 'Annual vision and destiny'               },
  '9-year': { gradient: 'from-indigo-600 to-indigo-700', darkGradient: 'from-indigo-500 to-indigo-600', accent: 'indigo',  lightBg: 'bg-indigo-50',  darkBg: 'bg-indigo-950/30',  border: 'border-indigo-200',  icon: Infinity, description: '9-year destiny cycle'                   },
  eternal:  { gradient: 'from-stone-600 to-stone-700',   darkGradient: 'from-stone-500 to-stone-600',   accent: 'stone',   lightBg: 'bg-stone-50',   darkBg: 'bg-stone-950/30',   border: 'border-stone-200',   icon: Hourglass,description: 'Eternal perspective and timeless truths' },
  default:  { gradient: 'from-primary-600 to-primary-700', darkGradient: 'from-primary-500 to-primary-600', accent: 'primary', lightBg: 'bg-primary-50', darkBg: 'bg-primary-950/30', border: 'border-primary-200', icon: Sparkles, description: 'Your personalised reading'             },
}

const PEAK_HOURS = [
  { time: '06:00', label: 'Dawn (6:00 AM)',     emoji: '🌅' },
  { time: '12:00', label: 'Noon (12:00 PM)',     emoji: '☀️' },
  { time: '18:00', label: 'Dusk (6:00 PM)',      emoji: '🌆' },
  { time: '00:00', label: 'Midnight (12:00 AM)', emoji: '🌙' },
]

// ── Plain-language helpers ───────────────────────────────
const yearMeaning = (y: number): string => ({
  1: 'This is your year of fresh starts. New beginnings are supported, plant seeds, start projects, trust your instincts.',
  2: 'This is your year of patience and connection. Relationships and cooperation are your greatest teachers.',
  3: 'This is your year to express yourself. Share your gifts, socialise, and let creativity lead.',
  4: 'This is your year to build. Focus and practical effort will lay the groundwork for years to come.',
  5: 'This is your year of change and freedom. Be flexible, unexpected shifts are bringing you closer to your true path.',
  6: 'This is your year of love and responsibility. Home, family, and service to others are your priorities.',
  7: 'This is your year of reflection and inner growth. Quiet contemplation and deeper study will serve you well.',
  8: 'This is your year of power and achievement. Step into leadership and pursue your ambitions with confidence.',
  9: 'This is your year of completion and release. Let go of what no longer serves you to make room for what is coming.',
}[y] || 'Your year carries a unique energy, trust the process unfolding around you.')

const monthMeaning = (m: number): string => ({
  1: 'taking initiative and starting fresh',
  2: 'patience, listening, and nurturing your closest relationships',
  3: 'expressing yourself and bringing more joy into your daily life',
  4: 'practical matters, organising, planning, and getting things done',
  5: 'embracing change and staying open to unexpected opportunities',
  6: 'home, family, and acts of care and service',
  7: 'quiet reflection, inner listening, and deeper understanding',
  8: 'stepping into your power and taking decisive action',
  9: 'releasing, forgiving, and closing what needs to end',
}[m] || 'inner alignment and steady progress')

const dayMeaning = (d: number): string => ({
  1: 'Today is a day for beginnings. Start something. Make a decision you\'ve been putting off. The energy supports independent action.',
  2: 'Today is a day for connection and patience. Listen more than you speak. Partnerships and diplomacy are favoured.',
  3: 'Today is a day for expression. Communicate, create, socialise. Your words and ideas carry extra power today.',
  4: 'Today is a day for work and structure. Get practical. Organise, plan, focus. Effort made today compounds.',
  5: 'Today is a day of movement and change. Stay flexible. Something unexpected may shift your direction, welcome it.',
  6: 'Today is a day of care and responsibility. Home, family, and service to others are highlighted.',
  7: 'Today is a day for inner reflection. Slow down. Think deeply. The answers you need are found in stillness today.',
  8: 'Today is a day of power and momentum. Lead. Take decisive action. Material matters are favoured.',
  9: 'Today is a day of completion. Finish what needs ending. Release what no longer serves. Clear the path for what is coming.',
}[d] || 'Today carries a unique energy, trust your instincts.')

const pinnacleTheme = (n: number): string => ({
  1:  'You are in a chapter of new beginnings and personal identity. This is a time to trust yourself and step forward independently.',
  2:  'You are in a chapter of partnership and patience. Relationships and cooperation are your greatest teachers right now.',
  3:  'You are in a chapter of creative expression and joy. Your voice, ideas, and personality are meant to shine.',
  4:  'You are in a chapter of building foundations. Hard work and discipline define this period.',
  5:  'You are in a chapter of change, freedom, and adventure. Expect the unexpected, your life is expanding.',
  6:  'You are in a chapter of responsibility, home, and heart. Family and service are your central themes.',
  7:  'You are in a chapter of deep inner work and wisdom. Solitude and spiritual development are your path.',
  8:  'You are in a chapter of achievement and authority. The harvest of previous effort is available to you.',
  9:  'You are in a chapter of completion and letting go. A major cycle in your life is reaching its end.',
  11: 'You are in a master chapter of spiritual illumination. Your sensitivity and intuition are heightened beyond the ordinary.',
  22: 'You are in a master chapter of building something lasting. Your actions carry the potential to impact many lives.',
  33: 'You are in a master chapter of unconditional service. Your compassion is a force in the world.',
}[n] || 'You are in a significant chapter of your life journey.')

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
  const [notifications,         setNotifications]         = useState({ enabled: false, peakHours: [] as string[], showSettings: false })
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
    const savedDark  = localStorage.getItem('darkMode') === 'true'
    const savedNotif = localStorage.getItem('notifications')
    setDarkMode(savedDark)
    if (savedNotif) setNotifications(JSON.parse(savedNotif))
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
      const { data: { user: au } } = await supabase.auth.getUser()
      if (!au) { setPageLoading(false); return }
      const { data: p } = await supabase
        .from('purchases')
        .select('job_id')
        .eq('user_id', au.id)
        .eq('tool_id', toolId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (p?.job_id) setJobId(p.job_id)
      setPageLoading(false)
    }
    loadJobId()
  }, [toolId])

  useEffect(() => {
    if (!jobId || pageLoading) return
    let cancelled = false
    const fetch_ = async () => {
      try {
        const res  = await fetch(`/api/reading/result/${jobId}`)
        const data = await res.json()
        if (cancelled) return
        if (data.status === 'completed' && data.content) { setReadingContent(data.content); setReadingStatus('completed') }
        else if (data.status === 'failed') setReadingStatus('failed')
        else { setReadingStatus('pending'); setPollCount(c => c + 1) }
      } catch { if (!cancelled) setReadingStatus('failed') }
    }
    fetch_()
    const iv = setInterval(() => { if (readingStatus !== 'completed' && readingStatus !== 'failed') fetch_() }, 5000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [jobId, pageLoading])

  useEffect(() => { return () => { window.speechSynthesis?.cancel() } }, [])

  // ── Build sections, scoped strictly to each tool ────────
  const buildSections = () => {
    const firstName = user?.name?.split(' ')[0] || 'Seeker'

    if (!readingContent) return [
      { title: 'Your Reading',  icon: Eye,     content: tool?.hook || 'Your personalised reading is being prepared...' },
      { title: 'Your Guidance', icon: Compass, content: 'Personalised guidance will appear here once your reading is ready...' },
    ]

    const sections: { title: string; icon: any; content: string }[] = []
    const num      = readingContent.numerology   || {}
    const cycles   = num.time_cycles             || {}
    const pinnacle = num.pinnacles?.current      || {}

    // ════════════════════════════════════════════════════
    // DAILY PERSONAL ORACLE
    // ════════════════════════════════════════════════════
    if (toolId === 'daily-personal-oracle') {
      if (readingContent.reading) sections.push({ title: "Today's Oracle", icon: Eye, content: readingContent.reading })

      let todayContent = `${firstName}, here is what today is asking of you.\n\n`
      if (cycles.personal_day) todayContent += `Today's Energy\n\n${dayMeaning(cycles.personal_day)}\n\n`
      todayContent += `What to Do Today\n\nFocus on what feels most aligned and act on it before midday when energy is highest.\n\nWhat to Avoid\n\nForcing outcomes that resist movement today, if something isn't flowing, leave it for another day.`
      sections.push({ title: "Today's Energy", icon: Sun, content: todayContent })

      sections.push({
        title: "Today's Guidance",
        icon: Compass,
        content: `${firstName}, every day is a conversation between you and time. Today is asking something specific of you.\n\nRead today's oracle once in the morning and once before bed. Notice what shifted. That noticing is the practice.\n\nYour daily oracle refreshes tomorrow at midnight.`,
      })
    }

    // ════════════════════════════════════════════════════
    // MONTHLY CYCLE NAVIGATOR
    // ════════════════════════════════════════════════════
    else if (toolId === 'monthly-cycle-navigator') {
      if (readingContent.reading) sections.push({ title: "This Month's Reading", icon: Eye, content: readingContent.reading })

      let monthContent = `${firstName}, here is your complete map for the month ahead.\n\n`
      if (cycles.personal_month) monthContent += `This Month's Theme\n\nYou are in a month focused on ${monthMeaning(cycles.personal_month)}.\n\n`
      monthContent += `Peak Windows\n\nThe first 10 days carry the freshest energy, ideal for initiating. The middle 10 days are for sustaining and adjusting. The final 10 days are best for completing and releasing.\n\nMonthly Practice\n\nChoose one intention for this month, something specific you want to move forward, and revisit it every morning for 30 days. Consistency this month compounds into momentum next month.`
      sections.push({ title: 'Your Month Mapped', icon: Calendar, content: monthContent })

      sections.push({
        title: 'Monthly Guidance',
        icon: Compass,
        content: `${firstName}, the most powerful thing you can do this month is choose one domain, love, wealth, health, or purpose, and give it your focused attention.\n\nDivided attention dissipates the month's energy. Focused attention harvests it.\n\nYour monthly navigator refreshes on the 1st of next month.`,
      })
    }

    // ════════════════════════════════════════════════════
    // QUARTERLY DESTINY PULSE
    // ════════════════════════════════════════════════════
    else if (toolId === 'quarterly-destiny-pulse') {
      if (readingContent.reading) sections.push({ title: "Your Quarter's Reading", icon: Eye, content: readingContent.reading })

      let quarterContent = `${firstName}, here is your 90-day map.\n\n`
      if (cycles.personal_month) quarterContent += `This Month (Month 1 of 3)\n\nYou are currently in a month of ${monthMeaning(cycles.personal_month)}. Use this month to establish the rhythm that will carry you through the quarter.\n\n`
      quarterContent += `The Quarter's Arc\n\nEvery quarter follows an arc: Month 1 is for planting, Month 2 is for tending, Month 3 is for harvesting. The mistake most people make is trying to harvest in Month 1 or plant in Month 3.\n\nYour 90-Day Practice\n\nIdentify the single most important thing you want to change or build in the next 90 days. Write it down. Return to it every Sunday. Adjust your approach weekly, but never the destination.`
      sections.push({ title: 'Your 90-Day Map', icon: Compass, content: quarterContent })

      sections.push({
        title: 'Peaks & Pivots',
        icon: Star,
        content: `${firstName}, within your 90-day window there are specific moments where the timing is most powerful.\n\nPeak Window\n\nThe middle month of the quarter typically carries the highest convergence of positive timing. This is when to make your most important move.\n\nCaution Period\n\nThe transition between Month 2 and Month 3 often carries a moment of doubt or plateau. This is not a signal to stop, it is a signal to stay steady.\n\nSeasonal Theme\n\nYour blueprint assigns each season a theme. This quarter asks you to focus on building consistency and compounding small daily actions into visible results.`,
      })

      sections.push({
        title: 'Quarter Guidance',
        icon: Moon,
        content: `${firstName}, 90 days is exactly long enough to build a habit and exactly long enough to transform a situation, if you are intentional from day one.\n\nYour quarterly pulse refreshes in 90 days.`,
      })
    }

    // ════════════════════════════════════════════════════
    // ANNUAL ARC KEEPER
    // ════════════════════════════════════════════════════
    else if (toolId === 'annual-arc-keeper') {
      if (readingContent.reading) sections.push({ title: "Your Year's Reading", icon: Eye, content: readingContent.reading })

      let yearContent = `${firstName}, here is your complete year mapped.\n\n`
      if (cycles.personal_year) yearContent += `Your Year's Theme\n\n${yearMeaning(cycles.personal_year)}\n\n`
      yearContent += `The Year's Arc\n\nEvery year has three phases:\n\n• Months 1–4: Establishment. The year's theme takes root. Focus on foundation.\n\n• Months 5–8: Activation. The year's energy peaks. This is when to make your most significant moves.\n\n• Months 9–12: Harvest and completion. Gather what the year produced. Release what didn't work. Prepare for what is next.\n\nYour Most Important Month\n\nThe month where timing most favours decisive action is in the activation phase, watch for the month where multiple things converge at once. That is your signal.`
      sections.push({ title: 'Your Year Mapped', icon: Calendar, content: yearContent })

      sections.push({
        title: 'Peaks & Cautions',
        icon: Star,
        content: `${firstName}, within your year there are three windows of peak opportunity and two periods requiring extra care.\n\nPeak Windows\n\n• Early in the year when the year's new energy is freshest\n• Mid-year during the activation phase\n• Autumn when harvest energy supports completion\n\nCaution Periods\n\n• The year's transition month when the old year's energy fades but the new hasn't fully arrived\n• The completion month when you are tempted to push when the cycle asks you to rest\n\nAnnual Theme\n\nYour blueprint assigns each year a soul curriculum, a specific lesson the year is structured to teach. Navigate it consciously and you exit the year transformed.`,
      })

      if (pinnacle.number) {
        sections.push({
          title: 'Your Life Chapter',
          icon: Infinity,
          content: `${firstName}, beyond this year you are in a longer chapter of your life that shapes everything within it.\n\nYour Life Chapter Right Now\n\n${pinnacleTheme(pinnacle.number)}${pinnacle.end_age ? `\n\nThis chapter runs until you are ${pinnacle.end_age}. The year ahead sits inside this larger arc, let the chapter's theme guide your annual intention.` : ''}\n\nHow This Shapes Your Year\n\nYour annual goals will feel most aligned when they serve the chapter's theme. Work against the chapter and the year will feel like friction. Work with it and the year compounds.`,
        })
      }

      sections.push({
        title: 'Annual Guidance',
        icon: Compass,
        content: `${firstName}, the most powerful annual practice is a single intention chosen in January and revisited at the start of every month.\n\nNot a list of goals. One intention.\n\nAt year-end, that single thread, followed consistently, will have woven something real.\n\nYour annual arc refreshes each January.`,
      })
    }

    // ════════════════════════════════════════════════════
    // NINE-YEAR ARC COMPASS
    // ════════════════════════════════════════════════════
    else if (toolId === 'nine-year-arc-compass') {
      if (readingContent.reading) sections.push({ title: 'Your Decade Reading', icon: Eye, content: readingContent.reading })

      let decadeContent = `${firstName}, you are not navigating a year, you are navigating a decade. Here is the full arc.\n\nHow the Nine-Year Arc Works\n\nYour life moves in nine-year cycles. Each year within the cycle carries a specific energy and purpose. The arc has a beginning (Years 1–3), a middle (Years 4–6), and an end (Years 7–9). Understanding where you are in the arc changes everything about how you move.\n\n`
      if (cycles.personal_year) {
        decadeContent += `Where You Are Right Now\n\nYou are currently in Year ${cycles.personal_year} of your nine-year arc.\n\n`
        if (cycles.personal_year <= 3)      decadeContent += `You are in the establishing phase. These are the years of planting, foundations, new directions, and identity. What you build now will define the arc's middle and end.\n\n`
        else if (cycles.personal_year <= 6) decadeContent += `You are in the activating phase. These are the years of momentum, expansion, relationships, and material progress. The seeds planted in Years 1–3 are growing.\n\n`
        else                                decadeContent += `You are in the completing phase. These are the years of harvest, mastery, and release. What no longer serves the arc must be released to make room for the next cycle.\n\n`
      }
      decadeContent += `The Arc's Peak Window\n\nEvery nine-year arc has one year of peak convergence where multiple timing systems align most powerfully. Your blueprint identifies this year and everything you do between now and then is preparation.\n\nThe Arc's Hardest Year\n\nEvery arc also has one year of maximum challenge, not to be feared, but to be prepared for. Knowing it is coming transforms it from a crisis into a rite of passage.`
      sections.push({ title: 'Your Nine-Year Arc', icon: Infinity, content: decadeContent })

      if (pinnacle.number) {
        let pinnContent = `${firstName}, within your nine-year arc you are living inside a longer chapter that sets the theme for an entire phase of your life.\n\nYour Current Life Chapter\n\n${pinnacleTheme(pinnacle.number)}\n\n`
        if (pinnacle.start_age && pinnacle.end_age) pinnContent += `This chapter spans from age ${pinnacle.start_age} to age ${pinnacle.end_age}. `
        if (pinnacle.end_age) pinnContent += `You have until age ${pinnacle.end_age} to complete this chapter's work.\n\n`
        pinnContent += `How to Use This Knowledge\n\nThe most powerful thing you can do with your nine-year arc is align your annual intentions with the chapter's demands. When your goals serve the chapter, the arc accelerates. When they resist it, the arc pushes back.`
        sections.push({ title: 'Your Life Chapters', icon: Star, content: pinnContent })
      }

      let strategyContent = `${firstName}, the nine-year arc compass is most powerful when used as a strategy tool, not just a forecast.\n\nThree-Phase Decade Strategy\n\n`
      if (cycles.personal_year) {
        if (cycles.personal_year <= 3) {
          strategyContent += `Phase 1, You Are Here (Years 1–3)\nThis is your establishment phase. Your primary task: build the infrastructure the arc will need. Skills, relationships, foundations, identity. Everything you invest in now compounds exponentially by Year 6.\n\nPhase 2, Activation (Years 4–6)\nThis is where momentum builds. You will feel the arc accelerate. Stay directional. Do not scatter your energy. The peak window lives somewhere in this phase.\n\nPhase 3, Mastery & Completion (Years 7–9)\nThis is where the arc delivers its harvest, and asks you to release what the cycle was never meant to carry forward. What you complete here determines what the next arc inherits.`
        } else if (cycles.personal_year <= 6) {
          strategyContent += `Phase 1, Establishment (Years 1–3)\nYou have already moved through the arc's establishment phase. The foundations are laid.\n\nPhase 2, You Are Here (Years 4–6)\nThis is your activation phase. Momentum is building. Stay focused, this is when your peak window is closest. Do not scatter your energy.\n\nPhase 3, Mastery & Completion (Years 7–9)\nPrepare for the arc's final phase now. Begin identifying what you want to complete and what you want to release before the cycle ends.`
        } else {
          strategyContent += `Phase 1, Establishment (Years 1–3)\nThe arc's foundation phase is behind you.\n\nPhase 2, Activation (Years 4–6)\nThe arc's momentum phase is behind you. The harvest was planted.\n\nPhase 3, You Are Here (Years 7–9)\nYou are in the arc's completion and mastery phase. Your task: harvest consciously, release deliberately, and begin preparing the intentions that will seed the next arc when it opens.`
        }
      }
      sections.push({ title: 'Your Decade Strategy', icon: Compass, content: strategyContent })

      sections.push({
        title: 'Arc Guidance',
        icon: Moon,
        content: `${firstName}, most people navigate their lives one year at a time and wonder why they feel unprepared for the decade.\n\nThe nine-year arc compass changes that. You now know the shape of the arc you are inside. You know where you are within it. You know what each phase demands.\n\nUse this knowledge to make decisions that serve not just this year, but the whole arc.\n\nYour nine-year compass refreshes at the start of each new arc cycle.`,
      })
    }

    // ════════════════════════════════════════════════════
    // FALLBACK, all other tools
    // ════════════════════════════════════════════════════
    else {
      if (readingContent.reading) sections.push({ title: 'Your Reading', icon: Eye, content: readingContent.reading })
      if (cycles.personal_year) sections.push({ title: 'Where You Are Right Now', icon: Clock, content: `${firstName}, here is what your blueprint reveals about this moment.\n\n${yearMeaning(cycles.personal_year)}` })
      if (pinnacle.number)      sections.push({ title: 'Your Life Chapter',        icon: Infinity, content: `${firstName}, you are in a longer chapter that shapes everything within it.\n\n${pinnacleTheme(pinnacle.number)}${pinnacle.end_age ? `\n\nThis chapter runs until you are ${pinnacle.end_age}.` : ''}` })
      if (sections.length === 0) sections.push({ title: 'Your Reading', icon: Eye, content: 'Your reading content is being processed...' })
    }

    return sections
  }

  const sections    = buildSections()
  const SectionIcon = sections[currentSection]?.icon || Eye

  const getFullText = () => {
    if (!readingContent) return ''
    return [
      `KAYAL LifeOS, ${tool?.name || 'Reading'}`,
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
    const voices     = window.speechSynthesis.getVoices()
    const preferred  = voices.find(v => v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Google UK English Female'))
    if (preferred) utterance.voice = preferred
    utterance.onend   = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setIsPlaying(true)
  }

  const handleStopAudio  = () => { window.speechSynthesis?.cancel(); setIsPlaying(false) }
  const handleMuteToggle = () => { setIsMuted(!isMuted); if (utteranceRef.current) utteranceRef.current.volume = isMuted ? 1 : 0 }

  const handleDownload = () => {
    const blob = new Blob([getFullText()], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `KAYAL-${tool?.name?.replace(/\s+/g, '-') || 'Reading'}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const handleCopyLink = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000) }

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

  const dm = darkMode

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dm ? 'bg-stone-900 text-stone-200' : 'bg-stone-50 text-stone-800'}`}>

      {/* ── Header ── */}
      <header className={`sticky top-0 z-10 border-b backdrop-blur-sm transition-colors ${dm ? 'bg-stone-800/95 border-stone-700' : 'bg-white border-stone-200'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className={`flex items-center gap-1.5 transition-colors ${dm ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-primary-600'}`}>
                <ArrowLeft className="w-5 h-5" /><span className="text-sm font-medium hidden sm:block">Back</span>
              </button>
              <div className={`h-6 w-px ${dm ? 'bg-stone-700' : 'bg-stone-200'}`} />
              <span className={`text-sm truncate max-w-[140px] sm:max-w-[200px] ${dm ? 'text-stone-400' : 'text-stone-500'}`}>{tool.name}</span>
            </div>

            <div className="flex items-center gap-1">
              {readingContent && <>
                <button onClick={handlePlayPause} className={`p-2 rounded-lg transition-colors ${isPlaying ? 'bg-primary-100 text-primary-700' : dm ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={handleMuteToggle} className={`p-2 rounded-lg transition-colors ${dm ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button onClick={handleDownload} className={`p-2 rounded-lg transition-colors ${dm ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                  <Download className="w-4 h-4" />
                </button>
              </>}
              <button onClick={() => setDarkMode(!dm)} className={`p-2 rounded-lg transition-colors ${dm ? 'bg-stone-700 text-stone-300' : 'text-stone-500 hover:bg-stone-100'}`}>
                {dm ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={requestNotificationPermission} className={`p-2 rounded-lg transition-colors relative ${notifications.enabled ? 'bg-amber-50 text-amber-600' : dm ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                {notifications.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                {notifications.enabled && notifications.peakHours.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white rounded-full text-[9px] flex items-center justify-center">{notifications.peakHours.length}</span>
                )}
              </button>
              <button onClick={() => setIsSaved(!isSaved)} className={`p-2 rounded-lg transition-colors ${isSaved ? 'bg-primary-50 text-primary-600' : dm ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
              <div className="relative">
                <button onClick={() => setShowShareMenu(!showShareMenu)} className={`p-2 rounded-lg transition-colors ${dm ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-100'}`}>
                  <Share2 className="w-4 h-4" />
                </button>
                {showShareMenu && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl border py-1 z-20 ${dm ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'}`}>
                    {[
                      { p: 'facebook', I: Facebook, l: 'Facebook',  c: 'text-blue-600'  },
                      { p: 'twitter',  I: Twitter,  l: 'Twitter',   c: 'text-sky-500'   },
                      { p: 'linkedin', I: Linkedin, l: 'LinkedIn',  c: 'text-blue-700'  },
                      { p: 'email',    I: Mail,     l: 'Email',     c: 'text-stone-600' },
                    ].map(({ p, I, l, c }) => (
                      <button key={p} onClick={() => handleShare(p)} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${dm ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-50 text-stone-600'}`}>
                        <I className={`w-4 h-4 ${c}`} />{l}
                      </button>
                    ))}
                    <div className={`my-1 border-t ${dm ? 'border-stone-700' : 'border-stone-200'}`} />
                    <button onClick={handleCopyLink} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${dm ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-50 text-stone-600'}`}>
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}{copied ? 'Copied!' : 'Copy link'}
                    </button>
                    <button onClick={handleDownload} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${dm ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-50 text-stone-600'}`}>
                      <Download className="w-4 h-4" />Download (.txt)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Audio banner ── */}
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

      {/* ── Notification Modal ── */}
      <AnimatePresence>
        {showNotificationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md">
              <Card className={`p-6 ${dm ? 'bg-stone-800 border-stone-700' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-serif ${dm ? 'text-stone-200' : 'text-stone-800'}`}>Notification Times</h3>
                  <button onClick={() => setShowNotificationModal(false)} className={`p-2 rounded-lg ${dm ? 'hover:bg-stone-700' : 'hover:bg-stone-100'}`}><X className="w-5 h-5" /></button>
                </div>
                <p className={`text-sm mb-4 ${dm ? 'text-stone-400' : 'text-stone-500'}`}>When would you like us to remind you to check in with your reading?</p>
                <div className="space-y-2 mb-6">
                  {PEAK_HOURS.map(h => (
                    <label key={h.time} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer ${dm ? 'hover:bg-stone-700' : 'hover:bg-stone-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{h.emoji}</span>
                        <p className={`font-medium text-sm ${dm ? 'text-stone-200' : 'text-stone-700'}`}>{h.label}</p>
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

      {/* ── Main ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tool header */}
        <Card className={`p-6 mb-6 ${dm ? 'bg-stone-800 border-stone-700' : ''}`}>
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${dm ? config.darkGradient : config.gradient} text-white flex items-center justify-center text-3xl shadow-md flex-shrink-0`}>
              {tool.emoji || '✨'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className={`text-xl sm:text-2xl font-serif ${dm ? 'text-stone-200' : 'text-stone-800'}`}>{tool.name}</h1>
                <Badge variant="outline" className={`text-xs ${dm ? 'bg-stone-700 border-stone-600 text-stone-300' : 'bg-primary-50 border-primary-200 text-primary-700'}`}>
                  {readingContent ? '✅ Ready' : readingStatus === 'pending' ? '⏳ Generating...' : 'Personalised'}
                </Badge>
              </div>
              <div className={`flex items-center gap-3 text-sm flex-wrap ${dm ? 'text-stone-400' : 'text-stone-500'}`}>
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{user.name}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              {readingContent && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button onClick={handlePlayPause} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isPlaying ? 'bg-primary-600 text-white' : dm ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'bg-primary-50 text-primary-700 hover:bg-primary-100'}`}>
                    {isPlaying ? <><Pause className="w-3.5 h-3.5" />Pause</> : <><Play className="w-3.5 h-3.5" />Listen to Reading</>}
                  </button>
                  <button onClick={handleDownload} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${dm ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>
                    <Download className="w-3.5 h-3.5" />Download
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Pending */}
        {readingStatus === 'pending' && (
          <Card className={`p-8 mb-6 text-center ${dm ? 'bg-stone-800 border-stone-700' : ''}`}>
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
            <h3 className={`text-lg font-serif mb-2 ${dm ? 'text-stone-200' : 'text-stone-800'}`}>Your reading is being prepared</h3>
            <p className={`text-sm mb-4 ${dm ? 'text-stone-400' : 'text-stone-500'}`}>Our oracle is weaving your personalised {tool.name}. This usually takes 2–5 minutes.</p>
            <div className="flex justify-center gap-2 mb-3">
              {[0, 200, 400].map(d => <div key={d} className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" style={{ animationDelay: `${d}ms` }} />)}
            </div>
            <p className={`text-xs ${dm ? 'text-stone-500' : 'text-stone-400'}`}>Checking every 5 seconds… ({pollCount} checks)</p>
          </Card>
        )}

        {/* Failed */}
        {readingStatus === 'failed' && (
          <Card className={`p-8 mb-6 text-center ${dm ? 'bg-stone-800 border-stone-700' : ''}`}>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className={`text-lg font-serif mb-2 ${dm ? 'text-stone-200' : 'text-stone-800'}`}>Something went wrong</h3>
            <p className={`text-sm mb-4 ${dm ? 'text-stone-400' : 'text-stone-500'}`}>
              Please contact support@kayalsoulpath.com quoting reference: <code className="bg-neutral-100 px-1 rounded text-xs">{jobId}</code>
            </p>
            <Button onClick={() => router.push('/member/dashboard')} variant="outline">Back to Dashboard</Button>
          </Card>
        )}

        {/* Reading grid */}
        {(readingStatus === 'completed' || readingStatus === 'loading') && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className={`p-4 sticky top-24 ${dm ? 'bg-stone-800 border-stone-700' : ''}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${dm ? 'text-stone-400' : 'text-stone-400'}`}>Your Reading</h3>
                <nav className="space-y-1">
                  {sections.map((s, i) => {
                    const Icon = s.icon
                    return (
                      <button key={i} onClick={() => { setCurrentSection(i); handleStopAudio() }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                          currentSection === i
                            ? dm ? 'bg-primary-900/50 text-primary-300 font-medium' : 'bg-primary-50 text-primary-700 font-medium'
                            : dm ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100'
                        }`}>
                        <Icon className={`w-4 h-4 flex-shrink-0 ${currentSection === i ? dm ? 'text-primary-400' : 'text-primary-600' : 'text-stone-400'}`} />
                        <span className="truncate leading-tight">{s.title}</span>
                      </button>
                    )
                  })}
                </nav>
                <div className="mt-5 space-y-2">
                  {readingContent && (
                    <button onClick={handleDownload} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${dm ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>
                      <Download className="w-3.5 h-3.5" />Download Reading
                    </button>
                  )}
                  <Button variant="outline" fullWidth onClick={() => router.push('/member/dashboard')} className="text-xs">← My Dashboard</Button>
                </div>
              </Card>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <Card className={`p-6 ${dm ? 'bg-stone-800 border-stone-700' : ''}`}>
                <div className={`flex items-center justify-between gap-3 mb-6 pb-4 border-b ${dm ? 'border-stone-700' : 'border-stone-200'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${dm ? config.darkBg : config.lightBg} flex items-center justify-center flex-shrink-0`}>
                      <SectionIcon className={`w-5 h-5 ${dm ? 'text-primary-400' : 'text-primary-600'}`} />
                    </div>
                    <div className="min-w-0">
                      <h2 className={`text-lg sm:text-xl font-serif truncate ${dm ? 'text-stone-200' : 'text-stone-800'}`}>{sections[currentSection]?.title}</h2>
                      <p className={`text-xs ${dm ? 'text-stone-400' : 'text-stone-500'}`}>{tool.name}</p>
                    </div>
                  </div>
                  {readingContent && (
                    <button onClick={handlePlayPause} className={`p-2 rounded-xl flex-shrink-0 transition-colors ${isPlaying ? 'bg-primary-100 text-primary-700' : dm ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-400 hover:bg-stone-100'}`}>
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                <div className={`leading-relaxed whitespace-pre-line text-base ${dm ? 'text-stone-300' : 'text-stone-700'}`}>
                  {readingStatus === 'loading' ? (
                    <div className="space-y-3">
                      {[90, 82, 75, 88, 65, 78, 70].map((w, i) => (
                        <div key={i} className={`h-4 rounded-lg animate-pulse ${dm ? 'bg-stone-700' : 'bg-stone-100'}`} style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  ) : sections[currentSection]?.content}
                </div>

                <div className={`flex items-center justify-between mt-8 pt-5 border-t ${dm ? 'border-stone-700' : 'border-stone-200'}`}>
                  <button onClick={() => { setCurrentSection(p => Math.max(0, p - 1)); handleStopAudio() }} disabled={currentSection === 0}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${dm ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100'}`}>
                    <ChevronLeft className="w-4 h-4" />Previous
                  </button>
                  <span className={`text-xs ${dm ? 'text-stone-500' : 'text-stone-400'}`}>{currentSection + 1} of {sections.length}</span>
                  <button onClick={() => { setCurrentSection(p => Math.min(sections.length - 1, p + 1)); handleStopAudio() }} disabled={currentSection === sections.length - 1}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${dm ? 'text-stone-400 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100'}`}>
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