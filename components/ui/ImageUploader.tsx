'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, Upload, X, Check, RefreshCw, Hand, User, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

interface ImageUploaderProps {
  type: 'face' | 'palm' | 'both'
  onCapture: (file: File, type: 'face' | 'palm-left' | 'palm-right') => void
  onComplete?: () => void
  instructions?: string[]
}

type CaptureStep = 'face' | 'palm-right' | 'palm-left'
type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid'

interface StepState {
  file: File | null
  preview: string | null
  validation: ValidationStatus
  error: string | null
}

const INITIAL_STEP: StepState = { file: null, preview: null, validation: 'idle', error: null }

export const ImageUploader = ({ type, onCapture, onComplete, instructions }: ImageUploaderProps) => {
  const [mode, setMode] = useState<'select' | 'camera' | 'upload'>('select')
  const [currentStep, setCurrentStep] = useState<CaptureStep>(
    type === 'palm' ? 'palm-right' : 'face'
  )

  const [face,      setFace]      = useState<StepState>(INITIAL_STEP)
  const [palmRight, setPalmRight] = useState<StepState>(INITIAL_STEP)
  const [palmLeft,  setPalmLeft]  = useState<StepState>(INITIAL_STEP)

  const [stream,         setStream]         = useState<MediaStream | null>(null)
  const [cameraReady,    setCameraReady]    = useState(false)
  const [cameraError,    setCameraError]    = useState<string | null>(null)
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [capturedBlob,    setCapturedBlob]    = useState<Blob | null>(null)
  const [faceApiLoaded,   setFaceApiLoaded]   = useState(false)
  const [isValidating,    setIsValidating]    = useState(false)

  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Load face-api.js models ─────────────────────────────
  useEffect(() => {
    const loadModels = async () => {
      try {
        const faceapi = await import('face-api.js')
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        ])
        setFaceApiLoaded(true)
      } catch (err) {
        console.warn('face-api.js models failed to load:', err)
        setFaceApiLoaded(false)
      }
    }
    loadModels()
  }, [])

  // ── Cleanup camera on unmount ────────────────────────────
  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      setStream(null)
    }
    setCameraReady(false)
    setCapturedPreview(null)
    setCapturedBlob(null)
  }

  const startCamera = async () => {
    setCameraError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not supported')
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentStep === 'face' ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      setStream(ms)
      if (videoRef.current) {
        videoRef.current.srcObject = ms
        setMode('camera')
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => { setCameraReady(true) }).catch(() => setCameraReady(true))
        }
        videoRef.current.oncanplay = () => { setCameraReady(true) }
        setTimeout(() => { setCameraReady(true) }, 2000)
      }
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError' ? 'Camera access denied. Please allow camera access.'
        : err.name === 'NotFoundError' ? 'No camera found. Please use upload.'
        : 'Could not access camera. Please use upload.'
      setCameraError(msg)
      setMode('upload')
    }
  }

  // ── Face validation using face-api.js ───────────────────
  const validateFace = async (imageElement: HTMLImageElement): Promise<{ valid: boolean; error?: string }> => {
    if (!faceApiLoaded) return { valid: true } // Skip if models not loaded
    try {
      const faceapi = await import('face-api.js')
      const detections = await faceapi.detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
      
      if (detections.length === 0) return { valid: false, error: 'No face detected. Please take a clear frontal photo of your face.' }
      if (detections.length > 1) {
        // Check if one face is dominant (3x larger)
        const areas = detections.map(d => d.box.width * d.box.height)
        const maxArea = Math.max(...areas)
        const secondMax = areas.filter(a => a !== maxArea)[0] || 0
        if (maxArea < secondMax * 3) return { valid: false, error: 'Multiple faces detected. Please ensure only your face is visible.' }
      }
      
      // Check face size (must occupy at least 15% of image)
      const faceArea = detections[0].box.width * detections[0].box.height
      const imageArea = imageElement.width * imageElement.height
      if (faceArea / imageArea < 0.10) return { valid: false, error: 'Face too small. Please move closer to the camera.' }
      
      return { valid: true }
    } catch {
      return { valid: true } // On error, allow through
    }
  }

  // ── Palm validation using canvas analysis ───────────────
  const validatePalm = async (imageElement: HTMLImageElement): Promise<{ valid: boolean; error?: string }> => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return { valid: true }
      
      canvas.width = imageElement.width
      canvas.height = imageElement.height
      ctx.drawImage(imageElement, 0, 0)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Check skin tone pixels
      let skinPixels = 0
      const totalPixels = data.length / 4
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2]
        // Skin tone detection across different skin tones
        if (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) > 10 && r < 250) {
          skinPixels++
        }
      }
      
      const skinRatio = skinPixels / totalPixels
      if (skinRatio < 0.15) return { valid: false, error: 'No palm detected. Please take a clear photo of your open palm.' }
      if (skinRatio > 0.95) return { valid: false, error: 'Image too close. Please show your full hand.' }
      
      return { valid: true }
    } catch {
      return { valid: true }
    }
  }

  // ── Main validation function ─────────────────────────────
  const validateImage = async (file: File, step: CaptureStep): Promise<{ valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = async () => {
        // Check minimum resolution
        if (img.width < 200 || img.height < 200) {
          resolve({ valid: false, error: 'Image too small. Please use a higher resolution photo.' })
          return
        }
        
        if (step === 'face') {
          resolve(await validateFace(img))
        } else {
          resolve(await validatePalm(img))
        }
      }
      img.onerror = () => resolve({ valid: false, error: 'Could not read image. Please try another photo.' })
      img.src = URL.createObjectURL(file)
    })
  }

  // ── Process and validate captured/uploaded image ─────────
  const processImage = async (file: File, preview: string) => {
    setIsValidating(true)
    
    const result = await validateImage(file, currentStep)
    setIsValidating(false)

    const setState = currentStep === 'face' ? setFace : currentStep === 'palm-right' ? setPalmRight : setPalmLeft

    if (!result.valid) {
      setState({ file: null, preview: null, validation: 'invalid', error: result.error || 'Invalid image' })
      toast.error(result.error || 'Invalid image')
      setCapturedPreview(null)
      setCapturedBlob(null)
      return
    }

    setState({ file, preview, validation: 'valid', error: null })
    onCapture(file, currentStep === 'face' ? 'face' : currentStep === 'palm-right' ? 'palm-right' : 'palm-left')
    toast.success(
      currentStep === 'face' ? '✅ Face verified!' :
      currentStep === 'palm-right' ? '✅ Right palm verified!' : '✅ Left palm verified!'
    )

    setCapturedPreview(null)
    setCapturedBlob(null)
    stopCamera()
    setMode('select')
    advanceStep()
  }

  const advanceStep = () => {
    if (type === 'face') return
    if (type === 'palm') {
      if (currentStep === 'palm-right') setCurrentStep('palm-left')
    }
    if (type === 'both') {
      if (currentStep === 'face') setCurrentStep('palm-right')
      if (currentStep === 'palm-right') setCurrentStep('palm-left')
    }
  }

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob)
        setCapturedPreview(URL.createObjectURL(blob))
      }
    }, 'image/jpeg', 0.95)
  }

  const confirmCapture = async () => {
    if (!capturedBlob || !capturedPreview) return
    const file = new File([capturedBlob], `${currentStep}-${Date.now()}.jpg`, { type: 'image/jpeg' })
    await processImage(file, capturedPreview)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) { toast.error('Please upload a JPG or PNG image'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be less than 10MB'); return }
    const preview = URL.createObjectURL(file)
    setCapturedPreview(preview)
    setCapturedBlob(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isComplete = () => {
    if (type === 'face') return face.validation === 'valid'
    if (type === 'palm') return palmRight.validation === 'valid' && palmLeft.validation === 'valid'
    return face.validation === 'valid' && palmRight.validation === 'valid' && palmLeft.validation === 'valid'
  }

  const getStepLabel = (step: CaptureStep) => {
    if (step === 'face') return 'Face'
    if (step === 'palm-right') return 'Right Palm'
    return 'Left Palm'
  }

  const getStepHint = (step: CaptureStep) => {
    if (step === 'face') return 'Look directly at camera, good lighting, no sunglasses'
    if (step === 'palm-right') return 'Open your RIGHT hand fully, fingers spread, palm facing camera'
    return 'Open your LEFT hand fully, fingers spread, palm facing camera'
  }

  const steps: CaptureStep[] = type === 'face' ? ['face'] : type === 'palm' ? ['palm-right', 'palm-left'] : ['face', 'palm-right', 'palm-left']
  const getStepState = (step: CaptureStep) => step === 'face' ? face : step === 'palm-right' ? palmRight : palmLeft

  return (
    <div className="space-y-5">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg" onChange={handleFileSelect} className="hidden" />

      {/* Progress */}
      <div className="flex gap-2">
        {steps.map((step) => {
          const s = getStepState(step)
          return (
            <div key={step} className={`flex-1 rounded-xl p-3 border-2 transition-all ${
              step === currentStep && mode === 'select' && s.validation !== 'valid'
                ? 'border-primary-500 bg-primary-50'
                : s.validation === 'valid' ? 'border-green-500 bg-green-50'
                : s.validation === 'invalid' ? 'border-red-400 bg-red-50'
                : 'border-neutral-200 bg-neutral-50'
            }`}>
              <div className="flex items-center gap-2">
                {s.validation === 'valid' ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  : s.validation === 'invalid' ? <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  : step === 'face' ? <User className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  : <Hand className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
                <span className={`text-xs font-semibold ${s.validation === 'valid' ? 'text-green-700' : s.validation === 'invalid' ? 'text-red-600' : 'text-neutral-600'}`}>
                  {getStepLabel(step)}
                </span>
              </div>
              {s.preview && s.validation === 'valid' && (
                <img src={s.preview} alt={step} className="w-full h-16 object-cover rounded-lg mt-2 border border-green-300" />
              )}
              {s.error && <p className="text-xs text-red-500 mt-1">{s.error}</p>}
            </div>
          )
        })}
      </div>

      {/* Current step hint */}
      {!isComplete() && mode === 'select' && (
        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-sm font-semibold text-indigo-800 mb-0.5">
            {getStepState(currentStep).validation === 'invalid' ? '⚠️ Try again:' : `📸 Now capturing:`} {getStepLabel(currentStep)}
          </p>
          <p className="text-xs text-indigo-600">{getStepHint(currentStep)}</p>
        </div>
      )}

      {/* Validation in progress */}
      {isValidating && (
        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
          <Loader2 className="w-5 h-5 text-purple-600 animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-purple-800">Validating image...</p>
            <p className="text-xs text-purple-600">Checking for {currentStep === 'face' ? 'face' : 'palm'} detection</p>
          </div>
        </div>
      )}

      {/* Camera view */}
      {mode === 'camera' && (
        <div className="rounded-2xl overflow-hidden border-2 border-primary-300 bg-black">
          <div className="relative">
            <video ref={videoRef} autoPlay playsInline className="w-full aspect-[4/3] object-cover" />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-white text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}
            {capturedPreview && (
              <div className="absolute inset-0 bg-black">
                <img src={capturedPreview} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}
            {cameraReady && !capturedPreview && (
              <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute inset-6 border-2 rounded-2xl border-white/40 ${currentStep === 'face' ? 'rounded-full' : ''}`} />
                <div className="absolute bottom-3 left-0 right-0 text-center">
                  <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs">
                    {getStepHint(currentStep)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Camera controls */}
          <div className="p-4 bg-neutral-900 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => { stopCamera(); setMode('select') }} className="text-white hover:bg-white/10">
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>

            {!capturedPreview ? (
              <button onClick={captureFromCamera} disabled={!cameraReady}
                className="w-16 h-16 bg-white border-4 border-primary-500 rounded-full hover:bg-neutral-100 transition disabled:opacity-50 flex items-center justify-center shadow-lg">
                <div className="w-10 h-10 bg-primary-600 rounded-full" />
              </button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setCapturedPreview(null); setCapturedBlob(null) }} className="text-white border-white/30 hover:bg-white/10">
                  <RefreshCw className="w-4 h-4 mr-1" /> Retake
                </Button>
                <Button onClick={confirmCapture} disabled={isValidating} className="bg-green-600 hover:bg-green-700">
                  {isValidating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                  Use Photo
                </Button>
              </div>
            )}

            <div className="w-20" />
          </div>
        </div>
      )}

      {/* Upload preview */}
      {mode === 'upload' && capturedPreview && (
        <div className="rounded-2xl overflow-hidden border-2 border-primary-300">
          <img src={capturedPreview} alt="Preview" className="w-full max-h-64 object-contain bg-neutral-100" />
          <div className="p-3 flex gap-2 bg-neutral-50 border-t border-neutral-200">
            <Button variant="outline" onClick={() => { setCapturedPreview(null); setCapturedBlob(null); fileInputRef.current?.click() }} fullWidth>
              <RefreshCw className="w-4 h-4 mr-1" /> Choose Different
            </Button>
            <Button onClick={confirmCapture} disabled={isValidating} fullWidth className="bg-green-600 hover:bg-green-700">
              {isValidating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              Use Photo
            </Button>
          </div>
        </div>
      )}

      {/* Mode selection */}
      {mode === 'select' && !isComplete() && !isValidating && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={startCamera}
            className="p-5 border-2 border-dashed border-primary-300 rounded-2xl hover:border-primary-500 hover:bg-primary-50 transition-all group text-center">
            <Camera className="w-8 h-8 mx-auto mb-2 text-primary-400 group-hover:text-primary-600 transition" />
            <p className="text-sm font-semibold text-neutral-700">📸 Take Photo</p>
            <p className="text-xs text-neutral-400 mt-0.5">Use your camera</p>
          </button>
          <button onClick={() => { setMode('upload'); fileInputRef.current?.click() }}
            className="p-5 border-2 border-dashed border-neutral-200 rounded-2xl hover:border-primary-400 hover:bg-neutral-50 transition-all group text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-400 group-hover:text-primary-500 transition" />
            <p className="text-sm font-semibold text-neutral-700">📁 Upload Photo</p>
            <p className="text-xs text-neutral-400 mt-0.5">From your gallery</p>
          </button>
        </div>
      )}

      {/* Tips */}
      {instructions && mode === 'select' && !isComplete() && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide">📋 Photo Tips</p>
          <ul className="space-y-1">
            {instructions.map((tip, i) => (
              <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5">•</span>{tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{cameraError}</p>
        </div>
      )}

      {/* Complete */}
      {isComplete() && onComplete && (
        <Button onClick={onComplete} fullWidth size="lg" className="bg-green-600 hover:bg-green-700 mt-2">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          All Photos Verified — Continue
        </Button>
      )}
    </div>
  )
}