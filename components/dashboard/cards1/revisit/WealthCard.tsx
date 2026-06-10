'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TrendingUp, Diamond, Crown, ChevronRight } from 'lucide-react'

const sizeConfig = {
  sm: {
    card: 'p-3',
    icon: 'w-8 h-8',
    title: 'text-sm',
    desc: 'text-xs line-clamp-2',
    price: 'text-base',
    button: 'h-7 px-2 text-xs',
  },
  md: {
    card: 'p-4',
    icon: 'w-10 h-10',
    title: 'text-base',
    desc: 'text-sm line-clamp-2',
    price: 'text-lg',
    button: 'h-8 px-3 text-sm',
  },
  lg: {
    card: 'p-5',
    icon: 'w-12 h-12',
    title: 'text-lg',
    desc: 'text-base line-clamp-3',
    price: 'text-xl',
    button: 'h-9 px-4 text-base',
  }
}

export const WealthCard = ({ tool, onClick, onPurchase, size = 'md' }: any) => {
  const config = sizeConfig[size]
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="h-full"
      onClick={onClick}
    >
      <Card className={`h-full ${config.card} bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 hover:border-amber-400 shadow-lg relative overflow-hidden`}>
        {/* Gold sparkles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-300 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-300 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header with gold styling */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${config.icon} bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl text-white flex items-center justify-center shadow-lg`}>
                <Diamond className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`${config.title} font-serif text-amber-900`}>{tool.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <Crown className="w-3 h-3 text-amber-600" />
                  <span className="text-xs text-amber-700">Wealth builder</span>
                </div>
              </div>
            </div>
            
            {tool.isBestSeller && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                👑 Best Seller
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className={`${config.desc} text-amber-800/70 mb-3 flex-1`}>
            {tool.shortDescription}
          </p>

          {/* Footer with gold accents */}
          <div className="flex items-center justify-between pt-3 border-t border-amber-200">
            <span className={`${config.price} font-serif font-bold text-amber-700`}>${tool.price}</span>
            <Button 
              size="xs" 
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0"
              onClick={(e) => { e.stopPropagation(); onPurchase?.(); }}
            >
              Invest
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}