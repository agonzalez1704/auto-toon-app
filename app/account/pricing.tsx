import { useRef, useEffect, useState } from 'react'
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
} from 'react-native-svg'
import { createCheckoutSession, purchaseCredits } from '@/lib/api'
import { CONFIG } from '@/lib/config'
import { useSubscriptionStore } from '@/stores/use-subscription-store'

const BRAND = '#8B5CF6'
const BRAND_CYAN = '#06B6D4'
const BG = '#0a0a0f'
const CARD_BG = 'rgba(255,255,255,0.05)'
const CARD_BORDER = 'rgba(255,255,255,0.08)'
const MUTED = 'rgba(255,255,255,0.45)'

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

function ZapIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={BRAND_CYAN} />
    </Svg>
  )
}

// ─── Plan Data ──────────────────────────────────────────────────────────

interface Plan {
  name: string
  plan: string
  period: string
  price: { monthly: number; yearly: number }
  credits: number
  featured?: boolean
  features: string[]
  description: string
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    plan: 'STARTER',
    period: 'monthly',
    price: { monthly: 16, yearly: 154 },
    credits: 100,
    description: 'Perfect for individuals',
    features: ['100 generations/month', 'Commercial license', '2K resolution', 'Email support'],
  },
  {
    name: 'Pro',
    plan: 'PRO',
    period: 'monthly',
    price: { monthly: 39, yearly: 374 },
    credits: 300,
    featured: true,
    description: 'For growing teams',
    features: ['300 generations/month', '30-day credit rollover', 'Priority generation', 'API access', 'Priority support'],
  },
  {
    name: 'Business',
    plan: 'BUSINESS',
    period: 'monthly',
    price: { monthly: 79, yearly: 758 },
    credits: 700,
    description: 'For large organizations',
    features: ['700 generations/month', '60-day credit rollover', 'Full API access', 'Dedicated support', 'Custom integrations'],
  },
]

const CREDIT_PACKS = [
  { id: 'small', label: 'Small', credits: 100, price: '$19.99' },
  { id: 'medium', label: 'Medium', credits: 200, price: '$34.99' },
  { id: 'large', label: 'Large', credits: 400, price: '$59.99' },
]

// ─── Billing Toggle ────────────────────────────────────────────────────

function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: 'monthly' | 'yearly'
  onChange: (c: 'monthly' | 'yearly') => void
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, cycle === 'monthly' && styles.toggleLabelActive]}>
        Monthly
      </Text>
      <TouchableOpacity
        style={styles.toggleTrack}
        activeOpacity={0.8}
        onPress={() => onChange(cycle === 'monthly' ? 'yearly' : 'monthly')}
      >
        <View
          style={[
            styles.toggleThumb,
            cycle === 'yearly' && styles.toggleThumbRight,
          ]}
        />
      </TouchableOpacity>
      <Text style={[styles.toggleLabel, cycle === 'yearly' && styles.toggleLabelActive]}>
        Yearly
      </Text>
      <View style={styles.saveBadge}>
        <Text style={styles.saveText}>Save 20%</Text>
      </View>
    </View>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────────

export default function PricingScreen() {
  const { plan: currentPlan } = useSubscriptionStore()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start()
  }, [])

  const handleSubscribe = async (plan: string, period: string) => {
    if (loading) return
    setLoading(plan)
    try {
      const returnUrl = `${CONFIG.APP_SCHEME}://account?success=true`
      const { url } = await createCheckoutSession(plan, period, returnUrl)
      await WebBrowser.openBrowserAsync(url)
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to start checkout')
    } finally {
      setLoading(null)
    }
  }

  const handleBuyCredits = async (packId: string) => {
    if (loading) return
    setLoading(packId)
    try {
      const returnUrl = `${CONFIG.APP_SCHEME}://account?success=true`
      const { url } = await purchaseCredits(packId, returnUrl)
      await WebBrowser.openBrowserAsync(url)
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to start checkout')
    } finally {
      setLoading(null)
    }
  }

  const isPaid = currentPlan !== 'FREE' && currentPlan !== ''

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

          {/* Billing Toggle */}
          <BillingToggle cycle={billingCycle} onChange={setBillingCycle} />

          {/* Weekly Promo — only for free users */}
          {(!currentPlan || currentPlan === 'FREE') && (
            <TouchableOpacity
              style={styles.weeklyCard}
              activeOpacity={0.7}
              onPress={() => currentPlan !== 'WEEKLY' && handleSubscribe('WEEKLY', 'weekly')}
            >
              <LinearGradient
                colors={[BRAND, BRAND_CYAN]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
              />
              <View style={styles.weeklyInner}>
                <View style={styles.weeklyIconWrap}>
                  <ZapIcon />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weeklyTitle}>Try for just $5/week</Text>
                  <Text style={styles.weeklySub}>25 credits · Cancel anytime · No commitment</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Pay Per Use — Hero Card ── */}
          <View style={styles.ppuOuter}>
            <LinearGradient
              colors={[BRAND, BRAND_CYAN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ppuGradientBorder}
            />
            <View style={styles.ppuCard}>
              {/* Header row */}
              <View style={styles.ppuTopRow}>
                <View style={styles.ppuIconWrap}>
                  <ZapIcon />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.ppuNameRow}>
                    <Text style={styles.ppuName}>Pay Per Use</Text>
                    <View style={styles.ppuBadge}>
                      <Text style={styles.ppuBadgeText}>RECOMMENDED</Text>
                    </View>
                  </View>
                  <Text style={styles.ppuTagline}>Only pay for what you create</Text>
                </View>
              </View>

              {/* Price */}
              <View style={[styles.priceRow, { marginTop: 16 }]}>
                <Text style={styles.ppuPrice}>$0</Text>
                <Text style={styles.ppuPriceSub}>/mo base</Text>
                <Text style={[styles.ppuPriceSub, { marginLeft: 4 }]}>+ per generation</Text>
              </View>

              {/* Description */}
              <Text style={styles.ppuDescription}>
                No subscription needed. Generate product photos, fashion models, videos, and more — you're only charged for what you actually use. Perfect if your workload varies month to month, or if you want to try the platform without committing to a plan.
              </Text>

              <View style={styles.divider} />

              {/* Features */}
              <View style={styles.featureList}>
                {[
                  'No monthly commitment — cancel or pause anytime',
                  'Charged per generation at the end of each billing period',
                  'Access every AI model and feature',
                  'Full API access for integrations',
                  'Set an optional spending limit to stay in control',
                  'Priority support included',
                ].map((feat, i) => (
                  <View key={i} style={styles.featureRow}>
                    <CheckIcon color={BRAND_CYAN} />
                    <Text style={styles.featureText}>{feat}</Text>
                  </View>
                ))}
              </View>

              {/* How it works */}
              <View style={styles.ppuHowItWorks}>
                <Text style={styles.ppuHowTitle}>How it works</Text>
                <View style={styles.ppuStepRow}>
                  <View style={styles.ppuStepBullet}>
                    <Text style={styles.ppuStepNum}>1</Text>
                  </View>
                  <Text style={styles.ppuStepText}>Sign up — no upfront payment required</Text>
                </View>
                <View style={styles.ppuStepRow}>
                  <View style={styles.ppuStepBullet}>
                    <Text style={styles.ppuStepNum}>2</Text>
                  </View>
                  <Text style={styles.ppuStepText}>Generate images, models, and videos as you need</Text>
                </View>
                <View style={styles.ppuStepRow}>
                  <View style={styles.ppuStepBullet}>
                    <Text style={styles.ppuStepNum}>3</Text>
                  </View>
                  <Text style={styles.ppuStepText}>Get billed only for what you used at period end</Text>
                </View>
              </View>

              {/* CTA */}
              {currentPlan === 'PAYPERUSE' ? (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentText}>Current Plan</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.ppuCta}
                  activeOpacity={0.8}
                  onPress={() => handleSubscribe('PAYPERUSE', 'monthly')}
                >
                  <LinearGradient
                    colors={[BRAND, BRAND_CYAN]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Text style={styles.ppuCtaText}>
                    {loading === 'PAYPERUSE' ? 'Loading...' : 'Get Started — Pay Per Use'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Or choose a plan divider ── */}
          <View style={styles.orDivider}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or choose a subscription</Text>
            <View style={styles.orLine} />
          </View>

          {/* Subscription Plans */}
          {PLANS.map((p) => {
            const isCurrentPlan =
              currentPlan === p.plan ||
              (currentPlan === 'BASIC' && p.plan === 'STARTER')
            const isFeatured = p.featured
            const price = billingCycle === 'monthly'
              ? p.price.monthly
              : Math.round(p.price.yearly / 12)
            const yearlyTotal = p.price.yearly

            return (
              <View key={p.plan} style={styles.planCardOuter}>
                {isFeatured && <View style={styles.featuredGlow} />}

                <TouchableOpacity
                  style={[
                    styles.planCard,
                    isFeatured && styles.featuredCard,
                    isCurrentPlan && styles.currentPlanCard,
                  ]}
                  onPress={() => !isCurrentPlan && handleSubscribe(p.plan, billingCycle)}
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

                  {/* Plan header */}
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{p.name}</Text>
                    <Text style={styles.planDesc}>{p.description}</Text>
                    <View style={styles.priceRow}>
                      <Text style={[styles.planPrice, isFeatured && { color: '#FFFFFF' }]}>
                        ${price}
                      </Text>
                      <Text style={styles.planPeriod}>/mo</Text>
                    </View>
                    {billingCycle === 'yearly' && (
                      <Text style={styles.yearlyNote}>Billed annually ${yearlyTotal}/yr</Text>
                    )}
                    <Text style={styles.planCredits}>{p.credits} credits/month</Text>
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
                      {isFeatured && (
                        <LinearGradient
                          colors={[BRAND, '#7C3AED']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                      )}
                      <Text style={[styles.selectText, isFeatured && { fontWeight: '700' }]}>
                        {loading === p.plan ? 'Loading...' : isFeatured ? 'Get Pro' : 'Select Plan'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )
          })}

          {/* Credit Packs — only for paid subscribers */}
          {isPaid && (
            <View style={styles.creditSection}>
              <Text style={styles.creditSectionTitle}>Need More Credits?</Text>
              <Text style={styles.creditSectionSub}>
                Buy additional credits anytime. No expiration.
              </Text>

              <View style={styles.creditPacksRow}>
                {CREDIT_PACKS.map((pack) => (
                  <TouchableOpacity
                    key={pack.id}
                    style={styles.creditPack}
                    activeOpacity={0.7}
                    onPress={() => handleBuyCredits(pack.id)}
                  >
                    <Text style={styles.creditPackLabel}>{pack.label}</Text>
                    <Text style={styles.creditPackAmount}>{pack.credits}</Text>
                    <Text style={styles.creditPackUnit}>credits</Text>
                    <View style={styles.creditPackBtn}>
                      <Text style={styles.creditPackBtnText}>
                        {loading === pack.id ? '...' : pack.price}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

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
    backgroundColor: BG,
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
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    marginTop: 4,
  },

  // Billing toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
  },
  toggleLabelActive: {
    color: '#FFFFFF',
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 3,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BRAND_CYAN,
  },
  toggleThumbRight: {
    alignSelf: 'flex-end',
  },
  saveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(6,182,212,0.15)',
  },
  saveText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND_CYAN,
  },

  // Weekly promo
  weeklyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  weeklyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
  },
  weeklyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weeklyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  weeklySub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
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
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
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

  // Plan info
  planHeader: {
    marginBottom: 0,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  planDesc: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 10,
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
    color: MUTED,
    fontWeight: '500',
  },
  yearlyNote: {
    fontSize: 12,
    color: BRAND_CYAN,
    marginTop: 2,
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

  // Pay Per Use — Hero
  ppuOuter: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 22,
    padding: 1.5,
    overflow: 'hidden',
  },
  ppuGradientBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  ppuCard: {
    backgroundColor: '#0d0d14',
    borderRadius: 20.5,
    padding: 22,
  },
  ppuTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ppuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(6,182,212,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ppuNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ppuName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ppuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(6,182,212,0.15)',
  },
  ppuBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: BRAND_CYAN,
    letterSpacing: 0.5,
  },
  ppuTagline: {
    fontSize: 13,
    color: BRAND_CYAN,
    fontWeight: '600',
    marginTop: 2,
  },
  ppuPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ppuPriceSub: {
    fontSize: 14,
    color: MUTED,
    fontWeight: '500',
  },
  ppuDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 14,
  },
  ppuHowItWorks: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 18,
  },
  ppuHowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  ppuStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ppuStepBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(6,182,212,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ppuStepNum: {
    fontSize: 11,
    fontWeight: '800',
    color: BRAND_CYAN,
  },
  ppuStepText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    flex: 1,
  },
  ppuCta: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  ppuCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Or divider
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  orText: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Credit Packs
  creditSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  creditSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  creditSectionSub: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 16,
  },
  creditPacksRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  creditPack: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    alignItems: 'center',
  },
  creditPackLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  creditPackAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  creditPackUnit: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 12,
  },
  creditPackBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: BRAND,
    width: '100%',
    alignItems: 'center',
  },
  creditPackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Footer
  footerNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 8,
  },
})
