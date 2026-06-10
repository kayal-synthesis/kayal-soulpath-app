'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Gift, Copy, Check, X, Percent, Calendar, Sparkles, Tag } from 'lucide-react'
import { toast } from 'sonner'

interface CouponBannerProps {
  banner: {
    id: string
    type: 'hero' | 'sidebar' | 'subtle' | 'compact' | 'info'
    title: string
    description: string
    code?: string
    discount?: number
    cta: string
    ctaLink: string
    bgColor: string
    textColor: string
    borderColor?: string
    priority: number
  }
  onDismiss?: (id: string) => void
  onApply?: (code: string) => void
}

export function CouponBanner({ banner, onDismiss, onApply }: CouponBannerProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  
  const handleCopy = () => {
    if (!banner.code) return
    navigator.clipboard.writeText(banner.code)
    setCopied(true)
    toast.success('Code copied!')
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleDismiss = () => {
    setDismissed(true)
    if (onDismiss) onDismiss(banner.id)
  }
  
  const handleClick = () => {
    if (banner.code && onApply) {
      onApply(banner.code)
    }
    router.push(banner.ctaLink)
  }
  
  if (dismissed) return null
  
  // Hero Banner (main dashboard, full width)
  if (banner.type === 'hero') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <Card className={`${banner.bgColor} border-0 shadow-lg overflow-hidden relative`}>
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 hover:bg-black/10 rounded-full transition z-10"
          >
            <X className={`w-4 h-4 ${banner.textColor}`} />
          </button>
          
          <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full bg-white/20 flex items-center justify-center`}>
                <Gift className={`w-6 h-6 ${banner.textColor}`} />
              </div>
              <div>
                <h3 className={`text-xl font-semibold ${banner.textColor}`}>{banner.title}</h3>
                <p className={`${banner.textColor} opacity-90 mt-1`}>{banner.description}</p>
                {banner.code && (
                  <div className="mt-3 flex items-center gap-2">
                    <Badge className="bg-white/20 text-white border-0 px-3 py-1">
                      <Tag className="w-3 h-3 mr-1" />
                      {banner.code}
                    </Badge>
                    <button
                      onClick={handleCopy}
                      className="p-1 hover:bg-white/20 rounded-lg transition"
                    >
                      {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <Button
              onClick={handleClick}
              className="bg-white text-primary-700 hover:bg-primary-50 whitespace-nowrap"
            >
              {banner.cta}
            </Button>
          </div>
        </Card>
      </motion.div>
    )
  }
  
  // Sidebar Banner (right column)
  if (banner.type === 'sidebar') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
      >
        <Card className={`${banner.bgColor} border-0 shadow-lg overflow-hidden relative`}>
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded-full transition"
          >
            <X className={`w-3 h-3 ${banner.textColor}`} />
          </button>
          
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full bg-white/20 flex items-center justify-center`}>
                <Percent className={`w-4 h-4 ${banner.textColor}`} />
              </div>
              <h4 className={`font-medium ${banner.textColor}`}>{banner.title}</h4>
            </div>
            
            <p className={`text-sm ${banner.textColor} opacity-90 mb-4`}>{banner.description}</p>
            
            {banner.code && (
              <div className="mb-3 flex items-center gap-2">
                <code className="bg-white/20 px-2 py-1 rounded text-sm font-mono">
                  {banner.code}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
            
            <Button
              onClick={handleClick}
              size="sm"
              className="w-full bg-white text-primary-700 hover:bg-primary-50"
            >
              {banner.cta}
            </Button>
          </div>
        </Card>
      </motion.div>
    )
  }
  
  // Subtle Banner (member dashboard)
  if (banner.type === 'subtle') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`mb-4 p-4 rounded-lg ${banner.bgColor} border ${banner.borderColor} relative`}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-black/5 rounded-full"
        >
          <X className="w-3 h-3" />
        </button>
        
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-medium text-purple-900">{banner.title}</p>
              <p className="text-sm text-purple-700 mt-1">{banner.description}</p>
              {banner.code && (
                <div className="mt-2 flex items-center gap-2">
                  <code className="bg-purple-100 px-2 py-1 rounded text-xs">
                    {banner.code}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleClick} className="ml-4">
            {banner.cta}
          </Button>
        </div>
      </motion.div>
    )
  }
  
  // Compact Banner (small)
  if (banner.type === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`p-3 rounded-lg ${banner.bgColor} flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${banner.textColor}`} />
          <span className={`text-sm font-medium ${banner.textColor}`}>{banner.title}</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleClick}>
          {banner.cta}
        </Button>
      </motion.div>
    )
  }
  
  // Info Banner (referral dashboard)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`p-4 rounded-lg ${banner.bgColor} border ${banner.borderColor} mb-4`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-blue-900">{banner.title}</h4>
          <p className="text-sm text-blue-700 mt-1">{banner.description}</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleClick}>
          {banner.cta}
        </Button>
      </div>
    </motion.div>
  )
}