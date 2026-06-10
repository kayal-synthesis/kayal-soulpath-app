'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string
  description?: string
  error?: string
  size?: 'sm' | 'md' | 'lg'
  checked?: boolean
  onChange?: (checked: boolean) => void
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, error, size = 'md', checked, onChange, disabled, id, ...props }, ref) => {
    const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`

    const sizeClasses = {
      sm: {
        switch: 'w-8 h-4',
        dot: 'w-3 h-3',
        translate: 'translate-x-4'
      },
      md: {
        switch: 'w-11 h-6',
        dot: 'w-5 h-5',
        translate: 'translate-x-5'
      },
      lg: {
        switch: 'w-14 h-7',
        dot: 'w-6 h-6',
        translate: 'translate-x-7'
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked)
    }

    return (
      <div className="relative">
        <div className="flex items-start">
          <label
            htmlFor={switchId}
            className={cn(
              'relative inline-flex items-center cursor-pointer',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              type="checkbox"
              ref={ref}
              id={switchId}
              disabled={disabled}
              className="sr-only"
              checked={checked}
              onChange={handleChange}
              {...props}
            />
            <div
              className={cn(
                sizeClasses[size].switch,
                'bg-neutral-300 rounded-full transition-colors',
                checked && 'bg-primary-600'
              )}
            >
              <div
                className={cn(
                  sizeClasses[size].dot,
                  'absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform',
                  checked && sizeClasses[size].translate
                )}
              />
            </div>
          </label>
          
          {(label || description) && (
            <div className="ml-3 text-sm">
              {label && (
                <label
                  htmlFor={switchId}
                  className={cn(
                    'block font-medium text-neutral-700',
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

Switch.displayName = 'Switch'