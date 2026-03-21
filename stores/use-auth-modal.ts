import { create } from 'zustand'

interface AuthModalState {
  isOpen: boolean
  pendingAction: (() => void) | null
  openAuthModal: (action?: () => void) => void
  closeAuthModal: () => void
  executePendingAction: () => void
}

export const useAuthModal = create<AuthModalState>()((set, get) => ({
  isOpen: false,
  pendingAction: null,

  openAuthModal: (action) =>
    set({ isOpen: true, pendingAction: action ?? null }),

  closeAuthModal: () =>
    set({ isOpen: false, pendingAction: null }),

  executePendingAction: () => {
    const action = get().pendingAction
    if (action) {
      set({ isOpen: false, pendingAction: null })
      action()
    }
  },
}))
