import { BeforeAfterSlider } from '@/components/before-after-slider'
import { ParticleSphere } from '@/components/particle-sphere'
import { RestoreIntroModal } from '@/components/restore-intro-modal'
import { restoreImage } from '@/lib/api'
import { uploadImage } from '@/lib/upload'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { getCostLabel } from '@/lib/ai-models'
import { RESTORE_MODELS, useRestoreStore, type Resolution, type RestoreModelId } from '@/stores/use-restore-store'
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'
import * as FileSystem from 'expo-file-system/legacy'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import * as MediaLibrary from 'expo-media-library'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Defs, Stop, LinearGradient as SvgLinearGradient, Path as SvgPath } from 'react-native-svg'

// Aurora Blossom palette
const AURORA_NAVY = '#193153'
const AURORA_TEAL = '#0B5777'
const AURORA_MAGENTA = '#FBBF24'

const RESOLUTIONS: { value: Resolution; label: string; credits: number }[] = [
  { value: '2K', label: '2K', credits: 3 },
  { value: '4K', label: '4K', credits: 5 },
]

function GeminiIcon({ size = 14 }: { size?: number }) {
  const d = "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="gf0" x1="7" y1="15.5" x2="11" y2="12" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#08B962" />
          <Stop offset="1" stopColor="#08B962" stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id="gf1" x1="8" y1="5.5" x2="11.5" y2="11" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#F94543" />
          <Stop offset="1" stopColor="#F94543" stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id="gf2" x1="3.5" y1="13.5" x2="17.5" y2="12" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FABC12" />
          <Stop offset="0.46" stopColor="#FABC12" stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>
      <SvgPath d={d} fill="#3186FF" />
      <SvgPath d={d} fill="url(#gf0)" />
      <SvgPath d={d} fill="url(#gf1)" />
      <SvgPath d={d} fill="url(#gf2)" />
    </Svg>
  )
}

// ─── Timer ──────────────────────────────────────────────────────────────

function RestoreTimer() {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    startRef.current = Date.now()
    setElapsed(0)
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [])

  return <Text style={styles.timerText}>Restoring... {elapsed}s</Text>
}

// ─── Main Screen ────────────────────────────────────────────────────────

export default function RestoreScreen() {
  const router = useRouter()
  const store = useRestoreStore()
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const { requireConsent } = useTermsConsentStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'

  const [isPickingImage, setIsPickingImage] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const isSubmittingRef = useRef(false)

  const creditCost = store.creditCost()
  const restoreModelId = RESTORE_MODELS[store.selectedModel].id
  const restoreCostLabel = getCostLabel(restoreModelId, isPayPerUse, { resolution: store.resolution })
  const canRestore = store.uploadedImageUrl && !isUploading && store.phase === 'idle'

  // ─── Image picking ──────────────────────────────────────────────────

  const pickImage = useCallback(async () => {
    setIsPickingImage(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      })
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri
        store.setLocalImageUri(uri)
        store.setUploadedImageUrl(null)
        store.setError(null)
        setIsUploading(true)
        try {
          const publicUrl = await uploadImage(uri)
          store.setUploadedImageUrl(publicUrl)
        } catch {
          store.setError('Upload failed. Please try again.')
        } finally {
          setIsUploading(false)
        }
      }
    } finally {
      setIsPickingImage(false)
    }
  }, [store])

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take photos.')
      return
    }
    setIsPickingImage(true)
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri
        store.setLocalImageUri(uri)
        store.setUploadedImageUrl(null)
        store.setError(null)
        setIsUploading(true)
        try {
          const publicUrl = await uploadImage(uri)
          store.setUploadedImageUrl(publicUrl)
        } catch {
          store.setError('Upload failed. Please try again.')
        } finally {
          setIsUploading(false)
        }
      }
    } finally {
      setIsPickingImage(false)
    }
  }, [store])

  const clearImage = useCallback(() => {
    store.setLocalImageUri(null)
    store.setUploadedImageUrl(null)
    store.setError(null)
  }, [store])

  // ─── Restore ────────────────────────────────────────────────────────

  const handleRestore = useCallback(async () => {
    if (!canRestore || !store.uploadedImageUrl || isSubmittingRef.current) return
    isSubmittingRef.current = true

    const consented = requireConsent(() => {
      isSubmittingRef.current = false
      handleRestore()
    })
    if (!consented) {
      isSubmittingRef.current = false
      return
    }

    if (balance !== null && balance < creditCost) {
      setShowExhaustionModal(true)
      isSubmittingRef.current = false
      return
    }

    store.setPhase('restoring')
    store.setError(null)

    try {
      const result = await restoreImage({
        imageUrl: store.uploadedImageUrl,
        aiModel: RESTORE_MODELS[store.selectedModel].id,
        resolution: store.resolution,
      })

      if (result.success && result.restoredImageUrl) {
        store.setRestoredImageUrl(result.restoredImageUrl)
        store.setPhase('complete')
        useCreditsStore.getState().setCredits(result.creditsRemaining)
        fetchCredits()
      } else {
        store.setError('Restoration failed. Please try again.')
        store.setPhase('idle')
      }
    } catch (err: any) {
      if (err?.status === 402) {
        setShowExhaustionModal(true)
      } else {
        store.setError(err?.message || 'Something went wrong')
      }
      store.setPhase('idle')
    } finally {
      isSubmittingRef.current = false
    }
  }, [canRestore, store, balance, creditCost, requireConsent, fetchCredits, setShowExhaustionModal])

  // ─── Save image ─────────────────────────────────────────────────────

  const saveRestoredImage = useCallback(async () => {
    if (!store.restoredImageUrl) return
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Allow photo library access to save images.')
        return
      }
      const filename = `restored_${store.resolution}_${Date.now()}.jpg`
      const fileUri = `${FileSystem.cacheDirectory}${filename}`
      await FileSystem.downloadAsync(store.restoredImageUrl, fileUri)
      await MediaLibrary.saveToLibraryAsync(fileUri)
      Alert.alert('Saved', 'Image saved to your photo library.')
    } catch {
      Alert.alert('Error', 'Failed to save image.')
    }
  }, [store.restoredImageUrl, store.resolution])

  const shareRestoredImage = useCallback(async () => {
    if (!store.restoredImageUrl) return
    try {
      if (Platform.OS === 'ios') {
        await Share.share({ url: store.restoredImageUrl })
      } else {
        await Share.share({ message: store.restoredImageUrl })
      }
    } catch {
      // cancelled
    }
  }, [store.restoredImageUrl])

  // ─── Restoring state ────────────────────────────────────────────────

  if (store.phase === 'restoring') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingScreen}>
            <ParticleSphere width={160} height={160} phase="generating" />
            <RestoreTimer />
            <Text style={styles.loadingHint}>This usually takes 15-30 seconds</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // ─── Complete state — before/after ──────────────────────────────────

  if (store.phase === 'complete' && store.restoredImageUrl && store.uploadedImageUrl) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.pageTitle}>Restored</Text>

            <BeforeAfterSlider
              beforeUri={store.uploadedImageUrl}
              afterUri={store.restoredImageUrl}
              height={420}
            />

            <Text style={styles.sliderHint}>Drag the slider to compare</Text>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  router.push({
                    pathname: '/image-viewer',
                    params: {
                      urls: JSON.stringify([store.uploadedImageUrl!, store.restoredImageUrl!]),
                      title: 'Before & After',
                    },
                  })
                }
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <SvgPath d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={styles.actionBtnText}>Full Screen</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={saveRestoredImage}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <SvgPath d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={styles.actionBtnText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={shareRestoredImage}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <SvgPath d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={styles.actionBtnText}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.newRestoreBtn}
              onPress={() => store.resetForNew()}
              activeOpacity={0.8}
            >
              <Text style={styles.newRestoreBtnText}>Restore Another</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    )
  }

  // ─── Idle state — form ──────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <RestoreIntroModal />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.pageTitle}>Restore</Text>
            {!isPayPerUse && balance !== null && (
              <View style={styles.creditsBadge}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <SvgPath d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" fill={AURORA_MAGENTA} />
                </Svg>
                <Text style={styles.creditsText}>{balance}</Text>
              </View>
            )}
          </View>

          {/* Image upload */}
          <View style={styles.section}>
            <Text style={styles.label}>Image</Text>
            {store.localImageUri ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: store.localImageUri }} style={styles.previewImage} contentFit="cover" transition={200} />
                {isUploading && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.uploadOverlayText}>Uploading...</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.removeBtn} onPress={clearImage} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <SvgPath d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
                  </Svg>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadRow}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={pickImage}
                  disabled={isPickingImage}
                  activeOpacity={0.7}
                >
                  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                    <SvgPath d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={styles.uploadLabel}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={takePhoto}
                  disabled={isPickingImage}
                  activeOpacity={0.7}
                >
                  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                    <SvgPath d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    <SvgPath d="M12 17a4 4 0 100-8 4 4 0 000 8z" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
                  </Svg>
                  <Text style={styles.uploadLabel}>Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Model + Resolution */}
          <View style={styles.section}>
            <Text style={styles.label}>Model</Text>
            <View style={styles.modelToggle}>
              {(Object.keys(RESTORE_MODELS) as RestoreModelId[]).map((key) => {
                const model = RESTORE_MODELS[key]
                const isSelected = store.selectedModel === key
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.modelPill, isSelected && styles.modelPillSelected]}
                    onPress={() => store.setSelectedModel(key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modelPillContent}>
                      <GeminiIcon size={13} />
                      <Text style={[styles.modelPillText, isSelected && styles.modelPillTextSelected]}>
                        {model.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Resolution selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Resolution</Text>
            <View style={styles.resRow}>
              {RESOLUTIONS.map((res) => {
                const isSelected = store.resolution === res.value
                const accent = res.value === '2K' ? AURORA_MAGENTA : AURORA_TEAL
                return (
                  <TouchableOpacity
                    key={res.value}
                    style={[
                      styles.resBtn,
                      isSelected && { borderColor: accent, backgroundColor: `${accent}15` },
                    ]}
                    onPress={() => store.setResolution(res.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.resLabel, isSelected && { color: accent, fontWeight: '700' }]}>
                      {res.label}
                    </Text>
                    <Text style={[styles.resCredits, isSelected && { color: `${accent}B3` }]}>
                      {getCostLabel(restoreModelId, isPayPerUse, { resolution: res.value })}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Error */}
          {store.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{store.error}</Text>
            </View>
          )}

          {/* Restore button */}
          <TouchableOpacity
            style={[styles.restoreButton, !canRestore && styles.restoreButtonDisabled]}
            onPress={handleRestore}
            disabled={!canRestore}
            activeOpacity={0.8}
          >
            {canRestore && (
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#B45309']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <View style={styles.restoreBtnContent}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <SvgPath d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FFFFFF" />
              </Svg>
              <Text style={styles.restoreBtnText}>Restore ({restoreCostLabel})</Text>
            </View>
          </TouchableOpacity>

          {!isPayPerUse && balance !== null && (
            <Text style={styles.balanceHint}>Balance: {balance} credits</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#193153' },
  safeArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pageTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  creditsText: { fontSize: 14, fontWeight: '700', color: AURORA_MAGENTA },

  section: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.5)',
  },

  // Upload
  uploadRow: { flexDirection: 'row', gap: 12 },
  uploadButton: {
    flex: 1,
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },

  // Preview
  imagePreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewImage: { width: '100%', height: '100%' },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25,49,83,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlayText: { color: '#fff', fontSize: 14, marginTop: 8, fontWeight: '500' },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(25,49,83,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Model toggle (matches create page)
  modelToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 3,
  },
  modelPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  modelPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modelPillSelected: {
    backgroundColor: 'rgba(251,191,36,0.2)',
  },
  modelPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  modelPillTextSelected: {
    color: '#FFFFFF',
  },

  // Resolution selector
  resRow: { flexDirection: 'row', gap: 10 },
  resBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  resLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  resCredits: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: '#EF4444', fontSize: 14, fontWeight: '500' },

  // Restore button
  restoreButton: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  restoreButtonDisabled: { opacity: 0.4 },
  restoreBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  restoreBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 4,
  },

  // Loading screen
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  loadingHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },

  // Complete state
  sliderHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  newRestoreBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  newRestoreBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
})
