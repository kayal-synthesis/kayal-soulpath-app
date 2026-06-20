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
  const [currentStep, setCurrentStep] = useState<CaptureStep>(
    type === 'palm' ? 'palm-right' : 'face'
  )
  const [face,      setFace]      = useState<StepState>(INITIAL_STEP)
  const [palmRight, setPalmRight] = useState<StepState>(INITIAL_STEP)
  const [palmLeft,  setPalmLeft]  = useState<StepState>(INITIAL_STEP)
  const [isValidating, setIsValidating] = useState(false)
  const [faceApiLoaded, setFaceApiLoaded] = useState(false)
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

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
      } catch {
        setFaceApiLoaded(false)
      }
    }
    loadModels()
  }, [])

  // ── Face validation ──────────────────────────────────────
  const validateFace = async (img: HTMLImageElement): Promise<{ valid: boolean; error?: string }> => {
    if (!faceApiLoaded) return { valid: true }
    try {
      const faceapi = await import('face-api.js')
      const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      if (detections.length === 0) return { valid: false, error: 'No face detected. Please take a clear frontal photo of your face.' }
      if (detections.length > 1) {
        const areas = detections.map(d => d.box.width * d.box.height)
        const sorted = [...areas].sort((a, b) => b - a)
        if (sorted[0] < sorted[1] * 3) return { valid: false, error: 'Multiple faces detected. Please ensure only your face is visible.' }
      }
      const faceArea = detections[0].box.width * detections[0].box.height
      const imageArea = img.width * img.height
      if (faceArea / imageArea < 0.08) return { valid: false, error: 'Face too small. Please move closer to the camera.' }
      return { valid: true }
    } catch {
      return { valid: true }
    }
  }

  // ── Palm validation ──────────────────────────────────────
  const validatePalm = async (img: HTMLImageElement): Promise<{ valid: boolean; error?: string }> => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return { valid: true }
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let skinPixels = 0
      const total = data.length / 4
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2]
        if (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) > 10 && r < 250) skinPixels++
      }
      const ratio = skinPixels / total
      if (ratio < 0.12) return { valid: false, error: 'No palm detected. Please take a clear photo of your open palm with fingers spread.' }
      return { valid: true }
    } catch {
      return { valid: true }
    }
  }

  // ── Main validate ────────────────────────────────────────
  const validateImage = (file: File, step: CaptureStep): Promise<{ valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = async () => {
        if (img.width < 100 || img.height < 100) { resolve({ valid: false, error: 'Image too small. Please use a clearer photo.' }); return }
        resolve(step === 'face' ? await validateFace(img) : await validatePalm(img))
      }
      img.onerror = () => resolve({ valid: false, error: 'Could not read image. Please try another photo.' })
      img.src = URL.createObjectURL(file)
    })
  }

  // ── Process image after selection ───────────────────────
  const processImage = async (file: File) => {
    const preview = URL.createObjectURL(file)
    setCapturedPreview(preview)
    setCapturedFile(file)
  }

  const confirmImage = async () => {
    if (!capturedFile || !capturedPreview) return
    setIsValidating(true)
    const result = await validateImage(capturedFile, currentStep)
    setIsValidating(false)

    const setState = currentStep === 'face' ? setFace : currentStep === 'palm-right' ? setPalmRight : setPalmLeft

    if (!result.valid) {
      setState({ file: null, preview: null, validation: 'invalid', error: result.error || 'Invalid image' })
      toast.error(result.error || 'Invalid image')
      setCapturedPreview(null)
      setCapturedFile(null)
      return
    }

    setState({ file: capturedFile, preview: capturedPreview, validation: 'valid', error: null })
    onCapture(capturedFile, currentStep === 'face' ? 'face' : currentStep === 'palm-right' ? 'palm-right' : 'palm-left')
    toast.success(
      currentStep === 'face' ? '✅ Face verified!' :
      currentStep === 'palm-right' ? '✅ Right palm verified!' : '✅ Left palm verified!'
    )
    setCapturedPreview(null)
    setCapturedFile(null)
    advanceStep()
  }

  const advanceStep = () => {
    if (type === 'face') return
    if (type === 'palm') { if (currentStep === 'palm-right') setCurrentStep('palm-left') }
    if (type === 'both') {
      if (currentStep === 'face') setCurrentStep('palm-right')
      if (currentStep === 'palm-right') setCurrentStep('palm-left')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.match(/image\/(jpeg|jpg|png|webp|heic|heif)/i)) { toast.error('Please select an image file'); return }
    if (file.size > 15 * 1024 * 1024) { toast.error('Image must be less than 15MB'); return }
    processImage(file)
    e.target.value = ''
  }

  const isComplete = () => {
    if (type === 'face') return face.validation === 'valid'
    if (type === 'palm') return palmRight.validation === 'valid' && palmLeft.validation === 'valid'
    return face.validation === 'valid' && palmRight.validation === 'valid' && palmLeft.validation === 'valid'
  }

  const steps: CaptureStep[] = type === 'face' ? ['face'] : type === 'palm' ? ['palm-right', 'palm-left'] : ['face', 'palm-right', 'palm-left']
  const getStepState = (s: CaptureStep) => s === 'face' ? face : s === 'palm-right' ? palmRight : palmLeft
  const getStepLabel = (s: CaptureStep) => s === 'face' ? 'Face' : s === 'palm-right' ? 'Right Palm' : 'Left Palm'
  const getStepHint = (s: CaptureStep) => {
    if (s === 'face') return 'Look directly at camera, good lighting, no sunglasses, only your face visible'
    if (s === 'palm-right') return 'Right hand open fully, fingers spread wide, palm facing camera'
    return 'Left hand open fully, fingers spread wide, palm facing camera'
  }
  const getStepEmoji = (s: CaptureStep) => s === 'face' ? '🧑' : s === 'palm-right' ? '🤚' : '🤚'

  return (
    <div className="space-y-4">
      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture={currentStep === 'face' ? 'user' : 'environment'}
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Progress steps */}
      <div className="flex gap-2">
        {steps.map((step) => {
          const s = getStepState(step)
          const isActive = step === currentStep && !capturedPreview
          return (
            <div key={step} className={`flex-1 rounded-xl p-3 border-2 transition-all ${
              isActive ? 'border-primary-500 bg-primary-50'
              : s.validation === 'valid' ? 'border-green-500 bg-green-50'
              : s.validation === 'invalid' ? 'border-red-400 bg-red-50'
              : 'border-neutral-200 bg-neutral-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {s.validation === 'valid'
                  ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  : s.validation === 'invalid'
                  ? <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  : step === 'face'
                  ? <User className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  : <Hand className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
                <span className={`text-xs font-semibold ${
                  s.validation === 'valid' ? 'text-green-700'
                  : s.validation === 'invalid' ? 'text-red-600'
                  : isActive ? 'text-primary-700' : 'text-neutral-500'
                }`}>{getStepLabel(step)}</span>
              </div>
              {s.preview && s.validation === 'valid' && (
                <img src={s.preview} alt={step} className="w-full h-20 object-cover rounded-lg border border-green-300" />
              )}
              {s.error && <p className="text-xs text-red-500 mt-1 leading-tight">{s.error}</p>}
            </div>
          )
        })}
      </div>

      {/* Preview & confirm */}
      {capturedPreview && (
        <div className="rounded-2xl overflow-hidden border-2 border-primary-400 bg-neutral-100">
          <img src={capturedPreview} alt="Preview" className="w-full max-h-72 object-contain" />
          <div className="p-3 bg-white border-t border-neutral-200 space-y-2">
            <p className="text-xs text-center text-neutral-500">
              {currentStep === 'face'
                ? 'Is your face clearly visible and centred?'
                : `Is your ${currentStep === 'palm-right' ? 'right' : 'left'} palm open with fingers spread?`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setCapturedPreview(null); setCapturedFile(null) }} fullWidth>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retake
              </Button>
              <Button onClick={confirmImage} disabled={isValidating} fullWidth className="bg-green-600 hover:bg-green-700">
                {isValidating
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Validating...</>
                  : <><Check className="w-3.5 h-3.5 mr-1" /> Use This Photo</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!capturedPreview && !isComplete() && (
        <div className="space-y-3">
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-sm font-semibold text-indigo-800">
              {getStepEmoji(currentStep)} Now: {getStepLabel(currentStep)}
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">{getStepHint(currentStep)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="p-5 border-2 border-dashed border-primary-300 rounded-2xl hover:border-primary-500 hover:bg-primary-50 transition-all group text-center"
            >
              <Camera className="w-8 h-8 mx-auto mb-2 text-primary-400 group-hover:text-primary-600 transition" />
              <p className="text-sm font-semibold text-neutral-700">📸 Take Photo</p>
              <p className="text-xs text-neutral-400 mt-0.5">Opens camera</p>
            </button>
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="p-5 border-2 border-dashed border-neutral-200 rounded-2xl hover:border-primary-400 hover:bg-neutral-50 transition-all group text-center"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-400 group-hover:text-primary-500 transition" />
              <p className="text-sm font-semibold text-neutral-700">📁 Upload Photo</p>
              <p className="text-xs text-neutral-400 mt-0.5">From gallery</p>
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      {instructions && !capturedPreview && !isComplete() && (
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs font-bold text-amber-700 mb-1.5 uppercase tracking-wide">📋 Photo Tips</p>
          <ul className="space-y-1">
            {instructions.map((tip, i) => (
              <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>{tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Validating overlay */}
      {isValidating && (
        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
          <Loader2 className="w-5 h-5 text-purple-600 animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-purple-800">Validating image...</p>
            <p className="text-xs text-purple-600">
              Checking for {currentStep === 'face' ? 'face detection' : 'palm detection'}
            </p>
          </div>
        </div>
      )}

      {/* Complete */}
      {isComplete() && onComplete && (
        <Button onClick={onComplete} fullWidth size="lg" className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          All Photos Verified — Continue
        </Button>
      )}
    </div>
  )
}