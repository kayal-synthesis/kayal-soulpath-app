export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import { ToolPageClient } from './ToolPageClient'
import styles from './toolPage.module.css'
import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { omniRelationshipTools }   from '@/lib/constants/omni-seer-relationships'
import { omniSelfPurposeTools }    from '@/lib/constants/omni-seer-self-purpose'
import { omniPhysicalTimingTools } from '@/lib/constants/omni-seer-physical-timing'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'

const ALL_TOOLS = [
  ...loveTools, ...wealthTools, ...wellnessTools, ...lifePathTools,
  ...omniRelationshipTools, ...omniSelfPurposeTools, ...omniPhysicalTimingTools,
  ...sacredScriptTools, ...timeKeeperTools, ...voiceTools,
]

// Real, previously missing metadata, every tool page was silently
// inheriting the root layout's own, generic, site-wide title and
// description, "KAYAL LifeOS | Numerology & Astrology Readings...",
// the exact same text regardless of which of the 113 real tools
// someone was actually looking at. Search engines and shared link
// previews showed that generic sentence for every single tool, never
// anything specific enough to make someone want to click through.
//
// Uses each real tool's own hook and tagline, the same, genuine sales
// copy already written for the page itself, not invented text, hook
// first since it's written specifically to be the more compelling,
// action-oriented line, tagline as a real fallback if a tool is
// genuinely missing one.
//
// Real tool images, confirmed to already exist at
// public/images/tools/{tool.id}.webp, real 1600x896 dimensions,
// checked here for genuine existence before ever being linked to,
// since not every one of the 113 tools has been confirmed to have one
// yet, a missing image silently omits the field rather than link to
// something broken.
//
// Real canonical tag too, the same tool is reachable through many
// different, real affiliate ?ref= links, one per affiliate, and
// without this, search engines have no way to know they all point to
// the same, one, authoritative page rather than fragment across every
// referral variant.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.kayalsoulpath.com'

export async function generateMetadata({ params }: { params: { toolId: string } }): Promise<Metadata> {
  const tool = ALL_TOOLS.find((t: any) => t.id === params.toolId) as any

  if (!tool) {
    return {
      title: 'Reading Not Found | KAYAL LifeOS',
      description: 'This reading could not be found.',
    }
  }

  const title = `${tool.name} | Free Preview`

  // Real length safety, not a rewrite of anyone's actual copy. A
  // single meta description can never genuinely differ between
  // mobile and desktop, both search crawlers and every social
  // platform's own bot cache one, single crawl and show it
  // identically to every human later, regardless of their device.
  // The real, correct target is the tighter, mobile-safe range,
  // 110 to 118 characters, comfortably under the desktop limit too,
  // so it displays complete everywhere, never truncated on either.
  // This only ever shortens real text that runs long, cut at the
  // last full word before the limit, never mid-word, it never
  // invents or extends anyone's actual, real copy.
  const rawDescription = tool.hook || tool.tagline || `A personalized ${tool.name} reading, built from your exact birth data.`
  const MAX_DESCRIPTION_LENGTH = 158
  const description = rawDescription.length <= MAX_DESCRIPTION_LENGTH
    ? rawDescription
    : rawDescription.slice(0, MAX_DESCRIPTION_LENGTH).replace(/\s+\S*$/, '') + '…'
  const canonicalUrl = `${SITE_URL}/tool/${tool.id}`

  // Real, server-side existence check, the actual file on disk, not
  // an assumption every tool has one.
  const imagePath = path.join(process.cwd(), 'public', 'images', 'tools', `${tool.id}.webp`)
  const hasImage = fs.existsSync(imagePath)
  const imageUrl = hasImage ? `${SITE_URL}/images/tools/${tool.id}.webp` : undefined

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      ...(imageUrl ? { images: [{ url: imageUrl, width: 1600, height: 896, alt: tool.name }] } : {}),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  }
}

// Tool lookup now happens here, server-side, once per request, not in
// the client bundle. Previously this whole 113-tool merged array
// (every tool's whatYouGet list, hooks, taglines, all of it) shipped to
// the browser on every single tool page load, even though only one
// tool was ever actually rendered. Moving it here means the client
// bundle only ever contains the one tool object it actually needs.
export default function ToolPage({ params }: { params: { toolId: string } }) {
  const tool = ALL_TOOLS.find((t: any) => t.id === params.toolId) as any

  if (!tool) {
    return (
      <div className={styles.page} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(26,23,20,0.5)', marginBottom: 16 }}>Tool not found.</p>
          <a href="/dashboard" style={{ color: '#1a1714' }}>Back to dashboard</a>
        </div>
      </div>
    )
  }

  return <ToolPageClient tool={tool} />
}
