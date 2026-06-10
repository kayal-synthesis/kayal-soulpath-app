'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Crown, Scroll, BookOpen, ChevronRight } from 'lucide-react'

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

export const OracleCard = ({ tool, onClick, onPurchase, size = 'lg' }: any) => {
  const config = sizeConfig[size]
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="h-full"
      onClick={onClick}
    >
      <Card className={`h-full ${config.card} bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 text-white border border-primary-700 hover:border-secondary-500 relative overflow-hidden`}>
        {/* Ancient scroll pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(212,175,55,0.1) 20px, rgba(212,175,55,0.1) 40px)'
          }} />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header with gold accents */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${config.icon} bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl text-primary-900 flex items-center justify-center`}>
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`${config.title} font-serif text-white`}>{tool.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <Scroll className="w-3 h-3 text-secondary-400" />
                  <span className="text-xs text-secondary-300">Ancient wisdom</span>
                </div>
              </div>
            </div>
            
            {tool.isBestSeller && (
              <Badge variant="secondary" className="bg-secondary-500 text-primary-900 border-secondary-400">
                👑 Sacred
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className={`${config.desc} text-white/80 mb-3 flex-1`}>
            {tool.shortDescription}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-primary-700">
            <span className={`${config.price} font-serif text-secondary-400`}>${tool.price}</span>
            <Button 
              size="xs" 
              className="bg-secondary-500 hover:bg-secondary-600 text-primary-900"
              onClick={(e) => { e.stopPropagation(); onPurchase?.(); }}
            >
              Enter Temple
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}