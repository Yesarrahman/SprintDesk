import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import TeamClient from './team-client'

export default async function TeamPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get current user's workspace role based on active cookie
  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

  let query = supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
  
  if (activeWorkspaceId) {
    query = query.eq('workspace_id', activeWorkspaceId)
  }

  const { data: workspaces } = await query

  const currentMember = workspaces && workspaces.length > 0 ? workspaces[0] : null

  if (!currentMember) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Team</h1>
        <div className="p-6 rounded-xl border bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <p className="text-slate-500">You must be part of a workspace to view the team.</p>
        </div>
      </div>
    )
  }

  // Fetch all members of this workspace
  // We need to join with profiles to get the full name
  const { data: members, error } = await supabase
    .from('workspace_members')
    .select(`
      id,
      role,
      user_id,
      created_at,
      profiles:user_id (
        full_name,
        avatar_url
      )
    `)
    .eq('workspace_id', currentMember.workspace_id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching members:', error)
  }

  // Format members
  const formattedMembers = (members || []).map(m => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    created_at: m.created_at,
    // @ts-expect-error: Joined column type not inferred
    full_name: m.profiles?.full_name || 'Unknown User',
    // @ts-expect-error: Joined column type not inferred
    avatar_url: m.profiles?.avatar_url || null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Team</h1>
      </div>
      
      <TeamClient 
        members={formattedMembers} 
        currentUserId={user.id} 
        currentUserRole={currentMember.role} 
      />
    </div>
  )
}
