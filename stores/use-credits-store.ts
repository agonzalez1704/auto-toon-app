import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getCreditsBalance } from '@/lib/api'

interface CreditsState {
  balance: number | null
  showExhaustionModal: boolean
  fetchCredits: () => Promise<void>
  setCredits: (balance: number) => void
  setShowExhaustionModal: (show: boolean) => void
}

export const useCreditsStore = create<CreditsState>()(
  persist(
    (set) => ({
      balance: null,
      showExhaustionModal: false,

      fetchCredits: async () => {
        try {
          const { balance } = await getCreditsBalance()
          set({ balance })
        } catch {
          // Silently fail — cached balance still shown
        }
      },

      setCredits: (balance) => set({ balance }),

      setShowExhaustionModal: (show) => set({ showExhaustionModal: show }),
    }),
    {
      name: 'credits-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ balance: state.balance }),
    }
  )
)
