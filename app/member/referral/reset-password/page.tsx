'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Lock, 
  ArrowLeft, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  // Real, dedicated flag for whether a genuinely valid reset context
  // was found at all, distinct from the general error string below,
  // which can also be set later by a real, different failure during
  // submission itself, one that a retry might still resolve.
  const [hasValidContext, setHasValidContext] = useState(true)
  useEffect(() => {
    // Get the token from URL parameters
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    } else {
      // If no token, check if we have a session (for the recovery flow)
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Invalid or expired reset link. Please request a new one.')
          setHasValidContext(false)
        }
      }
      checkSession()
    }
  }, [searchParams, supabase.auth])
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation, matches register.tsx's real, stronger 8-character
    // standard, previously mismatched here at 6, meaning a real
    // person could register at 8 characters minimum, then reset down
    // to something weaker.
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError(null)
    
    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        // Handle specific error cases
        if (error.message.includes('session')) {
          setError('Your reset link has expired. Please request a new password reset.')
        } else {
          throw error
        }
        return
      }
      
      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/member/referral/login?reset=success')
      }, 3000)
      
    } catch (err: any) {
      console.error('Reset error:', err)
      setError(err.message || 'Failed to reset password. Please try again.')
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
          {/* Back Button */}
          <Link 
            href="/member/referral/login"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-primary-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-serif mb-2">Reset Password</h1>
            <p className="text-neutral-600 text-sm">
              Enter your new password below
            </p>
          </div>
          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-600 text-sm"
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Password reset successfully! Redirecting to login...</span>
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
          {/* Reset Form */}
          {!success && hasValidContext && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                    placeholder="Enter new password"
                    required
                    minLength={8}
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
                <p className="text-xs text-neutral-500 mt-1">Must be at least 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading} 
                fullWidth 
                size="lg"
                className="mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          )}
          {/* Help Text */}
          {!success && (
            <p className="text-center text-xs text-neutral-500 mt-6">
              This link expires in 24 hours. If you need a new link,{' '}
              <Link 
                href="/member/referral/login" 
                className="text-primary-600 hover:text-primary-700"
              >
                request another one
              </Link>
              .
            </p>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  )
}
