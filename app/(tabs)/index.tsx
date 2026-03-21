import { useEffect, useRef } from 'react'
import {
  Animated,
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

const BRAND = '#8B5CF6'
const BRAND_CYAN = '#06B6D4'

// ─── SVG Icons ──────────────────────────────────────────────────────────

function CreditIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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
      <Rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke={BRAND_CYAN} strokeWidth="2" />
      <SvgPath d="M3 10h18" stroke={BRAND_CYAN} strokeWidth="2" />
      <Rect x="6" y="14" width="5" height="2" rx="1" fill={BRAND_CYAN} opacity={0.6} />
    </Svg>
  )
}

function SparkleIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
        fill="#FBBF24"
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

function TipBulbIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M9 21h6M12 3a6 6 0 014 10.5V17H8v-3.5A6 6 0 0112 3z"
        fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
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

// ─── Main Screen ────────────────────────────────────────────────────────

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
              <Text style={styles.greeting}>Welcome back</Text>
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
              <View style={styles.statIconWrap}>
                <CreditIcon />
              </View>
              <Text style={styles.statLabel}>Credits</Text>
              <Text style={styles.statValue}>
                {balance !== null ? balance : '--'}
              </Text>
              <View style={styles.statAction}>
                <Text style={styles.statActionText}>Buy More</Text>
                <ChevronRight color={BRAND} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push('/account/pricing')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconWrap, { backgroundColor: 'rgba(6,182,212,0.12)' }]}>
                <PlanIcon />
              </View>
              <Text style={styles.statLabel}>Plan</Text>
              <Text style={styles.statValue}>{planLabel}</Text>
              {plan === 'FREE' && (
                <View style={styles.statAction}>
                  <Text style={[styles.statActionText, { color: BRAND_CYAN }]}>Upgrade</Text>
                  <ChevronRight color={BRAND_CYAN} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Create CTA */}
          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => router.push('/(tabs)/create')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[BRAND, '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.ctaContent}>
              <View style={styles.ctaIconWrap}>
                <CameraIcon />
              </View>
              <View style={styles.ctaTextWrap}>
                <Text style={styles.ctaTitle}>Enhance a Product</Text>
                <Text style={styles.ctaSub}>Upload a photo to get started</Text>
              </View>
            </View>
          </TouchableOpacity>

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
              <ActivityIndicator color={BRAND} style={{ marginTop: 24 }} />
            ) : recentImages && recentImages.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
                {recentImages.map((url, i) => (
                  <View key={i} style={styles.recentCard}>
                    <Image
                      source={{ uri: url }}
                      style={styles.recentImage}
                      contentFit="cover"
                      transition={200}
                    />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <SparkleIcon />
                <Text style={styles.emptyTitle}>No creations yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap Enhance a Product above to get started
                </Text>
              </View>
            )}
          </View>

          {/* Tips */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>Pro Tips</Text>
            <View style={styles.tipCard}>
              <View style={styles.tipIconWrap}>
                <TipBulbIcon />
              </View>
              <View style={styles.tipTextWrap}>
                <Text style={styles.tipTitle}>Use a clean background</Text>
                <Text style={styles.tipSub}>
                  Products on white or plain backgrounds get the best results.
                </Text>
              </View>
            </View>
            <View style={styles.tipCard}>
              <View style={styles.tipIconWrap}>
                <TipBulbIcon />
              </View>
              <View style={styles.tipTextWrap}>
                <Text style={styles.tipTitle}>Try Instagram Feed</Text>
                <Text style={styles.tipSub}>
                  Generate a 3x3 grid perfect for social media carousels.
                </Text>
              </View>
            </View>
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
    backgroundColor: '#0a0a0f',
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
    borderColor: 'rgba(255,255,255,0.12)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: BRAND,
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
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  statAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  statActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND,
  },

  // CTA
  ctaCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 28,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  ctaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaTextWrap: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ctaSub: {
    fontSize: 13,
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
    color: BRAND,
  },

  // Recent
  recentList: {
    gap: 10,
  },
  recentCard: {
    width: 130,
    height: 170,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  recentImage: {
    width: '100%',
    height: '100%',
  },

  // Empty
  emptyState: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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

  // Tips
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  tipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(251,191,36,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  tipTextWrap: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  tipSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 17,
    marginTop: 2,
  },
})
