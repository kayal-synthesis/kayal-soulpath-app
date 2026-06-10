'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-800">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <nav className="flex justify-between items-center text-white mb-20">
          <h1 className="text-2xl font-serif">Kayal LifeOS</h1>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:text-white/80">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary">Sign Up</Button>
            </Link>
          </div>
        </nav>

        <div className="text-center text-white max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-serif mb-6">
            The Operating System for Your Soul
          </h1>
          <p className="text-xl text-white/80 mb-8">
            Discover who you really are through your numbers, your hands, and your face.
          </p>
          <Link href="/onboarding/basic">
            <Button size="lg" variant="secondary">
              Begin Your Journey — It's Free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}