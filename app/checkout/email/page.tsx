'use client'
import { Suspense } from 'react'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Mail, Lock, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

function EmailCheckoutPageInner() {
  const router = useRouter()
  const { user, updateAnonymousUser } = useAnonymousStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [registerForReferrals, setRegisterForReferrals] = useState(false)

  const toolId = sessionStorage.getItem('pendingPurchase')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Store email with anonymous user
      await api.post('/api/checkout/prepare', {
        sessionId: user?.sessionId,
        email,
        toolId,
        registerForReferrals
      })

      // Update local store
      updateAnonymousUser({ email })

      // Proceed to payment
      router.push(`/checkout/payment?toolId=${toolId}`)
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-neutral-600 hover:text-primary-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center mb-6">
          <Mail className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-2xl font-serif mb-2">
            Complete Your Purchase
          </h1>
          <p className="text-neutral-600">
            Enter your email to continue to secure checkout
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div className="flex items-start gap-2 p-3 bg-primary-50 rounded-lg">
            <input
              type="checkbox"
              id="referrals"
              checked={registerForReferrals}
              onChange={(e) => setRegisterForReferrals(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="referrals" className="text-sm text-neutral-700">
              <span className="font-medium">Join our referral program</span>
              <span className="block text-xs text-neutral-500 mt-1">
                Earn free reports when friends purchase. You can opt out anytime.
              </span>
            </label>
          </div>

          <Button type="submit" fullWidth loading={loading}>
            Continue to Payment
          </Button>
        </form>

        <p className="text-xs text-center text-neutral-500 mt-4">
          Your email will only be used for this purchase and optional referrals.
          No spam, ever.
        </p>
      </Card>
    </div>
  )
}
export default function EmailCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <EmailCheckoutPageInner />
    </Suspense>
  )
}