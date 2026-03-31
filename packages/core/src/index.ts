export { createSupabaseClient } from './lib/supabase'
export type { CreateSupabaseClientOptions } from './lib/supabase'
export {
  getSupabaseClient,
  setSupabaseClient,
  getAuthRedirectUrl,
  setAuthRedirectUrl,
} from './lib/supabaseClient'
export { getStorageAdapter, setStorageAdapter } from './lib/storageClient'
export { getRecentRecipes, searchRecipes, suggestRecipes } from './lib/recipes'
export * as recipeMatching from './lib/recipeMatching'

export type { StorageAdapter } from './platform/storage'
export { createWebStorage } from './platform/webStorage'
export { createNativeStorage } from './platform/nativeStorage'

export * as store from './store'
export * as types from './types'
