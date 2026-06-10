'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Gift, Sparkles, Tag } from 'lucide-react'

interface CouponBadgeProps {
  text: string
  color: string
  toolId: string
  onClick?: () => void
}

export function CouponBadge({ text, color, toolId, onClick }: CouponBadgeProps) {
  const getIcon = () => {
    if (text.includes('🎁')) return Gift
    if (text.includes('🌿')) return Sparkles
    return Tag
  }
  
  const Icon = getIcon()
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className="absolute -top-2 -right-2 z-10 cursor-pointer"
      onClick={onClick}
    >
      <Badge className={`${color} px-3 py-1 shadow-lg flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {text}
      </Badge>
    </motion.div>
  )
}