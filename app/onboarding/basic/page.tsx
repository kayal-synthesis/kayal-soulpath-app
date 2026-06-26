'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import {
  Calendar, Clock, MapPin, User, ArrowRight,
  Check, Loader2, ChevronDown, ChevronUp, Info,
  Sparkles, Shield, Star, Zap,
} from 'lucide-react'
import { format, subYears } from 'date-fns'
import confetti from 'canvas-confetti'
import { buildNumerologyProfile } from '@/lib/welcome/numerology-engine'
import { buildAstrologyProfile }  from '@/lib/welcome/astrology-engine'
import { buildWelcomeCards }      from '@/lib/welcome/paragraph-library'
import { WelcomeModal }           from '@/components/welcome/WelcomeModal'
import type { WelcomeCard }       from '@/lib/welcome/paragraph-library'

// ── Design tokens ─────────────────────────────────────────────
const C = {
  parchment:   '#faf7f2',
  white:       '#ffffff',
  surfaceAlt:  '#f3f0eb',
  purple:      '#2d1b69',
  purpleMid:   '#4c2a9e',
  purpleLight: '#7c3aed',
  purpleFaint: 'rgba(124,58,237,0.08)',
  purpleBorder:'rgba(124,58,237,0.2)',
  gold:        '#b8943f',
  goldLight:   '#d4af6e',
  goldFaint:   'rgba(184,148,63,0.12)',
  goldBorder:  'rgba(184,148,63,0.3)',
  text:        '#1a1714',
  textSub:     '#6b6560',
  textFaint:   'rgba(26,23,20,0.38)',
  border:      'rgba(26,23,20,0.09)',
  serif:       'Georgia, "Times New Roman", serif',
  sans:        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

// ── Why tooltip ───────────────────────────────────────────────
function WhySection({ explanation }: { explanation: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: C.purpleLight,
          background: 'none', border: 'none',
          cursor: 'pointer', padding: 0,
          fontFamily: C.sans, letterSpacing: '0.02em',
        }}
      >
        <Info style={{ width: 11, height: 11 }} />
        Why do we need this?
        {open
          ? <ChevronUp   style={{ width: 11, height: 11 }} />
          : <ChevronDown style={{ width: 11, height: 11 }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginTop: 8, padding: '11px 14px', borderRadius: 10,
              background: C.purpleFaint,
              border: `1px solid ${C.purpleBorder}`,
              fontSize: 12, lineHeight: 1.75,
              color: C.textSub, fontFamily: C.sans,
            }}>
              {explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Step progress bar ─────────────────────────────────────────
function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 26 }}>
      {steps.map((label, i) => (
        <div key={i} style={{ flex: 1 }}>
          <div style={{
            fontSize: 9, textAlign: 'center', marginBottom: 5,
            fontFamily: C.sans, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: i <= current ? C.purpleLight : C.textFaint,
            transition: 'color 0.3s',
          }}>
            {label}
          </div>
          <div style={{
            height: 2, borderRadius: 2,
            background: i < current
              ? `linear-gradient(90deg, ${C.purpleLight}, ${C.gold})`
              : i === current
              ? C.purpleLight
              : C.border,
            transition: 'background 0.4s',
          }} />
        </div>
      ))}
    </div>
  )
}

// ── Input field ───────────────────────────────────────────────
function FieldInput({
  type, value, onChange, placeholder, icon: Icon, autoFocus, min, max,
}: {
  type: string; value: string; onChange: (v: string) => void
  placeholder?: string; icon: any; autoFocus?: boolean
  min?: string; max?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <Icon style={{
        position: 'absolute', left: 14, top: '50%',
        transform: 'translateY(-50%)',
        width: 16, height: 16,
        color: focused ? C.purpleLight : C.textFaint,
        transition: 'color 0.2s', zIndex: 1,
      }} />
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus} min={min} max={max}
        style={{
          width: '100%',
          padding: '15px 15px 15px 46px',
          background: focused ? C.white : C.parchment,
          border: `1.5px solid ${focused ? C.purpleLight : C.border}`,
          borderRadius: 12, color: C.text, fontSize: 15,
          fontFamily: C.sans, outline: 'none', transition: 'all 0.25s',
          boxShadow: focused ? `0 0 0 3px ${C.purpleFaint}` : 'none',
          WebkitAppearance: 'none' as const,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value && type === 'text' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            position: 'absolute', right: 14, top: '50%',
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
  )
}

// ── Left panel feature item ───────────────────────────────────
function FeatureItem({ icon: Icon, title, desc, color }: {
  icon: any; title: string; desc: string; color: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color,
      }}>
        <Icon style={{ width: 17, height: 17 }} />
      </div>
      <div>
        <p style={{
          margin: '0 0 3px', fontSize: 14, fontWeight: 600,
          color: 'rgba(255,255,255,0.95)', fontFamily: C.sans,
        }}>
          {title}
        </p>
        <p style={{
          margin: 0, fontSize: 12, lineHeight: 1.6,
          color: 'rgba(255,255,255,0.58)', fontFamily: C.sans,
        }}>
          {desc}
        </p>
      </div>
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
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canProceed() && !isLoading) handleNext()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [step, formData, isLoading])

  const calcAge = (dob: string) => {
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
    if (step === 1 && !formData.dob)         { setError('Please select your date of birth'); return }
    setError('')
    if (step < 3) { setStep(step + 1) } else { handleSubmit() }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    await new Promise(r => setTimeout(r, prefilled ? 900 : 1600))
    document.cookie = 'anonymous-session=true; path=/; max-age=2592000'
    const sessionId = Math.random().toString(36).substring(2)
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
        particleCount: 70, spread: 85, origin: { y: 0.5 },
        colors: [C.purpleLight, C.gold, C.goldLight, '#c084fc'],
        startVelocity: 26, decay: 0.92, ticks: 280,
      })
    } catch (err) {
      console.error('Welcome engine error:', err)
      setCards([{
        section: 'Your Journey Begins', icon: 'Sparkles',
        paragraphs: [
          `${formData.name.trim().split(' ')[0]}, your personal blueprint is ready.`,
          `Explore our tools to discover the insights your birth data reveals.`,
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
      minHeight: '100vh', background: C.parchment,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Loader2 style={{ width: 28, height: 28, color: C.purpleLight }} className="animate-spin" />
    </div>
  )

  const stepLabels = ['Name', 'Birth', 'Time', 'Place']

  const stepQuestions = [
    'What name shall I call you?',
    'When were you born?',
    'What time were you born?',
    'Where were you born?',
  ]

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: ${C.parchment}; }
        ::placeholder { color: ${C.textFaint}; }
        input[type='date']::-webkit-calendar-picker-indicator,
        input[type='time']::-webkit-calendar-picker-indicator {
          opacity: 0.45; cursor: pointer;
        }
        @keyframes loadingdot {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50%       { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(20px, -30px) scale(1.06); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-15px, 20px) scale(1.04); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(25px, 15px) scale(1.08); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        /* Desktop two-column layout */
        .kayal-outer {
          min-height: 100dvh;
          display: flex;
          align-items: stretch;
          background: ${C.parchment};
        }
        .kayal-left {
          display: none;
          width: 45%;
          min-height: 100dvh;
          position: relative;
          overflow: hidden;
          background: linear-gradient(145deg, ${C.purple} 0%, ${C.purpleMid} 60%, #1e0a4a 100%);
          padding: 48px 40px;
          flex-direction: column;
          justify-content: space-between;
        }
        .kayal-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          min-height: 100dvh;
        }
        .kayal-form-inner {
          width: 100%;
          max-width: 420px;
        }

        @media (min-width: 900px) {
          .kayal-left  { display: flex; }
          .kayal-brand-mobile { display: none !important; }
          .kayal-right { padding: 48px 48px; }
        }
        @media (max-width: 899px) {
          .kayal-left { display: none; }
        }
      `}</style>

      <div className="kayal-outer">

        {/* ── LEFT PANEL (desktop only) ── */}
        <div className="kayal-left">

          {/* Floating orbs */}
          <div style={{
            position: 'absolute', width: 400, height: 400,
            borderRadius: '50%', top: '-100px', left: '-100px',
            background: 'radial-gradient(circle, rgba(124,58,237,0.45) 0%, transparent 70%)',
            animation: 'float1 8s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', width: 300, height: 300,
            borderRadius: '50%', bottom: '10%', right: '-60px',
            background: 'radial-gradient(circle, rgba(184,148,63,0.3) 0%, transparent 70%)',
            animation: 'float2 10s 1s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', width: 200, height: 200,
            borderRadius: '50%', top: '40%', right: '10%',
            background: 'radial-gradient(circle, rgba(192,132,252,0.25) 0%, transparent 70%)',
            animation: 'float3 7s 2s ease-in-out infinite',
            pointerEvents: 'none',
          }} />

          {/* Brand */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <span style={{ fontSize: 22 }}>✦</span>
            </div>
            <h1 style={{
              fontFamily: C.serif,
              fontSize: 32, fontWeight: 400,
              color: C.white, margin: '0 0 6px',
              letterSpacing: '0.04em',
            }}>
              KAYAL SoulPath
            </h1>
            <p style={{
              fontSize: 11, letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: C.goldLight, margin: '0 0 28px',
              fontFamily: C.sans,
            }}>
              Ancient Wisdom · Modern Synthesis
            </p>
            <p style={{
              fontSize: 15, color: 'rgba(255,255,255,0.72)',
              lineHeight: 1.85, maxWidth: 340,
              fontFamily: C.serif, margin: '0 0 40px',
            }}>
              We synthesise numerology, astrology, and your birth data into one precise, personalised blueprint — built entirely from the moment you arrived in this world.
            </p>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <FeatureItem
                icon={Sparkles} color="#c084fc"
                title="Complete Soul Blueprint"
                desc="9 sections of hyper-personalised insight built from your unique birth data"
              />
              <FeatureItem
                icon={Zap} color={C.goldLight}
                title="Instant — Zero Wait Time"
                desc="All calculations run in your browser. No loading, no API, no cost to you"
              />
              <FeatureItem
                icon={Star} color="#38bdf8"
                title="Audio Playback Included"
                desc="Listen to your entire reading with one tap — perfect for on the go"
              />
              <FeatureItem
                icon={Shield} color="#86efac"
                title="Private by Design"
                desc="Your data never leaves your device. No accounts required to begin"
              />
            </div>
          </div>

          {/* Bottom testimonial */}
          <div style={{
            position: 'relative', zIndex: 2,
            padding: '18px 20px', borderRadius: 14,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} style={{ width: 13, height: 13, fill: C.gold, color: C.gold }} />
              ))}
            </div>
            <p style={{
              fontSize: 13, color: 'rgba(255,255,255,0.8)',
              fontFamily: C.serif, lineHeight: 1.7, margin: '0 0 10px',
              fontStyle: 'italic',
            }}>
              "The reading named things about me that I have never told anyone. I do not know how it works but it works."
            </p>
            <p style={{
              fontSize: 11, color: 'rgba(255,255,255,0.45)',
              fontFamily: C.sans, margin: 0, letterSpacing: '0.04em',
            }}>
              — Verified Seeker, Lagos
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="kayal-right">
          <div className="kayal-form-inner">

            {/* Mobile brand (hidden on desktop) */}
            <div className="kayal-brand-mobile" style={{ textAlign: 'center', marginBottom: 32 }}>
              <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Purple + gold gradient badge */}
                <div style={{
                  width: 64, height: 64, margin: '0 auto 16px',
                  borderRadius: 18,
                  background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
                }}>
                  <span style={{ fontSize: 26 }}>✦</span>
                </div>
                <h1 style={{
                  fontFamily: C.serif, fontSize: 26,
                  fontWeight: 400, color: C.text,
                  margin: '0 0 5px', letterSpacing: '0.04em',
                }}>
                  KAYAL SoulPath
                </h1>
                <p style={{
                  fontSize: 10, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: C.purpleLight,
                  margin: '0 0 14px', fontFamily: C.sans,
                }}>
                  Ancient Wisdom · Modern Synthesis
                </p>
                <p style={{
                  fontSize: 13.5, color: C.textSub,
                  lineHeight: 1.8, maxWidth: 320,
                  margin: '0 auto', fontFamily: C.serif,
                }}>
                  Your complete personal blueprint — built from the moment you were born.
                </p>
              </motion.div>
            </div>

            {/* Mobile three pillars (hidden on desktop) */}
            <motion.div
              className="kayal-brand-mobile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                gap: 8, marginBottom: 24,
              }}
            >
              {[
                { symbol: '✦', color: C.purpleLight, label: 'Core Nature' },
                { symbol: '◈', color: C.gold,        label: 'Right Now'  },
                { symbol: '◇', color: '#38bdf8',     label: 'Destiny'    },
              ].map((item, i) => (
                <div key={i} style={{
                  textAlign: 'center', padding: '12px 6px',
                  background: C.white, borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  boxShadow: '0 1px 4px rgba(26,23,20,0.04)',
                }}>
                  <div style={{ fontSize: 16, color: item.color, marginBottom: 5 }}>
                    {item.symbol}
                  </div>
                  <p style={{
                    fontSize: 10, color: C.textSub,
                    lineHeight: 1.4, margin: 0, fontFamily: C.sans,
                  }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* Form card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.55 }}
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: '28px 24px',
                boxShadow: '0 4px 32px rgba(26,23,20,0.08), 0 1px 4px rgba(26,23,20,0.04)',
              }}
            >
              {/* Gradient top strip */}
              <div style={{
                height: 4, borderRadius: '8px 8px 0 0',
                background: `linear-gradient(90deg, ${C.purple}, ${C.purpleLight}, ${C.gold})`,
                margin: '-28px -24px 24px',
                borderRadius: '20px 20px 0 0',
              }} />

              {/* Prefilled notice */}
              {prefilled && formData.name && formData.dob && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginBottom: 20, padding: '10px 14px', borderRadius: 10,
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: C.purpleFaint,
                    border: `1px solid ${C.purpleBorder}`,
                  }}
                >
                  <Check style={{ width: 13, height: 13, color: C.purpleLight, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: C.purpleLight, margin: 0, fontFamily: C.sans }}>
                      Details carried over
                    </p>
                    <p style={{ fontSize: 11, color: C.textSub, margin: '2px 0 0', fontFamily: C.sans }}>
                      {formData.name} · {formData.dob}
                    </p>
                  </div>
                </motion.div>
              )}

              <StepBar steps={stepLabels} current={step} />

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <p style={{
                    fontSize: 13, color: C.textSub,
                    marginBottom: 14, textAlign: 'center',
                    fontFamily: C.serif, letterSpacing: '0.01em',
                  }}>
                    {stepQuestions[step]}
                  </p>

                  {step === 0 && (
                    <div>
                      <FieldInput
                        type="text" value={formData.name} autoFocus
                        icon={User} placeholder="Your full name"
                        onChange={v => { setFormData({ ...formData, name: v }); setError('') }}
                      />
                      <WhySection explanation="Your name carries a vibrational frequency that shapes the expressive dimension of your reading. It is used to calculate your Destiny number — the contribution you are here to make." />
                    </div>
                  )}

                  {step === 1 && (
                    <div>
                      <FieldInput
                        type="date" value={formData.dob} autoFocus icon={Calendar}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        min={format(subYears(new Date(), 120), 'yyyy-MM-dd')}
                        onChange={v => { setFormData({ ...formData, dob: v }); setError('') }}
                      />
                      {formData.dob && (
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
                      <WhySection explanation="Your birth date is the foundation of your entire reading. Every timing calculation — where you are right now, what this year means, what chapter of your life you are in — begins here." />
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <FieldInput
                        type="time" value={formData.birthTime} autoFocus icon={Clock}
                        onChange={v => setFormData({ ...formData, birthTime: v })}
                      />
                      <button
                        onClick={() => setStep(3)}
                        style={{
                          marginTop: 10, fontSize: 12, color: C.purpleLight,
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontFamily: C.sans, padding: 0,
                        }}
                      >
                        Skip this step <ArrowRight style={{ width: 11, height: 11 }} />
                      </button>
                      <WhySection explanation="Birth time refines the astrological dimension of your reading. It is optional — your reading is complete without it, and deeper with it." />
                    </div>
                  )}

                  {step === 3 && (
                    <div>
                      <FieldInput
                        type="text" value={formData.birthLocation} autoFocus
                        icon={MapPin} placeholder="City, Country"
                        onChange={v => setFormData({ ...formData, birthLocation: v })}
                      />
                      <WhySection explanation="Your birthplace adds geographic context to your astrological reading. Optional but adds further precision to the picture your blueprint reveals." />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: 12, color: '#b91c1c', marginTop: 8, fontFamily: C.sans }}
                >
                  {error}
                </motion.p>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                {step > 0 && (
                  <motion.button
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    onClick={() => setStep(step - 1)}
                    style={{
                      flex: 1, padding: '14px', borderRadius: 12,
                      fontSize: 14, fontWeight: 500, cursor: 'pointer',
                      background: 'transparent', border: `1.5px solid ${C.border}`,
                      color: C.textSub, fontFamily: C.sans, transition: 'all 0.2s',
                    }}
                  >
                    Back
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  disabled={!canProceed() || isLoading}
                  style={{
                    flex: step === 0 ? 1 : 2,
                    padding: '14px', borderRadius: 12,
                    fontSize: 14, fontWeight: 700,
                    cursor: canProceed() && !isLoading ? 'pointer' : 'not-allowed',
                    border: 'none', color: C.white,
                    background: canProceed() && !isLoading
                      ? `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`
                      : C.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontFamily: C.sans, transition: 'all 0.25s',
                    opacity: !canProceed() || isLoading ? 0.6 : 1,
                    boxShadow: canProceed() && !isLoading
                      ? '0 4px 16px rgba(124,58,237,0.35)'
                      : 'none',
                  }}
                >
                  {isLoading ? (
                    <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />Calculating your blueprint...</>
                  ) : (
                    <>
                      {step === 3
                        ? (prefilled ? 'Complete Setup' : 'Reveal My Blueprint')
                        : 'Continue'}
                      {step < 3 && <ArrowRight style={{ width: 15, height: 15 }} />}
                    </>
                  )}
                </motion.button>
              </div>

              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: C.purpleLight,
                      animation: `loadingdot 0.75s ${i * 0.15}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              )}

              {/* Trust row */}
              <div style={{
                display: 'flex', justifyContent: 'center',
                gap: 16, marginTop: 20, flexWrap: 'wrap',
              }}>
                {[
                  { icon: Shield, label: 'Private & encrypted' },
                  { icon: Star,   label: '4.9 / 5 rating'      },
                  { icon: Zap,    label: 'Instant results'      },
                ].map(({ icon: Icon, label }, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Icon style={{ width: 11, height: 11, color: C.purpleLight }} />
                    <span style={{ fontSize: 11, color: C.textFaint, fontFamily: C.sans }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Bottom note */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                fontSize: 11, color: C.textFaint,
                textAlign: 'center', marginTop: 18,
                fontFamily: C.sans, lineHeight: 1.6,
              }}
            >
              Your data is never shared with third parties.<br />
              No account required to receive your reading.
            </motion.p>

          </div>
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

export default function BasicInfoPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: '#faf7f2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 style={{ width: 28, height: 28, color: '#7c3aed' }} className="animate-spin" />
      </div>
    }>
      <BasicInfoPageInner />
    </Suspense>
  )
}