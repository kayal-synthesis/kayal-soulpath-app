'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Calendar, User, Tag, Search, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatting'

interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  author: {
    name: string
    avatar?: string
    role: string
  }
  category: string
  tags: string[]
  image: string
  publishedAt: string
  readTime: number
  featured: boolean
}

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = [
    'All',
    'Numerology',
    'Palmistry',
    'Physiognomy',
    'Spirituality',
    'Personal Growth',
    'Relationships'
  ]

  const posts: BlogPost[] = [
    {
      id: '1',
      slug: 'understanding-your-life-path-number',
      title: 'Understanding Your Life Path Number: A Complete Guide',
      excerpt: 'Discover what your life path number reveals about your purpose, challenges, and opportunities...',
      content: '',
      author: {
        name: 'Sarah Chen',
        role: 'Numerology Expert'
      },
      category: 'Numerology',
      tags: ['life path', 'numbers', 'destiny'],
      image: '/blog/life-path.jpg',
      publishedAt: '2024-02-15',
      readTime: 8,
      featured: true
    },
    {
      id: '2',
      slug: 'palmistry-basics-reading-your-heart-line',
      title: 'Palmistry Basics: What Your Heart Line Reveals About Love',
      excerpt: 'Learn how to read your heart line and understand what it says about your emotional nature...',
      content: '',
      author: {
        name: 'Michael Patel',
        role: 'Palmistry Expert'
      },
      category: 'Palmistry',
      tags: ['heart line', 'love', 'relationships'],
      image: '/blog/palmistry.jpg',
      publishedAt: '2024-02-10',
      readTime: 6,
      featured: true
    },
    {
      id: '3',
      slug: 'face-reading-guide-physiognomy',
      title: 'Face Reading 101: An Introduction to Physiognomy',
      excerpt: 'Discover how your facial features reveal your personality, strengths, and life path...',
      content: '',
      author: {
        name: 'Priya Sharma',
        role: 'Physiognomy Expert'
      },
      category: 'Physiognomy',
      tags: ['face reading', 'features', 'personality'],
      image: '/blog/face-reading.jpg',
      publishedAt: '2024-02-05',
      readTime: 7,
      featured: false
    },
    {
      id: '4',
      slug: 'combining-wisdom-systems',
      title: 'Why Combining Numerology, Palmistry & Physiognomy Works',
      excerpt: 'Learn how integrating three ancient wisdom systems provides a complete picture of who you are...',
      content: '',
      author: {
        name: 'David Kim',
        role: 'Lead Researcher'
      },
      category: 'Spirituality',
      tags: ['integration', 'holistic', 'wisdom'],
      image: '/blog/integration.jpg',
      publishedAt: '2024-01-28',
      readTime: 10,
      featured: false
    },
    {
      id: '5',
      slug: 'personal-year-forecast-2024',
      title: 'Your Personal Year Forecast: What 2024 Has in Store',
      excerpt: 'Calculate your personal year number and discover the themes and opportunities ahead...',
      content: '',
      author: {
        name: 'Sarah Chen',
        role: 'Numerology Expert'
      },
      category: 'Numerology',
      tags: ['personal year', '2024', 'forecast'],
      image: '/blog/year-forecast.jpg',
      publishedAt: '2024-01-15',
      readTime: 5,
      featured: true
    },
    {
      id: '6',
      slug: 'love-compatibility-numbers',
      title: 'Love Compatibility: Which Numbers Match Best?',
      excerpt: 'Find out which life path numbers are most compatible in relationships and why...',
      content: '',
      author: {
        name: 'Sarah Chen',
        role: 'Numerology Expert'
      },
      category: 'Relationships',
      tags: ['love', 'compatibility', 'relationships'],
      image: '/blog/love-compatibility.jpg',
      publishedAt: '2024-01-05',
      readTime: 7,
      featured: false
    }
  ]

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const featuredPosts = posts.filter(p => p.featured)

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-900 to-primary-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-serif mb-6"
          >
            Kayal LifeOS Blog
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-white/80 max-w-2xl mx-auto"
          >
            Insights, guides, and wisdom from our experts
          </motion.p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 mb-12">
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && searchQuery === '' && selectedCategory === 'All' && (
        <div className="max-w-6xl mx-auto px-4 mb-12">
          <h2 className="text-2xl font-serif mb-6">Featured Articles</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {featuredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/blog/${post.slug}`}>
                  <Card className="group cursor-pointer overflow-hidden hover:shadow-xl transition">
                    <div className="relative h-48 bg-gradient-to-br from-primary-600 to-primary-800">
                      <div className="absolute inset-0 flex items-center justify-center text-white text-6xl opacity-20">
                        {post.category.charAt(0)}
                      </div>
                      {post.featured && (
                        <div className="absolute top-4 left-4 bg-secondary-500 text-neutral-900 px-3 py-1 rounded-full text-xs font-medium">
                          Featured
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(post.publishedAt)}</span>
                        <span>•</span>
                        <span>{post.readTime} min read</span>
                      </div>
                      <h3 className="text-xl font-serif mb-2 group-hover:text-primary-600 transition">
                        {post.title}
                      </h3>
                      <p className="text-neutral-600 text-sm mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {post.author.name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm text-neutral-600">{post.author.name}</span>
                        </div>
                        <span className="text-primary-600 text-sm group-hover:translate-x-1 transition-transform">
                          Read more →
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* All Posts */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-serif mb-6">
          {searchQuery ? 'Search Results' : 'Latest Articles'}
        </h2>
        
        {filteredPosts.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-neutral-500">No articles found matching your search.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/blog/${post.slug}`}>
                  <Card className="group cursor-pointer h-full hover:shadow-lg transition">
                    <div className="relative h-40 bg-gradient-to-br from-primary-500 to-primary-700 rounded-t-lg">
                      <div className="absolute inset-0 flex items-center justify-center text-white text-4xl opacity-20">
                        📚
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                        <span className="px-2 py-1 bg-primary-50 text-primary-600 rounded-full">
                          {post.category}
                        </span>
                        <span>{post.readTime} min</span>
                      </div>
                      <h3 className="text-lg font-serif mb-2 line-clamp-2 group-hover:text-primary-600 transition">
                        {post.title}
                      </h3>
                      <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500">{formatDate(post.publishedAt)}</span>
                        <span className="text-primary-600 group-hover:translate-x-1 transition-transform">
                          Read →
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Load More */}
        {filteredPosts.length > 0 && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More Articles
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}