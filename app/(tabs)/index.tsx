import { useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'
import Colors from '@/constants/Colors'
import { useThemeColors } from '@/lib/useThemeColors'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { getRecentCreations } from '@/lib/api'
import { queryKeys } from '@/lib/query'

export default function DashboardScreen() {
  const colors = useThemeColors()
  const router = useRouter()
  const { user } = useUser()

  const { balance, fetchCredits } = useCreditsStore()
  const { plan, fetchSubscription } = useSubscriptionStore()

  // Fetch credits and subscription on mount
  useEffect(() => {
    fetchCredits()
    fetchSubscription()
  }, [])

  // Fetch recent creations
  const { data: recentImages, isLoading: loadingRecent } = useQuery({
    queryKey: queryKeys.recentCreations,
    queryFn: getRecentCreations,
  })

  const planLabel = plan === 'FREE' ? 'Free' : plan.charAt(0) + plan.slice(1).toLowerCase()

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
          </Text>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Dashboard</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {/* Credits Card */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            onPress={() => router.push('/account/credits')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Credits</Text>
            <Text style={[styles.statValue, { color: colors.tint }]}>
              {balance !== null ? balance : '...'}
            </Text>
            <Text style={[styles.statAction, { color: colors.tint }]}>Buy More</Text>
          </TouchableOpacity>

          {/* Plan Card */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            onPress={() => router.push('/account/pricing')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Plan</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{planLabel}</Text>
            {plan === 'FREE' && (
              <Text style={[styles.statAction, { color: colors.tint }]}>Upgrade</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Create */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: Colors.brand }]}
          onPress={() => router.push('/(tabs)/create')}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>Enhance a Product</Text>
          <Text style={styles.createButtonSub}>Upload a photo to get started</Text>
        </TouchableOpacity>

        {/* Recent Creations */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Creations</Text>
          {loadingRecent ? (
            <ActivityIndicator color={colors.tint} style={{ marginTop: 20 }} />
          ) : recentImages && recentImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
              {recentImages.map((url, i) => (
                <View
                  key={i}
                  style={[styles.recentCard, { borderColor: colors.surfaceBorder }]}
                >
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
            <View style={[styles.emptyState, { borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No creations yet. Tap "Enhance a Product" to get started!
              </Text>
            </View>
          )}
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tips</Text>
          <View style={[styles.tipCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.tipTitle, { color: colors.text }]}>Use a clean background</Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Products on white or plain backgrounds get the best AI enhancements.
            </Text>
          </View>
          <View style={[styles.tipCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.tipTitle, { color: colors.text }]}>Try Instagram Feed</Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Generate a 3x3 grid perfect for social media carousels.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  welcomeSection: { marginBottom: 24 },
  greeting: { fontSize: 14, fontWeight: '500' },
  pageTitle: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statAction: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  createButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 28,
  },
  createButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  createButtonSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  recentScroll: { marginHorizontal: -4 },
  recentCard: {
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 4,
    borderWidth: 1,
  },
  recentImage: { width: '100%', height: '100%' },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
  tipCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  tipTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  tipText: { fontSize: 13, lineHeight: 18 },
})
