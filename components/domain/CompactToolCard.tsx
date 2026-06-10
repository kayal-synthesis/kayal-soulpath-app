'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

// Simple Card component (inline to avoid import issues)
const Card = ({ children, className = '', onClick }: any) => (
  <div 
    className={`bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
)

// Simple Button component
const Button = ({ children, variant = 'primary', size = 'md', className = '', onClick }: any) => {
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-secondary-500 text-white hover:bg-secondary-600',
    outline: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50',
    ghost: 'text-neutral-600 hover:bg-neutral-100'
  }
  
  const sizes = {
    xs: 'px-2 py-1 text-xs rounded',
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-lg',
    lg: 'px-6 py-3 text-lg rounded-lg'
  }
  
  return (
    <button
      className={`${variants[variant]} ${sizes[size]} font-medium transition-all ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// Simple Badge component
const Badge = ({ children, variant = 'default', size = 'sm', className = '' }: any) => {
  const variants = {
    default: 'bg-neutral-100 text-neutral-700',
    primary: 'bg-primary-100 text-primary-700',
    secondary: 'bg-secondary-100 text-secondary-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700'
  }
  
  const sizes = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
    lg: 'px-2.5 py-1.5 text-sm'
  }
  
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  )
}

// Simple Share Button
const ShareButton = ({ title, text, url }: any) => {
  const [showOptions, setShowOptions] = useState(false)
  
  const shareOptions = [
    { name: 'Copy', action: () => navigator.clipboard.writeText(url) },
    { name: 'Email', action: () => window.location.href = `mailto:?subject=${title}&body=${text}` },
  ]
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="p-1.5 hover:bg-neutral-100 rounded-full transition"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>
      
      {showOptions && (
        <div className="absolute bottom-full mb-2 right-0 bg-white shadow-lg rounded-lg p-1 min-w-[100px] border">
          {shareOptions.map((opt, i) => (
            <button
              key={i}
              onClick={() => {
                opt.action()
                setShowOptions(false)
              }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-100 rounded"
            >
              {opt.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Icons as simple SVGs
const EyeIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const LockIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth={2} />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth={2} />
  </svg>
)

const CameraIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <circle cx="12" cy="13" r="3" strokeWidth={2} />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth={2} />
    <polyline points="12 6 12 12 16 14" strokeWidth={2} />
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z" />
  </svg>
)

const HeartIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)

const BriefcaseIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" strokeWidth={2} />
    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" strokeWidth={2} />
  </svg>
)

const TrendingUpIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="23 6 13.5 15.5 8 10 1 17" strokeWidth={2} />
    <polyline points="17 6 23 6 23 12" strokeWidth={2} />
  </svg>
)

const MoonIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
)

const ZapIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeWidth={2} />
  </svg>
)

const ActivityIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeWidth={2} />
  </svg>
)

const CrownIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M2 4l3 12h14l3-12-6 4-4-4-4 4-6-4z" strokeWidth={2} />
  </svg>
)

const HeadphonesIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" strokeWidth={2} />
    <rect x="3" y="18" width="6" height="5" rx="2" strokeWidth={2} />
    <rect x="15" y="18" width="6" height="5" rx="2" strokeWidth={2} />
  </svg>
)

// Map of category icons
const getCategoryIcon = (category: string, className: string = "w-3.5 h-3.5") => {
  switch(category) {
    case 'love': return <HeartIcon />
    case 'career': return <BriefcaseIcon />
    case 'wealth': return <TrendingUpIcon />
    case 'spiritual': return <MoonIcon />
    case 'health': return <ZapIcon />
    case 'life-path': return <SparklesIcon />
    case 'oracle-temple': return <CrownIcon />
    case 'time-keeper': return <ClockIcon />
    case 'daily-oracle-agency': return <HeadphonesIcon />
    default: return <SparklesIcon />
  }
}

// Category colors
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    love: 'bg-red-50 text-red-600 border-red-100',
    career: 'bg-blue-50 text-blue-600 border-blue-100',
    wealth: 'bg-green-50 text-green-600 border-green-100',
    spiritual: 'bg-purple-50 text-purple-600 border-purple-100',
    health: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    'life-path': 'bg-primary-50 text-primary-600 border-primary-100',
    'oracle-temple': 'bg-primary-50 text-primary-600 border-primary-100',
    'time-keeper': 'bg-indigo-50 text-indigo-600 border-indigo-100',
    'daily-oracle-agency': 'bg-purple-50 text-purple-600 border-purple-100'
  }
  return colors[category] || 'bg-neutral-50 text-neutral-600 border-neutral-200'
}

interface CompactToolCardProps {
  tool: {
    id: string
    name: string
    emoji?: string
    shortDescription: string
    price: number
    isPopular?: boolean
    isNew?: boolean
    isBestSeller?: boolean
    category?: string
    estimatedReadTime?: number
    requiresImage?: boolean
  }
  onClick: () => void
  onPurchase?: () => void
  variant?: 'default' | 'compact' | 'minimal'
}

export const CompactToolCard = ({ 
  tool, 
  onClick, 
  onPurchase,
  variant = 'default' 
}: CompactToolCardProps) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const category = tool.category || 'universal'
  const colorClass = getCategoryColor(category)

  // Compact variant - smallest footprint
  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="h-full"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Card className="h-full p-2 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden border hover:border-primary-200">
          <div className="relative z-10 flex flex-col h-full">
            {/* Top row - Icon and badges */}
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-md ${colorClass} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  {tool.emoji ? (
                    <span className="text-xs">{tool.emoji}</span>
                  ) : (
                    getCategoryIcon(category)
                  )}
                </div>
                <h3 className="font-medium text-xs line-clamp-1">{tool.name}</h3>
              </div>
              
              {/* Badges - Minimal */}
              <div className="flex gap-0.5">
                {tool.isBestSeller && (
                  <span className="text-[8px]">👑</span>
                )}
                {tool.isPopular && (
                  <span className="text-[8px]">🔥</span>
                )}
              </div>
            </div>

            {/* Description - 1 line only */}
            <p className="text-[9px] text-neutral-500 line-clamp-1 mb-1.5">
              {tool.shortDescription}
            </p>

            {/* Meta row */}
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-serif text-primary-600">${tool.price}</span>
                {tool.estimatedReadTime && (
                  <span className="text-[7px] text-neutral-400 flex items-center gap-0.5">
                    <ClockIcon />
                    {tool.estimatedReadTime}m
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-0.5">
                {tool.requiresImage && (
                  <CameraIcon />
                )}
                <button 
                  className="p-0.5 hover:bg-neutral-100 rounded"
                  onClick={(e) => { e.stopPropagation(); onClick(); }}
                >
                  <EyeIcon />
                </button>
                <button 
                  className="p-0.5 bg-primary-600 text-white rounded hover:bg-primary-700"
                  onClick={(e) => { e.stopPropagation(); onPurchase?.(); }}
                >
                  <LockIcon />
                </button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Minimal variant - even smaller (for sidebars)
  if (variant === 'minimal') {
    return (
      <motion.div
        whileHover={{ x: 2 }}
        className="cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center justify-between p-1.5 hover:bg-neutral-50 rounded-lg transition">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-5 h-5 rounded-md ${colorClass} flex items-center justify-center flex-shrink-0`}>
              {tool.emoji ? (
                <span className="text-[10px]">{tool.emoji}</span>
              ) : (
                getCategoryIcon(category, "w-3 h-3")
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{tool.name}</p>
              <p className="text-[8px] text-neutral-500 truncate">{tool.shortDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs font-serif text-primary-600">${tool.price}</span>
            <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </motion.div>
    )
  }

  // Default variant - balanced
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="h-full"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className="h-full p-3 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden border hover:border-primary-300">
        {/* Hover gradient overlay */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
          initial={false}
        />

        <div className="relative z-10 flex flex-col h-full">
          {/* Header with icon and badges */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${colorClass} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                {tool.emoji ? (
                  <span className="text-sm">{tool.emoji}</span>
                ) : (
                  getCategoryIcon(category)
                )}
              </div>
              <div>
                <h3 className="font-medium text-xs line-clamp-1">{tool.name}</h3>
                {tool.category && (
                  <p className="text-[8px] text-neutral-400 capitalize">{tool.category}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-0.5">
              {tool.isBestSeller && (
                <Badge variant="secondary" size="sm" className="px-1 py-0.5 text-[8px]">Best</Badge>
              )}
              {tool.isPopular && (
                <Badge variant="primary" size="sm" className="px-1 py-0.5 text-[8px]">🔥</Badge>
              )}
              {tool.isNew && (
                <Badge variant="secondary" size="sm" className="px-1 py-0.5 text-[8px]">New</Badge>
              )}
            </div>
          </div>

          {/* Description - 2 lines */}
          <p className="text-[10px] text-neutral-600 line-clamp-2 mb-2 flex-1">
            {tool.shortDescription}
          </p>

          {/* Meta information */}
          <div className="flex items-center gap-2 text-[8px] text-neutral-400 mb-2">
            {tool.estimatedReadTime && (
              <span className="flex items-center gap-0.5">
                <ClockIcon />
                {tool.estimatedReadTime} min
              </span>
            )}
            {tool.requiresImage && (
              <span className="flex items-center gap-0.5 text-amber-600">
                <CameraIcon />
                Photo
              </span>
            )}
          </div>

          {/* Price and actions */}
          <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100">
            <span className="text-sm font-serif text-primary-600">${tool.price}</span>
            
            <div className="flex gap-1">
              <ShareButton
                title={tool.name}
                text={tool.shortDescription}
                url={`/report/${tool.id}`}
              />
              
              <button 
                className="p-1 hover:bg-neutral-100 rounded transition"
                onClick={(e) => { e.stopPropagation(); onClick(); }}
              >
                <EyeIcon />
              </button>
              
              <button 
                className="p-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
                onClick={(e) => { e.stopPropagation(); onPurchase?.(); }}
              >
                <LockIcon />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}