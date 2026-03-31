import AsyncStorage from '@react-native-async-storage/async-storage'
import type { StorageAdapter } from '@lagret/core'

export function createAsyncStorageAdapter(): StorageAdapter {
  return {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  }
}
