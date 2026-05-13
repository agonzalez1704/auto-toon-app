import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { theme } from '@/constants/theme'
import type { GoalId } from '@/stores/use-product-enhancer-store'
import { GOALS, GOAL_ICONS } from '../data'
import { ChevronDownIcon, InstagramIcon, SettingsIcon } from '../icons'

interface GoalSelectorProps {
  selectedGoalId: GoalId | null
  onPress: () => void
  onCustomizePress?: () => void
  showCustomize?: boolean
}

/**
 * Goal selector — pill button that opens carousel modal.
 * Shows customize link when goal is elements/poster.
 */
export function GoalSelector({
  selectedGoalId,
  onPress,
  onCustomizePress,
  showCustomize,
}: GoalSelectorProps) {
  const Icon = selectedGoalId ? GOAL_ICONS[selectedGoalId] : InstagramIcon
  const label = GOALS.find((g) => g.id === selectedGoalId)?.label ?? 'Instagram Feed'
  const customizeLabel = selectedGoalId === 'elements' ? 'Elements' : 'Poster'

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.label}>Goal</Text>
        <TouchableOpacity
          style={[styles.button, selectedGoalId && styles.buttonActive]}
          onPress={onPress}
          activeOpacity={0.75}
          accessibilityLabel={`Goal: ${label}. Tap to change.`}
          accessibilityRole="button"
        >
          <Icon />
          <Text style={styles.buttonLabel}>{label}</Text>
          <ChevronDownIcon />
        </TouchableOpacity>
      </View>

      {showCustomize && onCustomizePress && (
        <TouchableOpacity
          style={styles.customizeLink}
          onPress={onCustomizePress}
          activeOpacity={0.7}
          hitSlop={theme.hitSlop(8)}
          accessibilityLabel={`Customize ${customizeLabel}`}
          accessibilityRole="button"
        >
          <SettingsIcon />
          <Text style={styles.customizeText}>Customize {customizeLabel}</Text>
        </TouchableOpacity>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: theme.spacing.xl },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.colors.textDim,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 52,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
  },
  buttonActive: {
    borderColor: theme.colors.accentBorder,
    backgroundColor: theme.colors.bgElevated,
  },
  buttonLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  customizeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.xs,
    marginTop: -theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  customizeText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },
})
