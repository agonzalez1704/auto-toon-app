import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { acceptAIConsent, checkAIConsent, revokeAIConsent } from '@/lib/api'

/**
 * Apple App Store guideline 5.1.1(i) / 5.1.2(i).
 *
 * The user must consent BEFORE any image is shipped to a third-party AI
 * provider (OpenAI, Google Gemini, Replicate, ByteDance Seedance, Kling).
 * Mirrors `useTermsConsentStore` shape: requireConsent() gates an action and
 * queues it; the modal pops; on accept, the queued action runs.
 */

interface AIConsentState {
  /** Last-known consent state from server. `null` = unknown (not yet checked). */
  accepted: boolean | null
  /** Whether the modal is open. */
  showConsentModal: boolean
  /** Pending action queued behind the modal. */
  pendingAction: (() => void) | null

  setShowConsentModal: (show: boolean) => void
  hydrateFromServer: () => Promise<void>
  acceptConsent: () => Promise<void>
  revoke: () => Promise<void>

  /** Guard: if not accepted, show modal + queue action. Returns true when consent already granted. */
  requireConsent: (action: () => void) => boolean
}

export const useAIConsentStore = create<AIConsentState>()(
  persist(
    (set, get) => ({
      accepted: null,
      showConsentModal: false,
      pendingAction: null,

      setShowConsentModal: (show) => set({ showConsentModal: show }),

      hydrateFromServer: async () => {
        try {
          const { accepted } = await checkAIConsent()
          set({ accepted })
        } catch {
          // network / auth — leave as-is.
        }
      },

      acceptConsent: async () => {
        await acceptAIConsent()
        set({ accepted: true, showConsentModal: false })
        const action = get().pendingAction
        if (action) {
          set({ pendingAction: null })
          action()
        }
      },

      revoke: async () => {
        await revokeAIConsent()
        set({ accepted: false })
      },

      requireConsent: (action) => {
        if (get().accepted === true) return true
        set({ pendingAction: action, showConsentModal: true })
        return false
      },
    }),
    {
      name: 'ai-consent-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (s) => ({ accepted: s.accepted }),
    }
  )
)
