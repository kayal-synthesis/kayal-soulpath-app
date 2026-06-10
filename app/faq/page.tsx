'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ChevronDown, Search, HelpCircle, Mail } from 'lucide-react'
import Link from 'next/link'

interface FAQItem {
  q: string
  a: string
  category: 'general' | 'reports' | 'account' | 'payments' | 'privacy'
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const categories = [
    { id: 'all', name: 'All', count: 20 },
    { id: 'general', name: 'General', count: 5 },
    { id: 'reports', name: 'Reports', count: 6 },
    { id: 'account', name: 'Account', count: 4 },
    { id: 'payments', name: 'Payments', count: 3 },
    { id: 'privacy', name: 'Privacy', count: 2 },
  ]

  const faqs: FAQItem[] = [
    {
      q: 'What is Kayal LifeOS?',
      a: 'Kayal LifeOS is a personal insight platform that combines numerology, palmistry, and physiognomy to provide you with deep, personalized insights about your life path, relationships, career, and more.',
      category: 'general'
    },
    {
      q: 'How accurate are the insights?',
      a: 'Our insights are based on thousands of years of traditional wisdom combined with modern AI analysis. While we strive for accuracy, these insights should be used as guidance and reflection tools, not absolute predictions.',
      category: 'general'
    },
    {
      q: 'Is my data secure?',
      a: 'Absolutely. We use bank-level encryption to protect your data. Your images and personal information are never shared with third parties without your explicit consent.',
      category: 'privacy'
    },
    {
      q: 'How many reports can I get?',
      a: 'Free users get 3 comprehensive reports. Premium members get access to all 72+ reports across all domains including love, career, wealth, and spirituality.',
      category: 'reports'
    },
    {
      q: 'Can I upload hand and face images?',
      a: 'Yes! Premium members can upload hand and face images for palmistry and physiognomy analysis. Free users can upgrade anytime to access these features.',
      category: 'reports'
    },
    {
      q: 'How do I cancel my subscription?',
      a: 'You can cancel anytime from your Account Settings. Go to Subscription and click "Cancel Subscription". Your access will continue until the end of your billing period.',
      category: 'payments'
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and Apple Pay. All payments are securely processed by Stripe.',
      category: 'payments'
    },
    {
      q: 'Do you offer refunds?',
      a: 'Yes! We offer a 30-day money-back guarantee. If you\'re not satisfied with your purchase, contact us within 30 days for a full refund.',
      category: 'payments'
    },
    {
      q: 'Can I change my email address?',
      a: 'Yes, you can update your email address in Account Settings under the Profile tab. You\'ll need to verify the new email address.',
      category: 'account'
    },
    {
      q: 'How does the referral program work?',
      a: 'Share your unique referral link with friends. When they sign up and make a purchase, you earn credits toward free reports and subscriptions.',
      category: 'general'
    }
  ]

  const toggleItem = (question: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(question)) {
        newSet.delete(question)
      } else {
        newSet.add(question)
      }
      return newSet
    })
  }

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-900 to-primary-800 text-white py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-serif mb-6"
          >
            Frequently Asked Questions
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-white/80 mb-8"
          >
            Find answers to common questions about Kayal LifeOS
          </motion.p>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-xl mx-auto"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                activeCategory === category.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border hover:bg-neutral-50'
              }`}
            >
              {category.name}
              <span className="ml-2 text-xs opacity-60">({category.count})</span>
            </button>
          ))}
        </div>

        {/* FAQs */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <Card className="text-center py-12">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-neutral-500 text-sm">
                Try different search terms or browse all categories
              </p>
            </Card>
          ) : (
            filteredFaqs.map((faq, index) => (
              <Card
                key={index}
                className="cursor-pointer hover:shadow-md transition"
                onClick={() => toggleItem(faq.q)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium pr-8">{faq.q}</h3>
                    <AnimatePresence>
                      {openItems.has(faq.q) && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-sm text-neutral-600 mt-3 pt-3 border-t"
                        >
                          {faq.a}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-neutral-400 transition-transform ${
                      openItems.has(faq.q) ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Still have questions */}
        <Card className="mt-12 text-center bg-gradient-to-r from-primary-50 to-secondary-50">
          <Mail className="w-12 h-12 mx-auto mb-4 text-primary-600" />
          <h3 className="text-xl font-serif mb-2">Still have questions?</h3>
          <p className="text-neutral-600 mb-6">
            Can't find what you're looking for? Reach out to our support team.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/contact">
              <Button>Contact Support</Button>
            </Link>
            <Button variant="outline" onClick={() => window.location.href = 'mailto:support@kayalsoulpath.com'}>
              Email Us
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}