'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia' as any,
})

const PRICE_IDS = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
  },
  agency: {
    monthly: process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_AGENCY_YEARLY_PRICE_ID!,
  },
}

export async function createCheckoutSession(
  tier: 'pro' | 'agency',
  billing: 'monthly' | 'yearly'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const cookieStore = await cookies()
  const workspaceId = cookieStore.get('activeWorkspaceId')?.value
  if (!workspaceId) throw new Error('No active workspace selected')

  const priceId = PRICE_IDS[tier][billing]
  if (!priceId) throw new Error('Invalid plan selection')

  const headersList = await headers()
  const origin = headersList.get('origin') || 'http://localhost:3000'

  const adminClient = await createAdminClient()

  // Get user profile & workspace to attach customer info
  const { data: profile } = await adminClient
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  const { data: ws } = await adminClient
    .from('workspaces')
    .select('stripe_customer_id')
    .eq('id', workspaceId)
    .single()

  const existingCustomerId = profile?.stripe_customer_id || ws?.stripe_customer_id

  let checkoutUrl = ''
  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: {
        userId: user.id,
        workspaceId,
        tier,
        billing,
      },
    }

    if (existingCustomerId) {
      sessionParams.customer = existingCustomerId
    } else {
      sessionParams.customer_email = user.email
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    if (session.url) checkoutUrl = session.url
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    throw new Error(error.message || 'Failed to create checkout session')
  }

  if (checkoutUrl) redirect(checkoutUrl)
}

export async function createCustomerPortalSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const cookieStore = await cookies()
  const workspaceId = cookieStore.get('activeWorkspaceId')?.value
  if (!workspaceId) throw new Error('No active workspace selected')

  const adminClient = await createAdminClient()

  const { data: ws } = await adminClient
    .from('workspaces')
    .select('id, owner_id, stripe_customer_id')
    .eq('id', workspaceId)
    .single()

  // STRICT OWNER CHECK: Admins and members CANNOT manage billing or access the owner's Stripe portal!
  if (!ws || ws.owner_id !== user.id) {
    throw new Error('Unauthorized: Only the workspace owner can manage billing and subscriptions.')
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  const customerId = ws.stripe_customer_id || profile?.stripe_customer_id

  if (!customerId) {
    throw new Error('No billing account found for this workspace.')
  }

  const headersList = await headers()
  const origin = headersList.get('origin') || 'http://localhost:3000'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/billing`,
  })

  redirect(portalSession.url)
}

export type BillingInfo = {
  workspaceId: string
  workspaceName: string
  isOwner: boolean
  userRole: string
  tier: 'free' | 'pro' | 'agency'
  hasStripeCustomer: boolean
  ownedWorkspacesCount: number
  subscription: {
    status: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    interval: 'monthly' | 'yearly'
    priceId: string
  } | null
} | null

export async function getWorkspaceBillingInfo(): Promise<BillingInfo> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const cookieStore = await cookies()
  const workspaceId = cookieStore.get('activeWorkspaceId')?.value
  if (!workspaceId) return null

  const adminClient = await createAdminClient()

  // 1. Fetch workspace info
  const { data: ws } = await adminClient
    .from('workspaces')
    .select('id, name, tier, owner_id, stripe_customer_id, stripe_subscription_id')
    .eq('id', workspaceId)
    .single()

  if (!ws) return null

  // 2. Fetch user profile
  let { data: profile } = await adminClient
    .from('profiles')
    .select('subscription_tier, stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .single()

  // 2b. Self-Healing Reconciliation: If owner has no subscription recorded in DB, check Stripe directly
  if (ws.owner_id === user.id && (!profile?.stripe_subscription_id || !ws.stripe_subscription_id)) {
    try {
      let customerId = profile?.stripe_customer_id || ws.stripe_customer_id
      if (!customerId && user.email) {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 })
        if (customers.data.length > 0) {
          customerId = customers.data[0].id
        }
      }

      if (customerId) {
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1,
        })

        if (subs.data.length > 0) {
          const activeSub = subs.data[0]
          const priceId = activeSub.items?.data?.[0]?.price?.id || ''
          const matchedTier =
            priceId === PRICE_IDS.agency.monthly || priceId === PRICE_IDS.agency.yearly
              ? 'agency'
              : 'pro'

          await adminClient
            .from('profiles')
            .update({
              subscription_tier: matchedTier,
              stripe_customer_id: customerId,
              stripe_subscription_id: activeSub.id,
            })
            .eq('id', user.id)

          await adminClient
            .from('workspaces')
            .update({
              tier: matchedTier,
              stripe_customer_id: customerId,
              stripe_subscription_id: activeSub.id,
            })
            .eq('owner_id', user.id)

          profile = {
            subscription_tier: matchedTier,
            stripe_customer_id: customerId,
            stripe_subscription_id: activeSub.id,
          }
          ws.tier = matchedTier
          ws.stripe_customer_id = customerId
          ws.stripe_subscription_id = activeSub.id
        }
      }
    } catch (reconcileErr) {
      console.error('Self-healing Stripe reconciliation error:', reconcileErr)
    }
  }

  // 3. Count workspaces owned by this user (to show usage: e.g. 2 / 2)
  const { count: ownedWorkspacesCount } = await adminClient
    .from('workspaces')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)

  // 4. Determine role & ownership
  const isOwner = ws.owner_id === user.id
  let userRole = isOwner ? 'owner' : 'member'

  if (!isOwner) {
    const { data: mem } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (mem?.role) userRole = mem.role
  }

  // 5. Determine effective tier:
  // If user is owner of workspace, use the owner's plan (pro/agency/free).
  // If user is an invited member/admin, workspace has its tier, but the member's account has their own personal tier.
  let effectiveTier: 'free' | 'pro' | 'agency' = 'free'

  if (isOwner) {
    const hasStripe = !!(profile?.stripe_subscription_id || ws?.stripe_subscription_id)
    const ownerPlan = (profile?.subscription_tier as any) || (ws.tier as any) || 'free'
    if (hasStripe && (ownerPlan === 'agency' || ownerPlan === 'pro')) {
      effectiveTier = ownerPlan
    } else {
      effectiveTier = 'free'
    }
  } else {
    // For invited members, display workspace tier if workspace has verified subscription
    const hasStripe = !!(ws?.stripe_subscription_id)
    effectiveTier = hasStripe && (ws.tier === 'pro' || ws.tier === 'agency') ? ws.tier : 'free'
  }

  // 6. Subscription details (ONLY retrieved for owner!)
  let subscriptionInfo: BillingInfo extends { subscription: infer S } ? S : any = null
  const subId = ws.stripe_subscription_id || profile?.stripe_subscription_id

  if (isOwner && subId) {
    try {
      const subscription: any = await stripe.subscriptions.retrieve(subId)
      const priceId = subscription.items?.data?.[0]?.price?.id
      const interval = subscription.items?.data?.[0]?.price?.recurring?.interval

      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : new Date().toISOString()

      subscriptionInfo = {
        status: subscription.status || 'active',
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
        interval: interval === 'year' ? 'yearly' : 'monthly',
        priceId: priceId || '',
      }
    } catch (err) {
      console.error('Failed to fetch subscription from Stripe:', err)
    }
  }

  return {
    workspaceId: ws.id,
    workspaceName: ws.name,
    isOwner,
    userRole,
    tier: effectiveTier,
    hasStripeCustomer: !!(ws.stripe_customer_id || profile?.stripe_customer_id),
    ownedWorkspacesCount: ownedWorkspacesCount || 1,
    subscription: subscriptionInfo,
  }
}
