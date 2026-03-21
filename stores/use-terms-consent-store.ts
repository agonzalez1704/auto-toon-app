import { create } from 'zustand'
import { acceptTerms as acceptTermsApi } from '@/lib/api'
import { useSubscriptionStore } from './use-subscription-store'

interface TermsConsentState {
  showConsentModal: boolean
  pendingAction: (() => void) | null
  setShowConsentModal: (show: boolean) => void
  acceptTerms: () => Promise<void>
  /** Guard: if terms not accepted, show modal and queue the action */
  requireConsent: (action: () => void) => boolean
}

export const useTermsConsentStore = create<TermsConsentState>()((set, get) => ({
  showConsentModal: false,
  pendingAction: null,

  setShowConsentModal: (show) => set({ showConsentModal: show }),

  acceptTerms: async () => {
    await acceptTermsApi()
    useSubscriptionStore.setState({ termsAccepted: true })
    set({ showConsentModal: false })
    // Execute pending action if any
    const action = get().pendingAction
    if (action) {
      set({ pendingAction: null })
      action()
    }
  },

  requireConsent: (action) => {
    const { termsAccepted } = useSubscriptionStore.getState()
    if (termsAccepted) return true
    set({ pendingAction: action, showConsentModal: true })
    return false
  },
}))
