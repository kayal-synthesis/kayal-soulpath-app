'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-800 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-500 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10"
      >
        <Card className="p-12 text-center">
          {/* Error Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mb-8"
          >
            <div className="w-24 h-24 bg-warning/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-12 h-12 text-warning" />
            </div>
          </motion.div>

          {/* Content */}
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-serif text-primary-900 mb-4"
          >
            Unexpected Error
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-neutral-600 mb-8 max-w-md mx-auto"
          >
            We encountered an unexpected error. Don't worry, our team has been notified.
          </motion.p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-8 p-4 bg-neutral-100 rounded-lg text-left overflow-auto"
            >
              <p className="text-sm font-mono text-warning mb-2">
                {error.name}: {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-neutral-500">Digest: {error.digest}</p>
              )}
              {error.stack && (
                <pre className="text-xs text-neutral-600 mt-2 overflow-auto max-h-40">
                  {error.stack}
                </pre>
              )}
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button 
              size="lg" 
              onClick={reset}
              className="min-w-[200px]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Link href="/">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </motion.div>

          {/* Navigation Links */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 pt-8 border-t"
          >
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/dashboard" className="text-sm text-primary-600 hover:underline flex items-center">
                <ArrowLeft className="w-3 h-3 mr-1" />
                Dashboard
              </Link>
              <Link href="/chat" className="text-sm text-primary-600 hover:underline">
                Chat Support
              </Link>
              <Link href="/contact" className="text-sm text-primary-600 hover:underline">
                Contact Us
              </Link>
            </div>
          </motion.div>
        </Card>

        {/* Error ID */}
        <p className="text-center text-xs text-white/40 mt-6">
          Error ID: {error.digest || Math.random().toString(36).substring(2, 10).toUpperCase()}
        </p>
      </motion.div>
    </div>
  )
}