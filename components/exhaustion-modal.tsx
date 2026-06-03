import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import Svg, { Path as SvgPath } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'

const BRAND = '#FBBF24'

/**
 * Shown when a credit-plan user tries to generate but the balance is below the
 * call cost. Routes to /account/pricing for plan upgrade. PAYPERUSE users
 * never hit this — they're metered server-side, not gated client-side.
 */
export function ExhaustionModal() {
  const router = useRouter()
  const { showExhaustionModal, setShowExhaustionModal, balance } = useCreditsStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'

  // Defensive: if a stale call surfaces this for a PAYPERUSE user, drop it.
  if (isPayPerUse && showExhaustionModal) {
    setShowExhaustionModal(false)
    return null
  }

  const close = () => setShowExhaustionModal(false)
  const upgrade = () => {
    setShowExhaustionModal(false)
    router.push('/account/pricing')
  }
  const topUp = () => {
    setShowExhaustionModal(false)
    router.push('/account/credits')
  }

  return (
    <Modal visible={showExhaustionModal} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.spacer} />
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
              <SvgPath
                d="M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5"
                stroke={BRAND}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          <Text style={styles.title}>Out of credits</Text>
          <Text style={styles.subtitle}>
            {balance !== null
              ? `You have ${balance} credit${balance === 1 ? '' : 's'} left — not enough for this generation.`
              : 'Your balance is too low for this generation.'}
          </Text>
          <Text style={styles.body}>
            Upgrade your plan for more monthly credits, top up a one-time bundle, or switch to
            Pay-Per-Use to pay only for what you generate.
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.primaryBtn} onPress={upgrade} activeOpacity={0.85}>
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#B45309']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.primaryBtnText}>See plans</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={topUp} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>Top up credits</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissBtn} onPress={close}>
              <Text style={styles.dismissBtnText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  spacer: { flex: 1 },
  sheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  iconWrap: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 8 },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttons: { gap: 10 },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    overflow: 'hidden',
  },
  primaryBtnText: { color: '#1f1300', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
  },
  secondaryBtnText: { color: BRAND, fontSize: 15, fontWeight: '600' },
  dismissBtn: { alignItems: 'center', paddingVertical: 10 },
  dismissBtnText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '500' },
})
