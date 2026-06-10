'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  count?: number
}

export interface TabsProps {
  /**
   * Array of tabs to display
   */
  tabs: Tab[]
  
  /**
   * Currently active tab ID (controlled)
   */
  activeTab?: string
  
  /**
   * Default active tab ID (uncontrolled)
   */
  defaultTab?: string
  
  /**
   * Callback when tab changes
   */
  onChange?: (tabId: string) => void
  
  /**
   * Visual variant
   */
  variant?: 'default' | 'pills' | 'underlined' | 'buttons'
  
  /**
   * Whether tabs take full width
   */
  fullWidth?: boolean
  
  /**
   * Additional className for the container
   */
  className?: string
  
  /**
   * Size of tabs
   */
  size?: 'sm' | 'md' | 'lg'
}

export const Tabs = ({
  tabs,
  activeTab: controlledActiveTab,
  defaultTab,
  onChange,
  variant = 'default',
  fullWidth = false,
  className = '',
  size = 'md'
}: TabsProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || tabs[0]?.id)
  
  const activeTab = controlledActiveTab ?? internalActiveTab

  useEffect(() => {
    // If no tab is active, set to first tab
    if (!activeTab && tabs.length > 0) {
      setInternalActiveTab(tabs[0].id)
    }
  }, [activeTab, tabs])

  const handleChange = (tabId: string) => {
    if (onChange) {
      onChange(tabId)
    } else {
      setInternalActiveTab(tabId)
    }
  }

  const variantClasses = {
    default: {
      container: 'border-b border-neutral-200',
      tab: 'px-4 py-2 text-sm font-medium text-neutral-600 hover:text-primary-600',
      active: 'text-primary-600 border-b-2 border-primary-600 -mb-px',
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-3 text-base',
      }
    },
    pills: {
      container: 'p-1 bg-neutral-100 rounded-lg inline-flex',
      tab: 'px-4 py-2 text-sm font-medium rounded-md transition-colors hover:text-primary-600',
      active: 'bg-white text-primary-600 shadow',
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-3 text-base',
      }
    },
    underlined: {
      container: 'border-b border-neutral-200',
      tab: 'px-4 py-3 text-sm font-medium text-neutral-600 hover:text-primary-600 relative',
      active: 'text-primary-600',
      size: {
        sm: 'px-3 py-2 text-xs',
        md: 'px-4 py-3 text-sm',
        lg: 'px-5 py-4 text-base',
      }
    },
    buttons: {
      container: 'flex gap-2',
      tab: 'px-4 py-2 text-sm font-medium rounded-lg border border-neutral-200 hover:border-primary-300 hover:text-primary-600 transition',
      active: 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700',
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-3 text-base',
      }
    }
  }

  const currentVariant = variantClasses[variant]

  return (
    <div className={cn(currentVariant.container, fullWidth ? 'w-full' : 'inline-flex', className)}>
      <div className={cn('flex', fullWidth && 'w-full', variant === 'buttons' && 'flex-wrap')}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && handleChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                currentVariant.tab,
                currentVariant.size[size as keyof typeof currentVariant.size],
                isActive && currentVariant.active,
                tab.disabled && 'opacity-50 cursor-not-allowed',
                fullWidth && 'flex-1',
                'flex items-center justify-center gap-2 transition-all duration-200 relative'
              )}
              aria-selected={isActive}
              role="tab"
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={cn(
                  'ml-1 px-1.5 py-0.5 text-xs rounded-full',
                  isActive 
                    ? variant === 'buttons' ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700'
                    : 'bg-neutral-200 text-neutral-600'
                )}>
                  {tab.count}
                </span>
              )}
              {variant === 'underlined' && isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}