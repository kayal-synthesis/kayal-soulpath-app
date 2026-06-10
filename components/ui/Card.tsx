import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to add hover effects
   */
  hover?: boolean
  
  /**
   * Padding size
   */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  
  /**
   * Border radius size
   */
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * Shadow intensity
   */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * Whether the card is interactive (clickable)
   */
  interactive?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    children, 
    hover = true, 
    padding = 'md',
    radius = 'lg',
    shadow = 'md',
    interactive = false,
    onClick,
    ...props 
  }, ref) => {
    
    const paddingClasses = {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-6',
      lg: 'p-8'
    }

    const radiusClasses = {
      none: 'rounded-none',
      sm: 'rounded',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl'
    }

    const shadowClasses = {
      none: 'shadow-none',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl'
    }

    const hoverClasses = hover && !interactive ? 'hover:shadow-lg transition-shadow duration-300' : ''
    const interactiveClasses = interactive ? 'cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md' : ''

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white border border-neutral-200',
          paddingClasses[padding],
          radiusClasses[radius],
          shadowClasses[shadow],
          hoverClasses,
          interactiveClasses,
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Optional compound components for common card patterns
export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between mb-4', className)}
      {...props}
    />
  )
)

CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-serif text-primary-900', className)}
      {...props}
    />
  )
)

CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-neutral-600', className)}
      {...props}
    />
  )
)

CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('', className)}
      {...props}
    />
  )
)

CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-end gap-2 mt-4 pt-4 border-t border-neutral-200', className)}
      {...props}
    />
  )
)

CardFooter.displayName = 'CardFooter'