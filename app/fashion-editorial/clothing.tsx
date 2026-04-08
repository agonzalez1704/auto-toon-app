import { analyzeFashionImage } from '@/lib/api'
import { uploadImage } from '@/lib/upload'
import {
  useFashionEditorialStore,
  type ClothingItem,
} from '@/stores/use-fashion-editorial-store'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCallback } from 'react'
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
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path as SvgPath } from 'react-native-svg'

const { width: SCREEN_W } = Dimensions.get('window')
const BG = '#193153'
const ACCENT = '#FBBF24'
const MUTED = 'rgba(255,255,255,0.55)'
const CARD_BG = 'rgba(255,255,255,0.05)'
const CARD_BORDER = 'rgba(255,255,255,0.08)'

const GRID_GAP = 8
const COLS = 3
const CELL_SIZE = (SCREEN_W - 40 - GRID_GAP * (COLS - 1)) / COLS

// ─── Icons ─────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M19 12H5M12 19l-7-7 7-7" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function PlusIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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

function ArrowRightIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M5 12h14M13 6l6 6-6 6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Image Picker Helper ───────────────────────────────────────────

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
        Alert.alert('Add Image', undefined, [
          { text: 'Take Photo', onPress: async () => resolve(await takePhoto()) },
          { text: 'Choose from Library', onPress: async () => resolve(await pickFromLibrary()) },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        ])
      }
    })
  }, [takePhoto, pickFromLibrary])

  return pickImage
}

// ─── Clothing Cell ─────────────────────────────────────────────────

function ClothingCell({ item, onRemove }: { item: ClothingItem; onRemove: () => void }) {
  const isLoading = item.phase === 'uploading' || item.phase === 'analyzing'
  return (
    <View style={styles.cell}>
      <Image source={{ uri: item.localUri }} style={styles.cellImage} contentFit="cover" transition={200} />
      {isLoading && (
        <View style={styles.cellOverlay}>
          <ActivityIndicator color={ACCENT} size="small" />
          <Text style={styles.cellPhaseText}>
            {item.phase === 'uploading' ? 'Uploading...' : 'Analyzing...'}
          </Text>
        </View>
      )}
      {item.phase === 'ready' && item.analysis && (
        <View style={styles.cellBadge}>
          <Text style={styles.cellBadgeText} numberOfLines={1}>{item.analysis.productName}</Text>
        </View>
      )}
      {item.phase === 'error' && (
        <View style={[styles.cellBadge, { backgroundColor: 'rgba(239,68,68,0.85)' }]}>
          <Text style={styles.cellBadgeText}>Error</Text>
        </View>
      )}
      <TouchableOpacity style={styles.cellRemove} onPress={onRemove}>
        <RemoveIcon />
      </TouchableOpacity>
    </View>
  )
}

// ─── Main Screen ───────────────────────────────────────────────────

export default function ClothingScreen() {
  const router = useRouter()
  const store = useFashionEditorialStore()
  const pickImage = useImagePicker()

  const handleAddClothing = useCallback(async () => {
    const uri = await pickImage()
    if (!uri) return

    const item = store.addClothingItem(uri)
    store.updateClothingItem(item.id, { phase: 'uploading' })

    try {
      const uploadedUrl = await uploadImage(uri)
      store.updateClothingItem(item.id, { uploadedUrl, phase: 'analyzing' })
      const analysis = await analyzeFashionImage(uploadedUrl)
      store.updateClothingItem(item.id, {
        analysis: {
          productName: analysis.productName,
          productType: analysis.productType,
          clothingAnalysis: analysis.clothingAnalysis,
          itemCount: analysis.itemCount,
        },
        phase: 'ready',
      })
    } catch (err: any) {
      store.updateClothingItem(item.id, { phase: 'error', error: err?.message || 'Failed' })
    }
  }, [pickImage, store])

  const handleContinue = useCallback(() => {
    const hasReady = store.clothingItems.some((c) => c.phase === 'ready')
    if (!hasReady) return
    router.push('/fashion-editorial/generate')
  }, [store, router])

  const hasReady = store.clothingItems.some((c) => c.phase === 'ready')

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Clothing & Products</Text>
          <View style={styles.headerBtnSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Add your products</Text>
          <Text style={styles.sectionSub}>
            Take photos or pick from your library. Each image is analyzed automatically.
          </Text>

          {/* ── Grid ── */}
          <View style={styles.grid}>
            {store.clothingItems.map((item) => (
              <ClothingCell
                key={item.id}
                item={item}
                onRemove={() => store.removeClothingItem(item.id)}
              />
            ))}

            {/* Add button */}
            <TouchableOpacity style={styles.addCell} onPress={handleAddClothing} activeOpacity={0.7}>
              <PlusIcon />
              <Text style={styles.addCellText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* ── Optional: Makeup & Hairstyle links ── */}
          <View style={styles.optionalSection}>
            <Text style={styles.optionalTitle}>Optional References</Text>
            <View style={styles.optionalRow}>
              <TouchableOpacity
                style={styles.optionalCard}
                onPress={() => router.push('/fashion-editorial/makeup')}
                activeOpacity={0.7}
              >
                {store.makeupRef?.localUri ? (
                  <Image source={{ uri: store.makeupRef.localUri }} style={styles.optionalThumb} contentFit="cover" />
                ) : (
                  <Text style={styles.optionalIcon}>M</Text>
                )}
                <Text style={styles.optionalLabel}>
                  {store.makeupRef?.phase === 'ready' ? 'Makeup Added' : 'Add Makeup'}
                </Text>
                {store.makeupRef?.phase === 'ready' && <View style={styles.optionalDot} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionalCard}
                onPress={() => router.push('/fashion-editorial/hairstyle')}
                activeOpacity={0.7}
              >
                {store.hairstyleRef?.localUri ? (
                  <Image source={{ uri: store.hairstyleRef.localUri }} style={styles.optionalThumb} contentFit="cover" />
                ) : (
                  <Text style={styles.optionalIcon}>H</Text>
                )}
                <Text style={styles.optionalLabel}>
                  {store.hairstyleRef?.phase === 'ready' ? 'Hairstyle Added' : 'Add Hairstyle'}
                </Text>
                {store.hairstyleRef?.phase === 'ready' && <View style={styles.optionalDot} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Bottom Continue ── */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.continueBtn, !hasReady && styles.continueBtnDisabled]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={!hasReady}
          >
            <LinearGradient colors={['#FBBF24', '#F59E0B', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
            <Text style={styles.continueBtnText}>Continue to Generate</Text>
            <ArrowRightIcon />
          </TouchableOpacity>
        </View>
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
  headerBtnSpacer: { width: 40 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  sectionSub: { fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 18 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 14, overflow: 'hidden', backgroundColor: CARD_BG },
  cellImage: { width: '100%', height: '100%' },
  cellOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', gap: 4 },
  cellPhaseText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  cellBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 6, paddingVertical: 4 },
  cellBadgeText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  cellRemove: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },

  addCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CARD_BG,
  },
  addCellText: { fontSize: 12, color: MUTED, fontWeight: '500' },

  // Optional refs
  optionalSection: { marginTop: 28 },
  optionalTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  optionalRow: { flexDirection: 'row', gap: 12 },
  optionalCard: {
    flex: 1,
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: CARD_BG,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  optionalThumb: { ...StyleSheet.absoluteFillObject, opacity: 0.4 },
  optionalIcon: { fontSize: 22, fontWeight: '700', color: 'rgba(255,255,255,0.12)' },
  optionalLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  optionalDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 34,
    backgroundColor: 'rgba(15,15,19,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, overflow: 'hidden' },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
})
