import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export const stripePlans = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      '5GB Storage',
      'Limited Documents',
      'Basic Support',
    ],
    limits: {
      storage: 5 * 1024 * 1024 * 1024, // 5GB in bytes
      documents: 10,
    }
  },
  pro: {
    name: 'Pro',
    price: 999, // $9.99 in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      '1TB Storage',
      'Unlimited Documents',
      'Priority Support',
      'Advanced Features',
    ],
    limits: {
      storage: 1024 * 1024 * 1024 * 1024, // 1TB in bytes
      documents: -1, // unlimited
    }
  }
}

export async function createCheckoutSession(teamId: string, priceId: string) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true&teamId=${teamId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true&teamId=${teamId}`,
    metadata: {
      teamId,
    },
  })

  return session
}

export async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  })

  return session
}

export { stripe }