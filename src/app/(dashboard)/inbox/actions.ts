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
