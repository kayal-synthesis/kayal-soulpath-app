 'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Check, Star, Sparkles, Crown, HelpCircle } from 'lucide-react'

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly')

  const plans = [
    {
      name: 'Free',
      description: 'Perfect for getting started',
      price: { monthly: 0, yearly: 0 },
      features: [
        '3 free reports',
        'Basic numerology insights',
        'Daily guidance',
        'Share insights',
        'Email support'
      ],
      limitations: [
        'No palmistry analysis',
        'No face analysis',
        'Limited reports'
      ],
      cta: 'Get Started',
      popular: false,
      icon: Star
    },
    {
      name: 'Premium',
      description: 'Most popular choice',
      price: { monthly: 27, yearly: 270 },
      yearlySavings: 'Save $54',
      features: [
        'All 72+ reports',
        'Palmistry analysis',
        'Physiognomy analysis',
        'Unlimited insights',
        'Priority support',
        'PDF downloads',
        'Advanced compatibility'
      ],
      cta: 'Go Premium',
      popular: true,
      icon: Sparkles
    },
    {
      name: 'Lifetime',
      description: 'One-time payment',
      price: { monthly: 497, yearly: 497 },
      yearlySavings: 'Best value',
      features: [
        'All Premium features',
        'Lifetime updates',
        'VIP support',
        'Early access',
        'Custom reports',
        'API access',
        'White-label option'
      ],
      cta: 'Get Lifetime',
      popular: false,
      icon: Crown
    }
  ]

  const faqs = [
    {
      q: 'Can I upgrade or downgrade my plan?',
      a: 'Yes, you can change your plan at any time. Changes will be applied to your next billing cycle.'
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept all major credit cards, PayPal, and Apple Pay. All payments are securely processed by Stripe.'
    },
    {
      q: 'Is there a money-back guarantee?',
      a: 'Yes! We offer a 30-day money-back guarantee. If you\'re not satisfied, we\'ll refund your purchase.'
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Absolutely. You can cancel your subscription at any time from your account settings.'
    }
  ]

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-900 to-primary-800 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-serif mb-6"
          >
            Simple, Transparent Pricing
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-white/80 max-w-2xl mx-auto"
          >
            Choose the plan that's right for your journey
          </motion.p>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="flex justify-center mb-12">
          <div className="bg-white p-1 rounded-full shadow-lg inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-600 hover:text-primary-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-600 hover:text-primary-600'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => {
            const Icon = plan.icon
            const price = plan.price[billingCycle]
            
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative h-full flex flex-col ${
                  plan.popular ? 'border-2 border-primary-600 shadow-xl scale-105' : ''
                }`}>
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="bg-secondary-500 text-neutral-900 px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                      plan.popular ? 'bg-primary-100' : 'bg-neutral-100'
                    }`}>
                      <Icon className={`w-8 h-8 ${
                        plan.popular ? 'text-primary-600' : 'text-neutral-600'
                      }`} />
                    </div>
                    <h3 className="text-2xl font-serif mb-2">{plan.name}</h3>
                    <p className="text-neutral-600 text-sm">{plan.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    <span className="text-4xl font-serif font-bold">${price}</span>
                    {price > 0 && (
                      <span className="text-neutral-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                    )}
                    {plan.yearlySavings && billingCycle === 'yearly' && (
                      <p className="text-sm text-success mt-1">{plan.yearlySavings}</p>
                    )}
                  </div>

                  <div className="flex-1 space-y-4 mb-8">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-success flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations?.map((limitation) => (
                      <div key={limitation} className="flex items-start gap-2 text-neutral-400">
                        <span className="w-5 h-5 flex-shrink-0 text-center">•</span>
                        <span className="text-sm">{limitation}</span>
                      </div>
                    ))}
                  </div>

                  <Link href={price === 0 ? '/register' : '/checkout'}>
                    <Button 
                      variant={plan.popular ? 'primary' : 'outline'} 
                      fullWidth
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-serif text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium mb-2">{faq.q}</h3>
                    <p className="text-sm text-neutral-600">{faq.a}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Guarantee */}
        <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 text-center mb-16">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-serif mb-2">30-Day Money-Back Guarantee</h3>
            <p className="text-neutral-600 max-w-2xl">
              If you're not completely satisfied with your purchase, let us know within 30 days 
              and we'll refund your payment — no questions asked.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}