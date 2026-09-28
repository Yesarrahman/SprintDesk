'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { headers, cookies } from 'next/headers'
import { ensurePersonalWorkspace } from '@/app/actions/workspace'

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
): Promise<{ error?: string; url?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated. Please log in.' }

    const priceId = PRICE_IDS[tier]?.[billing]
    if (!priceId) return { error: 'Invalid plan selection or Stripe price ID not configured.' }

    const headersList = await headers()
    const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
    const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
    const origin = `${proto}://${host}`

    const adminClient = await createAdminClient()

    // Find user's owned personal workspace or ensure one exists
    let userWsId: string | null = null
    const { data: ownedWs } = await adminClient
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)

    if (ownedWs && ownedWs.length > 0) {
      userWsId = ownedWs[0].id
    } else {
      userWsId = await ensurePersonalWorkspace(user.id, user.email, user.user_metadata?.full_name)
    }

    // Get user profile to attach customer info
    const { data: profile } = await adminClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    const existingCustomerId = profile?.stripe_customer_id

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: {
        userId: user.id,
        workspaceId: userWsId || '',
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
    if (!session.url) {
      return { error: 'Stripe failed to return checkout session URL' }
    }

    return { url: session.url }
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return { error: error.message || 'Failed to create checkout session' }
  }
}

export async function createCustomerPortalSession(): Promise<{ error?: string; url?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated. Please log in.' }

    const adminClient = await createAdminClient()

    const { data: profile } = await adminClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId && user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 })
      if (customers.data.length > 0) {
        customerId = customers.data[0].id
      }
    }

    if (!customerId) {
      return { error: 'No active billing subscription found for your account.' }
    }

    const headersList = await headers()
    const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
    const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
    const origin = `${proto}://${host}`

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/billing`,
    })

    return { url: portalSession.url }
  } catch (error: any) {
    console.error('Customer portal error:', error)
    return { error: error.message || 'Failed to open billing portal' }
  }
}

export type InvoiceItem = {
  id: string
  number: string
  amount: number
  currency: string
  status: string
  created: string
  pdfUrl: string | null
  hostedUrl: string | null
}

export type BillingInfo = {
  workspaceId: string
  workspaceName: string
  isOwner: boolean
  userRole: string
  tier: 'free' | 'pro' | 'agency'
  workspaceTier?: 'free' | 'pro' | 'agency'
  hasStripeCustomer: boolean
  ownedWorkspacesCount: number
  subscription: {
    status: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    interval: 'monthly' | 'yearly'
    priceId: string
  } | null
  invoices?: InvoiceItem[]
} | null

export async function getWorkspaceBillingInfo(): Promise<BillingInfo> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const cookieStore = await cookies()
  let workspaceId = cookieStore.get('activeWorkspaceId')?.value

  const adminClient = await createAdminClient()

  // 1. Fetch user profile
  let { data: profile } = await adminClient
    .from('profiles')
    .select('subscription_tier, stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .single()

  // Ensure personal workspace exists if not already
  let userWsId: string | null = null
  const { data: ownedWs } = await adminClient
    .from('workspaces')
    .select('id, name, tier, stripe_customer_id, stripe_subscription_id')
    .eq('owner_id', user.id)
    .limit(1)

  if (ownedWs && ownedWs.length > 0) {
    userWsId = ownedWs[0].id
  } else {
    userWsId = await ensurePersonalWorkspace(user.id, user.email, user.user_metadata?.full_name)
  }

  if (!workspaceId) {
    workspaceId = userWsId || undefined
  }

  // 2. Fetch active workspace (or fallback to user's owned workspace)
  let ws: any = null
  if (workspaceId) {
    const { data: foundWs } = await adminClient
      .from('workspaces')
      .select('id, name, tier, owner_id, stripe_customer_id, stripe_subscription_id')
      .eq('id', workspaceId)
      .single()
    ws = foundWs
  }

  if (!ws && userWsId) {
    const { data: personalWs } = await adminClient
      .from('workspaces')
      .select('id, name, tier, owner_id, stripe_customer_id, stripe_subscription_id')
      .eq('id', userWsId)
      .single()
    ws = personalWs
  }

  if (!ws) return null

  // 2b. Self-Healing Reconciliation: Check Stripe directly if profile has no subscription
  const userHasSub = !!profile?.stripe_subscription_id
  if (!userHasSub && user.email) {
    try {
      let customerId = profile?.stripe_customer_id || ws.stripe_customer_id
      if (!customerId) {
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
        }
      }
    } catch (reconcileErr) {
      console.error('Self-healing Stripe reconciliation error:', reconcileErr)
    }
  }

  // 3. Count team workspaces owned by this user (excluding default Personal Space)
  const { count: ownedWorkspacesCount } = await adminClient
    .from('workspaces')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .neq('name', 'My Workspace')

  // 4. Determine role & ownership of the active workspace
  const isOwner = ws.owner_id === user.id
  let userRole = isOwner ? 'owner' : 'member'

  if (!isOwner) {
    const { data: mem } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', ws.id)
      .eq('user_id', user.id)
      .single()

    if (mem?.role) userRole = mem.role
  }

  // 5. Account-Level Tier: Always reflects the USER'S plan
  const userAccountTier: 'free' | 'pro' | 'agency' = (profile?.subscription_tier as any) || 'free'
  const workspaceTier: 'free' | 'pro' | 'agency' = (ws.tier as any) || 'free'

  // 6. Subscription details (retrieved for user account if active)
  let subscriptionInfo: any = null
  const subId = profile?.stripe_subscription_id || (isOwner ? ws.stripe_subscription_id : null)

  if (subId) {
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

  // 7. Fetch invoices from Stripe for this account
  let invoices: InvoiceItem[] = []
  const customerId = profile?.stripe_customer_id || (isOwner ? ws.stripe_customer_id : null)
  if (customerId) {
    try {
      const stripeInvoices = await stripe.invoices.list({
        customer: customerId,
        limit: 24,
      })
      invoices = stripeInvoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number || inv.id,
        amount: (inv.amount_paid ?? inv.total ?? 0) / 100,
        currency: (inv.currency || 'usd').toUpperCase(),
        status: inv.status || 'paid',
        created: inv.created ? new Date(inv.created * 1000).toISOString() : new Date().toISOString(),
        pdfUrl: inv.invoice_pdf || null,
        hostedUrl: inv.hosted_invoice_url || null,
      }))
    } catch (err) {
      console.error('Failed to fetch invoices from Stripe:', err)
    }
  }

  return {
    workspaceId: ws.id,
    workspaceName: ws.name,
    isOwner,
    userRole,
    tier: userAccountTier,
    workspaceTier,
    hasStripeCustomer: !!customerId,
    ownedWorkspacesCount: ownedWorkspacesCount ?? 0,
    subscription: subscriptionInfo,
    invoices,
  }
}
