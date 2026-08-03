import type { Metadata } from 'next'

// This layout wraps /onboarding and its sub-routes only, not the whole
// app. Unlike app/onboarding/basic/page.tsx, this file has no 'use
// client' directive, it's a Server Component, so it can export metadata
// directly, which is exactly what was missing. The page.tsx it wraps
// stays a client component for its interactivity, this layout is what
// gives that page real, crawlable SEO metadata via Next.js's normal
// inheritance, a child route without its own metadata export falls back
// to whatever the nearest layout above it defines.
//
// Worth noting: the description below deliberately reflects what this
// flow actually does, name, birth date, birth time, location collection
// for a numerology/astrology reading, not what the earlier stale Google
// result for kayalsoulpath.com showed. That stale result ("Discover your
// deeper life patterns through name, birth date, and facial expression
// analysis") is suspiciously close to what this exact page does, worth
// considering that Google may have originally indexed this content under
// the wrong domain at some point, rather than two unrelated coincidences.

export const metadata: Metadata = {
  title: 'Start Your Reading | KAYAL LifeOS',
  description: 'Begin your personalized numerology and astrology reading. Enter your name, birth date, and birth details to discover your Soul Blueprint.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Start Your Reading | KAYAL LifeOS',
    description: 'Begin your personalized numerology and astrology reading, built from your exact birth data.',
    url: 'https://app.kayalsoulpath.com/onboarding/basic',
    siteName: 'KAYAL LifeOS',
    type: 'website',
  },
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  )
}
