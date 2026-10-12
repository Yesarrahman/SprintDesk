'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ensurePersonalWorkspace } from './workspace'
import type { Profile } from '@/types'

export async function getCurrentUserProfile(): Promise<{ profile: Profile | null; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { profile: null, error: 'Unauthorized' }

    const adminClient = await createAdminClient()
    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching current user profile with admin client:', error)
    }

    if (!profile) {
      await ensurePersonalWorkspace(user.id, user.email, user.user_metadata?.full_name)
      const { data: createdProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      return { profile: (createdProfile as Profile) || null }
    }

    return { profile: (profile as Profile) || null }
  } catch (err: any) {
    console.error('Unexpected error in getCurrentUserProfile:', err)
    return { profile: null, error: err?.message || 'Failed to fetch profile' }
  }
}
