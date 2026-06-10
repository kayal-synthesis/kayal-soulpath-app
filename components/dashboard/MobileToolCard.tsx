'use client'

import { motion } from 'framer-motion'
import { ChevronRight, Camera } from 'lucide-react'

interface MobileToolCardProps {
  tool: any
  onClick: () => void
}

export const MobileToolCard = ({ tool, onClick }: MobileToolCardProps) => {
  const requiresImage = !!tool.requiresImage

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-neutral-100 active:bg-neutral-50"
    >
      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-xl">{tool.emoji}</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm truncate">{tool.name}</h4>
          {tool.isPopular && (
            <span className="text-xs text-amber-600">🔥</span>
          )}
        </div>
        <p className="text-xs text-neutral-500 truncate">{tool.shortDescription}</p>
        {requiresImage && (
          <span className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
            <Camera className="w-3 h-3" />
            Photo needed
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-serif text-primary-600">${tool.price}</span>
        <ChevronRight className="w-4 h-4 text-neutral-400" />
      </div>
    </motion.div>
  )
}