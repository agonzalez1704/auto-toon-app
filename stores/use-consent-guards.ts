import { useTermsConsentStore } from './use-terms-consent-store'
import { useAIConsentStore } from './use-ai-consent-store'
import { useSubscriptionStore } from './use-subscription-store'

/**
 * Composite consent guard — Terms + AI consent. Mirrors
 * `requireConsent(action)` semantics:
 *
 *   • Returns `true` when both consents already granted. The caller is
 *     responsible for continuing execution — this guard does NOT invoke
 *     `action` in that case (avoids double-firing / re-entrant recursion
 *     when the caller itself goes through `requireAllConsents`).
 *   • Returns `false` when at least one consent is missing — the relevant
 *     modal opens and `action` is queued behind it. After accept, the next
 *     gate runs; once both are accepted, `action` fires automatically.
 *
 * Use at every generation entry point that ships data to third-party AI
 * (Apple App Store guidelines 5.1.1(i) / 5.1.2(i)).
 */
export function requireAllConsents(action: () => void): boolean {
  const termsAccepted = !!useSubscriptionStore.getState().termsAccepted
  const aiAccepted = useAIConsentStore.getState().accepted === true

  // Fast path — both granted. Caller proceeds. Do NOT call action here.
  if (termsAccepted && aiAccepted) return true

  // Terms missing → queue `aiGate` continuation behind the terms modal.
  if (!termsAccepted) {
    const aiGate = () => {
      if (useAIConsentStore.getState().requireConsent(action)) action()
    }
    useTermsConsentStore.getState().requireConsent(aiGate)
    return false
  }

  // Terms accepted, AI missing → queue action behind the AI modal.
  useAIConsentStore.getState().requireConsent(action)
  return false
}
