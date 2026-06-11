export const dynamic = 'force-dynamic'
'use client'

import { useState } from 'react'
import { 
  HelpCircle, 
  Mail, 
  MessageCircle, 
  FileText, 
  ChevronRight,
  Search,
  BookOpen,
  Video,
  Headphones,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  Star,
  TrendingUp,
  Heart,
  Users,
  Settings,
  Shield,
  CreditCard,
  Download
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardHelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [
    { id: 'all', name: 'All Topics', icon: HelpCircle },
    { id: 'getting-started', name: 'Getting Started', icon: Star },
    { id: 'readings', name: 'Readings & Insights', icon: TrendingUp },
    { id: 'account', name: 'Account & Billing', icon: Settings },
    { id: 'privacy', name: 'Privacy & Security', icon: Shield },
    { id: 'community', name: 'Community', icon: Users }
  ]

  const faqs = [
    {
      question: "How do I get started with Kayal LifeOS?",
      answer: "Getting started is easy! First, complete your profile setup by going to Profile → Edit Profile. Then explore the dashboard to access various tools and insights. We recommend starting with your first reading to see how things work.",
      category: "getting-started",
      helpful: 245,
      views: 1234
    },
    {
      question: "What types of readings are available?",
      answer: "We offer various readings including:\n• Love & Relationships\n• Career & Wealth\n• Life Path & Destiny\n• Health & Wellness\n• Spiritual Guidance\n• Daily Oracle\nEach reading provides personalized insights based on your unique energy signature.",
      category: "readings",
      helpful: 189,
      views: 892
    },
    {
      question: "How do I upgrade my membership?",
      answer: "To upgrade your membership:\n1. Click on your profile avatar\n2. Select 'Settings'\n3. Go to 'Billing & Subscriptions'\n4. Choose your desired plan\n5. Enter payment details\nYour account will be upgraded immediately upon successful payment.",
      category: "account",
      helpful: 567,
      views: 2341
    },
    {
      question: "Is my data secure and private?",
      answer: "Yes! We take security and privacy very seriously. All your readings and personal information are:\n• Encrypted using industry-standard AES-256\n• Never shared with third parties\n• Stored securely on protected servers\n• Only accessible by you\nYou can read our full Privacy Policy for more details.",
      category: "privacy",
      helpful: 423,
      views: 1876
    },
    {
      question: "How do I reset my password?",
      answer: "To reset your password:\n1. Click on 'Forgot Password' on the login page\n2. Enter your email address\n3. Check your email for a reset link\n4. Click the link and create a new password\n5. Log in with your new password\nContact support if you don't receive the email.",
      category: "account",
      helpful: 892,
      views: 3456
    },
    {
      question: "Can I get a refund?",
      answer: "We offer a 14-day money-back guarantee for all subscription plans. To request a refund:\n1. Go to Settings → Billing\n2. Click 'Request Refund'\n3. Select the reason for refund\n4. Submit the request\nRefunds are processed within 5-7 business days.",
      category: "account",
      helpful: 234,
      views: 987
    },
    {
      question: "How do I share my readings with others?",
      answer: "You can share your readings by:\n1. Opening any completed reading\n2. Clicking the 'Share' button\n3. Choose to share via link, email, or social media\n4. Set permissions (view only or comment)\n5. Copy the generated link\nShared readings maintain your privacy by not sharing personal details.",
      category: "readings",
      helpful: 178,
      views: 654
    },
    {
      question: "What is the Daily Oracle?",
      answer: "The Daily Oracle is your personalized daily guidance tool. It provides:\n• A unique message each day\n• Actionable insights for your journey\n• Affirmations and meditations\n• Progress tracking\nAccess it from the main dashboard every day for fresh insights!",
      category: "readings",
      helpful: 456,
      views: 2100
    },
    {
      question: "How do I join the community?",
      answer: "To join our community:\n1. Click on 'Community' in the main navigation\n2. Create your profile (one-time setup)\n3. Browse discussion topics\n4. Join groups matching your interests\n5. Start posting and connecting!\nOur community is free for all members.",
      category: "community",
      helpful: 234,
      views: 1100
    },
    {
      question: "Can I download my reading history?",
      answer: "Yes! To download your reading history:\n1. Go to 'My Readings' section\n2. Click the 'Export' button\n3. Choose format (PDF, JSON, or CSV)\n4. Select date range\n5. Click 'Download'\nYour data will be prepared and downloaded automatically.",
      category: "account",
      helpful: 167,
      views: 789
    }
  ]

  const supportOptions = [
    {
      title: "Email Support",
      description: "Get response within 24 hours",
      icon: Mail,
      action: "/contact",
      buttonText: "Send Email"
    },
    {
      title: "Live Chat",
      description: "Available 9 AM - 6 PM EST",
      icon: MessageCircle,
      action: "/chat/support",
      buttonText: "Start Chat"
    },
    {
      title: "Documentation",
      description: "Detailed guides and tutorials",
      icon: BookOpen,
      action: "/docs",
      buttonText: "Read Docs"
    },
    {
      title: "Video Tutorials",
      description: "Watch step-by-step guides",
      icon: Video,
      action: "/tutorials",
      buttonText: "Watch Videos"
    }
  ]

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Help & Support Center</h1>
            <p className="text-xl opacity-90 mb-8">Find answers, get support, and learn more about Kayal LifeOS</p>
            
            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for help articles, tutorials, and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-gray-900 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">24/7</div>
            <div className="text-sm text-gray-600">Support Available</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">&lt; 24h</div>
            <div className="text-sm text-gray-600">Response Time</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">98%</div>
            <div className="text-sm text-gray-600">Satisfaction Rate</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">10k+</div>
            <div className="text-sm text-gray-600">Happy Users</div>
          </div>
        </div>

        {/* Support Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {supportOptions.map((option, index) => {
            const Icon = option.icon
            return (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{option.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{option.description}</p>
                <Link
                  href={option.action}
                  className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700"
                >
                  {option.buttonText}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )
          })}
        </div>

        {/* Help Categories */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-xl font-semibold text-gray-900">Frequently Asked Questions</h2>
            <p className="text-gray-600 text-sm mt-1">
              {filteredFaqs.length} articles found
            </p>
          </div>
          
          {filteredFaqs.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try adjusting your search or browse by category</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredFaqs.map((faq, index) => (
                <details key={index} className="group">
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-4 hover:bg-gray-50 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-medium text-gray-900">{faq.question}</span>
                        {faq.helpful > 100 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>👁 {faq.views} views</span>
                        <span>👍 {faq.helpful} found helpful</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-6 pb-4 text-gray-600 border-t border-gray-100 pt-4">
                    <div className="whitespace-pre-wrap">{faq.answer}</div>
                    <div className="mt-4 flex items-center gap-3">
                      <button className="text-sm text-green-600 hover:text-green-700">
                        👍 Yes, helpful
                      </button>
                      <button className="text-sm text-red-600 hover:text-red-700">
                        👎 No, not helpful
                      </button>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        {/* Still Need Help Section */}
        <div className="mt-12">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Still need help?</h3>
            <p className="text-gray-600 mb-6">Our support team is ready to assist you with any questions</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </Link>
              <button
                onClick={() => window.open('https://status.kayal.com', '_blank')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Check System Status
              </button>
            </div>
          </div>
        </div>

        {/* Popular Resources */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/docs/getting-started" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">Getting Started Guide</p>
                <p className="text-sm text-gray-500">Learn the basics</p>
              </div>
            </Link>
            <Link href="/tutorials/video" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition">
              <Video className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">Video Tutorials</p>
                <p className="text-sm text-gray-500">Watch & learn</p>
              </div>
            </Link>
            <Link href="/api-status" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">API Status</p>
                <p className="text-sm text-gray-500">System uptime</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}