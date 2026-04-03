import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface NotificationState {
  pushToken: string | null
  permissionGranted: boolean
  hasPrompted: boolean

  setPushToken: (token: string | null) => void
  setPermissionGranted: (granted: boolean) => void
  setHasPrompted: () => void
}

export const useNotificationsStore = create<NotificationState>()(
  persist(
    (set) => ({
      pushToken: null,
      permissionGranted: false,
      hasPrompted: false,

      setPushToken: (token) => set({ pushToken: token }),
      setPermissionGranted: (granted) => set({ permissionGranted: granted }),
      setHasPrompted: () => set({ hasPrompted: true }),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
