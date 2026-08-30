'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function fetchAutomations() {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value
    if (!activeWorkspaceId) return { automations: [] }

    const { data, error } = await supabase.from('automations').select('*').eq('workspace_id', activeWorkspaceId)
    if (error) return { error: error.message }
    return { automations: data }
  } catch (err) {
    return { error: 'Failed' }
  }
}

export async function addAutomation(rule: any) {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value
    if (!activeWorkspaceId) return { error: 'No workspace' }

    const { data, error } = await supabase.from('automations').insert({
      workspace_id: activeWorkspaceId,
      trigger_type: rule.trigger_type,
      trigger_value: rule.trigger_value,
      action_type: rule.action_type,
      action_value: rule.action_value,
      is_active: rule.is_active
    }).select().single()
    
    if (error) return { error: error.message }
    return { automation: data }
  } catch (err) { return { error: 'Failed' } }
}

export async function deleteAutomation(id: string) {
  try {
    const supabase = await createClient()
    await supabase.from('automations').delete().eq('id', id)
    return { success: true }
  } catch (err) { return { error: 'Failed' } }
}

export async function toggleAutomation(id: string, is_active: boolean) {
  try {
    const supabase = await createClient()
    await supabase.from('automations').update({ is_active }).eq('id', id)
    return { success: true }
  } catch (err) { return { error: 'Failed' } }
}
