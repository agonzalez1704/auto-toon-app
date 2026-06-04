/**
 * Apple In-App Purchase product catalog (iOS only).
 *
 * Mirror of `lib/iap/apple-products.ts` on the backend. Product IDs must
 * match what's configured in App Store Connect for `com.autotoon.app`.
 *
 * On Android / web these IDs are unused (Stripe stays the source of truth
 * for non-iOS purchase flows).
 */

export interface AppleCreditPack {
  productId: string
  /** Maps back to web `packageId` so we can reuse copy/icons in shared UI. */
  packageId: 'micro' | 'small' | 'medium' | 'large'
  credits: number
  priceUsdLabel: string
}

export const APPLE_CREDIT_PACKS: readonly AppleCreditPack[] = [
  { productId: 'com.autotoon.credits.micro',  packageId: 'micro',  credits: 30,  priceUsdLabel: '$5.99'  },
  { productId: 'com.autotoon.credits.small',  packageId: 'small',  credits: 100, priceUsdLabel: '$19.99' },
  { productId: 'com.autotoon.credits.medium', packageId: 'medium', credits: 200, priceUsdLabel: '$34.99' },
  { productId: 'com.autotoon.credits.large',  packageId: 'large',  credits: 400, priceUsdLabel: '$59.99' },
] as const

export const APPLE_CREDIT_SKUS = APPLE_CREDIT_PACKS.map(p => p.productId)

export function getAppleCreditPack(productId: string): AppleCreditPack | undefined {
  return APPLE_CREDIT_PACKS.find(p => p.productId === productId)
}

export function getAppleCreditPackByPackageId(
  packageId: AppleCreditPack['packageId'],
): AppleCreditPack | undefined {
  return APPLE_CREDIT_PACKS.find(p => p.packageId === packageId)
}
