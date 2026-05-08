import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { theme } from '@/constants/theme'
import { GlassCard } from '@/components/glass'
import type { UtilityLinkConfig } from '../data'

interface UtilityRowProps {
  links: UtilityLinkConfig[]
  onPress: (route: string) => void
}

export function UtilityRow({ links, onPress }: UtilityRowProps) {
  return (
    <View style={styles.row}>
      {links.map((link) => (
        <TouchableOpacity
          key={link.label}
          style={styles.touch}
          activeOpacity={0.75}
          hitSlop={theme.hitSlop(6)}
          onPress={() => onPress(link.route)}
          accessibilityLabel={link.label}
          accessibilityRole="link"
        >
          <GlassCard tier="sm" radius={theme.radius.pill} style={styles.pill}>
            <Text style={styles.linkText}>{link.label}</Text>
          </GlassCard>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  touch: {
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  linkText: {
    ...theme.typography.cta,
    color: theme.colors.text,
  },
})
