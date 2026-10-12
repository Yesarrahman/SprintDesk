'use client'

import { createContext, useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserProfile } from '@/app/actions/profile'
import type { Profile } from '@/types'
import type { User } from '@supabase/supabase-js'

export interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const refreshProfile = useCallback(async () => {
    try {
      const res = await getCurrentUserProfile()
      if (res?.profile) {
        setProfile(res.profile)
      }
    } catch (err) {
      console.error('Error refreshing profile:', err)
    }
  }, [])

  const fetchProfile = useCallback(
    async (userId: string) => {
      // First try secure server action which uses admin client (bypasses RLS recursion)
      const res = await getCurrentUserProfile()
      if (res?.profile) {
        setProfile(res.profile)
        return
      }

      // Fallback to direct client query if server action did not return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      setProfile(data as Profile | null)
    },
    [supabase]
  )

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      setUser(currentUser)
      if (currentUser) {
        await fetchProfile(currentUser.id)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
