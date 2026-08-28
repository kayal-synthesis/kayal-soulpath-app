'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import {
  Calendar, Clock, MapPin, User, ArrowRight,
  Check, Loader2, ChevronDown, ChevronUp, Info,
  Star, Lock, Sparkles,
} from 'lucide-react'
import { format, subYears } from 'date-fns'
import confetti from 'canvas-confetti'
import { buildNumerologyProfile } from '@/lib/welcome/numerology-engine'
import { buildAstrologyProfile }  from '@/lib/welcome/astrology-engine'
import { buildWelcomeCards }      from '@/lib/welcome/paragraph-library'
import { WelcomeModal }           from '@/components/welcome/WelcomeModal'
import type { WelcomeCard }       from '@/lib/welcome/paragraph-library'

// ── Tokens ────────────────────────────────────────────────────
const C = {
  bg:           '#faf7f2',
  bgDeep:       '#f3ede3',
  white:        '#ffffff',
  purple:       '#2d1b69',
  purpleMid:    '#4c2a9e',
  purpleLight:  '#7c3aed',
  purpleGlow:   'rgba(124,58,237,0.12)',
  purpleBorder: 'rgba(124,58,237,0.2)',
  purpleFaint:  'rgba(124,58,237,0.06)',
  gold:         '#b8943f',
  goldLight:    '#d4af6e',
  goldFaint:    'rgba(184,148,63,0.1)',
  goldBorder:   'rgba(184,148,63,0.25)',
  text:         '#1a1714',
  textSub:      '#6b6560',
  textFaint:    'rgba(26,23,20,0.35)',
  border:       'rgba(26,23,20,0.08)',
  serif:        'Georgia, "Times New Roman", serif',
  sans:         '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

// ── Step metadata ─────────────────────────────────────────────
const STEPS = [
  {
    icon:        User,
    field:       'name',
    type:        'text',
    placeholder: 'Your full name',
    question:    'What name shall I call you?',
    sub:         'Your name shapes the expressive dimension of your reading.',
    why:         'Your name carries a vibrational frequency used to calculate your Destiny number, the contribution you are here to make.',
    optional:    false,
  },
  {
    icon:        Calendar,
    field:       'dob',
    type:        'date',
    placeholder: '',
    question:    'When were you born?',
    sub:         'Your birth date is the foundation of your entire reading.',
    why:         'Every timing calculation, what year you are in, what life chapter you are living, begins with your exact birth date.',
    optional:    false,
  },
  {
    icon:        Clock,
    field:       'birthTime',
    type:        'time',
    placeholder: '',
    question:    'What time were you born?',
    sub:         'Optional, but it deepens the astrological layer significantly.',
    why:         'Birth time allows a full astrological chart with your rising sign and house placements. Optional but adds real depth.',
    optional:    true,
  },
  {
    icon:        MapPin,
    field:       'birthLocation',
    type:        'text',
    placeholder: 'City, Country',
    question:    'Where were you born?',
    sub:         'Optional. Adds geographic precision to your chart.',
    why:         'Birthplace provides the geographic coordinates for your astrological chart. Optional but enriching.',
    optional:    true,
  },
]

// ── Why tooltip ───────────────────────────────────────────────
function WhyTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: C.purpleLight, background: 'none',
          border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: C.sans, letterSpacing: '0.01em',
        }}
      >
        <Info style={{ width: 10, height: 10 }} />
        Why do we need this?
        {open
          ? <ChevronUp   style={{ width: 10, height: 10 }} />
          : <ChevronDown style={{ width: 10, height: 10 }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{
              marginTop: 6, padding: '9px 12px', borderRadius: 8,
              background: C.purpleFaint, border: `1px solid ${C.purpleBorder}`,
              fontSize: 11, lineHeight: 1.7, color: C.textSub,
              fontFamily: C.sans, margin: '6px 0 0',
            }}>
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sacred geometry background SVG ───────────────────────────
function SacredBg() {
  return (
    <svg
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="sg" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="1" fill="rgba(184,148,63,0.18)" />
          <circle cx="0"  cy="0"  r="1" fill="rgba(184,148,63,0.1)"  />
          <circle cx="60" cy="0"  r="1" fill="rgba(184,148,63,0.1)"  />
          <circle cx="0"  cy="60" r="1" fill="rgba(184,148,63,0.1)"  />
          <circle cx="60" cy="60" r="1" fill="rgba(184,148,63,0.1)"  />
          <line x1="0" y1="0" x2="60" y2="60" stroke="rgba(184,148,63,0.04)" strokeWidth="0.5" />
          <line x1="60" y1="0" x2="0" y2="60" stroke="rgba(184,148,63,0.04)" strokeWidth="0.5" />
        </pattern>
        <radialGradient id="glow1" cx="50%" cy="0%" r="60%">
          <stop offset="0%"   stopColor="rgba(124,58,237,0.08)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="glow2" cx="100%" cy="100%" r="50%">
          <stop offset="0%"   stopColor="rgba(184,148,63,0.08)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="glow3" cx="0%" cy="100%" r="50%">
          <stop offset="0%"   stopColor="rgba(124,58,237,0.06)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#sg)" />
      <rect width="100%" height="100%" fill="url(#glow1)" />
      <rect width="100%" height="100%" fill="url(#glow2)" />
      <rect width="100%" height="100%" fill="url(#glow3)" />
    </svg>
  )
}

// ── Story-style step dots ─────────────────────────────────────
function StoryDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 3, borderRadius: 99,
            transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
            width:      i === current ? 28 : 6,
            background: i < current
              ? C.gold
              : i === current
              ? C.purpleLight
              : 'rgba(26,23,20,0.15)',
          }}
        />
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
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
  const [focused,     setFocused]     = useState(false)
  const [prefilled,   setPrefilled]   = useState(false)

  useEffect(() => { setIsClient(true) }, [])

  useEffect(() => {
    if (!isClient) return
    if (hasCompletedOnboarding()) router.replace('/dashboard')
  }, [isClient, hasCompletedOnboarding, router])

  useEffect(() => {
    if (!isClient) return
    const n = searchParams.get('name')?.trim()  || ''
    const d = searchParams.get('dob')           || ''
    const t = searchParams.get('birthTime')     || ''
    const l = searchParams.get('birthLocation') || ''
    if (n || d) {
      setFormData({ name: n, dob: d, birthTime: t, birthLocation: l })
      setPrefilled(true)
      if (n && d) setStep(3)
      else if (n) setStep(1)
    }
  }, [isClient, searchParams])

  useEffect(() => {
    if (user && !hasSeenWelcomeModal && cards.length > 0) setShowWelcome(true)
  }, [user, hasSeenWelcomeModal, cards])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canProceed() && !isLoading) handleNext()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [step, formData, isLoading])

  const calcAge = (dob: string) => {
    const today = new Date(), birth = new Date(dob)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const currentStep  = STEPS[step]
  const currentValue = formData[currentStep.field as keyof typeof formData]

  const canProceed = () => {
    if (step === 0) return formData.name.trim().length > 0
    if (step === 1) return formData.dob.length > 0
    return true
  }

  const handleNext = () => {
    if (step === 0 && !formData.name.trim()) { setError('Please enter your name'); return }
    if (step === 1 && !formData.dob)         { setError('Please select your date of birth'); return }
    setError('')
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleSubmit()
  }

  const handleSkip = () => {
    setError('')
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    document.cookie = 'anonymous-session=true; path=/; max-age=2592000; SameSite=Lax; Secure'
    const sessionId = crypto.randomUUID()
    setAnonymousUser({
      sessionId, name: formData.name, dob: formData.dob,
      birthTime: formData.birthTime, birthLocation: formData.birthLocation,
      firstVisit: new Date(), lastVisit: new Date(), visitCount: 1, viewedTools: [],
    })
    try {
      const [yearStr, monthStr, dayStr] = formData.dob.split('-')
      const numProfile   = buildNumerologyProfile(formData.name, formData.dob)
      const astProfile   = buildAstrologyProfile(parseInt(monthStr), parseInt(dayStr), parseInt(yearStr))
      const welcomeCards = buildWelcomeCards(formData.name, numProfile, astProfile)
      setCards(welcomeCards)
      confetti({
        particleCount: 70, spread: 80, origin: { y: 0.5 },
        colors: [C.purpleLight, C.gold, C.goldLight, '#c084fc'],
        startVelocity: 24, decay: 0.92, ticks: 260,
      })
    } catch (e) {
      console.error('Failed to build welcome cards:', e)
      setCards([{
        section: 'Your Journey Begins', icon: 'Sparkles',
        paragraphs: [
          `${formData.name.trim().split(' ')[0]}, your personal blueprint is ready.`,
          `Explore our tools to discover what your birth data reveals.`,
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

  if (!isClient) return (
    <div style={{
      height: '100dvh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Loader2 style={{ width: 24, height: 24, color: C.purpleLight }} className="animate-spin" />
    </div>
  )

  const StepIcon = currentStep.icon

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; background: ${C.bg}; }
        ::placeholder { color: ${C.textFaint}; }
        input[type='date']::-webkit-calendar-picker-indicator,
        input[type='time']::-webkit-calendar-picker-indicator {
          opacity: 0.4; cursor: pointer;
        }
        @keyframes kayal-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes dot-bounce {
          0%,100% { transform: translateY(0); opacity: 0.35; }
          50%      { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes badge-float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes ring-pulse {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      {/* ── Full page container ── */}
      <div style={{
        height: '100dvh', overflow: 'hidden',
        background: C.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        padding: '0 20px',
      }}>
        <SacredBg />

        {/* ── Content wrapper ── */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 440,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}>

          {/* ── Brand mark ── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: 20 }}
          >
            {/* Animated ring */}
            <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 14px' }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: `1px solid ${C.purpleLight}`,
                animation: 'ring-pulse 2.5s ease-out infinite',
              }} />
              <div style={{
                position: 'relative', width: 56, height: 56, borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 24px rgba(124,58,237,0.3)`,
                animation: 'badge-float 4s ease-in-out infinite',
              }}>
                <span style={{ fontSize: 22, color: C.white }}>✦</span>
              </div>
            </div>

            <h1 style={{
              fontFamily: C.serif,
              fontSize: 'clamp(20px, 4.5vw, 26px)',
              fontWeight: 400, color: C.text,
              letterSpacing: '0.05em',
              marginBottom: 4,
            }}>
              KAYAL SoulPath
            </h1>
            <p style={{
              fontSize: 9, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: C.gold,
              fontFamily: C.sans,
            }}>
              Ancient Wisdom · Modern Synthesis
            </p>
          </motion.div>

          {/* ── Step progress dots ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ marginBottom: 16 }}
          >
            <StoryDots total={STEPS.length} current={step} />
          </motion.div>

          {/* ── Main question card ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            style={{ width: '100%' }}
          >
            <div style={{
              background: C.white,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: [
                '0 1px 0 rgba(255,255,255,0.8) inset',
                '0 8px 32px rgba(26,23,20,0.1)',
                '0 2px 8px rgba(26,23,20,0.06)',
              ].join(', '),
              border: `1px solid ${C.border}`,
            }}>

              {/* Gold + purple gradient strip */}
              <div style={{
                height: 3,
                background: `linear-gradient(90deg, ${C.purple} 0%, ${C.purpleLight} 50%, ${C.gold} 100%)`,
              }} />

              <div style={{ padding: '22px 22px 20px' }}>

                {/* Step icon + question */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`q-${step}`}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Icon + question row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
                      }}>
                        <StepIcon style={{ width: 18, height: 18, color: C.white }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontSize: 10, fontFamily: C.sans, fontWeight: 700,
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: C.purpleLight, margin: '0 0 2px',
                        }}>
                          Step {step + 1} of {STEPS.length}
                        </p>
                        <h2 style={{
                          fontFamily: C.serif, fontSize: 18,
                          fontWeight: 400, color: C.text,
                          margin: 0, lineHeight: 1.25,
                        }}>
                          {currentStep.question}
                        </h2>
                      </div>
                    </div>

                    {/* Sub-label */}
                    <p style={{
                      fontSize: 12.5, color: C.textSub,
                      fontFamily: C.serif, lineHeight: 1.6,
                      margin: '0 0 14px',
                    }}>
                      {currentStep.sub}
                    </p>

                    {/* Input */}
                    <div style={{ position: 'relative' }}>
                      <StepIcon style={{
                        position: 'absolute', left: 13, top: '50%',
                        transform: 'translateY(-50%)',
                        width: 15, height: 15,
                        color: focused ? C.purpleLight : C.textFaint,
                        transition: 'color 0.2s', zIndex: 1,
                      }} />
                      <input
                        key={`input-${step}`}
                        type={currentStep.type}
                        value={currentValue}
                        autoFocus
                        placeholder={currentStep.placeholder}
                        min={currentStep.type === 'date' ? format(subYears(new Date(), 120), 'yyyy-MM-dd') : undefined}
                        max={currentStep.type === 'date' ? format(new Date(), 'yyyy-MM-dd') : undefined}
                        onChange={e => {
                          setFormData(prev => ({ ...prev, [currentStep.field]: e.target.value }))
                          setError('')
                        }}
                        style={{
                          width: '100%',
                          padding: '13px 13px 13px 42px',
                          background: focused ? C.white : '#f8f5ef',
                          border: `1.5px solid ${focused ? C.purpleLight : C.border}`,
                          borderRadius: 11, color: C.text, fontSize: 15,
                          fontFamily: C.sans, outline: 'none', transition: 'all 0.2s',
                          boxShadow: focused ? `0 0 0 3px ${C.purpleGlow}` : 'none',
                          WebkitAppearance: 'none' as const,
                          colorScheme: 'light',
                        }}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                      />
                      {currentValue && currentStep.type === 'text' && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          style={{
                            position: 'absolute', right: 12, top: '50%',
                            transform: 'translateY(-50%)',
                          }}
                        >
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${C.purpleLight}, ${C.gold})`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check style={{ width: 12, height: 12, color: C.white }} />
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Age display */}
                    {step === 1 && formData.dob && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          fontSize: 12, marginTop: 8,
                          fontFamily: C.serif,
                          background: `linear-gradient(90deg, ${C.purpleLight}, ${C.gold})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        ✦ You are {calcAge(formData.dob)} years into your journey
                      </motion.p>
                    )}

                    {/* Why tooltip */}
                    <WhyTooltip text={currentStep.why} />

                    {/* Error */}
                    {error && (
                      <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ fontSize: 11, color: '#b91c1c', marginTop: 8, fontFamily: C.sans }}
                      >
                        {error}
                      </motion.p>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* ── Divider ── */}
                <div style={{
                  height: 1, background: C.border,
                  margin: '18px 0 16px',
                }} />

                {/* ── Action buttons ── */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {step > 0 && (
                    <button
                      onClick={() => { setError(''); setStep(s => s - 1) }}
                      style={{
                        flex: 1, padding: '12px', borderRadius: 10,
                        fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        background: 'transparent',
                        border: `1.5px solid ${C.border}`,
                        color: C.textSub, fontFamily: C.sans,
                        transition: 'all 0.2s',
                      }}
                    >
                      Back
                    </button>
                  )}

                  <button
                    onClick={handleNext}
                    disabled={!canProceed() || isLoading}
                    style={{
                      flex: step === 0 ? 1 : 2,
                      padding: '12px', borderRadius: 10,
                      fontSize: 13, fontWeight: 700,
                      cursor: canProceed() && !isLoading ? 'pointer' : 'not-allowed',
                      border: 'none', color: C.white,
                      background: canProceed() && !isLoading
                        ? `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`
                        : C.border,
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 7,
                      fontFamily: C.sans, transition: 'all 0.25s',
                      opacity: !canProceed() || isLoading ? 0.6 : 1,
                      boxShadow: canProceed() && !isLoading
                        ? '0 4px 14px rgba(124,58,237,0.32)' : 'none',
                    }}
                  >
                    {isLoading ? (
                      <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Calculating...</>
                    ) : step === STEPS.length - 1 ? (
                      'Reveal My Blueprint'
                    ) : (
                      <>Continue <ArrowRight style={{ width: 14, height: 14 }} /></>
                    )}
                  </button>
                </div>

                {/* Loading dots */}
                {isLoading && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 12 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 5, height: 5, borderRadius: '50%', background: C.purpleLight,
                        animation: `dot-bounce 0.75s ${i * 0.15}s ease-in-out infinite`,
                      }} />
                    ))}
                  </div>
                )}

                {/* Skip (optional steps only) */}
                {currentStep.optional && !isLoading && step < STEPS.length - 1 && (
                  <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <button
                      onClick={handleSkip}
                      style={{
                        fontSize: 11, color: C.textFaint, background: 'none',
                        border: 'none', cursor: 'pointer', fontFamily: C.sans,
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.textSub)}
                      onMouseLeave={e => (e.currentTarget.style.color = C.textFaint)}
                    >
                      Skip this step
                    </button>
                  </div>
                )}

              </div>
            </div>
          </motion.div>

          {/* ── Trust signals ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 18,
              marginTop: 18, flexWrap: 'wrap',
            }}
          >
            {[
              { icon: Lock,     label: 'Private' },
              { icon: Star,     label: '4.9 / 5' },
              { icon: Sparkles, label: '50k seekers' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon style={{ width: 10, height: 10, color: C.gold }} />
                <span style={{ fontSize: 11, color: C.textFaint, fontFamily: C.sans }}>
                  {label}
                </span>
              </div>
            ))}
          </motion.div>

          {/* ── Bottom note ── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              fontSize: 10.5, color: C.textFaint,
              textAlign: 'center', marginTop: 8,
              fontFamily: C.sans, lineHeight: 1.5,
            }}
          >
            Your data is never shared with third parties
          </motion.p>

        </div>
      </div>

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

export function BasicInfoPageClient() {
  return (
    <Suspense fallback={
      <div style={{
        height: '100dvh', background: '#faf7f2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 style={{ width: 24, height: 24, color: '#7c3aed' }} className="animate-spin" />
      </div>
    }>
      <BasicInfoPageInner />
    </Suspense>
  )
}