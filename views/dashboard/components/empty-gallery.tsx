import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { theme, gradients } from '@/constants/theme'
import { EmptySparkle, PlusIcon, SparklesIcon } from '../icons'

interface EmptyGalleryProps {
  onAction: () => void
}

export function EmptyGallery({ onAction }: EmptyGalleryProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconOuter}>
        <EmptySparkle />
        <View style={styles.plusBadge}>
          <PlusIcon />
        </View>
      </View>

      <Text style={styles.title}>Your gallery awaits</Text>
      <Text style={styles.sub}>Create your first product image and it will appear here.</Text>

      <TouchableOpacity
        style={styles.cta}
        activeOpacity={0.85}
        onPress={onAction}
        accessibilityLabel="Create your first image"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[...gradients.amberCta]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <SparklesIcon size={16} color="#1A1330" />
        <Text style={[styles.ctaText, { color: '#1A1330' }]}>Create your first image</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: theme.spacing['5xl'],
    paddingHorizontal: theme.spacing['2xl'],
  },
  iconOuter: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  plusBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sub: {
    fontSize: 14,
    color: theme.colors.textDim,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: theme.spacing['2xl'],
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing['2xl'],
    paddingVertical: theme.spacing.md,
    minHeight: 48,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  ctaText: {
    ...theme.typography.ctaLg,
    color: theme.colors.text,
  },
})
