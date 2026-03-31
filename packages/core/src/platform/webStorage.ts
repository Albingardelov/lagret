import type { StorageAdapter } from './storage'

export function createWebStorage(): StorageAdapter {
  return {
    async getItem(key) {
      try {
        return globalThis.localStorage.getItem(key)
      } catch {
        return null
      }
    },
    async setItem(key, value) {
      globalThis.localStorage.setItem(key, value)
    },
    async removeItem(key) {
      globalThis.localStorage.removeItem(key)
    },
  }
}
