'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Cookie, Info, Settings, Check, X, Shield, Clock } from 'lucide-react'
import { toast } from 'sonner'

export default function CookiesPage() {
  const [preferences, setPreferences] = useState({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false
  })

  const cookieTypes = [
    {
      id: 'essential',
      name: 'Essential Cookies',
      description: 'Required for the website to function. Cannot be disabled.',
      icon: Shield,
      alwaysOn: true,
      cookies: [
        { name: 'session_id', purpose: 'Maintains your login session', duration: 'Session' },
        { name: 'csrf_token', purpose: 'Protects against cross-site request forgery', duration: 'Session' },
        { name: 'auth_token', purpose: 'Authenticates your requests', duration: '30 days' }
      ]
    },
    {
      id: 'functional',
      name: 'Functional Cookies',
      description: 'Remember your preferences and settings.',
      icon: Settings,
      cookies: [
        { name: 'theme', purpose: 'Saves your color theme preference', duration: '1 year' },
        { name: 'language', purpose: 'Remembers your language choice', duration: '1 year' },
        { name: 'sidebar_state', purpose: 'Remembers if sidebar is collapsed', duration: '1 year' }
      ]
    },
    {
      id: 'analytics',
      name: 'Analytics Cookies',
      description: 'Help us understand how visitors use our site.',
      icon: Clock,
      cookies: [
        { name: '_ga', purpose: 'Google Analytics - distinguishes users', duration: '2 years' },
        { name: '_gid', purpose: 'Google Analytics - tracks sessions', duration: '24 hours' },
        { name: '_gat', purpose: 'Google Analytics - throttles requests', duration: '1 minute' }
      ]
    },
    {
      id: 'marketing',
      name: 'Marketing Cookies',
      description: 'Track visitors across websites for advertising.',
      icon: Info,
      cookies: [
        { name: '_fbp', purpose: 'Facebook - ad targeting', duration: '3 months' },
        { name: 'ads_prefs', purpose: 'Stores your ad preferences', duration: '1 year' },
        { name: 'tracking_id', purpose: 'Tracks campaign effectiveness', duration: '1 year' }
      ]
    }
  ]

  const savePreferences = () => {
    toast.success('Cookie preferences saved!')
  }

  const acceptAll = () => {
    setPreferences({
      essential: true,
      functional: true,
      analytics: true,
      marketing: true
    })
    toast.success('All cookies accepted')
  }

  const rejectAll = () => {
    setPreferences({
      essential: true,
      functional: false,
      analytics: false,
      marketing: false
    })
    toast.success('Non-essential cookies rejected')
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-900 to-primary-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Cookie className="w-16 h-16 mx-auto mb-6 text-secondary-400" />
            <h1 className="text-4xl md:text-5xl font-serif mb-4">Cookie Policy</h1>
            <p className="text-xl text-white/80">How we use cookies and similar technologies</p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Introduction */}
        <Card className="mb-8">
          <p className="text-neutral-600 leading-relaxed">
            Kayal LifeOS uses cookies to enhance your experience, analyze site traffic, and 
            personalize content. This policy explains what cookies are, how we use them, and 
            how you can control them.
          </p>
        </Card>

        {/* Cookie Preferences */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif">Your Cookie Preferences</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={rejectAll}>
                <X className="w-4 h-4 mr-2" />
                Reject All
              </Button>
              <Button variant="secondary" size="sm" onClick={acceptAll}>
                <Check className="w-4 h-4 mr-2" />
                Accept All
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {cookieTypes.map((type) => {
              const Icon = type.icon
              return (
                <div key={type.id} className="border-b last:border-0 pb-6 last:pb-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">{type.name}</h3>
                        <p className="text-sm text-neutral-600">{type.description}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences[type.id as keyof typeof preferences]}
                        onChange={(e) => setPreferences({ ...preferences, [type.id]: e.target.checked })}
                        disabled={type.id === 'essential'}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        type.id === 'essential' 
                          ? 'bg-primary-600 cursor-not-allowed opacity-50'
                          : 'bg-neutral-200 peer-checked:bg-primary-600'
                      }`}></div>
                    </label>
                  </div>

                  {/* Cookie List */}
                  <div className="ml-13 mt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Cookie Name</th>
                          <th className="text-left py-2 font-medium">Purpose</th>
                          <th className="text-left py-2 font-medium">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {type.cookies.map((cookie, index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="py-2 font-mono text-xs">{cookie.name}</td>
                            <td className="py-2 text-xs text-neutral-600">{cookie.purpose}</td>
                            <td className="py-2 text-xs text-neutral-600">{cookie.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-6 border-t">
            <Button onClick={savePreferences} fullWidth>
              Save Preferences
            </Button>
          </div>
        </Card>

        {/* How to Control Cookies */}
        <Card className="mb-8">
          <h2 className="text-xl font-serif mb-4">How to Control Cookies</h2>
          <p className="text-neutral-600 mb-4">
            You can control cookies through your browser settings:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-neutral-600">
            <li>
              <strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data
            </li>
            <li>
              <strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data
            </li>
            <li>
              <strong>Safari:</strong> Preferences → Privacy → Cookies and website data
            </li>
            <li>
              <strong>Edge:</strong> Settings → Site permissions → Cookies and site data
            </li>
          </ul>
        </Card>

        {/* Updates */}
        <Card className="mb-8 bg-primary-50">
          <h2 className="text-xl font-serif mb-3">Updates to This Policy</h2>
          <p className="text-neutral-600">
            We may update this cookie policy from time to time. We will notify you of any 
            significant changes by posting a notice on our website or emailing you.
          </p>
        </Card>

        {/* Contact */}
        <Card>
          <h2 className="text-xl font-serif mb-3">Questions?</h2>
          <p className="text-neutral-600 mb-4">
            If you have any questions about our use of cookies, please contact us:
          </p>
          <p className="text-sm">
            <strong>Email:</strong>{' '}
            <a href="mailto:privacy@kayalsoulpath.com" className="text-primary-600 hover:underline">
              privacy@kayalsoulpath.com
            </a>
          </p>
        </Card>
      </div>
    </div>
  )
}