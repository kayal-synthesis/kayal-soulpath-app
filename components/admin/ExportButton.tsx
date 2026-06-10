'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Download, 
  FileText, 
  FileJson, 
  FileSpreadsheet,
  FilePieChart,
  Printer,
  Mail,
  Share2,
  ChevronDown,
  Check,
  Loader2,
  Calendar,
  Filter,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'excel' | 'image'
  includeHeaders?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  filters?: Record<string, any>
  columns?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
  fileName?: string
  includeMetadata?: boolean
  watermark?: string
  password?: string
}

export interface ExportButtonProps {
  /**
   * Data to export
   */
  data: any[]
  
  /**
   * Export options
   */
  options?: ExportOptions
  
  /**
   * Available formats
   */
  formats?: Array<'csv' | 'json' | 'pdf' | 'excel' | 'image'>
  
  /**
   * File name
   */
  fileName?: string
  
  /**
   * Whether to show advanced options
   */
  showAdvanced?: boolean
  
  /**
   * Custom export function
   */
  onExport?: (format: string, options: ExportOptions) => Promise<void> | void
  
  /**
   * On export success
   */
  onSuccess?: (format: string) => void
  
  /**
   * On export error
   */
  onError?: (error: Error) => void
  
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg'
  
  /**
   * Button text
   */
  text?: string
  
  /**
   * Show icon only
   */
  iconOnly?: boolean
  
  /**
   * Disabled state
   */
  disabled?: boolean
  
  /**
   * Loading state
   */
  isLoading?: boolean
  
  /**
   * Additional className
   */
  className?: string
  
  /**
   * On close callback
   */
  onClose?: () => void
}

const formatIcons = {
  csv: FileSpreadsheet,
  json: FileJson,
  pdf: FilePieChart,
  excel: FileSpreadsheet,
  image: FileText
}

const formatColors = {
  csv: 'text-green-600 bg-green-50',
  json: 'text-yellow-600 bg-yellow-50',
  pdf: 'text-red-600 bg-red-50',
  excel: 'text-blue-600 bg-blue-50',
  image: 'text-purple-600 bg-purple-50'
}

const formatNames = {
  csv: 'CSV',
  json: 'JSON',
  pdf: 'PDF',
  excel: 'Excel',
  image: 'Image'
}

export const ExportButton = ({
  data,
  options: initialOptions,
  formats = ['csv', 'json', 'pdf', 'excel'],
  fileName = 'export',
  showAdvanced = true,
  onExport,
  onSuccess,
  onError,
  variant = 'primary',
  size = 'md',
  text = 'Export',
  iconOnly = false,
  disabled = false,
  isLoading = false,
  className,
  onClose
}: ExportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'pdf' | 'excel' | 'image'>('csv')
  const [options, setOptions] = useState<ExportOptions>(initialOptions || {
    format: 'csv',
    includeHeaders: true,
    includeMetadata: false,
    limit: 1000
  })
  const [isExporting, setIsExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const finalOptions = { ...options, format: selectedFormat }
      
      if (onExport) {
        await onExport(selectedFormat, finalOptions)
      } else {
        // Default export logic
        let content = ''
        let mimeType = ''
        let extension = selectedFormat

        switch (selectedFormat) {
          case 'csv':
            const headers = options.includeHeaders 
              ? Object.keys(data[0] || {}).join(',') + '\n'
              : ''
            const rows = data
              .slice(0, options.limit)
              .map(row => Object.values(row).join(','))
              .join('\n')
            content = headers + rows
            mimeType = 'text/csv'
            break

          case 'json':
            const jsonData = options.limit ? data.slice(0, options.limit) : data
            content = JSON.stringify(
              options.includeMetadata 
                ? { data: jsonData, exportedAt: new Date(), count: jsonData.length }
                : jsonData,
              null,
              2
            )
            mimeType = 'application/json'
            break

          case 'excel':
            // For demo purposes, fallback to CSV
            extension = 'csv'
            mimeType = 'text/csv'
            content = Object.keys(data[0] || {}).join(',') + '\n' +
              data.slice(0, options.limit).map(row => Object.values(row).join(',')).join('\n')
            break

          default:
            content = JSON.stringify(data, null, 2)
            mimeType = 'application/json'
        }

        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${fileName}.${extension}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      onSuccess?.(selectedFormat)
      setIsOpen(false)
      onClose?.()
    } catch (error) {
      onError?.(error as Error)
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleOptionChange = (key: keyof ExportOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  const previewData = data.slice(0, 5)

  return (
    <div ref={buttonRef} className="relative">
      {/* Export Button */}
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={cn(className)}
      >
        {isLoading || isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {!iconOnly && (isLoading ? 'Exporting...' : text)}
        {!iconOnly && <ChevronDown className="w-4 h-4 ml-2" />}
      </Button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 z-50"
            style={{ width: showAdvanced ? 480 : 320 }}
          >
            <Card className="p-4 shadow-xl border-2">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg">Export Data</h3>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    onClose?.()
                  }}
                  className="p-1 hover:bg-neutral-100 rounded-lg transition"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>

              {/* Format Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Format</label>
                <div className="grid grid-cols-5 gap-2">
                  {formats.map(format => {
                    const Icon = formatIcons[format]
                    const isSelected = selectedFormat === format
                    return (
                      <button
                        key={format}
                        onClick={() => setSelectedFormat(format)}
                        className={cn(
                          'p-2 rounded-lg text-center transition-all',
                          isSelected ? formatColors[format] : 'hover:bg-neutral-100'
                        )}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs">{formatNames[format]}</span>
                        {isSelected && (
                          <Check className="w-3 h-3 mx-auto mt-1 text-green-600" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Preview Toggle */}
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-4"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Hide' : 'Show'} preview
              </button>

              {/* Data Preview */}
              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <div className="bg-neutral-50 rounded-lg p-3">
                      <h4 className="text-xs font-medium mb-2">Preview (first 5 rows)</h4>
                      <div className="space-y-2">
                        {previewData.map((row, i) => (
                          <div key={i} className="text-xs font-mono truncate">
                            {JSON.stringify(row).slice(0, 50)}...
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Advanced Settings Toggle */}
              {showAdvanced && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-4"
                >
                  <Settings className="w-4 h-4" />
                  {showSettings ? 'Hide' : 'Show'} advanced settings
                </button>
              )}

              {/* Advanced Settings */}
              <AnimatePresence>
                {showSettings && showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 space-y-3"
                  >
                    {/* Headers toggle */}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={options.includeHeaders}
                        onChange={(e) => handleOptionChange('includeHeaders', e.target.checked)}
                        className="rounded border-neutral-300"
                      />
                      <span className="text-sm">Include headers</span>
                    </label>

                    {/* Metadata toggle */}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={options.includeMetadata}
                        onChange={(e) => handleOptionChange('includeMetadata', e.target.checked)}
                        className="rounded border-neutral-300"
                      />
                      <span className="text-sm">Include metadata</span>
                    </label>

                    {/* Limit */}
                    <div>
                      <label className="block text-sm mb-1">Row limit</label>
                      <input
                        type="number"
                        value={options.limit}
                        onChange={(e) => handleOptionChange('limit', parseInt(e.target.value))}
                        className="w-full px-3 py-1.5 border rounded-lg text-sm"
                        min={1}
                        max={10000}
                      />
                    </div>

                    {/* File name */}
                    <div>
                      <label className="block text-sm mb-1">File name</label>
                      <input
                        type="text"
                        value={options.fileName || fileName}
                        onChange={(e) => handleOptionChange('fileName', e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg text-sm"
                        placeholder="export"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Export Button */}
              <Button
                fullWidth
                onClick={handleExport}
                disabled={isExporting}
                loading={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export Now'}
              </Button>

              {/* Stats */}
              <div className="mt-3 text-xs text-center text-neutral-500">
                {data.length} rows • {selectedFormat.toUpperCase()} format
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Quick export buttons
export const QuickExportButtons = ({
  data,
  onExport,
  className
}: {
  data: any[]
  onExport?: (format: string) => void
  className?: string
}) => {
  return (
    <div className={cn('flex gap-2', className)}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onExport?.('csv')}
        className="flex-1"
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        CSV
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onExport?.('json')}
        className="flex-1"
      >
        <FileJson className="w-4 h-4 mr-2" />
        JSON
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onExport?.('pdf')}
        className="flex-1"
      >
        <FilePieChart className="w-4 h-4 mr-2" />
        PDF
      </Button>
    </div>
  )
}

// Export modal (for larger datasets)
export const ExportModal = ({
  isOpen,
  onClose,
  data,
  onExport,
  title = 'Export Data'
}: {
  isOpen: boolean
  onClose: () => void
  data: any[]
  onExport: (format: string, options: ExportOptions) => Promise<void>
  title?: string
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full p-6">
        <h2 className="text-2xl font-serif mb-4">{title}</h2>
        <ExportButton
          data={data}
          onExport={onExport}
          onClose={onClose}
          text="Configure Export"
          variant="primary"
          size="lg"
          fullWidth
        />
      </Card>
    </div>
  )
}