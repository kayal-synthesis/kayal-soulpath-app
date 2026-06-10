'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Camera,
  Loader2,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  Mic
} from 'lucide-react'

// Tool requirements - ONLY Face, Both Palms, or Face+Both Palms
const toolRequirements = {
  'the-prophets-voice': { type: 'face+palms', title: 'THE PROPHET\'S VOICE' },
  'the-hearts-echo': { type: 'face', title: 'THE HEART\'S ECHO' },
  'the-wealth-whisperer': { type: 'palms', title: 'THE WEALTH WHISPERER' },
  'the-career-call': { type: 'face', title: 'THE CAREER CALL' },
  'the-souls-voice': { type: 'face', title: 'THE SOUL\'S VOICE' },
  'the-vitality-reader': { type: 'face', title: 'THE VITALITY READER' },
  'the-destiny-dialogue': { type: 'face+palms', title: 'THE DESTINY DIALOGUE' },
  'the-daily-prophet': { type: 'none', title: 'THE DAILY PROPHET' },
  'the-time-speaker': { type: 'none', title: 'THE TIME SPEAKER' },
  'the-truth-teller': { type: 'face+palms', title: 'THE TRUTH TELLER' }
}

export default function PurchaseAudioPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAnonymousStore()
  const toolId = params.toolId as string
  const requirement = toolRequirements[toolId as keyof typeof toolRequirements]
  
  const [facePreview, setFacePreview] = useState<string | null>(null)
  const [palmLeftPreview, setPalmLeftPreview] = useState<string | null>(null)
  const [palmRightPreview, setPalmRightPreview] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) {
        router.push('/onboarding/basic')
      } else {
        setIsChecking(false)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [user, router])

  // Auto-redirect if no requirements needed
  useEffect(() => {
    if (!isChecking && requirement?.type === 'none') {
      router.push(`/audio/${toolId}`)
    }
  }, [isChecking, requirement, toolId, router])

  const handleImageCapture = (file: File, type: 'face' | 'palm-left' | 'palm-right') => {
    const previewUrl = URL.createObjectURL(file)
    if (type === 'face') setFacePreview(previewUrl)
    if (type === 'palm-left') setPalmLeftPreview(previewUrl)
    if (type === 'palm-right') setPalmRightPreview(previewUrl)
  }

  const handleSubmit = () => {
    // Here you would save the images to your storage/context
    // Then redirect to the audio page
    router.push(`/audio/${toolId}`)
  }

  const isComplete = () => {
    if (requirement?.type === 'face') return facePreview
    if (requirement?.type === 'palms') return palmLeftPreview && palmRightPreview
    if (requirement?.type === 'face+palms') return facePreview && palmLeftPreview && palmRightPreview
    return true
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!requirement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-serif mb-4">Tool Not Found</h2>
          <Button onClick={() => router.push('/domain/voice-of-prophecy')}>
            Return to Voice of Prophecy
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-neutral-600 hover:text-primary-600 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-3xl font-serif text-primary-900 mb-2">{requirement.title}</h1>
            <p className="text-neutral-600">
              {requirement.type === 'face' && 'Upload your face photo to begin your voice session'}
              {requirement.type === 'palms' && 'Upload both palm photos to begin your voice session'}
              {requirement.type === 'face+palms' && 'Upload your face and both palms to begin your voice session'}
            </p>
          </div>

          <div className="space-y-6">
            {/* Face Upload */}
            {(requirement.type === 'face' || requirement.type === 'face+palms') && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Face Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageCapture(file, 'face')
                  }}
                  className="w-full p-2 border rounded-lg"
                />
                {facePreview && (
                  <div className="relative w-20 h-20">
                    <img src={facePreview} alt="Face" className="w-full h-full rounded-lg object-cover" />
                    <CheckCircle className="absolute -top-2 -right-2 w-5 h-5 text-green-500 bg-white rounded-full" />
                  </div>
                )}
              </div>
            )}

            {/* Palms Upload */}
            {(requirement.type === 'palms' || requirement.type === 'face+palms') && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Left Palm
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageCapture(file, 'palm-left')
                    }}
                    className="w-full p-2 border rounded-lg"
                  />
                  {palmLeftPreview && (
                    <div className="relative w-20 h-20">
                      <img src={palmLeftPreview} alt="Left Palm" className="w-full h-full rounded-lg object-cover" />
                      <CheckCircle className="absolute -top-2 -right-2 w-5 h-5 text-green-500 bg-white rounded-full" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Right Palm
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageCapture(file, 'palm-right')
                    }}
                    className="w-full p-2 border rounded-lg"
                  />
                  {palmRightPreview && (
                    <div className="relative w-20 h-20">
                      <img src={palmRightPreview} alt="Right Palm" className="w-full h-full rounded-lg object-cover" />
                      <CheckCircle className="absolute -top-2 -right-2 w-5 h-5 text-green-500 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!isComplete()}
              fullWidth
              size="lg"
              className="mt-6"
            >
              Begin Voice Session
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}