'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const fullName = formData.get('full_name') as string
  if (!fullName?.trim()) return { error: 'Full name is required' }

  const trimmedName = fullName.trim()

  // 1. Update Auth metadata so Supabase email templates can access {{ .Data.full_name }}
  await supabase.auth.updateUser({
    data: { full_name: trimmedName },
  })

  // 2. Update profiles table
  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ full_name: trimmedName })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) return { error: 'No file provided' }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Only JPEG, PNG, WebP, or GIF images are allowed' }
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: 'Image must be smaller than 2MB' }
  }

  const fileExt = file.name.split('.').pop()
  const filePath = `${user.id}/avatar.${fileExt}`

  const adminClient = await createAdminClient()
  const { error: uploadError } = await adminClient.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = adminClient.storage
    .from('avatars')
    .getPublicUrl(filePath)

  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true, avatarUrl }
}