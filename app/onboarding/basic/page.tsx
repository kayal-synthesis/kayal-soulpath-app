'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  User,
  ArrowRight,
  Check,
  Loader2,
  Heart,
  Star,
  Moon,
  Compass,
  Infinity,
  Feather,
  Share2,
  X,
  Sun,
  Zap,
  Brain,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react'
import { format, subYears } from 'date-fns'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'

// ============================================
// WELCOME MODAL - DYNAMIC FROM BACKEND
// ============================================

interface WelcomeParagraph {
  icon: string
  title: string
  content: string
  bg: string
  border: string
  iconBg: string
}

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  welcomeData: {
    life_path: number
    age: number
    paragraphs: WelcomeParagraph[]
  } | null
  onShare: () => void
}

const WelcomeModal = ({ isOpen, onClose, welcomeData, onShare }: WelcomeModalProps) => {
  const [isVisible, setIsVisible] = useState(isOpen)
  const [showAllInsights, setShowAllInsights] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.5 },
        colors: ['#5D3FD3', '#D4AF37', '#9F7AEA'],
        startVelocity: 20,
        decay: 0.9,
        ticks: 200
      })
    }
  }, [isOpen])

  const handleClose = () => {
    setIsVisible(false)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose()
  }

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      Star: <Star className="w-5 h-5 text-primary-600" />,
      Heart: <Heart className="w-5 h-5 text-rose-500" />,
      Compass: <Compass className="w-5 h-5 text-emerald-600" />,
      Moon: <Moon className="w-5 h-5 text-indigo-500" />,
      Feather: <Feather className="w-5 h-5 text-amber-600" />,
      Infinity: <Infinity className="w-5 h-5 text-purple-500" />,
      Sparkles: <Sparkles className="w-5 h-5 text-secondary-600" />,
    }
    return icons[iconName] || <Sparkles className="w-5 h-5 text-primary-600" />
  }

  if (!isVisible || !welcomeData) return null

  const { paragraphs } = welcomeData
  const firstThree = paragraphs.slice(0, 3)
  const remaining = paragraphs.slice(3)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 px-6 py-6 text-center flex-shrink-0">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary-400 rounded-full blur-3xl" />
              </div>
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white z-10"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', damping: 15 }}
                className="relative z-10 w-14 h-14 mx-auto mb-3"
              >
                <div className="absolute inset-0 bg-white/20 rounded-full blur-md" />
                <div className="relative w-full h-full bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                  <Sparkles className="w-6 h-6 text-secondary-300" />
                </div>
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-serif text-white mb-1"
              >
                Welcome, {welcomeData.life_path ? `Seeker` : `Traveler`}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-secondary-300"
              >
                Your cosmic signature is ready
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex items-center justify-center gap-2 mt-4"
              >
                <div className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full flex items-center gap-1.5 border border-white/20">
                  <Sparkles className="w-3 h-3 text-secondary-300" />
                  <span className="text-xs text-white">{welcomeData.age} years</span>
                </div>
                <div className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full flex items-center gap-1.5 border border-white/20">
                  <Star className="w-3 h-3 text-secondary-300" />
                  <span className="text-xs text-white">Life Path {welcomeData.life_path}</span>
                </div>
              </motion.div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-200">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                {firstThree.map((p, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + idx * 0.07 }}
                    className={`flex gap-4 p-4 ${p.bg} rounded-xl border ${p.border} hover:shadow-md transition-all`}
                  >
                    <div className={`w-10 h-10 ${p.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      {getIcon(p.icon)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-serif text-neutral-900 mb-1.5">{p.title}</h3>
                      <p className="text-sm text-neutral-600 leading-relaxed">{p.content}</p>
                    </div>
                  </motion.div>
                ))}

                {remaining.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                    <button
                      onClick={() => setShowAllInsights(!showAllInsights)}
                      className="w-full py-3 px-4 bg-neutral-50 hover:bg-neutral-100 rounded-xl flex items-center justify-center gap-2 text-sm text-neutral-600 transition-colors group"
                    >
                      {showAllInsights ? (
                        <><ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition" />Show less insights</>
                      ) : (
                        <><ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition" />Reveal {remaining.length} more {remaining.length === 1 ? 'insight' : 'insights'}</>
                      )}
                    </button>
                  </motion.div>
                )}

                <AnimatePresence>
                  {showAllInsights && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      {remaining.map((p, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + idx * 0.05 }}
                          className={`flex gap-4 p-4 ${p.bg} rounded-xl border ${p.border} hover:shadow-md transition-all`}
                        >
                          <div className={`w-10 h-10 ${p.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            {getIcon(p.icon)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-serif text-neutral-900 mb-1.5">{p.title}</h3>
                            <p className="text-sm text-neutral-600 leading-relaxed">{p.content}</p>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex justify-center mt-6"
              >
                <button
                  onClick={onShare}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-sm text-neutral-700 transition-colors group"
                >
                  <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Share this moment</span>
                </button>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-neutral-50 border-t border-neutral-200 flex gap-3 flex-shrink-0">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-white border border-neutral-300 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:border-neutral-400 active:scale-[0.98] transition-all duration-150"
              >
                Maybe Later
              </button>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl text-sm font-medium text-white hover:from-primary-700 hover:to-secondary-700 active:scale-[0.98] shadow-md hover:shadow-lg transition-all duration-150"
              >
                Begin Journey
                <ArrowRight className="w-4 h-4 inline ml-2" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 }
}

const dotVariants = {
  animate: {
    y: [0, -5, 0],
    transition: {
      duration: 1,
      repeat: Infinity,
      repeatType: "loop" as const,
      ease: "easeInOut"
    }
  }
}

// ============================================
// BACKGROUND
// ============================================

const ElegantBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
    <div className="absolute inset-0 opacity-[0.02]" 
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #5D3FD3 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} 
    />
    <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-primary-100/20 rounded-full blur-[100px]" />
    <div className="absolute bottom-20 right-20 w-[600px] h-[600px] bg-secondary-100/20 rounded-full blur-[120px]" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary-50/30 to-secondary-50/30 rounded-full blur-[150px]" />
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent" />
  </div>
)

// ============================================
// TOOLTIP & WHY SECTION
// ============================================

const InfoTooltip = ({ content }: { content: string }) => {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} className="cursor-help">
        <HelpCircle className="w-3.5 h-3.5 text-neutral-400 hover:text-neutral-600 transition" />
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-neutral-800 text-white text-xs rounded-lg shadow-lg z-50"
          >
            <div className="relative">
              {content}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div className="w-2 h-2 bg-neutral-800 rotate-45" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const WhySection = ({ title, explanation }: { title: string; explanation: string }) => {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition"
      >
        <Info className="w-3 h-3" />
        <span>Why do we need this?</span>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <p className="text-xs text-neutral-600">{explanation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BasicInfoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAnonymousUser, user, hasSeenWelcomeModal, setHasSeenWelcomeModal } = useAnonymousStore()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    birthTime: '',
    birthLocation: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeData, setWelcomeData] = useState<any>(null)
  const [loadingWelcome, setLoadingWelcome] = useState(false)
  const [mascotMessage, setMascotMessage] = useState("Welcome. Let's begin your journey.")
  const [isClient, setIsClient] = useState(false)
  const [error, setError] = useState('')
  // ── NEW: track whether data came from URL params ──────────────
  const [prefilled, setPrefilled] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // ── NEW: Read URL params from kayalsoulpath.com free tools ─────
  // Expected params: ?name=John&dob=1990-05-15&birthTime=14:30&birthLocation=Lagos,Nigeria
  useEffect(() => {
    if (!isClient) return

    const urlName     = searchParams.get('name')?.trim() || ''
    const urlDob      = searchParams.get('dob') || ''
    const urlTime     = searchParams.get('birthTime') || ''
    const urlLocation = searchParams.get('birthLocation') || ''

    if (urlName || urlDob) {
      setFormData({
        name:          urlName,
        dob:           urlDob,
        birthTime:     urlTime,
        birthLocation: urlLocation
      })
      setPrefilled(true)

      if (urlName && urlDob) {
        // Both required fields present — skip onboarding, go straight to step 3
        // User just needs to confirm, no typing required
        setStep(3)
        setMascotMessage(`Welcome back, ${urlName}. Your details are ready.`)
      } else if (urlName) {
        // Only name — skip to DOB step
        setStep(1)
        setMascotMessage(`Welcome, ${urlName}. When were you born?`)
      }
    }
  }, [isClient, searchParams])

  // Show welcome modal once user + welcomeData are both ready
  useEffect(() => {
    if (user && !hasSeenWelcomeModal && welcomeData) {
      setShowWelcome(true)
    }
  }, [user, hasSeenWelcomeModal, welcomeData])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canProceed() && !isLoading) handleNext()
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [step, formData, isLoading])

  // Exit intent
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formData.name || formData.dob) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [formData])

  const messages = [
    "What name shall I call you?",
    "When were you born?",
    "Your birth time?",
    "Your birthplace?"
  ]

  const calculateAge = (dob: string) => {
    const today = new Date()
    const birth = new Date(dob)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const validateStep = () => {
    if (step === 0 && !formData.name.trim()) { setError('Please enter your name'); return false }
    if (step === 1 && !formData.dob)         { setError('Please select your birth date'); return false }
    setError('')
    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    if (step < 3) {
      setStep(step + 1)
      setMascotMessage(messages[step + 1])
      confetti({ particleCount: 15, spread: 35, origin: { y: 0.6 }, colors: ['#5D3FD3', '#D4AF37'] })
    } else {
      handleSubmit()
    }
  }

  const handleSkip = () => {
    if (step === 2 || step === 3) {
      if (step === 3) { handleSubmit(); return }
      setStep(step + 1)
      setMascotMessage(messages[3])
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setMascotMessage("Reading your cosmic signature...")

    await new Promise(resolve => setTimeout(resolve, prefilled ? 1200 : 2000))

    document.cookie = "anonymous-session=true; path=/; max-age=2592000"

    const sessionId = Math.random().toString(36).substring(2)
    setAnonymousUser({
      sessionId,
      name: formData.name,
      dob: formData.dob,
      birthTime: formData.birthTime,
      birthLocation: formData.birthLocation,
      firstVisit: new Date(),
      lastVisit: new Date(),
      visitCount: 1,
      viewedTools: []
    })

    setLoadingWelcome(true)
    try {
      const response = await fetch('${process.env.NEXT_PUBLIC_SYNTHESIS_ENGINE_URL}/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          dob: formData.dob,
          birth_time: formData.birthTime || null,
          birth_location: formData.birthLocation || null,
          session_id: sessionId
        })
      })
      if (!response.ok) throw new Error('Failed to fetch welcome reading')
      const data = await response.json()
      setWelcomeData(data)
    } catch (err) {
      console.error(err)
      setWelcomeData({
        life_path: 7,
        age: calculateAge(formData.dob),
        paragraphs: [{
          icon: "Star",
          title: "Your Journey Begins",
          content: "We couldn't personalise your welcome reading right now, but your journey is already unfolding. Explore our tools to discover what the universe has in store for you.",
          bg: "bg-primary-50",
          border: "border-primary-100",
          iconBg: "bg-primary-100"
        }]
      })
    } finally {
      setLoadingWelcome(false)
      setIsLoading(false)
    }
  }

  const handleWelcomeClose = () => {
    setShowWelcome(false)
    setHasSeenWelcomeModal(true)
    router.push('/dashboard')
  }

  const handleShare = () => {
    const shareText = encodeURIComponent(`I just discovered my Life Path number on Kayal LifeOS. The insights are surprisingly accurate! ✨`)
    window.open(`https://wa.me/?text=${shareText}`, '_blank')
    toast.success('Opening WhatsApp...')
    confetti({ particleCount: 15, spread: 35, origin: { y: 0.6 }, colors: ['#5D3FD3', '#D4AF37'] })
  }

  const canProceed = () => {
    if (step === 0) return formData.name.trim()
    if (step === 1) return formData.dob
    return true
  }

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen relative overflow-hidden">
        <ElegantBackground />
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">

            {/* Value Props */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center gap-4 mb-6"
            >
              <div className="text-center">
                <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-1">
                  <Star className="w-4 h-4 text-primary-600" />
                </div>
                <p className="text-xs text-neutral-500">Life Path</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-1">
                  <Heart className="w-4 h-4 text-secondary-600" />
                </div>
                <p className="text-xs text-neutral-500">Purpose</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-1">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs text-neutral-500">Destiny</p>
              </div>
            </motion.div>

            {/* Main Card */}
            <motion.div variants={scaleIn} initial="initial" animate="animate" transition={{ duration: 0.4 }}>
              <Card className="bg-white/90 backdrop-blur-sm border-neutral-200/60 shadow-xl">
                <div className="p-6">

                  {/* ── NEW: Pre-filled banner ── */}
                  {prefilled && formData.name && formData.dob && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 bg-primary-50 border border-primary-100 rounded-xl flex items-start gap-3"
                    >
                      <Check className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-primary-700">Details carried over from KAYAL SoulPath</p>
                        <p className="text-xs text-primary-500 mt-0.5">
                          {formData.name} · {formData.dob}
                          {formData.birthLocation && ` · ${formData.birthLocation}`}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Step Indicators */}
                  <div className="flex justify-between mb-6">
                    {['Name', 'Birth', 'Time', 'Place'].map((label, i) => (
                      <div key={i} className="flex-1 text-center">
                        <div className={`text-xs mb-1 transition-colors duration-300 ${i <= step ? 'text-primary-600' : 'text-neutral-300'}`}>
                          {label}
                        </div>
                        <div className={`h-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-primary-600' : 'bg-neutral-200'}`} />
                      </div>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      variants={fadeInUp}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {/* Step 0 - Name */}
                      {step === 0 && (
                        <div className="space-y-2">
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setError('') }}
                              className="w-full pl-10 pr-10 py-3 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all duration-200"
                              placeholder=" "
                              autoFocus
                            />
                            <label className={`absolute left-10 transition-all duration-200 pointer-events-none ${formData.name ? '-top-2 text-xs bg-white px-1 text-primary-600' : 'top-3 text-sm text-neutral-400'}`}>
                              Your full name
                            </label>
                            {formData.name && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Check className="w-4 h-4 text-green-500" />
                              </motion.div>
                            )}
                          </div>
                          <WhySection title="Why we need your name" explanation="Your name carries vibrational energy that helps us personalise your reading. It's how we'll address you throughout your journey." />
                        </div>
                      )}

                      {/* Step 1 - Date of Birth */}
                      {step === 1 && (
                        <div className="space-y-2">
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                              type="date"
                              value={formData.dob}
                              onChange={(e) => { setFormData({ ...formData, dob: e.target.value }); setError('') }}
                              max={format(new Date(), 'yyyy-MM-dd')}
                              min={format(subYears(new Date(), 120), 'yyyy-MM-dd')}
                              className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                            />
                          </div>
                          {formData.dob && (
                            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-primary-600 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              You'll be {calculateAge(formData.dob)} years young
                            </motion.p>
                          )}
                          <WhySection title="Why we need your birth date" explanation="Your birth date is the key to calculating your Life Path number, which reveals your soul's purpose and the challenges you're meant to overcome." />
                        </div>
                      )}

                      {/* Step 2 - Birth Time (optional) */}
                      {step === 2 && (
                        <div className="space-y-2">
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                              type="time"
                              value={formData.birthTime}
                              onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                            />
                          </div>
                          <button onClick={handleSkip} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-1">
                            Skip this step <ArrowRight className="w-3 h-3" />
                          </button>
                          <WhySection title="Why we ask for birth time" explanation="Birth time adds precision to your astrological chart, revealing your rising sign and the exact positions of planets at your birth. Optional but recommended for deeper insights." />
                        </div>
                      )}

                      {/* Step 3 - Birth Location (optional) */}
                      {step === 3 && (
                        <div className="space-y-2">
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                              type="text"
                              value={formData.birthLocation}
                              onChange={(e) => setFormData({ ...formData, birthLocation: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                              placeholder="City, Country"
                            />
                          </div>
                          <button onClick={handleSkip} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-1">
                            Skip this step <ArrowRight className="w-3 h-3" />
                          </button>
                          <WhySection title="Why we ask for birth location" explanation="Your birthplace provides geographic context for your astrological chart, affecting house positions and adding cultural depth to your reading. Optional but enriches your profile." />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {error && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-500 mt-2">
                      {error}
                    </motion.p>
                  )}

                  {/* Navigation */}
                  <div className="flex gap-3 mt-6">
                    {step > 0 && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1">
                        <Button variant="outline" onClick={() => setStep(step - 1)} className="w-full border-neutral-200 active:scale-[0.98] transition-transform">
                          Back
                        </Button>
                      </motion.div>
                    )}
                    <motion.div className={step === 0 ? 'flex-1' : 'flex-[2]'} whileTap={{ scale: 0.98 }}>
                      <Button onClick={handleNext} disabled={!canProceed() || isLoading} className="w-full active:scale-[0.98] transition-transform">
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            {step === 3 ? (prefilled ? 'Complete Setup' : 'Complete') : 'Continue'}
                            {step < 3 && <ArrowRight className="w-4 h-4 ml-2" />}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>

                  <p className="mt-4 text-center text-xs text-neutral-500 animate-pulse">{mascotMessage}</p>

                  {isLoading && (
                    <div className="flex justify-center gap-1 mt-2">
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} custom={i} variants={dotVariants} animate="animate" className="w-1 h-1 bg-primary-400 rounded-full" />
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-center text-xs text-neutral-400"
            >
              <span className="mx-2">🔒 256-bit</span>
              <span className="mx-2">✨ 50k+ seekers</span>
              <span className="mx-2">⭐ 4.9/5</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Welcome Modal */}
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
