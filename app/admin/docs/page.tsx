// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  BookOpen, FileText, Download, Search,
  ChevronRight, ExternalLink, Menu,
  Github, Twitter, Mail, Globe,
  Code, Terminal, Server, Database,
  Cloud, Lock, Users, ShoppingBag
} from 'lucide-react'

export default function DocsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sections = [
    {
      title: 'Getting Started',
      icon: BookOpen,
      pages: ['Introduction', 'Quick Start', 'Installation', 'Configuration']
    },
    {
      title: 'Core Concepts',
      icon: Code,
      pages: ['Architecture', 'Authentication', 'Database', 'API Basics']
    },
    {
      title: 'API Reference',
      icon: Terminal,
      pages: ['Authentication', 'Users', 'Purchases', 'Tools', 'Webhooks']
    },
    {
      title: 'Integration',
      icon: Cloud,
      pages: ['Supabase', 'Stripe', 'Resend', 'Vercel']
    },
    {
      title: 'Security',
      icon: Lock,
      pages: ['Authentication', 'Authorization', 'Data Protection', 'Compliance']
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Kayal LifeOS Documentation</h1>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-neutral-100 rounded-lg">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-neutral-100 rounded-lg">
                <Twitter className="w-5 h-5" />
              </a>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`w-64 bg-neutral-50 border-r fixed h-full overflow-y-auto lg:static transition-all ${
          sidebarOpen ? 'left-0' : '-left-64 lg:left-0'
        }`}>
          <div className="p-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search docs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg"
              />
            </div>

            {/* Navigation */}
            <nav className="space-y-6">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <div key={section.title}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-primary-600" />
                      <h3 className="font-medium text-sm">{section.title}</h3>
                    </div>
                    <ul className="space-y-1 ml-6">
                      {section.pages.map((page) => (
                        <li key={page}>
                          <a href="#" className="block text-sm text-neutral-600 hover:text-primary-600 py-1">
                            {page}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 lg:p-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">Welcome to the Documentation</h1>
            <p className="text-xl text-neutral-600 mb-8">
              Everything you need to integrate and build with Kayal LifeOS
            </p>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              <Card className="p-6 hover:shadow-lg transition cursor-pointer">
                <BookOpen className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="font-medium text-lg mb-2">Getting Started</h3>
                <p className="text-sm text-neutral-600">Learn the basics and set up your first integration</p>
              </Card>
              <Card className="p-6 hover:shadow-lg transition cursor-pointer">
                <Code className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="font-medium text-lg mb-2">API Reference</h3>
                <p className="text-sm text-neutral-600">Complete API documentation with examples</p>
              </Card>
              <Card className="p-6 hover:shadow-lg transition cursor-pointer">
                <Database className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="font-medium text-lg mb-2">Database Schema</h3>
                <p className="text-sm text-neutral-600">Understand the data structure and relationships</p>
              </Card>
              <Card className="p-6 hover:shadow-lg transition cursor-pointer">
                <Lock className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="font-medium text-lg mb-2">Security Guide</h3>
                <p className="text-sm text-neutral-600">Best practices for securing your integration</p>
              </Card>
            </div>

            {/* Popular Topics */}
            <h2 className="text-2xl font-bold mb-4">Popular Topics</h2>
            <div className="space-y-3 mb-12">
              {['Authentication', 'Webhooks', 'Rate Limits', 'Error Handling'].map((topic) => (
                <div key={topic} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm cursor-pointer">
                  <span className="font-medium">{topic}</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              ))}
            </div>

            {/* Need Help */}
            <Card className="p-6 bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
              <h3 className="font-medium text-lg mb-2">Need additional help?</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex gap-3">
                <Button>
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
                <Button variant="outline">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Join Discord
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}