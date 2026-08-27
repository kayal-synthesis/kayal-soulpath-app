'use client'
import { Suspense } from 'react'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, 
  Gift, Loader2, CheckCircle 
} from 'lucide-react'
import Link from 'next/link'
function ReferralLoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // Check for success message from registration or password reset
  const registered = searchParams.get('registered')
  const resetSuccess = searchParams.get('reset')
  // Real fix for a genuine open redirect, redirectTo previously came
  // straight from the URL query with no validation at all, letting a
  // crafted link like ?redirect=https://look-alike-site.com send
  // someone who logs in legitimately somewhere else entirely. Only a
  // real, relative, in-app path is accepted now, "/something", never
  // a full URL, and specifically never a protocol-relative one either
  // ("//evil.com" starts with a single slash but browsers still treat
  // it as external).
  const rawRedirect = searchParams.get('redirect')
  const redirectTo = (rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//'))
    ? rawRedirect
    : '/member/referral/dashboard'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  // Show success messages
  useEffect(() => {
    if (registered === 'true') {
      setSuccessMessage('Account created successfully! Please sign in.')
    }
    if (resetSuccess === 'success') {
      setSuccessMessage('Password reset successfully! Please sign in with your new password.')
    }
  }, [registered, resetSuccess])
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      // Check if user is an affiliate
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // You can check if user has affiliate profile here
        // For now, just redirect to dashboard
        window.location.href = redirectTo
      } else {
        throw new Error('User not found')
      }
      
    } catch (error: any) {
      console.error('Login error:', error)
      
      // Handle specific error messages
      if (error.message === 'Invalid login credentials') {
        setError('Invalid email or password')
      } else if (error.message.includes('Email not confirmed')) {
        setError('Please verify your email address first')
      } else {
        setError(error.message || 'Failed to sign in')
      }
    } finally {
      setLoading(false)
    }
  }
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email first')
      return
    }
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/member/referral/reset-password`,
      })
      if (error) throw error
      setSuccessMessage('Password reset link sent to your email! Please check your inbox.')
      // Clear the email field after successful send
      // setEmail('') // Optional: uncomment if you want to clear the email field
    } catch (error: any) {
      setError(error.message || 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Gift className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-serif mb-2">Welcome Back</h1>
            <p className="text-neutral-600">Sign in to your affiliate account</p>
          </div>
          {/* Success Message */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-600 text-sm"
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              fullWidth
              size="lg"
              className="mt-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
          {/* Register Link */}
          <p className="text-center text-sm text-neutral-500 mt-6">
            Don't have an account?{' '}
            <Link
              href="/member/referral/register"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Join the Referral Community
            </Link>
          </p>
          {/* Security Note */}
          <p className="text-center text-xs text-neutral-500 mt-4">
            Secure login powered by Supabase Auth
          </p>
        </Card>
      </motion.div>
    </div>
  )
}
export default function ReferralLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ReferralLoginPageInner />
    </Suspense>
  )
}
