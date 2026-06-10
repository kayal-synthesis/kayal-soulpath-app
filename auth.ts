import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { api } from '@/lib/api/client'

declare module 'next-auth' {
  interface User {
    id: string
    name: string
    email: string
    role?: 'user' | 'referral' | 'admin'
    token?: string
    referralCode?: string
  }
  interface Session {
    accessToken?: string
    user: User
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role?: string
    referralCode?: string
    accessToken?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // This is ONLY for referral community members
        // Regular users use DOB/Name via anonymous store
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        try {
          console.log('🔐 Referral member login:', credentials.email)
          
          // Call your FastAPI backend for referral members
          const response = await api.post('/api/auth/referral-login', {
            email: credentials.email,
            password: credentials.password
          })

          if (response.data) {
            return {
              id: response.data.user.id,
              name: response.data.user.name,
              email: response.data.user.email,
              role: 'referral',
              token: response.data.token,
              referralCode: response.data.user.referralCode
            }
          }
          
          return null
        } catch (error) {
          console.error('❌ Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.referralCode = user.referralCode
        token.accessToken = user.token
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'user' | 'referral' | 'admin'
        session.user.referralCode = token.referralCode as string
        session.accessToken = token.accessToken as string
      }
      return session
    }
  },
  pages: {
    signIn: '/onboarding/basic',     // Redirect to DOB/Name page
    signOut: '/',                      // Redirect to home after logout
    error: '/onboarding/basic',        // Redirect errors to onboarding
    verifyRequest: '/onboarding/basic', // For email verification (if used)
    newUser: '/referral/dashboard'     // After referral registration
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-key',
}