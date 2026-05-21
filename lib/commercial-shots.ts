/**
 * Commercial shot catalog — mirrors the web app's
 * lib/creative-director/commercial-shots.ts (labels only; the backend builds
 * the actual motion prompts). The style persona drives the shot vocabulary.
 */

export type CommercialPersona = 'fashion-editorial' | 'surreal-product-hero' | 'ugc' | 'custom'

export interface PersonaOption {
  id: CommercialPersona
  label: string
  blurb: string
}

export const PERSONA_OPTIONS: PersonaOption[] = [
  { id: 'fashion-editorial', label: 'Editorial', blurb: 'Magazine-grade, elegant, premium' },
  { id: 'surreal-product-hero', label: 'Product Hero', blurb: 'Product-first, bold, showcase' },
  { id: 'ugc', label: 'UGC', blurb: 'Authentic, handheld, smartphone feel' },
  { id: 'custom', label: 'Custom', blurb: 'Write your own direction' },
]

export interface CommercialShot {
  id: string
  label: string
}

export const COMMERCIAL_SHOTS: Record<CommercialPersona, CommercialShot[]> = {
  'fashion-editorial': [
    { id: 'hero-reveal', label: 'Hero reveal' },
    { id: 'slow-orbit', label: 'Slow orbit' },
    { id: 'detail-push', label: 'Detail push-in' },
    { id: 'fabric-motion', label: 'Motion accent' },
  ],
  'surreal-product-hero': [
    { id: 'turntable-360', label: '360 turntable' },
    { id: 'levitation', label: 'Levitation' },
    { id: 'light-sweep', label: 'Light sweep' },
    { id: 'dramatic-reveal', label: 'Dramatic reveal' },
  ],
  ugc: [
    { id: 'unboxing', label: 'Unboxing' },
    { id: 'try-on', label: 'Try-on / in-use' },
    { id: 'talking-head', label: 'Talking-head' },
    { id: 'grab-and-show', label: 'Grab & show' },
  ],
  custom: [{ id: 'custom', label: 'Custom direction' }],
}

export function getCommercialShots(persona: CommercialPersona): CommercialShot[] {
  return COMMERCIAL_SHOTS[persona] ?? COMMERCIAL_SHOTS.custom
}
