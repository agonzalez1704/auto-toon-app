import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { theme } from '@/constants/theme'
import { GlassCard } from '@/components/glass'
import { CoinsIcon, SparklesIcon } from '../icons'

interface StatBarProps {
  credits: number | null
  planLabel: string
  onCreditsPress: () => void
  onPlanPress: () => void
}

export function StatBar({ credits, planLabel, onCreditsPress, onPlanPress }: StatBarProps) {
  return (
    <GlassCard tier="sm" radius={theme.radius.pill} style={styles.bar}>
      <TouchableOpacity
        style={styles.item}
        onPress={onCreditsPress}
        activeOpacity={0.7}
        hitSlop={theme.hitSlop(8)}
        accessibilityLabel={`Credits ${credits ?? 'loading'}`}
        accessibilityRole="button"
      >
        <CoinsIcon />
        <Text style={styles.label}>Credits</Text>
        <Text style={styles.value}>{credits !== null ? credits : '--'}</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.item}
        onPress={onPlanPress}
        activeOpacity={0.7}
        hitSlop={theme.hitSlop(8)}
        accessibilityLabel={`Plan ${planLabel}`}
        accessibilityRole="button"
      >
        <SparklesIcon color={theme.palette.violetLight} />
        <Text style={styles.value}>{planLabel}</Text>
      </TouchableOpacity>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    minHeight: 52,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    minHeight: 40,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textDim,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: theme.glass.border,
  },
})
