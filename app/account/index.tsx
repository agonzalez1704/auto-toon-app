import { useRef, useEffect } from 'react'
import {
  Animated,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useUser, useAuth } from '@clerk/clerk-expo'
import Svg, {
  Path as SvgPath,
  Circle,
  Rect,
} from 'react-native-svg'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { useCreditsStore } from '@/stores/use-credits-store'

const BRAND = '#8B5CF6'
const BRAND_CYAN = '#06B6D4'

// ─── Icons ──────────────────────────────────────────────────────────────

function CreditCardIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="20" height="14" rx="3" fill="none" stroke={BRAND} strokeWidth="2" />
      <SvgPath d="M2 10h20" stroke={BRAND} strokeWidth="2" />
    </Svg>
  )
}

function CoinSmallIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="#FBBF24" />
      <SvgPath d="M12 7v10M9 9.5l3-2.5 3 2.5" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  )
}

function ChevronRight() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

function LogoutIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
        stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────────

export default function AccountScreen() {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useAuth()
  const { plan } = useSubscriptionStore()
  const { balance } = useCreditsStore()

  const fadeAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start()
  }, [])

  const planLabel = plan === 'FREE' ? 'Free' : plan.charAt(0) + plan.slice(1).toLowerCase()
  const firstName = user?.firstName || user?.fullName || 'User'

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <Text style={styles.profileName}>{user?.fullName || firstName}</Text>
            <Text style={styles.profileEmail}>
              {user?.primaryEmailAddress?.emailAddress}
            </Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuGroup}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/account/pricing')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                <CreditCardIcon />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuLabel}>Subscription</Text>
                <Text style={styles.menuValue}>{planLabel} Plan</Text>
              </View>
              <ChevronRight />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/account/credits')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(251,191,36,0.12)' }]}>
                <CoinSmallIcon />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuLabel}>Credits</Text>
                <Text style={styles.menuValue}>
                  {balance !== null ? `${balance} available` : '...'}
                </Text>
              </View>
              <ChevronRight />
            </TouchableOpacity>
          </View>

          {/* Sign Out */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => signOut()}
            activeOpacity={0.7}
          >
            <LogoutIcon />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#193153',
  },
  safeArea: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Profile
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 24,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 14,
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
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
  },

  // Menu
  menuGroup: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 68,
  },

  // Sign out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
})
