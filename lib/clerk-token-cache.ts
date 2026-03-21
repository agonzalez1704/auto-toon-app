import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/** Clerk token cache backed by SecureStore (native) or memory (web) */
const memoryCache = new Map<string, string>()

export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return memoryCache.get(key) ?? null
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      memoryCache.set(key, value)
      return
    }
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      // SecureStore can fail on some devices
    }
  },
  async clearToken(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      memoryCache.delete(key)
      return
    }
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {
      // Ignore
    }
  },
}
