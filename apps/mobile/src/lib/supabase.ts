import {
  createSupabaseClient,
  setStorageAdapter,
  setSupabaseClient,
  type StorageAdapter,
} from '@lagret/core'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Expo env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createSupabaseClient({ url, anonKey })

setSupabaseClient(supabase)

const memoryStorage = (): StorageAdapter => {
  const map = new Map<string, string>()
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value)
    },
    removeItem: async (key) => {
      map.delete(key)
    },
  }
}

setStorageAdapter(memoryStorage())
