'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Newspaper, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const NewsFeedWidget = () => {
  const news = [
    { title: 'Understanding Your Life Path Number', date: '2 hours ago', category: 'Numerology' },
    { title: 'Palmistry: Reading Your Heart Line', date: 'Yesterday', category: 'Palmistry' },
    { title: 'The Power of Face Reading', date: '3 days ago', category: 'Physiognomy' }
  ]

  return (
    <Card className="p-4 border-primary-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary-600" />
          Latest Insights
        </h3>
        <Link href="/blog">
          <Button variant="ghost" size="sm" className="text-xs text-primary-600">
            View All
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
      <div className="space-y-3">
        {news.map((item, i) => (
          <div key={i} className="p-2 bg-primary-50 rounded-lg hover:bg-primary-100 transition cursor-pointer">
            <div className="text-xs font-medium mb-1">{item.title}</div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500">
              <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{item.category}</span>
              <Calendar className="w-3 h-3 text-primary-400" />
              <span>{item.date}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}