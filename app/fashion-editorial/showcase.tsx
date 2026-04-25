import { ParticleSphere } from '@/components/particle-sphere'
import { AI_MODELS, getCostLabel } from '@/lib/ai-models'
import { analyzeFashionImage, generateFashionVariations, type FashionImageAnalysis } from '@/lib/api'
import { uploadImage } from '@/lib/upload'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useFashionEditorialStore } from '@/stores/use-fashion-editorial-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'
import * as FileSystem from 'expo-file-system/legacy'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import * as MediaLibrary from 'expo-media-library'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path as SvgPath } from 'react-native-svg'

const { width: SCREEN_W } = Dimensions.get('window')
const BG = '#193153'
const ACCENT = '#FBBF24'
const TEAL = '#0B5777'
const MUTED = 'rgba(255,255,255,0.55)'
const CARD_BG = 'rgba(255,255,255,0.05)'
const CARD_BORDER = 'rgba(255,255,255,0.08)'

const GRID_GAP = 4
const VARIATION_CELL = (SCREEN_W - 40 - GRID_GAP * 2) / 3

// ─── Pill Options ──────────────────────────────────────────────────

const ENVIRONMENT_OPTIONS = [
  { id: 'auto', label: 'Auto' },
  { id: 'car-interior', label: 'Car' },
  { id: 'beach', label: 'Beach' },
  { id: 'cafe', label: 'Cafe' },
  { id: 'street', label: 'Street' },
  { id: 'home-sunlit', label: 'Home' },
  { id: 'bathroom-mirror', label: 'Bathroom' },
  { id: 'park', label: 'Park' },
  { id: 'rooftop', label: 'Rooftop' },
  { id: 'gym', label: 'Gym' },
]

const LIGHTING_OPTIONS = [
  { id: 'auto', label: 'Auto' },
  { id: 'natural-sunlight', label: 'Sunlight' },
  { id: 'golden-hour', label: 'Golden Hour' },
  { id: 'window-light', label: 'Window' },
  { id: 'overcast-soft', label: 'Overcast' },
  { id: 'flash-direct', label: 'Flash' },
  { id: 'ring-light', label: 'Ring Light' },
  { id: 'neon-ambient', label: 'Neon' },
]

// ─── Local product state ───────────────────────────────────────────

type ProductPhase = 'empty' | 'uploading' | 'analyzing' | 'ready' | 'error'

interface ShowcaseProduct {
  localUri: string
  uploadedUrl: string | null
  analysis: FashionImageAnalysis | null
  phase: ProductPhase
  error?: string
}

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

function PlusIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M12 5v14M5 12h14" stroke={MUTED} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

function RemoveIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
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
  return <Text style={styles.timerText}>Creating product shots... {elapsed}s</Text>
}

// ─── Image Picker ──────────────────────────────────────────────────

function useImagePicker() {
  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (result.canceled || !result.assets?.[0]) return null
    return result.assets[0].uri
  }, [])

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Allow camera access to take photos.')
      return null
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (result.canceled || !result.assets?.[0]) return null
    return result.assets[0].uri
  }, [])

  const pickImage = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options: ['Take Photo', 'Choose from Library', 'Cancel'], cancelButtonIndex: 2 },
          async (i) => {
            if (i === 0) resolve(await takePhoto())
            else if (i === 1) resolve(await pickFromLibrary())
            else resolve(null)
          }
        )
      } else {
        Alert.alert('Add Product', undefined, [
          { text: 'Take Photo', onPress: async () => resolve(await takePhoto()) },
          { text: 'Choose from Library', onPress: async () => resolve(await pickFromLibrary()) },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        ])
      }
    })
  }, [takePhoto, pickFromLibrary])

  return pickImage
}

// ─── Main Screen ───────────────────────────────────────────────────

export default function ShowcaseScreen() {
  const router = useRouter()
  const store = useFashionEditorialStore()
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'
  const { requireConsent } = useTermsConsentStore()
  const pickImage = useImagePicker()

  const [environment, setEnvironment] = useState('auto')
  const [lighting, setLighting] = useState('auto')
  const [productInteraction, setProductInteraction] = useState('')

  // Local product state — independent from the clothing screen
  // Pre-populate from store.mainProductId if one was starred
  const starredItem = store.clothingItems.find((c) => c.id === store.mainProductId)
  const [product, setProduct] = useState<ShowcaseProduct | null>(
    starredItem?.phase === 'ready' && starredItem.uploadedUrl
      ? { localUri: starredItem.localUri, uploadedUrl: starredItem.uploadedUrl, analysis: starredItem.analysis, phase: 'ready' }
      : null
  )

  const costLabel = getCostLabel(AI_MODELS.GEMINI_3_IMAGE.id, isPayPerUse)

  // Pre-fill product interaction from analysis
  useEffect(() => {
    if (product?.analysis?.productName && !productInteraction) {
      setProductInteraction(`holding ${product.analysis.productName}`)
    }
  }, [product?.analysis?.productName])

  const handleAddProduct = useCallback(async () => {
    const uri = await pickImage()
    if (!uri) return

    setProduct({ localUri: uri, uploadedUrl: null, analysis: null, phase: 'uploading' })
    setProductInteraction('')

    try {
      const uploadedUrl = await uploadImage(uri)
      setProduct((p) => p ? { ...p, uploadedUrl, phase: 'analyzing' } : p)
      const analysis = await analyzeFashionImage(uploadedUrl)
      setProduct((p) => p ? {
        ...p,
        analysis: { productName: analysis.productName, productType: analysis.productType, clothingAnalysis: analysis.clothingAnalysis, itemCount: analysis.itemCount },
        phase: 'ready',
      } : p)
    } catch (err: any) {
      setProduct((p) => p ? { ...p, phase: 'error', error: err?.message || 'Failed' } : p)
    }
  }, [pickImage])

  const handleRemoveProduct = useCallback(() => {
    setProduct(null)
    setProductInteraction('')
  }, [])

  const canGenerate = !!store.heroImageUrl && product?.phase === 'ready'

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || !product) return
    if (!requireConsent(() => handleGenerate())) return

    // UGC generates 9 images
    const creditCost = (AI_MODELS.GEMINI_3_IMAGE.credits ?? 3) * 9
    if (!isPayPerUse && balance !== null && balance < creditCost) {
      setShowExhaustionModal(true)
      return
    }

    store.setShowcaseGenerating()
    try {
      const clothingUrls = store.clothingItems
        .filter((c) => c.phase === 'ready' && c.uploadedUrl)
        .map((c) => c.uploadedUrl!)

      // Include the showcase product URL too
      if (product.uploadedUrl && !clothingUrls.includes(product.uploadedUrl)) {
        clothingUrls.push(product.uploadedUrl)
      }

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
        poseStyle: 'product-focus',
        mainProductInfo: product.analysis
          ? {
              productName: product.analysis.productName,
              productType: product.analysis.productType,
              clothingAnalysis: product.analysis.clothingAnalysis,
            }
          : undefined,
        makeupAnalysis: store.makeupRef?.phase === 'ready' ? store.makeupRef.analysis! : undefined,
        hairstyleAnalysis,
        styleData: {
          style: 'ugc-selfie',
          mode: 'user-model',
          ugcControls: {
            subMode: 'product-ugc-selfie',
            environment,
            lighting,
            cameraType: 'auto',
            pose: 'holding-product',
            flash: false,
            productInteraction: productInteraction || undefined,
          },
        },
      })

      store.setShowcaseResult(result.variations)
      fetchCredits()
    } catch (err: any) {
      store.setShowcaseError(err?.message || 'Showcase generation failed')
    }
  }, [canGenerate, product, store, balance, isPayPerUse, requireConsent, fetchCredits, setShowExhaustionModal, environment, lighting, productInteraction])

  const handleSave = useCallback(async () => {
    const urls = [...store.showcaseUrls]
    if (urls.length === 0) return

    const doSave = async (toSave: string[]) => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Allow photo library access.')
          return
        }
        for (const url of toSave) {
          const fileUri = `${FileSystem.cacheDirectory}showcase_${Date.now()}.jpg`
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
  if (store.showcasePhase === 'generating') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingScreen}>
          <ParticleSphere width={140} height={140} phase="generating" />
          <GenerationTimer />
          <Text style={styles.loadingHint}>Generating 9 product shots — usually 90-180 seconds</Text>
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
          <Text style={styles.headerTitle}>Product Showcase</Text>
          {store.showcaseUrls.length > 0 ? (
            <TouchableOpacity style={styles.headerBtn} onPress={handleSave} activeOpacity={0.7}>
              <SaveIcon />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ── Product upload ── */}
          <Text style={styles.sectionTitle}>Product to Showcase</Text>
          <Text style={styles.sectionSub}>Add the product your model will interact with</Text>

          {!product ? (
            <TouchableOpacity style={styles.productUpload} onPress={handleAddProduct} activeOpacity={0.7}>
              <PlusIcon />
              <Text style={styles.productUploadText}>Add Product</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.productCard}>
              <Image source={{ uri: product.localUri }} style={styles.productThumb} contentFit="cover" transition={200} />
              <View style={styles.productInfo}>
                {product.phase === 'uploading' && (
                  <View style={styles.productStatus}>
                    <ActivityIndicator color={ACCENT} size="small" />
                    <Text style={styles.productStatusText}>Uploading...</Text>
                  </View>
                )}
                {product.phase === 'analyzing' && (
                  <View style={styles.productStatus}>
                    <ActivityIndicator color={ACCENT} size="small" />
                    <Text style={styles.productStatusText}>Analyzing...</Text>
                  </View>
                )}
                {product.phase === 'ready' && product.analysis && (
                  <>
                    <Text style={styles.productName}>{product.analysis.productName}</Text>
                    <Text style={styles.productType}>{product.analysis.productType}</Text>
                  </>
                )}
                {product.phase === 'error' && (
                  <Text style={styles.productErrorText}>{product.error || 'Failed to analyze'}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.productRemove} onPress={handleRemoveProduct}>
                <RemoveIcon />
              </TouchableOpacity>
            </View>
          )}

          {/* ── UGC Controls (only after product is ready) ── */}
          {product?.phase === 'ready' && (
            <>
              {/* Environment picker */}
              <Text style={styles.sectionTitle}>Environment</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {ENVIRONMENT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.pill, environment === opt.id && styles.pillActive]}
                    onPress={() => setEnvironment(opt.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, environment === opt.id && styles.pillTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Lighting picker */}
              <Text style={styles.sectionTitle}>Lighting</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {LIGHTING_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.pill, lighting === opt.id && styles.pillActive]}
                    onPress={() => setLighting(opt.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, lighting === opt.id && styles.pillTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Product interaction */}
              <Text style={styles.sectionTitle}>Product Interaction</Text>
              <TextInput
                style={styles.interactionInput}
                value={productInteraction}
                onChangeText={setProductInteraction}
                placeholder="e.g., applying lip gloss, holding bottle near face"
                placeholderTextColor="rgba(255,255,255,0.3)"
                maxLength={200}
              />

              {/* Generate button */}
              {store.showcaseUrls.length === 0 && (
                <>
                  <TouchableOpacity
                    style={[styles.generateBtn, !canGenerate && styles.generateBtnDisabled]}
                    onPress={handleGenerate}
                    activeOpacity={0.8}
                    disabled={!canGenerate}
                  >
                    <LinearGradient colors={[TEAL, '#0891B2', BG]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
                    <Text style={styles.generateBtnText}>Generate 9 Product Shots ({costLabel})</Text>
                  </TouchableOpacity>

                  {store.showcasePhase === 'error' && (
                    <Text style={styles.errorText}>{store.showcaseError || 'Generation failed'}</Text>
                  )}
                </>
              )}
            </>
          )}

          {/* Results grid */}
          {store.showcaseUrls.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                {store.showcaseUrls.length} Product Shots
              </Text>
              <View style={styles.grid}>
                {store.showcaseUrls.map((url, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.gridCell}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: '/image-viewer',
                        params: {
                          urls: JSON.stringify(store.showcaseUrls),
                          initialIndex: String(i),
                          title: 'Product Showcase',
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
                <TouchableOpacity style={styles.actionBtn} onPress={() => { store.resetShowcase() }} activeOpacity={0.7}>
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

  sectionTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 8, marginTop: 16 },
  sectionSub: { fontSize: 13, color: MUTED, marginBottom: 12, lineHeight: 18 },

  // Product upload
  productUpload: {
    height: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CARD_BG,
  },
  productUploadText: { fontSize: 14, color: MUTED, fontWeight: '500' },

  // Product card (after upload)
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  productThumb: { width: 56, height: 56, borderRadius: 10 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  productType: { fontSize: 12, color: MUTED, marginTop: 2 },
  productStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productStatusText: { fontSize: 13, color: MUTED },
  productErrorText: { fontSize: 13, color: '#EF4444' },
  productRemove: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },

  // Pills
  pillRow: { gap: 8, paddingRight: 16, marginBottom: 4 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER },
  pillActive: { backgroundColor: 'rgba(8,145,178,0.2)', borderColor: '#0891B2' },
  pillText: { fontSize: 13, fontWeight: '500', color: MUTED },
  pillTextActive: { color: '#0891B2', fontWeight: '600' },

  // Interaction input
  interactionInput: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },

  // Generate
  generateBtn: { marginTop: 20, paddingVertical: 18, borderRadius: 16, alignItems: 'center', overflow: 'hidden' },
  generateBtnDisabled: { opacity: 0.4 },
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
