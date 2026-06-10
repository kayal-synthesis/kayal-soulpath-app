'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Camera, AlertCircle, Check, X, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { Tool } from '@/lib/constants/tools'
import { useUserStore } from '@/lib/store/userStore'

interface ImageRequirementCheckProps {
  tool: Tool
  onVerified: () => void
  onCancel: () => void
}

export const ImageRequirementCheck = ({ tool, onVerified, onCancel }: ImageRequirementCheckProps) => {
  const router = useRouter()
  const { user, images } = useUserStore()
  const [hasPalm, setHasPalm] = useState(false)
  const [hasFace, setHasFace] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const checkImages = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      // First check from store
      if (images) {
        setHasPalm(!!images.palm)
        setHasFace(!!images.face)
      }

      // Then verify with server
      try {
        setChecking(true)
        const response = await fetch(`/api/user/${user.id}/images`)
        if (response.ok) {
          const data = await response.json()
          setHasPalm(!!data.palm)
          setHasFace(!!data.face)
        }
      } catch (error) {
        console.error('Failed to check images:', error)
      } finally {
        setLoading(false)
        setChecking(false)
      }
    }

    checkImages()
  }, [user, images])

  // If no requirements, proceed immediately - but use useEffect to call onVerified
  useEffect(() => {
    if (!tool.requiredImages) {
      onVerified()
    }
  }, [tool.requiredImages, onVerified])

  // If all requirements are met, proceed - but use useEffect to call onVerified
  useEffect(() => {
    if (!loading && tool.requiredImages) {
      const requirements = tool.requiredImages
      const needsPalm = requirements.both || requirements.palm
      const needsFace = requirements.both || requirements.face
      const allMet = (!needsPalm || hasPalm) && (!needsFace || hasFace)
      
      if (allMet) {
        onVerified()
      }
    }
  }, [loading, hasPalm, hasFace, tool.requiredImages, onVerified])

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto mb-4" />
          <h2 className="text-xl font-serif mb-2">Checking Your Images</h2>
          <p className="text-neutral-600">Verifying if you have the required images for {tool.name}...</p>
        </Card>
      </div>
    )
  }

  const requirements = tool.requiredImages
  if (!requirements) return null

  const needsPalm = requirements.both || requirements.palm
  const needsFace = requirements.both || requirements.face

  const missingItems = []
  if (needsPalm && !hasPalm) missingItems.push('palm image')
  if (needsFace && !hasFace) missingItems.push('face image')

  const missingText = missingItems.join(' and ')

  // Build the upload URL with parameters
  const uploadUrl = `/onboarding/upload?palm=${needsPalm}&face=${needsFace}&both=${requirements.both}&tool=${encodeURIComponent(tool.name)}&return=${encodeURIComponent(window.location.pathname)}`

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {needsPalm && needsFace ? (
              <Camera className="w-10 h-10 text-amber-600" />
            ) : (
              <ImageIcon className="w-10 h-10 text-amber-600" />
            )}
          </div>
          <h2 className="text-2xl font-serif mb-2">Images Required</h2>
          <p className="text-neutral-600">
            {tool.name} requires {missingText} for accurate analysis.
          </p>
          {requirements.description && (
            <p className="text-sm text-neutral-500 mt-3 italic bg-neutral-50 p-3 rounded-lg">
              "{requirements.description}"
            </p>
          )}
        </div>

        {/* Requirements Checklist */}
        <div className="space-y-3 mb-6">
          {needsPalm && (
            <div className={`flex items-center justify-between p-4 rounded-lg border ${
              hasPalm ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  hasPalm ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  {hasPalm ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Palm Image</p>
                  <p className="text-xs text-neutral-500">Clear photo of your palm</p>
                </div>
              </div>
              <span className={`text-sm font-medium ${
                hasPalm ? 'text-green-600' : 'text-amber-600'
              }`}>
                {hasPalm ? 'Uploaded' : 'Missing'}
              </span>
            </div>
          )}

          {needsFace && (
            <div className={`flex items-center justify-between p-4 rounded-lg border ${
              hasFace ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  hasFace ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  {hasFace ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Face Image</p>
                  <p className="text-xs text-neutral-500">Clear front-facing photo</p>
                </div>
              </div>
              <span className={`text-sm font-medium ${
                hasFace ? 'text-green-600' : 'text-amber-600'
              }`}>
                {hasFace ? 'Uploaded' : 'Missing'}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {(!hasPalm || !hasFace) && (
            <Link href={uploadUrl}>
              <Button fullWidth size="lg">
                Upload Missing Images
              </Button>
            </Link>
          )}
          
          <Button 
            variant="outline" 
            onClick={onCancel} 
            fullWidth
            size="lg"
            className="flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </div>

        {/* Info Note */}
        <p className="text-xs text-center text-neutral-500 mt-6">
          Your images are encrypted and never shared. They are only used for your personal readings.
        </p>
      </Card>
    </div>
  )
}