import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface OnboardingState {
  completed: boolean
  setCompleted: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      setCompleted: () => set({ completed: true }),
    }),
    {
      name: 'onboarding-completed',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
