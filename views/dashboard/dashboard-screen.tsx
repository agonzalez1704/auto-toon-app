/**
 * Dashboard — orchestrator.
 * Reads stores, owns query state, passes data + callbacks to dumb children.
 * Dependency Inversion: child components don't import router/stores.
 */
import { useCallback, useEffect, useRef } from 'react'
import { Animated, StatusBar, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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

          <BentoGrid cards={BENTO_CARDS} onCardPress={(route) => router.push(route as any)} />

          <UtilityRow links={UTILITY_LINKS} onPress={(route) => router.push(route as any)} />

          {hasImages && (
            <SectionHeader
              label="Recent creations"
              actionLabel="View all"
              onActionPress={() => router.push('/(tabs)/assets')}
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
 * Ambient page backdrop — subtle violet radial vignette over deep slate.
 * Sells the liquid-glass depth (BlurView surfaces have something to blur).
 */
function PageBackdrop() {
  return (
    <>
      <View style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['#1E1740', '#16102A', '#0E0820']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Top-left violet glow orb */}
      <View style={[styles.orb, styles.orbTop]} />
      {/* Bottom-right indigo glow orb */}
      <View style={[styles.orb, styles.orbBottom]} />
    </>
  )
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
  orb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.18,
  },
  orbTop: {
    top: -80,
    left: -80,
    backgroundColor: theme.palette.violet,
  },
  orbBottom: {
    bottom: -80,
    right: -80,
    backgroundColor: theme.palette.fuchsia,
  },
})
