'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, RefreshCw, Hand, User, AlertCircle, Loader2, CheckCircle2, Check } from 'lucide-react'
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

let handDetector: any = null
let faceApiReady = false
let modelsInitialised = false

export const ImageUploader = ({ type, onCapture, onComplete, instructions }: ImageUploaderProps) => {
  const [currentStep, setCurrentStep] = useState<CaptureStep>(
    type === 'palm' ? 'palm-right' : 'face'
  )
  const [face,       setFace]       = useState<StepState>(INITIAL_STEP)
  const [palmRight,  setPalmRight]  = useState<StepState>(INITIAL_STEP)
  const [palmLeft,   setPalmLeft]   = useState<StepState>(INITIAL_STEP)
  const [isValidating,    setIsValidating]    = useState(false)
  const [modelsLoading,   setModelsLoading]   = useState(!modelsInitialised)
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [capturedFile,    setCapturedFile]    = useState<File | null>(null)
  const [validationMsg,   setValidationMsg]   = useState('')

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  // ── Load AI models once globally ────────────────────────
  useEffect(() => {
    if (modelsInitialised) { setModelsLoading(false); return }

    const load = async () => {
      setModelsLoading(true)

      // face-api.js
      try {
        const faceapi = await import('face-api.js')
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        ])
        faceApiReady = true
      } catch {
        faceApiReady = false
      }

      // MediaPipe HandLandmarker
      try {
        const vision = await (await import('@mediapipe/tasks-vision')).FilesetResolver.forVisionTasks('/mediapipe')
        const { HandLandmarker } = await import('@mediapipe/tasks-vision')
        handDetector = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence:  0.55,
          minTrackingConfidence:      0.5,
        })
      } catch {
        handDetector = null
      }

      modelsInitialised = true
      setModelsLoading(false)
    }

    load()
  }, [])

  // ── FACE VALIDATION ──────────────────────────────────────
  const validateFace = async (img: HTMLImageElement): Promise<{ valid: boolean; error?: string }> => {
    // Hard reject: image is mostly sky/blue/white (e.g. photo of sky)
    const canvas = document.createElement('canvas')
    const ctx    = canvas.getContext('2d')!
    const scale  = Math.min(1, 512 / Math.max(img.width, img.height))
    canvas.width  = img.width  * scale
    canvas.height = img.height * scale
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

    let skyPixels  = 0
    let darkPixels = 0
    const total = data.length / 4
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      if (b > r + 25 && b > g + 15 && b > 120)                    skyPixels++
      if (r < 30    && g < 30     && b < 30)                      darkPixels++
    }
    if (skyPixels  / total > 0.45) return { valid: false, error: 'That looks like the sky or a wall. Please take a clear photo of your face.' }
    if (darkPixels / total > 0.75) return { valid: false, error: 'Image is too dark. Please improve lighting and retake.' }

    // face-api.js detection
    if (!faceApiReady) return { valid: false, error: 'Face detection model is still loading. Please wait a moment and try again.' }

    try {
      const faceapi    = await import('face-api.js')
      const options    = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.45 })
      const detections = await faceapi.detectAllFaces(img, options).withFaceLandmarks()

      if (detections.length === 0)
        return { valid: false, error: 'No face detected. Please face the camera directly with good lighting and no sunglasses.' }

      if (detections.length > 1) {
        const areas  = detections.map(d => d.detection.box.width * d.detection.box.height)
        const sorted = [...areas].sort((a, b) => b - a)
        if (sorted[0] < sorted[1] * 2.5)
          return { valid: false, error: 'Multiple faces detected. Please ensure only your face is visible in the photo.' }
      }

      const box      = detections[0].detection.box
      const faceArea = box.width * box.height
      const imgArea  = img.width * img.height
      const ratio    = faceArea / imgArea

      if (ratio < 0.05)
        return { valid: false, error: 'Your face is too small. Please move closer to the camera.' }
      if (ratio > 0.96)
        return { valid: false, error: 'Too close! Please move back so your full face and chin are visible.' }

      // Face must be roughly centred
      const cx = (box.x + box.width  / 2) / img.width
      const cy = (box.y + box.height / 2) / img.height
      if (cx < 0.12 || cx > 0.88)
        return { valid: false, error: 'Face is too far to one side. Please centre your face in the photo.' }
      if (cy < 0.08 || cy > 0.92)
        return { valid: false, error: 'Face is too high or too low. Please centre your face in the photo.' }

      // Confirm 68 landmarks are readable
      if (detections[0].landmarks.positions.length < 68)
        return { valid: false, error: 'Could not read facial features clearly. Please use a well-lit, in-focus photo.' }

      return { valid: true }
    } catch {
      return { valid: false, error: 'Face detection failed. Please try again.' }
    }
  }

  // ── PALM VALIDATION ──────────────────────────────────────
  const validatePalm = async (img: HTMLImageElement): Promise<{ valid: boolean; error?: string }> => {

    // PRIMARY: MediaPipe HandLandmarker — real hand skeleton detection
    if (handDetector) {
      try {
        const result = handDetector.detect(img)

        if (!result || !result.landmarks || result.landmarks.length === 0)
          return { valid: false, error: 'No hand detected. Please take a clear photo of your open palm with all fingers spread and visible.' }

        const lm = result.landmarks[0] // 21 landmarks

        if (lm.length < 21)
          return { valid: false, error: 'Hand not fully visible. Please ensure your entire palm including all fingertips is in frame.' }

        // ── Open palm check ──
        // Compare fingertip Y vs PIP joint Y (in normalised coords, lower Y = higher on screen)
        // Tip indices:  thumb=4, index=8, middle=12, ring=16, pinky=20
        // PIP indices:  thumb=3, index=7, middle=11, ring=15, pinky=19
        // MCP indices:  index=5, middle=9, ring=13, pinky=17
        const wrist = lm[0]

        const fingerPairs = [
          { tip: lm[8],  pip: lm[6],  mcp: lm[5]  }, // index
          { tip: lm[12], pip: lm[10], mcp: lm[9]  }, // middle
          { tip: lm[16], pip: lm[14], mcp: lm[13] }, // ring
          { tip: lm[20], pip: lm[18], mcp: lm[17] }, // pinky
        ]

        // A finger is extended if its tip is further from the wrist than its MCP
        const extendedCount = fingerPairs.filter(({ tip, mcp }) => {
          const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y)
          const mcpDist = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y)
          return tipDist > mcpDist * 1.15
        }).length

        if (extendedCount < 2)
          return { valid: false, error: 'Hand appears closed or partially closed. Please open your palm fully with all fingers spread wide.' }

        // ── Size check: hand must fill a reasonable portion of the frame ──
        const xs       = lm.map((p: any) => p.x)
        const ys       = lm.map((p: any) => p.y)
        const handArea = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))

        if (handArea < 0.035)
          return { valid: false, error: 'Palm too small in frame. Please move your hand closer to the camera.' }
        if (handArea > 0.97)
          return { valid: false, error: 'Too close. Please move your hand back so all fingertips are visible.' }

        return { valid: true }

      } catch {
        // Fall through to skin-tone fallback below
      }
    }

    // FALLBACK: multi-tone skin detection + environment rejection
    try {
      const canvas = document.createElement('canvas')
      const ctx    = canvas.getContext('2d')!
      const scale  = Math.min(1, 400 / Math.max(img.width, img.height))
      canvas.width  = img.width  * scale
      canvas.height = img.height * scale
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

      let skinPixels = 0
      let skyPixels  = 0
      let darkPixels = 0
      let greenPixels = 0
      const total = data.length / 4

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]

        // Sky / blue environment
        if (b > r + 25 && b > g + 15 && b > 110) { skyPixels++;   continue }
        // Grass / green environment
        if (g > r + 20 && g > b + 15 && g > 80)  { greenPixels++; continue }
        // Dark / black
        if (r < 35 && g < 35 && b < 35)           { darkPixels++;  continue }

        // Skin tone detection — covers fair, medium, dark skin
        const isSkin =
          // Fair skin
          (r > 190 && g > 140 && b > 110 && r > g && r > b && (r - g) > 15 && (r - b) > 20) ||
          // Medium skin
          (r > 130 && g > 85  && b > 55  && r > g && r > b && (r - g) > 12 && (r - b) > 18 && r < 230) ||
          // Olive / tan skin
          (r > 100 && g > 70  && b > 40  && r > g && r > b && (r - g) > 8  && (r - b) > 15 && r < 200) ||
          // Dark / deep skin
          (r > 55  && g > 30  && b > 15  && r > g && r > b && (r - g) > 7  && (r - b) > 10 && r < 155)

        if (isSkin) skinPixels++
      }

      const skinRatio  = skinPixels  / total
      const skyRatio   = skyPixels   / total
      const greenRatio = greenPixels / total
      const darkRatio  = darkPixels  / total

      if (skyRatio   > 0.35) return { valid: false, error: 'That looks like the sky. Please take a photo of your open palm.' }
      if (greenRatio > 0.45) return { valid: false, error: 'Too much background visible. Please fill the frame with your open palm.' }
      if (darkRatio  > 0.72) return { valid: false, error: 'Image is too dark. Please improve lighting and retake.' }
      if (skinRatio  < 0.18) return { valid: false, error: 'No palm detected. Please take a clear photo of your open hand with fingers spread and palm facing the camera.' }
      if (skinRatio  > 0.93) return { valid: false, error: 'Too close. Please show your full hand so all fingers are visible.' }

      return { valid: true }
    } catch {
      return { valid: true }
    }
  }

  // ── Main entry point ─────────────────────────────────────
  const validateImage = (file: File, step: CaptureStep): Promise<{ valid: boolean; error?: string }> =>
    new Promise((resolve) => {
      const img  = new Image()
      img.onload = async () => {
        if (img.width < 200 || img.height < 200) {
          resolve({ valid: false, error: 'Image resolution too low. Please use a higher quality photo.' })
          return
        }
        resolve(step === 'face' ? await validateFace(img) : await validatePalm(img))
      }
      img.onerror = () => resolve({ valid: false, error: 'Could not read the image file. Please try another photo.' })
      img.src = URL.createObjectURL(file)
    })

  const processImage = (file: File) => {
    setCapturedPreview(URL.createObjectURL(file))
    setCapturedFile(file)
  }

  const confirmImage = async () => {
    if (!capturedFile || !capturedPreview) return
    setIsValidating(true)
    setValidationMsg(currentStep === 'face' ? 'Analysing face...' : 'Detecting hand landmarks...')

    const result = await validateImage(capturedFile, currentStep)
    setIsValidating(false)
    setValidationMsg('')

    const setState =
      currentStep === 'face'       ? setFace :
      currentStep === 'palm-right' ? setPalmRight : setPalmLeft

    if (!result.valid) {
      setState({ file: null, preview: null, validation: 'invalid', error: result.error || 'Invalid image' })
      toast.error(result.error || 'Invalid image. Please retake.')
      setCapturedPreview(null)
      setCapturedFile(null)
      return
    }

    setState({ file: capturedFile, preview: capturedPreview, validation: 'valid', error: null })
    onCapture(
      capturedFile,
      currentStep === 'face'       ? 'face' :
      currentStep === 'palm-right' ? 'palm-right' : 'palm-left'
    )
    toast.success(
      currentStep === 'face'       ? '✅ Face verified!' :
      currentStep === 'palm-right' ? '✅ Right palm verified!' : '✅ Left palm verified!'
    )
    setCapturedPreview(null)
    setCapturedFile(null)
    advanceStep()
  }

  const advanceStep = () => {
    if (type === 'face') return
    if (type === 'palm') {
      if (currentStep === 'palm-right') setCurrentStep('palm-left')
    }
    if (type === 'both') {
      if (currentStep === 'face')       setCurrentStep('palm-right')
      if (currentStep === 'palm-right') setCurrentStep('palm-left')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.match(/image\/(jpeg|jpg|png|webp|heic|heif)/i)) {
      toast.error('Please select a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image must be under 15 MB.')
      return
    }
    processImage(file)
    e.target.value = ''
  }

  const isComplete = () => {
    if (type === 'face') return face.validation === 'valid'
    if (type === 'palm') return palmRight.validation === 'valid' && palmLeft.validation === 'valid'
    return face.validation === 'valid' && palmRight.validation === 'valid' && palmLeft.validation === 'valid'
  }

  const steps: CaptureStep[] =
    type === 'face' ? ['face'] :
    type === 'palm' ? ['palm-right', 'palm-left'] :
    ['face', 'palm-right', 'palm-left']

  const getStepState = (s: CaptureStep) =>
    s === 'face' ? face : s === 'palm-right' ? palmRight : palmLeft

  const getStepLabel = (s: CaptureStep) =>
    s === 'face' ? 'Face' : s === 'palm-right' ? 'Right Palm' : 'Left Palm'

  const getStepEmoji = (s: CaptureStep) =>
    s === 'face' ? '🧑' : s === 'palm-right' ? '🤚' : '🫲'

  const getStepHint = (s: CaptureStep) => {
    if (s === 'face')
      return 'Face forward, eyes open, good lighting, no sunglasses, only you in frame'
    if (s === 'palm-right')
      return 'RIGHT hand — open fully, all 5 fingers spread wide, inner palm facing the camera'
    return 'LEFT hand — open fully, all 5 fingers spread wide, inner palm facing the camera'
  }

  const getStepInstruction = (s: CaptureStep) => {
    if (s === 'face')
      return 'Is your face clearly visible, centred, and well-lit?'
    if (s === 'palm-right')
      return 'Is your entire right palm open with all 5 fingers spread and clearly visible?'
    return 'Is your entire left palm open with all 5 fingers spread and clearly visible?'
  }

  return (
    <div className="space-y-4">

      {/* Hidden file inputs */}
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

      {/* Model loading banner */}
      {modelsLoading && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-800">Loading AI detection models…</p>
            <p className="text-xs text-blue-600">This only happens once. Please wait before uploading.</p>
          </div>
        </div>
      )}

      {/* Step progress */}
      <div className="flex gap-2">
        {steps.map((step) => {
          const s        = getStepState(step)
          const isActive = step === currentStep && !capturedPreview
          return (
            <div
              key={step}
              className={`flex-1 rounded-xl p-3 border-2 transition-all duration-200 ${
                isActive
                  ? 'border-primary-500 bg-primary-50'
                  : s.validation === 'valid'
                  ? 'border-green-500 bg-green-50'
                  : s.validation === 'invalid'
                  ? 'border-red-400 bg-red-50'
                  : 'border-neutral-200 bg-neutral-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {s.validation === 'valid'
                  ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  : s.validation === 'invalid'
                  ? <AlertCircle  className="w-4 h-4 text-red-500 flex-shrink-0" />
                  : step === 'face'
                  ? <User className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  : <Hand className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
                <span className={`text-xs font-semibold truncate ${
                  s.validation === 'valid'
                    ? 'text-green-700'
                    : s.validation === 'invalid'
                    ? 'text-red-600'
                    : isActive
                    ? 'text-primary-700'
                    : 'text-neutral-500'
                }`}>
                  {getStepLabel(step)}
                </span>
              </div>

              {/* Verified thumbnail */}
              {s.preview && s.validation === 'valid' && (
                <img
                  src={s.preview}
                  alt={step}
                  className="w-full h-20 object-cover rounded-lg border border-green-300 mt-1"
                />
              )}

              {/* Error message */}
              {s.error && (
                <p className="text-xs text-red-500 mt-1 leading-tight">{s.error}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Preview & confirm */}
      {capturedPreview && (
        <div className="rounded-2xl overflow-hidden border-2 border-primary-400 shadow-md">
          <img
            src={capturedPreview}
            alt="Preview"
            className="w-full max-h-72 object-contain bg-neutral-100"
          />
          <div className="p-3 bg-white border-t border-neutral-200 space-y-2">
            <p className="text-xs text-center text-neutral-500 font-medium">
              {getStepInstruction(currentStep)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setCapturedPreview(null); setCapturedFile(null) }}
                fullWidth
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retake
              </Button>
              <Button
                onClick={confirmImage}
                disabled={isValidating || modelsLoading}
                fullWidth
                className="bg-green-600 hover:bg-green-700 disabled:opacity-60"
              >
                {isValidating
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />{validationMsg}</>
                  : <><Check className="w-3.5 h-3.5 mr-1.5" />Use This Photo</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Current step action area */}
      {!capturedPreview && !isComplete() && (
        <div className="space-y-3">
          {/* Step hint */}
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-sm font-semibold text-indigo-800">
              {getStepEmoji(currentStep)}&nbsp; Now capturing: {getStepLabel(currentStep)}
            </p>
            <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">
              {getStepHint(currentStep)}
            </p>
          </div>

          {/* Camera / Upload buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={modelsLoading}
              className="p-5 border-2 border-dashed border-primary-300 rounded-2xl hover:border-primary-500 hover:bg-primary-50 transition-all group text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-8 h-8 mx-auto mb-2 text-primary-400 group-hover:text-primary-600 transition" />
              <p className="text-sm font-semibold text-neutral-700">📸 Take Photo</p>
              <p className="text-xs text-neutral-400 mt-0.5">Opens camera</p>
            </button>
            <button
              onClick={() => uploadInputRef.current?.click()}
              disabled={modelsLoading}
              className="p-5 border-2 border-dashed border-neutral-200 rounded-2xl hover:border-primary-400 hover:bg-neutral-50 transition-all group text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-400 group-hover:text-primary-500 transition" />
              <p className="text-sm font-semibold text-neutral-700">📁 Upload Photo</p>
              <p className="text-xs text-neutral-400 mt-0.5">From gallery</p>
            </button>
          </div>
        </div>
      )}

      {/* Photo tips */}
      {instructions && !capturedPreview && !isComplete() && (
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs font-bold text-amber-700 mb-1.5 uppercase tracking-wide">
            📋 Photo Tips
          </p>
          <ul className="space-y-1">
            {instructions.map((tip, i) => (
              <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* All steps complete */}
      {isComplete() && onComplete && (
        <Button
          onClick={onComplete}
          fullWidth
          size="lg"
          className="bg-green-600 hover:bg-green-700 shadow-md"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          All Photos Verified — Continue
        </Button>
      )}
    </div>
  )
}