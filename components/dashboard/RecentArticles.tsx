'use client'

import { BookOpen, ArrowRight, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'

const articles = [
  {
    id: '1',
    title: 'Understanding Your Birth Chart',
    date: 'Mar 15, 2026',
    readTime: '5 min',
    category: 'Astrology',
    slug: '/blog/birth-chart'
  },
  {
    id: '2',
    title: 'Mercury Retrograde Guide',
    date: 'Mar 12, 2026',
    readTime: '4 min',
    category: 'Planets',
    slug: '/blog/mercury'
  },
  {
    id: '3',
    title: 'Full Moon Rituals',
    date: 'Mar 10, 2026',
    readTime: '6 min',
    category: 'Moon',
    slug: '/blog/full-moon'
  }
]

export const RecentArticles = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-medium text-neutral-800">Latest</h3>
          </div>
          <Link href="/blog" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-neutral-100">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={article.slug}
            className="block px-5 py-4 hover:bg-neutral-50 transition group"
          >
            <h4 className="text-base font-medium text-neutral-800 mb-2 group-hover:text-emerald-600 transition">{article.title}</h4>
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {article.date}
              </span>
              <span className="text-neutral-300">•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {article.readTime}
              </span>
              <span className="ml-auto text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">
                {article.category}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}