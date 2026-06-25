'use client'
import { ToolCard, BundleSelector } from '@/components/ToolCards'
import { timeKeeperTools } from '@/lib/constants/time-keeper-tools'
import type { ToolData } from '@/components/ToolCards'
import { useState, useEffect } from 'react'
import { Clock, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const tools: ToolData[] = timeKeeperTools.map(t => ({
  ...t,
  domain: 'time-keeper' as const,
}))

export default function EternalClockPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [view,           setView]           = useState<'browse' | 'bundle'>('browse')
  const [purchasedIds,   setPurchasedIds]   = useState<string[]>([])
  const [purchaseMap,    setPurchaseMap]    = useState<Record<string, any>>({})

  useEffect(() => {
    const loadPurchases = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: purchases } = await supabase
        .from('purchases')
        .select('tool_id, purchase_date, job_id, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
      if (purchases) {
        setPurchasedIds(purchases.map(p => p.tool_id))
        const map: Record<string, any> = {}
        purchases.forEach(p => { map[p.tool_id] = p })
        setPurchaseMap(map)
      }
    }
    loadPurchases()
  }, [])

  const handleAccess = (tool: ToolData) => {
    router.push(`/reading/${tool.id}`)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-3xl">⏳</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-teal-500" />
                  <span className="text-xs font-semibold text-teal-500 uppercase tracking-widest">Timekeeper's Vault</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Eternal Clock</h1>
                <p className="text-neutral-500 mt-1 text-sm max-w-xl">
                  Wake every morning knowing what the day is asking of you — five timescales of personalised forecasting across {tools.length} dedicated readings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setView('browse')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'browse' ? 'bg-teal-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                Browse All
              </button>
              <button onClick={() => setView('bundle')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'bundle' ? 'bg-teal-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                Bundle &amp; Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {view === 'bundle' ? (
          <BundleSelector tools={tools} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map(tool => (
              <ToolCard
                key={tool.id}
                tool={tool}
                state={purchasedIds.includes(tool.id) ? 'owned' : 'default'}
                ownedStatus={purchaseMap[tool.id] ? {
                  purchaseDate: purchaseMap[tool.id].purchase_date,
                  jobId:        purchaseMap[tool.id].job_id,
                } : undefined}
                onAccess={handleAccess}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}