'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ImageUploader } from '@/components/ui/ImageUploader'
import { 
  ArrowLeft,
  Lock,
  Shield,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Camera,
  Sparkles,
  Loader2,
  Heart,
  Briefcase,
  TrendingUp,
  Moon,
  Zap,
  Star,
  Crown,
  Clock,
  Headphones,
  Infinity,
  Info
} from 'lucide-react'

// Import all other tools
import { oracleTempleTools } from '@/lib/constants/oracle-temple-tools'
import { loveTools } from '@/lib/constants/love-tools'
import { careerTools } from '@/lib/constants/career-tools'
import { wealthTools } from '@/lib/constants/wealth-tools'
import { spiritualTools } from '@/lib/constants/spiritual-tools'
import { healthTools } from '@/lib/constants/health-tools'
import { lifePathTools } from '@/lib/constants/life-path-tools'

const allTools = [
  ...oracleTempleTools,
  ...loveTools,
  ...careerTools,
  ...wealthTools,
  ...spiritualTools,
  ...healthTools,
  ...lifePathTools
]

export default function ReportPurchasePage() {
  const params = useParams()
  const router = useRouter()
  const { user, setUserEmail, hasCompletedOnboarding } = useAnonymousStore()
  const toolId = params.toolId as string
  const tool = allTools.find(t => t.id === toolId)

  // Email collection state
  const [email, setEmail] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)
  
  // Image upload state
  const [uploadedImages, setUploadedImages] = useState<{
    face?: File
    'palm-left'?: File
    'palm-right'?: File
  }>({})
  
  const [facePreview, setFacePreview] = useState<string | null>(null)
  const [palmLeftPreview, setPalmLeftPreview] = useState<string | null>(null)
  const [palmRightPreview, setPalmRightPreview] = useState<string | null>(null)
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [currentStep, setCurrentStep] = useState<'images' | 'details' | 'payment'>('images')
  const [showImageTips, setShowImageTips] = useState(true)

  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      router.push('/onboarding/basic')
    }
  }, [hasCompletedOnboarding, router])

  // Debug: Log when component renders and state changes
  useEffect(() => {
    console.log('🔍 Email modal state:', showEmailModal)
    console.log('🔍 User email:', user?.email)
  }, [showEmailModal, user?.email])

  if (!tool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-2xl font-serif mb-4">Tool Not Found</h2>
          <p className="text-neutral-600 mb-6">The tool you're looking for doesn't exist or may have been moved.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const requiresImage = tool.requiresImage
  const requiresImages = !!requiresImage

  const handleImageCapture = (file: File, type: 'face' | 'palm-left' | 'palm-right') => {
    const previewUrl = URL.createObjectURL(file)
    
    setUploadedImages(prev => ({ ...prev, [type]: file }))
    
    if (type === 'face') {
      setFacePreview(previewUrl)
      toast.success('Face photo uploaded successfully!')
    } else if (type === 'palm-left') {
      setPalmLeftPreview(previewUrl)
      toast.success('Left palm photo uploaded successfully!')
    } else if (type === 'palm-right') {
      setPalmRightPreview(previewUrl)
      toast.success('Right palm photo uploaded successfully!')
    }
  }

  const checkUploadComplete = () => {
    if (!requiresImages || !requiresImage) return true
    
    if (requiresImage.type === 'face') return !!uploadedImages.face
    if (requiresImage.type === 'palm') return !!uploadedImages['palm-left'] && !!uploadedImages['palm-right']
    if (requiresImage.type === 'both') return !!uploadedImages.face && !!uploadedImages['palm-left'] && !!uploadedImages['palm-right']
    return true
  }

  const allUploadsComplete = checkUploadComplete()

  const handleContinue = () => {
    if (currentStep === 'images') {
      if (requiresImages && !allUploadsComplete) {
        toast.error('Please upload all required photos first')
        return
      }
      setCurrentStep('details')
    } else if (currentStep === 'details') {
      setCurrentStep('payment')
    }
  }

  const handleEmailSubmit = () => {
    console.log('📧 Email submitted:', email)
    
    if (!email.trim()) {
      toast.error('Email is required')
      return
    }
    if (!email.includes('@') || !email.includes('.')) {
      toast.error('Please enter a valid email address')
      return
    }
    
    // Save email to store
    setUserEmail(email, true)
    console.log('✅ Email saved to store')
    
    // Close modal
    setShowEmailModal(false)
    toast.success('Email saved!')
    
    // Process payment
    processPayment()
  }

  const processPayment = () => {
    setIsProcessing(true)
    console.log('💳 Processing payment...')

    setTimeout(() => {
      toast.success('Purchase successful! Redirecting to your report...')
      setIsProcessing(false)
      router.push(`/report/${toolId}`)
    }, 2000)
  }

  const handlePurchase = () => {
    console.log('🛒 Purchase clicked')
    
    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions')
      return
    }

    // DIRECTLY SHOW EMAIL MODAL - no conditions
    console.log('📧 Showing email modal')
    setShowEmailModal(true)
  }

  const getImageTypeDescription = () => {
    if (!requiresImage) return null
    if (requiresImage.type === 'face') return 'face photo'
    if (requiresImage.type === 'palm') return 'left and right palm photos'
    return 'face, left palm, and right palm photos'
  }

  const getUploadCount = () => {
    if (!requiresImage) return 0
    if (requiresImage.type === 'face') return 1
    if (requiresImage.type === 'palm') return 2
    return 3
  }

  const getDomainName = () => {
    if (tool.category === 'oracle-temple') return 'Oracle Temple'
    if (tool.category === 'love') return 'Love'
    if (tool.category === 'career') return 'Career'
    if (tool.category === 'wealth') return 'Wealth'
    if (tool.category === 'spiritual') return 'Spiritual'
    if (tool.category === 'health') return 'Health'
    if (tool.category === 'life-path') return 'Life Path'
    return 'Premium Tool'
  }

  // Get category color based on domain
  const getCategoryColor = () => {
    if (tool.category === 'oracle-temple') return 'text-primary-600 bg-primary-50'
    if (tool.category === 'love') return 'text-red-600 bg-red-50'
    if (tool.category === 'career') return 'text-blue-600 bg-blue-50'
    if (tool.category === 'wealth') return 'text-green-600 bg-green-50'
    if (tool.category === 'spiritual') return 'text-purple-600 bg-purple-50'
    if (tool.category === 'health') return 'text-yellow-600 bg-yellow-50'
    if (tool.category === 'life-path') return 'text-indigo-600 bg-indigo-50'
    return 'text-primary-600 bg-primary-50'
  }

  const categoryColor = getCategoryColor()

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-neutral-600 hover:text-primary-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'images' ? 'bg-primary-600 text-white' : 'bg-green-500 text-white'
            }`}>
              {currentStep === 'images' ? '1' : '✓'}
            </div>
            <span className={currentStep === 'images' ? 'font-medium' : 'text-neutral-500'}>
              {requiresImages ? `Upload ${getUploadCount()} Photos` : 'Review Order'}
            </span>
          </div>
          <div className="w-12 h-0.5 bg-neutral-200" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'details' ? 'bg-primary-600 text-white' : 
              currentStep === 'payment' ? 'bg-green-500 text-white' : 'bg-neutral-200 text-neutral-500'
            }`}>
              2
            </div>
            <span className={currentStep === 'details' ? 'font-medium' : 'text-neutral-500'}>
              Details
            </span>
          </div>
          <div className="w-12 h-0.5 bg-neutral-200" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'payment' ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-500'
            }`}>
              3
            </div>
            <span className={currentStep === 'payment' ? 'font-medium' : 'text-neutral-500'}>
              Payment
            </span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 gap-8"
        >
          {/* Left Column - Tool Info */}
          <div>
            <Card className="p-6 sticky top-24">
              {/* Tool Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl ${categoryColor}`}>
                  {tool.emoji || '📦'}
                </div>
                <div>
                  <h1 className="text-2xl font-serif">{tool.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="capitalize">
                      {getDomainName()}
                    </Badge>
                    {tool.isPopular && (
                      <Badge variant="primary" size="sm">Popular</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-neutral-700 mb-6">
                {tool.longDescription || tool.description}
              </p>

              {/* Image Requirements Summary */}
              {requiresImages && requiresImage && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
                    <Camera className="w-4 h-4" />
                    Required: {getImageTypeDescription()}
                  </div>
                  <p className="text-sm text-amber-700 mb-2">
                    {requiresImage.description}
                  </p>
                  <button
                    onClick={() => setShowImageTips(!showImageTips)}
                    className="text-xs text-amber-600 flex items-center gap-1 hover:underline"
                  >
                    <Info className="w-3 h-3" />
                    {showImageTips ? 'Hide' : 'Show'} photo tips
                  </button>

                  {showImageTips && (
                    <ul className="mt-3 space-y-1 text-xs text-amber-600">
                      {requiresImage.instructions?.map((instruction, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-amber-400 mt-0.5">•</span>
                          {instruction}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Features Preview */}
              <div className="space-y-3 mb-6">
                <h3 className="font-medium">What you'll get:</h3>
                {tool.features?.slice(0, 4).map((feature: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600">{feature.split(' - ')[0].replace(/\*\*/g, '')}</span>
                  </div>
                ))}
              </div>

              {/* Delivery Info */}
              <div className="bg-primary-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm text-primary-700">
                  <Shield className="w-4 h-4" />
                  <span>Secure 256-bit encryption</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>Instant delivery after purchase</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary-700">
                  <Camera className="w-4 h-4" />
                  <span>AI-powered {getImageTypeDescription() || 'analysis'}</span>
                </div>
              </div>

              {/* Price Summary */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Total:</span>
                  <span className="text-3xl font-serif text-primary-600">${tool.price || 0}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Purchase Flow */}
          <div>
            <Card className="p-6">
              <h2 className="text-xl font-serif mb-6">
                {currentStep === 'images' && `Step 1: Upload ${getUploadCount()} Photos`}
                {currentStep === 'details' && 'Step 2: Review Your Order'}
                {currentStep === 'payment' && 'Step 3: Complete Payment'}
              </h2>

              {/* Step 1: Image Upload */}
              {currentStep === 'images' && requiresImages && requiresImage && (
                <div className="space-y-6">
                  <ImageUploader
                    type={requiresImage.type}
                    onCapture={handleImageCapture}
                    instructions={requiresImage.instructions}
                  />

                  {/* Image Preview Grid */}
                  {(facePreview || palmLeftPreview || palmRightPreview) && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-3">Uploaded Photos:</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {facePreview && (
                          <div className="relative">
                            <img src={facePreview} alt="Face" className="w-full rounded-lg border-2 border-green-500" />
                            <div className="absolute top-1 left-1 bg-green-500 text-white px-1 py-0.5 rounded-full text-[10px]">
                              Face
                            </div>
                          </div>
                        )}
                        {palmLeftPreview && (
                          <div className="relative">
                            <img src={palmLeftPreview} alt="Left Palm" className="w-full rounded-lg border-2 border-green-500" />
                            <div className="absolute top-1 left-1 bg-green-500 text-white px-1 py-0.5 rounded-full text-[10px]">
                              Left
                            </div>
                          </div>
                        )}
                        {palmRightPreview && (
                          <div className="relative">
                            <img src={palmRightPreview} alt="Right Palm" className="w-full rounded-lg border-2 border-green-500" />
                            <div className="absolute top-1 left-1 bg-green-500 text-white px-1 py-0.5 rounded-full text-[10px]">
                              Right
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: No Images Required */}
              {currentStep === 'images' && !requiresImages && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Images Required</h3>
                  <p className="text-neutral-600 mb-6">
                    This tool doesn't require any photos. You can proceed directly.
                  </p>
                </div>
              )}

              {/* Step 2: Order Details */}
              {currentStep === 'details' && (
                <div className="space-y-6">
                  <div className="bg-neutral-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-3">Order Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">{tool.name}</span>
                        <span className="font-medium">${tool.price || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">Category</span>
                        <span className="text-neutral-700">{getDomainName()}</span>
                      </div>
                      {facePreview && (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500">Face photo analysis</span>
                          <span className="text-green-600">Included</span>
                        </div>
                      )}
                      {palmLeftPreview && (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500">Left palm analysis</span>
                          <span className="text-green-600">Included</span>
                        </div>
                      )}
                      {palmRightPreview && (
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500">Right palm analysis</span>
                          <span className="text-green-600">Included</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      What happens next?
                    </h3>
                    <ul className="space-y-2 text-sm text-blue-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        Our AI will analyze your {getImageTypeDescription() || 'information'}
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        Generate your personalized {tool.name} report
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        Results available instantly after payment
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        You'll receive email with download link
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {currentStep === 'payment' && (
                <div className="space-y-6">
                  <div className="bg-neutral-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-3">Payment Details</h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      This is a demo. In production, Stripe integration would go here.
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Card Number</label>
                        <input
                          type="text"
                          placeholder="4242 4242 4242 4242"
                          className="w-full p-2 border rounded-lg bg-white"
                          value="4242 4242 4242 4242"
                          readOnly
                          disabled
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Expiry</label>
                          <input
                            type="text"
                            placeholder="12/25"
                            className="w-full p-2 border rounded-lg bg-white"
                            value="12/25"
                            readOnly
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">CVC</label>
                          <input
                            type="text"
                            placeholder="123"
                            className="w-full p-2 border rounded-lg bg-white"
                            value="123"
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mt-0.5"
                    />
                    <label htmlFor="terms" className="text-sm text-neutral-600">
                      I agree to the Terms of Service and Privacy Policy
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-8 space-y-3">
                {currentStep !== 'payment' && (
                  <Button
                    size="lg"
                    fullWidth
                    onClick={handleContinue}
                    disabled={currentStep === 'images' && requiresImages && !allUploadsComplete}
                  >
                    {currentStep === 'images' && requiresImages && !allUploadsComplete
                      ? `Upload ${getUploadCount()} Photos First`
                      : 'Continue'}
                  </Button>
                )}

                {currentStep === 'payment' && (
                  <Button
                    size="lg"
                    fullWidth
                    onClick={handlePurchase}
                    disabled={isProcessing || !agreedToTerms}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay ${tool.price || 0} - Complete Purchase
                      </>
                    )}
                  </Button>
                )}

                {currentStep !== 'images' && (
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => {
                      if (currentStep === 'details') setCurrentStep('images')
                      if (currentStep === 'payment') setCurrentStep('details')
                    }}
                  >
                    Back
                  </Button>
                )}
              </div>

              {/* Upload Warning */}
              {currentStep === 'images' && requiresImages && !allUploadsComplete && (
                <div className="flex items-center gap-2 text-amber-600 text-sm mt-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Please upload all required photos to continue</span>
                </div>
              )}

              {/* Payment Methods */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-center gap-3 text-xs text-neutral-500">
                  <span>Visa</span>
                  <span>•</span>
                  <span>Mastercard</span>
                  <span>•</span>
                  <span>Amex</span>
                  <span>•</span>
                  <span>PayPal</span>
                  <span>•</span>
                  <span>Apple Pay</span>
                </div>

                <div className="flex items-center justify-center gap-1 mt-4 text-xs text-neutral-400">
                  <Lock className="w-3 h-3" />
                  <span>Secure checkout powered by Stripe</span>
                </div>
              </div>
            </Card>

            {/* Help Section */}
            <Card className="mt-4 p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-800">Need Help?</h3>
                  <p className="text-xs text-blue-700">
                    Contact support at{' '}
                    <a href="mailto:support@kayalsoulpath.com" className="underline">
                      support@kayalsoulpath.com
                    </a>
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-xl font-serif mb-2">Enter Your Email</h3>
            <p className="text-sm text-neutral-600 mb-4">
              We'll send your purchase details and updates
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full p-3 border rounded-lg mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowEmailModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleEmailSubmit} className="flex-1">
                Continue
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}