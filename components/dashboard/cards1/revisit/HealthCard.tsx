'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Activity, Zap, Leaf, ChevronRight } from 'lucide-react'

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

export const HealthCard = ({ tool, onClick, onPurchase, size = 'md' }: any) => {
  const config = sizeConfig[size]
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="h-full"
      onClick={onClick}
    >
      <Card className={`h-full ${config.card} bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 hover:border-green-400`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${config.icon} bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white flex items-center justify-center`}>
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`${config.title} font-semibold text-green-800`}>{tool.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <Leaf className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-700">Wellness</span>
                </div>
              </div>
            </div>
            
            {tool.isPopular && (
              <Badge variant="primary" className="bg-green-100 text-green-700">🌿 Popular</Badge>
            )}
          </div>

          {/* Description */}
          <p className={`${config.desc} text-green-700/80 mb-3 flex-1`}>
            {tool.shortDescription}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-green-200">
            <span className={`${config.price} font-bold text-green-600`}>${tool.price}</span>
            <Button 
              size="xs" 
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={(e) => { e.stopPropagation(); onPurchase?.(); }}
            >
              Heal
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}