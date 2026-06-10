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

// ── Icons ──────────────────────────────────────────────────────────

function RestoreIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M3.5 12a8.5 8.5 0 1 1 1.7 5.1"
        stroke={theme.colors.info}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
      <SvgPath
        d="M3.5 17.5V12H9"
        stroke={theme.colors.info}
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
      <Circle cx="12" cy="12" r="4" stroke={theme.colors.success} strokeWidth={1.8} fill="none" />
      <SvgPath
        d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
        stroke={theme.colors.success}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  )
}

function AssetsIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="6" width="14" height="14" rx="2" stroke={theme.colors.accent} strokeWidth={1.8} fill="none" />
      <SvgPath
        d="M7 4h13a1 1 0 0 1 1 1v13"
        stroke={theme.colors.accent}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  )
}

// ── Feature definitions ────────────────────────────────────────────

function ModelFactoryIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.5" r="3.2" stroke={theme.colors.accent} strokeWidth={1.8} fill="none" />
      <SvgPath
        d="M5.5 20a6.5 6.5 0 0 1 13 0"
        stroke={theme.colors.accent}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  )
}

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
    key: 'model-factory',
    title: 'Model Factory',
    description: 'Create & save AI models of yourself',
    icon: ModelFactoryIcon,
    iconTintColor: 'rgba(251,191,36,0.16)',
    route: '/model-factory',
  },
  {
    key: 'assets',
    title: 'Assets',
    description: 'Browse your generated images & videos',
    icon: AssetsIcon,
    iconTintColor: 'rgba(251,191,36,0.16)',
    route: '/assets',
  },
  {
    key: 'restore',
    title: 'Image Restore',
    description: 'Upscale & restore images to 2K/4K',
    icon: RestoreIcon,
    iconTintColor: 'rgba(34,211,238,0.16)',
    route: '/restore',
  },
  {
    key: 'relight',
    title: 'AI Relight',
    description: 'Transform lighting with cinematic presets',
    icon: RelightIcon,
    iconTintColor: 'rgba(52,211,153,0.16)',
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
                activeOpacity={0.7}
                accessibilityLabel={feature.title}
                accessibilityHint={feature.description}
                accessibilityRole="button"
                style={styles.card}
              >
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
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
