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

const ACCENT = '#EB96FF'

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: ACCENT,
          ...(Platform.OS === 'android' && {
            tabBarInactiveTintColor: '#64748b',
            tabBarActiveIndicatorColor: 'rgba(235,150,255,0.15)',
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
          name="restore"
          options={{
            title: 'Restore',
            tabBarIcon: Platform.select({
              ios: { type: 'sfSymbol', name: 'arrow.counterclockwise.circle.fill' },
              default: { type: 'sfSymbol', name: 'arrow.counterclockwise.circle.fill' },
            }) as any,
          }}
        />
        <Tabs.Screen
          name="models"
          options={{
            title: 'Models',
            tabBarIcon: Platform.select({
              ios: { type: 'sfSymbol', name: 'person.crop.rectangle.fill' },
              default: { type: 'sfSymbol', name: 'person.crop.rectangle.fill' },
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
      </Tabs>
      <TermsConsentModal />
    </>
  )
}
