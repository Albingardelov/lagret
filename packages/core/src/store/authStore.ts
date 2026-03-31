import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { getAuthRedirectUrl, getSupabaseClient } from '../lib/supabaseClient.ts'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialize: () => () => void
  signInWithEmail: (email: string) => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: () => {
    const supabase = getSupabaseClient()

    supabase.auth
      .getSession()
      .then(({ data }) => {
        set({ user: data.session?.user ?? null, session: data.session ?? null, loading: false })
      })
      .catch(() => {
        set({ user: null, session: null, loading: false })
      })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session, loading: false })
    })

    return () => data.subscription.unsubscribe()
  },

  signInWithEmail: async (email) => {
    const supabase = getSupabaseClient()
    const redirectTo = getAuthRedirectUrl()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    })
    if (error) throw error
  },

  signInWithPassword: async (email, password) => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    set({ user: data.user, session: data.session, loading: false })
  },

  signUpWithPassword: async (email, password) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  },

  signInWithGoogle: async () => {
    const supabase = getSupabaseClient()
    const redirectTo = getAuthRedirectUrl()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: redirectTo ? { redirectTo } : undefined,
    })
    if (error) throw error
  },

  signOut: async () => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    set({ user: null, session: null })
  },
}))
