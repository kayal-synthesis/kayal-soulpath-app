'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CategoriesPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/domains')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto mb-4" />
        <p className="text-neutral-600">Redirecting to domains...</p>
      </div>
    </div>
  )
}