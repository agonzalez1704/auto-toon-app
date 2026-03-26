import { useCallback, useRef, useMemo } from 'react'
import { View, StyleSheet, LayoutChangeEvent, PanResponder } from 'react-native'
import { Image } from 'expo-image'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated'
import Svg, { Path as SvgPath } from 'react-native-svg'

const HANDLE_SIZE = 40
const HANDLE_HALF = HANDLE_SIZE / 2

interface BeforeAfterSliderProps {
  beforeUri: string
  afterUri: string
  height?: number
  /** Animate slider from right→left on mount to reveal the "after" image */
  revealOnMount?: boolean
}

export function BeforeAfterSlider({ beforeUri, afterUri, height: propHeight, revealOnMount }: BeforeAfterSliderProps) {
  const widthRef = useRef(300)
  const sliderX = useSharedValue(150)
  const didReveal = useRef(false)

  const clamp = useCallback((x: number) => {
    const w = widthRef.current
    return Math.max(HANDLE_HALF, Math.min(w - HANDLE_HALF, x))
  }, [])

  // PanResponder with native gesture blocking — created once, reads from refs
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: (e) => {
      cancelAnimation(sliderX)
      sliderX.value = clamp(e.nativeEvent.locationX)
    },
    onPanResponderMove: (e) => {
      sliderX.value = clamp(e.nativeEvent.locationX)
    },
  }), [sliderX, clamp])

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width } = e.nativeEvent.layout
      widthRef.current = width

      if (revealOnMount && !didReveal.current) {
        didReveal.current = true
        sliderX.value = width - HANDLE_HALF
        sliderX.value = withDelay(
          400,
          withSequence(
            withTiming(HANDLE_HALF, { duration: 1000, easing: Easing.out(Easing.cubic) }),
            withDelay(300,
              withTiming(width * 0.5, { duration: 500, easing: Easing.inOut(Easing.quad) })
            )
          )
        )
      } else if (!didReveal.current) {
        sliderX.value = width * 0.5
      }
    },
    [sliderX, revealOnMount]
  )

  const containerHeight = propHeight ?? 400

  const clipStyle = useAnimatedStyle(() => ({
    width: sliderX.value,
  }))

  const dividerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value - 1 }],
  }))

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value - HANDLE_HALF }],
  }))

  const beforeLabelStyle = useAnimatedStyle(() => ({
    opacity: sliderX.value > widthRef.current * 0.25 ? 1 : 0,
  }))

  const afterLabelStyle = useAnimatedStyle(() => ({
    opacity: sliderX.value < widthRef.current * 0.75 ? 1 : 0,
  }))

  return (
    <View
      style={[styles.container, { height: containerHeight }]}
      onLayout={onLayout}
    >
      {/* After image (full, underneath) */}
      <Image source={{ uri: afterUri }} style={styles.image} contentFit="cover" transition={200} />

      {/* Before image (clipped) */}
      <Animated.View style={[styles.clipContainer, clipStyle]}>
        <Image
          source={{ uri: beforeUri }}
          style={[styles.image, { width: widthRef.current }]}
          contentFit="cover"
          transition={200}
        />
      </Animated.View>

      {/* Divider line */}
      <Animated.View style={[styles.divider, { height: containerHeight }, dividerStyle]} />

      {/* Drag handle */}
      <Animated.View
        style={[styles.handleContainer, { top: containerHeight / 2 - HANDLE_HALF }, handleStyle]}
      >
        <View style={styles.handle}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <SvgPath d="M15 18l-6-6 6-6" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <SvgPath d="M9 18l6-6-6-6" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </Animated.View>

      {/* Labels */}
      <Animated.Text style={[styles.label, styles.labelBefore, beforeLabelStyle]}>Before</Animated.Text>
      <Animated.Text style={[styles.label, styles.labelAfter, afterLabelStyle]}>After</Animated.Text>

      {/* Touch capture overlay — above everything, captures all touches */}
      <View style={styles.touchOverlay} {...panResponder.panHandlers} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111118',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  clipContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  divider: {
    position: 'absolute',
    top: 0,
    width: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  handleContainer: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    zIndex: 10,
  },
  handle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_HALF,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    bottom: 12,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  labelBefore: {
    left: 12,
  },
  labelAfter: {
    right: 12,
  },
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
})
