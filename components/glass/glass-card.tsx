import { LinearGradient } from 'expo-linear-gradient'
import { Platform, StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native'
import { theme } from '@/constants/theme'
import { BlurViewSafe, isBlurAvailable } from './blur-view-safe'

type GlassTier = 'sm' | 'md' | 'lg' | 'xl'

interface GlassCardProps {
  tier?: GlassTier
  tint?: 'neutral' | 'violet' | 'cyan'
  radius?: number
  highlight?: boolean
  /** Children render directly inside outer view — pass flex/padding via style */
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

const TIER_INTENSITY: Record<GlassTier, number> = {
  sm: theme.glass.blur.sm,
  md: theme.glass.blur.md,
  lg: theme.glass.blur.lg,
  xl: theme.glass.blur.xl,
}

const TINT_FILL: Record<NonNullable<GlassCardProps['tint']>, string> = {
  neutral: theme.glass.tint,
  violet: theme.glass.tintViolet,
  cyan: theme.glass.tintCyan,
}

const FALLBACK_FILL: Record<NonNullable<GlassCardProps['tint']>, string> = {
  neutral: theme.glass.fallback,
  violet: theme.glass.fallbackViolet,
  cyan: 'rgba(8,80,90,0.7)',
}

/**
 * Liquid-glass surface.
 * Children render at the root — pass `flexDirection`, `padding`, `gap`,
 * `alignItems` etc. via the `style` prop. Absolute layers below children:
 *   1. BlurView (real frosted bg if expo-blur installed)
 *   2. Tint fill — adds brand color or neutral white film
 *   3. Specular gradient (top 30% only) — subtle "lit edge" feel
 *   4. Hairline border with brighter top
 *
 * Falls back to opaque tinted fill when expo-blur isn't installed.
 */
export function GlassCard({
  tier = 'md',
  tint = 'neutral',
  radius = theme.radius.lg,
  highlight = true,
  style,
  children,
}: GlassCardProps) {
  const fillColor = isBlurAvailable ? TINT_FILL[tint] : FALLBACK_FILL[tint]

  return (
    <View
      style={[
        styles.wrap,
        { borderRadius: radius, borderColor: theme.glass.border },
        style,
      ]}
    >
      {/* Layer 1: BlurView (or fallback no-op).
          NOTE: `experimentalBlurMethod` deprecated in expo-blur 55 →
          renamed to `blurMethod`. iOS uses native UIVisualEffectView so
          'none' is correct there; Android needs 'dimezisBlurView' for
          a real blur (otherwise it's a flat tint). */}
      {isBlurAvailable && (
        <BlurViewSafe
          intensity={TIER_INTENSITY[tier]}
          tint="dark"
          blurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {/* Layer 2: tint fill */}
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: fillColor }]}
        pointerEvents="none"
      />

      {/* Layer 2b: depth gradient — only when blur is missing, fakes 3D feel */}
      {!isBlurAvailable && (
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      )}

      {/* Layer 3: specular highlight (top edge only — natural lit feel) */}
      {highlight && (
        <LinearGradient
          colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.3 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      )}

      {/* Layer 4: top-edge border highlight (1px hairline white at top) */}
      {highlight && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.glass.borderTop,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
})
