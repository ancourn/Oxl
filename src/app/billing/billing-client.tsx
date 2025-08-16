'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Icons } from '@/components/ui/icons'
import { stripePlans } from '@/lib/stripe'

export default function BillingClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [usage, setUsage] = useState({
    storageUsed: 0,
    documentsCount: 0,
  })

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchSubscription()
      fetchUsage()
    }
  }, [session])

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/billing/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    }
  }

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/usage')
      if (response.ok) {
        const data = await response.json()
        setUsage(data.usage)
      }
    } catch (error) {
      console.error('Error fetching usage:', error)
    }
  }

  const handleUpgrade = async (planId: string) => {
    if (!session) {
      signIn()
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
        }),
      })

      if (response.ok) {
        const { checkoutUrl } = await response.json()
        window.location.href = checkoutUrl
      } else {
        console.error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Error upgrading:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const manageSubscription = async () => {
    if (!subscription?.stripeCustomerId) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      if (response.ok) {
        const { portalUrl } = await response.json()
        window.location.href = portalUrl
      }
    } catch (error) {
      console.error('Error opening portal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const currentPlan = subscription?.status === 'ACTIVE' ? 'pro' : 'free'
  const currentPlanData = stripePlans[currentPlan as keyof typeof stripePlans]

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing</h1>
          <p className="text-gray-600">Manage your subscription and usage</p>
        </div>

        {success && (
          <Alert className="mb-6">
            <AlertDescription>
              Payment successful! Your subscription has been upgraded.
            </AlertDescription>
          </Alert>
        )}

        {canceled && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>
              Payment canceled. You can try again whenever you're ready.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Plan */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Current Plan
              <Badge variant={currentPlan === 'pro' ? 'default' : 'secondary'}>
                {currentPlanData.name}
              </Badge>
            </CardTitle>
            <CardDescription>
              {currentPlan === 'pro' ? 'You are on the Pro plan' : 'You are on the Free plan'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Storage Used</p>
                <p className="text-lg font-semibold">
                  {(usage.storageUsed / (1024 * 1024 * 1024)).toFixed(2)} GB / {currentPlanData.limits.storage / (1024 * 1024 * 1024)} GB
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Documents Created</p>
                <p className="text-lg font-semibold">
                  {usage.documentsCount} {currentPlanData.limits.documents === -1 ? 'Unlimited' : `/ ${currentPlanData.limits.documents}`}
                </p>
              </div>
            </div>
            
            {currentPlan === 'pro' && (
              <div className="mt-4">
                <Button onClick={manageSubscription} disabled={isLoading}>
                  {isLoading ? 'Loading...' : 'Manage Subscription'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(stripePlans).map(([planId, plan]) => (
            <Card key={planId} className={currentPlan === planId ? 'ring-2 ring-blue-500' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {currentPlan === planId && (
                    <Badge variant="default">Current Plan</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  <div className="text-3xl font-bold">
                    {plan.price === 0 ? 'Free' : `$${(plan.price / 100).toFixed(2)}`}
                    {plan.price > 0 && <span className="text-sm font-normal text-gray-500">/month</span>}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <Icons.spinner className="h-4 w-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                {currentPlan !== planId && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade(planId)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {plan.price === 0 ? 'Downgrade to Free' : 'Upgrade to Pro'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}