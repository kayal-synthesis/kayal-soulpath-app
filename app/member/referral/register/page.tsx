'use client'
import { Suspense } from 'react'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Gift, User, Mail, Lock, ArrowRight, CheckCircle,
  Sparkles, Users, DollarSign, TrendingUp, Info,
  ChevronRight, Target, Calendar, Award, AlertCircle,
  Crown, Loader2, Eye, EyeOff, Copy, Check,
  Phone, Twitter, Facebook, Linkedin, HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'
// Reads the 60-day attribution cookie set by app/ref/[code]/route.ts.
// Used as a fallback when someone registers without a ?ref= in the URL
// of that specific page load, having clicked a referral link days
// earlier and browsed before deciding to sign up.
const getRefCodeCookie = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )kayal_ref=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}
function ReferralRegisterPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  // The URL param takes priority when present, since it's the most direct
  // signal, but falls back to the cookie for anyone who clicked a link
  // and registered later without ?ref= on this specific page load.
  const referralCode = searchParams.get('ref') || getRefCodeCookie()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    agreeCommissionRules: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  // Updated commission tiers, rate determined by tool price
  const commissionTiers = [
    {
      label:      'Standard',
      sublabel:   'Automatic on sign-up, begins immediately',
      commission: '25% / 30%',
      detail:     'Low-ticket ($19–$29) 25% · High-ticket ($37–$79) 30%',
      color:      'bg-blue-50 text-blue-700',
      icon:       Target,
    },
    {
      label:      'Performance',
      sublabel:   '10+ sales in any rolling 30-day window',
      commission: '30% / 35%',
      detail:     'Low-ticket 30% · High-ticket 35% · Auto-upgraded',
      color:      'bg-purple-50 text-purple-700',
      icon:       TrendingUp,
    },
    {
      label:      'Strategic',
      sublabel:   'Platform owners & influencers · By application',
      commission: '35% / 40%',
      detail:     'Low-ticket 35% · High-ticket 40% · Negotiable',
      color:      'bg-amber-50 text-amber-700',
      icon:       Award,
    },
  ]
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format'
    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    if (!formData.agreeTerms) newErrors.agreeTerms = 'You must agree to the terms'
    if (!formData.agreeCommissionRules) newErrors.agreeCommissionRules = 'You must agree to commission rules'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  const handleSubmit = async () => {
    if (!validateForm()) return
    setIsLoading(true)
    try {
      const { data: existingAuthUser } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      }).catch(() => ({ data: { user: null } }))
      if (existingAuthUser?.user) {
        setErrors({ email: 'Email already registered' })
        setIsLoading(false)
        return
      }
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name:        formData.name,
            source:            'referral',
            // Real, live database trigger, on_auth_user_created, fires
            // the instant this call succeeds and creates the real
            // public.users row itself, including a genuine referral_code,
            // before any code below this line ever runs. Passing
            // affiliate_status here lets the trigger set it correctly
            // from the start. Set directly to 'active', not 'pending',
            // registration is fully automatic now, no approval step
            // exists anywhere to ever move someone forward, the same
            // real philosophy already applied to Strategic tier.
            affiliate_status: 'active',
          }
        }
      })
      if (authError) { console.error('Auth error:', authError); throw authError }
      if (!authData.user) throw new Error('No user created')
      // Real fix: the row already exists, created by the trigger above,
      // a second INSERT here would collide on the same real id. This is
      // now an UPDATE, filling in only what the trigger doesn't already
      // set, recruited_by specifically, the one real field this form
      // alone knows about.
      const { error: userError } = await supabase
        .from('users')
        .update({
          // This was being read from the URL and displayed in a badge, but
          // never actually saved, meaning recruitment attribution was
          // silently thrown away the moment an account was created, even
          // when the code was right there. Null is a normal, valid case:
          // most people register with no referrer at all, and become a
          // plain top-level affiliate on their own.
          recruited_by: referralCode || null,
        })
        .eq('token', authData.user.id)
      if (userError) { console.error('User insert error:', userError); throw userError }
      toast.success('Account created successfully!')
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })
      if (signInError) {
        toast.error('Account created but login failed. Please sign in manually.')
        router.push('/member/referral/login?registered=true')
        return
      }
      toast.success('Welcome to the Kayal LifeOS Affiliate Programme!')
      window.location.href = '/member/referral/dashboard'
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <Gift className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif mb-4">
            Join the Kayal LifeOS Affiliate Programme
          </h1>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Earn commission by sharing Kayal LifeOS with your audience.
            Rate is determined by the tool price, higher-priced tools earn more automatically.
          </p>
          {referralCode && (
            <Badge variant="primary" className="mt-4 px-4 py-2">
              Referral Code: {referralCode}
            </Badge>
          )}
        </motion.div>
        {/* Commission Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-3 gap-4 mb-8"
        >
          {commissionTiers.map((tier) => {
            const Icon = tier.icon
            return (
              <Card key={tier.label} className="p-5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${tier.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-lg mb-1">{tier.label}</h3>
                <p className="text-xs text-neutral-500 mb-3">{tier.sublabel}</p>
                <p className="text-2xl font-serif text-primary-600 mb-2">{tier.commission}</p>
                <p className="text-xs text-neutral-500">{tier.detail}</p>
              </Card>
            )
          })}
        </motion.div>
        {/* Terms Summary Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex flex-wrap gap-6 justify-center text-sm text-amber-800"
        >
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-amber-600" />
            <strong>First payout:</strong>&nbsp;5 qualifying points, no minimum amount
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-amber-600" />
            <strong>Recurring:</strong>&nbsp;$50 minimum · 15th of every month
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-amber-600" />
            <strong>Cookie window:</strong>&nbsp;60 days
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-amber-600" />
            <strong>Low-ticket sale:</strong>&nbsp;1.0 pt · <strong>High-ticket:</strong>&nbsp;1.5 pts
          </span>
        </motion.div>
        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-md mx-auto"
        >
          <Card className="p-6">
            <h2 className="text-xl font-serif mb-6">Create Your Account</h2>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Your name"
                  />
                </div>
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="your@email.com"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="Min. 8 characters"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPassword ? <EyeOff className="w-4 h-4 text-neutral-400" /> : <Eye className="w-4 h-4 text-neutral-400" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>
              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="Re-enter password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4 text-neutral-400" /> : <Eye className="w-4 h-4 text-neutral-400" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
              </div>
              {/* Checkboxes */}
              <div className="space-y-2">
                {/* Terms */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.agreeTerms}
                    onChange={(e) => setFormData({...formData, agreeTerms: e.target.checked})}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-xs text-neutral-600">
                    I agree to the <button className="text-primary-600 hover:underline">Terms of Service</button> and
                    <button className="text-primary-600 hover:underline ml-1">Privacy Policy</button>
                  </label>
                </div>
                {errors.agreeTerms && <p className="text-xs text-red-500">{errors.agreeTerms}</p>}
                {/* Commission rules */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="commissionRules"
                    checked={formData.agreeCommissionRules}
                    onChange={(e) => setFormData({...formData, agreeCommissionRules: e.target.checked})}
                    className="mt-1"
                  />
                  <label htmlFor="commissionRules" className="text-xs text-neutral-600">
                    I understand and agree to the commission structure:
                    <span className="block mt-1 text-primary-600 font-medium">
                      Standard: 25% low-ticket · 30% high-ticket
                    </span>
                    <span className="block text-primary-500 text-xs">
                      Performance (+5%): 30% low · 35% high, after 10 sales/30 days
                    </span>
                    <span className="block text-primary-500 text-xs">
                      Strategic (+10%): 35% low · 40% high, by application
                    </span>
                    <span className="block text-neutral-400 mt-1">
                      First payout: 5 points, no minimum · Recurring: $50 min, 15th monthly · 60-day cookie
                    </span>
                  </label>
                </div>
                {errors.agreeCommissionRules && <p className="text-xs text-red-500">{errors.agreeCommissionRules}</p>}
              </div>
              {/* Submit */}
              <Button onClick={handleSubmit} disabled={isLoading} fullWidth size="lg" className="mt-6">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Join the Affiliate Programme
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              <p className="text-center text-sm text-neutral-500 mt-4">
                Already have an account?{' '}
                <button onClick={() => router.push('/member/referral/login')} className="text-primary-600 hover:underline font-medium">
                  Sign in
                </button>
              </p>
              <p className="text-center text-xs text-neutral-400 mt-2">
                Questions? <a href="mailto:contact@kayalsoulpath.com" className="text-primary-500 hover:underline">contact@kayalsoulpath.com</a>
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
export default function ReferralRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ReferralRegisterPageInner />
    </Suspense>
  )
}
