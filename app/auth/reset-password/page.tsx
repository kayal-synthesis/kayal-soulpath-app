'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// The page resetPasswordForEmail's redirectTo actually points at. Same
// detectSessionInUrl-based pattern already confirmed working for the
// magic link, lib/supabase/client.ts detects the reset token in the URL
// itself the moment this page loads, no separate server callback route
// needed, updateUser() below just works against that session directly.

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setDone(true)
      setTimeout(() => router.push('/member/dashboard'), 2000)
    } catch (err: any) {
      setError(err.message || 'Could not update your password. The reset link may have expired, request a new one.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 text-center max-w-sm w-full"
        >
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-serif mb-2">Password updated</h1>
          <p className="text-sm text-neutral-500">Taking you to your dashboard…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 max-w-sm w-full"
      >
        <h1 className="text-xl font-serif mb-1">Set a new password</h1>
        <p className="text-sm text-neutral-500 mb-6">Choose something at least 8 characters.</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">New Password</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-10 pr-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Confirm Password</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                className="w-full pl-10 pr-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-500 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{error}
            </p>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading || !password || !confirmPassword}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium rounded-xl mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
