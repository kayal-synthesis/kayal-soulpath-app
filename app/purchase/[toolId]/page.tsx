'use client'

// ── Facebook Pixel type declaration ──────────────────────────────
declare global {
  interface Window {
    fbq: (...args: any[]) => void
    _fbq: any
  }
}

// ── Facebook Pixel helper — safe to call even before pixel loads ─
function fbqEvent(event: 'track' | 'trackCustom', name: string, params?: Record<string, any>) {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq(event, name, params)
    }
  } catch {}
}
// app/purchase/[toolId]/page.tsx
// Complete clean rewrite. Deploy by selecting ALL in your editor and replacing.

import { useState, useEffect }       from 'react'
import { useParams, useRouter }       from 'next/navigation'
import { useAnonymousStore }          from '@/lib/store/anonymousStore'
import { createClient }               from '@/lib/supabase/client'
import { motion }                     from 'framer-motion'
import { Card }                       from '@/components/ui/Card'
import { Button }                     from '@/components/ui/Button'
import { Badge }                      from '@/components/ui/Badge'
import { ImageUploader }              from '@/components/ui/ImageUploader'
import { couponService }              from '@/lib/services/couponService'
import { emailService }               from '@/lib/email/emailService'
import {
  ArrowLeft, Shield, CreditCard, CheckCircle, AlertCircle,
  Camera, Loader2, Heart, Briefcase, TrendingUp, Moon, Zap,
  Star, Crown, Clock, Infinity, Mic, Info, Mail, User, Key,
  Calendar, Fingerprint, Tag, X, BookOpen,
} from 'lucide-react'

import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'
import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { omniTools }         from '@/lib/constants/omni-seer-tools'

const allTools = [
  ...timeKeeperTools,  ...voiceTools,    ...loveTools,
  ...wealthTools,      ...wellnessTools, ...lifePathTools,
  ...sacredScriptTools,...omniTools,
]

type Step = 'details' | 'payment' | 'images' | 'account'

const domainDestinations: Record<string, string> = {
  voice: 'audio', 'oracle-temple': 'report', 'time-keeper': 'reading',
  love: 'report', career: 'report', wealth: 'report',
  spiritual: 'report', health: 'report', 'life-path': 'report',
  'sacred-script': 'chat', wellness: 'report',
}

const categoryColors: Record<string, string> = {
  love:            'text-red-600    bg-red-50',
  wealth:          'text-green-600  bg-green-50',
  career:          'text-green-600  bg-green-50',
  spiritual:       'text-purple-600 bg-purple-50',
  wellness:        'text-purple-600 bg-purple-50',
  'life-path':     'text-primary-600 bg-primary-50',
  health:          'text-yellow-600 bg-yellow-50',
  universal:       'text-indigo-600 bg-indigo-50',
  'oracle-temple': 'text-primary-600 bg-primary-50',
  'time-keeper':   'text-indigo-600 bg-indigo-50',
  voice:           'text-purple-600 bg-purple-50',
  'sacred-script': 'text-amber-600  bg-amber-50',
}

function getDeviceId() {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('kayal_device_id')
  if (!id) {
    id = 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('kayal_device_id', id)
  }
  return id
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/


// ─────────────────────────────────────────────────────────────
// MagicLinkCard — sends a passwordless sign-in link to the
// returning customer's email so they land directly on their
// dashboard without needing to remember a password.
// ─────────────────────────────────────────────────────────────

function MagicLinkCard({
  email, jobId, supabase,
}: {
  email: string
  jobId: string | null
  supabase: ReturnType<typeof createClient>
}) {
  const [sent,    setSent]    = useState(false)
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState('')

  // Auto-send on mount — user just paid, no friction
  useEffect(() => {
    sendMagicLink()
  }, [])

  async function sendMagicLink() {
    setSending(true)
    setError('')
    try {
      const destination = '/member/dashboard' + (jobId ? '?pending=' + jobId : '')
      const callbackUrl = window.location.origin +
        '/auth/callback?next=' + encodeURIComponent(destination)

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl },
      })

      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send sign-in link')
    } finally {
      setSending(false)
    }
  }

  if (sending) {
    return (
      <Card className="p-6 border-2 border-primary-200">
        <div className="flex items-center justify-center gap-3 py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          <p className="text-sm text-neutral-600">Sending your sign-in link…</p>
        </div>
      </Card>
    )
  }

  if (sent) {
    return (
      <Card className="p-6 border-2 border-green-200 bg-green-50">
        <div className="text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center
                          justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-green-600" />
          </div>
          <h3 className="font-semibold text-green-900 mb-2">
            Check your email!
          </h3>
          <p className="text-sm text-green-700 mb-1">
            We sent a sign-in link to
          </p>
          <p className="text-sm font-bold text-green-800 mb-4">{email}</p>
          <p className="text-xs text-green-600 mb-5">
            Click the link in your email and you will be taken directly
            to your dashboard where your reading will be waiting.
          </p>
          <button
            onClick={sendMagicLink}
            className="text-xs text-green-700 underline"
          >
            Didn't receive it? Resend
          </button>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-2 border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 mb-2">
              Could not send sign-in link
            </p>
            <p className="text-xs text-red-700 mb-3">{error}</p>
            <Button onClick={sendMagicLink} size="sm" variant="outline"
              className="text-red-700 border-red-300">
              Try again
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return null
}

export default function PurchasePage() {
  const params   = useParams()
  const router   = useRouter()
  const supabase = createClient()
  const { user: anonymousUser, hasCompletedOnboarding } = useAnonymousStore()

  const toolId = params.toolId as string
  const tool   = allTools.find(t => t.id === toolId)

  const fullName      = anonymousUser?.name          || ''
  const firstName     = fullName.split(' ')[0]       || ''
  const userDob       = anonymousUser?.dob           || ''
  const userBirthTime = anonymousUser?.birthTime     || ''
  const userBirthLoc  = anonymousUser?.birthLocation || ''
  const userGender    = (anonymousUser as any)?.gender || ''

  // ── Auth ────────────────────────────────────────────────────
  const [loggedInUser, setLoggedInUser] = useState<any>(null)

  // ── Flow state ──────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<Step>('details')

  // ── Images ──────────────────────────────────────────────────
  const [uploadedImages, setUploadedImages] = useState<{
    face?: File; 'palm-left'?: File; 'palm-right'?: File
  }>({})
  const [facePreview,      setFacePreview]      = useState<string | null>(null)
  const [palmLeftPreview,  setPalmLeftPreview]  = useState<string | null>(null)
  const [palmRightPreview, setPalmRightPreview] = useState<string | null>(null)

  // ── Loading flags ────────────────────────────────────────────
  const [isProcessing,    setIsProcessing]    = useState(false)
  const [isSubmittingJob, setIsSubmittingJob] = useState(false)
  const [accountLoading,  setAccountLoading]  = useState(false)
  const [checkingEmail,   setCheckingEmail]   = useState(false)

  // ── Terms / errors ───────────────────────────────────────────
  const [agreedToTerms,  setAgreedToTerms]  = useState(false)
  const [purchaseError,  setPurchaseError]  = useState('')
  const [emailError,     setEmailError]     = useState('')
  const [passwordError,  setPasswordError]  = useState('')
  const [guestEmailError,setGuestEmailError]= useState('')

  // ── Form values ──────────────────────────────────────────────
  const [email,        setEmail]        = useState('')
  const [emailPayment, setEmailPayment] = useState('')
  const [password,     setPassword]     = useState('')
  const [name,         setName]         = useState(fullName)
  const [joinReferral, setJoinReferral] = useState(false)

  // ── Coupon ───────────────────────────────────────────────────
  const [couponCode,       setCouponCode]       = useState('')
  const [appliedCoupon,    setAppliedCoupon]    = useState<any>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [couponError,      setCouponError]      = useState('')
  const [finalPrice,       setFinalPrice]       = useState(tool?.price || 0)
  const [originalPrice]                         = useState(tool?.price || 0)

  // ── Partner data ─────────────────────────────────────────────
  const [partnerName, setPartnerName] = useState('')
  const [partnerDob,  setPartnerDob]  = useState('')

  // ── Affiliate tracking ───────────────────────────────────────
  const [refCode,     setRefCode]     = useState('')
  const [linkId,      setLinkId]      = useState('')
  const [utmSource,   setUtmSource]   = useState('')
  const [utmMedium,   setUtmMedium]   = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')


  // ── Facebook Pixel — PageView + ViewContent on load ─────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Load the Facebook Pixel script
    ;(function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = []
      t = b.createElement(e); t.async = true
      t.src = v; s = b.getElementsByTagName(e)[0]
      s.parentNode.insertBefore(t, s)
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

    window.fbq('init', '1307389441477736')
    window.fbq('track', 'PageView')
  }, [])

  // ── Facebook Pixel — ViewContent once tool data loads ───────────
  useEffect(() => {
    if (!tool) return
    fbqEvent('track', 'ViewContent', {
      content_name:     tool.name,
      content_ids:      [tool.id],
      content_type:     'product',
      value:            finalPrice,
      currency:         'USD',
    })
  }, [tool, finalPrice])
  // ── Returning customer detection ─────────────────────────────
  const [recognizedDevice,  setRecognizedDevice]  = useState(false)
  const [accountExists,     setAccountExists]     = useState(false)
  const [returningCustomer, setReturningCustomer] = useState<{
    hasAccount: boolean; hasPurchases: boolean
    name?: string;       purchaseCount: number
  } | null>(null)

  // ── Job / result ─────────────────────────────────────────────
  const [jobId, setJobId] = useState<string | null>(null)

  // ── Computed ─────────────────────────────────────────────────
  const bestEmail      = loggedInUser?.email || emailPayment || email
  const savings        = originalPrice - finalPrice
  const hasDiscount    = savings > 0
  const toolCategory   = (tool as any)?.category || (tool as any)?.domain || 'universal'
  const categoryColor  = categoryColors[toolCategory] || 'text-primary-600 bg-primary-50'
  const requiresImage  = tool ? ('requiresImage' in tool ? (tool as any).requiresImage : undefined) : undefined
  const requiresImages = !!requiresImage

  function getDestinationName() {
    if (toolCategory === 'voice')         return 'audio session'
    if (toolCategory === 'time-keeper')   return 'reading'
    if (toolCategory === 'sacred-script') return 'chat session'
    return 'report'
  }
  const isSubscription = getDestinationName() === 'chat session'

  function getDomainName() {
    const map: Record<string, string> = {
      love:            'Love & Relationships',
      career:          'Wealth & Career',
      wealth:          'Wealth & Career',
      spiritual:       'Wellness & Spirituality',
      wellness:        'Wellness & Spirituality',
      health:          'Wellness & Spirituality',
      'life-path':     'Life Path & Destiny',
      'oracle-temple': "Omni-Seer's Sanctum",
      'time-keeper':   "Timekeeper's Vault",
      voice:           "Oracle's Voice",
      'sacred-script': 'Whispering Scroll',
    }
    return map[toolCategory] || 'Premium Reading'
  }

  function getImageTypeDescription() {
    if (!requiresImage) return null
    if (requiresImage.type === 'face') return 'face photo'
    if (requiresImage.type === 'palm') return 'both palms'
    return 'face and both palms'
  }

  function checkUploadComplete() {
    if (!requiresImages || !requiresImage) return true
    if (requiresImage.type === 'face') return !!uploadedImages.face
    if (requiresImage.type === 'palm') return !!uploadedImages['palm-left'] && !!uploadedImages['palm-right']
    if (requiresImage.type === 'both') return !!uploadedImages.face && !!uploadedImages['palm-left'] && !!uploadedImages['palm-right']
    return true
  }
  const allUploadsComplete = checkUploadComplete()

  // ── On mount ─────────────────────────────────────────────────
  useEffect(() => {
    // Affiliate tracking from page.tsx sessionStorage
    try {
      const saved = sessionStorage.getItem('kayal_selected_tool')
      if (saved) {
        const d = JSON.parse(saved)
        if (d.refCode)     setRefCode(d.refCode)
        if (d.linkId)      setLinkId(d.linkId)
        if (d.utmSource)   setUtmSource(d.utmSource)
        if (d.utmMedium)   setUtmMedium(d.utmMedium)
        if (d.utmCampaign) setUtmCampaign(d.utmCampaign)
      }
    } catch {}

    // Partner data
    try {
      const pd = sessionStorage.getItem('kayal_reading_' + toolId)
      if (pd) {
        const d = JSON.parse(pd)
        if (d.partnerName) setPartnerName(d.partnerName)
        if (d.partnerDob)  setPartnerDob(d.partnerDob)
      }
    } catch {}

    // Pending coupon
    const pending = sessionStorage.getItem('pending_coupon')
    if (pending) {
      setCouponCode(pending)
      applyAndValidateCoupon(pending)
      sessionStorage.removeItem('pending_coupon')
    }

    // Recognised device
    const trusted   = localStorage.getItem('kayal_trusted_device')
    const lastEmail = localStorage.getItem('kayal_user_email')
    if (trusted && lastEmail) {
      setRecognizedDevice(true)
      setEmail(lastEmail)
      setEmailPayment(lastEmail)
      detectReturningCustomer(lastEmail)
    }
  }, [toolId])

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setLoggedInUser(user)
        if (user.email)              { setEmail(user.email); setEmailPayment(user.email) }
        if (user.user_metadata?.name)  setName(user.user_metadata.name)
      }
    })
  }, [])

  // Onboarding guard
  useEffect(() => {
    if (!hasCompletedOnboarding()) router.push('/onboarding/basic')
  }, [hasCompletedOnboarding, router])

  // ── Returning customer detection ─────────────────────────────
  async function detectReturningCustomer(emailToCheck: string) {
    if (!emailToCheck || !EMAIL_RE.test(emailToCheck)) return
    setCheckingEmail(true)
    try {
      const res = await fetch(
        '/api/user/add-purchase?email=' + encodeURIComponent(emailToCheck)
      )
      let hasPurchases  = false
      let purchaseCount = 0
      let customerName: string | undefined

      if (res.ok) {
        const data   = await res.json()
        hasPurchases  = data.hasPurchases  || false
        purchaseCount = data.purchaseCount || 0
        customerName  = data.name          || undefined
      }

      let hasAccount = false
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        emailToCheck,
        { redirectTo: window.location.origin + '/auth/callback?next=/auth/reset-password' }
      )
      if (!resetError || !resetError.message?.toLowerCase().includes('not found')) {
        hasAccount = true
      }

      const stored = localStorage.getItem('kayal_user_email')
      if (stored?.toLowerCase() === emailToCheck.toLowerCase()) {
        hasAccount   = true
        hasPurchases = true
      }

      if (hasAccount || hasPurchases) {
        setReturningCustomer({ hasAccount, hasPurchases, name: customerName, purchaseCount })
        setAccountExists(hasAccount)
      } else {
        setReturningCustomer(null)
        setAccountExists(false)
      }
    } catch {}
    finally { setCheckingEmail(false) }
  }

  // ── Coupon ───────────────────────────────────────────────────
  async function applyAndValidateCoupon(code: string) {
    if (!code.trim() || !tool) return
    setValidatingCoupon(true)
    setCouponError('')
    try {
      const res = await couponService.validateCoupon(code, tool.id, loggedInUser?.id || 'guest')
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon)
        let discounted = tool.price
        if (res.coupon.discount_type === 'percentage') {
          discounted = tool.price * (1 - res.coupon.discount_value / 100)
        } else if (res.coupon.discount_type === 'fixed') {
          discounted = Math.max(tool.price - res.coupon.discount_value, 0)
        }
        setFinalPrice(discounted)
        setCouponCode('')
      } else {
        setCouponError(res.error || 'Invalid coupon')
      }
    } catch {
      setCouponError('Error validating coupon')
    } finally {
      setValidatingCoupon(false)
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setFinalPrice(originalPrice)
    setCouponError('')
  }

  // ── Image capture ─────────────────────────────────────────────
  function handleImageCapture(file: File, type: 'face' | 'palm-left' | 'palm-right') {
    setUploadedImages(prev => ({ ...prev, [type]: file }))
    const url = URL.createObjectURL(file)
    if (type === 'face')       setFacePreview(url)
    if (type === 'palm-left')  setPalmLeftPreview(url)
    if (type === 'palm-right') setPalmRightPreview(url)
  }

  // ── Submit reading job ────────────────────────────────────────
  async function submitReadingJob(images: typeof uploadedImages): Promise<string | null> {
    const form = new FormData()
    form.append('full_name',     fullName)
    form.append('date_of_birth', userDob)
    if (userBirthTime) form.append('birth_time',     userBirthTime)
    if (userBirthLoc)  form.append('birth_location', userBirthLoc)
    if (images.face)          form.append('facial_image', images.face)
    if (images['palm-left'])  form.append('palm_image',   images['palm-left'])
    if (images['palm-right']) form.append('palm_image',   images['palm-right'])
    form.append('tool_id',    tool!.id)
    if (userGender)  form.append('gender',       userGender)
    if (partnerName) form.append('partner_name', partnerName)
    if (partnerDob)  form.append('partner_dob',  partnerDob)
    form.append('user_token', loggedInUser?.id || getDeviceId())
    if (bestEmail)   form.append('email', bestEmail)

    const res = await fetch('/api/reading/submit', { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Reading submission failed')
    }
    const data = await res.json()
    return data.job_id || null
  }

  // ── Transfer purchase to account ──────────────────────────────
  async function transferPurchaseToAccount(
    userId: string,
    expiresAt: string | null = null,
    jId: string | null       = null
  ) {
    try {
      await fetch('/api/user/add-purchase', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          toolId:      tool!.id,
          toolName:    tool!.name,
          toolType:    domainDestinations[toolCategory] || 'report',
          category:    toolCategory,
          destination: domainDestinations[toolCategory] || 'report',
          emoji:       (tool as any).emoji || '📦',
          price:       finalPrice,
          originalPrice,
          couponCode:  appliedCoupon?.code,
          name,
          email:       bestEmail,
          expires_at:  expiresAt,
          purchaseDate: new Date().toISOString(),
          job_id:      jId,
          ref_code:    refCode  || null,
          link_id:     linkId   || null,
        }),
      })
    } catch (err) {
      console.error('transferPurchaseToAccount:', err)
    }
  }

  // ── TEST MODE payment handler ─────────────────────────────────
  // Set TEST_MODE = false when Stripe is ready
  const TEST_MODE = true

  async function handlePurchase() {
    setPurchaseError('')
    setGuestEmailError('')

    // ── Facebook Pixel: InitiateCheckout ─────────────────────────
    fbqEvent('track', 'InitiateCheckout', {
      content_name:  tool?.name,
      content_ids:   [tool?.id],
      content_type:  'product',
      value:         finalPrice,
      currency:      'USD',
      num_items:     1,
    })


    if (!agreedToTerms) {
      setPurchaseError('Please agree to the Terms of Service to continue.')
      return
    }
    if (!bestEmail || !EMAIL_RE.test(bestEmail)) {
      setGuestEmailError('A valid email is required to receive your reading.')
      return
    }

    setIsProcessing(true)
    try {
      if (TEST_MODE) {
        await new Promise(r => setTimeout(r, 1500))
        if (requiresImages) {
          setCurrentStep('images')
        } else {
          const newJobId = await submitReadingJob({})
          setJobId(newJobId)
          if (loggedInUser) {
            await transferPurchaseToAccount(loggedInUser.id, null, newJobId)

          // ── Facebook Pixel: Purchase ────────────────────────────
          fbqEvent('track', 'Purchase', {
            content_name:  tool?.name,
            content_ids:   [tool?.id],
            content_type:  'product',
            value:         finalPrice,
            currency:      'USD',
            num_items:     1,
          })
            router.push('/member/dashboard?pending=' + newJobId)
          } else {
            setCurrentStep('account')
            if (bestEmail) detectReturningCustomer(bestEmail)
          }
        }
        return
      }

      // ── Production Stripe path ──────────────────────────────
      const response = await fetch('/api/checkout/create-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_id:         tool!.id,
          tool_name:       tool!.name,
          tool_emoji:      (tool as any).emoji || '🔮',
          price_cents:     Math.round(finalPrice * 100),
          is_subscription: isSubscription,
          user_id:         loggedInUser?.id || null,
          customer_email:  bestEmail,
          ref_code:        refCode     || null,
          link_id:         linkId      || null,
          utm_source:      utmSource   || null,
          utm_medium:      utmMedium   || null,
          utm_campaign:    utmCampaign || null,
          coupon_code:     appliedCoupon?.code || null,
          success_url: window.location.origin + '/purchase/' + tool!.id + '/success?session_id={CHECKOUT_SESSION_ID}',
          cancel_url:  window.location.origin + '/purchase/' + tool!.id,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || 'Checkout session failed')
      }
      const { url } = await response.json()
      if (!url) throw new Error('No checkout URL returned')

      // ── Facebook Pixel: Purchase (before Stripe redirect) ────────
      fbqEvent('track', 'Purchase', {
        content_name:  tool?.name,
        content_ids:   [tool?.id],
        content_type:  'product',
        value:         finalPrice,
        currency:      'USD',
        num_items:     1,
      })
      window.location.href = url

    } catch (err: any) {
      setPurchaseError(err.message || 'Something went wrong. Please try again.')
      setIsProcessing(false)
    } finally {
      if (TEST_MODE) setIsProcessing(false)
    }
  }

  // ── Image submit ─────────────────────────────────────────────
  async function handleImagesSubmit() {
    if (!allUploadsComplete) return
    setIsSubmittingJob(true)
    setPurchaseError('')
    try {
      const newJobId = await submitReadingJob(uploadedImages)
      if (!newJobId) throw new Error('Reading could not be queued. Please contact support.')
      setJobId(newJobId)
      if (bestEmail) {
        emailService.sendImagesReceived({
          to: bestEmail, firstName: firstName || 'Seeker',
          toolName: tool!.name, toolEmoji: (tool as any).emoji || '📦', jobId: newJobId,
        }).catch(console.error)
      }
      if (loggedInUser) {
        await transferPurchaseToAccount(loggedInUser.id, null, newJobId)
        router.push('/member/dashboard?pending=' + newJobId)
      } else {
        setCurrentStep('account')
        if (bestEmail) detectReturningCustomer(bestEmail)
      }
    } catch (err: any) {
      setPurchaseError(err.message || 'Upload failed. Please try again.')
    } finally {
      setIsSubmittingJob(false)
    }
  }

  // ── Create account ───────────────────────────────────────────
  async function handleCreateAccount() {
    if (!name.trim()) return
    const emailToUse = email || emailPayment
    if (!emailToUse || !EMAIL_RE.test(emailToUse)) { setEmailError('Valid email required'); return }
    if (!password || password.length < 8)          { setPasswordError('Password must be at least 8 characters'); return }
    setAccountLoading(true)
    setEmailError('')
    setPasswordError('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailToUse,
        password,
        options: {
          data: {
            // ── FIX: pass both name variants so trigger catches either ──────
            name,
            full_name:        name,
            dob:              userDob,
            device_id:        getDeviceId(),
            // ── FIX: set affiliate_status from checkbox so trigger sets it ──
            affiliate_status: joinReferral ? 'pending' : 'customer',
          },
        },
      })
      if (error) throw error
      if (data.user) {
        localStorage.setItem('kayal_trusted_device', 'true')
        localStorage.setItem('kayal_user_email', emailToUse)
        let expiresAt: string | null = null
        if (isSubscription) {
          const d = new Date(); d.setMonth(d.getMonth() + 1)
          expiresAt = d.toISOString()
        }
        await transferPurchaseToAccount(data.user.id, expiresAt, jobId)
        // ── FIX: only call referral API for extra setup logic if needed ──────
        // The trigger already sets affiliate_status = 'pending' via metadata.
        // Keep this call only if /api/referral/create does additional work
        // beyond what the trigger handles (e.g. sends a welcome email).
        if (joinReferral) {
          await fetch('/api/referral/create', {
            method: 'POST',
            body:   JSON.stringify({ userId: data.user.id, name, email: emailToUse }),
          })
        }
        emailService.sendWelcomeAndLogin({
          to: emailToUse, firstName: name.split(' ')[0],
          email: emailToUse, toolName: tool!.name,
          toolEmoji: (tool as any).emoji || '📦', jobId,
        }).catch(console.error)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailToUse, password,
        })
        window.location.href = signInError
          ? '/auth/login?email=' + encodeURIComponent(emailToUse)
          : '/member/dashboard?pending=' + jobId
      }
    } catch (err: any) {
      setEmailError(err.message || 'Registration failed')
    } finally {
      setAccountLoading(false)
    }
  }

  // ── Continue as guest ────────────────────────────────────────
  async function handleContinueAsGuest() {
    const guestEmail = emailPayment || email
    if (!guestEmail || !EMAIL_RE.test(guestEmail)) {
      setGuestEmailError('Please enter a valid email so we can deliver your reading.')
      return
    }
    let guestToken = ''
    try {
      const res  = await fetch('/api/reading/guest-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, email: guestEmail }),
      })
      const data = await res.json()
      guestToken = data.token || jobId || ''
    } catch { guestToken = jobId || '' }
    emailService.sendGuestAccess({
      to: guestEmail, firstName: name.split(' ')[0] || 'Seeker',
      email: guestEmail, toolName: tool!.name,
      toolEmoji: (tool as any).emoji || '📦', jobId, guestToken,
    }).catch(console.error)
    router.push(jobId ? '/member/dashboard?pending=' + jobId : '/dashboard')
  }

  // ── Not found ────────────────────────────────────────────────
  if (!tool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-serif mb-4">Tool Not Found</h2>
          <p className="text-neutral-600 mb-6">This tool doesn't exist or may have been moved.</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => router.back()}>Go Back</Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>Dashboard</Button>
          </div>
        </Card>
      </div>
    )
  }

  const steps: { key: Step; label: string }[] = [
    { key: 'details', label: 'Review'  },
    { key: 'payment', label: 'Payment' },
    ...(requiresImages ? [{ key: 'images' as Step, label: 'Upload' }] : []),
    { key: 'account', label: 'Account' },
  ]
  const stepIndex = steps.findIndex(s => s.key === currentStep)

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50">

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-neutral-600 hover:text-primary-600">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          {loggedInUser && (
            <p className="mt-1 text-xs text-green-600">Signed in as {loggedInUser.email}</p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Progress */}
        <div className="flex items-center mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  i < stepIndex   ? 'bg-green-500 text-white'
                  : i === stepIndex ? 'bg-primary-600 text-white'
                  :                   'bg-neutral-200 text-neutral-500',
                ].join(' ')}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span className={['text-sm hidden sm:block',
                  i === stepIndex ? 'font-medium text-neutral-900' : 'text-neutral-400',
                ].join(' ')}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && <div className="flex-1 h-0.5 bg-neutral-200 mx-2" />}
            </div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 gap-8">

          {/* ── LEFT: Summary ──────────────────────────────── */}
          <div>
            <Card className="p-6 sticky top-24">
              <div className="flex items-center gap-4 mb-6">
                <div className={['w-16 h-16 rounded-xl flex items-center justify-center text-3xl', categoryColor].join(' ')}>
                  {(tool as any).emoji || '📦'}
                </div>
                <div>
                  <h1 className="text-2xl font-serif">{tool.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="capitalize">{getDomainName()}</Badge>
                    {(tool as any).isPopular && <Badge variant="primary" size="sm">Popular</Badge>}
                  </div>
                </div>
              </div>

              <p className="text-neutral-700 mb-4">
                {(tool as any).hook || (tool as any).tagline || (tool as any).description || ''}
              </p>

              {partnerName && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-blue-800">👥 Partner details saved</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Reading includes compatibility for <strong>{partnerName}</strong>.
                  </p>
                </div>
              )}

              {requiresImage && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-amber-800 flex items-center gap-1">
                    <Camera className="w-4 h-4" /> Requires: {getImageTypeDescription()}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">Upload after payment — no need now.</p>
                </div>
              )}

              <div className="bg-primary-50 p-4 rounded-lg space-y-2 mb-6">
                <p className="text-sm text-primary-700 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Secure payment · 256-bit encryption
                </p>
                <p className="text-sm text-primary-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Instant access after payment
                </p>
                <p className="text-sm text-primary-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Confirmation email sent automatically
                </p>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Total:</span>
                  <div className="text-right">
                    {hasDiscount ? (
                      <>
                        <span className="text-sm text-neutral-400 line-through mr-2">${originalPrice}</span>
                        <span className="text-3xl font-serif text-primary-600">${finalPrice.toFixed(2)}</span>
                        <Badge variant="primary" className="ml-2">Save ${savings.toFixed(2)}</Badge>
                      </>
                    ) : (
                      <span className="text-3xl font-serif text-primary-600">${finalPrice}</span>
                    )}
                  </div>
                </div>
                {isSubscription && (
                  <p className="text-xs text-neutral-500 mt-2 text-right">
                    Monthly · Renews automatically
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* ── RIGHT: Flow ────────────────────────────────── */}
          <div>
            <Card className="p-6">

              {/* STEP 1 — REVIEW */}
              {currentStep === 'details' && (
                <div className="space-y-5">
                  <h2 className="text-xl font-serif">Step 1: Review Your Order</h2>

                  {!loggedInUser && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Your email <span className="text-neutral-400">(for receipt & delivery)</span>
                      </label>
                      <input type="email" value={emailPayment}
                        onChange={e => setEmailPayment(e.target.value)}
                        onBlur={e  => detectReturningCustomer(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full p-2 border rounded-lg" />
                      {guestEmailError && <p className="text-xs text-red-500 mt-1">{guestEmailError}</p>}
                    </div>
                  )}

                  {/* Returning customer banner */}
                  {returningCustomer && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <User className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900">
                          Welcome back{returningCustomer.name ? ', ' + returningCustomer.name.split(' ')[0] : ''}!
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {returningCustomer.hasPurchases
                            ? 'We found ' + returningCustomer.purchaseCount + ' previous purchase' + (returningCustomer.purchaseCount !== 1 ? 's' : '') + ' on this email.'
                            : 'This email is already registered.'}
                          {' '}Sign in to keep everything in one place.
                        </p>
                        <div className="flex gap-3 mt-2">
                          <button
                            onClick={() => router.push('/auth/login?email=' + encodeURIComponent(emailPayment || email) + '&redirect=/member/dashboard')}
                            className="text-xs font-semibold text-amber-800 underline">
                            Sign in instead
                          </button>
                          <span className="text-xs text-amber-400">·</span>
                          <button onClick={() => setReturningCustomer(null)}
                            className="text-xs text-amber-600">
                            Continue as new
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-neutral-50 p-4 rounded-lg text-sm">
                    <h3 className="font-medium mb-3">Order Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">{tool.name}</span>
                        <span className="font-medium">${originalPrice}</span>
                      </div>
                      <div className="flex justify-between text-neutral-500">
                        <span>Domain</span><span>{getDomainName()}</span>
                      </div>
                      <div className="flex justify-between text-neutral-500">
                        <span>Format</span><span className="capitalize">{getDestinationName()}</span>
                      </div>
                      {isSubscription && (
                        <div className="flex justify-between text-blue-600">
                          <span>Billing</span><span>Monthly</span>
                        </div>
                      )}
                      {partnerName && (
                        <div className="flex justify-between text-blue-600">
                          <span>👥 Partner</span><span>{partnerName}</span>
                        </div>
                      )}
                      {hasDiscount && (
                        <div className="flex justify-between text-green-600 pt-2 border-t">
                          <span>Discount ({appliedCoupon?.code})</span>
                          <span>-${savings.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {fullName && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs">
                      <p className="font-medium text-green-800 mb-1">Reading data confirmed</p>
                      <p className="text-green-700">Name: <strong>{fullName}</strong></p>
                      <p className="text-green-700">Date of birth: <strong>{userDob}</strong></p>
                    </div>
                  )}

                  <Button onClick={() => setCurrentStep('payment')} fullWidth size="lg">
                    Continue to Payment
                  </Button>
                </div>
              )}

              {/* STEP 2 — PAYMENT */}
              {currentStep === 'payment' && (
                <div className="space-y-5">
                  <h2 className="text-xl font-serif">Step 2: Secure Payment</h2>

                  {!loggedInUser && !emailPayment && (
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-sm font-medium mb-2">Enter your email to receive your reading:</p>
                      <input type="email" value={emailPayment}
                        onChange={e => setEmailPayment(e.target.value)}
                        onBlur={e  => detectReturningCustomer(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full p-2 border rounded-lg text-sm" />
                      {guestEmailError && <p className="text-xs text-red-500 mt-1">{guestEmailError}</p>}
                    </div>
                  )}

                  {/* Coupon */}
                  <div className="bg-neutral-50 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4" /> Have a coupon?
                    </p>
                    {appliedCoupon ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              {appliedCoupon.code} applied
                            </p>
                            <p className="text-xs text-green-600">
                              {appliedCoupon.discount_type === 'percentage'
                                ? appliedCoupon.discount_value + '% off'
                                : '$' + appliedCoupon.discount_value + ' off'}
                            </p>
                          </div>
                        </div>
                        <button onClick={removeCoupon}><X className="w-4 h-4 text-green-600" /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input type="text" value={couponCode}
                          onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Enter coupon code"
                          className="flex-1 p-2 border rounded-lg text-sm"
                          disabled={validatingCoupon} />
                        <Button onClick={() => applyAndValidateCoupon(couponCode)}
                          disabled={validatingCoupon || !couponCode}
                          variant="outline" size="sm">
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

                  {/* Price summary */}
                  <div className="bg-primary-50 p-4 rounded-lg text-sm">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal:</span><span>${originalPrice}</span>
                    </div>
                    {hasDiscount && (
                      <div className="flex justify-between mb-2 text-green-600">
                        <span>Discount:</span><span>-${savings.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-2 border-t">
                      <span>Total:</span><span>${finalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-neutral-50 p-3 rounded-lg flex items-start gap-2">
                    <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-neutral-600">
                      {TEST_MODE
                        ? 'Test mode — no real payment will be taken.'
                        : 'You\'ll be taken to Stripe\'s secure payment page. Your card details are never stored on KAYAL servers.'}
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <input type="checkbox" id="terms" checked={agreedToTerms}
                      onChange={e => setAgreedToTerms(e.target.checked)} className="mt-1" />
                    <label htmlFor="terms" className="text-sm text-neutral-600">
                      I agree to the Terms of Service and Privacy Policy
                    </label>
                  </div>

                  {purchaseError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{purchaseError}</p>
                    </div>
                  )}

                  <Button onClick={handlePurchase}
                    disabled={isProcessing || !agreedToTerms}
                    fullWidth size="lg">
                    {isProcessing
                      ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Processing…</>
                      : <><CreditCard className="w-5 h-5 mr-2" />
                          Pay ${finalPrice.toFixed(2)}{isSubscription ? ' /month' : ''} →
                        </>}
                  </Button>
                </div>
              )}

              {/* STEP 3 — IMAGES */}
              {currentStep === 'images' && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-7 h-7 text-green-600" />
                    </div>
                    <h2 className="text-xl font-serif mb-1">Payment Confirmed!</h2>
                    <p className="text-neutral-600 text-sm">
                      Upload your {getImageTypeDescription()} to generate your {tool.name}.
                    </p>
                  </div>

                  {requiresImage && (
                    <ImageUploader type={requiresImage.type}
                      onCapture={handleImageCapture}
                      instructions={(requiresImage as any).instructions} />
                  )}

                  {(facePreview || palmLeftPreview || palmRightPreview) && (
                    <div className="grid grid-cols-3 gap-2">
                      {facePreview && (
                        <div className="relative">
                          <img src={facePreview} alt="Face" className="rounded-lg border-2 border-green-500" />
                          <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">Face</span>
                        </div>
                      )}
                      {palmLeftPreview && (
                        <div className="relative">
                          <img src={palmLeftPreview} alt="Left" className="rounded-lg border-2 border-green-500" />
                          <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">Left</span>
                        </div>
                      )}
                      {palmRightPreview && (
                        <div className="relative">
                          <img src={palmRightPreview} alt="Right" className="rounded-lg border-2 border-green-500" />
                          <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">Right</span>
                        </div>
                      )}
                    </div>
                  )}

                  {purchaseError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{purchaseError}</p>
                    </div>
                  )}

                  <Button onClick={handleImagesSubmit}
                    disabled={!allUploadsComplete || isSubmittingJob}
                    fullWidth size="lg">
                    {isSubmittingJob
                      ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Uploading…</>
                      : 'Submit Images & Continue'}
                  </Button>
                  <p className="text-xs text-neutral-400 text-center">
                    Photos are encrypted in transit and deleted within 30 days.
                  </p>
                </div>
              )}

              {/* STEP 4 — ACCOUNT */}
              {currentStep === 'account' && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-serif mb-2">
                      {requiresImages ? 'All submitted!' : 'Payment Successful!'}
                    </h2>
                    <p className="text-neutral-600">
                      Your {tool.name} is being prepared, {firstName || 'Seeker'}.
                    </p>
                    {bestEmail && (
                      <p className="text-xs text-green-600 mt-2 flex items-center justify-center gap-1">
                        <Mail className="w-3 h-3" />Confirmation sent to {bestEmail}
                      </p>
                    )}
                  </div>

                  {loggedInUser ? (
                    <Card className="p-5 border-2 border-green-200 bg-green-50">
                      <h3 className="font-medium mb-2 flex items-center gap-2 text-green-700">
                        <User className="w-5 h-5" /> Saved to your account
                      </h3>
                      <p className="text-sm text-green-700 mb-4">
                        Your reading has been added to <strong>{loggedInUser.email}</strong>.
                      </p>
                      <Button onClick={() => router.push('/member/dashboard')}
                        fullWidth className="bg-green-600 hover:bg-green-700">
                        Go to My Dashboard
                      </Button>
                    </Card>
                  ) : accountExists ? (
                    <MagicLinkCard
                      email={bestEmail}
                      jobId={jobId}
                      supabase={supabase}
                    />
                  ) : (
                    <>
                      {recognizedDevice && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                          <Fingerprint className="w-5 h-5 text-green-600" />
                          <p className="text-sm text-green-700">Welcome back! We recognise this device.</p>
                        </div>
                      )}

                      <Card className="p-5 border-2 border-primary-200 bg-primary-50">
                        <h3 className="font-medium mb-1 flex items-center gap-2">
                          <User className="w-5 h-5 text-primary-600" /> Create Your Free Account
                        </h3>
                        <p className="text-xs text-neutral-500 mb-4">
                          Save your reading, access your dashboard, and track your progress.
                        </p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-neutral-500 mb-1">Full Name</label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                              <input type="text" value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white"
                                placeholder="Your name" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-500 mb-1">Email</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                              <input type="email" placeholder="your@email.com"
                                value={email || emailPayment}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border rounded-lg" />
                            </div>
                            {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-500 mb-1">Password</label>
                            <div className="relative">
                              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                              <input type="password" placeholder="Minimum 8 characters"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border rounded-lg" />
                            </div>
                            {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
                          </div>
                          <div className="flex items-start gap-2">
                            <input type="checkbox" id="joinReferral" checked={joinReferral}
                              onChange={e => setJoinReferral(e.target.checked)} className="mt-1" />
                            <label htmlFor="joinReferral" className="text-xs text-neutral-600">
                              Join the <span className="font-medium">Affiliate Programme</span> — earn 25% commission sharing tools with your audience
                            </label>
                          </div>
                          <Button onClick={handleCreateAccount}
                            disabled={accountLoading || !(email || emailPayment) || !password}
                            fullWidth className="bg-primary-600 hover:bg-primary-700 mt-2">
                            {accountLoading
                              ? <Loader2 className="w-5 h-5 animate-spin" />
                              : <><User className="w-5 h-5 mr-2" />Create Account & Access Dashboard</>}
                          </Button>
                        </div>
                      </Card>

                      <Card className="p-5 border border-neutral-200">
                        <div className="flex items-start gap-3">
                          <Mail className="w-5 h-5 text-neutral-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-medium mb-1">Continue as Guest</h3>
                            <p className="text-xs text-neutral-500 mb-3">
                              We'll email your reading link when it's ready.
                            </p>
                            {!emailPayment && !email && (
                              <div className="mb-3">
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                  <input type="email" placeholder="Your email for delivery"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setGuestEmailError('') }}
                                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm" />
                                </div>
                                {guestEmailError && <p className="text-xs text-red-500 mt-1">{guestEmailError}</p>}
                              </div>
                            )}
                            <Button onClick={handleContinueAsGuest} variant="outline" size="sm">
                              Email My Reading & Continue
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </>
                  )}
                </div>
              )}

            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
