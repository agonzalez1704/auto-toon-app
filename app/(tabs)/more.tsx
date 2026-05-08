import { useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Svg, { Path as SvgPath, Circle, Rect } from 'react-native-svg'
import { theme } from '@/constants/theme'
import { GlassCard } from '@/components/glass'

// ── Icons ──────────────────────────────────────────────────────────

function ModelsIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="7" r="3.5" stroke={theme.palette.violet} strokeWidth={1.8} fill="none" />
      <SvgPath
        d="M5.5 20c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5"
        stroke={theme.palette.violet}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
      <Rect x="16" y="2" width="6" height="8" rx="1" stroke={theme.palette.violet} strokeWidth={1.5} fill="none" />
    </Svg>
  )
}

function RestoreIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M3.5 12a8.5 8.5 0 1 1 1.7 5.1"
        stroke={theme.palette.cyan}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
      <SvgPath
        d="M3.5 17.5V12H9"
        stroke={theme.palette.cyan}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}

function RelightIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={theme.palette.emerald} strokeWidth={1.8} fill="none" />
      <SvgPath
        d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
        stroke={theme.palette.emerald}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  )
}

// ── Feature definitions ────────────────────────────────────────────

interface Feature {
  key: string
  title: string
  description: string
  icon: () => React.JSX.Element
  iconTintColor: string
  route?: string
}

const FEATURES: Feature[] = [
  {
    key: 'models',
    title: 'Model Factory',
    description: 'Create & manage AI fashion models',
    icon: ModelsIcon,
    iconTintColor: 'rgba(124,58,237,0.15)',
    route: '/models',
  },
  {
    key: 'restore',
    title: 'Image Restore',
    description: 'Upscale & restore images to 2K/4K',
    icon: RestoreIcon,
    iconTintColor: 'rgba(6,182,212,0.15)',
    route: '/restore',
  },
  {
    key: 'relight',
    title: 'AI Relight',
    description: 'Transform lighting with cinematic presets',
    icon: RelightIcon,
    iconTintColor: 'rgba(16,185,129,0.15)',
    route: '/relight',
  },
]

// ── Screen ─────────────────────────────────────────────────────────

export default function MoreScreen() {
  const router = useRouter()

  const handlePress = useCallback(
    (feature: Feature) => {
      if (feature.route) {
        router.push(feature.route as any)
      }
    },
    [router]
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={styles.headerTitle}>More</Text>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <TouchableOpacity
                key={feature.key}
                onPress={() => handlePress(feature)}
                activeOpacity={0.85}
                accessibilityLabel={feature.title}
                accessibilityHint={feature.description}
                accessibilityRole="button"
              >
                <GlassCard tier="md" tint="neutral" style={styles.card}>
                  <View style={[styles.iconContainer, { backgroundColor: feature.iconTintColor }]}>
                    <Icon />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{feature.title}</Text>
                    <Text style={styles.cardDescription}>{feature.description}</Text>
                  </View>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <SvgPath
                      d="M9 18l6-6-6-6"
                      stroke={theme.colors.textDim}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </GlassCard>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  safeArea: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.pageTitle,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
    minHeight: 84,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...theme.typography.label,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cardDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: theme.colors.textDim,
  },
})
