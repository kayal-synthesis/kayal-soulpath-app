'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils/cn'
import { User } from 'lucide-react'

interface AvatarProps {
  src?: string | null
  fallback?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const Avatar = ({ src, fallback, className, size = 'md' }: AvatarProps) => {
  const [error, setError] = useState(false)

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg'
  }

  // If no src or error loading, show fallback
  if (!src || error) {
    return (
      <div
        className={cn(
          'rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white font-medium',
          sizeClasses[size],
          className
        )}
      >
        {fallback || <User className="w-4 h-4" />}
      </div>
    )
  }

  return (
    <div className={cn('relative rounded-full overflow-hidden', sizeClasses[size], className)}>
      <Image
        src={src}
        alt="Avatar"
        fill
        className="object-cover"
        onError={() => setError(true)}
      />
    </div>
  )
}