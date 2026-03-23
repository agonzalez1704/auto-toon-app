import { create } from 'zustand'

interface SignUpStore {
  justSignedUp: boolean
  setJustSignedUp: (v: boolean) => void
}

export const useSignUpStore = create<SignUpStore>((set) => ({
  justSignedUp: false,
  setJustSignedUp: (v) => set({ justSignedUp: v }),
}))
