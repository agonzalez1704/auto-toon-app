/**
 * Safe BlurView wrapper.
 * Returns plain View if expo-blur is missing OR the native view manager
 * isn't registered (e.g. JS bundled but native binary stale).
 *
 * Native registration check uses `UIManager.getViewManagerConfig` which
 * returns null when ExpoBlurView isn't autolinked into the running binary.
 */
import type { ComponentType } from 'react'
import { UIManager, View } from 'react-native'

interface BlurProps {
  intensity?: number
  tint?: 'light' | 'dark' | 'default' | 'systemThinMaterial' | 'systemUltraThinMaterial' | 'systemChromeMaterial'
  /**
   * SDK 52+ replaces deprecated `experimentalBlurMethod`.
   * 'dimezisBlurView' = Android real blur. 'none' = JS blur fallback.
   */
  blurMethod?: 'dimezisBlurView' | 'none'
  style?: any
  children?: any
}

let BlurViewImpl: ComponentType<BlurProps>
let jsAvailable = false
let nativeAvailable = false

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  BlurViewImpl = require('expo-blur').BlurView
  jsAvailable = true
} catch {
  BlurViewImpl = View as unknown as ComponentType<BlurProps>
}

if (jsAvailable) {
  try {
    // expo-modules-core registers native modules outside UIManager on Fabric.
    // Probe via requireNativeModule — throws if pod not linked.
    // NOTE: expo-blur registers its module as `ExpoBlur` (see
    // node_modules/expo-blur/ios/BlurViewModule.swift `Name("ExpoBlur")`).
    // The View inside it is `ExpoBlurView`, but `requireNativeModule` takes
    // the *module* name. Using 'ExpoBlurView' here always threw and forced
    // the fallback even on healthy native builds.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo-modules-core')
    requireNativeModule('ExpoBlur')
    nativeAvailable = true
  } catch {
    // Fallback: legacy Paper view-manager probe (pre-Fabric)
    const candidates = ['ExpoBlurView', 'ExpoBlur', 'ViewManagerAdapter_ExpoBlur_ExpoBlurView']
    const lookup = (UIManager as unknown as {
      getViewManagerConfig?: (n: string) => unknown
    }).getViewManagerConfig
    if (typeof lookup === 'function') {
      nativeAvailable = candidates.some((n) => !!lookup.call(UIManager, n))
    } else {
      nativeAvailable = true
    }
  }
  if (!nativeAvailable && __DEV__) {
    console.warn(
      '[GlassCard] expo-blur JS loaded but native module missing. ' +
        'Run: npx expo prebuild --clean && pnpm ios   (clean native rebuild required)'
    )
  }
}

export const BlurViewSafe: ComponentType<BlurProps> = nativeAvailable
  ? BlurViewImpl
  : (View as unknown as ComponentType<BlurProps>)

export const isBlurAvailable = nativeAvailable
