'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ensurePersonalWorkspace } from '@/app/actions/workspace'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  if (authData?.user) {
    await ensurePersonalWorkspace(
      authData.user.id,
      authData.user.email,
      authData.user.user_metadata?.full_name
    )
  }

  const plan = formData.get('plan') as string | null
  const validPlans = ['pro', 'agency']

  revalidatePath('/', 'layout')

  if (plan && validPlans.includes(plan)) {
    redirect(`/billing?plan=${plan}`)
  }

  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = (formData.get('fullName') as string)?.trim()

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  // Dynamically resolve app origin
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const origin = `${proto}://${host}`

  const adminClient = await createAdminClient()

  // 1. Check if user already exists as an invited member
  const { data: usersData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existingUser = usersData?.users?.find(u => u.email?.toLowerCase() === email)

  if (existingUser) {
    // Member was already invited: set their chosen password, confirm email, and update metadata
    const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || existingUser.user_metadata?.full_name || email.split('@')[0],
      },
    })

    if (updateError) {
      console.error('Error activating invited user:', updateError)
      return { error: updateError.message }
    }

    // Sign in immediately with their new credentials
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      console.error('Error signing in activated user:', signInError)
      return { error: signInError.message }
    }

    // Auto-create Personal Space
    await ensurePersonalWorkspace(existingUser.id, email, fullName)

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  // 2. Fresh new user signup
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (authData.session && authData.user) {
    await ensurePersonalWorkspace(authData.user.id, email, fullName)
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  if (!authData.session) {
    if (authData.user) {
      await ensurePersonalWorkspace(authData.user.id, email, fullName)
    }
    return { success: 'Please check your email and confirm your email.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  if (!email?.trim()) {
    return { error: 'Please enter your email address' }
  }

  // Dynamically resolve app origin so this works on both localhost and live deployment
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const origin = `${proto}://${host}`

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Check your email for a password reset link.' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
