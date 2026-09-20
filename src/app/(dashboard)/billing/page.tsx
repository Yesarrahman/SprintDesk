import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getWorkspaceBillingInfo } from './actions'
import { BillingClient } from './billing-client'

interface BillingPageProps {
  searchParams: Promise<{ plan?: string }>
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const billingInfo = await getWorkspaceBillingInfo()
  const { plan } = await searchParams
  const validPlans = ['pro', 'agency']
  const initialPlan = plan && validPlans.includes(plan) ? (plan as 'pro' | 'agency') : undefined

  return <BillingClient billingInfo={billingInfo} initialPlan={initialPlan} />
}
