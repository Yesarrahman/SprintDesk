import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getWorkspaceBillingInfo } from './actions'
import { BillingClient } from './billing-client'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const billingInfo = await getWorkspaceBillingInfo()

  return <BillingClient billingInfo={billingInfo} />
}
