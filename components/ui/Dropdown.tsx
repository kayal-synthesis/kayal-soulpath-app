'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface DropdownOption {
  value: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

interface DropdownProps {
  options: DropdownOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  hint?: string
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  className?: string
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
}

export const Dropdown = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  hint,
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  position = 'bottom-left'
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const positionClasses = {
    'bottom-left': 'top-full left-0 mt-1',
    'bottom-right': 'top-full right-0 mt-1',
    'top-left': 'bottom-full left-0 mb-1',
    'top-right': 'bottom-full right-0 mb-1'
  }

  return (
    <div className={cn('relative', fullWidth && 'w-full', className)} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={cn(
          'w-full px-4 py-2 text-left border rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'flex items-center justify-between gap-2',
          disabled && 'bg-neutral-50 cursor-not-allowed opacity-50',
          error ? 'border-warning' : 'border-neutral-200 hover:border-primary-400',
          isOpen && 'border-primary-600 ring-2 ring-primary-500 ring-opacity-20'
        )}
      >
        <span className={cn('truncate', !selectedOption && 'text-neutral-400')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 text-neutral-500 transition-transform duration-200',
          isOpen && 'transform rotate-180'
        )} />
      </button>

      {hint && !error && (
        <p className="mt-1 text-xs text-neutral-500">{hint}</p>
      )}
      
      {error && (
        <p className="mt-1 text-xs text-warning">{error}</p>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 w-full bg-white border rounded-lg shadow-lg overflow-hidden',
              positionClasses[position]
            )}
          >
            <div className="max-h-60 overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange?.(option.value)
                    setIsOpen(false)
                  }}
                  disabled={option.disabled}
                  className={cn(
                    'w-full px-4 py-2 text-left hover:bg-neutral-50 transition-colors',
                    'flex items-center gap-2',
                    option.value === value && 'bg-primary-50 text-primary-600',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                  <span className="flex-1 truncate">{option.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}