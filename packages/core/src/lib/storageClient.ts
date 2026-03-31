import type { StorageAdapter } from '../platform/storage.ts'

let storage: StorageAdapter | null = null

export function setStorageAdapter(adapter: StorageAdapter) {
  storage = adapter
}

export function getStorageAdapter(): StorageAdapter {
  if (!storage) {
    throw new Error(
      'Storage adapter not initialized. Call setStorageAdapter() in your app bootstrap.'
    )
  }
  return storage
}
