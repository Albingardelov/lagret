import type { SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null
let authRedirectUrl: string | undefined

export function setSupabaseClient(client: SupabaseClient) {
  supabase = client
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase client not initialized. Call setSupabaseClient() in your app bootstrap.'
    )
  }
  return supabase
}

export function setAuthRedirectUrl(url: string | undefined) {
  authRedirectUrl = url
}

export function getAuthRedirectUrl() {
  return authRedirectUrl
}
