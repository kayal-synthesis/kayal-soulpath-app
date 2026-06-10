import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'superadmin'
  permissions: string[]
}

export async function getAdminSession() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return null
  }

  // Check if user has admin role in database
  const adminUser = await prisma.admin.findUnique({
    where: { email: session.user.email }
  })

  if (!adminUser) {
    return null
  }

  return {
    ...session,
    user: {
      ...session.user,
      role: adminUser.role,
      permissions: adminUser.permissions
    }
  }
}

export function isAdmin(session: any): boolean {
  return session?.user?.role === 'admin' || session?.user?.role === 'superadmin'
}

export function hasPermission(session: any, permission: string): boolean {
  return session?.user?.permissions?.includes(permission) || false
}