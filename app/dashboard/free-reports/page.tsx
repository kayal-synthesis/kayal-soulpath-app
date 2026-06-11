export const dynamic = 'force-dynamic'
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ShareButton } from '@/components/ui/ShareButton'
import { ArrowRight, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Report {
  id: string
  title: string
  subtitle: string
  preview: string
  type: string
}

export default function FreeReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [reports] = useState<Report[]>([
    {
      id: '1',
      title: 'Life Path Number',
      subtitle: 'You are a 5 — The Explorer',
      preview: "You're here to experience, to move, to taste everything life offers.",
      type: 'numerology'
    },
    {
      id: '2',
      title: 'Personal Year 2026',
      subtitle: "You're in a 3 Year — Creative Expression",
      preview: 'This is your year to create, express, and find joy in the process.',
      type: 'numerology'
    },
    {
      id: '3',
      title: 'Soul Urge',
      subtitle: "You're a 6 — The Caretaker",
      preview: "You need to be needed. This is not weakness. It's your design.",
      type: 'numerology'
    }
  ])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const referralLink = `https://kayal.life/r/${session?.user?.id || 'demo'}`

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-primary-900 mb-2">
          {session?.user?.name?.split(' ')[0]}, your reports are ready
        </h1>
        <p className="text-neutral-600">Here are your free insights to get started</p>
      </div>

      {/* Free Reports */}
      <div className="space-y-4 mb-8">
        <h2 className="text-xl font-serif text-primary-800">Your Free Reports</h2>
        
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📄</span>
                  <h3 className="text-lg font-medium">{report.title}</h3>
                </div>
                <p className="text-primary-600 font-medium mb-2">{report.subtitle}</p>
                <p className="text-neutral-600 text-sm mb-4">{report.preview}</p>
              </div>
              <div className="flex items-center gap-2">
                <ShareButton 
                  title={`My ${report.title} on Kayal`}
                  text={report.preview}
                  url={`/report/${report.id}`}
                />
                <Link href={`/report/${report.id}`}>
                  <Button variant="ghost" size="sm">
                    Read Full
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Upsell Banner */}
      <Card className="mb-8 bg-gradient-to-br from-primary-900 to-primary-800 text-white">
        <div className="text-center">
          <h3 className="text-2xl font-serif mb-3">✨ Unlock The Full Picture</h3>
          <p className="text-white/90 mb-4">
            Get all 72 reports about yourself including love timeline, wealth windows, and career peaks
          </p>
          <Button variant="secondary" size="lg">
            Get All Access — $197
          </Button>
          <p className="text-sm text-white/70 mt-3">One-time payment · Lifetime access</p>
        </div>
      </Card>

      {/* Referral Section */}
      <Card>
        <h3 className="text-lg font-medium mb-3">Share and Get Free Reports</h3>
        <p className="text-sm text-neutral-600 mb-4">
          When friends unlock through your link, you both get a FREE report.
        </p>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 p-3 bg-neutral-50 border rounded-lg text-sm"
          />
          <Button onClick={copyLink} variant="outline">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="secondary">
            Share via WhatsApp
          </Button>
        </div>
      </Card>
    </div>
  )
}