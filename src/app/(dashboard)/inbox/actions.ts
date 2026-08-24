'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getInboxItems() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { items: [] }

  const { data: items, error } = await supabase
    .from('inbox_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching inbox items:', error)
    return { items: [] }
  }

  return { items }
}

export async function addInboxItem(content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('inbox_items')
    .insert([{ user_id: user.id, content }])

  if (error) return { error: error.message }
  
  revalidatePath('/inbox')
  return { success: true }
}

export async function deleteInboxItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('inbox_items').delete().eq('id', id)
  
  if (error) return { error: error.message }
  
  revalidatePath('/inbox')
  return { success: true }
}

export async function triageInboxItem(
  inboxItemId: string,
  workspaceId: string,
  title: string,
  status: string,
  priority: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Create the task in the target workspace
  const { error: taskError } = await supabase
    .from('tasks')
    .insert([
      {
        workspace_id: workspaceId,
        title,
        status,
        priority,
        created_by: user.id,
        assigned_to: user.id // Default assign to self
      }
    ])

  if (taskError) {
    console.error('Error creating task from inbox triage:', taskError)
    return { error: taskError.message }
  }

  // 2. Delete the inbox item
  const { error: deleteError } = await supabase
    .from('inbox_items')
    .delete()
    .eq('id', inboxItemId)

  if (deleteError) {
    console.error('Error deleting inbox item after triage:', deleteError)
    // We created the task, but failed to delete the inbox item, return warning
    return { success: true, warning: 'Task created, but failed to remove from inbox' }
  }

  revalidatePath('/inbox')
  revalidatePath('/kanban')
  revalidatePath('/dashboard')
  return { success: true }
}

