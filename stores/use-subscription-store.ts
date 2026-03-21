import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSubscription } from '@/lib/api'

interface SubscriptionState {
  plan: string
  hasFetched: boolean
  termsAccepted: boolean
  fetchSubscription: () => Promise<void>
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      plan: 'FREE',
      hasFetched: false,
      termsAccepted: false,

      fetchSubscription: async () => {
        if (get().hasFetched) return
        try {
          const data = await getSubscription()
          set({
            plan: data.plan || 'FREE',
            termsAccepted: data.termsAccepted ?? false,
            hasFetched: true,
          })
        } catch {
          // Keep cached values
        }
      },
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        plan: state.plan,
        termsAccepted: state.termsAccepted,
      }),
    }
  )
)
