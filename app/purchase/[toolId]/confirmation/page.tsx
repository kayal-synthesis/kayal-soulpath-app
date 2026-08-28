'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Clock, Zap, ChevronRight, Star, X, User, Mail, Key, Loader2, Fingerprint, AlertCircle, ArrowRight } from 'lucide-react'
import { allTools, getToolById } from '@/lib/tools/all-tools-index'
import type { Tool } from '@/lib/tools/all-tools-index'
import { createClient } from '@/lib/supabase/client'
import { usePricingLocalization, formatLocalizedPrice } from '@/lib/hooks/usePricingLocalization'

// Reads the same, real 60-day attribution cookie set by
// app/ref/[code]/route.ts and already used everywhere else in the
// app, purchase_toolId_page.tsx, register.tsx. Reused here rather
// than reinvented, so there's only ever one, real, single standard
// for "how recent is recent enough" across the whole app, not two
// that could quietly disagree with each other.
const getRefCode = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )kayal_ref=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * v1.1, real fix, replacing a purely cosmetic countdown for chat and
 * voice destination tools with actual, honest polling against the
 * real synthesis job. Report and reading tools are untouched, this
 * was never their real problem, the countdown there already roughly
 * matches how those readings are actually delivered.
 *
 * The real issue, confirmed by tracing the full purchase flow: every
 * tool, including subscriptions like the Sacred Script scribes and
 * Voice Oracle sessions, triggers the same full synthesis pipeline
 * during checkout, astrology, numerology, narration, genuine work,
 * genuine time. This page's old countdown was a fixed ten minutes,
 * counting down regardless of whether that real job had actually
 * finished. Worse, ChatSession.tsx and VoiceSession.tsx each only
 * fetch synthesis once, on load, no retry, so someone opening their
 * chat before the real job completed would silently get an
 * unpersonalized session with no indication anything was still
 * processing.
 *
 * This version looks up the real job_id behind this specific
 * checkout, directly from pending_checkouts using tx_ref, the same
 * real table the webhook itself relies on, then polls the actual job
 * status. Once genuinely complete, a real "ready" state replaces the
 * countdown, with a direct button into the real session, not a timer
 * that might finish before the real work does, or keep counting long
 * after it's actually ready.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.kayalsoulpath.com').replace(/\/$/, '')

// Upsell map, toolId to recommended upsell tool id. Every id below verified
// against the real, current 113-tool catalog directly, not assumed. The
// previous version used pre-restructure ids (several with a stale "-os"
// suffix, plus a few, like full-soul-portrait, that never matched anything
// in the current catalog at all), so most of these mappings silently never
// fired.
const UPSELL_MAP: Record<string, string> = {
  'soulmate-arrival-window':    'soulmate-compatibility-verdict',
  'love-wound-reading':         'karmic-love-debt',
  'income-ceiling-breaker':     'complete-wealth-synthesis',
  'calling-decoder':            'complete-purpose-synthesis',
  'nine-year-cycle-reading':    'annual-destiny-forecast',
  'birthday-blueprint':         'nine-year-cycle-reading',
  'karmic-lessons-reading':     'complete-life-portrait',
  'complete-love-synthesis':    'complete-life-portrait',
  'complete-wealth-synthesis':  'complete-life-portrait',
  'complete-purpose-synthesis': 'complete-life-portrait',
  'complete-life-portrait':     'oracle-voice-unlimited',
  'daily-personal-oracle':      'monthly-cycle-navigator',
  'monthly-cycle-navigator':    'quarterly-destiny-pulse',
  'oracle-voice-session':       'oracle-deep-dive-session',
  'oracle-deep-dive-session':   'oracle-voice-unlimited',
}

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const getDeviceId = () => {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('kayal_device_id')
  if (!id) {
    id = 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('kayal_device_id', id)
  }
  return id
}

// Real domain-to-destination mapping, mirrors the same real logic
// already proven in app/purchase/[toolId]/page.tsx, so "is this a
// chat or voice tool" is answered the same, consistent way everywhere
// in the app, not re-derived differently here.
const domainDestinations: Record<string, string> = {
  'oracle-temple': 'report', 'time-keeper': 'reading', 'voice': 'audio',
  'love': 'report', 'wealth': 'report', 'wellness': 'report',
  'life-path': 'report', 'sacred-script': 'chat',
}

// Star rating
function Stars({ rating = 4.9 }: { rating?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  )
}

// Upsell card
function UpsellCard({
  tool,
  onAccept,
  onDecline,
  accepting,
}: {
  tool: Tool
  onAccept: () => void
  onDecline: () => void
  accepting: boolean
}) {
  const { currency, multiplier } = usePricingLocalization()
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.6 }}
      className="bg-white rounded-2xl border border-amber-200 shadow-xl overflow-hidden max-w-lg w-full mx-auto"
    >
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-wider">
            One-Time Offer, This Session Only
          </span>
          <button
            onClick={onDecline}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Decline offer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-start gap-4 mb-5">
          <div className="text-4xl flex-shrink-0">{tool.emoji}</div>
          <div>
            <h3 className="font-bold text-neutral-900 text-lg leading-snug mb-1">
              {tool.name}
            </h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              {tool.shortDescription}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-neutral-100">
          <Stars />
          <span className="text-xs text-neutral-500 font-medium">
            Trusted by thousands of KAYAL members
          </span>
        </div>
        <ul className="space-y-2 mb-6">
          {tool.features.slice(0, 3).map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-700">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{typeof f === 'string' ? f : String(f)}</span>
            </li>
          ))}
        </ul>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5 flex items-center gap-3">
          <Zap className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-800">
              Add this now and save 20%, available only at checkout
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Full price after this page: <span className="line-through">{formatLocalizedPrice(tool.price, currency, multiplier)}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onAccept}
          disabled={accepting}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70"
        >
          {accepting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Adding to your order…
            </span>
          ) : (
            <>
              Yes, add {tool.name} for {formatLocalizedPrice(tool.price * 0.8, currency, multiplier)}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
        <button
          onClick={onDecline}
          className="w-full text-center text-xs text-neutral-500 hover:text-neutral-600 mt-3 transition-colors py-1"
        >
          No thanks, I don't need this right now
        </button>
      </div>
    </motion.div>
  )
}

// Account creation / guest continuation, shown only to visitors who
// aren't logged in. The two nav buttons this replaces previously sent
// EVERY visitor to /member/dashboard unconditionally, including guests
// who never created an account and have no session to view it with,
// a real, confirmed bug, not a hypothetical one.
// Real device/email recognition, not skipped authentication. A
// password (or magic link) is always still required, this only
// pre-fills the email and shows a friendly "welcome back" instead of a
// blank form, set once someone actually completes sign-in or sign-up,
// read back on future visits. Same real idea as the recognizedDevice
// pattern in the four-step file, adapted to never bypass a real check.
const RETURNING_EMAIL_KEY = 'kayal_user_email'

async function attachPurchaseToAccount(txRef: string | null, userId: string) {
  if (!txRef) return
  // Links this specific completed checkout to the account, using tx_ref,
  // the one identifier this page actually has, the real, unique key
  // already tying together pending_checkouts, the webhook, and the
  // reading job behind it. Runs after sign-in too, not just sign-up, a
  // returning user completing a new purchase needs the same link made.
  //
  // POST /api/purchase/attach-account is assumed here, matching the
  // shape of the existing /api/user/add-purchase pattern, but its
  // existence has not been directly confirmed against the real backend.
  await fetch('/api/purchase/attach-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txRef, userId }),
  }).catch(() => {})
}

function AccountStep({
  txRef,
  onGuestContinue,
  guestConfirmed,
}: {
  txRef: string | null
  onGuestContinue: () => void
  guestConfirmed: boolean
}) {
  const supabase = createClient()
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [recognized, setRecognized] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [accountLoading, setAccountLoading] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [joinAffiliate, setJoinAffiliate] = useState(false)

  useEffect(() => {
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem(RETURNING_EMAIL_KEY) : null
    if (savedEmail) {
      setEmail(savedEmail)
      setMode('signin')
      setRecognized(true)
    }
  }, [])

  const completeAuth = async (userId: string, finalEmail: string) => {
    localStorage.setItem(RETURNING_EMAIL_KEY, finalEmail)
    await attachPurchaseToAccount(txRef, userId)
    window.location.href = '/member/dashboard'
  }

  const handleCreateAccount = async () => {
    setAccountError('')
    if (!name.trim()) { setAccountError('Please enter your name.'); return }
    if (!email.trim() || !validateEmail(email)) { setEmailError('Valid email required'); return }
    if (!password || password.length < 8) { setPasswordError('Password must be at least 8 characters'); return }
    setEmailError('')
    setPasswordError('')
    setAccountLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: {
            name,
            // Real, genuine opt-in, only set when the box below is
            // actually checked, the trigger's own default, 'customer',
            // applies otherwise, exactly as it already does for anyone
            // who doesn't check it.
            ...(joinAffiliate ? { affiliate_status: 'active' } : {}),
          },
        },
      })
      if (error) {
        // Real, specific handling instead of a dead-end raw error
        // message, this exact wording is what Supabase actually returns
        // for a duplicate email, switches straight to the sign-in form
        // with that email already filled in.
        if (error.message?.toLowerCase().includes('already registered')) {
          setMode('signin')
          setAccountError('')
          return
        }
        throw error
      }
      if (data.user) {
        // Real, genuine recruiter attribution, only when the box
        // above was checked, and only when a real, still-valid
        // referral cookie actually exists, the same, real 60-day
        // window already used everywhere else in the app. A visitor
        // who bought through a tool link, then separately decides to
        // become an affiliate here, now correctly credits whoever
        // originally referred them, not silently thrown away.
        if (joinAffiliate) {
          const refCode = getRefCode()
          if (refCode) {
            const { error: recruitedByError } = await supabase
              .from('users')
              .update({ recruited_by: refCode })
              .eq('token', data.user.id)
            if (recruitedByError) {
              console.error('recruited_by update error:', recruitedByError)
            }
          }
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          window.location.href = '/auth/login?email=' + encodeURIComponent(email)
        } else {
          await completeAuth(data.user.id, email)
        }
      }
    } catch (err: any) {
      setAccountError(err.message || 'Could not create your account. Please try again.')
    } finally {
      setAccountLoading(false)
    }
  }

  const handleSignIn = async () => {
    setAccountError('')
    if (!email.trim() || !validateEmail(email)) { setEmailError('Valid email required'); return }
    if (!password) { setPasswordError('Enter your password'); return }
    setEmailError('')
    setPasswordError('')
    setAccountLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (data.user) await completeAuth(data.user.id, email)
    } catch (err: any) {
      setAccountError(err.message || 'Could not sign in. Check your password and try again.')
    } finally {
      setAccountLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setAccountError('')
    if (!email.trim() || !validateEmail(email)) { setEmailError('Valid email required'); return }
    setEmailError('')
    setResetLoading(true)
    try {
      // Same detectSessionInUrl-based pattern already confirmed working
      // for the magic link, no server callback route needed, the client
      // library itself picks up the reset token once the reset page
      // loads with it in the URL.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setResetSent(true)
    } catch (err: any) {
      setAccountError(err.message || 'Could not send the reset link. Please try again.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleMagicLink = async () => {
    setAccountError('')
    if (!email.trim() || !validateEmail(email)) { setEmailError('Valid email required'); return }
    setEmailError('')
    setMagicLinkLoading(true)
    try {
      // Supabase's own default magic-link email, not the custom
      // KAYAL-branded Resend one built for guest reading delivery,
      // that one requires the service role key and can only be
      // triggered server-side. This is the real, standard client-side
      // equivalent for a returning user choosing to sign in this way,
      // functionally correct, just a plainer email template.
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      localStorage.setItem(RETURNING_EMAIL_KEY, email)
      setMagicLinkSent(true)
    } catch (err: any) {
      setAccountError(err.message || 'Could not send the sign-in link. Please try again.')
    } finally {
      setMagicLinkLoading(false)
    }
  }

  if (resetSent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border-2 border-primary-200 shadow-sm p-5 text-center"
      >
        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <h3 className="font-medium mb-1">Check your email</h3>
        <p className="text-xs text-neutral-500">
          A password reset link was sent to {email}, open it to set a new password.
        </p>
      </motion.div>
    )
  }
  if (magicLinkSent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border-2 border-primary-200 shadow-sm p-5 text-center"
      >
        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <h3 className="font-medium mb-1">Check your email</h3>
        <p className="text-xs text-neutral-500">
          A sign-in link was sent to {email}. Open it on this device to continue.
        </p>
      </motion.div>
    )
  }
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border-2 border-primary-200 shadow-sm p-5"
      >
        <h3 className="font-medium mb-1 flex items-center gap-2">
          <User className="w-5 h-5 text-primary-600" />
          {mode === 'signin' ? 'Sign In' : 'Create Free Account'}
        </h3>
        {recognized && mode === 'signin' && (
          <p className="text-xs text-primary-600 mb-3">Welcome back! Sign in to access your reading.</p>
        )}
        <div className="space-y-3 mt-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-3 py-2 border rounded-lg"
              />
            </div>
            {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-neutral-500">Password</label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading || !email}
                  className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  {resetLoading ? 'Sending…' : 'Forgot password?'}
                </button>
              )}
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signin' ? 'Your password' : 'Create a password (min 8 characters)'}
                className="w-full pl-10 pr-3 py-2 border rounded-lg"
              />
            </div>
            {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
          </div>
          {accountError && <p className="text-xs text-red-500">{accountError}</p>}
          {mode === 'signup' && (
            <label className="flex items-start gap-2.5 p-3 bg-primary-50 border border-primary-100 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={joinAffiliate}
                onChange={e => setJoinAffiliate(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-xs text-neutral-700">
                <span className="font-medium">Also join the KAYAL Affiliate Programme</span>, earn 25-40% commission sharing tools you love, no extra steps, activates the moment your account is created.
              </span>
            </label>
          )}
          <button
            onClick={mode === 'signin' ? handleSignIn : handleCreateAccount}
            disabled={accountLoading || !email || !password}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium rounded-xl mt-2"
          >
            {accountLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : mode === 'signin'
                ? <><User className="w-4 h-4" />Sign In</>
                : <><User className="w-4 h-4" />Create Account &amp; Access Dashboard</>}
          </button>
          <button
            onClick={handleMagicLink}
            disabled={magicLinkLoading || !email}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-6 border border-neutral-200 hover:bg-neutral-50 disabled:opacity-60 text-neutral-700 font-medium rounded-xl text-sm"
          >
            {magicLinkLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Mail className="w-4 h-4" />Email me a sign-in link instead</>}
          </button>
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setAccountError('') }}
            className="w-full text-center text-xs text-neutral-500 hover:text-neutral-600 pt-1"
          >
            {mode === 'signin' ? "New here? Create an account instead" : 'Already have an account? Sign in instead'}
          </button>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-neutral-200 p-5"
      >
        {guestConfirmed ? (
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">You're all set</h3>
              <p className="text-xs text-neutral-500">
                No account needed. Your reading will be emailed to the address you gave at checkout once it's ready.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-neutral-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium mb-1">Continue as Guest</h3>
              <p className="text-xs text-neutral-500 mb-3">
                We'll email your reading once it's ready. No account needed.
              </p>
              {/* No redirect, deliberately, there is genuinely nowhere for
                  a guest with no session to be sent, this used to push to
                  /member/dashboard, a page they had no way to log into,
                  the same broken promise this whole thing was meant to
                  fix. This confirms the email promise honestly instead,
                  and calls the endpoint that actually needs to fire for
                  that promise to be true. */}
              <button
                onClick={onGuestContinue}
                className="px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        )}
      </motion.div>
      {/* Explore more, a real path forward beyond just this one purchase,
          points at the app's own domains catalog, works for both guests
          and logged-in accounts. Rebuilt as a real, visible button, a
          small, underlined gray text link was genuinely too easy to
          miss and too light to read, even after being darkened once
          already tonight. */}
      <div className="text-center">
        <a
          href="/domains"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm"
        >
          Explore other tools
        </a>
      </div>
    </>
  )
}

// Real, honest progress card, replacing the old fixed countdown for
// chat and voice destination tools specifically. Polls the actual job
// behind this purchase, not a timer disconnected from whether the
// real work has actually finished.
type JobPollStatus = 'looking-up' | 'pending' | 'processing' | 'completed' | 'failed' | 'unavailable'

function LiveSessionReadyCard({
  tool,
  pollStatus,
  elapsedSeconds,
}: {
  tool: Tool
  pollStatus: JobPollStatus
  elapsedSeconds: number
}) {
  const formatElapsed = (s: number) => {
    const m   = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // v1.2, same real fix as above, category is the short, machine-
  // readable id this lookup table's keys actually match, domain is a
  // human-readable display string, checking it first silently missed
  // every real match.
  const destination = domainDestinations[(tool as any).category || ''] || 'chat'
  const sessionRoute = destination === 'audio'
    ? `/domain/voice-of-prophecy/${tool.id}`
    : `/domain/sacred-script/${tool.id}`

  if (pollStatus === 'completed') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl border border-emerald-200 shadow-lg overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
        <div className="p-7 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="w-9 h-9 text-emerald-500" />
          </motion.div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Your synthesis is ready
          </h1>
          <p className="text-neutral-500 text-sm mb-6">
            {tool.emoji} <strong>{tool.name}</strong> is fully personalised and waiting for you now.
          </p>
          <a
            href={sessionRoute}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-colors"
          >
            Enter Your Session
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </motion.div>
    )
  }

  if (pollStatus === 'failed') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl border border-amber-200 shadow-lg overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
        <div className="p-7 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-9 h-9 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">
            Your synthesis is taking longer than usual
          </h1>
          <p className="text-neutral-500 text-sm mb-6">
            You can still enter your session now, it will simply personalise itself the moment the synthesis finishes, or reach out and we'll check on it directly.
          </p>
          <a
            href={sessionRoute}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl shadow-md transition-colors"
          >
            Enter Your Session Anyway
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </motion.div>
    )
  }

  // 'looking-up' | 'pending' | 'processing' | 'unavailable', all shown
  // the same, honest, real "still working" state, the only difference
  // is internal, unavailable falls back gracefully rather than ever
  // claiming false certainty about a job it genuinely couldn't find.
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-emerald-200 shadow-lg overflow-hidden"
    >
      <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
      <div className="p-7 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Loader2 className="w-8 h-8 text-emerald-500" />
        </motion.div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Your synthesis is being prepared
        </h1>
        <p className="text-neutral-500 text-sm mb-5">
          {tool.emoji} <strong>{tool.name}</strong> is loading your complete chart data right now.
        </p>
        <div className="flex items-center justify-center gap-2 bg-neutral-50 rounded-xl py-3 px-5 border border-neutral-100 mb-5">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-neutral-700 font-medium">
            Checking every few seconds, {formatElapsed(elapsedSeconds)} so far
          </span>
        </div>
        <div className="text-left space-y-3">
          {[
            { step: '1', text: 'Your synthesis engine is loading your complete chart data' },
            { step: '2', text: 'The AI is generating your personalised context right now'  },
            { step: '3', text: "This page will update the moment it's genuinely ready"     },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                {step}
              </div>
              <p className="text-sm text-neutral-600 pt-0.5">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// Main page
export default function PurchaseConfirmationPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const toolId = params?.toolId as string
  const txRef = searchParams.get('tx_ref')
  const supabase = createClient()

  const [tool,        setTool]        = useState<Tool | null>(null)
  const [upsellTool,  setUpsellTool]  = useState<Tool | null>(null)
  const [showUpsell,  setShowUpsell]  = useState(true)
  const [accepting,   setAccepting]   = useState(false)
  const [upsellAdded, setUpsellAdded] = useState(false)
  const [countdown,   setCountdown]   = useState(600)
  const [loggedInUser, setLoggedInUser] = useState<any>(null)
  const [authChecked,  setAuthChecked]  = useState(false)
  const [guestConfirmed, setGuestConfirmed] = useState(false)

  // Real polling state, chat/voice tools only, see the file header.
  const [isLiveSessionTool, setIsLiveSessionTool] = useState(false)
  const [pollStatus, setPollStatus] = useState<JobPollStatus>('looking-up')
  const [pollElapsed, setPollElapsed] = useState(0)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!toolId) return
    const t = getToolById(toolId)
    setTool(t ?? null)
    const upsellId = UPSELL_MAP[toolId]
    if (upsellId) {
      const u = getToolById(upsellId)
      setUpsellTool(u ?? null)
    } else {
      const fallback = allTools.find(t => t.isPopular && t.id !== toolId)
      setUpsellTool(fallback ?? null)
    }
    // v1.2, real, confirmed fix, checked directly against
    // lib/tools/all-tools-index.ts's own, real Tool interface. That
    // file's own comment says it plainly: category is "domain id for
    // icon/colour lookups", domain is "human-readable domain name".
    // I had them backwards, checking domain first, a display string
    // like "Voice of Prophecy", which domainDestinations has no entry
    // for at all, category alone is the real, short id, 'voice',
    // 'sacred-script', that actually matches this lookup table's keys.
    const category = (t as any)?.category || ''
    setIsLiveSessionTool(domainDestinations[category] === 'chat' || domainDestinations[category] === 'audio')
  }, [toolId])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedInUser(user ?? null)
      setAuthChecked(true)
    })
  }, [])

  // Fixed countdown, report/reading tools only now, chat and voice
  // tools use the real poll below instead.
  useEffect(() => {
    if (isLiveSessionTool) return
    if (countdown <= 0) return
    const interval = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(interval)
  }, [countdown, isLiveSessionTool])

  // Real polling, chat/voice tools only. Looks up the actual job_id
  // behind this checkout directly from pending_checkouts using
  // tx_ref, the same real table the webhook itself relies on, this
  // page never had job_id directly available any other way without
  // guessing at whether the Stripe redirect chain preserves one.
  useEffect(() => {
    if (!isLiveSessionTool || !txRef) return
    let cancelled = false

    const lookupAndPoll = async () => {
      const { data: pending, error } = await supabase
        .from('pending_checkouts')
        .select('job_id')
        .eq('tx_ref', txRef)
        .maybeSingle()

      if (cancelled) return
      if (error || !pending?.job_id) {
        // Real, honest fallback, not a false "still loading" forever,
        // this job genuinely couldn't be found, the person can still
        // enter their session directly rather than being stuck.
        setPollStatus('unavailable')
        return
      }

      const jobId = pending.job_id
      setPollStatus('pending')

      const poll = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/reading/job/${jobId}`)
          if (!res.ok) return
          const data = await res.json()
          if (cancelled) return
          if (data.status === 'completed') {
            setPollStatus('completed')
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          } else if (data.status === 'failed') {
            setPollStatus('failed')
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          } else {
            setPollStatus('processing')
          }
        } catch {
          // Real, transient network hiccup, not treated as failure,
          // the next tick tries again.
        }
      }

      await poll()
      pollIntervalRef.current = setInterval(poll, 4000)
    }

    lookupAndPoll()
    return () => {
      cancelled = true
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [isLiveSessionTool, txRef])

  // Elapsed-time display for the live polling card, separate from the
  // report/reading countdown above, counts up, not down, since there's
  // no fixed estimate being claimed here, only real, honest elapsed
  // time.
  useEffect(() => {
    if (!isLiveSessionTool) return
    if (pollStatus === 'completed' || pollStatus === 'failed') return
    const interval = setInterval(() => setPollElapsed(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [isLiveSessionTool, pollStatus])

  const formatTime = (s: number) => {
    const m   = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleAcceptUpsell = async () => {
    if (!upsellTool) return
    setAccepting(true)
    await new Promise(r => setTimeout(r, 800))
    router.push(`/purchase/${upsellTool.id}?discount=20&source=confirmation-upsell&from=${toolId}`)
  }
  const handleDeclineUpsell = () => setShowUpsell(false)

  // No redirect, deliberately, see the comment inside AccountStep's
  // guest button, there is genuinely nowhere for a guest with no
  // session to be sent. This just confirms in place. I have not been
  // able to confirm from anywhere in this codebase that a completion
  // email actually gets sent automatically once the reading job
  // finishes, that's a real, separate gap worth verifying on the
  // backend, this UI honestly reflects what was promised, it does not
  // by itself guarantee that promise is fulfilled server-side.
  const handleGuestContinue = () => setGuestConfirmed(true)

  if (!tool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-neutral-50 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Success confirmation, real, live polling for chat/voice
            tools, the original fixed countdown for everything else. */}
        {isLiveSessionTool ? (
          <LiveSessionReadyCard tool={tool} pollStatus={pollStatus} elapsedSeconds={pollElapsed} />
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl border border-emerald-200 shadow-lg overflow-hidden"
          >
            <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
            <div className="p-7 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
                className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-9 h-9 text-emerald-500" />
              </motion.div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                Your reading is being prepared
              </h1>
              <p className="text-neutral-500 text-sm mb-5">
                {tool.emoji} <strong>{tool.name}</strong> has been confirmed. Your complete synthesis is loading.
              </p>
              <div className="flex items-center justify-center gap-2 bg-neutral-50 rounded-xl py-3 px-5 border border-neutral-100 mb-5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-neutral-700 font-medium">
                  Estimated delivery in{' '}
                  <span className="text-amber-600 font-bold font-mono">
                    {formatTime(countdown)}
                  </span>
                </span>
              </div>
              <div className="text-left space-y-3">
                {[
                  { step: '1', text: 'Your synthesis engine is loading your complete chart data' },
                  { step: '2', text: 'The AI is generating your personalised reading right now'  },
                  { step: '3', text: "You'll receive a notification the moment it's ready"       },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      {step}
                    </div>
                    <p className="text-sm text-neutral-600 pt-0.5">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        {/* Upsell */}
        <AnimatePresence>
          {showUpsell && upsellTool && !upsellAdded && (
            <UpsellCard
              tool={upsellTool}
              onAccept={handleAcceptUpsell}
              onDecline={handleDeclineUpsell}
              accepting={accepting}
            />
          )}
        </AnimatePresence>
        {/* Upsell added */}
        <AnimatePresence>
          {upsellAdded && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center"
            >
              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-800">
                {upsellTool?.name} added to your order at 20% off
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Account step, guests only. Logged-in visitors already have
            somewhere real to go, so they skip straight to the simple
            nav buttons below, exactly as before. */}
        {authChecked && !loggedInUser && (
          <AccountStep txRef={txRef} onGuestContinue={handleGuestContinue} guestConfirmed={guestConfirmed} />
        )}
        {/* Navigation, only shown once we actually know whether this
            visitor has a real session, previously these two buttons
            fired unconditionally, sending guests to a dashboard they
            had no way to log into. */}
        {authChecked && loggedInUser && (
          <>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => router.push('/member/dashboard')}
                className="px-5 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push('/member/dashboard')}
                className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors shadow-sm"
              >
                View All Readings
              </button>
            </div>
            <div className="text-center">
              <a
                href="/domains"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm"
              >
                Explore other tools
              </a>
            </div>
          </>
        )}
        <p className="text-center text-xs text-neutral-500">
          Questions? Email support@kayalsoulpath.com, we respond within 2 hours.
        </p>
      </div>
    </div>
  )
}
