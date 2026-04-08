import { withLayoutContext } from 'expo-router'
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable'
import type {
  NativeBottomTabNavigationEventMap,
  NativeBottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs/unstable'
import type { ParamListBase, TabNavigationState } from '@react-navigation/native'
import { Platform } from 'react-native'
import { TermsConsentModal } from '@/components/terms-consent-modal'

const { Navigator } = createNativeBottomTabNavigator()

const Tabs = withLayoutContext<
  NativeBottomTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  NativeBottomTabNavigationEventMap
>(Navigator)

const ACCENT = '#FBBF24'

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: ACCENT,
          ...(Platform.OS === 'android' && {
            tabBarInactiveTintColor: '#64748b',
            tabBarActiveIndicatorColor: 'rgba(251,191,36,0.15)',
          }),
          tabBarStyle: {
            backgroundColor: '#111B2E',
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: Platform.select({
              ios: { type: 'sfSymbol', name: 'square.grid.2x2.fill' },
              default: { type: 'sfSymbol', name: 'square.grid.2x2.fill' },
            }) as any,
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: 'Create',
            tabBarIcon: Platform.select({
              ios: { type: 'sfSymbol', name: 'wand.and.stars' },
              default: { type: 'sfSymbol', name: 'wand.and.stars' },
            }) as any,
          }}
        />
        <Tabs.Screen
          name="assets"
          options={{
            title: 'Assets',
            tabBarIcon: Platform.select({
              ios: { type: 'sfSymbol', name: 'photo.stack.fill' },
              default: { type: 'sfSymbol', name: 'photo.stack.fill' },
            }) as any,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: Platform.select({
              ios: { type: 'sfSymbol', name: 'ellipsis.circle.fill' },
              default: { type: 'sfSymbol', name: 'ellipsis.circle.fill' },
            }) as any,
          }}
        />
      </Tabs>
      <TermsConsentModal />
    </>
  )
}
