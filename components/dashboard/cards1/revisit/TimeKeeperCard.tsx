'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Clock, Timer, Calendar, ChevronRight } from 'lucide-react'

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

export const TimeKeeperCard = ({ tool, onClick, onPurchase, size = 'md' }: any) => {
  const config = sizeConfig[size]
  
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="h-full"
      onClick={onClick}
    >
      <Card className={`h-full ${config.card} bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 hover:border-indigo-400`}>
        {/* Clock face pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            background: 'radial-gradient(circle at 30% 50%, rgba(79,70,229,0.1) 0%, transparent 50%)'
          }} />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${config.icon} bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl text-white flex items-center justify-center`}>
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`${config.title} font-mono font-semibold text-indigo-900`}>{tool.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <Timer className="w-3 h-3 text-indigo-500" />
                  <span className="text-xs text-indigo-600">Precision timing</span>
                </div>
              </div>
            </div>
            
            {tool.isNew && (
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">⌛ New</Badge>
            )}
          </div>

          {/* Description */}
          <p className={`${config.desc} text-indigo-700/80 mb-3 flex-1`}>
            {tool.shortDescription}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-indigo-200">
            <span className={`${config.price} font-mono font-bold text-indigo-600`}>${tool.price}</span>
            <Button 
              size="xs" 
              variant="outline"
              className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
              onClick={(e) => { e.stopPropagation(); onPurchase?.(); }}
            >
              Schedule
              <Calendar className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}