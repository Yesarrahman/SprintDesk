'use server'

import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

// We expect STRIPE_SECRET_KEY to be set in .env.local (can be a test key: sk_test_...)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-07-29.dahlia',
})

export async function createCheckoutSession(tier: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to upgrade.')
  }

  // Define your price IDs here (these would come from your Stripe dashboard products)
  // For testing, we are using mock IDs. When you create products in Stripe, replace these.
  const priceIds: Record<string, string> = {
    pro: process.env.STRIPE_PRICE_PRO || 'price_12345_mock_pro',
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_67890_mock_enterprise'
  }

  const priceId = priceIds[tier]

  if (!priceId) {
    throw new Error('Invalid tier selected.')
  }

  // Get the origin for success/cancel URLs
  const headersList = await headers()
  const origin = headersList.get('origin') || 'http://localhost:3000'

  let checkoutUrl = ''
  try {
    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard?upgrade=success`,
      cancel_url: `${origin}/upgrade?upgrade=canceled`,
      metadata: {
        userId: user.id,
        tier: tier,
      },
    })

    if (session.url) {
      checkoutUrl = session.url
    }
  } catch (error: any) {
    console.error('Stripe error:', error)
    throw new Error(error.message || 'Failed to create Stripe checkout session.')
  }

  if (checkoutUrl) {
    redirect(checkoutUrl)
  }
}
