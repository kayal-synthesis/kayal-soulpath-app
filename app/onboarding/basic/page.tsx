// app/onboarding/basic/page.tsx
//
// Real, new server component, the same, proven fix already applied to
// every tool page earlier tonight. This page is the actual, confirmed
// front door for a first-time visitor arriving from search, not
// /dashboard, which is genuinely gated, only reachable after this
// onboarding flow is complete. Before this fix, BasicInfoPageClient.tsx
// carried 'use client' directly on itself, with no separate, real
// metadata anywhere, meaning it silently inherited the root layout's
// generic, site-wide title and description, the exact same problem
// already found and fixed on tool pages.
//
// dynamic = 'force-dynamic' moved here from the client file, a client
// component cannot process a real Route Segment Config option like
// this one, it only has genuine meaning on a server component.
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { BasicInfoPageClient } from './BasicInfoPageClient'

// Real, honest, specific to what this exact page actually does, not
// the generic, root-level default. Worth reviewing as a first, real
// draft, written from the page's actual, confirmed function, not
// existing marketing copy the way tool descriptions could reuse their
// own, real hook and tagline fields, no equivalent existed here to
// pull from.
export const metadata: Metadata = {
  title: 'Start Your Free Soul Blueprint Reading | KAYAL LifeOS',
  description: 'There\'s a reason you keep making the same choices, hitting the same walls, drawn to the same people. See why, free.',
  alternates: {
    canonical: '/onboarding/basic',
  },
  openGraph: {
    title: 'Start Your Free Soul Blueprint Reading | KAYAL LifeOS',
    description: 'There\'s a reason you keep making the same choices, hitting the same walls, drawn to the same people. See why, free.',
    url: '/onboarding/basic',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Start Your Free Soul Blueprint Reading | KAYAL LifeOS',
    description: 'There\'s a reason you keep making the same choices, hitting the same walls, drawn to the same people. See why, free.',
  },
}

export default function OnboardingBasicPage() {
  return <BasicInfoPageClient />
}
