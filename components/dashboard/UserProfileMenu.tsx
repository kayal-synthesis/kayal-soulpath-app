'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Settings, 
  LogOut, 
  Crown, 
  Sparkles,
  ChevronDown,
  Calendar,
  Mail,
  Shield,
  HelpCircle
} from 'lucide-react'
import Image from 'next/image'

interface UserProfile {
  name: string
  email: string
  avatar?: string
  membership: 'free' | 'premium' | 'vip'
  joinDate: string
  lastActive: string
}

interface UserProfileMenuProps {
  user: UserProfile
  onViewProfile: () => void
  onSettings: () => void
  onLogout: () => void
}

export const UserProfileMenu = ({ user, onViewProfile, onSettings, onLogout }: UserProfileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const getMembershipBadge = () => {
    switch(user.membership) {
      case 'vip':
        return <Crown className="w-4 h-4 text-amber-500" />
      case 'premium':
        return <Sparkles className="w-4 h-4 text-purple-500" />
      default:
        return <User className="w-4 h-4 text-neutral-400" />
    }
  }

  const getMembershipColor = () => {
    switch(user.membership) {
      case 'vip': return 'bg-amber-100 text-amber-700'
      case 'premium': return 'bg-purple-100 text-purple-700'
      default: return 'bg-neutral-100 text-neutral-600'
    }
  }

  return (
    <div className="relative">
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 hover:bg-neutral-100 rounded-lg transition"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
          {user.avatar ? (
            <Image 
              src={user.avatar} 
              alt={user.name} 
              width={32} 
              height={32} 
              className="rounded-full"
            />
          ) : (
            <span className="text-sm font-medium text-primary-700">
              {user.name.charAt(0)}
            </span>
          )}
        </div>
        <span className="text-sm font-medium text-neutral-700 hidden md:block">
          {user.name.split(' ')[0]}
        </span>
        <ChevronDown className="w-4 h-4 text-neutral-400" />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden z-50"
          >
            {/* User Info */}
            <div className="p-4 border-b border-neutral-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  {user.avatar ? (
                    <Image src={user.avatar} alt={user.name} width={40} height={40} className="rounded-full" />
                  ) : (
                    <span className="text-lg font-medium text-primary-700">
                      {user.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 truncate">{user.name}</p>
                  <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${getMembershipColor()}`}>
                  {getMembershipBadge()}
                  {user.membership === 'vip' ? 'VIP' : user.membership === 'premium' ? 'Premium' : 'Free'}
                </span>
                <span className="text-[10px] text-neutral-400">•</span>
                <span className="text-[10px] text-neutral-500">Joined {user.joinDate}</span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <button
                onClick={() => {
                  onViewProfile()
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition"
              >
                <User className="w-4 h-4 text-neutral-400" />
                View Profile
              </button>
              <button
                onClick={() => {
                  onSettings()
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition"
              >
                <Settings className="w-4 h-4 text-neutral-400" />
                Settings
              </button>
              <button
                onClick={() => {
                  window.open('/help', '_blank')
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition"
              >
                <HelpCircle className="w-4 h-4 text-neutral-400" />
                Help & Support
              </button>
              <div className="border-t border-neutral-200 my-1" />
              <button
                onClick={() => {
                  onLogout()
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200">
              <p className="text-[10px] text-neutral-400 text-center">
                Last active: {user.lastActive}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}