'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Tool {
  id: string
  name: string
  emoji: string
  description: string
  price: number
  category: string
  match: number
}

interface AutoSuggestWidgetProps {
  tools?: Tool[]
}

export const AutoSuggestWidget = ({ tools: propTools }: AutoSuggestWidgetProps) => {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const defaultTools: Tool[] = [
    {
      id: 'the-seer',
      name: 'THE SEER',
      emoji: '🔮',
      description: 'Complete life analysis based on your profile',
      price: 97,
      category: 'universal',
      match: 98
    },
    {
      id: 'the-love-map',
      name: 'THE LOVE MAP',
      emoji: '💞',
      description: 'Perfect for your relationship questions',
      price: 47,
      category: 'love',
      match: 94
    },
    {
      id: 'the-wealth-code',
      name: 'THE WEALTH CODE',
      emoji: '💰',
      description: 'Aligns with your financial goals',
      price: 47,
      category: 'wealth',
      match: 89
    }
  ]

  const tools = propTools || defaultTools

  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tools.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying, tools.length])

  const handlePrevious = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev - 1 + tools.length) % tools.length)
  }

  const handleNext = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev + 1) % tools.length)
  }

  const currentTool = tools[currentIndex]

  return (
    <Card className="p-4 bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-600" />
          Recommended for You
        </h3>
        <Badge variant="primary" size="sm">Based on your profile</Badge>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="relative"
        >
          <div className="bg-white rounded-lg p-3 border border-primary-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center text-xl">
                {currentTool.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{currentTool.name}</h4>
                  <Badge variant="primary" size="sm" className="text-[10px]">
                    {currentTool.match}% match
                  </Badge>
                </div>
                <p className="text-xs text-neutral-500 mb-2">{currentTool.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-serif text-primary-600">${currentTool.price}</span>
                  <Button size="xs" onClick={() => router.push(`/purchase/${currentTool.id}`)}>
                    View
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1">
              {tools.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setIsAutoPlaying(false); setCurrentIndex(i); }}
                  className={`h-1 rounded-full transition-all ${
                    i === currentIndex ? 'w-4 bg-primary-600' : 'w-2 bg-neutral-300'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handlePrevious} className="p-1 hover:bg-primary-50 rounded">
                <ChevronLeft className="w-3 h-3 text-primary-600" />
              </button>
              <button onClick={handleNext} className="p-1 hover:bg-primary-50 rounded">
                <ChevronRight className="w-3 h-3 text-primary-600" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Card>
  )
}