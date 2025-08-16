'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { stripePlans } from '@/lib/stripe'

interface UsageData {
  storageUsed: number
  storageTotal: number
  storagePercentage: number
  documentsCount: number
  documentsTotal: number
  documentsPercentage: number
  plan: string
  planName: string
  features: string[]
}

interface UserPermissions {
  canUploadFiles: boolean
  canCreateDocuments: boolean
  canShareFiles: boolean
  canUseAdvancedFeatures: boolean
  storageRemaining: number
  documentsRemaining: number
  usage: UsageData | null
  loading: boolean
}

export function useUserPermissions(): UserPermissions {
  const { data: session } = useSession()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchUsage()
    }
  }, [session])

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/usage')
      if (response.ok) {
        const data = await response.json()
        setUsage(data.usage)
      }
    } catch (error) {
      console.error('Error fetching usage:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!session || !usage) {
    return {
      canUploadFiles: false,
      canCreateDocuments: false,
      canShareFiles: false,
      canUseAdvancedFeatures: false,
      storageRemaining: 0,
      documentsRemaining: 0,
      usage: null,
      loading,
    }
  }

  const planType = usage.plan as keyof typeof stripePlans
  const plan = stripePlans[planType] || stripePlans.free
  
  const storageRemaining = Math.max(0, plan.limits.storage - usage.storageUsed)
  const documentsRemaining = plan.limits.documents === -1 
    ? -1 
    : Math.max(0, plan.limits.documents - usage.documentsCount)

  const canUploadFiles = storageRemaining > 0
  const canCreateDocuments = documentsRemaining === -1 || documentsRemaining > 0
  const canShareFiles = usage.plan !== 'free'
  const canUseAdvancedFeatures = usage.plan !== 'free'

  return {
    canUploadFiles,
    canCreateDocuments,
    canShareFiles,
    canUseAdvancedFeatures,
    storageRemaining,
    documentsRemaining,
    usage,
    loading,
  }
}