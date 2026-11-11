import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSegments } from 'expo-router'

/**
 * How much of the bottom the screen must leave free: the native tab bar floats over the content and the unstable
 * navigator has no height hook, so it is the safe-area inset plus the platform's bar. Outside the tabs (a mesa
 * opened on its own) only the inset.
 */
export function useAltoBarra() {
  const { bottom } = useSafeAreaInsets()
  const enTabs = useSegments()[0] === '(tabs)'
  return bottom + (enTabs ? (Platform.OS === 'ios' ? 49 : 64) : 0)
}
