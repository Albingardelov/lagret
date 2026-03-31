import type { StorageAdapter } from './storage.ts'

const NATIVE_STORAGE_ERROR =
  'Native persistence is not wired in @lagret/core yet. Add @react-native-async-storage/async-storage to the mobile app and implement StorageAdapter (e.g. wrap getItem/setItem/removeItem with AsyncStorage), or use a small app-local helper until core exports a concrete native implementation.'

function notAvailable(): Promise<never> {
  return Promise.reject(new Error(NATIVE_STORAGE_ERROR))
}

/**
 * Placeholder for React Native. Does not bundle AsyncStorage; every method rejects until you provide a real adapter in the app.
 */
export function createNativeStorage(): StorageAdapter {
  return {
    getItem: () => notAvailable(),
    setItem: () => notAvailable(),
    removeItem: () => notAvailable(),
  }
}
