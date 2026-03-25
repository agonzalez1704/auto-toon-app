import { useCallback, useRef, useState } from 'react'
import { View, StyleSheet, Dimensions, PanResponder, LayoutChangeEvent } from 'react-native'
import { Image } from 'expo-image'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import Svg, { Path as SvgPath } from 'react-native-svg'

const HANDLE_SIZE = 40
const MIN_PCT = 0.1
const MAX_PCT = 0.9

interface BeforeAfterSliderProps {
  beforeUri: string
  afterUri: string
  height?: number
}

export function BeforeAfterSlider({ beforeUri, afterUri, height: propHeight }: BeforeAfterSliderProps) {
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width - 32)
  const [containerHeight, setContainerHeight] = useState(propHeight ?? 400)
  const sliderX = useSharedValue(containerWidth * 0.5)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_evt, gestureState) => {
        const newX = Math.max(
          containerWidth * MIN_PCT,
          Math.min(containerWidth * MAX_PCT, gestureState.moveX - 16) // 16 = horizontal padding
        )
        sliderX.value = newX
      },
      onPanResponderRelease: () => {},
    })
  ).current

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout
      setContainerWidth(width)
      setContainerHeight(propHeight ?? height)
      sliderX.value = width * 0.5
    },
    [propHeight, sliderX]
  )

  const clipStyle = useAnimatedStyle(() => ({
    width: sliderX.value,
  }))

  const dividerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value - 1 }],
  }))

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value - HANDLE_SIZE / 2 }],
  }))

  const beforeLabelStyle = useAnimatedStyle(() => ({
    opacity: sliderX.value > containerWidth * 0.25 ? 1 : 0,
  }))

  const afterLabelStyle = useAnimatedStyle(() => ({
    opacity: sliderX.value < containerWidth * 0.75 ? 1 : 0,
  }))

  return (
    <View style={[styles.container, { height: containerHeight }]} onLayout={onLayout}>
      {/* After image (full, underneath) */}
      <Image source={{ uri: afterUri }} style={styles.image} contentFit="cover" transition={200} />

      {/* Before image (clipped) */}
      <Animated.View style={[styles.clipContainer, clipStyle]}>
        <Image
          source={{ uri: beforeUri }}
          style={[styles.image, { width: containerWidth }]}
          contentFit="cover"
          transition={200}
        />
      </Animated.View>

      {/* Divider line */}
      <Animated.View style={[styles.divider, { height: containerHeight }, dividerStyle]} />

      {/* Drag handle */}
      <Animated.View
        style={[styles.handleContainer, { top: containerHeight / 2 - HANDLE_SIZE / 2 }, handleStyle]}
        {...panResponder.panHandlers}
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
    borderRadius: HANDLE_SIZE / 2,
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
})
