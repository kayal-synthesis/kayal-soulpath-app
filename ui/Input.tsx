'use client'

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface BaseInputProps {
  label?: string
  error?: string
  hint?: string
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseInputProps {
  multiline?: false
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {
  multiline: true
  rows?: number
}

type Props = InputProps | TextareaProps

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(
  ({ className, label, error, hint, multiline, ...props }, ref) => {
    const id = props.id || `field-${Math.random().toString(36).substr(2, 9)}`

    const baseClasses = cn(
      'w-full px-4 py-3 border rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      'disabled:bg-neutral-50 disabled:cursor-not-allowed',
      error ? 'border-warning' : 'border-neutral-200',
      className
    )

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1">
            {label}
          </label>
        )}
        
        {multiline ? (
          <textarea
            id={id}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={baseClasses}
            rows={(props as TextareaProps).rows || 4}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            id={id}
            ref={ref as React.Ref<HTMLInputElement>}
            className={baseClasses}
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        
        {error && (
          <p className="mt-1 text-sm text-warning">{error}</p>
        )}
        
        {hint && !error && (
          <p className="mt-1 text-sm text-neutral-500">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'