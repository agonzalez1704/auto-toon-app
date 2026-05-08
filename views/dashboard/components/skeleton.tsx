import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { theme } from '@/constants/theme'

const PULSE_LO = 0.3
const PULSE_HI = 0.6

export function DashboardSkeleton() {
  const pulse = useRef(new Animated.Value(PULSE_LO)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: PULSE_HI, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: PULSE_LO, duration: 800, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <View style={styles.content}>
      <Animated.View style={[styles.header, { opacity: pulse }]} />
      <View style={styles.statBar}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Animated.View key={i} style={[styles.pill, { opacity: pulse }]} />
        ))}
      </View>
      <View style={styles.bento}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Animated.View key={i} style={[styles.bentoCell, { opacity: pulse }]} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    height: 32,
    width: 200,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.xl,
  },
  statBar: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  pill: {
    height: 32,
    width: 100,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  bento: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  bentoCell: {
    width: '48%',
    height: 152,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
})
