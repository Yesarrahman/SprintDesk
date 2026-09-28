'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies, headers } from 'next/headers'
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

  let query = adminClient
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

  // Enforce member limits: Free: max 3, Pro: max 10, Agency/Enterprise: unlimited
  const { data: ws } = await adminClient
    .from('workspaces')
    .select('tier, stripe_subscription_id')
    .eq('id', workspaceId)
    .single()

  const isAgencyOrEnterprise = (ws?.tier === 'agency' || ws?.tier === 'enterprise') && !!ws?.stripe_subscription_id
  const isPro = ws?.tier === 'pro' && !!ws?.stripe_subscription_id

  if (!isAgencyOrEnterprise) {
    const { count: currentMemberCount } = await adminClient
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    const memberCount = currentMemberCount || 0

    if (isPro) {
      if (memberCount >= 10) {
        return {
          error: 'SprintDesk Pro workspaces are limited to 10 team members. Upgrade to SprintDesk Agency for unlimited members.',
        }
      }
    } else {
      if (memberCount >= 3) {
        return {
          error: 'Free workspaces are limited to 3 team members. Upgrade to SprintDesk Pro to invite up to 10 members.',
        }
      }
    }
  }

  // 3. Check if service role key is present
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing.' }
  }

  // Resolve current origin dynamically for email redirects
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const origin = `${proto}://${host}`

  let invitedUserId: string | null = null

  // 4. Invite user via Supabase Admin API with explicit redirect URL
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/dashboard`,
  })

  if (inviteError) {
    // If the user already exists in auth.users, find their ID and proceed to add them to workspace
    const { data: usersData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existingUser = usersData?.users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())
    if (existingUser) {
      invitedUserId = existingUser.id
    } else {
      console.error('Error inviting user:', inviteError)
      return { error: inviteError.message }
    }
  } else if (inviteData?.user) {
    invitedUserId = inviteData.user.id
  }

  if (!invitedUserId) {
    return { error: 'Failed to identify invited user' }
  }

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

  const adminClient = await createAdminClient()
  let query = adminClient
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
  const { error } = await adminClient
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
