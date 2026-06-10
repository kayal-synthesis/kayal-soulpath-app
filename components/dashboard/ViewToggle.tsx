'use client'

import { LayoutGrid, List, Grid3x3, Smartphone } from 'lucide-react'

interface ViewToggleProps {
  view: 'compact' | 'grid' | 'list' | 'mobile'
  onChange: (view: 'compact' | 'grid' | 'list' | 'mobile') => void
}

export const ViewToggle = ({ view, onChange }: ViewToggleProps) => {
  const views = [
    { id: 'compact', icon: LayoutGrid, label: 'Compact grid' },
    { id: 'grid', icon: Grid3x3, label: 'Large grid' },
    { id: 'list', icon: List, label: 'List view' },
    { id: 'mobile', icon: Smartphone, label: 'Mobile view' }
  ]

  return (
    <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
      {views.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id as any)}
          className={`p-2 rounded-md transition-all ${
            view === id 
              ? 'bg-white shadow text-primary-600' 
              : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/50'
          }`}
          title={label}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  )
}