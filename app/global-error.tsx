'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-800 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-warning/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">⚠️</span>
              </div>
            </div>

            <h1 className="text-3xl font-serif text-primary-900 mb-4">
              Critical Error
            </h1>
            
            <p className="text-neutral-600 mb-8 max-w-md mx-auto">
              A critical error occurred. Please try refreshing the page.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={reset}>
                Try Again
              </Button>
              <Link href="/">
                <Button variant="outline" size="lg">
                  Go Home
                </Button>
              </Link>
            </div>

            <p className="text-xs text-neutral-500 mt-8">
              If the problem persists, please contact support.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}