import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Badge variant/style
   */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'outline'
  
  /**
   * Badge size
   */
  size?: 'sm' | 'md' | 'lg'
  
  /**
   * Whether badge is rounded full (pill) or less rounded
   */
  rounded?: 'full' | 'lg' | 'md'
  
  /**
   * Optional icon to display before text
   */
  icon?: React.ReactNode
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'md', 
    rounded = 'full',
    icon,
    children, 
    ...props 
  }, ref) => {
    
    const variants = {
      default: 'bg-neutral-100 text-neutral-700',
      primary: 'bg-primary-100 text-primary-700',
      secondary: 'bg-secondary-100 text-secondary-700',
      success: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
      info: 'bg-blue-100 text-blue-700',
      outline: 'bg-transparent border border-neutral-300 text-neutral-700',
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    }

    const roundedClasses = {
      full: 'rounded-full',
      lg: 'rounded-lg',
      md: 'rounded-md',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium',
          variants[variant],
          sizes[size],
          roundedClasses[rounded],
          className
        )}
        {...props}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

// Pre-defined badge variants for common use cases
export const StatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'default', label: 'Inactive' },
    pending: { variant: 'warning', label: 'Pending' },
    blocked: { variant: 'error', label: 'Blocked' },
    verified: { variant: 'success', label: 'Verified' },
    unverified: { variant: 'warning', label: 'Unverified' },
    premium: { variant: 'primary', label: 'Premium' },
    free: { variant: 'default', label: 'Free' },
    lifetime: { variant: 'secondary', label: 'Lifetime' },
  }

  const config = statusMap[status.toLowerCase()] || { variant: 'default', label: status }
  
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export const TierBadge = ({ tier, rate }: { tier: string; rate?: number }) => {
  const tierMap: Record<string, { variant: BadgeProps['variant']; emoji: string }> = {
    bronze: { variant: 'warning', emoji: '🥉' },
    silver: { variant: 'default', emoji: '🥈' },
    gold: { variant: 'secondary', emoji: '🥇' },
    platinum: { variant: 'primary', emoji: '💎' },
    diamond: { variant: 'info', emoji: '💎' },
  }

  const config = tierMap[tier.toLowerCase()] || { variant: 'default', emoji: '🎯' }
  
  return (
    <Badge variant={config.variant} icon={<span>{config.emoji}</span>}>
      {tier} {rate && `• ${rate}%`}
    </Badge>
  )
}