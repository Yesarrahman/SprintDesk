'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function fetchWorkspaces() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Join workspace_members and workspaces using admin client to bypass broken RLS recursion
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Server configuration error' }
  }
  const adminClient = await createAdminClient()

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

  const workspaces = data.map(item => ({
    // @ts-expect-error: Joined column type not inferred
    id: item.workspaces.id,
    // @ts-expect-error: Joined column type not inferred
    name: item.workspaces.name,
    // @ts-expect-error: Joined column type not inferred
    tier: item.workspaces.tier || 'free',
    // @ts-expect-error: Joined column type not inferred
    created_at: item.workspaces.created_at,
    role: item.role
  })).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

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
    const { count: ownedCount } = await adminClient
      .from('workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    if ((ownedCount || 0) >= maxAllowed) {
      if (userTier === 'free') {
        return {
          error: 'You have reached the 2-workspace limit on the Free tier. Please upgrade to SprintDesk Pro to create up to 5 workspaces.',
        }
      } else {
        return {
          error: 'You have reached the 5-workspace limit on SprintDesk Pro. Please upgrade to SprintDesk Agency for unlimited workspaces.',
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
