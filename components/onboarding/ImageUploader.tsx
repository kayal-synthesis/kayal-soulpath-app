'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  Camera, 
  X, 
  Check, 
  AlertCircle, 
  SwitchCamera,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

interface ImageUploaderProps {
  onUpload: (file: File, metadata: any) => void
  onRemove?: () => void
  type: 'palm' | 'face'
  value?: File | string | null
  className?: string
  metadata?: {
    hand?: 'left' | 'right' | 'dominant'
    angle?: 'front' | 'left' | 'right' | 'profile'
  }
  onMetadataChange?: (metadata: any) => void
}

export const ImageUploader = ({ 
  onUpload, 
  onRemove, 
  type,
  value,
  className = '',
  metadata,
  onMetadataChange
}: ImageUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(
    typeof value === 'string' ? value : null
  )
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<'camera' | 'upload' | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const tips = {
    palm: [
      'Your dominant hand (the one you write with)',
      'Palm flat, fingers slightly apart',
      'Good natural light, no shadows',
      'Include your entire palm to the wrist'
    ],
    face: [
      'Front-facing, looking directly at camera',
      'Natural expression, no smile',
      'Good even lighting, no harsh shadows',
      'No glasses or accessories for best results'
    ]
  }

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: type === 'palm' ? 'environment' : 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraActive(true)
        setUploadMethod('camera')
      }
    } catch (err) {
      setError('Could not access camera. Please ensure camera permissions are granted.')
      console.error('Camera error:', err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    setUploadMethod(null)
  }

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    stopCamera()
    setTimeout(() => startCamera(), 100)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `${type}-capture.jpg`, { type: 'image/jpeg' })
            const preview = URL.createObjectURL(blob)
            setPreview(preview)
            onUpload(file, metadata)
            
            // Stop camera after capture
            stopCamera()
            
            toast.success('Photo captured successfully!')
          }
        }, 'image/jpeg', 0.9)
      }
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setError(null)
    setIsUploading(true)
    setUploadMethod('upload')

    // Validate file type
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      setError('Please upload a JPG or PNG image')
      setIsUploading(false)
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      setIsUploading(false)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
      setIsUploading(false)
      onUpload(file, metadata)
    }
    reader.readAsDataURL(file)
  }, [onUpload, metadata])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 1,
    maxSize: 10485760 // 10MB
  })

  const handleRemove = () => {
    if (preview && typeof preview === 'string' && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview)
    }
    setPreview(null)
    setError(null)
    setUploadMethod(null)
    stopCamera()
    onRemove?.()
  }

  const retakePhoto = () => {
    handleRemove()
    startCamera()
  }

  // Render camera view
  if (cameraActive) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Camera controls overlay */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={switchCamera}
              className="bg-black/50 text-white hover:bg-black/70"
            >
              <SwitchCamera className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 border-4 border-primary-600"
            >
              <div className="w-12 h-12 rounded-full bg-primary-600" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={stopCamera}
              className="bg-black/50 text-white hover:bg-black/70"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Camera guide overlay */}
          <div className="absolute inset-0 border-4 border-white/30 pointer-events-none">
            {type === 'palm' ? (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                Place your palm in the frame
              </div>
            ) : (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                Center your face
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-center text-neutral-500">
          Position your {type} clearly in the frame and tap capture
        </p>
      </div>
    )
  }

  // Render upload interface
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {!preview && (
        <div className="grid grid-cols-2 gap-3">
          {/* Camera Option */}
          <button
            type="button"
            onClick={startCamera}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
          >
            <Camera className="w-8 h-8 mb-2 text-neutral-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">Take Photo</span>
            <span className="text-xs text-neutral-500 mt-1">Use camera</span>
          </button>

          {/* Upload Option */}
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all group ${
              isDragActive ? 'border-primary-500 bg-primary-50' : 'hover:border-primary-500 hover:bg-primary-50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 mb-2 text-neutral-400 group-hover:text-primary-600" />
            <span className="text-sm font-medium">Upload File</span>
            <span className="text-xs text-neutral-500 mt-1">Choose from device</span>
          </div>
        </div>
      )}

      {/* Preview */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative rounded-lg overflow-hidden border"
          >
            <div className="relative aspect-square max-w-md mx-auto">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-cover"
              />
              
              {/* Metadata badge */}
              <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                {type === 'palm' 
                  ? `📸 ${metadata?.hand || 'dominant'} hand` 
                  : `📸 ${metadata?.angle || 'front'} view`}
              </div>
            </div>
            
            <div className="absolute top-2 right-2 flex gap-2">
              {uploadMethod === 'camera' && (
                <button
                  onClick={retakePhoto}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-neutral-100 transition"
                  title="Retake photo"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleRemove}
                className="p-2 bg-white rounded-full shadow-md hover:bg-neutral-100 transition"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metadata Options (shown when no preview) */}
      {!preview && !cameraActive && type === 'palm' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Which hand is this?</label>
          <select
            value={metadata?.hand || 'dominant'}
            onChange={(e) => onMetadataChange?.({ ...metadata, hand: e.target.value })}
            className="w-full p-2 border rounded-lg"
          >
            <option value="dominant">Dominant hand (I write with this)</option>
            <option value="right">Right hand</option>
            <option value="left">Left hand</option>
          </select>
        </div>
      )}

      {!preview && !cameraActive && type === 'face' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">What angle is this?</label>
          <select
            value={metadata?.angle || 'front'}
            onChange={(e) => onMetadataChange?.({ ...metadata, angle: e.target.value })}
            className="w-full p-2 border rounded-lg"
          >
            <option value="front">Front-facing (looking at camera)</option>
            <option value="profile">Profile (side view)</option>
            <option value="left">Left side</option>
            <option value="right">Right side</option>
          </select>
        </div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-warning/10 text-warning rounded-lg"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {!preview && !cameraActive && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-500">For best results:</p>
          <ul className="space-y-1">
            {tips[type].map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-neutral-500">
                <Check className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}