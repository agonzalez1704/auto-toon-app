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
const TAB_BG = theme.colors.bg     // flat warm-slate (#0A0A0A)

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
            title: 'Crear',
            tabBarIcon: { type: 'sfSymbol', name: 'wand.and.stars' } as any,
          }}
        />
        <Tabs.Screen
          name="campanas"
          options={{
            title: 'Campañas',
            tabBarIcon: { type: 'sfSymbol', name: 'square.stack.3d.up' } as any,
          }}
        />
        <Tabs.Screen
          name="biblioteca"
          options={{
            title: 'Biblioteca',
            tabBarIcon: { type: 'sfSymbol', name: 'square.grid.2x2' } as any,
          }}
        />
        <Tabs.Screen
          name="saldo"
          options={{
            title: 'Saldo',
            tabBarIcon: { type: 'sfSymbol', name: 'creditcard' } as any,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'Más',
            tabBarIcon: { type: 'sfSymbol', name: 'ellipsis.circle' } as any,
          }}
        />
      </Tabs>
    </>
  )
}
