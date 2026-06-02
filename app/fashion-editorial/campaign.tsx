import { ParticleSphere } from '@/components/particle-sphere'
import { AI_MODELS, getCostLabel, getModelCredits } from '@/lib/ai-models'
import { generateFashionVariations, upscaleFashionEditorial, type UpscaleProgress } from '@/lib/api'
import { queryKeys } from '@/lib/query'
import { useCreditsStore } from '@/stores/use-credits-store'
import {
  POSE_PRESETS,
  useFashionEditorialStore,
} from '@/stores/use-fashion-editorial-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { requireAllConsents } from '@/stores/use-consent-guards'
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
import Svg, { Path as SvgPath } from 'react-native-svg'
import { MidjourneyParamsPanel, DEFAULT_MJ_PARAMS, buildMjFlags, type MjParams } from '@/components/midjourney-params'

const { width: SCREEN_W } = Dimensions.get('window')
const BG = '#193153'
const ACCENT = '#FBBF24'
const TEAL = '#0B5777'
const UPSCALE_BLUE = '#3B82F6'
const MUTED = 'rgba(255,255,255,0.55)'
const CARD_BG = 'rgba(255,255,255,0.05)'
const CARD_BORDER = 'rgba(255,255,255,0.08)'

const GRID_GAP = 4
const VARIATION_CELL = (SCREEN_W - 40 - GRID_GAP * 2) / 3
const POSE_CARD_W = 110
const POSE_CARD_H = 140
const CREDITS_PER_UPSCALE = AI_MODELS.GEMINI_3_IMAGE.credits ?? 3

const CAMPAIGN_MODEL_OPTIONS = [
  { value: AI_MODELS.GEMINI_3_IMAGE.id, label: 'Nano Banana Pro', credits: getModelCredits(AI_MODELS.GEMINI_3_IMAGE.id) },
  { value: AI_MODELS.GEMINI_3_1_FLASH_IMAGE.id, label: 'Nano Banana 2', credits: getModelCredits(AI_MODELS.GEMINI_3_1_FLASH_IMAGE.id) },
  { value: AI_MODELS.MIDJOURNEY_V7.id, label: 'Midjourney V7', credits: getModelCredits(AI_MODELS.MIDJOURNEY_V7.id) },
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

export default function CampaignScreen() {
  const router = useRouter()
  const store = useFashionEditorialStore()
  const queryClient = useQueryClient()
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'

  const [selectedForUpscale, setSelectedForUpscale] = useState<number[]>([])
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS.GEMINI_3_IMAGE.id)
  const [mjParams, setMjParams] = useState<MjParams>(DEFAULT_MJ_PARAMS)

  const costLabel = getCostLabel(selectedModel, isPayPerUse)
  const upscaleCost = selectedForUpscale.length * CREDITS_PER_UPSCALE

  const toggleUpscaleSelection = useCallback((index: number) => {
    setSelectedForUpscale((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!store.canGenerateVariations()) return
    if (!requireAllConsents(() => handleGenerate())) return

    const creditCost = getModelCredits(selectedModel)
    if (!isPayPerUse && balance !== null && balance < creditCost) {
      setShowExhaustionModal(true)
      return
    }

    store.setVariationsGenerating()
    setSelectedForUpscale([])
    try {
      const clothingUrls = store.clothingItems
        .filter((c) => c.phase === 'ready' && c.uploadedUrl)
        .map((c) => c.uploadedUrl!)

      const mainProduct = store.clothingItems.find((c) => c.phase === 'ready' && c.analysis)

      let hairstyleAnalysis: string | undefined
      if (store.hairstyleRef?.phase === 'ready') {
        hairstyleAnalysis = [store.hairstyleRef.styleAnalysis, store.hairstyleRef.colorAnalysis]
          .filter(Boolean)
          .join(' ')
      }

      const result = await generateFashionVariations({
        baseImageUrl: store.heroImageUrl!,
        modelImageUrls: store.selectedModelImageUrl ? [store.selectedModelImageUrl] : undefined,
        clothingImageUrls: clothingUrls,
        poseStyle: store.poseStyle,
        model: selectedModel,
        ...(selectedModel === AI_MODELS.MIDJOURNEY_V7.id ? { mjParams } : {}),
        mainProductInfo: mainProduct?.analysis
          ? {
            productName: mainProduct.analysis.productName,
            productType: mainProduct.analysis.productType,
            clothingAnalysis: mainProduct.analysis.clothingAnalysis,
          }
          : undefined,
        makeupAnalysis: store.makeupRef?.phase === 'ready' ? store.makeupRef.analysis! : undefined,
        hairstyleAnalysis,
      })

      store.setVariationsResult(result.variations)
      fetchCredits()
    } catch (err: any) {
      store.setVariationsError(err?.message || 'Variations failed')
    }
  }, [store, selectedModel, balance, isPayPerUse, fetchCredits, setShowExhaustionModal])

  const handleUpscale = useCallback(async () => {
    if (selectedForUpscale.length === 0) return
    if (!requireAllConsents(() => handleUpscale())) return

    if (!isPayPerUse && balance !== null && balance < upscaleCost) {
      setShowExhaustionModal(true)
      return
    }

    const imageUrls = selectedForUpscale.map((i) => store.variationUrls[i])
    store.setUpscaleGenerating()

    try {
      const result = await upscaleFashionEditorial(imageUrls, '3:4', (event: UpscaleProgress) => {
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
            title: 'Upscaled Variations',
          },
        })
      }
    } catch (err: any) {
      store.setUpscaleError(err?.message || 'Upscale failed')
    }
  }, [selectedForUpscale, store, balance, isPayPerUse, upscaleCost, fetchCredits, setShowExhaustionModal, queryClient, router])

  const handleSave = useCallback(async () => {
    const urls = [...store.variationUrls]
    if (store.heroImageUrl) urls.unshift(store.heroImageUrl)
    if (urls.length === 0) return

    const doSave = async (toSave: string[]) => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Allow photo library access.')
          return
        }
        for (const url of toSave) {
          const fileUri = `${FileSystem.cacheDirectory}editorial_${Date.now()}.jpg`
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
  if (store.variationsPhase === 'generating') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingScreen}>
          <ParticleSphere width={140} height={140} phase="generating" />
          <GenerationTimer label="Generating variations..." />
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
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Campaign</Text>
          {store.variationUrls.length > 0 ? (
            <TouchableOpacity style={styles.headerBtn} onPress={handleSave} activeOpacity={0.7}>
              <SaveIcon />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Model picker */}
          <Text style={styles.sectionTitle}>AI Model</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
            {CAMPAIGN_MODEL_OPTIONS.map((opt) => {
              const active = selectedModel === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: active ? 'rgba(251,191,36,0.12)' : CARD_BG,
                    borderWidth: 1, borderColor: active ? ACCENT : CARD_BORDER,
                    alignItems: 'center',
                  }}
                  onPress={() => setSelectedModel(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? ACCENT : 'rgba(255,255,255,0.6)' }}>{opt.label}</Text>
                  <Text style={{ fontSize: 10, color: active ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.3)', marginTop: 2 }}>{opt.credits} cr</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Midjourney V7 params — visible when MJ is selected */}
          {selectedModel === AI_MODELS.MIDJOURNEY_V7.id && (
            <MidjourneyParamsPanel
              params={mjParams}
              onChange={setMjParams}
              showImageWeight={!!store.heroImageUrl}
            />
          )}

          {/* Pose selection */}
          <Text style={styles.sectionTitle}>Pose Style</Text>
          <Text style={styles.sectionSub}>Choose the pose for your variations</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.poseRow}>
            {POSE_PRESETS.map((p) => {
              const active = store.poseStyle === p.id
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.poseCard, active && styles.poseCardActive]}
                  onPress={() => store.setPoseStyle(p.id)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={p.preview}
                    style={styles.poseImage}
                    contentFit="cover"
                    transition={200}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.75)']}
                    style={styles.poseOverlay}
                  />
                  <Text style={styles.poseLabel}>{p.label}</Text>
                  {active && <View style={styles.poseCheck} />}
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Generate button */}
          {store.variationUrls.length === 0 && (
            <>
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={handleGenerate}
                activeOpacity={0.8}
              >
                <LinearGradient colors={[TEAL, '#0891B2', BG]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
                <Text style={styles.generateBtnText}>Generate 9 Variations ({costLabel})</Text>
              </TouchableOpacity>

              {store.variationsPhase === 'error' && (
                <Text style={styles.errorText}>{store.variationsError || 'Generation failed'}</Text>
              )}
            </>
          )}

          {/* Variations grid */}
          {store.variationUrls.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                {store.variationUrls.length} Variations
              </Text>
              <Text style={styles.sectionSub}>
                Tap to select images to upscale to 4K
              </Text>
              <View style={styles.grid}>
                {store.variationUrls.map((url, i) => {
                  const isSelected = selectedForUpscale.includes(i)
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
                            urls: JSON.stringify(store.variationUrls),
                            initialIndex: String(i),
                            title: 'Campaign Variations',
                          },
                        })
                      }
                    >
                      <Image source={{ uri: url }} style={styles.gridImage} contentFit="cover" transition={200} />
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

  // Pose cards
  poseRow: { gap: 10, paddingRight: 16, marginBottom: 24 },
  poseCard: {
    width: POSE_CARD_W,
    height: POSE_CARD_H,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: CARD_BG,
  },
  poseCardActive: { borderColor: ACCENT },
  poseImage: { width: '100%', height: '100%' },
  poseOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 50 },
  poseLabel: { position: 'absolute', bottom: 8, left: 8, right: 8, fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  poseCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACCENT,
  },

  // Generate
  generateBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', overflow: 'hidden' },
  generateBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  errorText: { fontSize: 13, color: '#EF4444', marginTop: 12, textAlign: 'center' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, marginTop: 12 },
  gridCell: { width: VARIATION_CELL, height: VARIATION_CELL, borderRadius: 12, overflow: 'hidden', backgroundColor: CARD_BG, borderWidth: 2, borderColor: 'transparent' },
  gridCellSelected: { borderColor: UPSCALE_BLUE },
  gridImage: { width: '100%', height: '100%' },
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
