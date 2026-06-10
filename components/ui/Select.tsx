'use client'

import { forwardRef, SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[]
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, label, error, hint, fullWidth = false, disabled, ...props }, ref) => {
    const id = props.id || `select-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              'w-full px-4 py-2 appearance-none border rounded-lg transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'disabled:bg-neutral-50 disabled:cursor-not-allowed',
              error ? 'border-warning' : 'border-neutral-200',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
        </div>

        {hint && !error && (
          <p className="mt-1 text-xs text-neutral-500">{hint}</p>
        )}
        
        {error && (
          <p className="mt-1 text-xs text-warning">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'