'use client'

import { motion } from 'framer-motion'
import { Check, Camera, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PathCardProps {
  type: 'basic' | 'hand' | 'face' | 'both'
  title: string
  description: string
  features: string[]
  price?: number
  savings?: number
  onSelect: () => void
  isSelected?: boolean
  disabled?: boolean
  className?: string
}

const icons = {
  basic: '📖',
  hand: '✋',
  face: '👤',
  both: '👁️'
}

const gradients = {
  basic: 'from-neutral-50 to-neutral-100',
  hand: 'from-primary-50 to-primary-100',
  face: 'from-secondary-50 to-secondary-100',
  both: 'from-gradient-start to-gradient-end'
}

export const PathCard = ({
  type,
  title,
  description,
  features,
  price,
  savings,
  onSelect,
  isSelected = false,
  disabled = false,
  className = ''
}: PathCardProps) => {
  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.02, y: -4 } : {}}
      className={`relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden
        ${isSelected ? 'border-primary-600 shadow-lg' : 'border-transparent hover:border-primary-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}`}
      onClick={!disabled ? onSelect : undefined}
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[type]} opacity-50`} />

      {/* Content */}
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-3xl mb-2 block">{icons[type]}</span>
            <h3 className="text-xl font-serif font-semibold">{title}</h3>
          </div>
          
          {isSelected && (
            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-neutral-600 text-sm mb-4">{description}</p>

        {/* Features */}
        <ul className="space-y-2 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className="text-primary-600 mt-0.5">•</span>
              <span className="text-neutral-700">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Price */}
        {price !== undefined && (
          <div className="mb-4">
            <span className="text-2xl font-serif font-semibold">${price}</span>
            {savings && (
              <span className="ml-2 text-xs bg-success/10 text-success px-2 py-1 rounded-full">
                Save ${savings}
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <Button
          variant={isSelected ? 'primary' : 'outline'}
          fullWidth
          disabled={disabled}
          onClick={onSelect}
          className="relative z-10"
        >
          {type === 'basic' ? 'Continue with Basic →' : 
           type === 'both' ? 'Add Both Photos' : 
           `Add ${type === 'hand' ? 'Hand' : 'Face'} Photo`}
        </Button>

        {/* Camera Icons for both type */}
        {type === 'both' && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="w-8 h-8 bg-white rounded-full shadow flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-xs text-neutral-500">+</span>
            <div className="w-8 h-8 bg-white rounded-full shadow flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>

      {/* Selected Border Animation */}
      {isSelected && (
        <motion.div
          layoutId="selected-border"
          className="absolute inset-0 border-2 border-primary-600 rounded-xl pointer-events-none"
          initial={false}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </motion.div>
  )
}