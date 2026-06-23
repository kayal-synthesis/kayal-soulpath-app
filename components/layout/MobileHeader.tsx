'use client'

import Link from 'next/link'
import { User, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { NotificationCenter } from '@/components/dashboard/NotificationCenter'

interface MobileHeaderProps {
  isOpen?: boolean
  onToggle?: () => void
  userName?: string
}

const mockNotifications = [
  { id: '1', type: 'message'  as const, title: 'New message',        message: 'Sarah replied to your comment',    time: '5 min ago',   read: false },
  { id: '2', type: 'success'  as const, title: 'Purchase successful', message: 'Your Omni-Seer reading is ready', time: '2 hours ago', read: true  },
  { id: '3', type: 'reminder' as const, title: 'Daily guidance',      message: 'Your daily vibration is ready',   time: '3 hours ago', read: false },
  { id: '4', type: 'promo'    as const, title: 'Special offer',       message: '50% off on Soul Journey',         time: '1 day ago',   read: true  },
]

export const MobileHeader = ({ userName }: MobileHeaderProps) => {
  const router = useRouter()

  return (
    <header className="lg:hidden bg-white border-b border-neutral-100 fixed top-0 left-0 right-0 z-30 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl text-primary-600">☾</span>
          <span className="font-serif text-base font-semibold text-primary-900">
            KAYAL <span className="font-light text-neutral-500">LifeOS</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push('/domains')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition"
          >
            <Search className="w-4 h-4 text-neutral-500" />
          </button>
          <NotificationCenter
            notifications={mockNotifications}
            onNotificationClick={(id) => console.log('Notification clicked:', id)}
          />
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