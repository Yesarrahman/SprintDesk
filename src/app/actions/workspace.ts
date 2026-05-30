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

  // 1. Insert Workspace
  const { error: wsError } = await supabase
    .from('workspaces')
    .insert({ id: newWorkspaceId, name, owner_id: user.id })

  if (wsError) {
    console.error('Error creating workspace:', wsError)
    return { error: 'Failed to create workspace' }
  }

  // 2. Insert Member (Use admin client to bypass RLS, as the user isn't a member yet)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing in your .env.local file. Please add it and restart the server.' }
  }

  const adminClient = await createAdminClient()
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
