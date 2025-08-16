import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripePlans } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const planType = user.plan.toLowerCase() as keyof typeof stripePlans
    const plan = stripePlans[planType] || stripePlans.free

    // Calculate actual usage
    const [files, documents] = await Promise.all([
      db.file.aggregate({
        where: { 
          userId: user.id,
          isDeleted: false 
        },
        _sum: { size: true },
        _count: true
      }),
      db.document.count({
        where: { 
          userId: user.id,
          isDeleted: false 
        }
      })
    ])

    const storageUsed = files._sum.size || 0
    const storagePercentage = Math.min((storageUsed / plan.limits.storage) * 100, 100)
    
    const documentsCount = documents
    const documentsPercentage = plan.limits.documents === -1 ? 0 : Math.min((documentsCount / plan.limits.documents) * 100, 100)

    const usage = {
      storageUsed,
      storageTotal: plan.limits.storage,
      storagePercentage,
      documentsCount,
      documentsTotal: plan.limits.documents,
      documentsPercentage,
      plan: user.plan.toLowerCase(),
      planName: plan.name,
      features: plan.features
    }

    return NextResponse.json({ usage })
  } catch (error) {
    console.error('Error fetching usage:', error)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}