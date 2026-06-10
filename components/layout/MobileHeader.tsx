'use client'

import { Menu, X } from 'lucide-react'

interface MobileHeaderProps {
  isOpen: boolean
  onToggle: () => void
  // userName prop completely removed - no more split error
}

export const MobileHeader = ({ isOpen, onToggle }: MobileHeaderProps) => {
  return (
    <header className="lg:hidden bg-white border-b border-neutral-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Menu Toggle Button */}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-neutral-100 rounded-lg transition"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Logo only - NO GREETING and NO userName reference */}
        <div className="flex items-center gap-1">
          <span className="text-lg font-serif text-primary-700">☾</span>
          <span className="text-sm font-medium text-neutral-700 ml-1">KAYAL</span>
        </div>

        {/* Empty div for spacing (balance the layout) */}
        <div className="w-10" />
      </div>
    </header>
  )
}