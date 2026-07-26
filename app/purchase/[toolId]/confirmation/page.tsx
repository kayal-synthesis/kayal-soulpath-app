'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Clock, Zap, ChevronRight, Star, X } from 'lucide-react'
import { allTools, getToolById } from '@/lib/tools/all-tools-index'
import type { Tool } from '@/lib/tools/all-tools-index'

// Upsell map, toolId to recommended upsell tool id. Every id below verified
// against the real, current 113-tool catalog directly, not assumed. The
// previous version used pre-restructure ids (several with a stale "-os"
// suffix, plus a few, like full-soul-portrait, that never matched anything
// in the current catalog at all), so most of these mappings silently never
// fired.
const UPSELL_MAP: Record<string, string> = {
  'soulmate-arrival-window':    'soulmate-compatibility-verdict',
  'love-wound-reading':         'karmic-love-debt',
  'income-ceiling-breaker':     'complete-wealth-synthesis',
  'calling-decoder':            'complete-purpose-synthesis',
  'nine-year-cycle-reading':    'annual-destiny-forecast',
  'birthday-blueprint':         'nine-year-cycle-reading',
  'karmic-lessons-reading':     'complete-life-portrait',
  'complete-love-synthesis':    'complete-life-portrait',
  'complete-wealth-synthesis':  'complete-life-portrait',
  'complete-purpose-synthesis': 'complete-life-portrait',
  'complete-life-portrait':     'oracle-voice-unlimited',
  'daily-personal-oracle':      'monthly-cycle-navigator',
  'monthly-cycle-navigator':    'quarterly-destiny-pulse',
  'oracle-voice-session':       'oracle-deep-dive-session',
  'oracle-deep-dive-session':   'oracle-voice-unlimited',
}

// Star rating
function Stars({ rating = 4.9 }: { rating?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  )
}

// Upsell card
function UpsellCard({
  tool,
  onAccept,
  onDecline,
  accepting,
}: {
  tool: Tool
  onAccept: () => void
  onDecline: () => void
  accepting: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.6 }}
      className="bg-white rounded-2xl border border-amber-200 shadow-xl overflow-hidden max-w-lg w-full mx-auto"
    >
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-500" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-wider">
            One-Time Offer, This Session Only
          </span>
          <button
            onClick={onDecline}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Decline offer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-4 mb-5">
          <div className="text-4xl flex-shrink-0">{tool.emoji}</div>
          <div>
            <h3 className="font-bold text-neutral-900 text-lg leading-snug mb-1">
              {tool.name}
            </h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              {tool.shortDescription}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-neutral-100">
          <Stars />
          <span className="text-xs text-neutral-500 font-medium">
            Trusted by thousands of KAYAL members
          </span>
        </div>

        <ul className="space-y-2 mb-6">
          {tool.features.slice(0, 3).map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-700">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{typeof f === 'string' ? f : String(f)}</span>
            </li>
          ))}
        </ul>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5 flex items-center gap-3">
          <Zap className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-800">
              Add this now and save 20%, available only at checkout
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Full price after this page: <span className="line-through">${tool.price}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onAccept}
          disabled={accepting}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70"
        >
          {accepting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Adding to your order…
            </span>
          ) : (
            <>
              Yes, add {tool.name} for ${Math.round(tool.price * 0.8)}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>

        <button
          onClick={onDecline}
          className="w-full text-center text-xs text-neutral-400 hover:text-neutral-600 mt-3 transition-colors py-1"
        >
          No thanks, I don't need this right now
        </button>
      </div>
    </motion.div>
  )
}

// Main page
export default function PurchaseConfirmationPage() {
  const router = useRouter()
  const params = useParams()
  const toolId = params?.toolId as string

  const [tool,        setTool]        = useState<Tool | null>(null)
  const [upsellTool,  setUpsellTool]  = useState<Tool | null>(null)
  const [showUpsell,  setShowUpsell]  = useState(true)
  const [accepting,   setAccepting]   = useState(false)
  const [upsellAdded, setUpsellAdded] = useState(false)
  const [countdown,   setCountdown]   = useState(600)

  useEffect(() => {
    if (!toolId) return
    const t = getToolById(toolId)
    setTool(t ?? null)

    const upsellId = UPSELL_MAP[toolId]
    if (upsellId) {
      const u = getToolById(upsellId)
      setUpsellTool(u ?? null)
    } else {
      const fallback = allTools.find(t => t.isPopular && t.id !== toolId)
      setUpsellTool(fallback ?? null)
    }
  }, [toolId])

  useEffect(() => {
    if (countdown <= 0) return
    const interval = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(interval)
  }, [countdown])

  const formatTime = (s: number) => {
    const m   = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleAcceptUpsell = async () => {
    if (!upsellTool) return
    setAccepting(true)
    await new Promise(r => setTimeout(r, 800))
    router.push(`/purchase/${upsellTool.id}?discount=20&source=confirmation-upsell&from=${toolId}`)
  }

  const handleDeclineUpsell = () => setShowUpsell(false)

  if (!tool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-neutral-50 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Success confirmation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl border border-emerald-200 shadow-lg overflow-hidden"
        >
          <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="p-7 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
              className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-9 h-9 text-emerald-500" />
            </motion.div>

            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              Your reading is being prepared
            </h1>
            <p className="text-neutral-500 text-sm mb-5">
              {tool.emoji} <strong>{tool.name}</strong> has been confirmed. Your complete synthesis is loading.
            </p>

            <div className="flex items-center justify-center gap-2 bg-neutral-50 rounded-xl py-3 px-5 border border-neutral-100 mb-5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-neutral-700 font-medium">
                Estimated delivery in{' '}
                <span className="text-amber-600 font-bold font-mono">
                  {formatTime(countdown)}
                </span>
              </span>
            </div>

            <div className="text-left space-y-3">
              {[
                { step: '1', text: 'Your synthesis engine is loading your complete chart data' },
                { step: '2', text: 'The AI is generating your personalised reading right now'  },
                { step: '3', text: "You'll receive a notification the moment it's ready"       },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    {step}
                  </div>
                  <p className="text-sm text-neutral-600 pt-0.5">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Upsell */}
        <AnimatePresence>
          {showUpsell && upsellTool && !upsellAdded && (
            <UpsellCard
              tool={upsellTool}
              onAccept={handleAcceptUpsell}
              onDecline={handleDeclineUpsell}
              accepting={accepting}
            />
          )}
        </AnimatePresence>

        {/* Upsell added */}
        <AnimatePresence>
          {upsellAdded && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center"
            >
              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-800">
                {upsellTool?.name} added to your order at 20% off
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => router.push('/member/dashboard')}
            className="px-5 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => router.push('/member/dashboard')}
            className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors shadow-sm"
          >
            View All Readings
          </button>
        </div>

        <p className="text-center text-xs text-neutral-400">
          Questions? Email support@kayalsoulpath.com, we respond within 2 hours.
        </p>

      </div>
    </div>
  )
}
