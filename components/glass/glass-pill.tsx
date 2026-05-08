import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { theme } from '@/constants/theme'
import { GlassCard } from './glass-card'

interface GlassPillProps {
  active?: boolean
  /** Override radius if needed */
  radius?: number
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

/**
 * Pill-shaped glass surface for chips, badges, small inline UI.
 * Children render directly — apply layout via style prop.
 * Active state swaps to violet tint + brighter border.
 */
export function GlassPill({ active, radius, style, children }: GlassPillProps) {
  return (
    <GlassCard
      tier="sm"
      tint={active ? 'violet' : 'neutral'}
      radius={radius ?? theme.radius.pill}
      highlight={!active}
      style={[styles.pill, active && styles.pillActive, style]}
    >
      {children}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 36,
  },
  pillActive: {
    borderColor: theme.colors.accentBorder,
  },
})
