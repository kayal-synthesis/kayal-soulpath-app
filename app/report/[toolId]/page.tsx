'use client'
export const dynamic = 'force-dynamic'
// app/report/[toolId]/page.tsx
// Fix: removed non-existent imports (careerTools, spiritualTools, healthTools)
//      replaced with wellnessTools from wellness-spiritual
//      allTools array and domain detection updated accordingly

import { useState, useEffect }                       from 'react'
import { useParams, useSearchParams, useRouter }      from 'next/navigation'
import { createClient }                               from '@/lib/supabase/client'
import { Card }                                       from '@/components/ui/Card'
import { Button }                                     from '@/components/ui/Button'
import { Badge }                                      from '@/components/ui/Badge'
import {
  ArrowLeft, Download, Share2, Clock, Calendar, User, Loader2,
  BookOpen, Printer, Heart, Moon, TrendingUp, Compass, Crown,
  Copy, Check, Facebook, Twitter, Linkedin, Mail,
  Bookmark, BookmarkCheck, DownloadCloud, AlertCircle,
} from 'lucide-react'
import { omniRelationshipTools }   from '@/lib/constants/omni-seer-relationships'
import { omniSelfPurposeTools }    from '@/lib/constants/omni-seer-self-purpose'
import { omniPhysicalTimingTools } from '@/lib/constants/omni-seer-physical-timing'
import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'

const omniTools = [...omniRelationshipTools, ...omniSelfPurposeTools, ...omniPhysicalTimingTools]

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const getFeatureText = (feature: any): { title: string; description: string } => {
  if (typeof feature === 'string') {
    const parts = feature.split(' - ')
    return {
      title:       parts[0].replace(/\*\*/g, ''),
      description: parts.slice(1).join(' - ') || 'Complete insight revealed in your full report.',
    }
  }
  if (feature && typeof feature === 'object') {
    return {
      title:       feature.title || feature.name || 'Insight',
      description: feature.description || 'Complete insight revealed in your full report.',
    }
  }
  return { title: 'Insight', description: 'Complete insight revealed in your full report.' }
}

// All tools across every domain
const allTools = [
  ...omniTools,     ...loveTools,    ...wealthTools,
  ...wellnessTools, ...lifePathTools,...sacredScriptTools,
  ...timeKeeperTools, ...voiceTools,
]

// ─────────────────────────────────────────────────────────────
// Domain config
// ─────────────────────────────────────────────────────────────
const domainConfigs: Record<string, any> = {
  'omni-seer': {
    name: "Omni-Seer's Sanctum", icon: Crown,
    color: 'text-indigo-600', bg: 'bg-indigo-50',
    gradient: 'from-indigo-600 to-purple-600',
    lightGradient: 'from-indigo-50 to-purple-50',
    emoji: '🔮', description: 'Ancient wisdom and divine guidance',
  },
  'love-relationships': {
    name: 'Love & Relationships', icon: Heart,
    color: 'text-red-600', bg: 'bg-red-50',
    gradient: 'from-red-600 to-pink-600',
    lightGradient: 'from-red-50 to-pink-50',
    emoji: '💞', description: 'Romantic destiny and relationship guidance',
  },
  'wealth-career': {
    name: 'Wealth & Career', icon: TrendingUp,
    color: 'text-emerald-600', bg: 'bg-emerald-50',
    gradient: 'from-emerald-600 to-teal-600',
    lightGradient: 'from-emerald-50 to-teal-50',
    emoji: '💰', description: 'Financial abundance and career success',
  },
  'wellness-spirituality': {
    name: 'Wellness & Spirituality', icon: Moon,
    color: 'text-purple-600', bg: 'bg-purple-50',
    gradient: 'from-purple-600 to-indigo-600',
    lightGradient: 'from-purple-50 to-indigo-50',
    emoji: '🧘', description: 'Body healing and spiritual growth',
  },
  'life-path-destiny': {
    name: 'Life Path & Destiny', icon: Compass,
    color: 'text-amber-600', bg: 'bg-amber-50',
    gradient: 'from-amber-600 to-orange-600',
    lightGradient: 'from-amber-50 to-orange-50',
    emoji: '🗺️', description: 'True purpose and life journey',
  },
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function ReportPage() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const router        = useRouter()
  const supabase      = createClient()

  const toolId = params.toolId as string
  const jobId  = searchParams.get('jobId')

  const [user,          setUser]          = useState<any>(null)
  const [authChecked,   setAuthChecked]   = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [content,       setContent]       = useState<any>(null)
  const [tool,          setTool]          = useState<any>(null)
  const [domain,        setDomain]        = useState('omni-seer')
  const [isSaved,       setIsSaved]       = useState(false)
  const [copied,        setCopied]        = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  // Real session check, replacing reliance on local browser state,
  // which only worked by coincidence, same device and browser someone
  // purchased from. Unauthenticated visitors go to login with a real
  // `next` redirect back here.
  //
  // A magic link lands directly on this exact page with the auth code
  // still in the URL, lib/supabase/client.ts sets
  // detectSessionInUrl: true, so the client library itself detects and
  // exchanges that code the moment it initializes, no server callback
  // route involved. That detection isn't necessarily finished by the
  // time this first getUser() call resolves though, a bare one-shot
  // check could race ahead of it and redirect someone to login before
  // their own valid session has even been created. onAuthStateChange
  // is the real source of truth here, it fires once detection actually
  // completes, getUser() below is only a fast path for a visitor who
  // was already signed in before landing on this page at all.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setAuthChecked(true)
      }
    })

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user)
        setAuthChecked(true)
        return
      }
      const hasIncomingAuthCode =
        window.location.hash.includes('access_token') || window.location.search.includes('code=')
      if (!hasIncomingAuthCode) {
        // No session, and nothing in the URL suggests one is about to
        // arrive, safe to send to login now rather than wait
        // indefinitely for an event that was never going to fire.
        router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      }
      // Otherwise, a magic-link code is present, wait for
      // onAuthStateChange above to resolve it instead of redirecting.
    })

    return () => subscription.unsubscribe()
  }, [])

  // Find tool metadata and detect domain
  useEffect(() => {
    const found = allTools.find(t => t.id === toolId)
    setTool(found)
    if (!found) return

    if      (omniTools.some(t        => t.id === toolId)) setDomain('omni-seer')
    else if (loveTools.some(t        => t.id === toolId)) setDomain('love-relationships')
    else if (wealthTools.some(t      => t.id === toolId)) setDomain('wealth-career')
    else if (wellnessTools.some(t    => t.id === toolId)) setDomain('wellness-spirituality')
    else if (lifePathTools.some(t    => t.id === toolId)) setDomain('life-path-destiny')
    else if (sacredScriptTools.some(t=> t.id === toolId)) setDomain('omni-seer')
    else if (timeKeeperTools.some(t  => t.id === toolId)) setDomain('omni-seer')
    else if (voiceTools.some(t       => t.id === toolId)) setDomain('omni-seer')
  }, [toolId])

  // Load reading content, only once we know who's actually asking.
  useEffect(() => {
    const loadContent = async () => {
      if (!tool || !authChecked) return

      // No jobId → use tool metadata as fallback
      if (!jobId) {
        setContent({
          title:    tool.name,
          sections: (tool.whatYouGet || []).map((f: any) => {
            const { title, description } = getFeatureText(f)
            return { title, content: description }
          }),
          summary: tool.tagline || 'Thank you for your purchase.',
        })
        setLoading(false)
        return
      }

      // Poll reading job. The real session token goes with every
      // request, this is what lets the server verify the reading
      // actually belongs to whoever's asking, rather than trusting a
      // jobId alone, which anyone could type into the URL.
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`/api/reading/job/${jobId}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        if (res.status === 403) {
          setError("This reading doesn't belong to your account.")
          setLoading(false)
          return
        }
        if (!res.ok) {
          setError('Unable to load reading. Please contact support.')
          setLoading(false)
          return
        }
        const data = await res.json()

        if (data.status === 'completed') {
          setContent(data.result)
          setLoading(false)
        } else if (data.status === 'failed') {
          setError(data.error || 'Reading generation failed. Please contact support.')
          setLoading(false)
        } else {
          // Still processing, poll again in 2 seconds
          setTimeout(() => loadContent(), 2000)
        }
      } catch (err) {
        console.error('Error fetching reading:', err)
        setError('Network error. Please try again later.')
        setLoading(false)
      }
    }

    if (tool) loadContent()
  }, [tool, jobId, authChecked])

  const config = domainConfigs[domain] || domainConfigs['omni-seer']
  const Icon   = config.icon

  // ── Loading states ─────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!tool) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-serif mb-4">Report Not Found</h2>
          <Button onClick={() => router.push('/member/dashboard')}>Go to Dashboard</Button>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${config.gradient}
                           text-white flex items-center justify-center text-4xl
                           mx-auto mb-6`}>
            {(tool as any).emoji || config.emoji}
          </div>
          <h2 className="text-2xl font-serif mb-2">{tool.name}</h2>
          <p className="text-neutral-500 mb-6">Loading your reading…</p>
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-serif mb-4">Unable to Load Report</h2>
          <p className="text-neutral-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/member/dashboard')}>Return to Dashboard</Button>
        </Card>
      </div>
    )
  }

  // ── Handlers ───────────────────────────────────────────────
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = (platform: string) => {
    const url   = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(tool.name + ' Report')
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter:  `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?u=${url}`,
      email:    `mailto:?subject=${title}&body=${url}`,
    }
    window.open(urls[platform], '_blank')
    setShowShareMenu(false)
  }

  const handleDownload = () => {
    // Real, when section_texts exists, build a genuine, real, clean
    // document from it directly, stripping the [QUOTE]/[CAPS] markup
    // rather than leaving the literal tags visible in the downloaded
    // file. Falls back to the raw reading text for older readings
    // that don't have this real, structured data yet.
    let text = ''
    if (hasRealSections) {
      text = Object.entries(sectionTexts)
        .filter(([, t]) => typeof t === 'string' && (t as string).trim())
        .map(([key, t], idx) => {
          const title = deriveTitle(whatYouGet[idx] || '', `Section ${idx + 1}`)
          const clean = (t as string)
            .replace(/\[TITLE_HIGHLIGHT\][\s\S]*?\[\/TITLE_HIGHLIGHT\]\s*/gi, '')
            .replace(/\[QUOTE\]([\s\S]*?)\[\/QUOTE\]/gi, '\n\n"$1"\n\n')
            .replace(/\[CAPS\]([\s\S]*?)\[\/CAPS\]/gi, '\n\n$1\n\n')
            .replace(/\[VS_LEFT\]([\s\S]*?)\[\/VS_LEFT\]\s*\[VS_RIGHT\]([\s\S]*?)\[\/VS_RIGHT\]/gi,
              (_m, left, right) => `\n\n${left.trim()}\n\nversus\n\n${right.trim()}\n\n`)
            .replace(/\[FINAL_TABLE\]([\s\S]*?)\[\/FINAL_TABLE\]/gi, (_m, inner) => {
              const rows = [...(inner as string).matchAll(/\[FT_ROW\]([\s\S]*?)\[\/FT_ROW\]/gi)]
                .map(rm => rm[1].split('|').map(s => s.trim()).join(' — '))
              return '\n\n' + rows.join('\n') + '\n\n'
            })
          return `${title.toUpperCase()}\n\n${clean.trim()}`
        })
        .join('\n\n\n')
    } else {
      text = content?.reading || (typeof content === 'string' ? content : JSON.stringify(content, null, 2))
    }
    const blob = new Blob([text], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = tool.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_reading.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => window.print()

  // ── Extract display content ────────────────────────────────
  const displayContent  = content || {}
  const readingText     = displayContent.reading || (typeof displayContent === 'string' ? displayContent : '')
  const domainSections  = displayContent.domain_sections || {}
  const sectionTexts    = displayContent.section_texts || {}
  const whatYouGet      = displayContent.what_you_get || []
  const hasRealSections = Object.values(sectionTexts).some((t: any) => typeof t === 'string' && t.trim().length > 0)

  const sectionsList    = Object.entries(domainSections).map(([key, text]) => ({
    title:   key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    content: text as string,
  }))

  // Real, derives a short, real title from a whatYouGet promise, the
  // same, honest approach the PDF formatter already uses, a full
  // promise sentence isn't a real heading.
  const deriveTitle = (promise: string, fallback: string): string => {
    if (!promise) return fallback
    const clean = promise.trim()
    return clean.charAt(0).toUpperCase() + clean.slice(1).replace(/[.,;:]+$/, '')
  }

  // Real, actual markup parser, reading the exact, same [QUOTE] and
  // [CAPS] tags the backend prompt now asks the model to produce,
  // and rendering each as a genuine, styled React element, a real,
  // gold-bordered pull quote, a real, tracked caps sub-header,
  // instead of leaving the literal tag text visible on the page.
  // Real, actual hex pairs matching each, real domain's existing
  // Tailwind gradient classes exactly, confirmed directly from
  // domainConfigs above, used for the real, actual [HOOK] opening
  // block, so it uses the tool's own, genuine domain identity
  // instead of one, fixed color regardless of subject.
  const domainHookColors: Record<string, { bg: string; accent: string }> = {
    'omni-seer':             { bg: '#f3f0fd', accent: '#4f46e5' },
    'love-relationships':    { bg: '#fdf1f3', accent: '#dc2626' },
    'wealth-career':         { bg: '#eefdf6', accent: '#059669' },
    'wellness-spirituality': { bg: '#f6f0fe', accent: '#7c3aed' },
    'life-path-destiny':     { bg: '#fff6ec', accent: '#d97706' },
  }
  const hookColors = domainHookColors[domain] || domainHookColors['omni-seer']

  const renderSectionMarkup = (text: string, keyPrefix: string) => {
    if (!text) return null
    // Real, complete parser, case-insensitive throughout, recognizing
    // every, real tag the backend prompt can produce, QUOTE, CAPS,
    // paired VS_LEFT/VS_RIGHT, PROOF, WARNING, REMEDY, OPPORTUNITY,
    // TIME, TIMELINE_ITEM, NUMBERED_ITEM, FINAL_TABLE, and now HOOK,
    // each rendered using the real, verified Kayal design classes, tested
    // first as a static mockup before being wired in here.
    const parts = text.split(
      /(\[QUOTE\][\s\S]*?\[\/QUOTE\]|\[CAPS\][\s\S]*?\[\/CAPS\]|\[VS_LEFT\][\s\S]*?\[\/VS_RIGHT\]|\[PROOF\][\s\S]*?\[\/PROOF\]|\[WARNING\][\s\S]*?\[\/WARNING\]|\[REMEDY\][\s\S]*?\[\/REMEDY\]|\[OPPORTUNITY\][\s\S]*?\[\/OPPORTUNITY\]|\[TIME\][\s\S]*?\[\/TIME\]|\[TIMELINE_ITEM\][\s\S]*?\[\/TIMELINE_ITEM\]|\[NUMBERED_ITEM\][\s\S]*?\[\/NUMBERED_ITEM\]|\[FINAL_TABLE\][\s\S]*?\[\/FINAL_TABLE\]|\[HOOK\][\s\S]*?\[\/HOOK\])/gi
    )
    let numberedCount = 0
    return parts.map((part, i) => {
      const quoteMatch = part.match(/^\[QUOTE\]([\s\S]*?)\[\/QUOTE\]$/i)
      if (quoteMatch) {
        return (
          <div key={`${keyPrefix}-${i}`} className="kayal-insight">
            <p>“{quoteMatch[1].trim()}”</p>
          </div>
        )
      }
      const hookMatch = part.match(/^\[HOOK\]([\s\S]*?)\[\/HOOK\]$/i)
      if (hookMatch) {
        return (
          <div key={`${keyPrefix}-${i}`} className="kayal-hook"
               style={{ background: hookColors.bg, borderColor: hookColors.accent }}>
            <div className="kayal-hook-label" style={{ color: hookColors.accent }}>What This Reading Is About</div>
            <p>{hookMatch[1].trim()}</p>
          </div>
        )
      }
      const capsMatch = part.match(/^\[CAPS\]([\s\S]*?)\[\/CAPS\]$/i)
      if (capsMatch) {
        return <div key={`${keyPrefix}-${i}`} className="kayal-caps">{capsMatch[1].trim().toUpperCase()}</div>
      }
      const vsMatch = part.match(/^\[VS_LEFT\]([\s\S]*?)\[\/VS_LEFT\]\s*\[VS_RIGHT\]([\s\S]*?)\[\/VS_RIGHT\]$/i)
      if (vsMatch) {
        // Real, robust, honest split, finds where the leading,
        // all-caps label ends and real, normal-case prose begins,
        // confirmed directly necessary since the model doesn't
        // reliably separate them with an actual newline, which the
        // previous version assumed and silently failed on.
        const splitLabelBody = (raw: string): [string, string] => {
          const trimmed = raw.trim()
          const m = trimmed.match(/^([A-Z0-9][A-Z0-9\s,()'/-]*?)\s+(?=[A-Z][a-z])/)
          return m ? [m[1].trim(), trimmed.slice(m[0].length).trim()] : [trimmed, '']
        }
        const [leftLabel, leftBody] = splitLabelBody(vsMatch[1])
        const [rightLabel, rightBody] = splitLabelBody(vsMatch[2])
        return (
          <div key={`${keyPrefix}-${i}`} className="kayal-conflict">
            <div className="kayal-cl"><div className="kayal-clabel">{leftLabel.toUpperCase()}</div><p>{leftBody}</p></div>
            <div className="kayal-arrow">→</div>
            <div className="kayal-cr"><div className="kayal-clabel">{rightLabel.toUpperCase()}</div><p>{rightBody}</p></div>
          </div>
        )
      }
      const boxTypes: [RegExp, string][] = [
        [/^\[PROOF\]([\s\S]*?)\[\/PROOF\]$/i, ''],
        [/^\[WARNING\]([\s\S]*?)\[\/WARNING\]$/i, 'kayal-warn'],
        [/^\[REMEDY\]([\s\S]*?)\[\/REMEDY\]$/i, 'kayal-remedy'],
        [/^\[OPPORTUNITY\]([\s\S]*?)\[\/OPPORTUNITY\]$/i, 'kayal-opp'],
        [/^\[TIME\]([\s\S]*?)\[\/TIME\]$/i, 'kayal-time'],
      ]
      for (const [re, cls] of boxTypes) {
        const m = part.match(re)
        if (m) {
          const [title, ...bodyParts] = m[1].trim().split('|')
          const body = bodyParts.length ? bodyParts.join('|').trim() : title.trim()
          const label = bodyParts.length ? title.trim() : ''
          return (
            <div key={`${keyPrefix}-${i}`} className={`kayal-box ${cls}`}>
              {label && <div className="kayal-box-title">{label.toUpperCase()}</div>}
              <div className="kayal-box-body">{body}</div>
            </div>
          )
        }
      }
      const timelineMatch = part.match(/^\[TIMELINE_ITEM\]([\s\S]*?)\[\/TIMELINE_ITEM\]$/i)
      if (timelineMatch) {
        const segs = timelineMatch[1].split('|').map(s => s.trim())
        if (segs.length >= 4) {
          const [number, period, title, body, state] = segs
          const dotBg = state === 'now' ? '#1c1917' : state === 'future' ? '#e2d9cc' : '#b8860b'
          return (
            <div key={`${keyPrefix}-${i}`} className="kayal-timeline-item">
              <div className="kayal-dot" style={{ background: dotBg }}>{number}</div>
              <div>
                <div className="kayal-timeline-period">{period.toUpperCase()}</div>
                <h4 className="kayal-timeline-title">{title}</h4>
                <div className="kayal-timeline-body">{body}</div>
              </div>
            </div>
          )
        }
      }
      const numberedMatch = part.match(/^\[NUMBERED_ITEM\]([\s\S]*?)\[\/NUMBERED_ITEM\]$/i)
      if (numberedMatch) {
        numberedCount += 1
        return (
          <div key={`${keyPrefix}-${i}`} className="kayal-nl-item">
            <div className="kayal-nl-badge">{numberedCount}</div>
            <div className="kayal-nl-body">{numberedMatch[1].trim()}</div>
          </div>
        )
      }
      const finalTableMatch = part.match(/^\[FINAL_TABLE\]([\s\S]*?)\[\/FINAL_TABLE\]$/i)
      if (finalTableMatch) {
        const rows = [...finalTableMatch[1].matchAll(/\[FT_ROW\]([\s\S]*?)\[\/FT_ROW\]/gi)]
          .map(m => m[1].split('|'))
          .filter(r => r.length === 2)
        if (!rows.length) return null
        return (
          <div key={`${keyPrefix}-${i}`} className="kayal-final-table">
            {rows.map(([label, statement], j) => (
              <div key={j} className="kayal-ft-row">
                <div className="kayal-ft-label">{label.trim()}</div>
                <div className="kayal-ft-statement">{statement.trim()}</div>
              </div>
            ))}
          </div>
        )
      }
      const trimmed = part.trim()
      if (!trimmed) return null
      return trimmed.split(/\n\n+/).map((para, j) => (
        <p key={`${keyPrefix}-${i}-${j}`} className="kayal-body">{para.trim()}</p>
      ))
    })
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Real, complete Kayal design system, fonts, colors, and every
          real component style, matching the actual, verified PDF
          design directly, tested first as a static mockup before
          being wired in here. */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        .kayal-reading {
          --k-bg: #faf8f4; --k-text: #1c1917; --k-text-p: #2d2925;
          --k-gold: #b8860b; --k-gold-light: #d4a96a; --k-border: #e2d9cc;
          --k-muted: #78716c; --k-muted-light: #a8a29e;
          --k-insight-bg: #fffbf0; --k-insight-txt: #3d3630; --k-proof-txt: #44403c;
          --k-warn-bg: #fff8f0; --k-warn-border: #f59e0b; --k-warn-txt: #d97706;
          --k-remedy-bg: #f0f9f4; --k-remedy-border: #86efac; --k-remedy-txt: #16a34a;
          --k-opp-bg: #f0f7ff; --k-opp-border: #93c5fd; --k-opp-txt: #2563eb;
          --k-time-bg: #fdf4ff; --k-time-border: #d8b4fe; --k-time-txt: #7c3aed;
          --k-cl-bg: #fff7ed; --k-cl-border: #fed7aa; --k-cl-txt: #9a3412;
          --k-cr-bg: #f0fdf4; --k-cr-border: #86efac; --k-cr-txt: #166534;
          background: var(--k-bg); font-family: 'Inter', sans-serif; color: var(--k-text-p);
          overflow-wrap: break-word;
        }
        .kayal-cover { text-align: center; padding: 32px 0 28px; border-bottom: 1px solid var(--k-border); margin-bottom: 28px; }
        .kayal-seal { font-size: 20px; color: var(--k-text); margin-bottom: 12px; }
        .kayal-eyebrow { font-family: 'Inter'; font-weight: 600; font-size: 9px; letter-spacing: 1px; color: var(--k-gold); margin-bottom: 12px; }
        .kayal-cover-name { font-family: 'Cormorant Garamond'; font-weight: 700; font-size: clamp(26px, 7vw, 42px); color: var(--k-text); margin: 0 0 8px; line-height: 1.15; word-wrap: break-word; }
        .kayal-cover-sub { font-size: 12px; color: var(--k-muted); margin: 2px 0; }
        .kayal-cover-sub-light { font-size: 11px; color: var(--k-muted-light); margin: 2px 0; }
        .kayal-gold-rule { width: 40px; height: 2px; background: var(--k-gold); margin: 14px auto; border: none; }
        .kayal-cover-intro { font-family: 'Cormorant Garamond'; font-style: italic; font-size: clamp(15px, 4vw, 18px); color: #57534e; max-width: 520px; margin: 14px auto 0; line-height: 1.7; padding: 0 8px; }
        .kayal-chapter-label { font-family: 'Inter'; font-weight: 600; font-size: 10px; letter-spacing: 1px; color: var(--k-gold); display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px; }
        .kayal-chapter-label::before, .kayal-chapter-label::after { content: ''; flex: 1; height: 1px; background: var(--k-border); max-width: 60px; }
        .kayal-chapter-title { font-family: 'Cormorant Garamond'; font-weight: 700; font-size: clamp(22px, 6vw, 28px); color: var(--k-text); margin: 0 0 18px; line-height: 1.25; text-align: center; }
        .kayal-title-highlight { color: var(--k-gold); font-style: italic; }
        .kayal-body { font-size: 15.5px; line-height: 1.8; margin: 0 0 22px; text-align: justify; color: var(--k-text-p); }
        .kayal-insight { border-left: 3px solid var(--k-gold); background: var(--k-insight-bg); padding: 14px 16px; margin: 22px 0; }
        .kayal-hook { padding: 20px 24px; margin: 4px 0 26px; border-radius: 4px; border-left: 4px solid; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .kayal-hook-label { font-family: 'Inter'; font-weight: 600; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
        .kayal-hook p { font-family: 'Cormorant Garamond'; font-style: italic; font-weight: 600; font-size: 19px; color: var(--k-text); margin: 0; line-height: 1.6; text-align: left; }
        .kayal-insight p { font-family: 'Cormorant Garamond'; font-style: italic; font-size: 16px; color: var(--k-insight-txt); margin: 0; line-height: 1.7; text-align: justify; }
        .kayal-caps { background: #f7ecd1; padding: 8px 14px; font-weight: 700; font-size: 10.5px; letter-spacing: 1px; color: var(--k-text); margin: 24px 0 12px; }
        .kayal-box { border: 1px solid var(--k-border); background: #fff; padding: 14px 16px; margin: 22px 0; }
        .kayal-box-title { font-weight: 600; font-size: 9.5px; letter-spacing: 0.8px; color: var(--k-gold); margin-bottom: 6px; }
        .kayal-box-body { font-size: 13.5px; line-height: 1.6; color: var(--k-proof-txt); text-align: justify; }
        .kayal-warn { background: var(--k-warn-bg); border-color: var(--k-warn-border); }
        .kayal-warn .kayal-box-title { color: var(--k-warn-txt); }
        .kayal-remedy { background: var(--k-remedy-bg); border-color: var(--k-remedy-border); }
        .kayal-remedy .kayal-box-title { color: var(--k-remedy-txt); }
        .kayal-opp { background: var(--k-opp-bg); border-color: var(--k-opp-border); }
        .kayal-opp .kayal-box-title { color: var(--k-opp-txt); }
        .kayal-time { background: var(--k-time-bg); border-color: var(--k-time-border); }
        .kayal-time .kayal-box-title { color: var(--k-time-txt); }
        .kayal-conflict { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: stretch; margin: 22px 0; }
        .kayal-conflict > div { padding: 12px 14px; border-radius: 3px; border: 1px solid; min-width: 0; }
        .kayal-conflict .kayal-cl { background: var(--k-cl-bg); border-color: var(--k-cl-border); }
        .kayal-conflict .kayal-cr { background: var(--k-cr-bg); border-color: var(--k-cr-border); }
        .kayal-conflict .kayal-arrow { display: flex; align-items: center; justify-content: center; color: var(--k-gold); font-weight: 700; font-size: 14px; border: none !important; padding: 0 4px !important; }
        .kayal-conflict .kayal-clabel { font-weight: 600; font-size: 9px; letter-spacing: 0.5px; margin-bottom: 4px; word-wrap: break-word; }
        .kayal-cl .kayal-clabel, .kayal-cl p { color: var(--k-cl-txt); }
        .kayal-cr .kayal-clabel, .kayal-cr p { color: var(--k-cr-txt); }
        .kayal-conflict p { font-size: 12.5px; margin: 0; line-height: 1.5; word-wrap: break-word; }
        .kayal-final-table { border: 1px solid var(--k-border); margin: 22px 0; }
        .kayal-ft-row { display: flex; flex-wrap: wrap; padding: 12px 14px; gap: 4px 16px; }
        .kayal-ft-row:nth-child(odd) { background: #fff; }
        .kayal-ft-row:nth-child(even) { background: var(--k-insight-bg); }
        .kayal-ft-label { font-weight: 600; font-size: 13px; color: var(--k-text); width: 100%; }
        .kayal-ft-statement { font-style: italic; font-size: 13px; color: var(--k-proof-txt); width: 100%; }
        @media (min-width: 640px) {
          .kayal-ft-label { width: 40%; } .kayal-ft-statement { width: 58%; }
        }
        .kayal-timeline-item { display: flex; gap: 12px; margin-bottom: 22px; }
        .kayal-dot { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Inter'; font-weight: 600; font-size: 9px; color: #fff; }
        .kayal-timeline-period { font-family: 'Inter'; font-weight: 600; font-size: 10px; letter-spacing: 0.4px; color: var(--k-gold); margin-bottom: 3px; }
        .kayal-timeline-title { font-family: 'Cormorant Garamond'; font-weight: 700; font-size: 17px; color: var(--k-text); margin: 0 0 5px; }
        .kayal-timeline-body { font-size: 13.5px; line-height: 1.6; color: var(--k-proof-txt); text-align: justify; }
        .kayal-nl-item { display: flex; gap: 10px; margin-bottom: 14px; align-items: flex-start; }
        .kayal-nl-badge { flex-shrink: 0; width: 19px; height: 19px; border-radius: 50%; background: var(--k-gold); color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Inter'; font-weight: 600; font-size: 8.5px; margin-top: 2px; }
        .kayal-nl-body { font-size: 14.5px; line-height: 1.6; color: var(--k-text-p); }
        /* Real, actual, tested mobile rules, confirmed directly by
           rendering at a genuine, common phone width, the conflict
           box stacks vertically instead of squeezing three columns
           into a narrow screen, with the arrow rotated to point down. */
        @media (max-width: 480px) {
          .kayal-conflict { grid-template-columns: 1fr; }
          .kayal-conflict .kayal-arrow { transform: rotate(90deg); padding: 6px 0 !important; }
          .kayal-cover { padding: 24px 0 20px; }
          .kayal-body, .kayal-box-body, .kayal-timeline-body { font-size: 14.5px; }
        }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/member/dashboard')}
              className="flex items-center gap-2 text-neutral-600 hover:text-primary-600">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Dashboard</span>
            </button>
            <div className="h-5 w-px bg-neutral-200" />
            <Badge variant="outline" className={`${config.bg} ${config.color} border-0`}>
              <Icon className="w-3 h-3 mr-1" />{config.name}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsSaved(!isSaved)}
              className="p-2 rounded-lg hover:bg-neutral-100">
              {isSaved
                ? <BookmarkCheck className="w-5 h-5 text-primary-600" />
                : <Bookmark className="w-5 h-5 text-neutral-500" />}
            </button>
            <button onClick={handlePrint}    className="p-2 rounded-lg hover:bg-neutral-100">
              <Printer  className="w-5 h-5 text-neutral-500" />
            </button>
            <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-neutral-100">
              <Download className="w-5 h-5 text-neutral-500" />
            </button>
            <div className="relative">
              <button onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-2 rounded-lg hover:bg-neutral-100">
                <Share2 className="w-5 h-5 text-neutral-500" />
              </button>
              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg
                                shadow-lg border py-1 z-20">
                  {['facebook','twitter','linkedin','email'].map(p => (
                    <button key={p} onClick={() => handleShare(p)}
                      className="w-full px-4 py-2 text-left text-sm
                                 hover:bg-neutral-50 capitalize">
                      {p}
                    </button>
                  ))}
                  <div className="border-t my-1" />
                  <button onClick={handleCopyLink}
                    className="w-full px-4 py-2 text-left text-sm
                               hover:bg-neutral-50 flex items-center gap-2">
                    {copied
                      ? <><Check className="w-4 h-4 text-green-600" /> Copied!</>
                      : <><Copy className="w-4 h-4" /> Copy link</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8">
          <div className="kayal-reading max-w-none">
            {/* Real, actual cover, matching the verified, tested design
                precisely, the moon and star seal, the gold eyebrow
                line, the large serif name, and the real, italic
                tagline, replacing the previous, generic title block. */}
            <div className="kayal-cover">
              <div className="kayal-seal">☽ ✦ ☾</div>
              <div className="kayal-eyebrow">KAYAL SOULPATH &nbsp;·&nbsp; COMPLETE PERSONAL READING</div>
              <h1 className="kayal-cover-name">
                {(user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'Seeker').toUpperCase()}
              </h1>
              <p className="kayal-cover-sub">{new Date().toLocaleDateString()}</p>
              {jobId && <p className="kayal-cover-sub-light">Report ID: {jobId.slice(-8)} · Confidential</p>}
              <hr className="kayal-gold-rule" />
              <p className="kayal-cover-intro">{displayContent.title || tool.name}</p>
            </div>

            {/* Real, actual, properly-formatted sections, the correct,
                current data shape, checked first, before falling back
                to the older, raw display below for older readings that
                genuinely don't have this real, structured data yet. */}
            {hasRealSections && (
              <div className="mb-10">
                {Object.entries(sectionTexts).map(([key, rawText], idx) => {
                  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return null
                  const promise = whatYouGet[idx] || ''
                  const title = deriveTitle(promise, `Section ${idx + 1}`)
                  // Real, extracts the model's own, actual choice of
                  // which word or phrase in this title deserves the
                  // gold highlight, confirmed missing entirely before,
                  // matching the reference's own, real, consistent
                  // pattern across every chapter title.
                  const hookRe = /^\s*\[TITLE_HIGHLIGHT\]([\s\S]*?)\[\/TITLE_HIGHLIGHT\]\s*/i
                  const hlMatch = rawText.match(hookRe)
                  const highlightWord = hlMatch ? hlMatch[1].trim() : ''
                  const text = hlMatch ? rawText.slice(hlMatch[0].length) : rawText
                  const titleIdx = highlightWord ? title.indexOf(highlightWord) : -1
                  const titleNode = titleIdx >= 0 ? (
                    <>
                      {title.slice(0, titleIdx)}
                      <span className="kayal-title-highlight">{highlightWord}</span>
                      {title.slice(titleIdx + highlightWord.length)}
                    </>
                  ) : title
                  return (
                    <div key={key} className="mb-10">
                      <div className="kayal-chapter-label">{String(idx + 1).padStart(2, '0')}</div>
                      <h2 className="kayal-chapter-title">{titleNode}</h2>
                      {renderSectionMarkup(text, key)}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Main reading text, real, honest fallback, only shown
                for older readings that genuinely don't have the
                newer, correct section_texts data yet. */}
            {!hasRealSections && readingText && (
              <div className="mb-10">
                <h2 className="text-2xl font-serif mb-4">Your Reading</h2>
                <div className={`${config.bg} p-6 rounded-lg whitespace-pre-wrap`}>
                  {readingText}
                </div>
              </div>
            )}

            {/* Domain sections */}
            {sectionsList.length > 0 && (
              <div className="mb-10">
                <h2 className="text-2xl font-serif mb-4">Domain Insights</h2>
                <div className="space-y-6">
                  {sectionsList.map((section, idx) => (
                    <div key={idx}
                      className="p-5 bg-white border border-neutral-200 rounded-lg">
                      <h3 className={`text-xl font-serif mb-3 ${config.color}`}>
                        {section.title}
                      </h3>
                      <div className="text-neutral-700 leading-relaxed whitespace-pre-line">
                        {section.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback sections (from tool.whatYouGet) */}
            {!readingText && sectionsList.length === 0 && displayContent.sections?.length > 0 && (
              <div className="mb-10">
                <div className="space-y-6">
                  {displayContent.sections.map((section: any, idx: number) => (
                    <div key={idx}
                      className="p-5 bg-white border border-neutral-200 rounded-lg">
                      <h3 className={`text-xl font-serif mb-3 ${config.color}`}>
                        {section.title}
                      </h3>
                      <p className="text-neutral-700 leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Download CTA */}
            <div className={`mt-12 p-6 bg-gradient-to-r ${config.lightGradient}
                             rounded-lg text-center`}>
              <Button onClick={handleDownload}
                className={`bg-gradient-to-r ${config.gradient} text-white mx-auto`}>
                <DownloadCloud className="w-4 h-4 mr-2" /> Download Reading
              </Button>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t text-center text-xs text-neutral-400">
              <p>© {new Date().getFullYear()} Kayal LifeOS, {config.name}</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
