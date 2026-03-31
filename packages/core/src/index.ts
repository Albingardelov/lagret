export { createSupabaseClient } from './lib/supabase.ts'
export type { CreateSupabaseClientOptions } from './lib/supabase.ts'
export {
  getSupabaseClient,
  setSupabaseClient,
  getAuthRedirectUrl,
  setAuthRedirectUrl,
} from './lib/supabaseClient.ts'

export type { StorageAdapter } from './platform/storage.ts'
export { createWebStorage } from './platform/webStorage.ts'
export { createNativeStorage } from './platform/nativeStorage.ts'

export * as store from './store/index.ts'
export * as types from './types/index.ts'
