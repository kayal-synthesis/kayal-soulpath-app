'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Star, 
  Compass, 
  Infinity, 
  Clock, 
  ChevronRight,
  Sparkles,
  Eye
} from 'lucide-react'

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

export const LifePathCard = ({ tool, onClick, onPurchase, size = 'md' }: any) => {
  const config = sizeConfig[size]
  
  // Calculate destiny number from name or use mock
  const destinyNumber = tool.name.length % 9 + 1 || 7
  
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full"
      onClick={onClick}
    >
      <Card className={`h-full ${config.card} bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 text-white border border-primary-700 hover:border-secondary-500 relative overflow-hidden group`}>
        {/* Cosmic background effect */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(212,175,55,0.2) 0%, transparent 50%)',
          }} />
          {/* Stars */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-white rounded-full"
              style={{
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 3 + 1 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2 + i,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            />
          ))}
        </div>

        {/* Destiny number badge - floating */}
        <motion.div
          className="absolute -right-4 -top-4 w-16 h-16 bg-secondary-500/20 rounded-full blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
          }}
        />
        
        <div className="relative z-10 flex flex-col h-full">
          {/* Header with destiny number */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${config.icon} bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl text-primary-900 flex items-center justify-center shadow-lg relative overflow-hidden`}>
                <span className="relative z-10 text-lg">{tool.emoji}</span>
                <motion.div
                  className="absolute inset-0 bg-white/30"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>
              <div>
                <h3 className={`${config.title} font-serif text-white`}>{tool.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-secondary-400 fill-secondary-400" />
                    <span className="text-xs text-secondary-300">Life Path</span>
                  </div>
                  <div className="w-1 h-1 bg-secondary-500/50 rounded-full" />
                  <div className="flex items-center gap-1">
                    <Infinity className="w-3 h-3 text-secondary-400" />
                    <span className="text-xs text-secondary-300">Destiny {destinyNumber}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {tool.isBestSeller && (
              <Badge variant="secondary" className="bg-secondary-500 text-primary-900 border-secondary-400 font-semibold">
                ⭐ Destiny
              </Badge>
            )}
          </div>

          {/* Description with philosophical tone */}
          <div className="flex-1 mb-3">
            <p className={`${config.desc} text-white/80 italic`}>
              "{tool.shortDescription}"
            </p>
            
            {/* Philosophical quote based on destiny number */}
            {size !== 'sm' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] text-secondary-300/60 mt-2 font-light"
              >
                {destinyNumber === 1 && "The leader's path - forge your own way"}
                {destinyNumber === 2 && "The diplomat's journey - find harmony"}
                {destinyNumber === 3 && "The creator's quest - express your truth"}
                {destinyNumber === 4 && "The builder's foundation - create lasting structures"}
                {destinyNumber === 5 && "The explorer's adventure - embrace freedom"}
                {destinyNumber === 6 && "The nurturer's calling - serve with love"}
                {destinyNumber === 7 && "The seeker's wisdom - look within"}
                {destinyNumber === 8 && "The achiever's summit - master the material"}
                {destinyNumber === 9 && "The humanitarian's mission - serve humanity"}
              </motion.p>
            )}
          </div>

          {/* Life path progress indicator */}
          {size !== 'sm' && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
                <span>Current Chapter</span>
                <span>Completion</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-secondary-400 to-secondary-500"
                  initial={{ width: '0%' }}
                  animate={{ width: '65%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Footer with destiny-themed actions */}
          <div className="flex items-center justify-between pt-3 border-t border-primary-700">
            <div>
              <span className={`${config.price} font-serif text-secondary-400`}>${tool.price}</span>
              {tool.estimatedReadTime && (
                <div className="flex items-center gap-1 text-[10px] text-white/40 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{tool.estimatedReadTime} min</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="xs" 
                variant="ghost" 
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={(e) => { e.stopPropagation(); onClick(); }}
              >
                <Eye className="w-3 h-3 mr-1" />
                {size === 'sm' ? '' : 'Preview'}
              </Button>
              <Button 
                size="xs" 
                className="bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-primary-900"
                onClick={(e) => { e.stopPropagation(); onPurchase?.(); }}
              >
                {size === 'sm' ? 'Open' : 'Discover'}
                <Compass className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>

          {/* Destiny badge - floating for larger cards */}
          {size === 'lg' && (
            <motion.div
              className="absolute bottom-2 right-2 text-[8px] text-secondary-500/30 font-mono"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            >
              ∞ {destinyNumber}
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}