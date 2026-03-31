import { createSupabaseClient, setStorageAdapter, setSupabaseClient } from '@lagret/core'
import { createAsyncStorageAdapter } from './storage'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Expo env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createSupabaseClient({ url, anonKey })

setSupabaseClient(supabase)
setStorageAdapter(createAsyncStorageAdapter())
