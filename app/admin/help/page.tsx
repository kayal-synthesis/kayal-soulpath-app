// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  HelpCircle, BookOpen, MessageCircle, Mail,
  Phone, Video, FileText, Download,
  Search, ChevronRight, ExternalLink,
  Users, Settings, Shield, CreditCard,
  Globe, Smartphone, Laptop, Server
} from 'lucide-react'

export default function HelpPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const categories = [
    { name: 'Getting Started', icon: BookOpen, articles: 12 },
    { name: 'Account & Billing', icon: CreditCard, articles: 8 },
    { name: 'Security', icon: Shield, articles: 15 },
    { name: 'Tools & Features', icon: Settings, articles: 23 },
    { name: 'Integrations', icon: Globe, articles: 7 },
    { name: 'API Reference', icon: Server, articles: 19 },
  ]

  const popularArticles = [
    { title: 'How to set up your account', views: 1234, category: 'Getting Started' },
    { title: 'Understanding subscription billing', views: 987, category: 'Billing' },
    { title: 'Two-factor authentication setup', views: 876, category: 'Security' },
    { title: 'Creating your first tool', views: 765, category: 'Tools' },
    { title: 'API authentication guide', views: 654, category: 'API' },
  ]

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <HelpCircle className="w-16 h-16 text-primary-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
          <p className="text-xl text-neutral-600 mb-8">Search our knowledge base or browse categories below</p>
          
          {/* Search */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border rounded-xl text-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Categories */}
        <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {categories.map((cat) => {
            const Icon = cat.icon
            return (
              <Card key={cat.name} className="p-6 hover:shadow-lg transition cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">{cat.name}</h3>
                      <p className="text-sm text-neutral-500">{cat.articles} articles</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-400" />
                </div>
              </Card>
            )
          })}
        </div>

        {/* Popular Articles */}
        <h2 className="text-2xl font-bold mb-6">Popular Articles</h2>
        <Card className="p-6 mb-12">
          <div className="space-y-4">
            {popularArticles.map((article, i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-neutral-50 rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium">{article.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <Badge variant="outline" size="sm">{article.category}</Badge>
                    <span className="text-neutral-400">{article.views} views</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-400" />
              </div>
            ))}
          </div>
        </Card>

        {/* Contact Support */}
        <Card className="p-8 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
            <p className="text-primary-100 mb-8">Our support team is available 24/7 to assist you</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="secondary" className="bg-white text-primary-700">
                <MessageCircle className="w-4 h-4 mr-2" />
                Live Chat
              </Button>
              <Button variant="secondary" className="bg-white text-primary-700">
                <Mail className="w-4 h-4 mr-2" />
                Email Support
              </Button>
              <Button variant="secondary" className="bg-white text-primary-700">
                <Phone className="w-4 h-4 mr-2" />
                Call Us
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}