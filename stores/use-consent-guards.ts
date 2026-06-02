import { useTermsConsentStore } from './use-terms-consent-store'
import { useAIConsentStore } from './use-ai-consent-store'

/**
 * Composite consent guard — requires BOTH Terms of Service AND AI processing
 * consent before running `action`. Mirrors `requireConsent(action)` semantics:
 *
 *   • Returns `true` when both consents already granted (action runs immediately).
 *   • Returns `false` when at least one consent is missing — the relevant modal
 *     opens and the action is queued behind it. After the user accepts, the
 *     remaining check runs; once everything is accepted, the original action
 *     fires automatically.
 *
 * Use this at every generation entry point that ships data to third-party AI
 * (Apple App Store guidelines 5.1.1(i) / 5.1.2(i)).
 */
export function requireAllConsents(action: () => void): boolean {
  const aiGate = () => {
    if (useAIConsentStore.getState().requireConsent(action)) action()
  }
  if (!useTermsConsentStore.getState().requireConsent(aiGate)) return false
  // Terms already accepted — run the AI gate now.
  aiGate()
  return true
}
