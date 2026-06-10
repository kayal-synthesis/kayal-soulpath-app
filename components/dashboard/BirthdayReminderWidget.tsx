'use client'

import { Card } from '@/components/ui/Card'
import { Cake, Gift } from 'lucide-react'

export const BirthdayReminderWidget = () => {
  return (
    <Card className="p-4 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
      <div className="flex items-center gap-2 mb-2">
        <Cake className="w-5 h-5 text-secondary-400" />
        <h3 className="text-sm font-medium">Upcoming Birthdays</h3>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
          <span className="text-sm">Mom</span>
          <span className="text-xs bg-secondary-500/20 text-secondary-300 px-2 py-1 rounded-full">3 days</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
          <span className="text-sm">Alex</span>
          <span className="text-xs bg-secondary-500/20 text-secondary-300 px-2 py-1 rounded-full">8 days</span>
        </div>
      </div>
    </Card>
  )
}