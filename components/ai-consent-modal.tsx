import { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native'
import Svg, { Path as SvgPath } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { useAIConsentStore } from '@/stores/use-ai-consent-store'

const BRAND = '#FBBF24'

const PROVIDERS: Array<{ name: string; data: string; purpose: string }> = [
  { name: 'OpenAI (GPT Image 2)',      data: 'Reference photo + prompt', purpose: 'Image generation' },
  { name: 'Google Gemini',             data: 'Reference photo + prompt', purpose: 'Image / vision' },
  { name: 'Replicate',                 data: 'Reference photo + prompt', purpose: 'Image / video models' },
  { name: 'ByteDance Seedance 2.0',    data: 'Reference image + prompt', purpose: 'Video generation' },
  { name: 'Kling AI',                  data: 'Reference image + prompt', purpose: 'Video generation' },
]

export function AIConsentModal() {
  const { showConsentModal, acceptConsent, setShowConsentModal } = useAIConsentStore()
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      await acceptConsent()
    } finally {
      setLoading(false)
      setAgreed(false)
    }
  }

  const handleDecline = () => {
    useAIConsentStore.setState({ pendingAction: null })
    setShowConsentModal(false)
    setAgreed(false)
  }

  return (
    <Modal visible={showConsentModal} animationType="slide" transparent onRequestClose={() => {}}>
      <View style={styles.modalBackdrop}>
        <View style={styles.spacer} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Share photos with AI providers?</Text>
          </View>

          <ScrollView
            style={{ paddingHorizontal: 24 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconWrap}>
              <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
                <SvgPath
                  d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z"
                  fill={BRAND}
                  opacity={0.15}
                  stroke={BRAND}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
                <SvgPath
                  d="M12 8v5M12 16.5v.5"
                  stroke={BRAND}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </View>

            <Text style={styles.body}>
              Auto Toon uses these third-party AI services to generate your imagery and video. To
              generate, your uploaded photos (product images, face references, model photos) and
              the prompts derived from them are transmitted to:
            </Text>

            <View style={styles.providerList}>
              {PROVIDERS.map((p) => (
                <View key={p.name} style={styles.providerRow}>
                  <View style={styles.providerDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.providerName}>{p.name}</Text>
                    <Text style={styles.providerMeta}>
                      {p.data} · {p.purpose}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.subBody}>
              Providers process the data under their own terms; they do not retain your data to
              train their models for purposes unrelated to fulfilling your request. You can revoke
              this consent at any time in Settings → Privacy.
            </Text>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://auto-toon.com/privacy')}
              style={styles.linkRow}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <SvgPath
                  d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
                  stroke={BRAND}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.linkText}>Read full Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.7}
              onPress={() => setAgreed((v) => !v)}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && (
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <SvgPath
                      d="M5 13l4 4L19 7"
                      stroke="#1f1300"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                I consent to sharing my uploads with the AI providers listed above
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.buttonArea}>
            <TouchableOpacity
              style={[styles.acceptBtn, (!agreed || loading) && { opacity: 0.4 }]}
              disabled={!agreed || loading}
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#B45309']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              {loading ? (
                <ActivityIndicator color="#1f1300" size="small" />
              ) : (
                <Text style={styles.acceptBtnText}>Allow & Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} disabled={loading}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  spacer: { flex: 1 },
  modalSheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 19, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  iconWrap: { alignItems: 'center', marginBottom: 16 },
  body: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.75)', marginBottom: 16 },
  subBody: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.55)', marginTop: 8 },
  providerList: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 8,
  },
  providerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  providerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND,
    marginTop: 6,
  },
  providerName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  providerMeta: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  linkText: { fontSize: 14, fontWeight: '600', color: BRAND },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: BRAND, borderColor: BRAND },
  checkboxLabel: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },
  buttonArea: { paddingHorizontal: 24, gap: 10 },
  acceptBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', overflow: 'hidden' },
  acceptBtnText: { color: '#1f1300', fontSize: 16, fontWeight: '700' },
  declineBtn: { alignItems: 'center', paddingVertical: 10 },
  declineBtnText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '500' },
})
