'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import {
  Calendar, Clock, MapPin, User, ArrowRight,
  Check, Loader2, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { format, subYears } from 'date-fns'
import confetti from 'canvas-confetti'
import { buildNumerologyProfile } from '@/lib/welcome/numerology-engine'
import { buildAstrologyProfile }  from '@/lib/welcome/astrology-engine'
import { buildWelcomeCards }      from '@/lib/welcome/paragraph-library'
import { WelcomeModal }           from '@/components/welcome/WelcomeModal'
import type { WelcomeCard }       from '@/lib/welcome/paragraph-library'

const T = {
  bg:         '#faf7f2',
  surface:    '#ffffff',
  surfaceAlt: '#f5f1ea',
  border:     'rgba(184,148,63,0.25)',
  borderSub:  'rgba(26,23,20,0.08)',
  gold:       '#b8943f',
  goldDark:   '#8b6e2e',
  goldFaint:  'rgba(184,148,63,0.1)',
  goldBorder: 'rgba(184,148,63,0.3)',
  text:       '#1a1714',
  textSub:    '#6b6560',
  textFaint:  'rgba(26,23,20,0.35)',
  serif:      'Georgia, "Times New Roman", serif',
  sans:       '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

function WhySection({ explanation }: { explanation: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: T.gold, background: 'none',
          border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: T.sans, letterSpacing: '0.03em',
        }}
      >
        <Info style={{ width: 11, height: 11 }} />
        Why do we need this?
        {open
          ? <ChevronUp  style={{ width: 11, height: 11 }} />
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
              marginTop: 8, padding: '12px 14px', borderRadius: 10,
              background: T.goldFaint,
              border: `1px solid ${T.goldBorder}`,
              fontSize: 12, lineHeight: 1.75,
              color: T.textSub, fontFamily: T.sans,
            }}>
              {explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
      {steps.map((label, i) => (
        <div key={i} style={{ flex: 1 }}>
          <div style={{
            fontSize: 9, textAlign: 'center', marginBottom: 6,
            fontFamily: T.sans, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: i <= current ? T.gold : T.textFaint,
            transition: 'color 0.4s',
          }}>
            {label}
          </div>
          <div style={{
            height: 1.5, borderRadius: 1,
            background: i < current
              ? T.gold
              : i === current
              ? `linear-gradient(90deg, ${T.gold}, rgba(184,148,63,0.4))`
              : T.borderSub,
            transition: 'background 0.4s',
          }} />
        </div>
      ))}
    </div>
  )
}

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
        width: 15, height: 15,
        color: focused ? T.gold : T.textFaint,
        transition: 'color 0.2s', zIndex: 1,
      }} />
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        min={min}
        max={max}
        style={{
          width: '100%',
          padding: '14px 14px 14px 44px',
          background: focused ? '#ffffff' : T.surfaceAlt,
          border: `1px solid ${focused ? T.gold : T.borderSub}`,
          borderRadius: 12,
          color: T.text,
          fontSize: 15,
          fontFamily: T.sans,
          outline: 'none',
          transition: 'all 0.25s',
          boxShadow: focused ? `0 0 0 3px ${T.goldFaint}` : 'none',
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
          <Check style={{ width: 15, height: 15, color: T.gold }} />
        </motion.div>
      )}
    </div>
  )
}

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
        particleCount: 55, spread: 75, origin: { y: 0.5 },
        colors: ['#b8943f', '#1a1714', '#d4af6e', '#8b6e2e'],
        startVelocity: 22, decay: 0.93, ticks: 250,
      })
    } catch (err) {
      console.error('Welcome engine error:', err)
      setCards([{
        section: 'Your Journey Begins',
        icon: 'Sparkles',
        paragraphs: [
          `${formData.name.trim().split(' ')[0]}, your personal blueprint is ready.`,
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

  if (!isClient) return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Loader2 style={{ width: 26, height: 26, color: T.gold }} className="animate-spin" />
    </div>
  )

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${T.bg}; margin: 0; }
        ::placeholder { color: ${T.textFaint}; }
        input[type='date']::-webkit-calendar-picker-indicator,
        input[type='time']::-webkit-calendar-picker-indicator {
          opacity: 0.4; cursor: pointer;
        }
        @keyframes loadingdot {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50%       { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>

      <div style={{
        minHeight: '100dvh', background: T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 20px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            style={{ textAlign: 'center', marginBottom: 36 }}
          >
            <div style={{
              width: 52, height: 52, margin: '0 auto 18px',
              border: `1px solid ${T.goldBorder}`,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: T.goldFaint,
            }}>
              <span style={{ fontSize: 20, color: T.gold }}>✦</span>
            </div>

            <h1 style={{
              fontFamily: T.serif,
              fontSize: 'clamp(22px, 5vw, 28px)',
              fontWeight: 400, color: T.text,
              margin: '0 0 6px', letterSpacing: '0.05em',
            }}>
              KAYAL SoulPath
            </h1>

            <p style={{
              fontSize: 10, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: T.gold,
              margin: '0 0 16px', fontFamily: T.sans,
            }}>
              Ancient Wisdom · Modern Synthesis
            </p>

            <p style={{
              fontSize: 14, color: T.textSub,
              lineHeight: 1.85, maxWidth: 340,
              margin: '0 auto', fontFamily: T.serif,
            }}>
              Enter your birth data and we will calculate your complete personal blueprint — the patterns, gifts, challenges, and timing that have been shaping your life since the day you were born.
            </p>
          </motion.div>

          {/* Three pillars */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
              gap: 10, marginBottom: 24,
            }}
          >
            {[
              { symbol: '✦', label: 'Core Nature and Gifts'   },
              { symbol: '◈', label: 'Where You Are Right Now' },
              { symbol: '◇', label: 'Purpose and Destiny'     },
            ].map((item, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: '14px 8px',
                background: T.surface,
                border: `1px solid ${T.borderSub}`,
                borderRadius: 12,
              }}>
                <div style={{
                  fontSize: 15, color: T.gold,
                  marginBottom: 7, fontFamily: T.serif,
                }}>
                  {item.symbol}
                </div>
                <p style={{
                  fontSize: 10, color: T.textSub,
                  lineHeight: 1.5, margin: 0,
                  fontFamily: T.sans,
                }}>
                  {item.label}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{
              background: T.surface,
              border: `1px solid ${T.borderSub}`,
              borderRadius: 20,
              padding: '26px 22px',
              boxShadow: '0 2px 24px rgba(26,23,20,0.06)',
            }}
          >
            {prefilled && formData.name && formData.dob && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginBottom: 20, padding: '10px 14px', borderRadius: 10,
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: T.goldFaint,
                  border: `1px solid ${T.goldBorder}`,
                }}
              >
                <Check style={{ width: 13, height: 13, color: T.gold, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: T.goldDark, margin: 0, fontFamily: T.sans }}>
                    Details carried over
                  </p>
                  <p style={{ fontSize: 11, color: T.textSub, margin: '2px 0 0', fontFamily: T.sans }}>
                    {formData.name} · {formData.dob}
                  </p>
                </div>
              </motion.div>
            )}

            <StepBar steps={['Name','Birth','Time','Place']} current={step} />

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <p style={{
                  fontSize: 13, color: T.textSub,
                  marginBottom: 14, textAlign: 'center',
                  fontFamily: T.serif, letterSpacing: '0.01em',
                }}>
                  {[
                    'What name shall I call you?',
                    'When were you born?',
                    'What time were you born?',
                    'Where were you born?',
                  ][step]}
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
                      type="date" value={formData.dob} autoFocus
                      icon={Calendar}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      min={format(subYears(new Date(), 120), 'yyyy-MM-dd')}
                      onChange={v => { setFormData({ ...formData, dob: v }); setError('') }}
                    />
                    {formData.dob && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          fontSize: 12, color: T.gold,
                          marginTop: 8, fontFamily: T.serif,
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
                      type="time" value={formData.birthTime} autoFocus
                      icon={Clock}
                      onChange={v => setFormData({ ...formData, birthTime: v })}
                    />
                    <button
                      onClick={() => setStep(3)}
                      style={{
                        marginTop: 10, fontSize: 12, color: T.gold,
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontFamily: T.sans, padding: 0,
                      }}
                    >
                      Skip this step
                      <ArrowRight style={{ width: 11, height: 11 }} />
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
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: 12, color: '#b91c1c', marginTop: 8, fontFamily: T.sans }}
              >
                {error}
              </motion.p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              {step > 0 && (
                <motion.button
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setStep(step - 1)}
                  style={{
                    flex: 1, padding: '14px', borderRadius: 12,
                    fontSize: 14, fontWeight: 500, cursor: 'pointer',
                    background: 'transparent',
                    border: `1px solid ${T.borderSub}`,
                    color: T.textSub,
                    fontFamily: T.sans, transition: 'all 0.2s',
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
                  fontSize: 14, fontWeight: 600,
                  cursor: canProceed() && !isLoading ? 'pointer' : 'not-allowed',
                  border: 'none',
                  color: '#faf7f2',
                  background: canProceed() && !isLoading ? T.gold : T.textFaint,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: T.sans, transition: 'all 0.25s',
                  opacity: !canProceed() || isLoading ? 0.6 : 1,
                  boxShadow: canProceed() && !isLoading ? '0 2px 12px rgba(184,148,63,0.3)' : 'none',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />
                    Calculating your blueprint...
                  </>
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
                    width: 5, height: 5, borderRadius: '50%', background: T.gold,
                    animation: `loadingdot 0.75s ${i * 0.15}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            style={{ marginTop: 22, textAlign: 'center' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 8 }}>
              {[
                { s: '✦', l: 'Encrypted and private' },
                { s: '◈', l: '50,000+ seekers'       },
                { s: '◇', l: '4.9 out of 5'          },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10, color: T.gold }}>{item.s}</span>
                  <span style={{ fontSize: 11, color: T.textFaint, fontFamily: T.sans }}>
                    {item.l}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: T.textFaint, fontFamily: T.sans, margin: 0 }}>
              Your data is never shared with third parties
            </p>
          </motion.div>

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
        <Loader2 style={{ width: 26, height: 26, color: '#b8943f' }} className="animate-spin" />
      </div>
    }>
      <BasicInfoPageInner />
    </Suspense>
  )
}