'use client'
export const dynamic = 'force-dynamic'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Mail, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (token) {
      verifyEmail()
    } else {
      setStatus('error')
    }
  }, [token])

  const verifyEmail = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      setStatus('success')
    } catch (error) {
      setStatus('error')
    }
  }

  const resendVerification = async () => {
    setIsResending(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      toast.success('Verification email sent! Check your inbox.')
    } catch (error) {
      toast.error('Failed to send verification email')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 text-center">
          {/* Icon */}
          <div className="mb-6">
            {status === 'verifying' && (
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-warning" />
              </div>
            )}
          </div>

          {/* Content */}
          {status === 'verifying' && (
            <>
              <h1 className="text-2xl font-serif mb-2">Verifying Your Email</h1>
              <p className="text-neutral-600 mb-6">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <h1 className="text-2xl font-serif mb-2">Email Verified!</h1>
              <p className="text-neutral-600 mb-6">
                Your email has been successfully verified. You can now access all features.
              </p>
              <Link href="/dashboard">
                <Button fullWidth>Go to Dashboard</Button>
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-2xl font-serif mb-2">Verification Failed</h1>
              <p className="text-neutral-600 mb-6">
                The verification link is invalid or has expired. Request a new one below.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={resendVerification} 
                  loading={isResending}
                  fullWidth
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </Button>
                <Link href="/">
                  <Button variant="outline" fullWidth>
                    Return to Home
                  </Button>
                </Link>
              </div>
            </>
          )}

          {/* Help Text */}
          {status !== 'verifying' && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-neutral-500">
                Need help?{' '}
                <Link href="/contact" className="text-primary-600 hover:underline">
                  Contact Support
                </Link>
              </p>
            </div>
          )}
        </Card>

        {/* Email Icon Background */}
        {status === 'verifying' && (
          <div className="mt-6 text-center">
            <Mail className="w-12 h-12 mx-auto text-white/20" />
          </div>
        )}
      </motion.div>
    </div>
  )
}