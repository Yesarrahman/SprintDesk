'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function ensurePersonalWorkspace(userId: string, email?: string, fullName?: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const adminClient = await createAdminClient()

  // 1. Ensure profile exists
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, full_name, subscription_tier')
    .eq('id', userId)
    .single()

  if (!profile) {
    const displayName = fullName || email?.split('@')[0] || 'User'
    await adminClient.from('profiles').upsert({
      id: userId,
      full_name: displayName,
      subscription_tier: 'free',
    }, { onConflict: 'id' })
  }

  // 2. Check if user already owns 'My Workspace'
  const { data: existingWs } = await adminClient
    .from('workspaces')
    .select('id, name, tier, created_at')
    .eq('owner_id', userId)
    .eq('name', 'My Workspace')
    .limit(1)

  let personalWsId = existingWs && existingWs.length > 0 ? existingWs[0].id : null

  if (!personalWsId) {
    personalWsId = crypto.randomUUID()
    const { error: wsError } = await adminClient
      .from('workspaces')
      .insert({
        id: personalWsId,
        name: 'My Workspace',
        owner_id: userId,
        tier: profile?.subscription_tier || 'free',
      })

    if (wsError) {
      console.error('Error auto-creating personal workspace:', wsError)
      return null
    }

    // Assign owner membership
    await adminClient
      .from('workspace_members')
      .upsert({
        workspace_id: personalWsId,
        user_id: userId,
        role: 'owner',
      }, { onConflict: 'workspace_id,user_id' })

    // Add default kanban columns for Personal Space
    const defaultCols = [
      { workspace_id: personalWsId, user_id: userId, title: 'Backlog', order_index: 0 },
      { workspace_id: personalWsId, user_id: userId, title: 'To Do', order_index: 1 },
      { workspace_id: personalWsId, user_id: userId, title: 'In Progress', order_index: 2 },
      { workspace_id: personalWsId, user_id: userId, title: 'Completed', order_index: 3 },
    ]
    await adminClient.from('kanban_columns').insert(defaultCols)
  } else {
    // Ensure membership exists for existing personal workspace
    await adminClient
      .from('workspace_members')
      .upsert({
        workspace_id: personalWsId,
        user_id: userId,
        role: 'owner',
      }, { onConflict: 'workspace_id,user_id' })
  }

  return personalWsId
}

export async function fetchWorkspaces() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Join workspace_members and workspaces using admin client to bypass broken RLS recursion
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Server configuration error' }
  }
  const adminClient = await createAdminClient()

  // Ensure personal workspace exists for this user
  await ensurePersonalWorkspace(user.id, user.email, user.user_metadata?.full_name)

  const { data, error } = await adminClient
    .from('workspace_members')
    .select(`
      role,
      workspaces (
        id,
        name,
        tier,
        created_at
      )
    `)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching workspaces:', error)
    return { error: 'Failed to fetch workspaces' }
  }

  const workspaces = (data || [])
    .filter(item => item.workspaces)
    .map(item => ({
      // @ts-expect-error: Joined column type not inferred
      id: item.workspaces.id,
      // @ts-expect-error: Joined column type not inferred
      name: item.workspaces.name,
      // @ts-expect-error: Joined column type not inferred
      tier: item.workspaces.tier || 'free',
      // @ts-expect-error: Joined column type not inferred
      created_at: item.workspaces.created_at,
      role: item.role
    }))
    .sort((a, b) => {
      if (a.name === 'My Workspace' && a.role === 'owner') return -1
      if (b.name === 'My Workspace' && b.role === 'owner') return 1
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  return { workspaces }
}

export async function createWorkspace(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const newWorkspaceId = crypto.randomUUID()

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing in your .env.local file. Please add it and restart the server.' }
  }

  const adminClient = await createAdminClient()

  // 0. Check Tier limits (Free: max 2, Pro: max 5, Agency/Enterprise: unlimited)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const userTier = profile?.subscription_tier || 'free'

  if (userTier === 'free' || userTier === 'pro') {
    const maxAllowed = userTier === 'free' ? 2 : 5
    // Exclude Personal Space ('My Workspace') so users get their full team workspace quota
    const { count: ownedCount } = await adminClient
      .from('workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .neq('name', 'My Workspace')

    if ((ownedCount || 0) >= maxAllowed) {
      if (userTier === 'free') {
        return {
          error: 'You have reached the 2 team-workspace limit on the Free tier. Please upgrade to SprintDesk Pro to create up to 5 team workspaces.',
        }
      } else {
        return {
          error: 'You have reached the 5 team-workspace limit on SprintDesk Pro. Please upgrade to SprintDesk Agency for unlimited workspaces.',
        }
      }
    }
  }

  // 1. Insert Workspace (Use admin client to bypass RLS)
  const { error: wsError } = await adminClient
    .from('workspaces')
    .insert({ id: newWorkspaceId, name, owner_id: user.id, tier: userTier })

  if (wsError) {
    console.error('Error creating workspace:', wsError)
    return { error: 'Failed to create workspace' }
  }

  // 2. Insert Member (Use admin client to bypass RLS, as the user isn't a member yet)
  const { error: memberError } = await adminClient
    .from('workspace_members')
    .insert({
      workspace_id: newWorkspaceId,
      user_id: user.id,
      role: 'owner'
    })

  if (memberError) {
    console.error('Error assigning member:', memberError)
    // Cleanup workspace if member assignment fails
    await adminClient.from('workspaces').delete().eq('id', newWorkspaceId)
    return { error: 'Failed to assign workspace membership' }
  }

  return { success: true, workspaceId: newWorkspaceId }
}

export async function setActiveWorkspaceCookie(workspaceId: string) {
  const cookieStore = await cookies()
  cookieStore.set('activeWorkspaceId', workspaceId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })
  revalidatePath('/', 'layout')
}

export async function getActiveWorkspaceCookie() {
  const cookieStore = await cookies()
  return cookieStore.get('activeWorkspaceId')?.value || null
}

export async function deleteWorkspace(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Use admin client to bypass RLS issues on workspace_members
  const adminClient = await createAdminClient()
  
  const { data: member } = await adminClient
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return { error: 'Unauthorized to delete workspace' }
  }

  const { error } = await adminClient
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)

  if (error) {
    console.error('Error deleting workspace:', error)
    return { error: 'Failed to delete workspace' }
  }

  // Clear cookie if deleted workspace was active
  const activeId = await getActiveWorkspaceCookie()
  if (activeId === workspaceId) {
    const cookieStore = await cookies()
    cookieStore.delete('activeWorkspaceId')
  }

  return { success: true }
}
