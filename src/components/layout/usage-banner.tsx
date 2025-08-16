'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, 
  Crown, 
  X,
  HardDrive,
  FileText,
  Mail
} from 'lucide-react'

interface UsageBannerProps {
  type?: 'drive' | 'docs' | 'mail' | 'general'
  className?: string
}

interface UsageStats {
  used: number
  total: number
  percentage: number
  plan: 'free' | 'pro' | 'enterprise'
}

export function UsageBanner({ type = 'general', className }: UsageBannerProps) {
  const [visible, setVisible] = useState(true)
  const [usage, setUsage] = useState<UsageStats>({
    used: 2.4,
    total: 5,
    percentage: 48,
    plan: 'free'
  })

  useEffect(() => {
    // In a real app, this would fetch usage data from an API
    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/usage')
        if (response.ok) {
          const data = await response.json()
          const apiUsage = data.usage
          
          // Map API usage to component format
          setUsage({
            used: type === 'drive' ? apiUsage.storageUsed / (1024 * 1024 * 1024) : apiUsage.documentsCount,
            total: type === 'drive' ? apiUsage.storageTotal / (1024 * 1024 * 1024) : apiUsage.documentsTotal,
            percentage: type === 'drive' ? apiUsage.storagePercentage : apiUsage.documentsPercentage,
            plan: apiUsage.plan
          })
        }
      } catch (error) {
        console.error('Error fetching usage:', error)
      }
    }

    fetchUsage()
  }, [type])

  if (!visible || usage.plan !== 'free') {
    return null
  }

  const getIcon = () => {
    switch (type) {
      case 'drive':
        return <HardDrive className="h-4 w-4" />
      case 'docs':
        return <FileText className="h-4 w-4" />
      case 'mail':
        return <Mail className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getMessage = () => {
    switch (type) {
      case 'drive':
        return `You've used ${usage.used}GB of ${usage.total}GB storage`
      case 'docs':
        return `You've created ${Math.floor(usage.used)} of ${usage.total} documents`
      case 'mail':
        return `You've used ${Math.floor(usage.used)} of ${usage.total} email aliases`
      default:
        return `You've used ${usage.percentage}% of your Free plan quota`
    }
  }

  const isNearLimit = usage.percentage >= 80

  return (
    <Card className={`${className} ${isNearLimit ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`p-2 rounded-lg ${isNearLimit ? 'bg-orange-100' : 'bg-blue-100'}`}>
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <p className={`font-medium ${isNearLimit ? 'text-orange-800' : 'text-blue-800'}`}>
                  {getMessage()}
                </p>
                <Badge variant="secondary" className="text-xs">
                  Free Plan
                </Badge>
              </div>
              
              <Progress value={usage.percentage} className="w-full mb-2" />
              
              <div className="flex items-center justify-between text-sm">
                <p className={isNearLimit ? 'text-orange-600' : 'text-blue-600'}>
                  {usage.percentage}% used
                </p>
                {isNearLimit && (
                  <p className="text-orange-600 font-medium">
                    Running low on storage
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Button 
              size="sm" 
              className={isNearLimit ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              <Crown className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setVisible(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}