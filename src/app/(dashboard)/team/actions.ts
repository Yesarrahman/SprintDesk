'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { WorkspaceRole } from '@/types'

export async function inviteMember(email: string, role: WorkspaceRole) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // 1. Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // 2. Get current user's workspace based on active cookie
  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value

  let query = supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)

  if (activeWorkspaceId) {
    query = query.eq('workspace_id', activeWorkspaceId)
  }

  const { data: workspaces, error: memberError } = await query
  const memberData = workspaces && workspaces.length > 0 ? workspaces[0] : null

  if (memberError || !memberData) {
    return { error: 'Could not resolve your workspace' }
  }

  if (memberData.role !== 'owner' && memberData.role !== 'admin') {
    return { error: 'You do not have permission to invite members' }
  }

  const workspaceId = memberData.workspace_id

  // 3. Check if service role key is present
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing.' }
  }

  // 4. Invite user via Supabase Admin API
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email)

  if (inviteError) {
    console.error('Error inviting user:', inviteError)
    // If the user already exists, Supabase might return a specific error
    // For simplicity, we just return the error message
    return { error: inviteError.message }
  }

  const invitedUserId = inviteData.user.id

  // 5. Ensure the profile exists so we can display their email in the UI
  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({ id: invitedUserId, full_name: email.split('@')[0] }, { onConflict: 'id' })

  if (profileError) {
    console.error('Error creating profile for invited user:', profileError)
  }

  // 6. Add them to workspace_members
  const { error: insertError } = await adminClient
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      user_id: invitedUserId,
      role: role
    })

  if (insertError) {
    // If they are already in the workspace, it will throw a unique constraint error
    if (insertError.code === '23505') {
      return { error: 'User is already a member of this workspace' }
    }
    console.error('Error adding to workspace:', insertError)
    return { error: 'Failed to add user to workspace' }
  }

  return { success: true }
}

export async function removeMember(userIdToRemove: string) {
  const supabase = await createClient()

  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 2. Get workspace and role using cookie context
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

  if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
    return { error: 'You do not have permission to remove members' }
  }

  // 3. Remove the member
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', currentMember.workspace_id)
    .eq('user_id', userIdToRemove)

  if (error) {
    console.error('Error removing member:', error)
    return { error: error.message }
  }

  return { success: true }
}
