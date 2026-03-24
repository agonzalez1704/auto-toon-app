import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import Svg, { Path as SvgPath, Circle, Rect } from 'react-native-svg'
import { TermsConsentModal } from '@/components/terms-consent-modal'

const BRAND = '#8B5CF6'
const INACTIVE = '#64748b'

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        fill={color} opacity={color === BRAND ? 1 : 0.7}
      />
    </Svg>
  )
}

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} opacity={color === BRAND ? 1 : 0.7} />
      <Rect x="11" y="7" width="2" height="10" rx="1" fill="#FFFFFF" />
      <Rect x="7" y="11" width="10" height="2" rx="1" fill="#FFFFFF" />
    </Svg>
  )
}

function GalleryIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="3" fill={color} opacity={color === BRAND ? 1 : 0.7} />
      <Circle cx="8.5" cy="8.5" r="2" fill="#FFFFFF" opacity={0.8} />
      <SvgPath d="M21 15l-5-5L5 21h14a2 2 0 002-2v-4z" fill="#FFFFFF" opacity={0.5} />
    </Svg>
  )
}

export default function TabLayout() {
  return (
    <>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: '#0f0f14',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          paddingTop: 6,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#0a0a0f',
        },
        headerTintColor: '#FFFFFF',
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          headerShown: false,
          tabBarIcon: ({ color }) => <PlusIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Assets',
          headerShown: false,
          tabBarIcon: ({ color }) => <GalleryIcon color={color} />,
        }}
      />
    </Tabs>
    <TermsConsentModal />
    </>
  )
}
