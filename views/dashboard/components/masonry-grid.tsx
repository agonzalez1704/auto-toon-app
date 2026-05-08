import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Dimensions, Easing, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { theme } from '@/constants/theme'
import { computeMasonryLayout, DEFAULT_SPANS, type SlotLayout } from '../lib/masonry-layout'

const SCREEN_WIDTH = Dimensions.get('window').width
const GRID_GAP = 4
const GRID_COLS = 2
const GRID_CELL = (SCREEN_WIDTH - theme.spacing.lg * 2 - GRID_GAP) / GRID_COLS
const SWAP_INTERVAL_MIN = 6000
const SWAP_INTERVAL_MAX = 9000

interface MasonryGridProps {
  images: string[]
  fetchMore: () => Promise<string[]>
  onPress: (url: string) => void
}

export function MasonryGrid({ images, fetchMore, onPress }: MasonryGridProps) {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v)
    })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => {
      mounted = false
      sub.remove()
    }
  }, [])

  const { slots, totalHeight } = useMemo(
    () =>
      computeMasonryLayout(images.length, {
        cellSize: GRID_CELL,
        gap: GRID_GAP,
        cols: GRID_COLS,
        spans: DEFAULT_SPANS,
      }),
    [images.length]
  )
  const tileCount = Math.min(images.length, slots.length)

  const [tileImages, setTileImages] = useState<string[]>(() => images.slice(0, tileCount))
  const [spinTarget, setSpinTarget] = useState<{ idx: number; url: string } | null>(null)

  const reservePool = useRef<string[]>([])
  useEffect(() => {
    const visible = new Set(tileImages)
    reservePool.current = images.filter((u) => !visible.has(u))
  }, [])

  const tileSlots = useRef<number[]>(Array.from({ length: tileCount }, (_, i) => i)).current
  const animX = useRef<Animated.Value[]>(slots.slice(0, tileCount).map((s) => new Animated.Value(s.x))).current
  const animY = useRef<Animated.Value[]>(slots.slice(0, tileCount).map((s) => new Animated.Value(s.y))).current
  const isBusy = useRef(false)

  const sizeGroups = useMemo(() => {
    const groups: Record<string, number[]> = {}
    for (let i = 0; i < tileCount; i++) {
      const s = slots[tileSlots[i]]
      const key = `${s.w}x${s.h}`
      ;(groups[key] ??= []).push(i)
    }
    return Object.values(groups).filter((g) => g.length >= 2)
  }, [tileCount, slots, tileSlots])

  const doSwap = useCallback(() => {
    if (sizeGroups.length === 0) {
      isBusy.current = false
      return
    }
    const group = sizeGroups[Math.floor(Math.random() * sizeGroups.length)]
    const ai = Math.floor(Math.random() * group.length)
    let bi = Math.floor(Math.random() * (group.length - 1))
    if (bi >= ai) bi++
    const a = group[ai]
    const b = group[bi]
    const slotA = tileSlots[a]
    const slotB = tileSlots[b]

    Animated.parallel([
      Animated.spring(animX[a], { toValue: slots[slotB].x, useNativeDriver: true, speed: 6, bounciness: 4 }),
      Animated.spring(animY[a], { toValue: slots[slotB].y, useNativeDriver: true, speed: 6, bounciness: 4 }),
      Animated.spring(animX[b], { toValue: slots[slotA].x, useNativeDriver: true, speed: 6, bounciness: 4 }),
      Animated.spring(animY[b], { toValue: slots[slotA].y, useNativeDriver: true, speed: 6, bounciness: 4 }),
    ]).start(() => {
      tileSlots[a] = slotB
      tileSlots[b] = slotA
      isBusy.current = false
    })
  }, [sizeGroups, slots, animX, animY, tileSlots])

  const doSlotSpin = useCallback(async () => {
    const idx = Math.floor(Math.random() * tileCount)
    let nextUrl: string | undefined
    if (reservePool.current.length > 0) {
      const ri = Math.floor(Math.random() * reservePool.current.length)
      nextUrl = reservePool.current.splice(ri, 1)[0]
    }
    if (reservePool.current.length < 5) {
      fetchMore()
        .then((fresh) => {
          const visible = new Set(tileImages)
          const existing = new Set(reservePool.current)
          for (const u of fresh) {
            if (!visible.has(u) && !existing.has(u)) reservePool.current.push(u)
          }
        })
        .catch(() => {})
    }
    if (!nextUrl) {
      isBusy.current = false
      return
    }
    setSpinTarget({ idx, url: nextUrl })
  }, [tileCount, tileImages, fetchMore])

  const handleSpinComplete = useCallback(() => {
    if (!spinTarget) return
    const { idx, url } = spinTarget
    setTileImages((prev) => {
      const old = prev[idx]
      reservePool.current.push(old)
      const next = [...prev]
      next[idx] = url
      return next
    })
    setSpinTarget(null)
    isBusy.current = false
  }, [spinTarget])

  // Idle animation only when reduce-motion is OFF and tile count > 1
  useEffect(() => {
    if (reduceMotion || tileCount < 2) return
    const iv = setInterval(() => {
      if (isBusy.current) return
      isBusy.current = true
      if (Math.random() < 0.4) {
        doSwap()
      } else {
        doSlotSpin()
      }
    }, SWAP_INTERVAL_MIN + Math.random() * (SWAP_INTERVAL_MAX - SWAP_INTERVAL_MIN))
    return () => clearInterval(iv)
  }, [tileCount, doSwap, doSlotSpin, reduceMotion])

  return (
    <View style={{ height: totalHeight, position: 'relative' }}>
      {Array.from({ length: tileCount }).map((_, i) => {
        const slot = slots[tileSlots[i]]
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: slot.w,
              height: slot.h,
              transform: [{ translateX: animX[i] }, { translateY: animY[i] }],
            }}
          >
            <SlotReel
              imageUrl={tileImages[i]}
              nextImageUrl={spinTarget?.idx === i ? spinTarget.url : null}
              width={slot.w}
              height={slot.h}
              onPress={onPress}
              onSpinComplete={handleSpinComplete}
              reduceMotion={reduceMotion}
            />
          </Animated.View>
        )
      })}
    </View>
  )
}

interface SlotReelProps {
  imageUrl: string
  nextImageUrl: string | null
  width: number
  height: number
  onPress: (url: string) => void
  onSpinComplete: () => void
  reduceMotion: boolean
}

function SlotReel({ imageUrl, nextImageUrl, width, height, onPress, onSpinComplete, reduceMotion }: SlotReelProps) {
  const [displayUrl, setDisplayUrl] = useState(imageUrl)
  const slideY = useRef(new Animated.Value(0)).current
  const spinning = useRef(false)

  useEffect(() => {
    if (!spinning.current) setDisplayUrl(imageUrl)
  }, [imageUrl])

  useEffect(() => {
    if (!nextImageUrl || spinning.current || nextImageUrl === displayUrl) return
    if (reduceMotion) {
      // Skip animation entirely under reduce-motion
      setDisplayUrl(nextImageUrl)
      onSpinComplete()
      return
    }
    spinning.current = true
    slideY.setValue(0)

    Animated.sequence([
      Animated.timing(slideY, {
        toValue: -height,
        duration: 280,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDisplayUrl(nextImageUrl)
      slideY.setValue(height)
      Animated.spring(slideY, {
        toValue: 0,
        speed: 12,
        bounciness: 6,
        useNativeDriver: true,
      }).start(() => {
        spinning.current = false
        onSpinComplete()
      })
    })
  }, [nextImageUrl])

  return (
    <View style={[styles.reel, { width, height }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(displayUrl)}
        style={{ width, height }}
        accessibilityLabel="View image"
        accessibilityRole="imagebutton"
      >
        <Animated.View style={{ width, height, transform: [{ translateY: slideY }] }}>
          <Image source={{ uri: displayUrl }} style={{ width, height }} contentFit="cover" />
        </Animated.View>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.35)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
          locations={[0, 0.18, 0.82, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  reel: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
})
