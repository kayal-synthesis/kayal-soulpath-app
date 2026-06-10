'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, MessageCircle, Mail, Link2, Twitter, Facebook } from 'lucide-react'
import { toast } from 'sonner'

interface ShareButtonProps {
  title: string
  text: string
  url: string
  className?: string
}

export const ShareButton = ({ title, text, url, className }: ShareButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'text-green-600',
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`, '_blank'),
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'text-blue-400',
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank'),
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank'),
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'text-neutral-600',
      action: () => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`),
    },
    {
      name: 'Copy Link',
      icon: Link2,
      color: 'text-primary-600',
      action: async () => {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied!')
      },
    },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 hover:bg-neutral-100 rounded-full transition-colors ${className}`}
        aria-label="Share"
      >
        <Share2 className="w-5 h-5 text-neutral-600" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 z-50 bg-white rounded-lg shadow-xl p-3 min-w-[200px] border"
            >
              <div className="grid grid-cols-5 gap-1">
                {shareOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => {
                      option.action()
                      setIsOpen(false)
                    }}
                    className="p-2 hover:bg-neutral-50 rounded-lg transition-colors"
                    title={option.name}
                  >
                    <option.icon className={`w-4 h-4 ${option.color} mx-auto`} />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}