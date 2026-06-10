'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProcessingPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="text-center py-20">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mx-auto mb-8"></div>
      <h2 className="text-2xl font-serif mb-4">Reading your lines...</h2>
      <p className="text-neutral-600">This will take about 30 seconds</p>
    </div>
  )
}