'use client'
import { Suspense } from 'react'
export const dynamic = 'force-dynamic'
// app/auth/login/page.tsx
// Handles all login scenarios:
//   - Normal email + password login
//   - Magic link (passwordless) login
//   - Redirects back to wherever the user came from

import { useState, useEffect }    from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient }            from '@/lib/supabase/client'
import { motion }                  from 'framer-motion'
import { Card }                    from '@/components/ui/Card'
import { Button }                  from '@/components/ui/Button'
import {
  Mail, Lock, Eye, EyeOff, ArrowRight,
  AlertCircle, Loader2, CheckCircle, Sparkles,
} from 'lucide-react'
import Link from 'next/link'

function LoginPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const emailParam   = searchParams.get('email')   || ''
  const redirectTo   = searchParams.get('redirect') || '/member/dashboard'

  const [mode,         setMode]         = useState<'password' | 'magic'>('password')
  const [email,        setEmail]        = useState(emailParam)
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [magicSent,    setMagicSent]    = useState(false)

  // If already logged in, redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(redirectTo)
    })
  }, [])

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.replace(redirectTo)
    } catch (err: any) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Wrong email or password. Try again or use a magic link.'
          : err.message || 'Sign in failed'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    setLoading(true)
    setError('')
    try {
      const callbackUrl = window.location.origin +
        '/auth/callback?next=' + encodeURIComponent(redirectTo)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl },
      })
      if (error) throw error
      setMagicSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email first'); return }
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/callback?next=/auth/reset-password',
      })
      if (error) throw error
      setError('')
      alert('Password reset link sent to ' + email)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  // ── Magic link sent screen ───────────────────────────────
  if (magicSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-neutral-50
                      flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center
                            justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-serif mb-2">Check your inbox</h2>
            <p className="text-neutral-600 mb-2">We sent a sign-in link to</p>
            <p className="font-bold text-neutral-800 mb-6">{email}</p>
            <p className="text-sm text-neutral-500 mb-6">
              Click the link in your email and you will be signed in automatically.
              The link expires in 1 hour.
            </p>
            <button
              onClick={() => { setMagicSent(false); setMode('magic') }}
              className="text-sm text-primary-600 underline"
            >
              Use a different email
            </button>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ── Main login screen ────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-neutral-50
                    flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md">
        <Card className="p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14
                            bg-primary-100 rounded-full mb-4">
              <Sparkles className="w-7 h-7 text-primary-600" />
            </div>
            <h1 className="text-2xl font-serif mb-1">Welcome back</h1>
            <p className="text-neutral-500 text-sm">Sign in to access your readings</p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-neutral-200 p-1 mb-6">
            <button
              onClick={() => setMode('password')}
              className={[
                'flex-1 py-2 rounded-lg text-sm font-medium transition',
                mode === 'password'
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-500 hover:text-neutral-700',
              ].join(' ')}
            >
              Password
            </button>
            <button
              onClick={() => setMode('magic')}
              className={[
                'flex-1 py-2 rounded-lg text-sm font-medium transition',
                mode === 'magic'
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-500 hover:text-neutral-700',
              ].join(' ')}
            >
              Magic link
            </button>
          </div>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl
                         flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Email field (shared) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2
                               w-4 h-4 text-neutral-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>

          {/* Password mode */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin}>
              <div className="mb-2">
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2
                                   w-4 h-4 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border rounded-xl
                               focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <button type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end mb-5">
                <button type="button" onClick={handleForgotPassword}
                  className="text-sm text-primary-600 hover:text-primary-700">
                  Forgot password?
                </button>
              </div>

              <Button type="submit" disabled={loading || !email || !password} fullWidth size="lg">
                {loading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
          )}

          {/* Magic link mode */}
          {mode === 'magic' && (
            <div>
              <p className="text-sm text-neutral-500 mb-5">
                We'll send a one-click sign-in link to your email.
                No password needed.
              </p>
              <Button onClick={handleMagicLink}
                disabled={loading || !email} fullWidth size="lg">
                {loading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <><Mail className="w-4 h-4 mr-2" />Send Magic Link</>}
              </Button>
            </div>
          )}

          {/* Register link */}
          <p className="text-center text-sm text-neutral-500 mt-6">
            Don't have an account?{' '}
            <Link href="/member/referral/register"
              className="text-primary-600 hover:text-primary-700 font-medium">
              Create one free
            </Link>
          </p>

        </Card>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginPageInner />
    </Suspense>
  )
}