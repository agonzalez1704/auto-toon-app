import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import Colors from '@/constants/Colors'
import { useThemeColors } from '@/lib/useThemeColors'
import { createCheckoutSession } from '@/lib/api'
import { CONFIG } from '@/lib/config'

const PLANS = [
  { name: 'Weekly', plan: 'WEEKLY', period: 'weekly', price: '$5', sub: '/week', credits: 25 },
  { name: 'Starter', plan: 'STARTER', period: 'monthly', price: '$16', sub: '/mo', credits: 100 },
  { name: 'Pro', plan: 'PRO', period: 'monthly', price: '$39', sub: '/mo', credits: 300, featured: true },
  { name: 'Business', plan: 'BUSINESS', period: 'monthly', price: '$79', sub: '/mo', credits: 700 },
]

export default function PricingScreen() {
  const colors = useThemeColors()

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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Choose a Plan</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Get more credits and unlock premium features
      </Text>

      {PLANS.map((p) => (
        <TouchableOpacity
          key={p.plan}
          style={[
            styles.planCard,
            {
              backgroundColor: colors.surface,
              borderColor: p.featured ? Colors.brand : colors.surfaceBorder,
              borderWidth: p.featured ? 2 : 1,
            },
          ]}
          onPress={() => handleSubscribe(p.plan, p.period)}
          activeOpacity={0.7}
        >
          {p.featured && (
            <View style={[styles.badge, { backgroundColor: Colors.brand }]}>
              <Text style={styles.badgeText}>Popular</Text>
            </View>
          )}
          <Text style={[styles.planName, { color: colors.text }]}>{p.name}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.planPrice, { color: colors.text }]}>{p.price}</Text>
            <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>{p.sub}</Text>
          </View>
          <Text style={[styles.planCredits, { color: colors.tint }]}>
            {p.credits} credits
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 24 },
  planCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -1,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  planName: { fontSize: 18, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4, gap: 2 },
  planPrice: { fontSize: 28, fontWeight: '800' },
  planPeriod: { fontSize: 14 },
  planCredits: { fontSize: 14, fontWeight: '600', marginTop: 8 },
})
