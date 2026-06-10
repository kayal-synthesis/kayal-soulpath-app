'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Headphones, Mic, Waves, ChevronRight } from 'lucide-react'

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

export const VoiceCard = ({ tool, onClick, onPurchase, size = 'md' }: any) => {
  const config = sizeConfig[size]
  
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="h-full"
      onClick={onClick}
    >
      <Card className={`h-full ${config.card} bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border-2 border-purple-200 hover:border-purple-400`}>
        {/* Sound wave animation */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <Waves className="w-full h-12 text-purple-500" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${config.icon} bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl text-white flex items-center justify-center`}>
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`${config.title} font-medium text-purple-900`}>{tool.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <Headphones className="w-3 h-3 text-purple-500" />
                  <span className="text-xs text-purple-600">Voice enabled</span>
                </div>
              </div>
            </div>
            
            {tool.isPopular && (
              <Badge variant="primary" className="bg-purple-100 text-purple-700">🎤 Live</Badge>
            )}
          </div>

          {/* Description */}
          <p className={`${config.desc} text-purple-700/80 mb-3 flex-1`}>
            {tool.shortDescription}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-purple-200">
            <span className={`${config.price} font-bold text-purple-600`}>${tool.price}</span>
            <Button 
              size="xs" 
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              onClick={(e) => { e.stopPropagation(); onPurchase?.(); }}
            >
              Listen
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}