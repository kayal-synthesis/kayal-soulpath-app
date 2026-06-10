'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Home, Search, Compass, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
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
          {/* 404 Illustration */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative mb-8"
          >
            <div className="text-8xl font-serif text-primary-900 opacity-20">404</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Compass className="w-24 h-24 text-primary-600 animate-spin-slow" style={{ animationDuration: '3s' }} />
            </div>
          </motion.div>

          {/* Content */}
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-serif text-primary-900 mb-4"
          >
            Page Not Found
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-neutral-600 mb-8 max-w-md mx-auto"
          >
            The page you're looking for doesn't exist or has been moved. 
            Let's get you back on track.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search for reports, insights, or help..."
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href="/">
              <Button size="lg" className="min-w-[200px]">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </motion.div>

          {/* Help Links */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 pt-8 border-t"
          >
            <p className="text-sm text-neutral-500 mb-4">Popular destinations:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/dashboard/free-reports" className="text-sm text-primary-600 hover:underline">
                Free Reports
              </Link>
              <Link href="/compatibility" className="text-sm text-primary-600 hover:underline">
                Compatibility
              </Link>
              <Link href="/chat" className="text-sm text-primary-600 hover:underline">
                Live Chat
              </Link>
              <Link href="/referral" className="text-sm text-primary-600 hover:underline">
                Referrals
              </Link>
              <Link href="/faq" className="text-sm text-primary-600 hover:underline">
                FAQ
              </Link>
            </div>
          </motion.div>
        </Card>

        {/* Error Code */}
        <p className="text-center text-xs text-white/40 mt-6">
          Error 404 • Page Not Found
        </p>
      </motion.div>
    </div>
  )
}