'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ImageUploader } from '@/components/ui/ImageUploader'
import {
  ArrowLeft, Shield, CreditCard, CheckCircle, AlertCircle,
  Camera, Loader2, Star, Crown, Clock, Mic, BookOpen,
  Mail, User, Key, Tag, X, Zap, Gift, Heart, TrendingUp,
  Moon, Infinity, ChevronDown, ChevronUp,
} from 'lucide-react'

import { omniTools }         from '@/lib/constants/omni-seer-tools'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'
import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'

const allTools = [
  ...omniTools, ...timeKeeperTools, ...voiceTools, ...loveTools,
  ...wealthTools, ...wellnessTools, ...lifePathTools, ...sacredScriptTools,
]

const domainDestinations: Record<string, string> = {
  'oracle-temple': 'report',
  'time-keeper':   'reading',
  'voice':         'audio',
  'love':          'report',
  'wealth':        'report',
  'wellness':      'report',
  'life-path':     'report',
  'sacred-script': 'chat',
}

const categoryColors: Record<string, string> = {
  'love':          'text-red-600 bg-red-50',
  'wealth':        'text-green-600 bg-green-50',
  'wellness':      'text-purple-600 bg-purple-50',
  'life-path':     'text-orange-600 bg-orange-50',
  'oracle-temple': 'text-indigo-600 bg-indigo-50',
  'time-keeper':   'text-teal-600 bg-teal-50',
  'voice':         'text-violet-600 bg-violet-50',
  'sacred-script': 'text-amber-600 bg-amber-50',
}

const categoryIcons: Record<string, any> = {
  'love':          Heart,
  'wealth':        TrendingUp,
  'wellness':      Moon,
  'life-path':     Star,
  'oracle-temple': Crown,
  'time-keeper':   Clock,
  'voice':         Mic,
  'sacred-script': BookOpen,
}

const getDeviceId = () => {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('kayal_device_id')
  if (!id) {
    id = 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('kayal_device_id', id)
  }
  return id
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function PurchasePage() {
  const params   = useParams()
  const router   = useRouter()
  const supabase = createClient()
  const { user: anonymousUser, hasCompletedOnboarding } = useAnonymousStore()

  const toolId = params.toolId as string
  const tool   = allTools.find(t => t.id === toolId) as any

  const fullName      = anonymousUser?.name          || ''
  const userDob       = anonymousUser?.dob           || ''
  const userBirthTime = anonymousUser?.birthTime     || ''
  const userBirthLoc  = anonymousUser?.birthLocation || ''

  const [loggedInUser,   setLoggedInUser]   = useState<any>(null)
  const [currentStep,    setCurrentStep]    = useState<'images'|'payment'|'account'|'upsell'>('images')
  const [isProcessing,   setIsProcessing]   = useState(false)
  const [purchaseError,  setPurchaseError]  = useState('')
  const [agreedToTerms,  setAgreedToTerms]  = useState(false)
  const [showSummary,    setShowSummary]    = useState(false)

  const [uploadedImages, setUploadedImages] = useState<{
    face?: File; 'palm-left'?: File; 'palm-right'?: File
  }>({})
  const [facePreview,      setFacePreview]      = useState<string|null>(null)
  const [palmLeftPreview,  setPalmLeftPreview]  = useState<string|null>(null)
  const [palmRightPreview, setPalmRightPreview] = useState<string|null>(null)

  const [partnerName, setPartnerName] = useState('')
  const [partnerDob,  setPartnerDob]  = useState('')

  const [couponCode,       setCouponCode]       = useState('')
  const [appliedCoupon,    setAppliedCoupon]    = useState<any>(null)
  const [couponError,      setCouponError]      = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [finalPrice,       setFinalPrice]       = useState(tool?.price || 0)
  const [originalPrice]                         = useState(tool?.price || 0)

  const [name,           setName]           = useState(fullName)
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [emailError,     setEmailError]     = useState('')
  const [passwordError,  setPasswordError]  = useState('')
  const [accountLoading, setAccountLoading] = useState(false)

  const [jobId,       setJobId]       = useState<string|null>(null)
  const [upsellTools, setUpsellTools] = useState<any[]>([])

  useEffect(() => {
    if (!hasCompletedOnboarding()) router.push('/onboarding/basic')
  }, [hasCompletedOnboarding, router])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setLoggedInUser(user)
        setEmail(user.email || '')
        setName(user.user_metadata?.name || fullName)
      }
    })
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem(`kayal_reading_${toolId}`)
    if (saved) {
      const d = JSON.parse(saved)
      if (d.partnerName) setPartnerName(d.partnerName)
      if (d.partnerDob)  setPartnerDob(d.partnerDob)
    }
    const requiresImg = !!(tool?.requiresImage || tool?.requires_image)
    if (!requiresImg) setCurrentStep('payment')
  }, [toolId, tool])

  useEffect(() => {
    if (currentStep === 'upsell' && tool) {
      const domain = tool.domain || tool.category || ''
      const complementary = allTools
        .filter(t => t.id !== toolId && (t.domain === domain || t.category === domain) && t.price <= originalPrice * 1.5)
        .slice(0, 3)
      setUpsellTools(complementary)
    }
  }, [currentStep, tool, toolId, originalPrice])

  if (!tool) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="p-8 text-center max-w-md w-full">
          <h2 className="text-2xl font-serif mb-4">Tool Not Found</h2>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </div>
    )
  }

  const requiresImage  = tool.requiresImage || tool.requires_image
  const requiresImages = !!requiresImage
  const domain         = tool.domain || tool.category || 'oracle-temple'
  const destination    = domainDestinations[domain] || 'report'
  const isSub          = !!(tool.isSubscription || tool.is_subscription)
  const categoryColor  = categoryColors[domain] || 'text-indigo-600 bg-indigo-50'
  const CategoryIcon   = categoryIcons[domain]  || Crown
  const savings        = originalPrice - finalPrice
  const hasDiscount    = savings > 0

  const checkUploadsComplete = () => {
    if (!requiresImages || !requiresImage) return true
    if (requiresImage.type === 'face') return !!uploadedImages.face
    if (requiresImage.type === 'palm') return !!uploadedImages['palm-left'] && !!uploadedImages['palm-right']
    if (requiresImage.type === 'both') return !!uploadedImages.face && !!uploadedImages['palm-left'] && !!uploadedImages['palm-right']
    return true
  }

  const handleImageCapture = (file: File, type: 'face'|'palm-left'|'palm-right') => {
    setUploadedImages(prev => ({ ...prev, [type]: file }))
    const url = URL.createObjectURL(file)
    if (type === 'face')       setFacePreview(url)
    if (type === 'palm-left')  setPalmLeftPreview(url)
    if (type === 'palm-right') setPalmRightPreview(url)
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setValidatingCoupon(true)
    setCouponError('')
    try {
      const res  = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, toolId }),
      })
      const data = await res.json()
      if (data.valid && data.coupon) {
        setAppliedCoupon(data.coupon)
        let price = originalPrice
        if (data.coupon.discount_type === 'percentage') price = originalPrice * (1 - data.coupon.discount_value / 100)
        else if (data.coupon.discount_type === 'fixed') price = Math.max(originalPrice - data.coupon.discount_value, 0)
        setFinalPrice(price)
      } else {
        setCouponError(data.error || 'Invalid coupon')
      }
    } catch {
      setCouponError('Error validating coupon')
    } finally {
      setValidatingCoupon(false)
    }
  }

  const submitReadingJob = async (): Promise<string|null> => {
    const form = new FormData()
    form.append('full_name',     fullName)
    form.append('date_of_birth', userDob)
    form.append('tool_id',       tool.id)
    form.append('user_token',    loggedInUser?.id || getDeviceId())
    if (userBirthTime) form.append('birth_time',     userBirthTime)
    if (userBirthLoc)  form.append('birth_location', userBirthLoc)
    if (partnerName)   form.append('partner_name',   partnerName)
    if (partnerDob)    form.append('partner_dob',    partnerDob)
    if (email)         form.append('email',          email)
    if (uploadedImages.face)          form.append('facial_image',    uploadedImages.face)
    if (uploadedImages['palm-left'])  form.append('palm_image_left', uploadedImages['palm-left'])
    if (uploadedImages['palm-right']) form.append('palm_image_right',uploadedImages['palm-right'])

    const res  = await fetch('/api/reading/submit', { method: 'POST', body: form })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Submission failed: ${res.status}`)
    }
    const data = await res.json()
    return data.job_id || null
  }

  const savePurchase = async (userId: string, jId: string|null) => {
    await fetch('/api/user/add-purchase', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId, toolId: tool.id, toolName: tool.name,
        toolType: destination, category: domain, destination,
        emoji: tool.emoji || 'ðŸ“¦', price: finalPrice, originalPrice,
        couponCode: appliedCoupon?.code || null, name, email,
        job_id: jId, purchaseDate: new Date().toISOString(),
      }),
    })
  }

  const handlePurchase = async () => {
    setPurchaseError('')
    if (!agreedToTerms) { setPurchaseError('Please agree to the Terms of Service to continue.'); return }
    if (!email || !EMAIL_RE.test(email)) { setPurchaseError('A valid email is required to receive your reading.'); return }
    setIsProcessing(true)
    try {
      await new Promise(r => setTimeout(r, 1500))
      const newJobId = await submitReadingJob()
      setJobId(newJobId)
      if (loggedInUser) {
        await savePurchase(loggedInUser.id, newJobId)
        setCurrentStep('upsell')
      } else {
        setCurrentStep('account')
      }
    } catch (err: any) {
      setPurchaseError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCreateAccount = async () => {
    setEmailError('')
    setPasswordError('')
    if (!name.trim()) return
    if (!EMAIL_RE.test(email)) { setEmailError('Valid email required'); return }
    if (password.length < 8)  { setPasswordError('Password must be at least 8 characters'); return }
    setAccountLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name, dob: userDob } },
      })
      if (error) throw error
      if (data.user) {
        localStorage.setItem('kayal_trusted_device', 'true')
        localStorage.setItem('kayal_user_email', email)
        await savePurchase(data.user.id, jobId)
        await fetch('/api/email/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, toolName: tool.name }),
        }).catch(() => {})
        await supabase.auth.signInWithPassword({ email, password })
        setCurrentStep('upsell')
      }
    } catch (err: any) {
      setEmailError(err.message || 'Account creation failed')
    } finally {
      setAccountLoading(false)
    }
  }

  const handleContinueAsGuest = () => router.push(jobId ? `/member/dashboard?pending=${jobId}` : `/member/dashboard`)
  const handleGoToDashboard   = () => router.push(jobId ? `/member/dashboard?pending=${jobId}` : `/member/dashboard`)

  const steps = requiresImages
    ? ['Upload', 'Payment', 'Account', 'Done']
    : ['Payment', 'Account', 'Done']
  const stepIndex = requiresImages
    ? ['images', 'payment', 'account', 'upsell'].indexOf(currentStep)
    : ['payment', 'account', 'upsell'].indexOf(currentStep)

  return (
    <div className="min-h-screen bg-neutral-50 overscroll-none">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-neutral-600 hover:text-primary-600 text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-700 max-w-[150px] truncate">{tool.name}</span>
            <span className="text-base font-bold text-primary-600">${finalPrice.toFixed(2)}</span>
          </div>
          {loggedInUser && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Signed in</span>
            </span>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">

        {/* Progress */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-8">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < stepIndex ? 'bg-green-500 text-white' :
                  i === stepIndex ? 'bg-primary-600 text-white' :
                  'bg-neutral-200 text-neutral-500'
                }`}>
                  {i < stepIndex ? 'âœ“' : i + 1}
                </div>
                <span className={`text-xs ${i === stepIndex ? 'font-medium text-neutral-800' : 'text-neutral-400'}`}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && <div className="w-4 sm:w-8 h-0.5 bg-neutral-200" />}
            </div>
          ))}
        </div>

        {/* Mobile: collapsible order summary */}
        <div className="block md:hidden mb-4">
          <button
            onClick={() => setShowSummary(v => !v)}
            className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${categoryColor}`}>
                {tool.emoji || 'ðŸ“¦'}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-neutral-800 line-clamp-1">{tool.name}</p>
                <p className="text-xs text-neutral-500">{hasDiscount ? `Was $${originalPrice}` : `${tool.deliveryMinutes || 20}-min delivery`}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-primary-600">${finalPrice.toFixed(2)}</span>
              {showSummary ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </div>
          </button>

          <AnimatePresence>
            {showSummary && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <div className="bg-white rounded-b-xl border border-t-0 border-neutral-200 p-4 space-y-3">
                  {fullName && (
                    <div className="bg-primary-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-primary-700 mb-1">Reading prepared for:</p>
                      <p className="text-sm text-primary-800 font-medium">{fullName}</p>
                      {userDob && <p className="text-xs text-primary-600">{userDob}{userBirthLoc ? ` Â· ${userBirthLoc}` : ''}</p>}
                      {partnerName && <p className="text-xs text-primary-600 mt-1">Partner: {partnerName}</p>}
                    </div>
                  )}
                  <div className="space-y-1">
                    {['Secure 256-bit encryption', 'Private â€” only you can access', '7-day money-back guarantee'].map(item => (
                      <div key={item} className="flex items-center gap-2 text-xs text-neutral-500">
                        <Shield className="w-3 h-3 text-green-500 flex-shrink-0" />{item}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-8">

          {/* Left â€” Tool Summary (desktop only) */}
          <div className="hidden md:block">
            <Card className="p-6 sticky top-24">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${categoryColor}`}>
                  {tool.emoji || 'ðŸ“¦'}
                </div>
                <div>
                  <h1 className="text-xl font-serif">{tool.name}</h1>
                  <div className="flex items-center gap-1 mt-1">
                    <CategoryIcon className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-xs text-neutral-500 capitalize">{domain.replace('-', ' ')}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-neutral-600 mb-4 leading-relaxed">{tool.description || tool.tagline}</p>
              {fullName && (
                <div className="bg-primary-50 rounded-xl p-3 mb-4">
                  <p className="text-xs font-medium text-primary-700 mb-1">Reading prepared for:</p>
                  <p className="text-sm text-primary-800 font-medium">{fullName}</p>
                  {userDob && <p className="text-xs text-primary-600">{userDob}{userBirthLoc ? ` Â· ${userBirthLoc}` : ''}</p>}
                  {partnerName && <p className="text-xs text-primary-600 mt-1">Partner: {partnerName}</p>}
                </div>
              )}
              {requiresImage && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-amber-800 text-sm font-medium mb-1">
                    <Camera className="w-4 h-4" />
                    Required: {requiresImage.type === 'both' ? 'Face + Both Palms' : requiresImage.type === 'face' ? 'Face Photo' : 'Both Palms'}
                  </div>
                  <p className="text-xs text-amber-700">Upload after reviewing your order below.</p>
                </div>
              )}
              <div className="pt-4 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Total{isSub ? ' /month' : ''}:</span>
                  <div className="text-right">
                    {hasDiscount && <span className="text-xs text-neutral-400 line-through mr-2">${originalPrice}</span>}
                    <span className="text-2xl font-serif text-primary-600">${finalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                {['Secure 256-bit encryption', 'Private â€” only you can access', '7-day money-back guarantee', `Delivery in ~${tool.deliveryMinutes || 20} minutes`].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-neutral-500">
                    <Shield className="w-3 h-3 text-green-500 flex-shrink-0" />{item}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right â€” Steps */}
          <div>
            <AnimatePresence mode="wait">

              {/* STEP 1 â€” Image Upload */}
              {currentStep === 'images' && (
                <motion.div key="images" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="p-5 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-serif mb-2">Upload Required Images</h2>
                    <p className="text-sm text-neutral-500 mb-4 sm:mb-6">
                      Your {requiresImage?.type === 'both' ? 'face photo and palm images are' : requiresImage?.type === 'face' ? 'face photo is' : 'palm images are'} required for this reading.
                    </p>
                    <ImageUploader
                      type={requiresImage?.type || 'face'}
                      onCapture={handleImageCapture}
                      instructions={requiresImage?.instructions}
                    />
                    {(facePreview || palmLeftPreview || palmRightPreview) && (
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {facePreview && (
                          <div className="relative">
                            <img src={facePreview} alt="Face" className="rounded-lg border-2 border-green-400 w-full h-20 object-cover" />
                            <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">Face</span>
                          </div>
                        )}
                        {palmLeftPreview && (
                          <div className="relative">
                            <img src={palmLeftPreview} alt="Left Palm" className="rounded-lg border-2 border-green-400 w-full h-20 object-cover" />
                            <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">Left</span>
                          </div>
                        )}
                        {palmRightPreview && (
                          <div className="relative">
                            <img src={palmRightPreview} alt="Right Palm" className="rounded-lg border-2 border-green-400 w-full h-20 object-cover" />
                            <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">Right</span>
                          </div>
                        )}
                      </div>
                    )}
                    <Button onClick={() => setCurrentStep('payment')} disabled={!checkUploadsComplete()} fullWidth size="lg" className="mt-6">
                      Continue to Payment
                    </Button>
                  </Card>
                </motion.div>
              )}

              {/* STEP 2 â€” Payment */}
              {currentStep === 'payment' && (
                <motion.div key="payment" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                    <h2 className="text-lg sm:text-xl font-serif">Complete Your Order</h2>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Email address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 text-base sm:text-sm"
                        />
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">Your reading will be sent here.</p>
                    </div>

                    {/* Coupon */}
                    <div className="bg-neutral-50 rounded-xl p-3 sm:p-4">
                      <p className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                        <Tag className="w-4 h-4" />Have a coupon?
                      </p>
                      {appliedCoupon ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-green-800">{appliedCoupon.code} applied</p>
                              <p className="text-xs text-green-600">
                                {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}% off` : `$${appliedCoupon.discount_value} off`}
                              </p>
                            </div>
                          </div>
                          <button onClick={() => { setAppliedCoupon(null); setFinalPrice(originalPrice) }}>
                            <X className="w-4 h-4 text-green-600" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Enter coupon code"
                            className="flex-1 px-3 py-3 border border-neutral-200 rounded-lg text-base sm:text-sm focus:outline-none focus:border-primary-400"
                          />
                          <Button onClick={handleApplyCoupon} disabled={validatingCoupon || !couponCode} variant="outline" size="sm">
                            {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                          </Button>
                        </div>
                      )}
                      {couponError && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{couponError}
                        </p>
                      )}
                    </div>

                    {/* Order Summary */}
                    <div className="bg-primary-50 rounded-xl p-3 sm:p-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-600 line-clamp-1 flex-1 mr-2">{tool.name}</span>
                        <span className="flex-shrink-0">${originalPrice}</span>
                      </div>
                      {hasDiscount && (
                        <div className="flex justify-between text-sm text-green-600 mb-1">
                          <span>Discount ({appliedCoupon?.code})</span>
                          <span>-${savings.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base pt-2 border-t border-primary-100">
                        <span>Total{isSub ? ' /month' : ''}:</span>
                        <span className="text-primary-700">${finalPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Demo payment */}
                    <div className="bg-neutral-50 rounded-xl p-3 sm:p-4">
                      <p className="text-xs text-neutral-400 mb-3 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />Demo payment â€” Stripe integration coming soon
                      </p>
                      <div className="space-y-2 opacity-60 pointer-events-none">
                        <input type="text" value="4242 4242 4242 4242" readOnly className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value="12/25" readOnly className="px-3 py-2.5 border rounded-lg text-sm bg-white" />
                          <input type="text" value="123" readOnly className="px-3 py-2.5 border rounded-lg text-sm bg-white" />
                        </div>
                      </div>
                    </div>

                    {/* Terms */}
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-5 h-5 flex-shrink-0 cursor-pointer" />
                      <span className="text-sm text-neutral-600">
                        I agree to the{' '}
                        <a href="/terms" className="text-primary-600 underline" target="_blank">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" className="text-primary-600 underline" target="_blank">Privacy Policy</a>
                      </span>
                    </label>

                    {purchaseError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />{purchaseError}
                      </div>
                    )}

                    <Button onClick={handlePurchase} disabled={isProcessing || !agreedToTerms} fullWidth size="lg">
                      {isProcessing
                        ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Processing...</>
                        : <><CreditCard className="w-5 h-5 mr-2" />Pay ${finalPrice.toFixed(2)}{isSub ? '/month' : ''}</>
                      }
                    </Button>
                  </Card>
                </motion.div>
              )}

              {/* STEP 3 â€” Account Creation */}
              {currentStep === 'account' && (
                <motion.div key="account" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="p-5 sm:p-6">
                    <div className="text-center mb-5 sm:mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-serif mb-1">Payment Successful!</h2>
                      <p className="text-sm text-neutral-500">Your {tool.name} is being prepared. Create an account to access it.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                            className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 text-base sm:text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                            className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 text-base sm:text-sm"
                          />
                        </div>
                        {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                          Create Password <span className="text-neutral-400 font-normal">(min 8 characters)</span>
                        </label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a secure password"
                            className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 text-base sm:text-sm"
                          />
                        </div>
                        {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                        <p className="font-medium mb-0.5">After creating your account:</p>
                        <p>You will be automatically signed in on this device.</p>
                      </div>
                      <Button onClick={handleCreateAccount} disabled={accountLoading || !email || !password || !name} fullWidth size="lg">
                        {accountLoading
                          ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Creating account...</>
                          : <><User className="w-5 h-5 mr-2" />Create Account & Access Dashboard</>
                        }
                      </Button>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200" /></div>
                        <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-neutral-400">or</span></div>
                      </div>
                      <button onClick={handleContinueAsGuest}
                        className="w-full py-3 text-sm text-neutral-500 hover:text-neutral-700 border border-neutral-200 rounded-xl transition">
                        Continue as Guest
                      </button>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* STEP 4 â€” Upsell */}
              {currentStep === 'upsell' && (
                <motion.div key="upsell" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="p-5 sm:p-6">
                    <div className="text-center mb-5 sm:mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-serif mb-1">You are all set!</h2>
                      <p className="text-sm text-neutral-500">Your {tool.name} is being generated. Check your dashboard for updates.</p>
                    </div>
                    {upsellTools.length > 0 && (
                      <div className="mb-5 sm:mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <p className="text-sm font-medium text-neutral-700">Customers who bought this also loved:</p>
                        </div>
                        <div className="space-y-2">
                          {upsellTools.map(t => (
                            <div key={t.id}
                              className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:border-primary-200 hover:bg-primary-50 transition cursor-pointer"
                              onClick={() => router.push(`/tool/${t.id}`)}>
                              <span className="text-xl">{t.emoji || 'ðŸ”®'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-800 truncate">{t.name}</p>
                                <p className="text-xs text-neutral-400 truncate">{t.tagline || t.description}</p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-sm font-bold text-primary-600">${t.price}</span>
                                <Gift className="w-3.5 h-3.5 text-primary-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button onClick={handleGoToDashboard} fullWidth size="lg">
                      Go to My Dashboard
                    </Button>
                  </Card>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}