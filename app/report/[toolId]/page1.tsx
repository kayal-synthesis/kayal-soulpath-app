'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  ArrowLeft, Download, Share2, Clock, Calendar, User, Loader2,
  BookOpen, Printer, Heart, Moon, TrendingUp, Compass, Crown,
  Copy, Check, Facebook, Twitter, Linkedin, Mail,
  Bookmark, BookmarkCheck, DownloadCloud, Sparkles
} from 'lucide-react'

// Import tool constants for metadata
import { omniSeerTools } from '@/lib/constants/omni-seer-tools'
import { loveTools } from '@/lib/constants/love-tools'
import { wealthTools } from '@/lib/constants/wealth-tools'
import { careerTools } from '@/lib/constants/career-tools'
import { spiritualTools } from '@/lib/constants/spiritual-tools'
import { healthTools } from '@/lib/constants/health-tools'
import { lifePathTools } from '@/lib/constants/life-path-tools'

const allTools = [
  ...omniSeerTools, ...loveTools, ...wealthTools, ...careerTools,
  ...spiritualTools, ...healthTools, ...lifePathTools
]

const domainConfigs: Record<string, any> = {
  'omni-seer': { name: 'Omni-Seer Sanctum', icon: Crown, color: 'text-indigo-600', bg: 'bg-indigo-50', gradient: 'from-indigo-600 to-purple-600', lightGradient: 'from-indigo-50 to-purple-50', emoji: '🔮', description: 'Ancient wisdom and divine guidance from the Omni-Seer' },
  'love-relationships': { name: 'Love & Relationships', icon: Heart, color: 'text-red-600', bg: 'bg-red-50', gradient: 'from-red-600 to-pink-600', lightGradient: 'from-red-50 to-pink-50', emoji: '💞', description: 'Romantic destiny, soulmate connections, and relationship guidance' },
  'wealth-career': { name: 'Wealth & Career', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-600 to-teal-600', lightGradient: 'from-emerald-50 to-teal-50', emoji: '💰', description: 'Financial abundance, professional success, and career destiny' },
  'wellness-spirituality': { name: 'Wellness & Spirituality', icon: Moon, color: 'text-purple-600', bg: 'bg-purple-50', gradient: 'from-purple-600 to-indigo-600', lightGradient: 'from-purple-50 to-indigo-50', emoji: '🧘', description: 'Body healing, soul awakening, and spiritual growth' },
  'life-path-destiny': { name: 'Life Path & Destiny', icon: Compass, color: 'text-amber-600', bg: 'bg-amber-50', gradient: 'from-amber-600 to-orange-600', lightGradient: 'from-amber-50 to-orange-50', emoji: '🗺️', description: 'True purpose, life journey, and ultimate destiny' }
}

// Helper to generate a PDF blob from the reading content (real data)
function generatePDFBlob(content: any, tool: any, userName: string, config: any) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>${tool.name} Report</title>
    <style>
      body { font-family: 'Georgia', serif; margin: 40px; line-height: 1.6; color: #333; }
      h1 { font-size: 28px; text-align: center; margin-bottom: 20px; }
      h2 { font-size: 22px; margin-top: 30px; color: #4f46e5; }
      .header { text-align: center; margin-bottom: 40px; }
      .section { margin-bottom: 30px; }
      .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #888; }
    </style>
    </head>
    <body>
      <div class="header">
        <h1>${tool.name}</h1>
        <p>Prepared for: ${userName}</p>
        <p>Date: ${new Date().toLocaleDateString()}</p>
      </div>
      ${content.sections?.map((s: any) => `
        <div class="section">
          <h2>${s.title}</h2>
          <p>${s.content}</p>
        </div>
      `).join('')}
      ${content.summary ? `<div class="section"><h2>Summary</h2><p>${content.summary}</p></div>` : ''}
      <div class="footer">© ${new Date().getFullYear()} Kayal LifeOS – ${config.name}</div>
    </body>
    </html>
  `
  return new Blob([htmlContent], { type: 'application/pdf' })
}

export default function ReportPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAnonymousStore()
  const toolId = params.toolId as string
  const jobId = searchParams.get('jobId')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<any>(null)
  const [tool, setTool] = useState<any>(null)
  const [domain, setDomain] = useState('omni-seer')
  const [isSaved, setIsSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  // Fetch tool metadata
  useEffect(() => {
    const found = allTools.find(t => t.id === toolId)
    setTool(found)
    if (found) {
      if (omniSeerTools.some(t => t.id === toolId)) setDomain('omni-seer')
      else if (loveTools.some(t => t.id === toolId)) setDomain('love-relationships')
      else if (wealthTools.some(t => t.id === toolId) || careerTools.some(t => t.id === toolId)) setDomain('wealth-career')
      else if (healthTools.some(t => t.id === toolId) || spiritualTools.some(t => t.id === toolId)) setDomain('wellness-spirituality')
      else if (lifePathTools.some(t => t.id === toolId)) setDomain('life-path-destiny')
    }
  }, [toolId])

  // Fetch reading content from API
  useEffect(() => {
    if (!jobId) {
      setError('No job ID provided')
      setLoading(false)
      return
    }

    const fetchReading = async () => {
      try {
        const res = await fetch(`/api/reading/result/${jobId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load reading')
        if (data.status !== 'completed') {
          setTimeout(() => fetchReading(), 2000)
          return
        }
        setContent(data.content)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    fetchReading()
  }, [jobId])

  const config = domainConfigs[domain] || domainConfigs['omni-seer']
  const Icon = config.icon

  if (!tool) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">📄</div>
          <h2 className="text-2xl font-serif mb-4">Report Not Found</h2>
          <p className="text-neutral-600 mb-6">The report you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/member/dashboard')}>Go to Dashboard</Button>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${config.gradient} text-white flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg`}>
            {tool.emoji || config.emoji}
          </div>
          <h2 className="text-2xl font-serif mb-2">{tool.name}</h2>
          <p className="text-neutral-500 mb-6">Loading your reading...</p>
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse animation-delay-200" />
            <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse animation-delay-400" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">⚠️</div>
          <h2 className="text-2xl font-serif mb-4">Unable to Load Report</h2>
          <p className="text-neutral-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/member/dashboard')}>Return to Dashboard</Button>
        </Card>
      </div>
    )
  }

  // Handlers
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = (platform: string) => {
    const url = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(`${tool.name} Report`)
    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?u=${url}`,
      email: `mailto:?subject=${title}&body=${url}`
    }
    window.open(shareUrls[platform], '_blank')
    setShowShareMenu(false)
  }

  const handleDownload = () => {
    if (!content) return
    const blob = generatePDFBlob(content, tool, user?.name || 'Seeker', config)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tool.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => window.print()

  // Render the real content with full layout
  const renderContent = () => (
    <div className="prose max-w-none">
      {/* Title Page */}
      <div className="text-center mb-12 pb-12 border-b">
        <h1 className="text-4xl font-serif mb-4">{content.title || tool.name}</h1>
        <h2 className="text-xl text-neutral-500 mb-8">Personal {config.name} Report</h2>
        <div className={`w-24 h-24 mx-auto bg-gradient-to-br ${config.lightGradient} rounded-full flex items-center justify-center text-5xl mb-6`}>
          {tool.emoji || config.emoji}
        </div>
        <p className="text-neutral-600">Prepared for: <span className="font-semibold">{user?.name || 'Seeker'}</span></p>
        <p className="text-neutral-600">Date: {new Date().toLocaleDateString()}</p>
        <p className="text-neutral-600">Report ID: {jobId?.slice(-8) || 'N/A'}</p>
      </div>

      {/* Executive Summary (if content has summary) */}
      {content.summary && (
        <div className="mb-12">
          <h2 className="text-2xl font-serif mb-4">Executive Summary</h2>
          <div className={`${config.bg} p-6 rounded-lg`}>
            <p className="text-neutral-700 leading-relaxed">{content.summary}</p>
          </div>
        </div>
      )}

      {/* Full Reading Sections */}
      <div className="mb-12">
        <h2 className="text-2xl font-serif mb-4">Complete Reading</h2>
        <div className="space-y-6">
          {content.sections?.map((section: any, idx: number) => (
            <div key={idx} className="p-6 bg-white border border-neutral-200 rounded-lg">
              <h3 className={`text-xl font-serif mb-3 ${config.color}`}>{section.title}</h3>
              <div className="text-neutral-700 leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-200 flex justify-end">
                <span className={`text-xs ${config.color}`}>Section {idx + 1} of {content.sections.length}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action / Footer */}
      <div className={`mt-12 p-6 bg-gradient-to-r ${config.lightGradient} rounded-lg text-center`}>
        <h3 className="text-xl font-serif mb-3">Deepen Your Understanding</h3>
        <p className="text-neutral-600 mb-4">
          This reading is a living document of your soul's journey. Return to it often as new insights reveal themselves.
        </p>
        <Button onClick={handleDownload} className={`bg-gradient-to-r ${config.gradient} text-white mx-auto`}>
          <DownloadCloud className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <div className="mt-12 pt-6 border-t text-center text-xs text-neutral-400">
        <p>© {new Date().getFullYear()} Kayal LifeOS - {config.name}</p>
        <p className="mt-1">This report is a sacred document. Please treat it with respect.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/member/dashboard')} className="flex items-center gap-2 text-neutral-600 hover:text-primary-600">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Dashboard</span>
            </button>
            <div className="h-5 w-px bg-neutral-200" />
            <Badge variant="outline" className={`${config.bg} ${config.color} border-0`}>
              <Icon className="w-3 h-3 mr-1" />
              {config.name}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsSaved(!isSaved)} className="p-2 rounded-lg hover:bg-neutral-100">
              {isSaved ? <BookmarkCheck className="w-5 h-5 text-primary-600" /> : <Bookmark className="w-5 h-5 text-neutral-500" />}
            </button>
            <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-neutral-100">
              <Printer className="w-5 h-5 text-neutral-500" />
            </button>
            <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-neutral-100">
              <Download className="w-5 h-5 text-neutral-500" />
            </button>
            <div className="relative">
              <button onClick={() => setShowShareMenu(!showShareMenu)} className="p-2 rounded-lg hover:bg-neutral-100">
                <Share2 className="w-5 h-5 text-neutral-500" />
              </button>
              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border py-1 z-20">
                  {['facebook', 'twitter', 'linkedin', 'email'].map(p => (
                    <button key={p} onClick={() => handleShare(p)} className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 capitalize">{p}</button>
                  ))}
                  <div className="border-t my-1" />
                  <button onClick={handleCopyLink} className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2">
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8">
          {renderContent()}
        </Card>
      </main>
    </div>
  )
}