/**
 * Apple IAP hook for buying credit packs on iOS.
 *
 * Apple guideline 3.1.1 — credits are digital content that must be sold via
 * In-App Purchase on iOS. This hook wraps `expo-iap`'s `useIAP` with our
 * server-side verification step and exposes the simplest possible surface
 * for the purchase UI screens.
 *
 * On non-iOS platforms `purchase()` throws and `ready` stays false — callers
 * should fall back to the Stripe checkout flow.
 *
 * Lifecycle:
 *   1. mount → initConnection (handled by useIAP) → fetchProducts
 *   2. user taps Buy → purchase(packageId)
 *      → expo-iap calls Apple, returns Purchase via onPurchaseSuccess
 *   3. onPurchaseSuccess → POST /api/iap/apple/verify (server validates JWS)
 *   4. server grants credits → finishTransaction marks the purchase consumed
 *   5. onSuccess(balance) fires with the new balance
 *
 * If server verification fails we DO NOT call finishTransaction; StoreKit
 * will retry the purchase on next connect so the user doesn't lose credits.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import { useIAP, type Product, type Purchase } from 'expo-iap'
import {
  APPLE_CREDIT_PACKS,
  APPLE_CREDIT_SKUS,
  getAppleCreditPack,
  getAppleCreditPackByPackageId,
  type AppleCreditPack,
} from './iap-apple'
import { verifyAppleIAP } from './api'

export interface UseAppleCreditPurchaseOptions {
  onSuccess?: (result: { balance: number; pack: AppleCreditPack }) => void
  onError?: (message: string) => void
}

export interface UseAppleCreditPurchaseApi {
  /** True once IAP is connected AND products have been fetched. iOS-only. */
  ready: boolean
  /** Apple-side product details (price, localized title, etc.) keyed by productId. */
  products: Record<string, Product>
  /** True while a purchase + verify roundtrip is in flight. */
  isPurchasing: boolean
  /** Trigger a purchase by packageId (micro|small|medium|large). */
  purchase: (packageId: AppleCreditPack['packageId']) => Promise<void>
  /** Re-attempt to load products if the initial fetch failed. */
  retryFetch: () => Promise<void>
}

const isIos = Platform.OS === 'ios'

export function useAppleCreditPurchase(
  options: UseAppleCreditPurchaseOptions = {},
): UseAppleCreditPurchaseApi {
  const [productsByid, setProductsById] = useState<Record<string, Product>>({})
  const [isPurchasing, setIsPurchasing] = useState(false)
  // Latest options without re-triggering useIAP listeners.
  const optionsRef = useRef(options)
  optionsRef.current = options

  const handlePurchaseSuccess = useCallback(
    async (purchase: Purchase) => {
      const pack = getAppleCreditPack(purchase.productId)
      if (!pack) {
        optionsRef.current.onError?.(
          `Unknown product: ${purchase.productId}. Refusing to verify.`,
        )
        return
      }

      const transactionId = purchase.transactionId ?? purchase.id
      if (!transactionId) {
        optionsRef.current.onError?.('Apple returned no transactionId; cannot verify.')
        return
      }

      try {
        const result = await verifyAppleIAP({
          transactionId,
          productId: purchase.productId,
        })
        // Only finish AFTER successful server credit grant. If the network
        // fails between the user's purchase and our verify call, StoreKit
        // replays the purchase on the next connect — the server is idempotent
        // on transactionId so this is safe.
        await finishTransactionRef.current?.({
          purchase,
          isConsumable: true,
        })
        optionsRef.current.onSuccess?.({ balance: result.balance, pack })
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Apple verification failed'
        optionsRef.current.onError?.(message)
      } finally {
        setIsPurchasing(false)
      }
    },
    [],
  )

  const handlePurchaseError = useCallback((error: { message?: string; code?: string }) => {
    setIsPurchasing(false)
    // User-cancelled isn't an error worth surfacing — keep parity with Stripe.
    if (error.code === 'E_USER_CANCELLED' || /cancel/i.test(error.message ?? '')) {
      return
    }
    optionsRef.current.onError?.(error.message ?? 'Purchase failed')
  }, [])

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: handlePurchaseSuccess,
    onPurchaseError: handlePurchaseError,
  })

  // Capture finishTransaction in a ref so handlePurchaseSuccess can call it
  // without recreating itself on every render.
  const finishTransactionRef = useRef(finishTransaction)
  finishTransactionRef.current = finishTransaction

  const doFetch = useCallback(async () => {
    if (!isIos) return
    if (!connected) return
    try {
      await fetchProducts({ skus: [...APPLE_CREDIT_SKUS], type: 'in-app' })
    } catch (err) {
      console.warn('[iap] fetchProducts failed:', err)
    }
  }, [connected, fetchProducts])

  useEffect(() => {
    doFetch()
  }, [doFetch])

  useEffect(() => {
    if (!products || products.length === 0) return
    const next: Record<string, Product> = {}
    for (const p of products) next[p.id] = p
    setProductsById(next)
  }, [products])

  const purchase = useCallback(
    async (packageId: AppleCreditPack['packageId']) => {
      if (!isIos) {
        throw new Error('Apple IAP is iOS-only. Use the Stripe checkout flow.')
      }
      const pack = getAppleCreditPackByPackageId(packageId)
      if (!pack) throw new Error(`Unknown package: ${packageId}`)
      if (!connected) {
        optionsRef.current.onError?.('Store not connected yet — try again in a moment.')
        return
      }
      setIsPurchasing(true)
      try {
        await requestPurchase({
          request: {
            ios: { sku: pack.productId },
          },
          type: 'in-app',
        })
        // Resolution happens in onPurchaseSuccess / onPurchaseError listeners
        // (expo-iap's requestPurchase returns before Apple finishes the dialog).
      } catch (err: unknown) {
        setIsPurchasing(false)
        const message = err instanceof Error ? err.message : 'Purchase failed'
        if (!/cancel/i.test(message)) {
          optionsRef.current.onError?.(message)
        }
      }
    },
    [connected, requestPurchase],
  )

  const ready = isIos && connected && APPLE_CREDIT_PACKS.every(p => !!productsByid[p.productId])

  return {
    ready,
    products: productsByid,
    isPurchasing,
    purchase,
    retryFetch: doFetch,
  }
}
