import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')!

    let event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object
        await handleSubscriptionUpdate(subscription)
        break
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object
        await handleSubscriptionDelete(deletedSubscription)
        break
        
      case 'invoice.payment_succeeded':
        const invoice = event.data.object
        await handlePaymentSuccess(invoice)
        break
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object
        await handlePaymentFailed(failedInvoice)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionUpdate(subscription: any) {
  try {
    const customerId = subscription.customer as string
    
    // Find team subscription by Stripe customer ID
    const teamSubscription = await db.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      include: { team: true }
    })

    if (!teamSubscription) {
      console.error('No subscription found for customer:', customerId)
      return
    }

    // Update subscription
    await db.subscription.update({
      where: { id: teamSubscription.id },
      data: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price?.id,
        status: subscription.status.toUpperCase(),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      }
    })

    // Update team owner plan (for backward compatibility)
    const plan = subscription.status === 'active' ? 'PRO' : 'FREE'
    await db.user.update({
      where: { id: teamSubscription.team.ownerId },
      data: { plan: plan as any }
    })

  } catch (error) {
    console.error('Error updating subscription:', error)
  }
}

async function handleSubscriptionDelete(subscription: any) {
  try {
    const customerId = subscription.customer as string
    
    // Find team subscription by Stripe customer ID
    const teamSubscription = await db.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      include: { team: true }
    })

    if (!teamSubscription) {
      console.error('No subscription found for customer:', customerId)
      return
    }

    // Update subscription status
    await db.subscription.update({
      where: { id: teamSubscription.id },
      data: {
        status: 'CANCELED',
      }
    })

    // Downgrade team owner to free plan (for backward compatibility)
    await db.user.update({
      where: { id: teamSubscription.team.ownerId },
      data: { plan: 'FREE' as any }
    })

  } catch (error) {
    console.error('Error handling subscription deletion:', error)
  }
}

async function handlePaymentSuccess(invoice: any) {
  try {
    console.log('Payment succeeded for invoice:', invoice.id)
    // You could add additional logic here, like sending a receipt email
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function handlePaymentFailed(invoice: any) {
  try {
    console.log('Payment failed for invoice:', invoice.id)
    // You could add additional logic here, like sending a notification
  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}