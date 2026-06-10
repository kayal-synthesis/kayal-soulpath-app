import Image from 'next/image'
import { User } from 'lucide-react'

interface AvatarProps {
  src?: string | null
  fallback?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Avatar = ({ src, fallback, size = 'md', className = '' }: AvatarProps) => {
  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  }

  if (!src) {
    return (
      <div
        className={`${sizes[size]} rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white font-medium ${className}`}
      >
        {fallback || <User className="w-4 h-4" />}
      </div>
    )
  }

  return (
    <div className={`${sizes[size]} relative rounded-full overflow-hidden ${className}`}>
      <Image
        src={src}
        alt="Avatar"
        fill
        className="object-cover"
      />
    </div>
  )
}