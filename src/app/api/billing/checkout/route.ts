import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planId, teamId } = await request.json()
    
    if (!planId || !['pro'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // Check if user is a member of the team and has permission to manage billing
    const userMembership = await db.teamMember.findFirst({
      where: {
        teamId,
        user: {
          email: session.user.email,
        },
        role: {
          in: ['OWNER', 'ADMIN'],
        },
      },
    })

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const priceId = process.env.STRIPE_PRO_PRICE_ID
    if (!priceId) {
      return NextResponse.json({ error: 'Stripe price ID not configured' }, { status: 500 })
    }

    const checkoutSession = await createCheckoutSession(teamId, priceId)
    
    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
    })

  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}