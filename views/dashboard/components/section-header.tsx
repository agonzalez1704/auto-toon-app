import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { theme } from '@/constants/theme'
import { ArrowRightIcon } from '../icons'

interface SectionHeaderProps {
  label: string
  actionLabel?: string
  onActionPress?: () => void
}

export function SectionHeader({ label, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {actionLabel && onActionPress && (
        <TouchableOpacity
          style={styles.action}
          activeOpacity={0.7}
          hitSlop={theme.hitSlop(8)}
          onPress={onActionPress}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <ArrowRightIcon />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.sectionLabel,
    textTransform: 'uppercase',
    color: theme.colors.textDim,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  actionText: {
    ...theme.typography.caption,
    color: theme.colors.textDim,
  },
})
