// app/robots.ts
//
// Real, Next.js automatically serves this at /robots.txt. Disallows
// the real, private areas confirmed throughout tonight, the admin
// panel, every API route, personal member/affiliate dashboards, and
// /dashboard itself, confirmed directly, genuinely gated, only
// reachable after completing onboarding, none of which should ever
// show up in a search result. Everything else, the onboarding flow
// itself, tool pages, domain pages, the marketing site, stays open.

import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.kayalsoulpath.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow:     '/',
      disallow:  ['/admin', '/api', '/member', '/dashboard'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
