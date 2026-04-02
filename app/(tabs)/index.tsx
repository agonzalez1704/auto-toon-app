import { useEffect, useRef } from 'react'
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'
import Svg, {
  Circle,
  Defs,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
} from 'react-native-svg'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { getRecentCreations } from '@/lib/api'
import { queryKeys } from '@/lib/query'

// ─── Palette ───────────────────────────────────────────────────────────
const BG = '#0F0F13'
const CARD_BG = 'rgba(255,255,255,0.04)'
const CARD_BORDER = 'rgba(255,255,255,0.06)'
const MUTED = 'rgba(255,255,255,0.45)'
const ACCENT_VIOLET = '#8B5CF6'

const SCREEN_WIDTH = Dimensions.get('window').width
const GRID_GAP = 4
const GRID_COLS = 2
const GRID_CELL = (SCREEN_WIDTH - 40 - GRID_GAP) / GRID_COLS

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

// ─── Quick links config ────────────────────────────────────────────────
const QUICK_LINKS = [
  {
    label: 'Enhance',
    route: '/(tabs)/create' as const,
    bg: 'rgba(251,146,60,0.12)',
    border: 'rgba(251,146,60,0.25)',
    text: '#FB923C',
  },
  {
    label: 'Restore',
    route: '/(tabs)/restore' as const,
    bg: 'rgba(34,211,238,0.12)',
    border: 'rgba(34,211,238,0.25)',
    text: '#22D3EE',
  },
  {
    label: 'Models',
    route: '/(tabs)/models' as const,
    bg: 'rgba(236,72,153,0.12)',
    border: 'rgba(236,72,153,0.25)',
    text: '#EC4899',
  },
  {
    label: 'Assets',
    route: '/(tabs)/assets' as const,
    bg: 'rgba(45,212,191,0.12)',
    border: 'rgba(45,212,191,0.25)',
    text: '#2DD4BF',
  },
  {
    label: 'Video',
    route: '/video-generator' as const,
    bg: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.25)',
    text: '#8B5CF6',
  },
  {
    label: 'Pricing',
    route: '/account/pricing' as const,
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    text: '#10B981',
  },
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

// ─── Stat Pill ─────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
  pillBg,
  pillBorder,
  pillText,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  pillBg: string
  pillBorder: string
  pillText: string
  onPress?: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: pillBg, borderColor: pillBorder }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.pillLabel, { color: pillText }]}>{label}</Text>
      <Text style={[styles.pillValue, { color: pillText }]}>{value}</Text>
    </TouchableOpacity>
  )
}

// ─── Quick Link Pill ───────────────────────────────────────────────────

function QuickLinkPill({
  label,
  bg,
  border,
  text,
  onPress,
}: {
  label: string
  bg: string
  border: string
  text: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: bg, borderColor: border }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={[styles.pillLinkLabel, { color: text }]}>{label}</Text>
      <ArrowRightIcon color={text} />
    </TouchableOpacity>
  )
}

// ─── Masonry Grid ──────────────────────────────────────────────────────

function MasonryGrid({
  images,
  onPress,
}: {
  images: string[]
  onPress: (url: string) => void
}) {
  // Build a simple CSS-grid-like layout using absolute positioning
  // Each cell is GRID_CELL x GRID_CELL, with spans doubling size
  const ROW_HEIGHT = GRID_CELL

  // Occupy a 2D grid tracker
  const grid: boolean[][] = []
  const ensureRow = (r: number) => {
    while (grid.length <= r) grid.push(new Array(GRID_COLS).fill(false))
  }

  const placed: {
    url: string
    x: number
    y: number
    w: number
    h: number
  }[] = []

  for (let i = 0; i < images.length; i++) {
    const [cs, rs] = MASONRY_SPANS[i % MASONRY_SPANS.length]
    const colSpan = Math.min(cs, GRID_COLS)
    const rowSpan = rs

    // Find first free slot that fits
    let foundR = -1
    let foundC = -1
    outer: for (let r = 0; ; r++) {
      ensureRow(r + rowSpan - 1)
      for (let c = 0; c <= GRID_COLS - colSpan; c++) {
        let fits = true
        for (let dr = 0; dr < rowSpan && fits; dr++) {
          for (let dc = 0; dc < colSpan && fits; dc++) {
            if (grid[r + dr][c + dc]) fits = false
          }
        }
        if (fits) {
          foundR = r
          foundC = c
          break outer
        }
      }
      if (r > 50) break // safety
    }

    if (foundR < 0) continue

    // Mark cells
    for (let dr = 0; dr < rowSpan; dr++) {
      for (let dc = 0; dc < colSpan; dc++) {
        grid[foundR + dr][foundC + dc] = true
      }
    }

    placed.push({
      url: images[i],
      x: foundC * (GRID_CELL + GRID_GAP),
      y: foundR * (ROW_HEIGHT + GRID_GAP),
      w: colSpan * GRID_CELL + (colSpan - 1) * GRID_GAP,
      h: rowSpan * ROW_HEIGHT + (rowSpan - 1) * GRID_GAP,
    })
  }

  const totalRows = grid.length
  const totalHeight = totalRows * ROW_HEIGHT + (totalRows - 1) * GRID_GAP

  return (
    <View style={{ height: totalHeight, position: 'relative' }}>
      {placed.map((item, i) => (
        <TouchableOpacity
          key={i}
          activeOpacity={0.85}
          onPress={() => onPress(item.url)}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            width: item.w,
            height: item.h,
            borderRadius: 10,
            overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.03)',
          }}
        >
          <Image
            source={{ uri: item.url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.45)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0.5, y: 1 }}
          />
        </TouchableOpacity>
      ))}
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
      <View style={styles.pillsRow}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Animated.View key={i} style={[styles.skeletonPill, { opacity: pulse }]} />
        ))}
      </View>
      <View style={{ height: 16 }} />
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

  const { data: recentImages, isLoading: loadingRecent } = useQuery({
    queryKey: queryKeys.recentCreations,
    queryFn: getRecentCreations,
  })

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

            {/* ── Stats Pills ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
            >
              <StatPill
                icon={<CoinsIcon />}
                label="Credits"
                value={balance !== null ? balance : '--'}
                pillBg="rgba(245,158,11,0.10)"
                pillBorder="rgba(245,158,11,0.22)"
                pillText="#FBBF24"
                onPress={() => router.push('/account/credits')}
              />
              <StatPill
                icon={<SparklesIcon />}
                label="Plan"
                value={planLabel}
                pillBg="rgba(139,92,246,0.10)"
                pillBorder="rgba(139,92,246,0.22)"
                pillText="#A78BFA"
                onPress={() => router.push('/account/pricing')}
              />

              {/* Separator */}
              <View style={styles.separator} />

              {/* Quick Links */}
              {QUICK_LINKS.map((link) => (
                <QuickLinkPill
                  key={link.label}
                  label={link.label}
                  bg={link.bg}
                  border={link.border}
                  text={link.text}
                  onPress={() => router.push(link.route)}
                />
              ))}
            </ScrollView>

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
    padding: 20,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginLeft: 10,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  newBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Pills
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    marginBottom: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillLinkLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'center',
    marginHorizontal: 4,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: MUTED,
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
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
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
