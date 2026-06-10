'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

export interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
  error?: string
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, error, disabled, ...props }, ref) => {
    const id = props.id || `radio-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="relative">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="radio"
              ref={ref}
              id={id}
              disabled={disabled}
              className={cn(
                'sr-only',
                className
              )}
              {...props}
            />
            <label
              htmlFor={id}
              className={cn(
                'relative flex items-center justify-center w-5 h-5 border-2 rounded-full transition-colors cursor-pointer',
                'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
                disabled && 'opacity-50 cursor-not-allowed',
                error ? 'border-warning' : 'border-neutral-300',
                props.checked && 'border-primary-600'
              )}
            >
              {props.checked && (
                <div className="w-2.5 h-2.5 bg-primary-600 rounded-full" />
              )}
            </label>
          </div>
          
          {(label || description) && (
            <div className="ml-3 text-sm">
              {label && (
                <label
                  htmlFor={id}
                  className={cn(
                    'font-medium text-neutral-700',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {label}
                </label>
              )}
              {description && (
                <p className="text-xs text-neutral-500">{description}</p>
              )}
            </div>
          )}
        </div>
        
        {error && (
          <p className="mt-1 text-xs text-warning">{error}</p>
        )}
      </div>
    )
  }
)

Radio.displayName = 'Radio'