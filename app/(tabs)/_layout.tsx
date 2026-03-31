import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import Svg, { Path as SvgPath, Circle, Rect, Defs, LinearGradient, Stop, G } from 'react-native-svg'
import { TermsConsentModal } from '@/components/terms-consent-modal'

// Aurora Blossom palette
const AURORA_MAGENTA = '#EB96FF'
const AURORA_TEAL = '#0B5777'
const INACTIVE = '#64748b'

function DashboardIcon({ color }: { color: string }) {
  const active = color === AURORA_MAGENTA
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {active && (
        <Defs>
          <LinearGradient id="dashGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={AURORA_MAGENTA} />
            <Stop offset="1" stopColor={AURORA_TEAL} />
          </LinearGradient>
        </Defs>
      )}
      {/* Main grid — four panels with varying sizes */}
      <Rect x="3" y="3" width="7.5" height="8" rx="2" fill={active ? 'url(#dashGrad)' : color} opacity={active ? 1 : 0.65} />
      <Rect x="13.5" y="3" width="7.5" height="4.5" rx="2" fill={color} opacity={active ? 0.7 : 0.45} />
      <Rect x="13.5" y="10" width="7.5" height="11" rx="2" fill={active ? 'url(#dashGrad)' : color} opacity={active ? 0.85 : 0.55} />
      <Rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill={color} opacity={active ? 0.7 : 0.45} />
      {/* Sparkle accent on active */}
      {active && (
        <SvgPath
          d="M7 7L7.6 5.4 9.2 4.8 7.6 4.2 7 2.6 6.4 4.2 4.8 4.8 6.4 5.4Z"
          fill="#FFFFFF"
          opacity={0.9}
        />
      )}
    </Svg>
  )
}

function CreateIcon({ color }: { color: string }) {
  const active = color === AURORA_MAGENTA
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {active && (
        <Defs>
          <LinearGradient id="createGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={AURORA_MAGENTA} />
            <Stop offset="0.5" stopColor="#9333EA" />
            <Stop offset="1" stopColor={AURORA_TEAL} />
          </LinearGradient>
        </Defs>
      )}
      {/* Wand body */}
      <SvgPath
        d="M4.5 19.5L15 9l1.5 1.5L6 21l-1.5-1.5z"
        fill={active ? 'url(#createGrad)' : color}
        opacity={active ? 1 : 0.65}
      />
      {/* Wand tip */}
      <SvgPath
        d="M15 9l2.5-2.5a1.5 1.5 0 012.12 0l0 0a1.5 1.5 0 010 2.12L17.12 11.12 15 9z"
        fill={color}
        opacity={active ? 0.8 : 0.5}
      />
      {/* Sparkles around wand */}
      <SvgPath d="M9 3l.75 1.5L11.25 5.25 9.75 6 9 7.5 8.25 6 6.75 5.25 8.25 4.5Z" fill={color} opacity={active ? 0.9 : 0.4} />
      <SvgPath d="M18 14l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5Z" fill={color} opacity={active ? 0.7 : 0.3} />
      <SvgPath d="M14 3.5l.4.8.8.4-.8.4-.4.8-.4-.8-.8-.4.8-.4Z" fill={color} opacity={active ? 0.6 : 0.25} />
    </Svg>
  )
}

function RestoreIcon({ color }: { color: string }) {
  const active = color === AURORA_MAGENTA
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {active && (
        <Defs>
          <LinearGradient id="restoreGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={AURORA_TEAL} />
            <Stop offset="1" stopColor={AURORA_MAGENTA} />
          </LinearGradient>
        </Defs>
      )}
      {/* Circular arrow */}
      <SvgPath
        d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8"
        stroke={active ? 'url(#restoreGrad)' : color}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={active ? 1 : 0.65}
      />
      {/* Arrow head */}
      <SvgPath
        d="M20 4v4.5h-4.5"
        stroke={active ? AURORA_MAGENTA : color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.65}
      />
      {/* Inner sparkle */}
      {active && (
        <SvgPath
          d="M12 10l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z"
          fill="#FFFFFF"
          opacity={0.8}
        />
      )}
    </Svg>
  )
}

function ModelIcon({ color }: { color: string }) {
  const active = color === AURORA_MAGENTA
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {active && (
        <Defs>
          <LinearGradient id="modelGrad" x1="0" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={AURORA_MAGENTA} />
            <Stop offset="1" stopColor="#9333EA" />
          </LinearGradient>
        </Defs>
      )}
      {/* Silhouette head */}
      <Circle cx="12" cy="7.5" r="3.5" fill={active ? 'url(#modelGrad)' : color} opacity={active ? 1 : 0.65} />
      {/* Body/shoulders */}
      <SvgPath
        d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6"
        fill={active ? 'url(#modelGrad)' : color}
        opacity={active ? 0.85 : 0.55}
      />
      {/* Camera/pose marker */}
      <G opacity={active ? 0.9 : 0.45}>
        <Rect x="17" y="2" width="5" height="4" rx="1" fill={color} />
        <Circle cx="19.5" cy="4" r="1" fill={active ? '#111B2E' : '#FFFFFF'} opacity={0.8} />
      </G>
    </Svg>
  )
}

function AssetsIcon({ color }: { color: string }) {
  const active = color === AURORA_MAGENTA
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {active && (
        <Defs>
          <LinearGradient id="assetsGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={AURORA_MAGENTA} />
            <Stop offset="1" stopColor={AURORA_TEAL} />
          </LinearGradient>
        </Defs>
      )}
      {/* Back card (stacked effect) */}
      <Rect x="5" y="2" width="16" height="14" rx="2.5" fill={color} opacity={active ? 0.35 : 0.25} />
      {/* Front card */}
      <Rect x="3" y="5" width="16" height="14" rx="2.5" fill={active ? 'url(#assetsGrad)' : color} opacity={active ? 1 : 0.65} />
      {/* Sun/circle in image */}
      <Circle cx="8" cy="9.5" r="2" fill="#FFFFFF" opacity={0.75} />
      {/* Mountain/landscape path */}
      <SvgPath d="M3 16.5l4.5-4 3 2.5 3.5-4L19 16.5V17a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 013 17v-.5z" fill="#FFFFFF" opacity={0.4} />
      {/* Bottom row dots — file count indicator */}
      <Circle cx="8" cy="22" r="1" fill={color} opacity={active ? 0.7 : 0.35} />
      <Circle cx="12" cy="22" r="1" fill={color} opacity={active ? 0.5 : 0.25} />
      <Circle cx="16" cy="22" r="1" fill={color} opacity={active ? 0.3 : 0.15} />
    </Svg>
  )
}

export default function TabLayout() {
  return (
    <>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AURORA_MAGENTA,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: '#111B2E',
          borderTopColor: 'rgba(235,150,255,0.08)',
          borderTopWidth: 1,
          paddingTop: 6,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#193153',
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
          tabBarIcon: ({ color }) => <DashboardIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          headerShown: false,
          tabBarIcon: ({ color }) => <CreateIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="restore"
        options={{
          title: 'Restore',
          headerShown: false,
          tabBarIcon: ({ color }) => <RestoreIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="models"
        options={{
          title: 'Models',
          headerShown: false,
          tabBarIcon: ({ color }) => <ModelIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Assets',
          headerShown: false,
          tabBarIcon: ({ color }) => <AssetsIcon color={color} />,
        }}
      />
    </Tabs>
    <TermsConsentModal />
    </>
  )
}
