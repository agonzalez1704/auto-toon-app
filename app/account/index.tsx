import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useUser, useAuth } from '@clerk/clerk-expo'
import { useThemeColors } from '@/lib/useThemeColors'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { useCreditsStore } from '@/stores/use-credits-store'

export default function AccountScreen() {
  const colors = useThemeColors()
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useAuth()
  const { plan } = useSubscriptionStore()
  const { balance } = useCreditsStore()

  const planLabel = plan === 'FREE' ? 'Free' : plan.charAt(0) + plan.slice(1).toLowerCase()

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Profile */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.name, { color: colors.text }]}>
            {user?.fullName || user?.firstName || 'User'}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {user?.primaryEmailAddress?.emailAddress}
          </Text>
        </View>

        {/* Subscription */}
        <TouchableOpacity
          style={[styles.card, styles.row, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          onPress={() => router.push('/account/pricing')}
          activeOpacity={0.7}
        >
          <View>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Plan</Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>{planLabel}</Text>
          </View>
          <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>

        {/* Credits */}
        <TouchableOpacity
          style={[styles.card, styles.row, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          onPress={() => router.push('/account/credits')}
          activeOpacity={0.7}
        >
          <View>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Credits</Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {balance !== null ? balance : '...'}
            </Text>
          </View>
          <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutButton, { borderColor: colors.error }]}
          onPress={() => signOut()}
          activeOpacity={0.7}
        >
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 14, marginTop: 4 },
  cardLabel: { fontSize: 13, fontWeight: '500' },
  cardValue: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  arrow: { fontSize: 24, fontWeight: '300' },
  signOutButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  signOutText: { fontSize: 16, fontWeight: '600' },
})
