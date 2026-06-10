'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X, Check, RefreshCw, Image as ImageIcon, Hand, User, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from 'sonner'

interface CameraUploadProps {
  type: 'face' | 'palm' | 'both'
  onCapture: (file: File, type: 'face' | 'palm') => void
  onComplete?: () => void
  instructions?: string[]
}

export const CameraUpload = ({ type, onCapture, onComplete, instructions }: CameraUploadProps) => {
  const [mode, setMode] = useState<'camera' | 'upload' | null>(null)
  const [currentStep, setCurrentStep] = useState<'face' | 'palm'>(
    type === 'both' ? 'face' : type
  )
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [faceImage, setFaceImage] = useState<string | null>(null)
  const [palmImage, setPalmImage] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop()
          track.enabled = false
        })
      }
    }
  }, [stream])

  const startCamera = async () => {
    setCameraError(null)
    setIsCameraReady(false)
    setIsStartingCamera(true)
    
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access')
      }

      // Request camera with basic constraints
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setIsCameraReady(true)
              setIsStartingCamera(false)
              setMode('camera')
            })
            .catch(err => {
              console.error('Error playing video:', err)
              setCameraError('Could not start camera. Please try upload instead.')
              setIsStartingCamera(false)
            })
        }

        videoRef.current.onerror = () => {
          setCameraError('Video error occurred')
          setIsCameraReady(false)
          setIsStartingCamera(false)
        }
      }
    } catch (error: any) {
      console.error('Camera error:', error)
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please allow camera access or use upload.')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Please use upload.')
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setCameraError('Camera is already in use by another app. Please close other apps.')
      } else {
        setCameraError('Could not access camera. Please use upload option.')
      }
      
      setIsCameraReady(false)
      setIsStartingCamera(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop()
        track.enabled = false
      })
      setStream(null)
    }
    setMode(null)
    setCapturedImage(null)
    setIsCameraReady(false)
    setIsStartingCamera(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      
      // Draw video frame to canvas
      context?.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `${currentStep}-${Date.now()}.jpg`
          const file = new File([blob], fileName, { type: 'image/jpeg' })
          const imageUrl = URL.createObjectURL(blob)
          
          setCapturedImage(imageUrl)
          toast.success(`${currentStep === 'face' ? 'Face' : 'Palm'} photo captured!`)
        }
      }, 'image/jpeg', 0.95)
    }
  }

  const saveCapturedPhoto = async () => {
    if (!capturedImage) return
    
    setIsSaving(true)
    
    try {
      const response = await fetch(capturedImage)
      const blob = await response.blob()
      const fileName = `${currentStep}-${Date.now()}.jpg`
      const file = new File([blob], fileName, { type: 'image/jpeg' })
      
      if (currentStep === 'face') {
        setFaceImage(capturedImage)
        onCapture(file, 'face')
        toast.success('Face photo saved!')
        
        if (type === 'both') {
          setCurrentStep('palm')
          setCapturedImage(null)
          // Keep camera on for palm capture
        } else {
          stopCamera()
        }
      } else {
        setPalmImage(capturedImage)
        onCapture(file, 'palm')
        toast.success('Palm photo saved!')
        stopCamera()
      }
    } catch (error) {
      toast.error('Failed to save photo. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const imageUrl = URL.createObjectURL(file)
    setCapturedImage(imageUrl)
    toast.success('Photo uploaded! Review and save.')
  }

  const saveUploadedPhoto = () => {
    if (!capturedImage || !fileInputRef.current?.files?.[0]) return
    
    const file = fileInputRef.current.files[0]
    
    if (currentStep === 'face') {
      setFaceImage(capturedImage)
      onCapture(file, 'face')
      toast.success('Face photo saved!')
      
      if (type === 'both') {
        setCurrentStep('palm')
        setCapturedImage(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setMode(null)
      }
    } else {
      setPalmImage(capturedImage)
      onCapture(file, 'palm')
      toast.success('Palm photo saved!')
      setMode(null)
    }
  }

  const resetCapture = () => {
    setCapturedImage(null)
  }

  const cancelCamera = () => {
    stopCamera()
    setMode(null)
  }

  const isComplete = () => {
    if (type === 'face') return !!faceImage
    if (type === 'palm') return !!palmImage
    return !!faceImage && !!palmImage
  }

  const getStepInstruction = () => {
    if (type === 'both') {
      return currentStep === 'face' 
        ? 'Step 1 of 2: Capture your face' 
        : 'Step 2 of 2: Capture your palm'
    }
    return `Capture your ${type}`
  }

  const getStepIcon = () => {
    if (type === 'both') {
      return currentStep === 'face' ? <User className="w-5 h-5" /> : <Hand className="w-5 h-5" />
    }
    return type === 'face' ? <User className="w-5 h-5" /> : <Hand className="w-5 h-5" />
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator for Both */}
      {type === 'both' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <User className={`w-4 h-4 ${faceImage ? 'text-green-600' : 'text-neutral-400'}`} />
              Face {faceImage && '✓'}
            </span>
            <span className="text-sm font-medium flex items-center gap-2">
              <Hand className={`w-4 h-4 ${palmImage ? 'text-green-600' : 'text-neutral-400'}`} />
              Palm {palmImage && '✓'}
            </span>
          </div>
          <div className="flex gap-1">
            <div className={`h-2 flex-1 rounded-full ${faceImage ? 'bg-green-500' : 'bg-neutral-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${palmImage ? 'bg-green-500' : 'bg-neutral-200'}`} />
          </div>
        </div>
      )}

      {/* Preview Section for Saved Images */}
      {!mode && (faceImage || palmImage) && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {faceImage && (
            <div className="relative">
              <img src={faceImage} alt="Face" className="w-full rounded-lg border-2 border-green-500" />
              <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <Check className="w-3 h-3" />
                Face Saved
              </div>
            </div>
          )}
          {palmImage && (
            <div className="relative">
              <img src={palmImage} alt="Palm" className="w-full rounded-lg border-2 border-green-500" />
              <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <Check className="w-3 h-3" />
                Palm Saved
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Step Indicator */}
      {!isComplete() && !mode && (
        <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-lg">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            {getStepIcon()}
          </div>
          <div>
            <p className="font-medium text-primary-900">{getStepInstruction()}</p>
            <p className="text-sm text-primary-600">Choose method below</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!mode && instructions && !isComplete() && (
        <Card className="bg-amber-50 p-4">
          <h3 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Photo Tips
          </h3>
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

      {/* Mode Selection */}
      {mode === null && !isComplete() && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={startCamera}
            disabled={isStartingCamera}
            className="p-6 border-2 border-dashed rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStartingCamera ? (
              <>
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-600" />
                <p className="text-sm font-medium">Starting camera...</p>
              </>
            ) : (
              <>
                <Camera className="w-8 h-8 mx-auto mb-2 text-neutral-400 group-hover:text-primary-600" />
                <p className="text-sm font-medium">📸 Take Photo</p>
                <p className="text-xs text-neutral-500">Use camera now</p>
              </>
            )}
          </button>
          <button
            onClick={() => {
              setMode('upload')
              setCameraError(null)
            }}
            className="p-6 border-2 border-dashed rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-400 group-hover:text-primary-600" />
            <p className="text-sm font-medium">📁 Upload Photo</p>
            <p className="text-xs text-neutral-500">Choose from gallery</p>
          </button>
        </div>
      )}

      {/* Camera Mode */}
      {mode === 'camera' && (
        <Card className="p-4">
          <div className="relative">
            {/* Camera View */}
            <div className="relative bg-black rounded-lg overflow-hidden min-h-[300px]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full aspect-[4/3] object-cover"
              />
              
              {/* Camera Not Ready Overlay */}
              {!isCameraReady && !cameraError && isStartingCamera && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>Initializing camera...</p>
                  </div>
                </div>
              )}

              {/* Camera Error */}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="bg-white rounded-lg p-4 max-w-xs mx-4">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-center text-sm mb-3">{cameraError}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={cancelCamera} fullWidth>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => setMode('upload')} fullWidth>
                        Upload Instead
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Capture Overlay Guide */}
              {isCameraReady && !capturedImage && (
                <div className="absolute inset-0 border-4 border-primary-500 border-opacity-50 pointer-events-none">
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className="bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                      {currentStep === 'face' ? 'Position your face in the frame' : 'Position your palm flat, fingers apart'}
                    </span>
                  </div>
                </div>
              )}

              {/* Captured Image Preview */}
              {capturedImage && (
                <div className="absolute inset-0 bg-black">
                  <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    <button
                      onClick={resetCapture}
                      className="bg-yellow-500 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-yellow-600 transition shadow-lg"
                      disabled={isSaving}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retake
                    </button>
                    <button
                      onClick={saveCapturedPhoto}
                      className="bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-green-600 transition shadow-lg"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            {isCameraReady && !capturedImage && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 bg-white border-4 border-primary-600 rounded-full hover:bg-neutral-100 transition flex items-center justify-center shadow-lg"
                >
                  <div className="w-12 h-12 bg-primary-600 rounded-full" />
                </button>
              </div>
            )}
          </div>
          
          {/* Cancel Button */}
          <div className="flex justify-end mt-4">
            <Button variant="ghost" onClick={cancelCamera} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Upload Mode */}
      {mode === 'upload' && (
        <Card className="p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {capturedImage ? (
            <div className="space-y-4">
              <img 
                src={capturedImage} 
                alt="Uploaded preview" 
                className="max-h-64 mx-auto rounded-lg border-2 border-primary-500" 
              />
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCapturedImage(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  disabled={isSaving}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Choose Different
                </Button>
                <Button onClick={saveUploadedPhoto} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Save Photo
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {currentStep === 'face' ? (
                  <User className="w-10 h-10 text-primary-600" />
                ) : (
                  <Hand className="w-10 h-10 text-primary-600" />
                )}
              </div>
              <p className="text-lg font-medium mb-2">
                Upload your {currentStep} photo
              </p>
              <p className="text-sm text-neutral-500 mb-4">
                JPG or PNG, max 10MB
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Select Photo
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Complete Button */}
      {onComplete && isComplete() && (
        <Button
          onClick={onComplete}
          fullWidth
          size="lg"
          className="mt-6"
        >
          Continue
        </Button>
      )}
    </div>
  )
}