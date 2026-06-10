'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUserStore } from '@/lib/store/userStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ImageUploader } from '@/components/onboarding/ImageUploader'
import { ArrowLeft, ChevronRight, Camera } from 'lucide-react'
import { toast } from 'sonner'

interface UploadedImage {
  file: File
  type: 'palm' | 'face'
  metadata: {
    hand?: 'left' | 'right' | 'dominant'
    angle?: 'front' | 'left' | 'right' | 'profile'
  }
}

export default function UploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, onboarding, updateOnboarding } = useUserStore()
  
  // Get required image types from URL parameters
  const requiredPalm = searchParams.get('palm') === 'true'
  const requiredFace = searchParams.get('face') === 'true'
  const requiredBoth = searchParams.get('both') === 'true'
  
  // Determine what to show
  const showPalm = requiredPalm || requiredBoth
  const showFace = requiredFace || requiredBoth
  const toolName = searchParams.get('tool') || 'this tool'
  
  const [palmImage, setPalmImage] = useState<UploadedImage | null>(null)
  const [faceImage, setFaceImage] = useState<UploadedImage | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [palmMetadata, setPalmMetadata] = useState({ hand: 'dominant' })
  const [faceMetadata, setFaceMetadata] = useState({ angle: 'front' })

  const handlePalmUpload = (file: File, metadata: any) => {
    setPalmImage({
      file,
      type: 'palm',
      metadata
    })
  }

  const handleFaceUpload = (file: File, metadata: any) => {
    setFaceImage({
      file,
      type: 'face',
      metadata
    })
  }

  const removePalm = () => {
    setPalmImage(null)
  }

  const removeFace = () => {
    setFaceImage(null)
  }

  const uploadToServer = async () => {
    if (!user?.id) {
      toast.error('Please log in first')
      router.push('/login')
      return
    }

    // Validate required images are uploaded
    if (showPalm && !palmImage) {
      toast.error('Please upload a palm image')
      return
    }
    if (showFace && !faceImage) {
      toast.error('Please upload a face image')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Upload palm image if present
      if (palmImage) {
        const formData = new FormData()
        formData.append('token', user.id)
        formData.append('image', palmImage.file)
        formData.append('hand', palmImage.metadata.hand || 'dominant')

        const response = await fetch('/api/user/upload-palm', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) throw new Error('Palm upload failed')
        setUploadProgress(showFace ? 50 : 100)
      }

      // Upload face image if present
      if (faceImage) {
        const formData = new FormData()
        formData.append('token', user.id)
        formData.append('image', faceImage.file)
        formData.append('angle', faceImage.metadata.angle || 'front')

        const response = await fetch('/api/user/upload-face', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) throw new Error('Face upload failed')
        setUploadProgress(100)
      }

      toast.success('Images uploaded successfully!')
      
      updateOnboarding({ 
        handImage: palmImage?.file.name,
        faceImage: faceImage?.file.name,
        completed: true 
      })
      
      // Redirect back to the tool or to processing
      const returnTo = searchParams.get('return') || '/onboarding/processing'
      router.push(returnTo)

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload images. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const skipUpload = () => {
    if ((showPalm && !palmImage) || (showFace && !faceImage)) {
      toast.error(`You need to upload the required images for ${toolName}`)
      return
    }
    router.back()
  }

  // If no requirements specified, show both (backward compatibility)
  const showBoth = !showPalm && !showFace

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-neutral-600 hover:text-primary-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {toolName}
        </button>
        <h1 className="text-3xl font-serif mb-2">Upload Your Images</h1>
        <p className="text-neutral-600">
          {showPalm && showFace && `${toolName} requires both palm and face images.`}
          {showPalm && !showFace && `${toolName} requires a palm image.`}
          {!showPalm && showFace && `${toolName} requires a face image.`}
          {showBoth && 'Choose to take a photo with your camera or upload from your device.'}
        </p>
      </div>

      <div className={`grid ${(showPalm && showFace) || showBoth ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-2xl mx-auto'} gap-8`}>
        {/* Palm Upload Section - Only show if needed */}
        {(showPalm || showBoth) && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-medium">Palm Image {showPalm && <span className="text-red-500 text-sm ml-2">*Required</span>}</h2>
              {palmImage && (
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  ✓ Uploaded
                </span>
              )}
            </div>

            <ImageUploader
              type="palm"
              onUpload={handlePalmUpload}
              onRemove={removePalm}
              value={palmImage?.file}
              metadata={palmMetadata}
              onMetadataChange={setPalmMetadata}
            />
          </Card>
        )}

        {/* Face Upload Section - Only show if needed */}
        {(showFace || showBoth) && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-medium">Face Image {showFace && <span className="text-red-500 text-sm ml-2">*Required</span>}</h2>
              {faceImage && (
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  ✓ Uploaded
                </span>
              )}
            </div>

            <ImageUploader
              type="face"
              onUpload={handleFaceUpload}
              onRemove={removeFace}
              value={faceImage?.file}
              metadata={faceMetadata}
              onMetadataChange={setFaceMetadata}
            />
          </Card>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Card className="mt-8 p-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Uploading images...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        <Button
          onClick={uploadToServer}
          disabled={isUploading}
          size="lg"
          className="flex-1"
        >
          {isUploading ? 'Uploading...' : 'Upload Images'}
          {!isUploading && <ChevronRight className="w-4 h-4 ml-2" />}
        </Button>
        
        <Button
          variant="outline"
          onClick={skipUpload}
          disabled={isUploading}
          size="lg"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}