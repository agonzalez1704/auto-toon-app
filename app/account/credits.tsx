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
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as WebBrowser from 'expo-web-browser'
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path as SvgPath,
} from 'react-native-svg'
import { useCreditsStore } from '@/stores/use-credits-store'
import { purchaseCredits } from '@/lib/api'
import { CONFIG } from '@/lib/config'

const BRAND = '#8B5CF6'

function CoinIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Defs>
        <SvgLinearGradient id="coinG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx="24" cy="24" r="22" fill="url(#coinG)" />
      <Circle cx="24" cy="24" r="17" fill="none" stroke="#FCD34D" strokeWidth="1.5" opacity={0.5} />
      <SvgPath
        d="M24 12 L26 18 L32 18 L27 22 L29 28 L24 24 L19 28 L21 22 L16 18 L22 18 Z"
        fill="#FEF3C7" opacity={0.9}
      />
    </Svg>
  )
}

function LockIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"
        stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"
      />
    </Svg>
  )
}

const PACKS = [
  { id: 'micro', credits: 30, price: '$5.99', note: 'Available to all', locked: false },
  { id: 'small', credits: 100, price: '$19.99', note: 'Subscribers only', locked: true },
  { id: 'medium', credits: 200, price: '$34.99', note: 'Subscribers only', locked: true },
  { id: 'large', credits: 400, price: '$59.99', note: 'Subscribers only', locked: true },
]

export default function CreditsScreen() {
  const { balance } = useCreditsStore()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start()
  }, [])

  const handlePurchase = async (packId: string) => {
    try {
      const returnUrl = `${CONFIG.APP_SCHEME}://account/credits?success=true`
      const { url } = await purchaseCredits(packId, returnUrl)
      await WebBrowser.openBrowserAsync(url)
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to start purchase')
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Card */}
          <Animated.View style={[styles.balanceCard, { transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient
              colors={['rgba(139,92,246,0.15)', 'rgba(6,182,212,0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <CoinIcon />
            <Text style={styles.balanceValue}>
              {balance !== null ? balance : '--'}
            </Text>
            <Text style={styles.balanceLabel}>credits available</Text>
          </Animated.View>

          {/* Packs */}
          <Text style={styles.sectionTitle}>Buy Credits</Text>

          {PACKS.map((pack) => (
            <TouchableOpacity
              key={pack.id}
              style={styles.packCard}
              onPress={() => handlePurchase(pack.id)}
              activeOpacity={0.7}
            >
              <View style={styles.packLeft}>
                <Text style={styles.packCredits}>{pack.credits} credits</Text>
                <View style={styles.packNoteRow}>
                  {pack.locked && <LockIcon />}
                  <Text style={styles.packNote}>{pack.note}</Text>
                </View>
              </View>
              <View style={styles.priceTag}>
                <Text style={styles.packPrice}>{pack.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  )
}

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

  // Balance
  balanceCard: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 28,
    overflow: 'hidden',
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },

  // Packs
  packCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 10,
  },
  packLeft: {
    gap: 4,
  },
  packCredits: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  packNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  packNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  priceTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  packPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND,
  },
})
