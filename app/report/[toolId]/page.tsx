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
    const text = content?.reading || (typeof content === 'string' ? content : JSON.stringify(content, null, 2))
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
  const sectionsList    = Object.entries(domainSections).map(([key, text]) => ({
    title:   key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    content: text as string,
  }))

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50">
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
          <div className="prose max-w-none">
            {/* Title block */}
            <div className="text-center mb-12 pb-12 border-b">
              <h1 className="text-4xl font-serif mb-4">
                {displayContent.title || tool.name}
              </h1>
              <div className={`w-24 h-24 mx-auto bg-gradient-to-br ${config.lightGradient}
                               rounded-full flex items-center justify-center text-5xl mb-6`}>
                {(tool as any).emoji || config.emoji}
              </div>
              <p className="text-neutral-600">
                Prepared for: <span className="font-semibold">{user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'Seeker'}</span>
              </p>
              <p className="text-neutral-600">
                Date: {new Date().toLocaleDateString()}
              </p>
              {jobId && (
                <p className="text-neutral-600">
                  Report ID: {jobId.slice(-8)}
                </p>
              )}
            </div>

            {/* Main reading text */}
            {readingText && (
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
