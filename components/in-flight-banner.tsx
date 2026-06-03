import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path as SvgPath } from 'react-native-svg'
import { useRouter } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import { useGenerationTracker } from '@/stores/use-generation-tracker'

const BRAND = '#FBBF24'

/**
 * Small top-of-screen pill that surfaces in-flight generations across
 * navigation. Tapping it routes the user back to the appropriate flow.
 *
 * Visibility rules:
 *   - Hidden when no jobs are tracked.
 *   - Shown otherwise, including across cold-starts (jobs are persisted).
 *
 * The banner exists so a user who navigates away from the generating
 * screen (or backgrounds and reopens the app) still has a clear signal
 * that work is in progress, plus a way back to it.
 */
export function InFlightBanner() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  // useShallow: Object.values() builds a new array each call — without it the
  // snapshot changes every render and useSyncExternalStore loops infinitely.
  const jobs = useGenerationTracker(useShallow((s) => Object.values(s.jobs)))
  const activeJob = jobs[0]
  const count = jobs.length

  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!activeJob) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [activeJob, pulse])

  if (!activeJob) return null

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] })

  const onPress = () => {
    if (activeJob.origin === 'commercial') router.push('/product-commercial')
    else if (activeJob.origin === 'video-generator') router.push('/video-generator')
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.pill}>
        <Animated.View style={[styles.dot, { opacity }]} />
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={9} stroke={BRAND} strokeWidth={2} />
          <SvgPath
            d="M12 7v5l3 2"
            stroke={BRAND}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={styles.text} numberOfLines={1}>
          {count > 1 ? `${count} generations running` : activeJob.label || 'Generation running'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20,15,5,0.92)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    maxWidth: '88%',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND,
  },
  text: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
})
