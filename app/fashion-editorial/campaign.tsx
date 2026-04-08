import { useCallback, useRef, useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as FileSystem from 'expo-file-system/legacy'
import * as MediaLibrary from 'expo-media-library'
import Svg, { Path as SvgPath } from 'react-native-svg'
import {
  useFashionEditorialStore,
  POSE_PRESETS,
} from '@/stores/use-fashion-editorial-store'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'
import { generateFashionVariations } from '@/lib/api'
import { getCostLabel, AI_MODELS } from '@/lib/ai-models'
import { ParticleSphere } from '@/components/particle-sphere'

const { width: SCREEN_W } = Dimensions.get('window')
const BG = '#193153'
const ACCENT = '#FBBF24'
const TEAL = '#0B5777'
const MUTED = 'rgba(255,255,255,0.55)'
const CARD_BG = 'rgba(255,255,255,0.05)'
const CARD_BORDER = 'rgba(255,255,255,0.08)'

const GRID_GAP = 4
const VARIATION_CELL = (SCREEN_W - 40 - GRID_GAP * 2) / 3

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

// ─── Timer ─────────────────────────────────────────────────────────

function GenerationTimer() {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())
  useEffect(() => {
    startRef.current = Date.now()
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [])
  return <Text style={styles.timerText}>Generating variations... {elapsed}s</Text>
}

// ─── Main Screen ───────────────────────────────────────────────────

export default function CampaignScreen() {
  const router = useRouter()
  const store = useFashionEditorialStore()
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'
  const { requireConsent } = useTermsConsentStore()

  const costLabel = getCostLabel(AI_MODELS.GEMINI_3_IMAGE.id, isPayPerUse)

  const handleGenerate = useCallback(async () => {
    if (!store.canGenerateVariations()) return
    if (requireConsent) return

    const creditCost = AI_MODELS.GEMINI_3_IMAGE.credits ?? 3
    if (!isPayPerUse && balance !== null && balance < creditCost) {
      setShowExhaustionModal(true)
      return
    }

    store.setVariationsGenerating()
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
  }, [store, balance, isPayPerUse, requireConsent, fetchCredits, setShowExhaustionModal])

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
          <GenerationTimer />
          <Text style={styles.loadingHint}>This usually takes 60-120 seconds</Text>
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
          {/* Pose selection */}
          <Text style={styles.sectionTitle}>Pose Style</Text>
          <Text style={styles.sectionSub}>Choose the pose for your variations</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.poseRow}>
            {POSE_PRESETS.map((p) => {
              const active = store.poseStyle === p.id
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.posePill, active && styles.posePillActive]}
                  onPress={() => store.setPoseStyle(p.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.posePillText, active && styles.posePillTextActive]}>{p.label}</Text>
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
              <View style={styles.grid}>
                {store.variationUrls.map((url, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.gridCell}
                    activeOpacity={0.85}
                    onPress={() =>
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
                  </TouchableOpacity>
                ))}
              </View>

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

  // Pose pills
  poseRow: { gap: 8, marginBottom: 24 },
  posePill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER, backgroundColor: CARD_BG },
  posePillActive: { borderColor: ACCENT, backgroundColor: 'rgba(251,191,36,0.1)' },
  posePillText: { fontSize: 14, fontWeight: '500', color: MUTED },
  posePillTextActive: { color: ACCENT, fontWeight: '600' },

  // Generate
  generateBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', overflow: 'hidden' },
  generateBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  errorText: { fontSize: 13, color: '#EF4444', marginTop: 12, textAlign: 'center' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, marginTop: 12 },
  gridCell: { width: VARIATION_CELL, height: VARIATION_CELL, borderRadius: 12, overflow: 'hidden', backgroundColor: CARD_BG },
  gridImage: { width: '100%', height: '100%' },

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
