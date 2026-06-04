/**
 * Dashboard — orchestrator.
 * Reads stores, owns query state, passes data + callbacks to dumb children.
 * Dependency Inversion: child components don't import router/stores.
 */
import { useCallback, useEffect, useRef } from 'react'
import { Animated, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { LinearGradient } from 'expo-linear-gradient'
import { useUser } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { theme } from '@/constants/theme'
import { getRecentCreations } from '@/lib/api'
import { queryKeys } from '@/lib/query'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'

import { Header } from './components/header'
import { StatBar } from './components/stat-bar'
import { BentoGrid } from './components/bento-grid'
import { UtilityRow } from './components/utility-row'
import { SectionHeader } from './components/section-header'
import { MasonryGrid } from './components/masonry-grid'
import { EmptyGallery } from './components/empty-gallery'
import { DashboardSkeleton } from './components/skeleton'
import { BENTO_CARDS, UTILITY_LINKS, PLAN_LABELS } from './data'

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
  const hasImages = !!recentImages && recentImages.length > 0

  if (loadingRecent && !recentImages) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <PageBackdrop />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <DashboardSkeleton />
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <PageBackdrop />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <Header
            firstName={firstName}
            avatarUrl={user?.imageUrl}
            onAvatarPress={() => router.push('/account')}
            onNewPress={() => router.push('/(tabs)/create')}
          />

          <StatBar
            credits={balance}
            planLabel={planLabel}
            onCreditsPress={() => router.push('/account/credits')}
            onPlanPress={() => router.push('/account/pricing')}
          />

          {/* Pay-Per-Use upsell banner — shown on iOS for users not yet on
              PPU. Apple guideline: this is an external account-management
              link (no in-app purchase processing), so the button opens the
              web account portal. On non-iOS we leave Stripe checkout in the
              existing pricing screen and don't surface the banner here. */}
          {Platform.OS === 'ios' && plan !== 'PAYPERUSE' && (
            <TouchableOpacity
              style={ppuStyles.banner}
              activeOpacity={0.85}
              onPress={async () => {
                await WebBrowser.openBrowserAsync('https://auto-toon.com/dashboard?subscribe=payperuse')
              }}
            >
              <LinearGradient
                colors={['#8B5CF6', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={ppuStyles.bannerInner}>
                <View style={{ flex: 1 }}>
                  <View style={ppuStyles.bannerTopRow}>
                    <Text style={ppuStyles.bannerBadge}>RECOMMENDED</Text>
                  </View>
                  <Text style={ppuStyles.bannerTitle}>Switch to Pay Per Use</Text>
                  <Text style={ppuStyles.bannerSub}>
                    No subscription. Only pay for what you generate. Activate from your web account.
                  </Text>
                </View>
                <Text style={ppuStyles.bannerCta}>Open ›</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.toolsHeader}>
            <Text style={styles.toolsEyebrow}>STUDIO</Text>
            <Text style={styles.toolsTitle}>Your power tools</Text>
            <Text style={styles.toolsSub}>Five AI engines. Tap one to start.</Text>
          </View>

          <BentoGrid cards={BENTO_CARDS} onCardPress={(route) => router.push(route as any)} />

          <UtilityRow links={UTILITY_LINKS} onPress={(route) => router.push(route as any)} />

          {hasImages && (
            <SectionHeader
              label="Recent creations"
              actionLabel="View all"
              onActionPress={() => router.push('/assets')}
            />
          )}

          {hasImages ? (
            <MasonryGrid
              images={recentImages!}
              fetchMore={fetchMoreImages}
              onPress={(url) =>
                router.push({
                  pathname: '/image-viewer',
                  params: { urls: JSON.stringify([url]), title: 'Recent Creation' },
                })
              }
            />
          ) : (
            <EmptyGallery onAction={() => router.push('/(tabs)/create')} />
          )}
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  )
}

/**
 * Page backdrop — flat warm-slate. Content (user images) provides color.
 * Previous violet vignette + glow orbs removed per UI revamp Phase 2.
 */
function PageBackdrop() {
  return <View style={StyleSheet.absoluteFillObject} />
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  safeArea: { flex: 1 },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['4xl'],
  },
  toolsHeader: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  toolsEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: theme.colors.accent,
    marginBottom: theme.spacing.xs,
  },
  toolsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  toolsSub: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
})

const ppuStyles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 18,
    overflow: 'hidden',
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bannerBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1f1300',
    backgroundColor: '#FBBF24',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
  },
  bannerCta: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingLeft: 4,
  },
})
