import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { theme, gradients } from '@/constants/theme'
import { PlusIcon } from '../icons'

interface HeaderProps {
  firstName: string
  avatarUrl?: string
  onAvatarPress: () => void
  onNewPress: () => void
}

/**
 * Top header — avatar · large title · primary CTA.
 * Single responsibility: visual structure only. Data + nav callbacks via props (DI).
 */
export function Header({ firstName, avatarUrl, onAvatarPress, onNewPress }: HeaderProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.avatarWrap}
        onPress={onAvatarPress}
        activeOpacity={0.7}
        hitSlop={theme.hitSlop(10)}
        accessibilityLabel="Open account"
        accessibilityRole="button"
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>
        {firstName}&apos;s studio
      </Text>

      <TouchableOpacity
        style={styles.newBtn}
        activeOpacity={0.85}
        onPress={onNewPress}
        hitSlop={theme.hitSlop(6)}
        accessibilityLabel="Start new creation"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[...gradients.amberCta]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <PlusIcon color="#1A1330" />
        <Text style={[styles.newBtnText, { color: '#1A1330' }]}>New</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.accentBorder,
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  title: {
    flex: 1,
    ...theme.typography.pageTitle,
    color: theme.colors.text,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 44,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  newBtnText: {
    ...theme.typography.cta,
    color: theme.colors.text,
  },
})
