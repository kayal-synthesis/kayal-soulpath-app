'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Shield, Eye, Lock, Database, Mail, Cookie, UserCheck, Bell } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
  const lastUpdated = 'January 1, 2024'

  const sections = [
    {
      icon: Eye,
      title: 'Information We Collect',
      content: `
        We collect information you provide directly to us, such as when you create an account, 
        upload images, or communicate with us. This may include:
        
        • Name, email address, and date of birth
        • Hand and face images for analysis
        • Payment information (processed securely by Stripe)
        • Communications with our support team
        • Referral information and social media handles
      `
    },
    {
      icon: Database,
      title: 'How We Use Your Information',
      content: `
        We use the information we collect to:
        
        • Provide, maintain, and improve our services
        • Generate personalized numerology, palmistry, and physiognomy reports
        • Process transactions and send related information
        • Send you technical notices, updates, and support messages
        • Respond to your comments and questions
        • Track and analyze usage trends
        • Personalize your experience
      `
    },
    {
      icon: Lock,
      title: 'Data Security',
      content: `
        We take the security of your personal information seriously. We implement industry-standard 
        security measures including:
        
        • 256-bit encryption for all data transmission
        • Secure data storage with regular backups
        • Regular security audits and penetration testing
        • Strict access controls for our employees
        • PCI compliance for payment processing
      `
    },
    {
      icon: Cookie,
      title: 'Cookies and Tracking',
      content: `
        We use cookies and similar tracking technologies to:
        
        • Keep you logged in to your account
        • Understand how you use our website
        • Remember your preferences
        • Deliver relevant advertisements
        • Analyze site traffic and usage patterns
        
        You can control cookies through your browser settings.
      `
    },
    {
      icon: Mail,
      title: 'Email Communications',
      content: `
        We may send you emails about:
        
        • Your account and transactions
        • New reports and insights
        • Product updates and features
        • Referral notifications
        • Promotional offers (you can opt out)
        
        You can unsubscribe from marketing emails at any time.
      `
    },
    {
      icon: UserCheck,
      title: 'Your Rights',
      content: `
        You have the right to:
        
        • Access your personal data
        • Correct inaccurate data
        • Delete your account and data
        • Export your data (GDPR)
        • Opt out of marketing
        • Object to data processing
        
        Contact us to exercise these rights.
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
            <Shield className="w-16 h-16 mx-auto mb-6 text-secondary-400" />
            <h1 className="text-4xl md:text-5xl font-serif mb-4">Privacy Policy</h1>
            <p className="text-xl text-white/80">Last Updated: {lastUpdated}</p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Introduction */}
        <Card className="mb-8">
          <p className="text-neutral-600 leading-relaxed">
            At Kayal LifeOS, we take your privacy seriously. This policy describes how we collect, 
            use, and protect your personal information. By using our services, you agree to the 
            practices described in this policy.
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

        {/* Data Sharing */}
        <Card className="mb-8 bg-primary-50">
          <h2 className="text-xl font-serif mb-3">Third-Party Sharing</h2>
          <p className="text-neutral-600 mb-4">
            We do not sell your personal information to third parties. We may share data with:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600">
            <li>Service providers who assist in operating our website and business (Stripe, AWS, etc.)</li>
            <li>Analytics providers to help us improve our services</li>
            <li>Law enforcement when required by law</li>
          </ul>
        </Card>

        {/* Children's Privacy */}
        <Card className="mb-8">
          <h2 className="text-xl font-serif mb-3">Children's Privacy</h2>
          <p className="text-neutral-600">
            Our services are not intended for individuals under 13. We do not knowingly collect 
            information from children under 13. If you believe we have collected information from 
            a child under 13, please contact us immediately.
          </p>
        </Card>

        {/* International Users */}
        <Card className="mb-8">
          <h2 className="text-xl font-serif mb-3">International Users</h2>
          <p className="text-neutral-600">
            By using our services, you consent to the transfer of your data to the United States 
            and other countries where we operate. We comply with GDPR for our European users and 
            provide the same privacy protections to all users regardless of location.
          </p>
        </Card>

        {/* Changes to Policy */}
        <Card className="mb-8">
          <h2 className="text-xl font-serif mb-3">Changes to This Policy</h2>
          <p className="text-neutral-600">
            We may update this privacy policy from time to time. We will notify you of any material 
            changes by posting the new policy on this page and updating the "Last Updated" date. 
            We encourage you to review this policy periodically.
          </p>
        </Card>

        {/* Contact */}
        <Card className="bg-gradient-to-r from-primary-50 to-secondary-50">
          <h2 className="text-xl font-serif mb-3">Contact Us</h2>
          <p className="text-neutral-600 mb-4">
            If you have questions about this privacy policy or how we handle your data, please contact us:
          </p>
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Email:</strong>{' '}
              <a href="mailto:privacy@kayalsoulpath.com" className="text-primary-600 hover:underline">
                privacy@kayalsoulpath.com
              </a>
            </p>
            <p className="text-sm">
              <strong>Mail:</strong> 123 Wisdom Way, San Francisco, CA 94105
            </p>
            <p className="text-sm">
              <strong>DPO:</strong> data.protection@kayalsoulpath.com
            </p>
          </div>
        </Card>

        {/* Footer Note */}
        <p className="text-xs text-center text-neutral-500 mt-8">
          By using Kayal LifeOS, you acknowledge that you have read and understood this privacy policy.
        </p>
      </div>
    </div>
  )
}