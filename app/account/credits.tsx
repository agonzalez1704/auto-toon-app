import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { useThemeColors } from '@/lib/useThemeColors'
import { purchaseCredits } from '@/lib/api'
import { useCreditsStore } from '@/stores/use-credits-store'
import { CONFIG } from '@/lib/config'

const PACKS = [
  { id: 'micro', credits: 30, price: '$5.99', note: 'Available to all' },
  { id: 'small', credits: 100, price: '$19.99', note: 'Subscribers only' },
  { id: 'medium', credits: 200, price: '$34.99', note: 'Subscribers only' },
  { id: 'large', credits: 400, price: '$59.99', note: 'Subscribers only' },
]

export default function CreditsScreen() {
  const colors = useThemeColors()
  const { balance } = useCreditsStore()

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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Current Balance</Text>
        <Text style={[styles.balanceValue, { color: colors.tint }]}>
          {balance !== null ? balance : '...'} credits
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Buy Credits</Text>

      {PACKS.map((pack) => (
        <TouchableOpacity
          key={pack.id}
          style={[styles.packCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          onPress={() => handlePurchase(pack.id)}
          activeOpacity={0.7}
        >
          <View>
            <Text style={[styles.packCredits, { color: colors.text }]}>
              {pack.credits} credits
            </Text>
            <Text style={[styles.packNote, { color: colors.textSecondary }]}>{pack.note}</Text>
          </View>
          <Text style={[styles.packPrice, { color: colors.tint }]}>{pack.price}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  balanceCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 28,
  },
  balanceLabel: { fontSize: 13, fontWeight: '500' },
  balanceValue: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  packCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  packCredits: { fontSize: 16, fontWeight: '700' },
  packNote: { fontSize: 12, marginTop: 2 },
  packPrice: { fontSize: 18, fontWeight: '800' },
})
