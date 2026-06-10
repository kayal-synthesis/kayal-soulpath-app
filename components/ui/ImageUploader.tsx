'use client'

import { useState, useRef } from 'react'
import { Upload, X, Check, Image as ImageIcon, User, Hand } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from 'sonner'

interface ImageUploaderProps {
  type: 'face' | 'palm' | 'both'
  onCapture: (file: File, type: 'face' | 'palm-left' | 'palm-right') => void
  onComplete?: () => void
  instructions?: string[]
}

export const ImageUploader = ({ type, onCapture, onComplete, instructions }: ImageUploaderProps) => {
  const [currentStep, setCurrentStep] = useState<
    'face' | 'palm-left' | 'palm-right'
  >(
    type === 'face' ? 'face' : 
    type === 'palm' ? 'palm-left' : 
    'face'
  )
  
  const [faceImage, setFaceImage] = useState<string | null>(null)
  const [palmLeftImage, setPalmLeftImage] = useState<string | null>(null)
  const [palmRightImage, setPalmRightImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      toast.error('Please upload a JPG or PNG image')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    setIsUploading(true)
    const imageUrl = URL.createObjectURL(file)

    setTimeout(() => {
      if (currentStep === 'face') {
        setFaceImage(imageUrl)
        onCapture(file, 'face')
        toast.success('Face photo uploaded!')
        
        if (type === 'both') {
          setCurrentStep('palm-left')
        } else if (type === 'palm') {
          setCurrentStep('palm-left')
        }
      } 
      else if (currentStep === 'palm-left') {
        setPalmLeftImage(imageUrl)
        onCapture(file, 'palm-left')
        toast.success('Left palm photo uploaded!')
        setCurrentStep('palm-right')
      }
      else if (currentStep === 'palm-right') {
        setPalmRightImage(imageUrl)
        onCapture(file, 'palm-right')
        toast.success('Right palm photo uploaded!')
      }
      
      setIsUploading(false)
    }, 500)

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (imageType: 'face' | 'palm-left' | 'palm-right') => {
    if (imageType === 'face') {
      setFaceImage(null)
      setCurrentStep('face')
    } else if (imageType === 'palm-left') {
      setPalmLeftImage(null)
      setCurrentStep('palm-left')
    } else {
      setPalmRightImage(null)
      setCurrentStep('palm-right')
    }
    toast.info(`${imageType.replace('-', ' ')} image removed`)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const isComplete = () => {
    if (type === 'face') return !!faceImage
    if (type === 'palm') return !!palmLeftImage && !!palmRightImage
    return !!faceImage && !!palmLeftImage && !!palmRightImage
  }

  const getTotalSteps = () => {
    if (type === 'face') return 1
    if (type === 'palm') return 2
    return 3
  }

  const getCurrentStepNumber = () => {
    if (type === 'face') return 1
    if (type === 'palm') {
      if (!palmLeftImage) return 1
      return 2
    }
    if (!faceImage) return 1
    if (!palmLeftImage) return 2
    return 3
  }

  const getStepIcon = () => {
    if (currentStep === 'face') return <User className="w-5 h-5" />
    return <Hand className="w-5 h-5" />
  }

  const getStepInstruction = () => {
    const stepNum = getCurrentStepNumber()
    const totalSteps = getTotalSteps()
    
    if (currentStep === 'face') return `Step ${stepNum} of ${totalSteps}: Upload your face photo`
    if (currentStep === 'palm-left') return `Step ${stepNum} of ${totalSteps}: Upload your LEFT palm`
    return `Step ${stepNum} of ${totalSteps}: Upload your RIGHT palm`
  }

  const showFace = type === 'face' || type === 'both'
  const showLeftPalm = type === 'palm' || type === 'both'
  const showRightPalm = type === 'palm' || type === 'both'

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Progress Steps */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          {showFace && (
            <span className="text-sm font-medium flex items-center gap-2">
              <User className={`w-4 h-4 ${faceImage ? 'text-green-600' : 'text-neutral-400'}`} />
              Face {faceImage && '✓'}
            </span>
          )}
          {showLeftPalm && (
            <span className="text-sm font-medium flex items-center gap-2">
              <Hand className={`w-4 h-4 ${palmLeftImage ? 'text-green-600' : 'text-neutral-400'}`} />
              Left {palmLeftImage && '✓'}
            </span>
          )}
          {showRightPalm && (
            <span className="text-sm font-medium flex items-center gap-2">
              <Hand className={`w-4 h-4 ${palmRightImage ? 'text-green-600' : 'text-neutral-400'}`} />
              Right {palmRightImage && '✓'}
            </span>
          )}
        </div>
        
        <div className="flex gap-1">
          {showFace && <div className={`h-2 flex-1 rounded-full ${faceImage ? 'bg-green-500' : 'bg-neutral-200'}`} />}
          {showLeftPalm && <div className={`h-2 flex-1 rounded-full ${palmLeftImage ? 'bg-green-500' : 'bg-neutral-200'}`} />}
          {showRightPalm && <div className={`h-2 flex-1 rounded-full ${palmRightImage ? 'bg-green-500' : 'bg-neutral-200'}`} />}
        </div>
      </div>

      {/* Preview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {faceImage && (
          <div className="relative">
            <img src={faceImage} alt="Face" className="w-full rounded-lg border-2 border-green-500" />
            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <Check className="w-3 h-3" />
              Face
            </div>
            <button onClick={() => removeImage('face')} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-neutral-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {palmLeftImage && (
          <div className="relative">
            <img src={palmLeftImage} alt="Left Palm" className="w-full rounded-lg border-2 border-green-500" />
            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
              <Check className="w-3 h-3 mr-1" />
              Left
            </div>
            <button onClick={() => removeImage('palm-left')} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-neutral-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {palmRightImage && (
          <div className="relative">
            <img src={palmRightImage} alt="Right Palm" className="w-full rounded-lg border-2 border-green-500" />
            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
              <Check className="w-3 h-3 mr-1" />
              Right
            </div>
            <button onClick={() => removeImage('palm-right')} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-neutral-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Current Step */}
      {!isComplete() && (
        <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-lg">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            {getStepIcon()}
          </div>
          <div>
            <p className="font-medium text-primary-900">{getStepInstruction()}</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {instructions && !isComplete() && (
        <Card className="bg-amber-50 p-4">
          <h3 className="font-medium text-amber-800 mb-2">📸 Photo Tips</h3>
          <ul className="space-y-2">
            {instructions.map((instruction, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-amber-500">•</span>
                {instruction}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Upload Button */}
      {!isComplete() && (
        <Button onClick={triggerFileInput} fullWidth size="lg" disabled={isUploading}>
          {isUploading ? (
            <>Uploading...</>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload {currentStep === 'face' ? 'Face' : currentStep === 'palm-left' ? 'Left Palm' : 'Right Palm'}
            </>
          )}
        </Button>
      )}

      {/* Complete Button */}
      {onComplete && isComplete() && (
        <Button onClick={onComplete} fullWidth size="lg" className="bg-green-600 hover:bg-green-700">
          <Check className="w-4 h-4 mr-2" />
          Continue
        </Button>
      )}
    </div>
  )
}