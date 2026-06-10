import { withLayoutContext } from 'expo-router'
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable'
import type {
  NativeBottomTabNavigationEventMap,
  NativeBottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs/unstable'
import type { ParamListBase, TabNavigationState } from '@react-navigation/native'
import { Platform } from 'react-native'
import { theme } from '@/constants/theme'

const { Navigator } = createNativeBottomTabNavigator()

const Tabs = withLayoutContext<
  NativeBottomTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  NativeBottomTabNavigationEventMap
>(Navigator)

const ACCENT = theme.colors.accent // amber — primary CTA tint
const TAB_BG = theme.colors.bg     // flat warm-slate (#0B0F14)

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: ACCENT,
          ...(Platform.OS === 'android' && {
            tabBarInactiveTintColor: theme.colors.textDim,
            tabBarActiveIndicatorColor: theme.colors.accentSoft,
          }),
          tabBarStyle: {
            backgroundColor: TAB_BG,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
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
            title: 'Enhance',
            tabBarIcon: Platform.select({
              ios: { type: 'sfSymbol', name: 'wand.and.stars' },
              default: { type: 'sfSymbol', name: 'wand.and.stars' },
            }) as any,
          }}
        />
        <Tabs.Screen
          name="wardrobe"
          options={{
            title: 'Wardrobe',
            tabBarIcon: Platform.select({
              ios: { type: 'sfSymbol', name: 'tshirt.fill' },
              default: { type: 'sfSymbol', name: 'tshirt.fill' },
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
    </>
  )
}
