'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button variant/style
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'
  
  /**
   * Button size
   */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  
  /**
   * Whether button takes full width
   */
  fullWidth?: boolean
  
  /**
   * Loading state
   */
  loading?: boolean
  
  /**
   * Left icon
   */
  leftIcon?: React.ReactNode
  
  /**
   * Right icon
   */
  rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false, 
    loading = false,
    leftIcon,
    rightIcon,
    children, 
    disabled, 
    ...props 
  }, ref) => {
    
    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-primary-500',
      secondary: 'bg-secondary-500 text-neutral-900 hover:bg-secondary-600 active:bg-secondary-700 focus:ring-secondary-500',
      outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 active:bg-primary-100 focus:ring-primary-500',
      ghost: 'text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 focus:ring-neutral-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500',
      success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus:ring-green-500',
      warning: 'bg-yellow-500 text-white hover:bg-yellow-600 active:bg-yellow-700 focus:ring-yellow-500',
    }

    const sizes = {
      xs: 'px-2 py-1 text-xs gap-1',
      sm: 'px-4 py-2 text-sm gap-2',
      md: 'px-6 py-3 text-base gap-2',
      lg: 'px-8 py-4 text-lg gap-3',
    }

    return (
      <button
        ref={ref}
        className={cn(
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.98]',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'