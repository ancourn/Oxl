'use client'

import { useSession } from 'next-auth/react'

export function useAuthStatus() {
  const session = useSession()
  return {
    isAuthenticated: session.status === 'authenticated',
    isLoading: session.status === 'loading',
    user: session.data?.user,
  }
}