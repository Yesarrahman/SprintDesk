import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AutomationsClient } from './automations-client'

export default async function AutomationsPage() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!activeWorkspaceId) {
    return <div className="p-8">Please select a workspace first.</div>
  }

  // Get workspace tier
  const adminClient = await createAdminClient()
  const { data: ws } = await adminClient
    .from('workspaces')
    .select('tier, name, owner_id')
    .eq('id', activeWorkspaceId)
    .single()

  // Get user role
  let role = 'member'
  if (ws?.owner_id === user.id) {
    role = 'owner'
  } else {
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', activeWorkspaceId)
      .eq('user_id', user.id)
      .single()
    if (member) role = member.role
  }

  // Get automations
  const { data: automations } = await supabase
    .from('automations')
    .select('*')
    .eq('workspace_id', activeWorkspaceId)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <AutomationsClient 
        initialAutomations={automations || []} 
        role={role as any} 
        tier={process.env.NODE_ENV === 'development' ? 'enterprise' : (ws?.tier || 'free')} 
      />
    </div>
  )
}
