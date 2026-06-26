'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import {
  Sparkles, Calendar, Clock, MapPin, User, ArrowRight,
  Check, Loader2, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { format, subYears } from 'date-fns'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { buildNumerologyProfile } from '@/lib/welcome/numerology-engine'
import { buildAstrologyProfile }  from '@/lib/welcome/astrology-engine'
import { buildWelcomeCards }      from '@/lib/welcome/paragraph-library'
import { WelcomeModal }           from '@/components/welcome/WelcomeModal'
import type { WelcomeCard }       from '@/lib/welcome/paragraph-library'

// ── Star field ────────────────────────────────────────────────
function StarField() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    duration: Math.random() * 4 + 2,
    delay: Math.random() * 4,
  }))
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            animation: `twinkle ${s.duration}s ${s.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ── Cosmic background ─────────────────────────────────────────
function CosmicBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a0533 35%, #24074a 60%, #0d1b3e 100%)'
      }} />
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '32px 32px'
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

// ── Why tooltip ───────────────────────────────────────────────
function WhySection({ explanation }: { explanation: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs transition"
        style={{ color: 'rgba(168,85,247,0.6)' }}
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
            <div className="mt-2 p-3 rounded-xl text-xs leading-relaxed" style={{
              background: 'rgba(168,85,247,0.08)',
              border: '1px solid rgba(168,85,247,0.15)',
              color: 'rgba(255,255,255,0.55)',
            }}>
              {explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
function BasicInfoPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const {
    setAnonymousUser, user,
    hasSeenWelcomeModal, setHasSeenWelcomeModal,
    hasCompletedOnboarding,
  } = useAnonymousStore()

  const [step,        setStep]        = useState(0)
  const [formData,    setFormData]    = useState({ name: '', dob: '', birthTime: '', birthLocation: '' })
  const [isLoading,   setIsLoading]   = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [cards,       setCards]       = useState<WelcomeCard[]>([])
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
    const urlName     = searchParams.get('name')?.trim()     || ''
    const urlDob      = searchParams.get('dob')              || ''
    const urlTime     = searchParams.get('birthTime')        || ''
    const urlLocation = searchParams.get('birthLocation')    || ''
    if (urlName || urlDob) {
      setFormData({ name: urlName, dob: urlDob, birthTime: urlTime, birthLocation: urlLocation })
      setPrefilled(true)
      if (urlName && urlDob) setStep(3)
      else if (urlName)      setStep(1)
    }
  }, [isClient, searchParams])

  useEffect(() => {
    if (user && !hasSeenWelcomeModal && cards.length > 0) setShowWelcome(true)
  }, [user, hasSeenWelcomeModal, cards])

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
    if (step === 0) return formData.name.trim().length > 0
    if (step === 1) return formData.dob.length > 0
    return true
  }

  const handleNext = () => {
    if (step === 0 && !formData.name.trim()) { setError('Please enter your name'); return }
    if (step === 1 && !formData.dob)         { setError('Please select your birth date'); return }
    setError('')
    if (step < 3) {
      setStep(step + 1)
      confetti({
        particleCount: 12, spread: 30, origin: { y: 0.6 },
        colors: ['#a855f7', '#D4AF37'],
      })
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)

    // Small delay for UX — feels considered, not instant
    await new Promise(r => setTimeout(r, prefilled ? 1000 : 1800))

    // Set session cookie
    document.cookie = 'anonymous-session=true; path=/; max-age=2592000'
    const sessionId = Math.random().toString(36).substring(2)

    // Save user to store
    setAnonymousUser({
      sessionId,
      name:          formData.name,
      dob:           formData.dob,
      birthTime:     formData.birthTime,
      birthLocation: formData.birthLocation,
      firstVisit:    new Date(),
      lastVisit:     new Date(),
      visitCount:    1,
      viewedTools:   [],
    })

    try {
      // ── Build reading entirely client-side — zero API cost ──
      // Convert dob from YYYY-MM-DD to components
      const [yearStr, monthStr, dayStr] = formData.dob.split('-')
      const month = parseInt(monthStr)
      const day   = parseInt(dayStr)
      const year  = parseInt(yearStr)

      // Run both engines
      const numProfile = buildNumerologyProfile(formData.name, formData.dob)
      const astProfile = buildAstrologyProfile(month, day, year)

      // Build all 9 cards
      const welcomeCards = buildWelcomeCards(formData.name, numProfile, astProfile)
      setCards(welcomeCards)

      confetti({
        particleCount: 80, spread: 90, origin: { y: 0.4 },
        colors: ['#a855f7', '#D4AF37', '#818cf8', '#38bdf8'],
        startVelocity: 28, decay: 0.91, ticks: 280,
      })
    } catch (err) {
      console.error('Welcome engine error:', err)
      // Fallback — should never happen since it is pure math
      setCards([{
        section:    'Your Journey Begins',
        icon:       'Sparkles',
        paragraphs: [
          `${formData.name.split(' ')[0]}, your personal blueprint is ready. Welcome to KAYAL LifeOS.`,
          `Explore our tools to discover the insights your birth data reveals about your path, your purpose, and where you are right now.`,
        ],
      }])
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
    const text = encodeURIComponent(
      `I just discovered my personal soul blueprint on KAYAL LifeOS and the reading is surprisingly accurate. Try yours: https://app.kayalsoulpath.com`
    )
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
    borderRadius: 14, color: 'white', fontSize: 15,
    outline: 'none', transition: 'all 0.2s',
    WebkitAppearance: 'none',
  }

  const focusStyle: React.CSSProperties = {
    borderColor: 'rgba(168,85,247,0.6)',
    boxShadow: '0 0 0 3px rgba(168,85,247,0.12)',
  }

  const blurStyle: React.CSSProperties = {
    borderColor: 'rgba(168,85,247,0.25)',
    boxShadow: 'none',
  }

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.4); }
        }
        @keyframes blob1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50%       { transform: translate(30px,20px) scale(1.08); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50%       { transform: translate(-20px,30px) scale(1.06); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50%       { transform: translate(15px,-20px) scale(1.1); }
        }
        @keyframes rockem {
          0%, 100% { transform: rotate(-8deg) scale(1); }
          50%       { transform: rotate(8deg) scale(1.12); }
        }
        @keyframes loadingdot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50%       { transform: translateY(-6px); opacity: 1; }
        }
        input[type='date']::-webkit-calendar-picker-indicator,
        input[type='time']::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(0.4);
        }
      `}</style>

      <div style={{ minHeight: '100dvh', position: 'relative', overflow: 'hidden' }}>
        <CosmicBackground />

        <div style={{
          position: 'relative', zIndex: 10, minHeight: '100dvh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px 16px',
        }}>
          <div style={{ width: '100%', maxWidth: 440 }}>

            {/* Brand header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{ textAlign: 'center', marginBottom: 28 }}
            >
              <div style={{
                fontSize: 48, marginBottom: 12, display: 'block',
                animation: 'rockem 6s ease-in-out infinite',
              }}>
                🔮
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
                fontSize: 11, color: 'rgba(168,85,247,0.8)',
                letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14,
              }}>
                Ancient Wisdom · Modern Synthesis
              </p>
              <p style={{
                fontSize: 13, color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.75, maxWidth: 360, margin: '0 auto',
              }}>
                We synthesise your birth data into one precise, personalised reading — built entirely from the numbers and energies encoded in the moment you arrived.
              </p>
            </motion.div>

            {/* What you will discover */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10, marginBottom: 24,
              }}
            >
              {[
                { emoji: '⭐', label: 'Your Core Nature and Gifts' },
                { emoji: '💫', label: 'Where You Are Right Now' },
                { emoji: '💎', label: 'Love, Purpose and Destiny' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  style={{
                    textAlign: 'center', padding: '12px 8px', borderRadius: 16,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(168,85,247,0.15)',
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{item.emoji}</div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                    {item.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* Form card */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{
                borderRadius: 24, padding: '26px 22px',
                background: 'rgba(15,12,40,0.88)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(168,85,247,0.2)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.45), 0 0 40px rgba(168,85,247,0.06)',
              }}
            >
              {/* Prefilled notice */}
              {prefilled && formData.name && formData.dob && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginBottom: 18, padding: '10px 14px', borderRadius: 12,
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(168,85,247,0.1)',
                    border: '1px solid rgba(168,85,247,0.2)',
                  }}
                >
                  <Check style={{ width: 14, height: 14, color: '#a855f7', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#a855f7' }}>Details carried over</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                      {formData.name} · {formData.dob}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step indicators */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
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

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <p style={{
                    fontSize: 13, color: 'rgba(255,255,255,0.38)',
                    marginBottom: 14, textAlign: 'center',
                  }}>
                    {[
                      'What name shall I call you?',
                      'When were you born?',
                      'What time were you born?',
                      'Where were you born?',
                    ][step]}
                  </p>

                  {/* Step 0 — Name */}
                  {step === 0 && (
                    <div>
                      <div style={{ position: 'relative' }}>
                        <User style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)',
                          width: 16, height: 16, color: 'rgba(168,85,247,0.6)',
                        }} />
                        <input
                          type="text" autoFocus
                          value={formData.name}
                          onChange={e => { setFormData({ ...formData, name: e.target.value }); setError('') }}
                          placeholder="Your full name"
                          style={{ ...inputStyle, colorScheme: 'dark' }}
                          onFocus={e => Object.assign(e.target.style, focusStyle)}
                          onBlur={e => Object.assign(e.target.style, blurStyle)}
                        />
                        {formData.name && (
                          <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}
                          >
                            <Check style={{ width: 16, height: 16, color: '#4ade80' }} />
                          </motion.div>
                        )}
                      </div>
                      <WhySection explanation="Your name carries a vibrational frequency that shapes the expressive dimension of your reading. It is used to calculate your Destiny number — the contribution you are here to make." />
                    </div>
                  )}

                  {/* Step 1 — Date of birth */}
                  {step === 1 && (
                    <div>
                      <div style={{ position: 'relative' }}>
                        <Calendar style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)',
                          width: 16, height: 16, color: 'rgba(168,85,247,0.6)', zIndex: 1,
                        }} />
                        <input
                          type="date" autoFocus
                          value={formData.dob}
                          onChange={e => { setFormData({ ...formData, dob: e.target.value }); setError('') }}
                          max={format(new Date(), 'yyyy-MM-dd')}
                          min={format(subYears(new Date(), 120), 'yyyy-MM-dd')}
                          style={{ ...inputStyle, colorScheme: 'dark' }}
                          onFocus={e => Object.assign(e.target.style, focusStyle)}
                          onBlur={e => Object.assign(e.target.style, blurStyle)}
                        />
                      </div>
                      {formData.dob && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            fontSize: 12, color: '#a855f7', marginTop: 8,
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <Sparkles style={{ width: 12, height: 12 }} />
                          You are {calculateAge(formData.dob)} years into your journey
                        </motion.p>
                      )}
                      <WhySection explanation="Your birth date is the foundation of your entire reading. Every timing calculation — where you are right now, what this year means, what chapter of your life you are in — begins here." />
                    </div>
                  )}

                  {/* Step 2 — Birth time (optional) */}
                  {step === 2 && (
                    <div>
                      <div style={{ position: 'relative' }}>
                        <Clock style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)',
                          width: 16, height: 16, color: 'rgba(168,85,247,0.6)',
                        }} />
                        <input
                          type="time" autoFocus
                          value={formData.birthTime}
                          onChange={e => setFormData({ ...formData, birthTime: e.target.value })}
                          style={{ ...inputStyle, colorScheme: 'dark' }}
                          onFocus={e => Object.assign(e.target.style, focusStyle)}
                          onBlur={e => Object.assign(e.target.style, blurStyle)}
                        />
                      </div>
                      <button
                        onClick={() => {
                          setStep(3)
                          confetti({ particleCount: 10, spread: 25, origin: { y: 0.6 }, colors: ['#a855f7'] })
                        }}
                        style={{
                          marginTop: 10, fontSize: 12, color: 'rgba(168,85,247,0.55)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        Skip this step <ArrowRight style={{ width: 12, height: 12 }} />
                      </button>
                      <WhySection explanation="Birth time refines the astrological dimension of your reading. It is optional — your reading is complete without it, and deeper with it." />
                    </div>
                  )}

                  {/* Step 3 — Birth location (optional) */}
                  {step === 3 && (
                    <div>
                      <div style={{ position: 'relative' }}>
                        <MapPin style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)',
                          width: 16, height: 16, color: 'rgba(168,85,247,0.6)',
                        }} />
                        <input
                          type="text" autoFocus
                          value={formData.birthLocation}
                          onChange={e => setFormData({ ...formData, birthLocation: e.target.value })}
                          placeholder="City, Country"
                          style={{ ...inputStyle, colorScheme: 'dark' }}
                          onFocus={e => Object.assign(e.target.style, focusStyle)}
                          onBlur={e => Object.assign(e.target.style, blurStyle)}
                        />
                      </div>
                      <WhySection explanation="Your birthplace adds geographic context to your astrological reading. Optional but adds further precision to the picture your blueprint reveals." />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}
                >
                  {error}
                </motion.p>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                {step > 0 && (
                  <motion.button
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setStep(step - 1)}
                    style={{
                      flex: 1, padding: '13px', borderRadius: 14,
                      fontSize: 14, fontWeight: 500, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.55)', transition: 'all 0.2s',
                    }}
                  >
                    Back
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleNext}
                  disabled={!canProceed() || isLoading}
                  style={{
                    flex: step === 0 ? 1 : 2, padding: '13px', borderRadius: 14,
                    fontSize: 14, fontWeight: 600,
                    cursor: canProceed() && !isLoading ? 'pointer' : 'not-allowed',
                    border: 'none', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 8, transition: 'all 0.2s',
                    opacity: !canProceed() || isLoading ? 0.5 : 1,
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    boxShadow: canProceed() && !isLoading ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
                  }}
                >
                  {isLoading ? (
                    <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />Reading your blueprint...</>
                  ) : (
                    <>
                      {step === 3
                        ? (prefilled ? 'Complete Setup' : 'Reveal My Blueprint')
                        : 'Continue'}
                      {step < 3 && <ArrowRight style={{ width: 16, height: 16 }} />}
                    </>
                  )}
                </motion.button>
              </div>

              {/* Loading dots */}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
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
              style={{ marginTop: 18, textAlign: 'center' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 8 }}>
                {[
                  { emoji: '🔒', label: '256-bit encrypted' },
                  { emoji: '✨', label: '50k+ seekers'      },
                  { emoji: '⭐', label: '4.9 / 5 rating'    },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 12 }}>{item.emoji}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
                Your data is private and never shared with third parties
              </p>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Welcome Modal */}
      {showWelcome && cards.length > 0 && (
        <WelcomeModal
          isOpen={showWelcome}
          onClose={handleWelcomeClose}
          cards={cards}
          firstName={formData.name.trim().split(' ')[0]}
          fullName={formData.name.trim()}
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