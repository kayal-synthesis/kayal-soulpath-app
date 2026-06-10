'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

interface AdminAuthReturn {
  isAdmin: boolean
  isLoading: boolean
  adminData: any
  checkAdminStatus: () => Promise<boolean>
}

export const useAdminAuth = (): AdminAuthReturn => {
  const { data: session, status } = useSession()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminData, setAdminData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const verifyAdmin = async () => {
      if (status === 'loading') return

      if (!session) {
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch('/api/admin/verify')
        const data = await response.json()
        
        setIsAdmin(data.isAdmin)
        setAdminData(data.adminData)
        
        // Log admin access
        if (data.isAdmin) {
          await fetch('/api/admin/logs', {
            method: 'POST',
            body: JSON.stringify({
              action: 'ADMIN_LOGIN',
              details: {
                email: session.user?.email,
                timestamp: new Date().toISOString()
              }
            })
          })
        }
      } catch (error) {
        console.error('Failed to verify admin status:', error)
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    verifyAdmin()
  }, [session, status])

  const checkAdminStatus = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/verify')
      const data = await response.json()
      return data.isAdmin
    } catch {
      return false
    }
  }

  return {
    isAdmin,
    isLoading,
    adminData,
    checkAdminStatus
  }
}