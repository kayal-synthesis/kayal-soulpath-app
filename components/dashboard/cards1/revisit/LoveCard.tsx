'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Heart, Sparkles, Clock, Camera, ChevronRight } from 'lucide-react'

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

export const LoveCard = ({ tool, onClick, onPurchase, size = 'md' }: any) => {
  const config = sizeConfig[size]
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="h-full"
      onClick={onClick}
    >
      <Card className={`h-full ${config.card} bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-100 hover:border-rose-300 transition-all group relative overflow-hidden`}>
        {/* Floating hearts animation */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-rose-200/30"
              initial={{ y: '100%', x: Math.random() * 100 + '%', opacity: 0 }}
              animate={{ y: '-100%', opacity: [0, 0.5, 0] }}
              transition={{ duration: 3 + i, repeat: Infinity, delay: i }}
            >
              <Heart className="w-6 h-6" fill="currentColor" />
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${config.icon} bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl text-white flex items-center justify-center shadow-lg`}>
                <span className="text-lg">{tool.emoji}</span>
              </div>
              <div>
                <h3 className={`${config.title} font-serif text-rose-800`}>{tool.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3 text-rose-400" />
                  <span className="text-xs text-rose-600">Love reading</span>
                </div>
              </div>
            </div>
            
            {tool.isPopular && (
              <Badge variant="secondary" className="bg-rose-100 text-rose-700 border-rose-200">
                ❤️ Popular
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className={`${config.desc} text-rose-700/80 mb-3 flex-1`}>
            {tool.shortDescription}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-rose-200">
            <span className={`${config.price} font-serif text-rose-600`}>${tool.price}</span>
            <Button 
              size="xs" 
              className="bg-rose-500 hover:bg-rose-600 text-white border-0"
              onClick={(e) => { e.stopPropagation(); onPurchase?.(); }}
            >
              Open Heart
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}