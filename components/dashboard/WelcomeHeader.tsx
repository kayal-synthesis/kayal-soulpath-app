'use client'

import { motion } from 'framer-motion'
import { Sparkles, Calendar, Clock, Sun, Moon, Star } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'

interface WelcomeHeaderProps {
  userName: string
  greeting: string
  date: string
  time: string
  personalDay: number
}

export const WelcomeHeader = ({ 
  userName, 
  greeting, 
  date, 
  time, 
  personalDay 
}: WelcomeHeaderProps) => {
  
  const getGreetingIcon = () => {
    const hour = new Date().getHours()
    if (hour < 12) return <Sun className="w-5 h-5 text-yellow-500" />
    if (hour < 18) return <Sun className="w-5 h-5 text-orange-500" />
    return <Moon className="w-5 h-5 text-indigo-400" />
  }

  const firstName = userName.split(' ')[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 shadow-sm border border-neutral-100"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-full blur-md opacity-50" />
            <Avatar 
              fallback={firstName.charAt(0)} 
              size="lg"
              className="relative ring-2 ring-white"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              {getGreetingIcon()}
              <h1 className="text-2xl font-serif text-primary-900">
                {greeting}, {firstName}!
              </h1>
              <Sparkles className="w-4 h-4 text-secondary-500 animate-pulse" />
            </div>

            <div className="flex items-center gap-4 text-sm text-neutral-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-primary-400" />
                <span>{date}</span>
              </div>
              <div className="w-1 h-1 bg-neutral-300 rounded-full" />
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-primary-400" />
                <span>{time}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Badge variant="primary" className="px-3 py-1">
                <Star className="w-3 h-3 mr-1" />
                Personal Day {personalDay}
              </Badge>
              <span className="text-xs text-neutral-400">
                • Reflection & Inner Knowing
              </span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 bg-primary-50 px-4 py-2 rounded-full">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-primary-700">Active Now</span>
          </div>
          <div className="w-px h-4 bg-primary-200" />
          <span className="text-xs font-medium text-primary-800">847 seekers</span>
        </div>
      </div>

      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-4 text-xs text-neutral-500 italic border-t pt-3"
      >
        "The stars have aligned for your journey today, {firstName}. Trust the path."
      </motion.p>
    </motion.div>
  )
}