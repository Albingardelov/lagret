import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type CreateSupabaseClientOptions = {
  url: string
  anonKey: string
}

export function createSupabaseClient(options: CreateSupabaseClientOptions): SupabaseClient {
  const { url, anonKey } = options
  return createClient(url, anonKey)
}
