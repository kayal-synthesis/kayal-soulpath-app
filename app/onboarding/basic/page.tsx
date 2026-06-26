'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import {
  Calendar, Clock, MapPin, User, ArrowRight,
  Check, Loader2, ChevronDown, ChevronUp, Info,
  Sparkles, Shield, Star, Zap, Lock,
} from 'lucide-react'
import { format, subYears } from 'date-fns'
import confetti from 'canvas-confetti'
import { buildNumerologyProfile } from '@/lib/welcome/numerology-engine'
import { buildAstrologyProfile }  from '@/lib/welcome/astrology-engine'
import { buildWelcomeCards }      from '@/lib/welcome/paragraph-library'
import { WelcomeModal }           from '@/components/welcome/WelcomeModal'
import type { WelcomeCard }       from '@/lib/welcome/paragraph-library'

const C = {
  parchment:    '#faf7f2',
  white:        '#ffffff',
  purple:       '#2d1b69',
  purpleMid:    '#4c2a9e',
  purpleLight:  '#7c3aed',
  purpleFaint:  'rgba(124,58,237,0.07)',
  purpleBorder: 'rgba(124,58,237,0.18)',
  gold:         '#b8943f',
  goldLight:    '#d4af6e',
  text:         '#1a1714',
  textSub:      '#6b6560',
  textFaint:    'rgba(26,23,20,0.36)',
  border:       'rgba(26,23,20,0.08)',
  serif:        'Georgia, "Times New Roman", serif',
  sans:         '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

function WhySection({ explanation }: { explanation: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 11, color: C.purpleLight, background: 'none',
          border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: C.sans,
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
            <div style={{
              marginTop: 6, padding: '9px 12px', borderRadius: 8,
              background: C.purpleFaint,
              border: `1px solid ${C.purpleBorder}`,
              fontSize: 11, lineHeight: 1.65,
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
        position: 'absolute', left: 12, top: '50%',
        transform: 'translateY(-50%)',
        width: 15, height: 15,
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
          padding: '12px 12px 12px 40px',
          background: focused ? C.white : '#f8f5ef',
          border: `1.5px solid ${focused ? C.purpleLight : C.border}`,
          borderRadius: 10, color: C.text, fontSize: 14,
          fontFamily: C.sans, outline: 'none', transition: 'all 0.2s',
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
            position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.purpleLight}, ${C.gold})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check style={{ width: 11, height: 11, color: C.white }} />
          </div>
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

  const canProceed = () => {
    if (step === 0) return formData.name.trim().length > 0
    if (step === 1) return formData.dob.length > 0
    return true
  }

  const handleNext = () => {
    if (step === 0 && !formData.name.trim()) { setError('Please enter your name'); return }
    if (step === 1 && !formData.dob)         { setError('Please select your date of birth'); return }
    setError('')
    if (step < 3) setStep(step + 1); else handleSubmit()
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    await new Promise(r => setTimeout(r, prefilled ? 800 : 1400))
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
        particleCount: 65, spread: 80, origin: { y: 0.55 },
        colors: [C.purpleLight, C.gold, C.goldLight, '#c084fc'],
        startVelocity: 24, decay: 0.92, ticks: 260,
      })
    } catch {
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
      height: '100dvh', background: C.parchment,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Loader2 style={{ width: 26, height: 26, color: C.purpleLight }} className="animate-spin" />
    </div>
  )

  const stepLabels    = ['Name', 'Birth', 'Time', 'Place']
  const stepQuestions = [
    'What name shall I call you?',
    'When were you born?',
    'What time were you born?',
    'Where were you born?',
  ]

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          height: 100%; overflow: hidden;
          background: ${C.parchment};
        }
        ::placeholder { color: ${C.textFaint}; }
        input[type='date']::-webkit-calendar-picker-indicator,
        input[type='time']::-webkit-calendar-picker-indicator {
          opacity: 0.4; cursor: pointer;
        }
        @keyframes loadingdot {
          0%,100% { transform: translateY(0); opacity: 0.3; }
          50%      { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes orb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(16px,-20px) scale(1.05); }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-12px,16px) scale(1.04); }
        }

        /* ── Shared layout ── */
        .k-page {
          height: 100dvh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: ${C.parchment};
        }

        /* ── Mobile: stacked, full height ── */
        .k-mobile {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .k-mobile-top {
          flex-shrink: 0;
          background: linear-gradient(145deg, ${C.purple} 0%, ${C.purpleMid} 60%, #1e0a4a 100%);
          padding: 20px 20px 28px;
          position: relative;
          overflow: hidden;
          text-align: center;
        }
        .k-mobile-bottom {
          flex: 1;
          overflow: hidden;
          padding: 0 16px 16px;
          margin-top: -18px;
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
        }

        /* ── Desktop: side by side ── */
        .k-desktop {
          display: none;
        }

        @media (min-width: 900px) {
          .k-mobile  { display: none; }
          .k-desktop {
            display: flex;
            height: 100dvh;
            overflow: hidden;
          }
          .k-desktop-left {
            width: 46%;
            height: 100%;
            overflow: hidden;
            background: linear-gradient(145deg, ${C.purple} 0%, ${C.purpleMid} 55%, #1e0a4a 100%);
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 44px 40px;
          }
          .k-desktop-right {
            flex: 1;
            height: 100%;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 32px 44px;
            background: ${C.parchment};
          }
        }
      `}</style>

      <div className="k-page">

        {/* ══════════════════════════════════════
            MOBILE LAYOUT
        ══════════════════════════════════════ */}
        <div className="k-mobile">

          {/* Purple top */}
          <div className="k-mobile-top">
            {/* Orbs */}
            <div style={{
              position:'absolute',width:260,height:260,borderRadius:'50%',
              top:'-70px',left:'-70px',pointerEvents:'none',
              background:'radial-gradient(circle,rgba(124,58,237,0.5) 0%,transparent 70%)',
              animation:'orb1 8s ease-in-out infinite',
            }} />
            <div style={{
              position:'absolute',width:180,height:180,borderRadius:'50%',
              bottom:'-30px',right:'-30px',pointerEvents:'none',
              background:'radial-gradient(circle,rgba(184,148,63,0.4) 0%,transparent 70%)',
              animation:'orb2 10s 1s ease-in-out infinite',
            }} />
            <div style={{
              position:'absolute',inset:0,pointerEvents:'none',
              backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.06) 1px,transparent 0)',
              backgroundSize:'26px 26px',
            }} />

            <div style={{ position:'relative',zIndex:2 }}>
              {/* Badge */}
              <div style={{
                width:44,height:44,margin:'0 auto 10px',borderRadius:13,
                background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.22)',
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                <span style={{ fontSize:18 }}>✦</span>
              </div>

              <h1 style={{
                fontFamily:C.serif,fontSize:22,fontWeight:400,
                color:C.white,letterSpacing:'0.04em',marginBottom:3,
              }}>
                KAYAL SoulPath
              </h1>

              <p style={{
                fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',
                color:C.goldLight,fontFamily:C.sans,marginBottom:8,
              }}>
                Ancient Wisdom · Modern Synthesis
              </p>

              <p style={{
                fontSize:12.5,color:'rgba(255,255,255,0.7)',lineHeight:1.65,
                maxWidth:300,margin:'0 auto 12px',fontFamily:C.serif,
              }}>
                Your complete personal blueprint, built from the exact moment you were born.
              </p>

              {/* Pill badges */}
              <div style={{ display:'flex',justifyContent:'center',gap:6,flexWrap:'wrap' }}>
                {[
                  { s:'✦',l:'Core Nature',c:'rgba(192,132,252,0.9)' },
                  { s:'◈',l:'Right Now',  c:C.goldLight             },
                  { s:'◇',l:'Destiny',    c:'rgba(125,211,252,0.9)' },
                ].map((item,i) => (
                  <div key={i} style={{
                    display:'flex',alignItems:'center',gap:4,
                    padding:'4px 10px',borderRadius:99,
                    background:'rgba(255,255,255,0.1)',
                    border:'1px solid rgba(255,255,255,0.18)',
                  }}>
                    <span style={{ fontSize:9,color:item.c }}>{item.s}</span>
                    <span style={{ fontSize:10,color:'rgba(255,255,255,0.82)',fontFamily:C.sans,fontWeight:500 }}>{item.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="k-mobile-bottom">
            <FormCard
              step={step} setStep={setStep}
              formData={formData} setFormData={setFormData}
              isLoading={isLoading} error={error} setError={setError}
              prefilled={prefilled} canProceed={canProceed}
              handleNext={handleNext} calcAge={calcAge}
              stepLabels={stepLabels} stepQuestions={stepQuestions}
              compact={true}
            />
          </div>
        </div>

        {/* ══════════════════════════════════════
            DESKTOP LAYOUT
        ══════════════════════════════════════ */}
        <div className="k-desktop">

          {/* Left panel */}
          <div className="k-desktop-left">
            {/* Orbs */}
            <div style={{ position:'absolute',width:420,height:420,borderRadius:'50%',top:'-100px',left:'-100px',pointerEvents:'none',background:'radial-gradient(circle,rgba(124,58,237,0.4) 0%,transparent 70%)',animation:'orb1 8s ease-in-out infinite' }} />
            <div style={{ position:'absolute',width:280,height:280,borderRadius:'50%',bottom:'8%',right:'-60px',pointerEvents:'none',background:'radial-gradient(circle,rgba(184,148,63,0.3) 0%,transparent 70%)',animation:'orb2 10s 1s ease-in-out infinite' }} />
            <div style={{ position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.05) 1px,transparent 0)',backgroundSize:'28px 28px' }} />

            {/* Brand block */}
            <div style={{ position:'relative',zIndex:2 }}>
              <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:28 }}>
                <div style={{ width:42,height:42,borderRadius:12,background:'rgba(255,255,255,0.14)',border:'1px solid rgba(255,255,255,0.22)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <span style={{ fontSize:18 }}>✦</span>
                </div>
                <div>
                  <h1 style={{ fontFamily:C.serif,fontSize:20,fontWeight:400,color:C.white,margin:0,letterSpacing:'0.04em' }}>KAYAL SoulPath</h1>
                  <p style={{ fontSize:9,letterSpacing:'0.18em',textTransform:'uppercase',color:C.goldLight,margin:'2px 0 0',fontFamily:C.sans }}>Ancient Wisdom · Modern Synthesis</p>
                </div>
              </div>

              <p style={{ fontSize:14.5,color:'rgba(255,255,255,0.68)',lineHeight:1.85,maxWidth:340,fontFamily:C.serif,marginBottom:32 }}>
                We synthesise your birth data into one precise, personalised blueprint built entirely from the moment you arrived in this world.
              </p>

              {/* Features */}
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                {[
                  { icon:Sparkles,color:'#c084fc',title:'Complete Soul Blueprint',    desc:'9 sections of hyper-personalised insight from your birth data' },
                  { icon:Zap,     color:C.goldLight,title:'Instant Results',          desc:'All calculations in your browser. No loading, no API delay'   },
                  { icon:Star,    color:'#38bdf8',title:'Audio Playback Included',    desc:'Listen to your entire reading with one tap'                    },
                  { icon:Lock,    color:'#86efac',title:'Private by Design',          desc:'Your data never leaves your device. No account required'       },
                ].map(({ icon:Icon,color,title,desc },i) => (
                  <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
                    <div style={{ width:36,height:36,borderRadius:10,flexShrink:0,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',color }}>
                      <Icon style={{ width:16,height:16 }} />
                    </div>
                    <div>
                      <p style={{ margin:'0 0 2px',fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.9)',fontFamily:C.sans }}>{title}</p>
                      <p style={{ margin:0,fontSize:11.5,lineHeight:1.6,color:'rgba(255,255,255,0.5)',fontFamily:C.sans }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonial */}
            <div style={{ position:'relative',zIndex:2,padding:'14px 18px',borderRadius:14,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ display:'flex',gap:2,marginBottom:8 }}>
                {[...Array(5)].map((_,i) => <Star key={i} style={{ width:11,height:11,fill:C.gold,color:C.gold }} />)}
              </div>
              <p style={{ fontSize:12.5,color:'rgba(255,255,255,0.75)',fontFamily:C.serif,lineHeight:1.7,margin:'0 0 8px',fontStyle:'italic' }}>
                "The reading named things about me that I have never told anyone. I do not know how it works but it works."
              </p>
              <p style={{ fontSize:10,color:'rgba(255,255,255,0.38)',fontFamily:C.sans,margin:0,letterSpacing:'0.04em' }}>
                Verified Seeker, Lagos
              </p>
            </div>
          </div>

          {/* Right panel */}
          <div className="k-desktop-right">
            <div style={{ width:'100%',maxWidth:400 }}>
              <div style={{ marginBottom:20 }}>
                <h2 style={{ fontFamily:C.serif,fontSize:24,fontWeight:400,color:C.text,margin:'0 0 5px' }}>
                  Discover Your Blueprint
                </h2>
                <p style={{ fontSize:13.5,color:C.textSub,margin:0,fontFamily:C.serif,lineHeight:1.65 }}>
                  Four questions. Thirty seconds. A reading that will stay with you.
                </p>
              </div>
              <FormCard
                step={step} setStep={setStep}
                formData={formData} setFormData={setFormData}
                isLoading={isLoading} error={error} setError={setError}
                prefilled={prefilled} canProceed={canProceed}
                handleNext={handleNext} calcAge={calcAge}
                stepLabels={stepLabels} stepQuestions={stepQuestions}
                compact={false}
              />
            </div>
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

// ── Form card — shared between mobile and desktop ─────────────
function FormCard({
  step, setStep, formData, setFormData,
  isLoading, error, setError, prefilled,
  canProceed, handleNext, calcAge,
  stepLabels, stepQuestions, compact,
}: any) {
  const pad = compact ? '18px 18px' : '22px 20px'

  return (
    <div style={{
      background: C.white,
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: '0 4px 28px rgba(26,23,20,0.1), 0 1px 4px rgba(26,23,20,0.05)',
      flex: compact ? '1' : undefined,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Gradient strip */}
      <div style={{
        height: 3, flexShrink: 0,
        background: `linear-gradient(90deg,${C.purple},${C.purpleLight},${C.gold})`,
      }} />

      <div style={{ padding: pad, flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Prefilled notice */}
        {prefilled && formData.name && formData.dob && (
          <div style={{
            marginBottom: compact ? 12 : 16,
            padding: '8px 12px', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 8,
            background: C.purpleFaint, border: `1px solid ${C.purpleBorder}`,
            flexShrink: 0,
          }}>
            <Check style={{ width: 12, height: 12, color: C.purpleLight, flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: C.purpleLight, margin: 0, fontFamily: C.sans, fontWeight: 600 }}>
              {formData.name} · {formData.dob}
            </p>
          </div>
        )}

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 5, marginBottom: compact ? 16 : 20, flexShrink: 0 }}>
          {stepLabels.map((label: string, i: number) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{
                fontSize: 8, textAlign: 'center', marginBottom: 4,
                fontFamily: C.sans, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: i <= step ? C.purpleLight : C.textFaint,
                transition: 'color 0.3s',
              }}>
                {label}
              </div>
              <div style={{
                height: 2, borderRadius: 2,
                background: i < step
                  ? `linear-gradient(90deg,${C.purpleLight},${C.gold})`
                  : i === step ? C.purpleLight : C.border,
                transition: 'background 0.4s',
              }} />
            </div>
          ))}
        </div>

        {/* Step content */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              <p style={{
                fontSize: compact ? 12 : 13,
                color: C.textSub,
                marginBottom: compact ? 10 : 12,
                textAlign: 'center',
                fontFamily: C.serif,
              }}>
                {stepQuestions[step]}
              </p>

              {step === 0 && (
                <div>
                  <FieldInput
                    type="text" value={formData.name} autoFocus
                    icon={User} placeholder="Your full name"
                    onChange={(v: string) => { setFormData({ ...formData, name: v }); setError('') }}
                  />
                  <WhySection explanation="Your name is used to calculate your Destiny number, the contribution you are here to make." />
                </div>
              )}

              {step === 1 && (
                <div>
                  <FieldInput
                    type="date" value={formData.dob} autoFocus icon={Calendar}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    min={format(subYears(new Date(), 120), 'yyyy-MM-dd')}
                    onChange={(v: string) => { setFormData({ ...formData, dob: v }); setError('') }}
                  />
                  {formData.dob && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        fontSize: 12, marginTop: 7, fontFamily: C.serif,
                        background: `linear-gradient(90deg,${C.purpleLight},${C.gold})`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      }}
                    >
                      ✦ You are {calcAge(formData.dob)} years into your journey
                    </motion.p>
                  )}
                  <WhySection explanation="Your birth date powers every timing calculation in your reading, what year you are in, what chapter of life you are living." />
                </div>
              )}

              {step === 2 && (
                <div>
                  <FieldInput
                    type="time" value={formData.birthTime} autoFocus icon={Clock}
                    onChange={(v: string) => setFormData({ ...formData, birthTime: v })}
                  />
                  <button
                    onClick={() => setStep(3)}
                    style={{
                      marginTop: 8, fontSize: 11, color: C.purpleLight,
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 3,
                      fontFamily: C.sans, padding: 0,
                    }}
                  >
                    Skip this step <ArrowRight style={{ width: 10, height: 10 }} />
                  </button>
                  <WhySection explanation="Birth time refines the astrological layer of your reading. Optional but adds depth." />
                </div>
              )}

              {step === 3 && (
                <div>
                  <FieldInput
                    type="text" value={formData.birthLocation} autoFocus
                    icon={MapPin} placeholder="City, Country"
                    onChange={(v: string) => setFormData({ ...formData, birthLocation: v })}
                  />
                  <WhySection explanation="Birthplace adds geographic context to your astrological reading. Optional." />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {error && (
          <p style={{ fontSize: 11, color: '#b91c1c', marginTop: 6, fontFamily: C.sans, flexShrink: 0 }}>
            {error}
          </p>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: compact ? 12 : 16, flexShrink: 0 }}>
          {step > 0 && (
            <motion.button
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              onClick={() => setStep(step - 1)}
              style={{
                flex: 1, padding: compact ? '11px' : '13px', borderRadius: 10,
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
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
              padding: compact ? '11px' : '13px',
              borderRadius: 10, fontSize: 13, fontWeight: 700,
              cursor: canProceed() && !isLoading ? 'pointer' : 'not-allowed',
              border: 'none', color: C.white,
              background: canProceed() && !isLoading
                ? `linear-gradient(135deg,${C.purple},${C.purpleLight})`
                : C.border,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              fontFamily: C.sans, transition: 'all 0.25s',
              opacity: !canProceed() || isLoading ? 0.6 : 1,
              boxShadow: canProceed() && !isLoading
                ? '0 4px 14px rgba(124,58,237,0.32)' : 'none',
            }}
          >
            {isLoading ? (
              <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Calculating...</>
            ) : (
              <>
                {step === 3
                  ? (prefilled ? 'Complete Setup' : 'Reveal My Blueprint')
                  : 'Continue'}
                {step < 3 && <ArrowRight style={{ width: 14, height: 14 }} />}
              </>
            )}
          </motion.button>
        </div>

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 12, flexShrink: 0 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%', background: C.purpleLight,
                animation: `loadingdot 0.75s ${i * 0.15}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        )}

        {/* Trust */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: 14, marginTop: compact ? 10 : 14, flexWrap: 'wrap', flexShrink: 0,
        }}>
          {[
            { icon: Lock,    l: 'Private' },
            { icon: Star,    l: '4.9 / 5' },
            { icon: Sparkles,l: '50k seekers' },
          ].map(({ icon: Icon, l }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Icon style={{ width: 9, height: 9, color: C.purpleLight }} />
              <span style={{ fontSize: 10, color: C.textFaint, fontFamily: C.sans }}>{l}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

export default function BasicInfoPage() {
  return (
    <Suspense fallback={
      <div style={{
        height: '100dvh', background: '#faf7f2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 style={{ width: 26, height: 26, color: '#7c3aed' }} className="animate-spin" />
      </div>
    }>
      <BasicInfoPageInner />
    </Suspense>
  )
}