import { withLayoutContext } from 'expo-router'
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable'
import type {
  NativeBottomTabNavigationEventMap,
  NativeBottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs/unstable'
import type { ParamListBase, TabNavigationState } from '@react-navigation/native'
import { Platform } from 'react-native'
import { TermsConsentModal } from '@/components/terms-consent-modal'
import { theme } from '@/constants/theme'

const { Navigator } = createNativeBottomTabNavigator()

const Tabs = withLayoutContext<
  NativeBottomTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  NativeBottomTabNavigationEventMap
>(Navigator)

const ACCENT = theme.palette.violet
const TAB_BG = '#16102A' // matches theme.colors.bg

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: ACCENT,
          ...(Platform.OS === 'android' && {
            tabBarInactiveTintColor: theme.colors.textDim,
            tabBarActiveIndicatorColor: 'rgba(124,58,237,0.18)',
          }),
          tabBarStyle: {
            backgroundColor: TAB_BG,
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
