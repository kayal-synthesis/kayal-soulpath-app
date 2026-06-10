'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  AlertCircle, X, Calendar, Clock, Heart, 
  TrendingUp, Moon, Zap, Loader2, CheckCircle,
  Info
} from 'lucide-react'

interface CancellationModalProps {
  isOpen: boolean
  onClose: () => void
  tool: {
    id: string
    name: string
    emoji: string
    expires_at: string
    price: number
  }
  onConfirm: (reason: string, feedback: string) => Promise<void>
}

export function CancellationModal({ isOpen, onClose, tool, onConfirm }: CancellationModalProps) {
  const [step, setStep] = useState<'reason' | 'feedback' | 'confirm' | 'processing'>('reason')
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const reasons = [
    { id: 'too_expensive', label: 'Too expensive', icon: TrendingUp },
    { id: 'not_using', label: 'Not using enough', icon: Clock },
    { id: 'missing_features', label: 'Missing features', icon: AlertCircle },
    { id: 'technical_issues', label: 'Technical issues', icon: Zap },
    { id: 'found_alternative', label: 'Found a better alternative', icon: Heart },
    { id: 'other', label: 'Other reason', icon: Moon }
  ]

  const expiryDate = new Date(tool.expires_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const daysLeft = Math.ceil(
    (new Date(tool.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const handleReasonSelect = (selectedReason: string) => {
    setReason(selectedReason)
    setStep('feedback')
  }

  const handleFeedbackSubmit = () => {
    setStep('confirm')
  }

  const handleConfirm = async () => {
    setLoading(true)
    setStep('processing')
    
    try {
      await onConfirm(reason, feedback)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        // Reset state
        setStep('reason')
        setReason('')
        setFeedback('')
        setSuccess(false)
      }, 2000)
    } catch (error) {
      console.error('Cancellation error:', error)
      setStep('reason')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif">Cancel Subscription</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tool Info */}
            <div className="bg-primary-50 p-4 rounded-lg mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{tool.emoji}</span>
                <div>
                  <h3 className="font-medium">{tool.name}</h3>
                  <p className="text-sm text-neutral-600">${tool.price}/month</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
                <Calendar className="w-4 h-4" />
                <span>Current billing period ends: {expiryDate}</span>
              </div>
              {daysLeft > 0 && (
                <div className="mt-2 text-xs text-amber-600">
                  {daysLeft} days remaining in current period
                </div>
              )}
            </div>

            {/* 🔥 IMPORTANT: No Refund Policy Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Important: No Refunds</p>
                  <p className="text-xs text-blue-700 mt-1">
                    When you cancel:
                  </p>
                  <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                    <li>You'll keep access until {expiryDate}</li>
                    <li>No refunds for unused time</li>
                    <li>Your card won't be charged again</li>
                    <li>You can reactivate anytime before {expiryDate}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 1: Reason */}
            {step === 'reason' && (
              <div className="space-y-4">
                <p className="text-neutral-600">
                  We're sorry to see you go. Help us improve by sharing why you're leaving:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {reasons.map((r) => {
                    const Icon = r.icon
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleReasonSelect(r.id)}
                        className="p-4 border rounded-xl hover:border-primary-300 hover:bg-primary-50 transition text-left group"
                      >
                        <Icon className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 mb-2" />
                        <span className="text-sm font-medium">{r.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Feedback */}
            {step === 'feedback' && (
              <div className="space-y-4">
                <p className="text-neutral-600">
                  Any additional feedback? (Optional)
                </p>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us more about your experience..."
                  className="w-full p-3 border rounded-lg h-32 resize-none"
                />
                <div className="flex gap-3">
                  <Button
                    onClick={handleFeedbackSubmit}
                    className="flex-1"
                  >
                    Continue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStep('reason')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 'confirm' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Please confirm
                  </h3>
                  <ul className="text-sm text-amber-700 space-y-2">
                    <li>• You'll keep access until {expiryDate}</li>
                    <li>• No refund will be issued</li>
                    <li>• Auto-renewal will be turned off</li>
                    <li>• You can reactivate anytime before {expiryDate}</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleConfirm}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Yes, Cancel Subscription
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStep('feedback')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Processing */}
            {step === 'processing' && (
              <div className="text-center py-8">
                {success ? (
                  <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Subscription Cancelled</h3>
                    <p className="text-neutral-600 mb-2">
                      You'll have access until {expiryDate}
                    </p>
                    <p className="text-xs text-neutral-500">
                      No refund was issued for unused time
                    </p>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
                    <p className="text-neutral-600">Processing your cancellation...</p>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}