'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { useUserStore } from '@/lib/store/userStore'
import { useReferralStore } from '@/lib/store/referralStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  User, 
  Mail, 
  Lock, 
  Gift, 
  Sparkles, 
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Heart,
  Copy,
  Share2
} from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { api } from '@/lib/api/client'

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
// PASSWORD STRENGTH INDICATOR
// ============================================

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const getStrength = () => {
    if (!password) return 0
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }

  const strength = getStrength()
  const strengthText = ['Weak', 'Fair', 'Good', 'Strong']
  const strengthColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500'
  ]

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1 h-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-300 ${
              i < strength ? strengthColors[strength - 1] : 'bg-neutral-200'
            }`}
          />
        ))}
      </div>
      {password && (
        <p className={`text-xs ${strength > 0 ? 'text-green-600' : 'text-neutral-500'}`}>
          Password strength: {strengthText[strength - 1] || 'Too weak'}
        </p>
      )}
    </div>
  )
}

// ============================================
// SUCCESS MODAL - With Referral Link
// ============================================

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  referralLink: string
  onCopyLink: () => void
  onShare: () => void
}

const SuccessModal = ({ isOpen, onClose, userName, referralLink, onCopyLink, onShare }: SuccessModalProps) => {
  const [isVisible, setIsVisible] = useState(isOpen)
  const [copied, setCopied] = useState(false)

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

  const handleCopy = () => {
    onCopyLink()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
            <Gift className="w-10 h-10 text-secondary-400" />
          </motion.div>
          <h2 className="text-2xl font-serif text-white mb-2">Welcome to the Circle!</h2>
          <p className="text-white/80 text-sm">Your referral account is ready</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-lg">
            <Heart className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-primary-700">
              <span className="font-medium">{userName}</span>, you're now part of our referral community. 
              Share your unique link and earn rewards when friends discover their own insights.
            </p>
          </div>

          {/* Referral Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Your Referral Link</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="w-full px-3 py-2 bg-neutral-50 border rounded-lg text-sm pr-10"
                />
                <button
                  onClick={handleCopy}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-200 rounded transition"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <Button size="sm" onClick={onShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          <div className="space-y-2 bg-neutral-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Check className="w-4 h-4 text-green-600" />
              <span>Earn 10-30% commission on referrals</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Check className="w-4 h-4 text-green-600" />
              <span>Get paid every 15 days after 5 sales</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Check className="w-4 h-4 text-green-600" />
              <span>Track earnings in real-time dashboard</span>
            </div>
          </div>

          <Button fullWidth onClick={handleClose}>
            Go to Referral Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================
// MAIN REGISTER PAGE
// ============================================

export default function RegisterPage() {
  const router = useRouter()
  const { user: anonymousUser } = useAnonymousStore()
  const { setUser, setToken } = useUserStore()
  const { setLink } = useReferralStore()
  
  const [formData, setFormData] = useState({
    name: anonymousUser?.name || '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [referralLink, setReferralLink] = useState('')
  const [copied, setCopied] = useState(false)

  // Pre-fill name from anonymous session
  useEffect(() => {
    if (anonymousUser?.name && !formData.name) {
      setFormData(prev => ({ ...prev, name: anonymousUser.name || '' }))
    }
  }, [anonymousUser, formData.name])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Must contain at least one uppercase letter'
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Must contain at least one number'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    const shareText = encodeURIComponent(`Join me on Kayal LifeOS and discover your true self! Use my referral link: ${referralLink}`)
    window.open(`https://wa.me/?text=${shareText}`, '_blank')
    confetti({
      particleCount: 20,
      spread: 40,
      origin: { y: 0.6 },
      colors: ['#5D3FD3', '#D4AF37']
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)

    try {
      // 1. Register user with backend
      const registerResponse = await api.post('/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        anonymousSessionId: anonymousUser?.sessionId // Link anonymous data
      })

      const { user, token } = registerResponse.data

      // 2. Store user in Zustand
      setUser(user)
      setToken(token)

      // 3. Generate referral link
      const username = formData.name.toLowerCase().replace(/\s+/g, '')
      const randomStr = Math.random().toString(36).substring(2, 8)
      const generatedLink = `https://kayal.life/r/${username}-${randomStr}`
      
      // 4. Save referral link to store
      setLink(generatedLink)
      setReferralLink(generatedLink)

      // 5. Show success modal
      setShowSuccess(true)

    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error('Registration failed', {
        description: error.response?.data?.message || 'Please try again'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    router.push('/referral') // Redirect to referral dashboard
  }

  return (
    <>
      <div className="min-h-screen relative overflow-hidden">
        <ElegantBackground />
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <span className="text-4xl font-serif text-primary-900">☾</span>
              <h1 className="text-xl font-serif text-primary-900 mt-2">Kayal LifeOS</h1>
            </motion.div>

            {/* Register Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="bg-white/90 backdrop-blur-sm border-neutral-200/60 shadow-xl">
                <div className="p-6">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Gift className="w-8 h-8 text-primary-600" />
                    </div>
                    <h2 className="text-2xl font-serif text-primary-900 mb-2">
                      Create Referral Account
                    </h2>
                    <p className="text-sm text-neutral-600">
                      Join our community and earn rewards when friends discover their insights
                    </p>
                  </div>

                  {/* Pre-fill Notice */}
                  {anonymousUser?.name && (
                    <div className="mb-6 p-3 bg-primary-50 rounded-lg flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-primary-700">
                        We've pre-filled your name from your earlier visit. Complete the form to start earning!
                      </p>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                            errors.name ? 'border-error-300' : 'border-neutral-200'
                          }`}
                          placeholder="Enter your full name"
                        />
                      </div>
                      {errors.name && (
                        <p className="mt-1 text-xs text-error-600">{errors.name}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                            errors.email ? 'border-error-300' : 'border-neutral-200'
                          }`}
                          placeholder="you@example.com"
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-xs text-error-600">{errors.email}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                            errors.password ? 'border-error-300' : 'border-neutral-200'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <PasswordStrengthIndicator password={formData.password} />
                      {errors.password && (
                        <p className="mt-1 text-xs text-error-600">{errors.password}</p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                            errors.confirmPassword ? 'border-error-300' : 'border-neutral-200'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-xs text-error-600">{errors.confirmPassword}</p>
                      )}
                    </div>

                    {/* Terms */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="terms" className="text-xs text-neutral-600">
                        I agree to the{' '}
                        <Link href="/terms" className="text-primary-600 hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-primary-600 hover:underline">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>
                    {errors.terms && (
                      <p className="text-xs text-error-600">{errors.terms}</p>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      fullWidth
                      loading={isLoading}
                      className="mt-6"
                    >
                      Create Referral Account
                    </Button>
                  </form>

                  {/* Login Link */}
                  <div className="mt-6 text-center text-sm text-neutral-600">
                    Already have an account?{' '}
                    <Link href="/login" className="text-primary-600 hover:underline font-medium">
                      Sign in
                    </Link>
                  </div>

                  {/* Benefits */}
                  <div className="mt-6 pt-6 border-t border-neutral-200">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <Shield className="w-4 h-4 mx-auto mb-1 text-primary-600" />
                        <span className="text-neutral-600">Secure</span>
                      </div>
                      <div>
                        <Gift className="w-4 h-4 mx-auto mb-1 text-secondary-600" />
                        <span className="text-neutral-600">Earn 10-30%</span>
                      </div>
                      <div>
                        <Heart className="w-4 h-4 mx-auto mb-1 text-rose-500" />
                        <span className="text-neutral-600">Share with friends</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center text-xs text-neutral-400"
            >
              <span className="mx-2">🔒 256-bit encryption</span>
              <span className="mx-2">✨ 50k+ members</span>
              <span className="mx-2">⭐ 4.9/5</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={handleSuccessClose}
        userName={formData.name.split(' ')[0]}
        referralLink={referralLink}
        onCopyLink={handleCopyLink}
        onShare={handleShare}
      />
    </>
  )
}