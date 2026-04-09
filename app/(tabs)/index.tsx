import { getRecentCreations } from '@/lib/api'
import { queryKeys } from '@/lib/query'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { useUser } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Easing,
  Image as RNImage,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, {
  Circle,
  Path as SvgPath,
} from 'react-native-svg'

// ─── Palette ───────────────────────────────────────────────────────────
const BG = '#193153'
const CARD_BG = 'rgba(255,255,255,0.04)'
const MUTED = 'rgba(255,255,255,0.55)'
const ACCENT_VIOLET = '#8B5CF6'

const SCREEN_WIDTH = Dimensions.get('window').width
const GRID_GAP = 4
const GRID_COLS = 2
const GRID_CELL = (SCREEN_WIDTH - 32 - GRID_GAP) / GRID_COLS

// ─── Plan labels ───────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  WEEKLY: 'Weekly',
  BASIC: 'Starter',
  STARTER: 'Starter',
  PRO: 'Pro',
  BUSINESS: 'Business',
  PAYPERUSE: 'Pay Per Use',
}

// ─── Masonry spans (cycles) ─[colSpan, rowSpan] ───────────────────────
const MASONRY_SPANS: [number, number][] = [
  [2, 2], // hero
  [1, 1],
  [1, 1],
  [1, 2], // tall
  [1, 1],
  [1, 1],
  [2, 1], // wide
  [1, 1],
  [1, 2], // tall
  [1, 1],
  [1, 1],
  [2, 1], // wide
]

// ─── Bento Cards config ───────────────────────────────────────────────
const BENTO_CARDS = [
  {
    label: 'Mejora tu Producto',
    description: 'Fotos profesionales con IA',
    route: '/(tabs)/create' as const,
    preview: require('@/assets/images/previews/professional_photo.png'),
    gradientColors: ['rgba(234,88,12,0.85)', 'rgba(245,158,11,0.65)'] as const,
  },
  {
    label: 'Fashion Editorial',
    description: 'Sesiones de moda con modelos IA',
    route: '/fashion-editorial' as const,
    preview: require('@/assets/images/previews/fashion-editorial-1.png'),
    gradientColors: ['rgba(219,39,119,0.85)', 'rgba(244,63,94,0.65)'] as const,
    pro: true,
  },
  {
    label: 'Relight',
    description: 'Iluminacion cinematica',
    route: '/relight' as const,
    preview: require('@/assets/images/previews/backlight_halo_2k.png'),
    gradientColors: ['rgba(8,145,178,0.85)', 'rgba(59,130,246,0.65)'] as const,
  },
  {
    label: 'Restauracion',
    description: 'Revive imagenes a 2K/4K',
    route: '/restore' as const,
    preview: require('@/assets/images/previews/upscale.jpg'),
    gradientColors: ['rgba(124,58,237,0.85)', 'rgba(147,51,234,0.65)'] as const,
  },
]

// ─── Utility Links config ─────────────────────────────────────────────
const UTILITY_LINKS = [
  { label: 'Assets', route: '/(tabs)/assets' as const },
  { label: 'API', route: '/developer' as const },
  { label: 'Pricing', route: '/account/pricing' as const },
]

// ─── SVG Icons (minimal) ──────────────────────────────────────────────

function CoinsIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke="#F59E0B" strokeWidth="2" />
      <SvgPath d="M12 7v10M9 9.5l3-2.5 3 2.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  )
}

function SparklesIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
        stroke={ACCENT_VIOLET}
        strokeWidth="2"
        fill="none"
      />
    </Svg>
  )
}

function PlusIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M12 5v14M5 12h14" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  )
}

function ArrowRightIcon({ color = MUTED }: { color?: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function EmptySparkle() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.5"
        fill="none"
      />
    </Svg>
  )
}

// ─── Bento Card ───────────────────────────────────────────────────────

function BentoCard({
  label,
  description,
  preview,
  gradientColors,
  pro,
  onPress,
}: {
  label: string
  description: string
  preview: any
  gradientColors: readonly [string, string]
  pro?: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={styles.bentoCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <RNImage
        source={preview}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[...gradientColors]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.bentoGradient}
      />
      <View style={styles.bentoContent}>
        <View style={styles.bentoTitleRow}>
          <Text style={styles.bentoLabel} numberOfLines={1}>{label}</Text>
          {pro && (
            <View style={styles.bentoBadge}>
              <Text style={styles.bentoBadgeText}>PRO</Text>
            </View>
          )}
        </View>
        <Text style={styles.bentoDesc} numberOfLines={1}>{description}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Stat Bar ─────────────────────────────────────────────────────────

function StatBar({
  credits,
  planLabel,
  onCreditsPress,
  onPlanPress,
}: {
  credits: number | null
  planLabel: string
  onCreditsPress: () => void
  onPlanPress: () => void
}) {
  return (
    <View style={styles.statBar}>
      <TouchableOpacity style={styles.statItem} onPress={onCreditsPress} activeOpacity={0.7}>
        <CoinsIcon />
        <Text style={styles.statLabel}>Credits</Text>
        <Text style={styles.statValue}>{credits !== null ? credits : '--'}</Text>
      </TouchableOpacity>
      <View style={styles.statDivider} />
      <TouchableOpacity style={styles.statItem} onPress={onPlanPress} activeOpacity={0.7}>
        <SparklesIcon />
        <Text style={styles.statValue}>{planLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Utility Row ──────────────────────────────────────────────────────

function UtilityRow({ onPress }: { onPress: (route: string) => void }) {
  return (
    <View style={styles.utilityRow}>
      {UTILITY_LINKS.map((link) => (
        <TouchableOpacity
          key={link.label}
          style={styles.utilityLink}
          activeOpacity={0.7}
          onPress={() => onPress(link.route)}
        >
          <Text style={styles.utilityLinkText}>{link.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ─── Layout helper ─────────────────────────────────────────────────────

interface SlotLayout { x: number; y: number; w: number; h: number }

function computeMasonryLayout(count: number): { slots: SlotLayout[]; totalHeight: number } {
  const ROW_HEIGHT = GRID_CELL
  const grid: boolean[][] = []
  const ensureRow = (r: number) => {
    while (grid.length <= r) grid.push(new Array(GRID_COLS).fill(false))
  }
  const slots: SlotLayout[] = []

  for (let i = 0; i < count; i++) {
    const [cs, rs] = MASONRY_SPANS[i % MASONRY_SPANS.length]
    const colSpan = Math.min(cs, GRID_COLS)
    const rowSpan = rs
    let foundR = -1, foundC = -1
    outer: for (let r = 0; ; r++) {
      ensureRow(r + rowSpan - 1)
      for (let c = 0; c <= GRID_COLS - colSpan; c++) {
        let fits = true
        for (let dr = 0; dr < rowSpan && fits; dr++)
          for (let dc = 0; dc < colSpan && fits; dc++)
            if (grid[r + dr][c + dc]) fits = false
        if (fits) { foundR = r; foundC = c; break outer }
      }
      if (r > 50) break
    }
    if (foundR < 0) continue
    for (let dr = 0; dr < rowSpan; dr++)
      for (let dc = 0; dc < colSpan; dc++)
        grid[foundR + dr][foundC + dc] = true
    slots.push({
      x: foundC * (GRID_CELL + GRID_GAP),
      y: foundR * (ROW_HEIGHT + GRID_GAP),
      w: colSpan * GRID_CELL + (colSpan - 1) * GRID_GAP,
      h: rowSpan * ROW_HEIGHT + (rowSpan - 1) * GRID_GAP,
    })
  }
  const totalRows = grid.length
  return { slots, totalHeight: totalRows * ROW_HEIGHT + (totalRows - 1) * GRID_GAP }
}

// ─── Slot Reel (controlled single-spin tile) ─────────────────────────

function SlotReel({
  imageUrl,
  nextImageUrl,
  width,
  height,
  onPress,
  onSpinComplete,
}: {
  imageUrl: string
  nextImageUrl: string | null
  width: number
  height: number
  onPress: (url: string) => void
  onSpinComplete: () => void
}) {
  const [displayUrl, setDisplayUrl] = useState(imageUrl)
  const slideY = useRef(new Animated.Value(0)).current
  const spinning = useRef(false)

  // Keep display in sync when imageUrl prop changes externally (initial load)
  useEffect(() => {
    if (!spinning.current) setDisplayUrl(imageUrl)
  }, [imageUrl])

  // Trigger spin when a new nextImageUrl arrives
  useEffect(() => {
    if (!nextImageUrl || spinning.current || nextImageUrl === displayUrl) return
    spinning.current = true
    slideY.setValue(0)

    Animated.sequence([
      // Bounce up — anticipation
      Animated.spring(slideY, {
        toValue: 12,
        speed: 40,
        bounciness: 12,
        useNativeDriver: true,
      }),
      // Slide current image up out of frame
      Animated.timing(slideY, {
        toValue: -height,
        duration: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Swap to new image, position below
      setDisplayUrl(nextImageUrl)

      slideY.setValue(height)

      // Slide new image in with bounce landing
      Animated.spring(slideY, {
        toValue: 0,
        speed: 10,
        bounciness: 10,
        useNativeDriver: true,
      }).start(() => {
        spinning.current = false
        onSpinComplete()
      })
    })
  }, [nextImageUrl])

  return (
    <View style={{ width, height, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)' }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(displayUrl)}
        style={{ width, height }}
      >
        <Animated.View style={{ width, height, transform: [{ translateY: slideY }] }}>
          <Image
            source={{ uri: displayUrl }}
            style={{ width, height }}
            contentFit="cover"
          />
        </Animated.View>

        {/* 3D cylindrical gradient */}
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

// ─── Animated Masonry Grid ────────────────────────────────────────────

function MasonryGrid({
  images,
  onPress,
  fetchMore,
}: {
  images: string[]
  onPress: (url: string) => void
  fetchMore: () => Promise<string[]>
}) {
  const { slots, totalHeight } = useMemo(() => computeMasonryLayout(images.length), [images.length])
  const tileCount = Math.min(images.length, slots.length)

  // Current image shown in each tile + pending spin targets
  const [tileImages, setTileImages] = useState<string[]>(() => images.slice(0, tileCount))
  const [spinTarget, setSpinTarget] = useState<{ idx: number; url: string } | null>(null)

  // Reserve pool: images not currently visible in any tile
  const reservePool = useRef<string[]>([])
  useEffect(() => {
    const visible = new Set(tileImages)
    reservePool.current = images.filter(u => !visible.has(u))
  }, []) // Only on mount — we manage the pool manually after that

  // Track which slot each tile occupies (for position-swap animation)
  const tileSlots = useRef<number[]>(Array.from({ length: tileCount }, (_, i) => i)).current

  // Animated position values for each tile
  const animX = useRef<Animated.Value[]>(slots.slice(0, tileCount).map(s => new Animated.Value(s.x))).current
  const animY = useRef<Animated.Value[]>(slots.slice(0, tileCount).map(s => new Animated.Value(s.y))).current
  const isBusy = useRef(false) // Global lock: 1 animation at a time

  // Group tiles by slot dimensions for same-size swaps
  const sizeGroups = useMemo(() => {
    const groups: Record<string, number[]> = {}
    for (let i = 0; i < tileCount; i++) {
      const s = slots[tileSlots[i]]
      const key = `${s.w}x${s.h}`
        ; (groups[key] ??= []).push(i)
    }
    return Object.values(groups).filter(g => g.length >= 2)
  }, [tileCount, slots, tileSlots])

  const doSwap = useCallback(() => {
    if (sizeGroups.length === 0) { isBusy.current = false; return }
    const group = sizeGroups[Math.floor(Math.random() * sizeGroups.length)]
    const ai = Math.floor(Math.random() * group.length)
    let bi = Math.floor(Math.random() * (group.length - 1))
    if (bi >= ai) bi++
    const a = group[ai], b = group[bi]
    const slotA = tileSlots[a], slotB = tileSlots[b]

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
    // Pick a random tile
    const idx = Math.floor(Math.random() * tileCount)

    // Try to get an image from the reserve pool
    let nextUrl: string | undefined
    if (reservePool.current.length > 0) {
      const ri = Math.floor(Math.random() * reservePool.current.length)
      nextUrl = reservePool.current.splice(ri, 1)[0]
    }

    // If reserve is running low, fetch more in background
    if (reservePool.current.length < 5) {
      fetchMore().then(fresh => {
        const visible = new Set(tileImages)
        const existing = new Set(reservePool.current)
        for (const u of fresh) {
          if (!visible.has(u) && !existing.has(u)) reservePool.current.push(u)
        }
      }).catch(() => { })
    }

    if (!nextUrl) { isBusy.current = false; return }

    // Tell the SlotReel to spin
    setSpinTarget({ idx, url: nextUrl })
  }, [tileCount, tileImages, fetchMore])

  const handleSpinComplete = useCallback(() => {
    if (!spinTarget) return
    const { idx, url } = spinTarget
    // Return old image to reserve pool
    setTileImages(prev => {
      const old = prev[idx]
      reservePool.current.push(old)
      const next = [...prev]
      next[idx] = url
      return next
    })
    setSpinTarget(null)
    isBusy.current = false
  }, [spinTarget])

  // Single master timer: 1 animation every 3-4 seconds
  useEffect(() => {
    if (tileCount < 2) return
    const iv = setInterval(() => {
      if (isBusy.current) return
      isBusy.current = true
      // Alternate: ~40% position swap, ~60% image spin
      if (Math.random() < 0.4) {
        doSwap()
      } else {
        doSlotSpin()
      }
    }, 3000 + Math.random() * 1000)
    return () => clearInterval(iv)
  }, [tileCount, doSwap, doSlotSpin])

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
            />
          </Animated.View>
        )
      })}
    </View>
  )
}

// ─── Empty Gallery ─────────────────────────────────────────────────────

function EmptyGallery({ onAction }: { onAction: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconOuter}>
        <EmptySparkle />
        <View style={styles.emptyPlusBadge}>
          <PlusIcon />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Your gallery awaits</Text>
      <Text style={styles.emptySub}>
        Create your first product image and it will appear here.
      </Text>
      <TouchableOpacity style={styles.emptyCta} activeOpacity={0.8} onPress={onAction}>
        <LinearGradient
          colors={[ACCENT_VIOLET, '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <SparklesIcon />
        <Text style={styles.emptyCtaText}>Create your first image</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Loading Skeleton ──────────────────────────────────────────────────

function Skeleton() {
  const pulse = useRef(new Animated.Value(0.3)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <View style={styles.scrollContent}>
      <Animated.View style={[styles.skeletonHeader, { opacity: pulse }]} />
      {/* Stat bar skeleton */}
      <View style={styles.statBar}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Animated.View key={i} style={[styles.skeletonPill, { opacity: pulse }]} />
        ))}
      </View>
      {/* Bento grid skeleton */}
      <View style={styles.bentoGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[styles.bentoCard, { backgroundColor: 'rgba(255,255,255,0.04)' }, { opacity: pulse }]}
          />
        ))}
      </View>
      {/* Masonry skeleton */}
      <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
        <Animated.View style={[{ flex: 1, height: GRID_CELL * 2, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' }, { opacity: pulse }]} />
        <View style={{ flex: 1, gap: GRID_GAP }}>
          <Animated.View style={[{ flex: 1, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' }, { opacity: pulse }]} />
          <Animated.View style={[{ flex: 1, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' }, { opacity: pulse }]} />
        </View>
      </View>
    </View>
  )
}

// ─── Main Screen ───────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter()
  const { user } = useUser()
  const { balance, fetchCredits } = useCreditsStore()
  const { plan, fetchSubscription } = useSubscriptionStore()

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current

  useEffect(() => {
    fetchCredits()
    fetchSubscription()
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start()
  }, [])

  const { data: recentData, isLoading: loadingRecent } = useQuery({
    queryKey: queryKeys.recentCreations,
    queryFn: () => getRecentCreations(30, 0),
  })

  const recentImages = recentData?.images
  const fetchOffset = useRef(30)

  const fetchMoreImages = useCallback(async (): Promise<string[]> => {
    const offset = fetchOffset.current
    fetchOffset.current += 20
    const result = await getRecentCreations(20, offset)
    return result.images ?? []
  }, [])

  const planLabel = PLAN_LABELS[plan] ?? plan
  const firstName = user?.firstName || 'there'
  const hasImages = recentImages && recentImages.length > 0

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {loadingRecent && !recentImages ? (
          <Skeleton />
        ) : (
          <Animated.ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          >
            {/* ── Header ── */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={() => router.push('/account')}
                activeOpacity={0.7}
              >
                {user?.imageUrl ? (
                  <Image
                    source={{ uri: user.imageUrl }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                      {firstName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{firstName}&apos;s studio</Text>
              <TouchableOpacity
                style={styles.newBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/create')}
              >
                <LinearGradient
                  colors={[ACCENT_VIOLET, '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <PlusIcon />
                <Text style={styles.newBtnText}>New</Text>
              </TouchableOpacity>
            </View>

            {/* ── Stats Bar ── */}
            <StatBar
              credits={balance}
              planLabel={planLabel}
              onCreditsPress={() => router.push('/account/credits')}
              onPlanPress={() => router.push('/account/pricing')}
            />

            {/* ── Bento Grid ── */}
            <View style={styles.bentoGrid}>
              {BENTO_CARDS.map((card) => (
                <BentoCard
                  key={card.label}
                  label={card.label}
                  description={card.description}
                  preview={card.preview}
                  gradientColors={card.gradientColors}
                  pro={card.pro}
                  onPress={() => router.push(card.route)}
                />
              ))}
            </View>

            {/* ── Utility Row ── */}
            <UtilityRow onPress={(route) => router.push(route as any)} />

            {/* ── Section Header ── */}
            {hasImages && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Recent creations</Text>
                <TouchableOpacity
                  style={styles.viewAll}
                  activeOpacity={0.7}
                  onPress={() => router.push('/(tabs)/assets')}
                >
                  <Text style={styles.viewAllText}>View all</Text>
                  <ArrowRightIcon />
                </TouchableOpacity>
              </View>
            )}

            {/* ── Gallery ── */}
            {hasImages ? (
              <MasonryGrid
                images={recentImages}
                fetchMore={fetchMoreImages}
                onPress={(url) =>
                  router.push({
                    pathname: '/image-viewer',
                    params: {
                      urls: JSON.stringify([url]),
                      title: 'Recent Creation',
                    },
                  })
                }
              />
            ) : (
              <EmptyGallery onAction={() => router.push('/(tabs)/create')} />
            )}
          </Animated.ScrollView>
        )}
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: ACCENT_VIOLET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginLeft: 12,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  newBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Stat Bar
  statBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 11,
    color: MUTED,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // Bento Grid
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  bentoCard: {
    width: (SCREEN_WIDTH - 32 - 8) / 2,
    height: 150,
    aspectRatio: 16 / 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bentoImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bentoGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bentoContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  bentoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bentoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bentoBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bentoBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bentoDesc: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Utility Row
  utilityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  utilityLink: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  utilityLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    color: MUTED,
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: CARD_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyPlusBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: ACCENT_VIOLET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
    marginBottom: 24,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Skeleton
  skeletonHeader: {
    height: 28,
    width: 180,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
  },
  skeletonPill: {
    height: 34,
    width: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
})
