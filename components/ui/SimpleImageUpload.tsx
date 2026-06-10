'use client'

import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

interface SimpleImageUploadProps {
  onImageSelected: (file: File) => void
  label?: string
}

export const SimpleImageUpload = ({ onImageSelected, label = 'Upload Image' }: SimpleImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      toast.error('Please upload a JPG or PNG image')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    setIsUploading(true)
    const imageUrl = URL.createObjectURL(file)
    setPreview(imageUrl)
    onImageSelected(file)
    
    setTimeout(() => {
      setIsUploading(false)
      toast.success('Image uploaded!')
    }, 500)
  }

  const removeImage = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full rounded-lg border-2 border-green-500" />
          <button
            onClick={removeImage}
            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 transition"
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
          <p className="text-lg font-medium mb-2">{label}</p>
          <p className="text-sm text-neutral-500">Click to browse • JPG or PNG, max 10MB</p>
        </div>
      )}

      {isUploading && (
        <div className="text-center text-sm text-primary-600">
          Uploading...
        </div>
      )}
    </div>
  )
}