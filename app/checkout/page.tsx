'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  Mail, 
  CreditCard, 
  Sparkles, 
  Lock, 
  Check,
  ArrowLeft,
  Heart,
  Briefcase,
  TrendingUp,
  Moon,
  Zap,
  Star,
  Crown,
  Clock,
  Headphones,
  Shield,
  Gift
} from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

// ============================================
// PRODUCT DATA (based on tool ID)
// ============================================

const productData: Record<string, any> = {
  'the-seer': {
    name: '🔮 THE SEER',
    description: 'Complete past-present-future analysis',
    price: 97,
    category: 'universal',
    icon: <Crown className="w-6 h-6" />,
    features: [
      'Past life analysis',
      'Present situation truth',
      'Future path predictions',
      'Personalized solutions'
    ]
  },
  'the-love-map': {
    name: '💞 THE LOVE MAP',
    description: 'Your complete love history',
    price: 47,
    category: 'love',
    icon: <Heart className="w-6 h-6" />,
    features: [
      'Past relationship patterns',
      'Current love truth',
      'Future soulmate timing',
      'Compatibility insights'
    ]
  },
  'the-wealth-code': {
    name: '💰 THE WEALTH CODE',
    description: 'Your financial destiny',
    price: 47,
    category: 'wealth',
    icon: <TrendingUp className="w-6 h-6" />,
    features: [
      'Money block identification',
      'Wealth window timing',
      'Investment guidance',
      'Abundance activation'
    ]
  },
  'the-life-map': {
    name: '🌟 THE LIFE MAP',
    description: 'Every life you\'ve ever lived',
    price: 47,
    category: 'life-path',
    icon: <Star className="w-6 h-6" />,
    features: [
      'Past life history',
      'Soul purpose',
      'Life lessons',
      'Future incarnations'
    ]
  },
  'the-destiny-code': {
    name: '⚡ THE DESTINY CODE',
    description: 'Change your fate',
    price: 47,
    category: 'life-path',
    icon: <Zap className="w-6 h-6" />,
    features: [
      'Fate analysis',
      'Choice points',
      'Destiny hacks',
      'Alternate futures'
    ]
  },
  'the-soul-contract': {
    name: '🔥 THE SOUL CONTRACT',
    description: 'Your pre-birth agreement',
    price: 47,
    category: 'spiritual',
    icon: <Sparkles className="w-6 h-6" />,
    features: [
      'Soul agreements',
      'Life missions',
      'Karmic debts',
      'Soul gifts'
    ]
  },
  'the-mirror': {
    name: '💫 THE MIRROR',
    description: 'See your true self',
    price: 37,
    category: 'spiritual',
    icon: <Moon className="w-6 h-6" />,
    features: [
      'True self revelation',
      'Blind spots',
      'Hidden gifts',
      'Integration path'
    ]
  }
}

// ============================================
// ELEGANT BACKGROUND
// ============================================

const ElegantBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
      <div className="absolute inset-0 opacity-[0.02]" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #5D3FD3 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} 
      />
      <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-primary-100/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-20 right-20 w-[600px] h-[600px] bg-secondary-100/20 rounded-full blur-[120px]" />
    </div>
  )
}

// ============================================
// PAYMENT METHOD CARD
// ============================================

interface PaymentMethodCardProps {
  method: 'card' | 'paypal' | 'apple'
  selected: boolean
  onClick: () => void
}

const PaymentMethodCard = ({ method, selected, onClick }: PaymentMethodCardProps) => {
  const getIcon = () => {
    switch(method) {
      case 'card':
        return <CreditCard className="w-5 h-5" />
      case 'paypal':
        return <span className="text-lg font-bold">Pay</span>
      case 'apple':
        return <span className="text-lg font-bold"></span>
    }
  }

  const getLabel = () => {
    switch(method) {
      case 'card': return 'Credit Card'
      case 'paypal': return 'PayPal'
      case 'apple': return 'Apple Pay'
    }
  }

  return (
    <div
      onClick={onClick}
      className={`flex-1 p-3 border rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all ${
        selected 
          ? 'border-primary-600 bg-primary-50' 
          : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
      }`}
    >
      {getIcon()}
      <span className="text-sm font-medium">{getLabel()}</span>
      {selected && <Check className="w-4 h-4 text-primary-600 ml-2" />}
    </div>
  )
}

// ============================================
// SUCCESS MODAL
// ============================================

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  email: string
  toolName: string
}

const SuccessModal = ({ isOpen, onClose, email, toolName }: SuccessModalProps) => {
  const [isVisible, setIsVisible] = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#5D3FD3', '#D4AF37', '#2E5C4E', '#9F7AEA']
      })
    }
  }, [isOpen])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-primary-900 to-primary-800 p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20"
          >
            <Sparkles className="w-10 h-10 text-secondary-400" />
          </motion.div>
          <h2 className="text-2xl font-serif text-white mb-2">Purchase Complete!</h2>
          <p className="text-white/80 text-sm">Your insights are ready</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-primary-50 p-4 rounded-lg">
            <p className="text-sm text-primary-700 mb-2">
              We've sent your report to:
            </p>
            <p className="text-base font-medium text-primary-900">{email}</p>
          </div>

          <p className="text-sm text-neutral-600">
            You'll receive an email with a download link and instructions to access your {toolName} report.
          </p>

          <Button fullWidth onClick={handleClose}>
            View My Report
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================
// MAIN CHECKOUT PAGE
// ============================================

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toolId = searchParams.get('tool') || 'the-seer'
  const { user } = useAnonymousStore()

  const [email, setEmail] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'apple'>('card')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveInfo, setSaveInfo] = useState(false)

  const product = productData[toolId] || productData['the-seer']

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid'
    }

    if (paymentMethod === 'card') {
      if (!cardNumber) {
        newErrors.cardNumber = 'Card number is required'
      } else if (cardNumber.replace(/\s/g, '').length < 16) {
        newErrors.cardNumber = 'Card number is invalid'
      }

      if (!cardExpiry) {
        newErrors.cardExpiry = 'Expiry date is required'
      } else if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        newErrors.cardExpiry = 'Use MM/YY format'
      }

      if (!cardCvc) {
        newErrors.cardCvc = 'CVC is required'
      } else if (cardCvc.length < 3) {
        newErrors.cardCvc = 'CVC is invalid'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(' ')
    } else {
      return value
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '')
    }
    return v
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)

    // Simulate payment processing
    setTimeout(() => {
      setIsLoading(false)
      setShowSuccess(true)
      
      // In a real app, you would:
      // 1. Process payment with Stripe
      // 2. Generate the report
      // 3. Send email with download link
      // 4. Save purchase to database
    }, 2000)
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    router.push('/dashboard')
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      love: 'bg-red-50 text-red-600',
      wealth: 'bg-green-50 text-green-600',
      spiritual: 'bg-purple-50 text-purple-600',
      'life-path': 'bg-primary-50 text-primary-600',
      universal: 'bg-indigo-50 text-indigo-600'
    }
    return colors[product.category] || 'bg-neutral-50 text-neutral-600'
  }

  return (
    <>
      <div className="min-h-screen relative overflow-hidden">
        <ElegantBackground />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 text-neutral-600 hover:text-primary-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Main Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Left Column - Checkout Form */}
            <div className="md:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6">
                  <h1 className="text-2xl font-serif mb-6">Complete Your Purchase</h1>

                  {/* User Info */}
                  {user && (
                    <div className="mb-6 p-4 bg-primary-50 rounded-lg flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-primary-900">
                          Welcome back, {user.name}!
                        </p>
                        <p className="text-xs text-primary-700">
                          Your insights will be linked to this session
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Email Section */}
                  <div className="mb-6">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary-600" />
                      Email for Receipt
                    </h2>
                    <div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          errors.email ? 'border-error-300' : 'border-neutral-200'
                        }`}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-error-600">{errors.email}</p>
                      )}
                      <p className="text-xs text-neutral-500 mt-2">
                        We'll send your report and receipt to this email
                      </p>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="mb-6">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary-600" />
                      Payment Method
                    </h2>
                    <div className="flex gap-3 mb-4">
                      <PaymentMethodCard
                        method="card"
                        selected={paymentMethod === 'card'}
                        onClick={() => setPaymentMethod('card')}
                      />
                      <PaymentMethodCard
                        method="paypal"
                        selected={paymentMethod === 'paypal'}
                        onClick={() => setPaymentMethod('paypal')}
                      />
                      <PaymentMethodCard
                        method="apple"
                        selected={paymentMethod === 'apple'}
                        onClick={() => setPaymentMethod('apple')}
                      />
                    </div>

                    {paymentMethod === 'card' && (
                      <div className="space-y-4">
                        <div>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            placeholder="Card number"
                            maxLength={19}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                              errors.cardNumber ? 'border-error-300' : 'border-neutral-200'
                            }`}
                          />
                          {errors.cardNumber && (
                            <p className="mt-1 text-xs text-error-600">{errors.cardNumber}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                              placeholder="MM/YY"
                              maxLength={5}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                errors.cardExpiry ? 'border-error-300' : 'border-neutral-200'
                              }`}
                            />
                            {errors.cardExpiry && (
                              <p className="mt-1 text-xs text-error-600">{errors.cardExpiry}</p>
                            )}
                          </div>
                          <div>
                            <input
                              type="text"
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                              placeholder="CVC"
                              maxLength={4}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                errors.cardCvc ? 'border-error-300' : 'border-neutral-200'
                              }`}
                            />
                            {errors.cardCvc && (
                              <p className="mt-1 text-xs text-error-600">{errors.cardCvc}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'paypal' && (
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <p className="text-sm text-blue-700">
                          You'll be redirected to PayPal to complete your payment
                        </p>
                      </div>
                    )}

                    {paymentMethod === 'apple' && (
                      <div className="p-4 bg-neutral-50 rounded-lg text-center">
                        <p className="text-sm text-neutral-700">
                          Pay with Apple Pay on your compatible device
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Save Info Checkbox */}
                  <div className="flex items-center gap-2 mb-6">
                    <input
                      type="checkbox"
                      id="saveInfo"
                      checked={saveInfo}
                      onChange={(e) => setSaveInfo(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="saveInfo" className="text-sm text-neutral-600">
                      Save my information for faster checkout next time
                    </label>
                  </div>

                  {/* Security Notice */}
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
                    <Lock className="w-4 h-4" />
                    <span>256-bit encrypted • Secure checkout</span>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmit}
                    loading={isLoading}
                    fullWidth
                    size="lg"
                  >
                    Pay ${product.price} - Complete Purchase
                  </Button>
                </Card>
              </motion.div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="md:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="sticky top-24"
              >
                <Card className="p-6">
                  <h2 className="text-lg font-medium mb-4">Order Summary</h2>

                  {/* Product Card */}
                  <div className="mb-4 p-4 bg-neutral-50 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${getCategoryColor(product.category)}`}>
                        {product.icon}
                      </div>
                      <div>
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-xs text-neutral-500">{product.description}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {product.features.map((feature: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <Check className="w-3 h-3 text-green-600 mt-0.5" />
                          <span className="text-neutral-600">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Subtotal</span>
                      <span className="font-medium">${product.price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Tax</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total</span>
                        <span className="text-xl font-serif text-primary-600">
                          ${product.price}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Money Back Guarantee */}
                  <div className="p-3 bg-green-50 rounded-lg flex items-start gap-2">
                    <Shield className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-green-700">
                      30-day money-back guarantee. Not satisfied? Get a full refund.
                    </p>
                  </div>

                  {/* Referral Reminder */}
                  {!user?.email && (
                    <div className="mt-4 p-3 bg-secondary-50 rounded-lg flex items-start gap-2">
                      <Gift className="w-4 h-4 text-secondary-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-secondary-700">
                        Want to earn from referrals?{' '}
                        <button
                          onClick={() => router.push('/register')}
                          className="font-medium hover:underline"
                        >
                          Create a referral account
                        </button>
                      </p>
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={handleSuccessClose}
        email={email}
        toolName={product.name}
      />
    </>
  )
}