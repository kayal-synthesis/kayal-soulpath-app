'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Briefcase, TrendingUp, Clock, ChevronRight } from 'lucide-react'

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

export const CareerCard = ({ tool, onClick, onPurchase, size = 'md' }: any) => {
  const config = sizeConfig[size]
  
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="h-full"
      onClick={onClick}
    >
      <Card className={`h-full ${config.card} bg-white border-2 border-blue-100 hover:border-blue-300 shadow-sm hover:shadow-md transition-all`}>
        <div className="flex flex-col h-full">
          {/* Header with professional styling */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${config.icon} bg-blue-600 rounded-lg text-white flex items-center justify-center`}>
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`${config.title} font-semibold text-gray-800`}>{tool.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                  <span className="text-xs text-blue-600">Career growth</span>
                </div>
              </div>
            </div>
            
            {tool.isPopular && (
              <Badge variant="primary" className="bg-blue-100 text-blue-700">📈 Top</Badge>
            )}
          </div>

          {/* Description */}
          <p className={`${config.desc} text-gray-600 mb-3 flex-1`}>
            {tool.shortDescription}
          </p>

          {/* Meta */}
          {tool.estimatedReadTime && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
              <Clock className="w-3 h-3" />
              <span>{tool.estimatedReadTime} min</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className={`${config.price} font-bold text-blue-600`}>${tool.price}</span>
            <Button 
              size="xs" 
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={(e) => { e.stopPropagation(); onPurchase?.(); }}
            >
              Advance
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}