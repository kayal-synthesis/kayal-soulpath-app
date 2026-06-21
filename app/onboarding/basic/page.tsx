'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import {
  Sparkles, Calendar, Clock, MapPin, User, ArrowRight,
  Check, Loader2, Heart, Star, Moon, Compass, Infinity,
  Feather, Share2, X, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { format, subYears } from 'date-fns'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'

// â”€â”€â”€ CSS-only star field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StarField() {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    duration: Math.random() * 4 + 3,
    delay: Math.random() * 5,
  }))
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animation: `twinkle ${s.duration}s ${s.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  )
}

// â”€â”€â”€ CSS-only cosmic background â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CosmicBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a0533 35%, #24074a 60%, #0d1b3e 100%)'
      }} />
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />
      <div className="absolute rounded-full" style={{
        width: 600, height: 600, top: '-20%', left: '-10%',
        background: 'radial-gradient(circle, rgba(147,51,234,0.25) 0%, transparent 70%)',
        animation: 'blob1 8s ease-in-out infinite',
      }} />
      <div className="absolute rounded-full" style={{
        width: 500, height: 500, bottom: '-15%', right: '-10%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
        animation: 'blob2 10s 2s ease-in-out infinite',
      }} />
      <div className="absolute rounded-full" style={{
        width: 300, height: 300, top: '40%', right: '20%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
        animation: 'blob3 6s 1s ease-in-out infinite',
      }} />
      <StarField />
    </div>
  )
}

// â”€â”€â”€ Welcome Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface WelcomeParagraph {
  icon: string; title: string; content: string
  bg: string; border: string; iconBg: string
}

function WelcomeModal({ isOpen, onClose, welcomeData, onShare }: {
  isOpen: boolean; onClose: () => void
  welcomeData: { life_path: number; age: number; paragraphs: WelcomeParagraph[] } | null
  onShare: () => void
}) {
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 60, spread: 70, origin: { y: 0.4 },
        colors: ['#a855f7', '#D4AF37', '#818cf8', '#38bdf8'],
        startVelocity: 25, decay: 0.92, ticks: 250,
      })
    }
  }, [isOpen])

  const getIcon = (name: string) => {
    const map: Record<string, React.ReactNode> = {
      Star:     <Star     className="w-5 h-5 text-amber-400" />,
      Heart:    <Heart    className="w-5 h-5 text-rose-400" />,
      Compass:  <Compass  className="w-5 h-5 text-emerald-400" />,
      Moon:     <Moon     className="w-5 h-5 text-indigo-400" />,
      Feather:  <Feather  className="w-5 h-5 text-amber-500" />,
      Infinity: <Infinity className="w-5 h-5 text-purple-400" />,
      Sparkles: <Sparkles className="w-5 h-5 text-violet-400" />,
    }
    return map[name] || <Sparkles className="w-5 h-5 text-violet-400" />
  }

  if (!isOpen || !welcomeData) return null
  const first = welcomeData.paragraphs.slice(0, 3)
  const rest  = welcomeData.paragraphs.slice(3)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(10,5,25,0.85)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col rounded-3xl"
          style={{
            background: 'linear-gradient(145deg, #1a0a2e, #0f1a3e)',
            border: '1px solid rgba(168,85,247,0.3)',
            boxShadow: '0 0 60px rgba(168,85,247,0.15)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-6 py-7 text-center flex-shrink-0 overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.3), rgba(59,130,246,0.2))' }} />
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }} />
            <button
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition text-white/50 hover:text-white z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative z-10 w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full blur-lg" style={{ background: 'rgba(168,85,247,0.5)' }} />
              <div className="relative w-full h-full rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(59,130,246,0.3))', border: '1px solid rgba(168,85,247,0.4)' }}>
                <Sparkles className="w-7 h-7 text-violet-300" />
              </div>
            </div>
            <h2 className="text-2xl font-serif text-white mb-1 relative z-10" style={{ fontFamily: 'Georgia, serif' }}>
              Your Blueprint Awaits
            </h2>
            <p className="text-sm text-violet-300 relative z-10">
              We already see what makes you distinct
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 relative z-10">
              <div className="px-3 py-1 rounded-full flex items-center gap-1.5"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span className="text-xs text-white">{welcomeData.age} years</span>
              </div>
              <div className="px-3 py-1 rounded-full flex items-center gap-1.5"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Star className="w-3 h-3 text-amber-300" />
                <span className="text-xs text-white">Life Path {welcomeData.life_path}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(168,85,247,0.3) transparent' }}>
            {first.map((p, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(168,85,247,0.15)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(168,85,247,0.15)' }}>
                  {getIcon(p.icon)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>{p.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{p.content}</p>
                </div>
              </div>
            ))}
            {rest.length > 0 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-3 rounded-xl text-xs text-violet-300 flex items-center justify-center gap-2 transition"
                style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}
              >
                {showAll
                  ? <><ChevronUp className="w-3.5 h-3.5" />Show less</>
                  : <><ChevronDown className="w-3.5 h-3.5" />Reveal {rest.length} more insights</>}
              </button>
            )}
            <AnimatePresence>
              {showAll && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  {rest.map((p, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(168,85,247,0.15)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(168,85,247,0.15)' }}>
                        {getIcon(p.icon)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>{p.title}</h3>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{p.content}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-5 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(168,85,247,0.15)' }}>
            <button
              onClick={onShare}
              className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button
              onClick={onClose}
              className="flex-[2] py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
            >
              Begin My Journey <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// â”€â”€â”€ Why tooltip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function WhySection({ explanation }: { explanation: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs transition"
        style={{ color: 'rgba(168,85,247,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <Info className="w-3 h-3" />
        <span>Why do we need this?</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 rounded-xl text-xs leading-relaxed"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)', color: 'rgba(255,255,255,0.55)' }}>
              {explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BasicInfoPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const {
    setAnonymousUser, user, hasSeenWelcomeModal,
    setHasSeenWelcomeModal, hasCompletedOnboarding,
  } = useAnonymousStore()

  const [step,        setStep]        = useState(0)
  const [formData,    setFormData]    = useState({ name: '', dob: '', birthTime: '', birthLocation: '' })
  const [isLoading,   setIsLoading]   = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeData, setWelcomeData] = useState<any>(null)
  const [isClient,    setIsClient]    = useState(false)
  const [error,       setError]       = useState('')
  const [prefilled,   setPrefilled]   = useState(false)

  useEffect(() => { setIsClient(true) }, [])

  useEffect(() => {
    if (!isClient) return
    if (hasCompletedOnboarding()) router.replace('/dashboard')
  }, [isClient, hasCompletedOnboarding, router])

  useEffect(() => {
    if (!isClient) return
    const urlName     = searchParams.get('name')?.trim() || ''
    const urlDob      = searchParams.get('dob') || ''
    const urlTime     = searchParams.get('birthTime') || ''
    const urlLocation = searchParams.get('birthLocation') || ''
    if (urlName || urlDob) {
      setFormData({ name: urlName, dob: urlDob, birthTime: urlTime, birthLocation: urlLocation })
      setPrefilled(true)
      if (urlName && urlDob) setStep(3)
      else if (urlName) setStep(1)
    }
  }, [isClient, searchParams])

  useEffect(() => {
    if (user && !hasSeenWelcomeModal && welcomeData) setShowWelcome(true)
  }, [user, hasSeenWelcomeModal, welcomeData])

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canProceed() && !isLoading) handleNext()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [step, formData, isLoading])

  const calculateAge = (dob: string) => {
    const today = new Date(), birth = new Date(dob)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const canProceed = () => {
    if (step === 0) return formData.name.trim()
    if (step === 1) return formData.dob
    return true
  }

  const handleNext = () => {
    if (step === 0 && !formData.name.trim()) { setError('Please enter your name'); return }
    if (step === 1 && !formData.dob)         { setError('Please select your birth date'); return }
    setError('')
    if (step < 3) {
      setStep(step + 1)
      confetti({ particleCount: 12, spread: 30, origin: { y: 0.6 }, colors: ['#a855f7', '#D4AF37'] })
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    await new Promise(r => setTimeout(r, prefilled ? 1200 : 2000))
    document.cookie = 'anonymous-session=true; path=/; max-age=2592000'
    const sessionId = Math.random().toString(36).substring(2)
    setAnonymousUser({
      sessionId, name: formData.name, dob: formData.dob,
      birthTime: formData.birthTime, birthLocation: formData.birthLocation,
      firstVisit: new Date(), lastVisit: new Date(), visitCount: 1, viewedTools: [],
    })
    try {
      const res = await fetch('https://api.kayalsoulpath.com/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name, dob: formData.dob,
          birth_time: formData.birthTime || null,
          birth_location: formData.birthLocation || null,
          session_id: sessionId,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setWelcomeData(await res.json())
    } catch {
      setWelcomeData({
        life_path: 7,
        age: calculateAge(formData.dob),
        paragraphs: [{
          icon: 'Star', title: 'Your Journey Begins',
          content: 'Your cosmic blueprint is being prepared. Explore our tools to discover what the universe has in store for you.',
          bg: '', border: '', iconBg: '',
        }],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleWelcomeClose = () => {
    setShowWelcome(false)
    setHasSeenWelcomeModal(true)
    router.push('/dashboard')
  }

  const handleShare = () => {
    const text = encodeURIComponent('I just discovered my Life Path number on KAYAL SoulPath. The insights are surprisingly accurate! âœ¨ https://app.kayalsoulpath.com')
    window.open(`https://wa.me/?text=${text}`, '_blank')
    toast.success('Opening WhatsApp...')
  }

  if (!isClient) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0c29' }}>
      <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
    </div>
  )

  const steps = [
    { label: 'Name',  icon: User     },
    { label: 'Birth', icon: Calendar },
    { label: 'Time',  icon: Clock    },
    { label: 'Place', icon: MapPin   },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 14px 14px 44px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(168,85,247,0.25)',
    borderRadius: 14, color: 'white', fontSize: 16,
    outline: 'none', transition: 'all 0.2s',
    WebkitAppearance: 'none',
    colorScheme: 'dark',
  }

  const inputFocusStyle = {
    borderColor: 'rgba(168,85,247,0.6)',
    boxShadow: '0 0 0 3px rgba(168,85,247,0.12)',
  }

  return (
    <>
      <div style={{ minHeight: '100dvh', position: 'relative', overflow: 'hidden' }}>
        <CosmicBackground />

        <div style={{
          position: 'relative', zIndex: 10, minHeight: '100dvh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px 16px',
        }}>
          <div style={{ width: '100%', maxWidth: 440 }}>

            {/* Brand Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{ textAlign: 'center', marginBottom: 32 }}
            >
              <div style={{
                fontSize: 48, marginBottom: 12, display: 'block',
                animation: 'rockem 6s ease-in-out infinite',
              }}>
                ðŸ”®
              </div>
              <h1 style={{
                fontFamily: 'Georgia, serif',
                fontSize: 'clamp(22px, 5vw, 28px)',
                fontWeight: 400, color: 'white',
                marginBottom: 8, letterSpacing: '-0.02em',
              }}>
                KAYAL SoulPath
              </h1>
              <p style={{
                fontSize: 13, color: 'rgba(168,85,247,0.8)',
                letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16,
              }}>
                Ancient Wisdom Â· Modern Synthesis
              </p>
              <p style={{
                fontSize: 14, color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.7, maxWidth: 360, margin: '0 auto',
              }}>
                We synthesise numerology, astrology, palmistry and physiognomy into one precise, personalised reading â€” built entirely from your birth data.
              </p>
            </motion.div>

            {/* What you'll discover */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}
            >
              {[
                { emoji: 'â­', label: 'Life Path & Soul Purpose' },
                { emoji: 'ðŸ’«', label: 'Timing & Current Cycle'  },
                { emoji: 'ðŸ’Ž', label: 'Wealth, Love & Health'   },
              ].map((item, i) => (
                <div key={i} style={{
                  textAlign: 'center', padding: '14px 8px',
                  borderRadius: 16, background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(168,85,247,0.15)',
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{item.emoji}</div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{item.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{
                borderRadius: 24, padding: '28px 24px',
                background: 'rgba(15,12,40,0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(168,85,247,0.2)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(168,85,247,0.08)',
              }}
            >
              {/* Pre-filled banner */}
              {prefilled && formData.name && formData.dob && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginBottom: 20, padding: '12px 14px', borderRadius: 12,
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
                  }}
                >
                  <Check style={{ width: 14, height: 14, color: '#a855f7', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#a855f7' }}>Details carried over</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{formData.name} Â· {formData.dob}</p>
                  </div>
                </motion.div>
              )}

              {/* Step indicators */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                {steps.map((s, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 9, textAlign: 'center', marginBottom: 5,
                      fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: i <= step ? '#a855f7' : 'rgba(255,255,255,0.2)',
                      transition: 'color 0.3s',
                    }}>
                      {s.label}
                    </div>
                    <div style={{
                      height: 3, borderRadius: 2, transition: 'all 0.4s',
                      background: i < step
                        ? '#a855f7'
                        : i === step
                        ? 'linear-gradient(90deg, #a855f7, #7c3aed)'
                        : 'rgba(255,255,255,0.1)',
                    }} />
                  </div>
                ))}
              </div>

              {/* Step content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16, textAlign: 'center' }}>
                    {['What name shall I call you?', 'When were you born?', 'What time were you born?', 'Where were you born?'][step]}
                  </p>

                  {/* Step 0 â€” Name */}
                  {step === 0 && (
                    <div>
                      <div style={{ position: 'relative' }}>
                        <User style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(168,85,247,0.6)' }} />
                        <input
                          type="text" autoFocus
                          value={formData.name}
                          onChange={e => { setFormData({ ...formData, name: e.target.value }); setError('') }}
                          placeholder="Your full name"
                          style={inputStyle}
                          onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                          onBlur={e => { e.target.style.borderColor = 'rgba(168,85,247,0.25)'; e.target.style.boxShadow = 'none' }}
                        />
                        {formData.name && (
                          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                            <Check style={{ width: 16, height: 16, color: '#4ade80' }} />
                          </div>
                        )}
                      </div>
                      <WhySection explanation="Your name carries vibrational energy that helps us personalise your reading. It's used to calculate your Destiny and Soul Urge numbers." />
                    </div>
                  )}

                  {/* Step 1 â€” DOB */}
                  {step === 1 && (
                    <div>
                      <div style={{ position: 'relative' }}>
                        <Calendar style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(168,85,247,0.6)', zIndex: 1 }} />
                        <input
                          type="date" autoFocus
                          value={formData.dob}
                          onChange={e => { setFormData({ ...formData, dob: e.target.value }); setError('') }}
                          max={format(new Date(), 'yyyy-MM-dd')}
                          min={format(subYears(new Date(), 120), 'yyyy-MM-dd')}
                          style={inputStyle}
                          onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                          onBlur={e => { e.target.style.borderColor = 'rgba(168,85,247,0.25)'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                      {formData.dob && (
                        <p style={{ fontSize: 12, color: '#a855f7', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Sparkles style={{ width: 12, height: 12 }} />
                          You are {calculateAge(formData.dob)} years young
                        </p>
                      )}
                      <WhySection explanation="Your birth date is the foundation of your Life Path number â€” the most important number in your blueprint. It reveals your soul's core purpose." />
                    </div>
                  )}

                  {/* Step 2 â€” Birth Time */}
                  {step === 2 && (
                    <div>
                      <div style={{ position: 'relative' }}>
                        <Clock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(168,85,247,0.6)' }} />
                        <input
                          type="time" autoFocus
                          value={formData.birthTime}
                          onChange={e => setFormData({ ...formData, birthTime: e.target.value })}
                          style={inputStyle}
                          onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                          onBlur={e => { e.target.style.borderColor = 'rgba(168,85,247,0.25)'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                      <button
                        onClick={() => { setStep(3); confetti({ particleCount: 12, spread: 30, origin: { y: 0.6 }, colors: ['#a855f7'] }) }}
                        style={{ marginTop: 10, fontSize: 12, color: 'rgba(168,85,247,0.6)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        Skip this step <ArrowRight style={{ width: 12, height: 12 }} />
                      </button>
                      <WhySection explanation="Birth time enables full astrological chart analysis including your rising sign. Optional but significantly increases reading precision." />
                    </div>
                  )}

                  {/* Step 3 â€” Birth Location */}
                  {step === 3 && (
                    <div>
                      <div style={{ position: 'relative' }}>
                        <MapPin style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(168,85,247,0.6)' }} />
                        <input
                          type="text" autoFocus
                          value={formData.birthLocation}
                          onChange={e => setFormData({ ...formData, birthLocation: e.target.value })}
                          placeholder="City, Country"
                          style={inputStyle}
                          onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                          onBlur={e => { e.target.style.borderColor = 'rgba(168,85,247,0.25)'; e.target.style.boxShadow = 'none' }}
                        />
                      </div>
                      <WhySection explanation="Your birthplace provides geographic context for your astrological chart, affecting house placements and cultural depth. Optional but enriching." />
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>

              {error && (
                <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{error}</p>
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                {step > 0 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    style={{
                      flex: 1, padding: '14px', borderRadius: 14, fontSize: 14,
                      fontWeight: 500, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)', transition: 'all 0.2s',
                    }}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={!canProceed() || isLoading}
                  style={{
                    flex: step === 0 ? 1 : 2, padding: '14px', borderRadius: 14,
                    fontSize: 14, fontWeight: 600,
                    cursor: canProceed() && !isLoading ? 'pointer' : 'not-allowed',
                    border: 'none', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                    opacity: !canProceed() || isLoading ? 0.5 : 1,
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    boxShadow: canProceed() && !isLoading ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
                  }}
                >
                  {isLoading ? (
                    <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />Reading your signature...</>
                  ) : (
                    <>{step === 3 ? (prefilled ? 'Complete Setup' : 'Reveal My Blueprint') : 'Continue'}{step < 3 && <ArrowRight style={{ width: 16, height: 16 }} />}</>
                  )}
                </button>
              </div>

              {/* Loading dots â€” CSS only */}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#a855f7',
                      animation: `loadingdot 0.8s ${i * 0.15}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              )}
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              style={{ marginTop: 20, textAlign: 'center' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 10 }}>
                {[
                  { icon: 'ðŸ”’', label: '256-bit encrypted' },
                  { icon: 'âœ¨', label: '50k+ seekers'      },
                  { icon: 'â­', label: '4.9/5 rating'      },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13 }}>{item.icon}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                Your data is private and never shared with third parties
              </p>
            </motion.div>

          </div>
        </div>
      </div>

      {showWelcome && welcomeData && (
        <WelcomeModal
          isOpen={showWelcome}
          onClose={handleWelcomeClose}
          welcomeData={welcomeData}
          onShare={handleShare}
        />
      )}
    </>
  )
}

export default function BasicInfoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0c29' }}>
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    }>
      <BasicInfoPageInner />
    </Suspense>
  )
}