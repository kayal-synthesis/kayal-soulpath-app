import { cn } from '@/lib/utils/cn'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animate?: boolean
}

export const Skeleton = ({
  className = '',
  variant = 'text',
  width,
  height,
  animate = true
}: SkeletonProps) => {
  const baseClasses = 'bg-neutral-200'
  const animateClasses = animate ? 'animate-pulse' : ''

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }

  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animateClasses,
        className
      )}
      style={style}
    />
  )
}

// Compound components for common patterns
export const SkeletonText = ({ lines = 3, className = '' }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '60%' : '100%'}
          height="1rem"
        />
      ))}
    </div>
  )
}

export const SkeletonAvatar = ({ size = 40, className = '' }) => {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  )
}

export const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={cn('space-y-4', className)}>
      <Skeleton variant="rectangular" width="100%" height={200} />
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <SkeletonAvatar size={32} />
        <SkeletonText lines={1} />
      </div>
    </div>
  )
}