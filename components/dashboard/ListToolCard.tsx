'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  Camera, 
  ChevronRight, 
  Clock, 
  Eye, 
  Download,
  Star,
  Sparkles
} from 'lucide-react'

interface ListToolCardProps {
  tool: any
  onClick: () => void
  onPurchase?: () => void
  variant?: 'default' | 'purchase' | 'preview'
}

export const ListToolCard = ({ 
  tool, 
  onClick, 
  onPurchase,
  variant = 'default' 
}: ListToolCardProps) => {
  const requiresImage = !!tool.requiresImage

  return (
    <motion.div
      whileHover={{ x: 4 }}
      onClick={onClick}
      className="flex items-center justify-between p-3 sm:p-4 bg-white rounded-lg hover:bg-neutral-50 transition-all cursor-pointer border border-neutral-100 group"
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        {/* Icon */}
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <span className="text-lg sm:text-xl">{tool.emoji}</span>
        </div>
        
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm sm:text-base truncate">{tool.name}</h3>
            
            {/* Badges */}
            <div className="flex gap-1">
              {tool.isBestSeller && (
                <Badge variant="secondary" size="sm" className="px-1.5 py-0.5 text-[10px]">
                  👑
                </Badge>
              )}
              {tool.isPopular && (
                <Badge variant="primary" size="sm" className="px-1.5 py-0.5 text-[10px]">
                  🔥
                </Badge>
              )}
              {tool.isNew && (
                <Badge variant="secondary" size="sm" className="px-1.5 py-0.5 text-[10px]">
                  New
                </Badge>
              )}
            </div>
          </div>
          
          <p className="text-xs sm:text-sm text-neutral-500 truncate mt-0.5">
            {tool.shortDescription}
          </p>
          
          {/* Meta info */}
          <div className="flex items-center gap-3 mt-1">
            {tool.estimatedReadTime && (
              <span className="text-[10px] sm:text-xs text-neutral-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {tool.estimatedReadTime} min
              </span>
            )}
            {requiresImage && (
              <span className="text-[10px] sm:text-xs text-amber-600 flex items-center gap-1">
                <Camera className="w-3 h-3" />
                Photo required
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Price and action */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        <span className="text-base sm:text-lg font-serif text-primary-600">
          ${tool.price}
        </span>
        
        {variant === 'purchase' ? (
          <Button 
            size="xs" 
            className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onPurchase?.()
            }}
          >
            Buy
            <Download className="w-3 h-3 ml-1 sm:ml-2" />
          </Button>
        ) : variant === 'preview' ? (
          <Button 
            size="xs" 
            variant="outline"
            className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
          >
            Preview
            <Eye className="w-3 h-3 ml-1 sm:ml-2" />
          </Button>
        ) : (
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400 group-hover:text-primary-600 transition-colors" />
        )}
      </div>
    </motion.div>
  )
}