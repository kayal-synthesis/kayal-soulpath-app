'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Scale, FileText, AlertCircle, CreditCard, Ban, Gavel, Shield, HelpCircle } from 'lucide-react'
import Link from 'next/link'

export default function TermsPage() {
  const lastUpdated = 'January 1, 2024'

  const sections = [
    {
      icon: FileText,
      title: 'Acceptance of Terms',
      content: `
        By accessing or using Kayal LifeOS, you agree to be bound by these Terms of Service. 
        If you do not agree to these terms, please do not use our services. We reserve the right 
        to modify these terms at any time, and your continued use constitutes acceptance of 
        updated terms.
      `
    },
    {
      icon: Scale,
      title: 'Eligibility',
      content: `
        You must be at least 13 years old to use our services. If you are between 13 and 18, 
        you must have parental consent. By using our services, you represent that you meet these 
        requirements and that all information you provide is accurate and complete.
      `
    },
    {
      icon: CreditCard,
      title: 'Subscriptions and Payments',
      content: `
        • All payments are processed securely through Stripe
        • Subscriptions auto-renew unless cancelled
        • Refunds are available within 30 days of purchase
        • Prices may change with 30 days notice
        • Free trials convert to paid subscriptions unless cancelled
        • You are responsible for all taxes
      `
    },
    {
      icon: Ban,
      title: 'Prohibited Conduct',
      content: `
        You agree not to:
        
        • Violate any laws or regulations
        • Infringe on intellectual property rights
        • Upload malicious code or attempt to hack our systems
        • Harass, abuse, or harm others
        • Impersonate any person or entity
        • Use our services for illegal purposes
        • Attempt to reverse engineer our algorithms
      `
    },
    {
      icon: Shield,
      title: 'Intellectual Property',
      content: `
        All content on Kayal LifeOS, including reports, images, logos, and software, is our 
        property or our licensors' and is protected by copyright and other laws. You may not 
        reproduce, distribute, or create derivative works without our express permission.
      `
    },
    {
      icon: AlertCircle,
      title: 'Disclaimer of Warranties',
      content: `
        Our services are provided "as is" without any warranties, express or implied. We do not 
        guarantee that:
        
        • Reports will be 100% accurate
        • Services will be uninterrupted or error-free
        • Results will meet your expectations
        • Any errors will be corrected
        
        Insights are for entertainment and personal growth purposes only.
      `
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-900 to-primary-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Gavel className="w-16 h-16 mx-auto mb-6 text-secondary-400" />
            <h1 className="text-4xl md:text-5xl font-serif mb-4">Terms of Service</h1>
            <p className="text-xl text-white/80">Last Updated: {lastUpdated}</p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Introduction */}
        <Card className="mb-8">
          <p className="text-neutral-600 leading-relaxed">
            These Terms of Service govern your use of Kayal LifeOS. Please read them carefully. 
            By accessing or using our services, you agree to be bound by these terms.
          </p>
        </Card>

        {/* Sections Grid */}
        <div className="grid gap-6 mb-8">
          {sections.map((section, index) => {
            const Icon = section.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-serif mb-3">{section.title}</h2>
                      <div className="text-neutral-600 whitespace-pre-line leading-relaxed">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Limitation of Liability */}
        <Card className="mb-8 bg-primary-50">
          <h2 className="text-xl font-serif mb-3">Limitation of Liability</h2>
          <p className="text-neutral-600 mb-4">
            To the maximum extent permitted by law, Kayal LifeOS shall not be liable for:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600">
            <li>Indirect, incidental, or consequential damages</li>
            <li>Loss of profits, data, or goodwill</li>
            <li>Damages exceeding the amount you paid us in the past 12 months</li>
            <li>Decisions you make based on our insights</li>
          </ul>
        </Card>

        {/* Indemnification */}
        <Card className="mb-8">
          <h2 className="text-xl font-serif mb-3">Indemnification</h2>
          <p className="text-neutral-600">
            You agree to indemnify and hold Kayal LifeOS harmless from any claims, damages, 
            or expenses arising from your violation of these terms or your use of our services.
          </p>
        </Card>

        {/* Termination */}
        <Card className="mb-8">
          <h2 className="text-xl font-serif mb-3">Termination</h2>
          <p className="text-neutral-600">
            We may terminate or suspend your account immediately, without prior notice, for 
            conduct that we believe violates these terms or is harmful to other users or our 
            business. You may terminate your account at any time from your account settings.
          </p>
        </Card>

        {/* Governing Law */}
        <Card className="mb-8">
          <h2 className="text-xl font-serif mb-3">Governing Law</h2>
          <p className="text-neutral-600">
            These terms shall be governed by the laws of California, without regard to its 
            conflict of law provisions. Any disputes shall be resolved in the courts of 
            San Francisco County.
          </p>
        </Card>

        {/* Contact */}
        <Card className="bg-gradient-to-r from-primary-50 to-secondary-50">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-serif">Questions?</h2>
          </div>
          <p className="text-neutral-600 mb-4">
            If you have any questions about these terms, please contact us:
          </p>
          <p className="text-sm">
            <strong>Email:</strong>{' '}
            <a href="mailto:legal@kayalsoulpath.com" className="text-primary-600 hover:underline">
              legal@kayalsoulpath.com
            </a>
          </p>
        </Card>
      </div>
    </div>
  )
}