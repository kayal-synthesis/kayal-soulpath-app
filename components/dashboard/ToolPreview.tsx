'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Eye, Lock, Sparkles, Clock, Star } from 'lucide-react'

interface ToolPreviewProps {
  tool: {
    id: string
    name: string
    description: string
    price: number
    isPopular?: boolean
    isNew?: boolean
    isBestSeller?: boolean
    category: string
    estimatedReadTime?: number
  }
  onView: () => void
  onPurchase: () => void
  variant?: 'default' | 'compact' | 'featured'
}

export const ToolPreview = ({ 
  tool, 
  onView, 
  onPurchase,
  variant = 'default' 
}: ToolPreviewProps) => {
  
  // Compact variant for sidebars
  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-neutral-100 hover:shadow-sm transition cursor-pointer" onClick={onView}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{tool.name.split(' ')[0]}</span>
          <div>
            <h4 className="font-medium text-sm">{tool.name}</h4>
            <p className="text-xs text-neutral-500 line-clamp-1">{tool.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tool.isPopular && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
          <span className="text-sm font-serif text-primary-600">${tool.price}</span>
        </div>
      </div>
    )
  }

  // Featured variant for promotions
  if (variant === 'featured') {
    return (
      <Card className="p-5 bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-100 group hover:shadow-lg transition cursor-pointer" onClick={onView}>
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{tool.name.split(' ')[0]}</span>
          <Badge variant="secondary" size="sm">Featured</Badge>
        </div>
        
        <h3 className="text-lg font-serif mb-2">{tool.name}</h3>
        <p className="text-sm text-neutral-600 mb-4">{tool.description}</p>
        
        {tool.estimatedReadTime && (
          <div className="flex items-center gap-1 text-xs text-neutral-500 mb-3">
            <Clock className="w-3 h-3" />
            <span>{tool.estimatedReadTime} min read</span>
          </div>
        )}
        
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-primary-100">
          <span className="text-xl font-serif text-primary-600">${tool.price}</span>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); onPurchase(); }}>
            <Lock className="w-3 h-3 mr-1" />
            Unlock Now
          </Button>
        </div>
      </Card>
    )
  }

  // Default variant
  return (
    <Card className="p-4 hover:shadow-md transition-all group cursor-pointer" onClick={onView}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{tool.name.split(' ')[0]}</span>
        <div className="flex gap-1">
          {tool.isBestSeller && (
            <Badge variant="secondary" size="sm">Best Seller</Badge>
          )}
          {tool.isPopular && (
            <Badge variant="primary" size="sm">Popular</Badge>
          )}
          {tool.isNew && (
            <Badge variant="secondary" size="sm">New</Badge>
          )}
        </div>
      </div>
      
      <h3 className="font-medium mb-2 line-clamp-1">{tool.name}</h3>
      <p className="text-sm text-neutral-600 mb-3 line-clamp-2">{tool.description}</p>
      
      {tool.estimatedReadTime && (
        <div className="flex items-center gap-1 text-xs text-neutral-400 mb-3">
          <Clock className="w-3 h-3" />
          <span>{tool.estimatedReadTime} min read</span>
        </div>
      )}
      
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-neutral-100">
        <span className="text-lg font-serif text-primary-600">${tool.price}</span>
        <div className="flex gap-2">
          <Button 
            size="xs" 
            variant="ghost" 
            onClick={(e) => { e.stopPropagation(); onView(); }}
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          <Button 
            size="xs" 
            onClick={(e) => { e.stopPropagation(); onPurchase(); }}
          >
            <Lock className="w-3 h-3 mr-1" />
            Unlock
          </Button>
        </div>
      </div>
    </Card>
  )
}