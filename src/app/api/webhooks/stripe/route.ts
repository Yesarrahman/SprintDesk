import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia' as any,
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Map Stripe price IDs to our internal tier names
const PRICE_TO_TIER: Record<string, string> = {
  [process.env.STRIPE_PRO_MONTHLY_PRICE_ID!]: 'pro',
  [process.env.STRIPE_PRO_YEARLY_PRICE_ID!]: 'pro',
  [process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID!]: 'agency',
  [process.env.STRIPE_AGENCY_YEARLY_PRICE_ID!]: 'agency',
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const adminClient = await createAdminClient()

  try {
    switch (event.type) {
      // ─── Payment Successful → Activate Tier for Account & Workspaces ───────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode !== 'subscription') break

        const userId = session.metadata?.userId
        const workspaceId = session.metadata?.workspaceId
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        // Fetch the subscription to determine which price/tier was purchased
        const subscription: any = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items?.data?.[0]?.price?.id
        const tier = PRICE_TO_TIER[priceId] || 'pro'

        // 1. Upgrade user profile (Account-level billing)
        if (userId) {
          await adminClient
            .from('profiles')
            .update({
              subscription_tier: tier,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
            .eq('id', userId)

          // 2. Upgrade all workspaces owned by this user
          await adminClient
            .from('workspaces')
            .update({
              tier,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
            .eq('owner_id', userId)

          console.log(`✅ User ${userId} and all owned workspaces upgraded to ${tier}`)
        } else if (workspaceId) {
          await adminClient
            .from('workspaces')
            .update({
              tier,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
            .eq('id', workspaceId)
        }
        break
      }

      // ─── Subscription Updated → Sync Upgrades, Downgrades, Renewals ────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const customerId = subscription.customer as string
        const priceId = subscription.items?.data?.[0]?.price?.id
        const tier = PRICE_TO_TIER[priceId] || 'pro'

        const isActive = ['active', 'trialing'].includes(subscription.status)
        const newTier = isActive ? tier : 'free'

        // 1. Update user profile by stripe_customer_id
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await adminClient
            .from('profiles')
            .update({
              subscription_tier: newTier,
              stripe_subscription_id: subscription.id,
            })
            .eq('id', profile.id)

          // 2. Update all workspaces owned by this user
          await adminClient
            .from('workspaces')
            .update({
              tier: newTier,
              stripe_subscription_id: subscription.id,
            })
            .eq('owner_id', profile.id)

          console.log(`✅ Subscription updated for user ${profile.id} to ${newTier}`)
        } else {
          // Fallback: update workspace directly
          await adminClient
            .from('workspaces')
            .update({
              tier: newTier,
              stripe_subscription_id: subscription.id,
            })
            .eq('stripe_customer_id', customerId)
        }
        break
      }

      // ─── Subscription Cancelled → Downgrade to Free ───────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const customerId = subscription.customer as string

        const { data: profile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await adminClient
            .from('profiles')
            .update({
              subscription_tier: 'free',
              stripe_subscription_id: null,
            })
            .eq('id', profile.id)

          await adminClient
            .from('workspaces')
            .update({
              tier: 'free',
              stripe_subscription_id: null,
            })
            .eq('owner_id', profile.id)

          console.log(`✅ User ${profile.id} downgraded to free (cancelled)`)
        } else {
          await adminClient
            .from('workspaces')
            .update({
              tier: 'free',
              stripe_subscription_id: null,
            })
            .eq('stripe_customer_id', customerId)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
