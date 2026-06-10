'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, RefreshCw, Mail, Clock, Home } from 'lucide-react'
import { toast } from 'sonner'

export default function ErrorPage() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isReporting, setIsReporting] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    window.location.reload()
  }

  const handleReport = async () => {
    setIsReporting(true)
    // Simulate error reporting
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success('Error reported', {
      description: 'Our team has been notified. Thank you!'
    })
    setIsReporting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-800 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-500 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10"
      >
        <Card className="p-12 text-center">
          {/* Error Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mb-8"
          >
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-warning/10 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-12 h-12 text-warning" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-warning rounded-full flex items-center justify-center text-white text-xs font-bold"
              >
                !
              </motion.div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-serif text-primary-900 mb-4"
          >
            Something Went Wrong
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-neutral-600 mb-8 max-w-md mx-auto"
          >
            We're experiencing technical difficulties. Our team has been notified 
            and is working to fix the issue.
          </motion.p>

          {/* Status Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-primary-50 rounded-lg p-4 mb-8 flex items-center justify-center gap-3"
          >
            <Clock className="w-5 h-5 text-primary-600" />
            <span className="text-sm text-primary-700">
              Expected fix time: <strong>~15 minutes</strong>
            </span>
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button 
              size="lg" 
              onClick={handleRefresh}
              loading={isRefreshing}
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

          {/* Report Button */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-4"
          >
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleReport}
              loading={isReporting}
            >
              <Mail className="w-4 h-4 mr-2" />
              Report this issue
            </Button>
          </motion.div>

          {/* Support Info */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 pt-8 border-t"
          >
            <p className="text-sm text-neutral-500">
              Need immediate help?{' '}
              <Link href="/contact" className="text-primary-600 hover:underline">
                Contact Support
              </Link>
            </p>
          </motion.div>
        </Card>

        {/* Error ID */}
        <p className="text-center text-xs text-white/40 mt-6">
          Error ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}
        </p>
      </motion.div>
    </div>
  )
}