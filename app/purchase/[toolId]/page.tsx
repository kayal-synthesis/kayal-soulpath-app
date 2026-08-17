'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { ImageUploader } from '@/components/ui/ImageUploader'
import {
  ArrowLeft, Shield, CreditCard, CheckCircle, AlertCircle,
  Camera, Loader2, Star, Crown, Clock, Mic, BookOpen,
  Tag, X, Heart, TrendingUp, Moon, ChevronDown, ChevronUp,
  Check, Lock, Sparkles, User,
} from 'lucide-react'

import { omniRelationshipTools }   from '@/lib/constants/omni-seer-relationships'
import { omniSelfPurposeTools }    from '@/lib/constants/omni-seer-self-purpose'
import { omniPhysicalTimingTools } from '@/lib/constants/omni-seer-physical-timing'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'
import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'

const allTools = [
  ...omniRelationshipTools, ...omniSelfPurposeTools, ...omniPhysicalTimingTools,
  ...timeKeeperTools, ...voiceTools, ...loveTools,
  ...wealthTools, ...wellnessTools, ...lifePathTools, ...sacredScriptTools,
]

const domainDestinations: Record<string, string> = {
  'oracle-temple': 'report', 'time-keeper': 'reading', 'voice': 'audio',
  'love': 'report', 'wealth': 'report', 'wellness': 'report',
  'life-path': 'report', 'sacred-script': 'chat',
}

const categoryColors: Record<string, string> = {
  'love': 'text-red-600 bg-red-50', 'wealth': 'text-green-600 bg-green-50',
  'wellness': 'text-purple-600 bg-purple-50', 'life-path': 'text-orange-600 bg-orange-50',
  'oracle-temple': 'text-indigo-600 bg-indigo-50', 'time-keeper': 'text-teal-600 bg-teal-50',
  'voice': 'text-violet-600 bg-violet-50', 'sacred-script': 'text-amber-600 bg-amber-50',
}

const categoryGradients: Record<string, string> = {
  'love': 'from-red-500 to-pink-600', 'wealth': 'from-green-500 to-emerald-600',
  'wellness': 'from-purple-500 to-violet-600', 'life-path': 'from-orange-500 to-amber-600',
  'oracle-temple': 'from-indigo-500 to-purple-600', 'time-keeper': 'from-teal-500 to-cyan-600',
  'voice': 'from-violet-500 to-purple-600', 'sacred-script': 'from-amber-500 to-orange-600',
}

const categoryIcons: Record<string, any> = {
  'love': Heart, 'wealth': TrendingUp, 'wellness': Moon, 'life-path': Star,
  'oracle-temple': Crown, 'time-keeper': Clock, 'voice': Mic, 'sacred-script': BookOpen,
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

// Reads the 60-day attribution cookie set by app/ref/[code]/route.ts.
// Returns null if the visitor never clicked an affiliate link, or the
// cookie has expired, both entirely normal, not an error.
const getRefCode = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )kayal_ref=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

type Step = 'images' | 'payment'

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
  const [currentStep,    setCurrentStep]    = useState<Step>('images')
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
  const [dominantHand, setDominantHand] = useState<'right' | 'left'>('right')

  // Specific to relocation-power-map only, optional, up to two places the
  // person is actually considering, so the reading can compare each
  // against their pattern directly rather than only covering where they
  // currently live.
  const [candidateCity1, setCandidateCity1] = useState('')
  const [candidateCity2, setCandidateCity2] = useState('')
  const isRelocationTool = tool?.id === 'relocation-power-map'

  const [couponCode,       setCouponCode]       = useState('WELCOME20')
  const [appliedCoupon,    setAppliedCoupon]    = useState<any>(null)
  const [couponError,      setCouponError]      = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [showCoupon,       setShowCoupon]       = useState(true)

  // Regional pricing. localizedBase is the catalog USD price after the
  // flat 20% African discount if applicable, converted to the visitor's
  // local currency, no visible discount messaging, this is simply what
  // "the price" is for that visitor. finalPrice starts equal to it and
  // only moves further if a coupon is applied on top.
  //
  // Design decision, not explicitly confirmed: a coupon and the regional
  // discount stack, the coupon's percentage applies to the
  // already-localized amount, rather than the two being mutually
  // exclusive. Worth confirming this is actually the intended behavior.
  const [localizedBase,   setLocalizedBase]   = useState(tool?.price || 0)
  const [displayCurrency, setDisplayCurrency] = useState('USD')
  const [baseUsdEquivalent, setBaseUsdEquivalent] = useState(tool?.price || 0)
  const [pricingLoaded,   setPricingLoaded]   = useState(false)

  const [finalPrice,    setFinalPrice]    = useState(tool?.price || 0)
  const [originalPrice, setOriginalPrice] = useState(tool?.price || 0)

  // The USD-equivalent of whatever finalPrice currently is, proportional
  // to any coupon discount applied on top of the localized base, this is
  // what actually gets sent as the commission-calculation reference,
  // regardless of what currency the customer was shown or charged in.
  const finalPriceUsd = localizedBase > 0
    ? baseUsdEquivalent * (finalPrice / localizedBase)
    : baseUsdEquivalent

  // Proper currency formatting, not a hardcoded $ prefix, most
  // currencies don't format like USD, and showing a $ sign for a
  // Nigerian Naira price would defeat the entire point of localizing it.
  const formatPrice = (amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: displayCurrency, currencyDisplay: 'narrowSymbol' }).format(amount)
    } catch {
      return `${displayCurrency} ${amount.toFixed(2)}`
    }
  }

  useEffect(() => {
    if (!tool?.price) return
    const fetchLocalizedPrice = async () => {
      try {
        const res = await fetch(`/api/pricing/localize?basePrice=${tool.price}`)
        const data = await res.json()
        setLocalizedBase(data.amount)
        setDisplayCurrency(data.currency)
        setBaseUsdEquivalent(data.usdEquivalent)
        setFinalPrice(data.amount)
        setOriginalPrice(data.amount)
      } catch {
        // Fall back to flat USD display if the pricing endpoint fails,
        // never block checkout entirely over a display-price fetch.
        setLocalizedBase(tool.price)
        setDisplayCurrency('USD')
        setBaseUsdEquivalent(tool.price)
        setFinalPrice(tool.price)
        setOriginalPrice(tool.price)
      } finally {
        setPricingLoaded(true)
      }
    }
    fetchLocalizedPrice()
  }, [tool?.price])

  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!hasCompletedOnboarding()) router.push('/onboarding/basic')
  }, [hasCompletedOnboarding, router])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setLoggedInUser(user)
        setEmail(user.email || '')
      }
    })
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem(`kayal_reading_${toolId}`)
    if (saved) {
      try {
        const d = JSON.parse(saved)
        if (d.partnerName) setPartnerName(d.partnerName)
        if (d.partnerDob)  setPartnerDob(d.partnerDob)
        if (d.dominantHand === 'left' || d.dominantHand === 'right') setDominantHand(d.dominantHand)
      } catch {}
    }
    const requiresImg = !!(tool?.requiresImage || tool?.requires_image)
    if (!requiresImg) setCurrentStep('payment')
  }, [toolId, tool])

  if (!tool) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-neutral-50">
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 text-center max-w-md w-full">
          <h2 className="text-2xl font-serif mb-4 text-neutral-900">Tool Not Found</h2>
          <p className="text-neutral-500 mb-6">This tool does not exist or has been removed.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  const requiresImage  = tool.requiresImage || tool.requires_image
  const requiresImages = !!requiresImage
  const domain         = tool.domain || tool.category || 'oracle-temple'
  const destination    = domainDestinations[domain] || 'report'
  const isSub          = !!(tool.isSubscription || tool.is_subscription)
  const categoryColor  = categoryColors[domain]    || 'text-indigo-600 bg-indigo-50'
  const categoryGrad   = categoryGradients[domain] || 'from-indigo-500 to-purple-600'
  const CategoryIcon   = categoryIcons[domain]     || Crown
  const savings        = originalPrice - finalPrice
  const hasDiscount    = savings > 0

  const steps: Step[] = requiresImages ? ['images', 'payment'] : ['payment']
  const stepLabels: Record<Step, string> = { images: 'Photos', payment: 'Payment' }
  const stepIndex = steps.indexOf(currentStep)

  const checkUploadsComplete = () => {
    if (!requiresImages || !requiresImage) return true
    if (requiresImage.type === 'face') return !!uploadedImages.face
    if (requiresImage.type === 'palm') return !!uploadedImages['palm-left'] && !!uploadedImages['palm-right']
    if (requiresImage.type === 'both') return !!uploadedImages.face && !!uploadedImages['palm-left'] && !!uploadedImages['palm-right']
    return true
  }

  const handleImageCapture = (file: File, type: 'face' | 'palm-left' | 'palm-right') => {
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
        body: JSON.stringify({ code: couponCode, toolId, userId: loggedInUser?.id || null }),
      })
      const data = await res.json()
      if (data.valid && data.coupon) {
        setAppliedCoupon(data.coupon)
        let price = originalPrice
        if (data.coupon.discount_type === 'percentage')
          price = originalPrice * (1 - data.coupon.discount_value / 100)
        else if (data.coupon.discount_type === 'fixed')
          price = Math.max(originalPrice - data.coupon.discount_value, 0)
        setFinalPrice(price)
        setShowCoupon(false)
        setCouponCode('')
      } else {
        setCouponError(data.error || 'Invalid coupon code')
      }
    } catch {
      setCouponError('Could not validate coupon. Please try again.')
    } finally {
      setValidatingCoupon(false)
    }
  }

  const submitReadingJob = async (): Promise<string | null> => {
    const form = new FormData()
    form.append('full_name',     fullName)
    form.append('date_of_birth', userDob)
    form.append('tool_id',       tool.id)
    form.append('user_token',    loggedInUser?.id || getDeviceId())
    if (userBirthTime) form.append('birth_time',     userBirthTime)
    if (userBirthLoc)  form.append('birth_location', userBirthLoc)
    if (candidateCity1) form.append('candidate_city_1', candidateCity1)
    if (candidateCity2) form.append('candidate_city_2', candidateCity2)
    if (partnerName)   form.append('partner_name',   partnerName)
    if (partnerDob)    form.append('partner_dob',    partnerDob)
    if (email)         form.append('email',          email)
    if (uploadedImages.face)           form.append('facial_image',     uploadedImages.face)
    if (uploadedImages['palm-left'])   form.append('palm_image_left',  uploadedImages['palm-left'])
    if (uploadedImages['palm-right'])  form.append('palm_image_right', uploadedImages['palm-right'])
    if (uploadedImages['palm-left'] || uploadedImages['palm-right']) form.append('dominant_hand', dominantHand)

    const res = await fetch('/api/reading/submit', { method: 'POST', body: form })
    if (!res.ok) throw new Error(`Submission failed: ${res.status}`)
    const data = await res.json()
    return data.job_id || null
  }

  const savePurchase = async (userId: string, jId: string | null) => {
    await fetch('/api/user/add-purchase', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        toolId:        tool.id,
        toolName:      tool.name,
        toolType:      destination,
        category:      domain,
        destination,
        emoji:         tool.emoji || '📦',
        price:         finalPrice,
        originalPrice,
        couponCode:    appliedCoupon?.code || null,
        name:          fullName,
        email:         email || loggedInUser?.email || '',
        job_id:        jId,
        purchaseDate:  new Date().toISOString(),
        ref_code:      getRefCode(),
      }),
    })
  }

  const handlePurchase = async () => {
    setPurchaseError('')
    if (!agreedToTerms) {
      setPurchaseError('Please agree to the Terms of Service to continue.')
      return
    }
    setIsProcessing(true)
    try {
      const newJobId = await submitReadingJob()

      // This no longer creates the purchase or credits anything, it only
      // starts a real Stripe checkout session. The purchase itself
      // only gets created once Stripe's webhook confirms the charge
      // actually completed, never from this client-side call directly.
      const initResponse = await fetch('/api/checkout/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:        loggedInUser?.id || getDeviceId(),
          email:         email || loggedInUser?.email || '',
          fullName:      fullName,
          toolId:        tool.id,
          toolName:      tool.name,
          toolType:      destination,
          category:      domain,
          amountCharged: finalPrice,     // already the localized, discounted-if-African amount
          currency:      displayCurrency, // from the pricing localization already resolved for this visitor
          usdEquivalent: finalPriceUsd,   // the true USD reference, what commission math actually uses
          refCode:       getRefCode(),
          jobId:         newJobId,
        }),
      })

      const initData = await initResponse.json()
      if (!initResponse.ok || !initData.paymentLink) {
        throw new Error(initData.error || 'Could not start checkout, please try again.')
      }

      // Real redirect to Stripe's hosted payment page, this is
      // where the customer actually enters payment details, never on
      // this site.
      window.location.href = initData.paymentLink
    } catch (err: any) {
      setPurchaseError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white overflow-x-hidden">

      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-neutral-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 transition flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
            <span className="text-sm font-semibold text-neutral-800 truncate max-w-[160px]">
              {tool.name}
            </span>
          </div>
          <div className="w-9 flex-shrink-0 flex justify-end">
            {loggedInUser && <CheckCircle className="w-5 h-5 text-green-500" />}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Progress Steps */}
        {steps.length > 1 && (
          <div className="flex items-center justify-center mb-8">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    i < stepIndex
                      ? 'bg-green-500 text-white shadow-sm'
                      : i === stepIndex
                      ? `bg-gradient-to-br ${categoryGrad} text-white shadow-md`
                      : 'bg-neutral-100 text-neutral-400'
                  }`}>
                    {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium ${
                    i === stepIndex ? 'text-neutral-800' :
                    i < stepIndex  ? 'text-green-600'   : 'text-neutral-300'
                  }`}>
                    {stepLabels[step]}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 mb-5 transition-all ${
                    i < stepIndex ? 'bg-green-400' : 'bg-neutral-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Mobile collapsible order summary */}
        <div className="mb-5">
          <button
            onClick={() => setShowSummary(v => !v)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${categoryColor}`}>
                {tool.emoji || '📦'}
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-neutral-800 truncate">{tool.name}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {hasDiscount
                    ? <span className="text-green-600 font-medium">You save ${savings.toFixed(2)}</span>
                    : `~${tool.deliveryMinutes || 20} min delivery`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <span className="text-lg font-bold text-primary-600">{formatPrice(finalPrice)}</span>
              {showSummary
                ? <ChevronUp className="w-4 h-4 text-neutral-400" />
                : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </div>
          </button>

          <AnimatePresence>
            {showSummary && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-2xl border border-t-0 border-neutral-100 px-4 pb-4 space-y-4">
                  <p className="text-sm text-neutral-600 pt-3 leading-relaxed">
                    {tool.description || tool.tagline}
                  </p>
                  {fullName && (
                    <div className="bg-primary-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-primary-600 mb-1 uppercase tracking-wide">Reading for</p>
                      <p className="text-sm font-medium text-primary-900">{fullName}</p>
                      {userDob && (
                        <p className="text-xs text-primary-600 mt-0.5">
                          {userDob}{userBirthLoc ? ` · ${userBirthLoc}` : ''}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    {['Secure 256-bit encryption', 'Private, only you can access', '7-day money-back guarantee'].map(item => (
                      <div key={item} className="flex items-center gap-2 text-xs text-neutral-500">
                        <Shield className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{item}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">

          {/* STEP 1, Image Upload */}
          {currentStep === 'images' && (
            <motion.div
              key="images"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${categoryColor}`}>
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif text-neutral-900">Upload Your Photos</h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Required for your{' '}
                      {requiresImage?.type === 'both'
                        ? 'full synthesis reading'
                        : requiresImage?.type === 'face'
                        ? 'face reading'
                        : 'palm reading'}
                    </p>
                  </div>
                </div>

                {(requiresImage?.type === 'palm' || requiresImage?.type === 'both') && (
                  <div className="mb-5">
                    <p className="text-sm font-medium text-neutral-700 mb-2">Which hand is your dominant hand?</p>
                    <p className="text-xs text-neutral-400 mb-3">
                      This determines which palm is read as your dominant hand (present life, future direction)
                      and which as your passive hand (the blueprint you were born with).
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDominantHand('right')}
                        className={`p-4 rounded-xl border-2 text-center transition ${
                          dominantHand === 'right'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <p className="text-sm font-semibold text-neutral-800">Right-handed</p>
                        <p className="text-xs text-neutral-400 mt-1">Right palm is dominant</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDominantHand('left')}
                        className={`p-4 rounded-xl border-2 text-center transition ${
                          dominantHand === 'left'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <p className="text-sm font-semibold text-neutral-800">Left-handed</p>
                        <p className="text-xs text-neutral-400 mt-1">Left palm is dominant</p>
                      </button>
                    </div>
                  </div>
                )}

                <ImageUploader
                  type={requiresImage?.type || 'face'}
                  onCapture={handleImageCapture}
                  instructions={requiresImage?.instructions}
                />

                {(facePreview || palmRightPreview || palmLeftPreview) && (
                  <div className="grid grid-cols-3 gap-2 mt-5">
                    {facePreview && (
                      <div className="relative rounded-xl overflow-hidden border-2 border-green-400">
                        <img src={facePreview} alt="Face" className="w-full h-24 object-cover" />
                        <div className="absolute top-0 inset-x-0 bg-green-500 text-white text-xs text-center py-0.5 font-medium">Face</div>
                      </div>
                    )}
                    {palmRightPreview && (
                      <div className="relative rounded-xl overflow-hidden border-2 border-green-400">
                        <img src={palmRightPreview} alt="Right Palm" className="w-full h-24 object-cover" />
                        <div className="absolute top-0 inset-x-0 bg-green-500 text-white text-xs text-center py-0.5 font-medium">Right</div>
                      </div>
                    )}
                    {palmLeftPreview && (
                      <div className="relative rounded-xl overflow-hidden border-2 border-green-400">
                        <img src={palmLeftPreview} alt="Left Palm" className="w-full h-24 object-cover" />
                        <div className="absolute top-0 inset-x-0 bg-green-500 text-white text-xs text-center py-0.5 font-medium">Left</div>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => setCurrentStep('payment')}
                  disabled={!checkUploadsComplete()}
                  fullWidth
                  size="lg"
                  className="mt-6 h-13"
                >
                  Continue to Payment
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2, Payment */}
          {currentStep === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              <div className="space-y-4">

                {/* Order Summary Card */}
                <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
                  <h2 className="text-lg font-serif text-neutral-900 mb-4">Order Summary</h2>
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${categoryColor}`}>
                      {tool.emoji || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 leading-tight">{tool.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <CategoryIcon className="w-3 h-3 text-neutral-400" />
                        <span className="text-xs text-neutral-400 capitalize">{domain.replace('-', ' ')}</span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed line-clamp-2">
                        {tool.tagline || tool.description}
                      </p>
                      {fullName && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <User className="w-3 h-3 text-primary-500" />
                          <p className="text-xs text-primary-600 font-medium">For: {fullName}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-neutral-100 pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Price</span>
                      <span className="font-medium">{formatPrice(originalPrice)}</span>
                    </div>
                    {hasDiscount && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount ({appliedCoupon?.code})</span>
                        <span className="font-medium">-${savings.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                      <span className="font-semibold text-neutral-800">
                        Total{isSub ? ' /month' : ''}
                      </span>
                      <span className="text-2xl font-serif text-primary-700">
                        {formatPrice(finalPrice)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Candidate cities, relocation-power-map only, entirely
                    optional. Without these the reading still evaluates the
                    person's current location, this just lets the reading
                    also compare specific places they're genuinely weighing. */}
                {isRelocationTool && (
                  <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                      Considering Moving Somewhere? (Optional)
                    </label>
                    <p className="text-xs text-neutral-400 mb-3">
                      Name up to two places you're actually weighing, and your reading will compare each one directly against your pattern, not just cover where you live now.
                    </p>
                    <input
                      type="text"
                      value={candidateCity1}
                      onChange={e => setCandidateCity1(e.target.value)}
                      placeholder="City, Country (e.g. Lisbon, Portugal)"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white mb-2"
                    />
                    <input
                      type="text"
                      value={candidateCity2}
                      onChange={e => setCandidateCity2(e.target.value)}
                      placeholder="Second city, optional"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white"
                    />
                  </div>
                )}

                {/* Optional, not required, Stripe's own checkout page asks
                    for an email as a normal part of paying regardless, so
                    this genuinely isn't the only place it gets collected.
                    Filling it in here just means the confirmation shows a
                    name/email match a little sooner, nothing breaks if
                    it's left blank. */}
                {!loggedInUser && (
                  <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                      Your Email <span className="text-neutral-400 font-normal">(optional)</span>
                    </label>
                    <p className="text-xs text-neutral-400 mb-3">
                      You'll also be asked for this on the payment page.
                    </p>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white"
                    />
                  </div>
                )}

                {/* Coupon Code */}
                <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Tag className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-green-800">{appliedCoupon.code} applied</p>
                          <p className="text-xs text-green-600">
                            {appliedCoupon.discount_type === 'percentage'
                              ? `${appliedCoupon.discount_value}% discount`
                              : `$${appliedCoupon.discount_value} off`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setAppliedCoupon(null)
                          setFinalPrice(originalPrice)
                          setCouponCode('')
                        }}
                        className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-neutral-500" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => setShowCoupon(v => !v)}
                        className="flex items-center gap-2 text-sm text-primary-600 font-medium hover:text-primary-700 transition"
                      >
                        <Tag className="w-4 h-4" />
                        {showCoupon ? 'Hide coupon field' : 'Have a coupon code?'}
                      </button>
                      <AnimatePresence>
                        {showCoupon && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex gap-2 mt-3">
                              <input
                                type="text"
                                value={couponCode}
                                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }}
                                placeholder="Enter coupon code"
                                className="flex-1 px-4 py-3 border border-neutral-200 rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white"
                              />
                              <Button
                                onClick={handleApplyCoupon}
                                disabled={validatingCoupon || !couponCode.trim()}
                                variant="outline"
                              >
                                {validatingCoupon
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : 'Apply'}
                              </Button>
                            </div>
                            {couponError && (
                              <p className="text-sm text-red-500 mt-2 flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />{couponError}
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Trust Signals */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Shield,   text: '256-bit SSL', sub: 'Encrypted'  },
                    { icon: Lock,     text: 'Private',     sub: 'Only you'   },
                    { icon: Sparkles, text: '7-day',       sub: 'Money back' },
                  ].map(({ icon: Icon, text, sub }) => (
                    <div key={text} className="bg-white rounded-xl border border-neutral-100 p-3 text-center shadow-sm">
                      <Icon className="w-4 h-4 text-green-500 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-neutral-700">{text}</p>
                      <p className="text-xs text-neutral-400">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Terms */}
                <label className="flex items-start gap-3 cursor-pointer bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-5 h-5 flex-shrink-0 cursor-pointer accent-primary-600"
                  />
                  <span className="text-sm text-neutral-600 leading-relaxed">
                    I agree to the{' '}
                    <a href="/terms" className="text-primary-600 underline" target="_blank" rel="noreferrer">
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-primary-600 underline" target="_blank" rel="noreferrer">
                      Privacy Policy
                    </a>
                    . I understand this is a demo purchase.
                  </span>
                </label>

                {purchaseError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{purchaseError}
                  </div>
                )}

                {/* Pay Button */}
                <Button
                  onClick={handlePurchase}
                  disabled={isProcessing || !agreedToTerms}
                  fullWidth
                  size="lg"
                  className="h-14 text-base font-semibold shadow-lg"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" />Processing your order...</>
                  ) : (
                    <><CreditCard className="w-5 h-5 mr-2" />Complete Purchase {formatPrice(finalPrice)}{isSub ? '/mo' : ''}</>
                  )}
                </Button>

                <p className="text-xs text-center text-neutral-400 pb-2">
                  Your reading will be ready in approximately {tool.deliveryMinutes || 20} minutes after payment.
                </p>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}