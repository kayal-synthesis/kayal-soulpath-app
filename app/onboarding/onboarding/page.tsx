'use client'

/**
 * app/onboarding/page.tsx
 * ========================
 * 5-step guided first experience.
 * Collects everything needed for a rich synthesis.
 *
 * Steps:
 *  1. Name + DOB (required)
 *  2. Birth location (required for astrology)
 *  3. Birth time (optional — shows why it matters)
 *  4. Face photo (optional — shows which tools need it)
 *  5. Palm photo (optional — shows which tools need it)
 *  → Synthesis triggered → redirect to home
 */

import { useState, useRef } from 'react'
import { useRouter }         from 'next/navigation'
import { useAuth }           from '@/lib/hooks/useAuth'
import {
  ArrowRight, ArrowLeft, Camera,
  Hand, MapPin, Clock, Sparkles,
  Check, X
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface OnboardingData {
  full_name:      string
  date_of_birth:  string   // YYYY-MM-DD
  birth_location: string
  birth_time:     string   // HH:MM or ''
  face_image:     File | null
  palm_image:     File | null
}

type StepId = 'identity' | 'location' | 'time' | 'face' | 'palm'

interface Step {
  id:       StepId
  label:    string
  emoji:    string
  required: boolean
}

const STEPS: Step[] = [
  { id: 'identity', label: 'Who you are',     emoji: '✨', required: true  },
  { id: 'location', label: 'Where you began', emoji: '🌍', required: true  },
  { id: 'time',     label: 'When you arrived',emoji: '⏰', required: false },
  { id: 'face',     label: 'Your face',        emoji: '👁️', required: false },
  { id: 'palm',     label: 'Your palm',        emoji: '✋', required: false },
]

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router   = useRouter()
  const { user } = useAuth()

  const [stepIndex,  setStepIndex]  = useState(0)
  const [data,       setData]       = useState<OnboardingData>({
    full_name:      '',
    date_of_birth:  '',
    birth_location: '',
    birth_time:     '',
    face_image:     null,
    palm_image:     null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [facePreview,setFacePreview]= useState<string | null>(null)
  const [palmPreview,setPalmPreview]= useState<string | null>(null)

  const faceInputRef = useRef<HTMLInputElement>(null)
  const palmInputRef = useRef<HTMLInputElement>(null)

  const step     = STEPS[stepIndex]
  const isLast   = stepIndex === STEPS.length - 1
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  // ── Validation ───────────────────────────────────────────
  const canProceed = () => {
    if (step.id === 'identity') {
      return data.full_name.trim().length >= 2 &&
             /^\d{4}-\d{2}-\d{2}$/.test(data.date_of_birth)
    }
    if (step.id === 'location') {
      return data.birth_location.trim().length >= 2
    }
    return true // optional steps always allow proceed
  }

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!user?.id) return
    setSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('full_name',      data.full_name.trim())
      formData.append('date_of_birth',  data.date_of_birth)
      formData.append('birth_location', data.birth_location.trim())
      formData.append('tool_id',        'onboarding')
      formData.append('user_token',     user.id)
      if (data.birth_time) formData.append('birth_time', data.birth_time)
      if (data.face_image)  formData.append('facial_image', data.face_image)
      if (data.palm_image)  formData.append('palm_image',   data.palm_image)

      const res = await fetch(`${API}/api/reading/submit`, {
        method: 'POST',
        body:   formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? 'Synthesis failed')
      }

      // Poll for completion
      const { job_id } = await res.json()
      let attempts = 0
      const poll = async () => {
        if (attempts++ > 30) throw new Error('Synthesis timed out')
        const jobRes = await fetch(`${API}/api/reading/job/${job_id}`)
        const job    = await jobRes.json()
        if (job.status === 'completed') {
          router.push('/home')
        } else if (job.status === 'failed') {
          throw new Error(job.error ?? 'Synthesis failed')
        } else {
          setTimeout(poll, 2000)
        }
      }
      await poll()

    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    if (isLast) { handleSubmit(); return }
    setStepIndex(p => p + 1)
  }

  const handleBack = () => {
    if (stepIndex === 0) { router.push('/'); return }
    setStepIndex(p => p - 1)
  }

  const handleFileSelect = (
    file:      File | null,
    type:      'face' | 'palm',
  ) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    if (type === 'face') {
      setData(p => ({ ...p, face_image: file }))
      setFacePreview(url)
    } else {
      setData(p => ({ ...p, palm_image: file }))
      setPalmPreview(url)
    }
  }

  // ─────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{
        background:  'radial-gradient(ellipse at 50% 0%, #12100e 0%, #060608 70%)',
        fontFamily:  'var(--font-body)',
      }}
    >
      {/* Grain */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
      />

      <div className="max-w-sm w-full space-y-6 relative animate-fade-up">

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-widest uppercase font-label" style={{ color: 'var(--text-void)' }}>
              Step {stepIndex + 1} of {STEPS.length}
            </span>
            <span className="text-[9px] tracking-widest uppercase font-label" style={{ color: 'var(--text-void)' }}>
              {step.required ? 'Required' : 'Optional'}
            </span>
          </div>
          <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'var(--gold)' }}
            />
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className="transition-all duration-300"
                style={{
                  width:      i === stepIndex ? '20px' : '6px',
                  height:     '6px',
                  borderRadius: '9999px',
                  background:  i < stepIndex  ? 'var(--gold)' :
                               i === stepIndex ? 'var(--gold)' :
                               'var(--surface)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}
        >
          {/* Step header */}
          <div className="text-center">
            <div className="text-4xl mb-3">{step.emoji}</div>
            <h2
              className="text-xl mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-parchment)' }}
            >
              {step.label}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-stone)' }}>
              {step.id === 'identity'  && 'Your name and date of birth are the foundation of your synthesis'}
              {step.id === 'location'  && 'Birth location enables precise astrological calculations'}
              {step.id === 'time'      && 'Birth time makes your chart precise — Ascendant, house positions, timing'}
              {step.id === 'face'      && 'Unlocks face reading tools — physiognomy, archetype, vitality markers'}
              {step.id === 'palm'      && 'Unlocks palm reading tools — life line, heart line, fate line analysis'}
            </p>
          </div>

          {/* Step content */}

          {/* IDENTITY */}
          {step.id === 'identity' && (
            <div className="space-y-3">
              <div>
                <label className="text-[9px] tracking-widest uppercase font-label block mb-1.5"
                  style={{ color: 'var(--text-void)' }}>
                  Full name
                </label>
                <input
                  type="text"
                  value={data.full_name}
                  onChange={e => setData(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="As it appears on your birth certificate"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'var(--surface)',
                    border:     `1px solid ${data.full_name ? 'var(--gold-border)' : 'var(--rim)'}`,
                    color:      'var(--text-parchment)',
                    caretColor: 'var(--gold)',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              </div>
              <div>
                <label className="text-[9px] tracking-widest uppercase font-label block mb-1.5"
                  style={{ color: 'var(--text-void)' }}>
                  Date of birth
                </label>
                <input
                  type="date"
                  value={data.date_of_birth}
                  onChange={e => setData(p => ({ ...p, date_of_birth: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background:  'var(--surface)',
                    border:      `1px solid ${data.date_of_birth ? 'var(--gold-border)' : 'var(--rim)'}`,
                    color:       'var(--text-parchment)',
                    caretColor:  'var(--gold)',
                    fontFamily:  'var(--font-body)',
                    colorScheme: 'dark',
                  }}
                />
              </div>
            </div>
          )}

          {/* LOCATION */}
          {step.id === 'location' && (
            <div>
              <label className="text-[9px] tracking-widest uppercase font-label block mb-1.5"
                style={{ color: 'var(--text-void)' }}>
                City and country of birth
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                  style={{ color: 'var(--text-void)' }} />
                <input
                  type="text"
                  value={data.birth_location}
                  onChange={e => setData(p => ({ ...p, birth_location: e.target.value }))}
                  placeholder="e.g. Lagos, Nigeria"
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'var(--surface)',
                    border:     `1px solid ${data.birth_location ? 'var(--gold-border)' : 'var(--rim)'}`,
                    color:      'var(--text-parchment)',
                    caretColor: 'var(--gold)',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              </div>
              <p className="text-[9px] mt-2" style={{ color: 'var(--text-void)' }}>
                Used for sun sign, moon sign, and planetary positions
              </p>
            </div>
          )}

          {/* TIME */}
          {step.id === 'time' && (
            <div>
              <label className="text-[9px] tracking-widest uppercase font-label block mb-1.5"
                style={{ color: 'var(--text-void)' }}>
                Time of birth (optional)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                  style={{ color: 'var(--text-void)' }} />
                <input
                  type="time"
                  value={data.birth_time}
                  onChange={e => setData(p => ({ ...p, birth_time: e.target.value }))}
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background:  'var(--surface)',
                    border:      `1px solid ${data.birth_time ? 'var(--gold-border)' : 'var(--rim)'}`,
                    color:       'var(--text-parchment)',
                    caretColor:  'var(--gold)',
                    fontFamily:  'var(--font-body)',
                    colorScheme: 'dark',
                  }}
                />
              </div>
              <div className="mt-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--rim)' }}>
                <p className="text-[9px] leading-relaxed" style={{ color: 'var(--text-stone)' }}>
                  Without birth time, a solar chart is used — accurate for numerology
                  and most astrological work. Birth time adds precision for the Ascendant
                  and house positions. Check your birth certificate if unsure.
                </p>
              </div>
            </div>
          )}

          {/* FACE */}
          {step.id === 'face' && (
            <div className="space-y-3">
              {facePreview ? (
                <div className="relative">
                  <img src={facePreview} alt="Face" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    onClick={() => { setFacePreview(null); setData(p => ({ ...p, face_image: null })) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => faceInputRef.current?.click()}
                  className="w-full h-36 rounded-xl flex flex-col items-center justify-center gap-2 transition-all"
                  style={{ background: 'var(--surface)', border: '2px dashed var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-border)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--muted)')}
                >
                  <Camera className="w-6 h-6" style={{ color: 'var(--text-void)' }} />
                  <span className="text-[10px] font-label tracking-widest uppercase" style={{ color: 'var(--text-void)' }}>
                    Upload face photo
                  </span>
                </button>
              )}
              <input
                ref={faceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFileSelect(e.target.files?.[0] ?? null, 'face')}
              />
              <div className="px-3 py-2.5 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--rim)' }}>
                <p className="text-[9px] leading-relaxed" style={{ color: 'var(--text-stone)' }}>
                  Front-facing, well-lit, no sunglasses. Used for face shape analysis,
                  archetype reading, and vitality markers. Not stored publicly.
                </p>
              </div>
            </div>
          )}

          {/* PALM */}
          {step.id === 'palm' && (
            <div className="space-y-3">
              {palmPreview ? (
                <div className="relative">
                  <img src={palmPreview} alt="Palm" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    onClick={() => { setPalmPreview(null); setData(p => ({ ...p, palm_image: null })) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => palmInputRef.current?.click()}
                  className="w-full h-36 rounded-xl flex flex-col items-center justify-center gap-2 transition-all"
                  style={{ background: 'var(--surface)', border: '2px dashed var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-border)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--muted)')}
                >
                  <Hand className="w-6 h-6" style={{ color: 'var(--text-void)' }} />
                  <span className="text-[10px] font-label tracking-widest uppercase" style={{ color: 'var(--text-void)' }}>
                    Upload palm photo
                  </span>
                </button>
              )}
              <input
                ref={palmInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFileSelect(e.target.files?.[0] ?? null, 'palm')}
              />
              <div className="flex gap-2">
                {['Right hand (dominant)', 'Fingers together', 'Good light'].map(tip => (
                  <span key={tip} className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-full"
                    style={{ background: 'var(--surface)', color: 'var(--text-void)', border: '1px solid var(--rim)' }}>
                    <Check className="w-2.5 h-2.5" />
                    {tip}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl text-xs text-center"
            style={{ background: '#140808', border: '1px solid #301010', color: '#a05050' }}>
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-label tracking-widest uppercase transition-all"
            style={{
              background: 'var(--depth)',
              color:      'var(--text-stone)',
              border:     '1px solid var(--rim)',
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed() || submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-label tracking-widest uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{
              background: canProceed() && !submitting
                ? 'linear-gradient(135deg, var(--gold), var(--gold-dim))'
                : 'var(--surface)',
              color:      canProceed() && !submitting ? 'var(--void)' : 'var(--text-void)',
              boxShadow:  canProceed() && !submitting ? 'var(--shadow-gold)' : 'none',
            }}
          >
            {submitting ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--void)' }} />
                Building your synthesis…
              </>
            ) : isLast ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Build My Synthesis
              </>
            ) : (
              <>
                {step.required ? 'Continue' : 'Continue'}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Skip optional */}
        {!step.required && !isLast && (
          <button
            onClick={() => setStepIndex(p => p + 1)}
            className="w-full text-center text-[9px] tracking-widest uppercase font-label transition-colors"
            style={{ color: 'var(--text-void)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-stone)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-void)')}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}
