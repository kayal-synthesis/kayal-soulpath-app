'use client'

import Link from 'next/link'
import { Bell, User, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MobileHeaderProps {
  isOpen?: boolean
  onToggle?: () => void
  userName?: string
}

export const MobileHeader = ({ userName }: MobileHeaderProps) => {
  const router = useRouter()

  return (
    <header className="lg:hidden bg-white border-b border-neutral-100 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">

        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl text-primary-600">☾</span>
          <span className="font-serif text-base font-semibold text-primary-900">KAYAL</span>
        </Link>

        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push('/explore')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition"
          >
            <Search className="w-4 h-4 text-neutral-500" />
          </button>
          <button
            onClick={() => router.push('/notifications')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition relative"
          >
            <Bell className="w-4 h-4 text-neutral-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary-50 hover:bg-primary-100 transition"
          >
            <User className="w-4 h-4 text-primary-600" />
          </button>
        </div>

      </div>
    </header>
  )
}