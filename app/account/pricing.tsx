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
  Path as SvgPath,
  Circle,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg'
import { createCheckoutSession } from '@/lib/api'
import { CONFIG } from '@/lib/config'
import { useSubscriptionStore } from '@/stores/use-subscription-store'

const BRAND = '#8B5CF6'
const BRAND_CYAN = '#06B6D4'

// ─── Icons ──────────────────────────────────────────────────────────────

function CheckIcon({ color = BRAND_CYAN }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M5 13l4 4L19 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function CrownIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M2 20h20L19 8l-5 5-2-7-2 7-5-5-3 12z"
        fill="#FBBF24"
        stroke="#F59E0B"
        strokeWidth="1"
      />
    </Svg>
  )
}

function StarIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
        fill={BRAND}
      />
    </Svg>
  )
}

// ─── Plan Data ──────────────────────────────────────────────────────────

interface Plan {
  name: string
  plan: string
  period: string
  price: string
  sub: string
  credits: number
  featured?: boolean
  features: string[]
  savings?: string
}

const PLANS: Plan[] = [
  {
    name: 'Weekly',
    plan: 'WEEKLY',
    period: 'weekly',
    price: '$5',
    sub: '/week',
    credits: 25,
    features: ['25 credits per week', 'All AI models', 'Standard support'],
  },
  {
    name: 'Starter',
    plan: 'STARTER',
    period: 'monthly',
    price: '$16',
    sub: '/mo',
    credits: 100,
    features: ['100 credits per month', 'All AI models', 'Priority support', 'Buy extra credit packs'],
    savings: 'Save 20%',
  },
  {
    name: 'Pro',
    plan: 'PRO',
    period: 'monthly',
    price: '$39',
    sub: '/mo',
    credits: 300,
    featured: true,
    features: ['300 credits per month', 'All AI models', 'Priority support', 'Buy extra credit packs', 'Early access to new features'],
    savings: 'Best value',
  },
  {
    name: 'Business',
    plan: 'BUSINESS',
    period: 'monthly',
    price: '$79',
    sub: '/mo',
    credits: 700,
    features: ['700 credits per month', 'All AI models', 'Priority support', 'Buy extra credit packs', 'Early access to new features', 'Dedicated support'],
  },
]

// ─── Main Screen ────────────────────────────────────────────────────────

export default function PricingScreen() {
  const { plan: currentPlan } = useSubscriptionStore()
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start()
  }, [])

  const handleSubscribe = async (plan: string, period: string) => {
    try {
      const returnUrl = `${CONFIG.APP_SCHEME}://account?success=true`
      const { url } = await createCheckoutSession(plan, period, returnUrl)
      await WebBrowser.openBrowserAsync(url)
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to start checkout')
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
          {/* Header */}
          <View style={styles.header}>
            <CrownIcon />
            <Text style={styles.title}>Choose Your Plan</Text>
            <Text style={styles.subtitle}>
              Unlock more credits and premium features
            </Text>
          </View>

          {/* Plans */}
          {PLANS.map((p) => {
            const isCurrentPlan = currentPlan === p.plan
            const isFeatured = p.featured

            return (
              <View key={p.plan} style={styles.planCardOuter}>
                {/* Featured glow */}
                {isFeatured && <View style={styles.featuredGlow} />}

                <TouchableOpacity
                  style={[
                    styles.planCard,
                    isFeatured && styles.featuredCard,
                    isCurrentPlan && styles.currentPlanCard,
                  ]}
                  onPress={() => !isCurrentPlan && handleSubscribe(p.plan, p.period)}
                  activeOpacity={isCurrentPlan ? 1 : 0.7}
                >
                  {/* Badge */}
                  {isFeatured && (
                    <View style={styles.popularBadge}>
                      <LinearGradient
                        colors={[BRAND, '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <StarIcon />
                      <Text style={styles.popularText}>Most Popular</Text>
                    </View>
                  )}

                  {p.savings && !isFeatured && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>{p.savings}</Text>
                    </View>
                  )}

                  {/* Plan header */}
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{p.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={[styles.planPrice, isFeatured && { color: '#FFFFFF' }]}>
                        {p.price}
                      </Text>
                      <Text style={styles.planPeriod}>{p.sub}</Text>
                    </View>
                    <Text style={styles.planCredits}>{p.credits} credits</Text>
                  </View>

                  {/* Divider */}
                  <View style={styles.divider} />

                  {/* Features */}
                  <View style={styles.featureList}>
                    {p.features.map((feat, i) => (
                      <View key={i} style={styles.featureRow}>
                        <CheckIcon color={isFeatured ? BRAND : BRAND_CYAN} />
                        <Text style={styles.featureText}>{feat}</Text>
                      </View>
                    ))}
                  </View>

                  {/* CTA */}
                  {isCurrentPlan ? (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentText}>Current Plan</Text>
                    </View>
                  ) : (
                    <View style={[styles.selectButton, isFeatured && styles.selectButtonFeatured]}>
                      {isFeatured ? (
                        <LinearGradient
                          colors={[BRAND, '#7C3AED']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                      ) : null}
                      <Text style={[styles.selectText, isFeatured && { fontWeight: '700' }]}>
                        {isFeatured ? 'Get Pro' : 'Select Plan'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )
          })}

          {/* Footer note */}
          <Text style={styles.footerNote}>
            Cancel anytime. All plans include access to every AI model.
          </Text>
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
    paddingBottom: 50,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },

  // Plan cards
  planCardOuter: {
    marginBottom: 14,
    position: 'relative',
  },
  featuredGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    backgroundColor: BRAND,
    opacity: 0.15,
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    overflow: 'hidden',
  },
  featuredCard: {
    borderColor: BRAND,
    borderWidth: 1.5,
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
  currentPlanCard: {
    borderColor: BRAND_CYAN,
    borderWidth: 1.5,
  },

  // Badges
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
    marginBottom: 14,
    overflow: 'hidden',
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(6,182,212,0.15)',
    marginBottom: 12,
  },
  savingsText: {
    color: BRAND_CYAN,
    fontSize: 11,
    fontWeight: '700',
  },

  // Plan info
  planHeader: {
    marginBottom: 0,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planPeriod: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  planCredits: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_CYAN,
    marginTop: 4,
  },

  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },

  // Features
  featureList: {
    gap: 10,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    flex: 1,
  },

  // Select button
  selectButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  selectButtonFeatured: {
    borderWidth: 0,
  },
  selectText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Current plan
  currentBadge: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(6,182,212,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.3)',
  },
  currentText: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND_CYAN,
  },

  // Footer
  footerNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 8,
  },
})
