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
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'

const BRAND = '#8B5CF6'

export function TermsConsentModal() {
  const { showConsentModal, acceptTerms, setShowConsentModal } = useTermsConsentStore()
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      await acceptTerms()
    } finally {
      setLoading(false)
      setAgreed(false)
    }
  }

  const handleDecline = () => {
    useTermsConsentStore.setState({ pendingAction: null })
    setShowConsentModal(false)
    setAgreed(false)
  }

  return (
    <Modal visible={showConsentModal} animationType="slide" transparent onRequestClose={() => {}}>
      <View style={styles.modalBackdrop}>
        <View style={styles.spacer} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Terms of Service</Text>
          </View>

          <ScrollView
            style={{ paddingHorizontal: 24 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Shield icon */}
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
                  d="M9 12l2 2 4-4"
                  stroke={BRAND}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>

            <Text style={styles.body}>
              Before your first generation, please review and accept our Terms of Service and Privacy
              Policy. Key points:
            </Text>

            <View style={styles.bulletList}>
              <Text style={styles.bullet}>
                {'\u2022'} Generated images are for commercial and personal use
              </Text>
              <Text style={styles.bullet}>
                {'\u2022'} We process uploaded images solely to generate results
              </Text>
              <Text style={styles.bullet}>
                {'\u2022'} Credits are non-refundable once consumed
              </Text>
            </View>

            {/* Links */}
            <TouchableOpacity
              onPress={() => Linking.openURL('https://auto-toon.com/terms')}
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
              <Text style={styles.linkText}>Read full Terms of Service</Text>
            </TouchableOpacity>

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
              <Text style={styles.linkText}>Read Privacy Policy</Text>
            </TouchableOpacity>

            {/* Checkbox */}
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
                      stroke="#FFFFFF"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to the Terms of Service and Privacy Policy
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonArea}>
            <TouchableOpacity
              style={[styles.acceptBtn, (!agreed || loading) && { opacity: 0.4 }]}
              disabled={!agreed || loading}
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7C3AED', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.acceptBtnText}>Accept & Continue</Text>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  spacer: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  bulletList: {
    marginBottom: 20,
    gap: 6,
  },
  bullet: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.55)',
    paddingLeft: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
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
  checkboxChecked: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  buttonArea: {
    paddingHorizontal: 24,
    gap: 10,
  },
  acceptBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    overflow: 'hidden',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  declineBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  declineBtnText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontWeight: '500',
  },
})
