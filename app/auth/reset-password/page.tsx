'use client'
// app/auth/reset-password/page.tsx

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { createClient }        from '@/lib/supabase/client'
import { Card }                from '@/components/ui/Card'
import { Button }              from '@/components/ui/Button'
import {
  Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2,
} from 'lucide-react'

export default function ResetPasswordPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [password,     setPassword]     = useState('')
  const [confirm,      setConfirm]      = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [done,         setDone]         = useState(false)
  const [ready,        setReady]        = useState(false)

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) setReady(true)
    })
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => router.replace('/member/dashboard'), 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally { setLoading(false) }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-serif mb-2">Password updated!</h2>
          <p className="text-neutral-600">Taking you to your dashboard…</p>
        </Card>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-neutral-600">Verifying your reset link…</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full">
        <h2 className="text-2xl font-serif mb-1">Set new password</h2>
        <p className="text-neutral-500 text-sm mb-6">Choose a new password for your account.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl
                          flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">New password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-10 pr-10 py-2.5 border rounded-xl
                           focus:ring-2 focus:ring-primary-500" required />
              <button type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type="password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl
                           focus:ring-2 focus:ring-primary-500" required />
            </div>
          </div>
          <Button type="submit"
            disabled={loading || !password || !confirm}
            fullWidth size="lg" className="mt-2">
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : 'Update Password'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
