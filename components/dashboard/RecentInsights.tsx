'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { ShareButton } from '@/components/ui/ShareButton'
import { Button } from '@/components/ui/Button'
import { Heart, Briefcase, TrendingUp, Sparkles, Clock, ChevronRight } from 'lucide-react'

interface Insight {
  id: string
  title: string
  preview: string
  type: 'love' | 'career' | 'wealth' | 'spiritual'
  date: string
  isNew?: boolean
}

interface RecentInsightsProps {
  compact?: boolean
}

export const RecentInsights = ({ compact = false }: RecentInsightsProps) => {
  const insights: Insight[] = [
    {
      id: '1',
      title: 'The Love Oracle',
      preview: 'Your heart line shows a break at 28.',
      type: 'love',
      date: '2 hours ago',
      isNew: true
    },
    {
      id: '2',
      title: 'The Wealth Code',
      preview: 'Your next wealth window opens at 42.',
      type: 'wealth',
      date: 'Yesterday'
    },
    {
      id: '3',
      title: 'Career Crossroads',
      preview: 'A major career shift is indicated.',
      type: 'career',
      date: '3 days ago'
    }
  ]

  const typeIcons = {
    love: Heart,
    career: Briefcase,
    wealth: TrendingUp,
    spiritual: Sparkles
  }

  const typeColors = {
    love: 'text-red-500 bg-red-50',
    career: 'text-blue-500 bg-blue-50',
    wealth: 'text-green-500 bg-green-50',
    spiritual: 'text-purple-500 bg-purple-50'
  }

  // Show only 2 insights in compact mode, otherwise show all 3
  const displayInsights = compact ? insights.slice(0, 2) : insights

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Recent Insights</h3>
        {!compact && (
          <Link href="/dashboard/free-reports">
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        )}
      </div>

      <div className={`space-y-${compact ? '3' : '4'}`}>
        {displayInsights.map((insight) => {
          const Icon = typeIcons[insight.type]
          return (
            <div key={insight.id} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition group">
              <div className={`p-2 rounded-lg ${typeColors[insight.type]} flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{insight.title}</h4>
                  {insight.isNew && (
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-600 text-xs rounded-full whitespace-nowrap">New</span>
                  )}
                </div>
                <p className="text-xs text-neutral-600 line-clamp-1 mb-1">{insight.preview}</p>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Clock className="w-3 h-3" />
                  <span>{insight.date}</span>
                </div>
              </div>
              {!compact && (
                <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                  <ShareButton title={insight.title} text={insight.preview} url={`/report/${insight.id}`} />
                  <Link href={`/report/${insight.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {compact && (
        <Link href="/dashboard/free-reports">
          <Button variant="ghost" size="sm" fullWidth className="mt-3">
            View All Insights
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      )}
    </Card>
  )
}