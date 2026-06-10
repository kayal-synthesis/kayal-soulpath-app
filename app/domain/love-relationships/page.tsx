'use client'

import { ToolCard, BundleSelector } from '@/components/ToolCards'
import { loveTools } from '@/lib/constants/love-tools'
import type { ToolData } from '@/components/ToolCards'
import { useState } from 'react'
import { Heart, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Cast domain constants to ToolData shape
const tools: ToolData[] = loveTools.map(t => ({
  ...t,
  domain: 'love' as const,
}))

export default function LoveRelationshipsPage() {
  const router  = useRouter()
  const [view, setView] = useState<'browse' | 'bundle'>('browse')

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* Domain Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-3xl border border-rose-100">
                💞
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-semibold text-rose-500 uppercase tracking-widest">Heart's Destiny</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Love & Relationships</h1>
                <p className="text-neutral-500 mt-1 text-sm max-w-xl">
                  Find your soulmate, decode your patterns, heal what's broken, and understand the love you were designed for — across {tools.length} dedicated readings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('browse')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === 'browse'
                    ? 'bg-rose-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Browse All
              </button>
              <button
                onClick={() => setView('bundle')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === 'bundle'
                    ? 'bg-rose-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Bundle & Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {view === 'bundle' ? (
          <BundleSelector tools={tools} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map(tool => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
