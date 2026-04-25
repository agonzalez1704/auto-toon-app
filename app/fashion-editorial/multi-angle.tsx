import { ParticleSphere } from '@/components/particle-sphere'
import { AI_MODELS, getCostLabel, getModelCredits } from '@/lib/ai-models'
import { generateMultiAngle, upscaleFashionEditorial, type UpscaleProgress } from '@/lib/api'
import { queryKeys } from '@/lib/query'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useFashionEditorialStore } from '@/stores/use-fashion-editorial-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'
import { useQueryClient } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system/legacy'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import * as MediaLibrary from 'expo-media-library'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path as SvgPath, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg'

const { width: SCREEN_W } = Dimensions.get('window')
const BG = '#193153'
const ACCENT = '#FBBF24'
const TEAL = '#0B5777'
const UPSCALE_BLUE = '#3B82F6'
const MUTED = 'rgba(255,255,255,0.55)'
const CARD_BG = 'rgba(255,255,255,0.05)'
const CARD_BORDER = 'rgba(255,255,255,0.08)'

const GRID_GAP = 4
const CELL_SIZE = (SCREEN_W - 40 - GRID_GAP * 2) / 3
const CREDITS_PER_UPSCALE = AI_MODELS.GEMINI_3_IMAGE.credits ?? 3

// Fixed grid order — MUST match the row/column order produced by the API prompt.
// Row 1 (eye-level, wide → med-wide) | Row 2 (eye-level, tighter) | Row 3 (angle variations)
const ANGLE_LABELS = [
  'Wide', 'Full', 'Med-Wide',
  'Medium', 'Med CU', 'Close-Up',
  'Low', 'High', 'Dutch',
] as const

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square' },
  { value: '3:4', label: 'Portrait' },
  { value: '9:16', label: 'Story' },
]

// ─── Model provider icons ──────────────────────────────────────────

function GeminiIcon({ size = 16 }: { size?: number }) {
  const d = "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <SvgPath d={d} fill="#3186FF" />
      <Defs>
        <SvgLinearGradient id="ma-g0" x1="7" y1="15.5" x2="11" y2="12" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#08B962" /><Stop offset="1" stopColor="#08B962" stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id="ma-g1" x1="8" y1="5.5" x2="11.5" y2="11" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#F94543" /><Stop offset="1" stopColor="#F94543" stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id="ma-g2" x1="3.5" y1="13.5" x2="17.5" y2="12" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#FABC12" /><Stop offset="0.46" stopColor="#FABC12" stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>
      <SvgPath d={d} fill="url(#ma-g0)" />
      <SvgPath d={d} fill="url(#ma-g1)" />
      <SvgPath d={d} fill="url(#ma-g2)" />
    </Svg>
  )
}

function ByteDanceIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <SvgPath d="M14.944 18.587l-1.704-.445V10.01l1.824-.462c1-.254 1.84-.461 1.88-.453.032 0 .056 2.235.056 4.972v4.973l-.176-.008c-.104 0-.952-.207-1.88-.446z" fill="#00C8D2" />
      <SvgPath d="M7 16.542c0-2.736.024-4.98.064-4.98.032-.008.872.2 1.88.454l1.816.461-.016 4.05-.024 4.049-1.632.422c-.896.23-1.736.445-1.856.469L7 21.523v-4.98z" fill="#3C8CFF" />
      <SvgPath d="M19.24 12.477c0-9.03.008-9.515.144-9.475.072.024.784.207 1.576.406.792.207 1.576.405 1.744.445l.296.08-.016 8.56-.024 8.568-1.624.414c-.888.23-1.728.437-1.856.47l-.24.055v-9.523z" fill="#78E6DC" />
      <SvgPath d="M1 12.509c0-4.678.024-8.505.064-8.505.032 0 .872.207 1.872.454l1.824.461v7.582c0 4.16-.016 7.574-.032 7.574-.024 0-.872.215-1.88.47L1 21.013v-8.505z" fill="#325AB4" />
    </Svg>
  )
}

const MODEL_OPTIONS = [
  { value: AI_MODELS.GEMINI_3_1_FLASH_IMAGE.id, label: AI_MODELS.GEMINI_3_1_FLASH_IMAGE.name, credits: getModelCredits(AI_MODELS.GEMINI_3_1_FLASH_IMAGE.id), Icon: GeminiIcon },
  { value: AI_MODELS.GEMINI_3_IMAGE.id, label: AI_MODELS.GEMINI_3_IMAGE.name, credits: getModelCredits(AI_MODELS.GEMINI_3_IMAGE.id), Icon: GeminiIcon },
  { value: AI_MODELS.SEEDREAM_5_LITE.id, label: AI_MODELS.SEEDREAM_5_LITE.name, credits: getModelCredits(AI_MODELS.SEEDREAM_5_LITE.id), Icon: ByteDanceIcon },
]

// ─── Icons ─────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M19 12H5M12 19l-7-7 7-7" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function SaveIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M20 6L9 17l-5-5" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function UpscaleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Grid3x3Icon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M3 3h18v18H3V3zM9 3v18M15 3v18M3 9h18M3 15h18" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Timer ─────────────────────────────────────────────────────────

function GenerationTimer({ label }: { label: string }) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())
  useEffect(() => {
    startRef.current = Date.now()
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [])
  return <Text style={styles.timerText}>{label} {elapsed}s</Text>
}

// ─── Main Screen ───────────────────────────────────────────────────

export default function MultiAngleScreen() {
  const router = useRouter()
  const store = useFashionEditorialStore()
  const queryClient = useQueryClient()
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'
  const { requireConsent } = useTermsConsentStore()

  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS.GEMINI_3_1_FLASH_IMAGE.id)
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [selectedForUpscale, setSelectedForUpscale] = useState<number[]>([])

  const costLabel = getCostLabel(selectedModel, isPayPerUse)
  const upscaleCost = selectedForUpscale.length * CREDITS_PER_UPSCALE
  const sourceUrl = store.multiAngleSourceUrl

  const toggleUpscaleSelection = useCallback((index: number) => {
    setSelectedForUpscale((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!sourceUrl) return
    if (!requireConsent(() => handleGenerate())) return

    const creditCost = getModelCredits(selectedModel)
    if (!isPayPerUse && balance !== null && balance < creditCost) {
      setShowExhaustionModal(true)
      return
    }

    store.setMultiAngleGenerating()
    setSelectedForUpscale([])

    try {
      const result = await generateMultiAngle({
        baseImageUrl: sourceUrl,
        model: selectedModel,
        aspectRatio,
      })
      store.setMultiAngleResult(result.gridImageUrl, result.variations)
      fetchCredits()
    } catch (err: any) {
      store.setMultiAngleError(err?.message || 'Multi-angle generation failed')
    }
  }, [sourceUrl, selectedModel, aspectRatio, store, balance, isPayPerUse, requireConsent, fetchCredits, setShowExhaustionModal])

  const handleUpscale = useCallback(async () => {
    if (selectedForUpscale.length === 0) return
    if (!requireConsent(() => handleUpscale())) return

    if (!isPayPerUse && balance !== null && balance < upscaleCost) {
      setShowExhaustionModal(true)
      return
    }

    const imageUrls = selectedForUpscale.map((i) => store.multiAngleUrls[i])
    store.setUpscaleGenerating()

    try {
      const result = await upscaleFashionEditorial(imageUrls, aspectRatio, (event: UpscaleProgress) => {
        if (event.type === 'progress' && event.message) {
          store.setUpscaleProgress(event.message)
        }
        if (event.type === 'success' && event.imageUrl) {
          store.addUpscaledUrl(event.imageUrl)
        }
      })

      store.setUpscaleComplete()
      fetchCredits()
      queryClient.invalidateQueries({ queryKey: queryKeys.assets })

      if (result.urls.length > 0) {
        router.push({
          pathname: '/image-viewer',
          params: {
            urls: JSON.stringify(result.urls),
            title: 'Upscaled Multi-Angle',
          },
        })
      }
    } catch (err: any) {
      store.setUpscaleError(err?.message || 'Upscale failed')
    }
  }, [selectedForUpscale, store, aspectRatio, balance, isPayPerUse, upscaleCost, requireConsent, fetchCredits, setShowExhaustionModal, queryClient, router])

  const handleSave = useCallback(async () => {
    const urls = [...store.multiAngleUrls]
    if (urls.length === 0) return

    const doSave = async (toSave: string[]) => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Allow photo library access.')
          return
        }
        for (const url of toSave) {
          const fileUri = `${FileSystem.cacheDirectory}multi_angle_${Date.now()}.jpg`
          await FileSystem.downloadAsync(url, fileUri)
          await MediaLibrary.saveToLibraryAsync(fileUri)
        }
        Alert.alert('Saved', `${toSave.length} image${toSave.length > 1 ? 's' : ''} saved.`)
      } catch {
        Alert.alert('Error', 'Failed to save images.')
      }
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Save All to Photos', 'Cancel'], cancelButtonIndex: 1 },
        (i) => { if (i === 0) doSave(urls) }
      )
    } else {
      doSave(urls)
    }
  }, [store])

  // ── Generating state ──
  if (store.multiAnglePhase === 'generating') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingScreen}>
          <ParticleSphere width={140} height={140} phase="generating" />
          <GenerationTimer label="Generating camera angles..." />
          <Text style={styles.loadingHint}>This usually takes 60-120 seconds</Text>
        </View>
      </View>
    )
  }

  // ── Upscaling state ──
  if (store.upscalePhase === 'generating') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingScreen}>
          <ParticleSphere width={140} height={140} phase="generating" />
          <GenerationTimer label="Upscaling..." />
          {store.upscaleProgress ? (
            <Text style={styles.loadingHint}>{store.upscaleProgress}</Text>
          ) : (
            <Text style={styles.loadingHint}>Enhancing to 4K quality</Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => { store.resetMultiAngle(); router.back() }} activeOpacity={0.7}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Camera Angles</Text>
          {store.multiAngleUrls.length > 0 ? (
            <TouchableOpacity style={styles.headerBtn} onPress={handleSave} activeOpacity={0.7}>
              <SaveIcon />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Source image preview */}
          {sourceUrl && store.multiAngleUrls.length === 0 && (
            <View style={styles.sourceSection}>
              <Image source={{ uri: sourceUrl }} style={styles.sourceImage} contentFit="cover" transition={200} />
              <View style={styles.sourceOverlay}>
                <Grid3x3Icon />
                <Text style={styles.sourceLabel}>Source Image</Text>
              </View>
            </View>
          )}

          {/* Angle preview labels (pre-generation) */}
          {store.multiAngleUrls.length === 0 && (
            <>
              <Text style={styles.sectionTitle}>9 Camera Angles</Text>
              <Text style={styles.sectionSub}>Same subject, same pose — only the camera moves</Text>
              <View style={styles.labelGrid}>
                {ANGLE_LABELS.map((label) => (
                  <View key={label} style={styles.labelCell}>
                    <Text style={styles.labelText}>{label}</Text>
                  </View>
                ))}
              </View>

              {/* Model picker */}
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>AI Model</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {MODEL_OPTIONS.map((opt) => {
                  const active = selectedModel === opt.value
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, styles.modelChip, active && styles.chipActive]}
                      onPress={() => setSelectedModel(opt.value)}
                      activeOpacity={0.8}
                    >
                      <opt.Icon size={16} />
                      <View style={styles.modelChipText}>
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                        <Text style={[styles.chipSub, active && styles.chipSubActive]}>{opt.credits} cr</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              {/* Aspect ratio picker */}
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Aspect Ratio</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {ASPECT_RATIOS.map((opt) => {
                  const active = aspectRatio === opt.value
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setAspectRatio(opt.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                      <Text style={[styles.chipSub, active && styles.chipSubActive]}>{opt.value}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              {/* Generate button */}
              <TouchableOpacity
                style={[styles.generateBtn, !sourceUrl && { opacity: 0.4 }]}
                onPress={handleGenerate}
                activeOpacity={0.8}
                disabled={!sourceUrl}
              >
                <LinearGradient colors={['#06B6D4', '#3B82F6', BG]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
                <Text style={styles.generateBtnText}>Generate Camera Angles ({costLabel})</Text>
              </TouchableOpacity>

              {store.multiAnglePhase === 'error' && (
                <Text style={styles.errorText}>{store.multiAngleError || 'Generation failed'}</Text>
              )}
            </>
          )}

          {/* Post-generation: 3×3 grid */}
          {store.multiAngleUrls.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                {store.multiAngleUrls.length} Camera Angles
              </Text>
              <Text style={styles.sectionSub}>
                Tap to select images to upscale to 4K
              </Text>
              <View style={styles.grid}>
                {store.multiAngleUrls.map((url, i) => {
                  const isSelected = selectedForUpscale.includes(i)
                  const label = ANGLE_LABELS[i] ?? `#${i + 1}`
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.gridCell, isSelected && styles.gridCellSelected]}
                      activeOpacity={0.85}
                      onPress={() => toggleUpscaleSelection(i)}
                      onLongPress={() =>
                        router.push({
                          pathname: '/image-viewer',
                          params: {
                            urls: JSON.stringify(store.multiAngleUrls),
                            initialIndex: String(i),
                            title: 'Camera Angles',
                          },
                        })
                      }
                    >
                      <Image source={{ uri: url }} style={styles.gridImage} contentFit="cover" transition={200} />
                      <View style={styles.angleLabel}>
                        <Text style={styles.angleLabelText}>{label}</Text>
                      </View>
                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <CheckIcon />
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Upscale bar */}
              {selectedForUpscale.length > 0 && (
                <TouchableOpacity
                  style={styles.upscaleBtn}
                  onPress={handleUpscale}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={[UPSCALE_BLUE, '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
                  <UpscaleIcon />
                  <Text style={styles.upscaleBtnText}>
                    Upscale {selectedForUpscale.length} to 4K ({upscaleCost} credits)
                  </Text>
                </TouchableOpacity>
              )}

              {store.upscalePhase === 'error' && (
                <Text style={styles.errorText}>{store.upscaleError || 'Upscale failed'}</Text>
              )}

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleGenerate} activeOpacity={0.7}>
                  <Text style={styles.actionBtnText}>Regenerate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnSave} onPress={handleSave} activeOpacity={0.8}>
                  <LinearGradient colors={['#FBBF24', '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
                  <SaveIcon />
                  <Text style={styles.actionBtnSaveText}>Save All</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  scrollContent: { padding: 16 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  sectionSub: { fontSize: 13, color: MUTED, marginBottom: 14 },

  // Source image
  sourceSection: { width: 120, height: 160, borderRadius: 14, overflow: 'hidden', marginBottom: 20, alignSelf: 'center' },
  sourceImage: { width: '100%', height: '100%' },
  sourceOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sourceLabel: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },

  // Angle label grid (pre-generation)
  labelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 16 },
  labelCell: {
    width: CELL_SIZE,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Chip pickers (model + aspect ratio)
  chipRow: { gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
  },
  chipActive: { borderColor: '#06B6D4', backgroundColor: 'rgba(6,182,212,0.12)' },
  modelChip: { flexDirection: 'row', gap: 8 },
  modelChipText: { alignItems: 'center' },
  chipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  chipTextActive: { color: '#06B6D4' },
  chipSub: { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  chipSubActive: { color: 'rgba(6,182,212,0.7)' },

  // Generate
  generateBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', overflow: 'hidden', marginTop: 16 },
  generateBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  errorText: { fontSize: 13, color: '#EF4444', marginTop: 12, textAlign: 'center' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, marginTop: 12 },
  gridCell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 12, overflow: 'hidden', backgroundColor: CARD_BG, borderWidth: 2, borderColor: 'transparent' },
  gridCellSelected: { borderColor: UPSCALE_BLUE },
  gridImage: { width: '100%', height: '100%' },
  angleLabel: {
    position: 'absolute', bottom: 4, left: 4,
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  angleLabelText: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 0.3 },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: UPSCALE_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Upscale
  upscaleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 16,
  },
  upscaleBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: CARD_BORDER },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  actionBtnSave: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, overflow: 'hidden' },
  actionBtnSaveText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  // Loading
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32, backgroundColor: BG },
  timerText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  loadingHint: { fontSize: 13, color: MUTED, textAlign: 'center' },
})
