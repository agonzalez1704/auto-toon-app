import { useEffect, useRef } from 'react'
import {
  Animated,
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
import { CONFIG } from '@/lib/config'

// Aurora Blossom palette
const AURORA_NAVY = '#193153'
const AURORA_TEAL = '#0B5777'
const AURORA_MAGENTA = '#EB96FF'
const AURORA_PINK = '#F9D4E0'

// ─── Helpers ─────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const FEATURES = [
  {
    title: 'Instagram Feed',
    description: 'Generate a 3x3 grid for carousels',
    preview: 'instagram_feed.png',
    route: '/(tabs)/create' as const,
  },
  {
    title: 'Image Restore',
    description: 'Upscale and repair old photos',
    preview: 'pro-photo.png',
    route: '/(tabs)/restore' as const,
  },
  {
    title: 'Creative Elements',
    description: 'Artistic product compositions',
    preview: 'elements-image.png',
    route: '/(tabs)/create' as const,
  },
]

// ─── SVG Icons ──────────────────────────────────────────────────────────

function CreditIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Defs>
        <SvgLinearGradient id="creditGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#F59E0B" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx="12" cy="12" r="10" fill="url(#creditGrad)" />
      <SvgPath d="M12 7v10M9 9.5l3-2.5 3 2.5" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  )
}

function PlanIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke={AURORA_MAGENTA} strokeWidth="2" />
      <SvgPath d="M3 10h18" stroke={AURORA_MAGENTA} strokeWidth="2" />
      <Rect x="6" y="14" width="5" height="2" rx="1" fill={AURORA_MAGENTA} opacity={0.6} />
    </Svg>
  )
}

function SparkleIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
        fill={AURORA_PINK}
      />
    </Svg>
  )
}

function CameraIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="4" fill="none" stroke="#FFFFFF" strokeWidth="2" />
    </Svg>
  )
}

function RestoreCTAIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1"
      />
    </Svg>
  )
}

function ChevronRight({ color = 'rgba(255,255,255,0.4)' }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M9 18l6-6-6-6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

function ProBadge({ label }: { label: string }) {
  return (
    <View style={styles.proBadge}>
      <LinearGradient
        colors={[AURORA_MAGENTA, AURORA_TEAL]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={styles.proBadgeText}>{label}</Text>
    </View>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter()
  const { user } = useUser()
  const { balance, fetchCredits } = useCreditsStore()
  const { plan, fetchSubscription } = useSubscriptionStore()

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    fetchCredits()
    fetchSubscription()
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start()
  }, [])

  const { data: recentImages, isLoading: loadingRecent } = useQuery({
    queryKey: queryKeys.recentCreations,
    queryFn: getRecentCreations,
  })

  const planLabel = plan === 'FREE' ? 'Free' : plan.charAt(0) + plan.slice(1).toLowerCase()
  const firstName = user?.firstName || 'there'

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* Welcome Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{firstName}</Text>
            </View>
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
          </View>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push('/account/credits')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(251,191,36,0.06)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.statIconWrapCredits}>
                <CreditIcon />
              </View>
              <Text style={styles.statLabel}>Credits</Text>
              <Text style={styles.statValueLarge}>
                {balance !== null ? balance : '--'}
              </Text>
              <View style={styles.statAction}>
                <Text style={styles.statActionText}>Buy More</Text>
                <ChevronRight color={AURORA_MAGENTA} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push('/account/pricing')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(235,150,255,0.06)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={[styles.statIconWrap, { backgroundColor: 'rgba(235,150,255,0.12)' }]}>
                <PlanIcon />
              </View>
              <Text style={styles.statLabel}>Plan</Text>
              {plan === 'FREE' ? (
                <Text style={styles.statValue}>{planLabel}</Text>
              ) : (
                <ProBadge label={planLabel} />
              )}
              <View style={styles.statAction}>
                <Text style={[styles.statActionText, { color: AURORA_PINK }]}>
                  {plan === 'FREE' ? 'Upgrade' : 'Manage'}
                </Text>
                <ChevronRight color={AURORA_PINK} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/create')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[AURORA_MAGENTA, '#9333EA', AURORA_TEAL]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.quickActionIconWrap}>
                <CameraIcon />
              </View>
              <Text style={styles.quickActionTitle}>Enhance Product</Text>
              <Text style={styles.quickActionSub}>AI-powered photos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/restore')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[AURORA_TEAL, '#0891B2', AURORA_NAVY]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.quickActionIconWrap}>
                <RestoreCTAIcon />
              </View>
              <Text style={styles.quickActionTitle}>Restore Image</Text>
              <Text style={styles.quickActionSub}>Upscale & enhance</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Creations */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Creations</Text>
              {recentImages && recentImages.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/assets')} activeOpacity={0.7}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            {loadingRecent ? (
              <ActivityIndicator color={AURORA_MAGENTA} style={{ marginTop: 24 }} />
            ) : recentImages && recentImages.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
                {recentImages.map((url, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.recentCard}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push({
                        pathname: '/image-viewer',
                        params: {
                          urls: JSON.stringify([url]),
                          title: 'Recent Creation',
                        },
                      })
                    }
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.recentImage}
                      contentFit="cover"
                      transition={200}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(25,49,83,0.6)']}
                      style={styles.recentOverlay}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <SparkleIcon />
                <Text style={styles.emptyTitle}>No creations yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap Enhance or Restore above to get started
                </Text>
              </View>
            )}
          </View>

          {/* Explore Features */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>Explore Features</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featureList}
            >
              {FEATURES.map((feature, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.featureCard}
                  onPress={() => router.push(feature.route)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: `${CONFIG.API_BASE_URL}/previews/${feature.preview}` }}
                    style={styles.featureImage}
                    contentFit="cover"
                    transition={200}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(25,49,83,0.85)']}
                    style={styles.featureOverlay}
                  />
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDesc}>{feature.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AURORA_NAVY,
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
    marginBottom: 28,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(235,150,255,0.2)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: AURORA_MAGENTA,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(235,150,255,0.08)',
    padding: 16,
    overflow: 'hidden',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(235,150,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconWrapCredits: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(251,191,36,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statValueLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  statActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: AURORA_MAGENTA,
  },

  // Pro Badge
  proBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  proBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    padding: 18,
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickActionSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: AURORA_PINK,
  },

  // Recent
  recentList: {
    gap: 10,
  },
  recentCard: {
    width: 140,
    height: 185,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(235,150,255,0.1)',
  },
  recentImage: {
    width: '100%',
    height: '100%',
  },
  recentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },

  // Empty
  emptyState: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(235,150,255,0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 4,
  },

  // Explore Features
  featureList: {
    gap: 12,
  },
  featureCard: {
    width: 200,
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(235,150,255,0.1)',
  },
  featureImage: {
    width: '100%',
    height: '100%',
  },
  featureOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  featureInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  featureDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
})
