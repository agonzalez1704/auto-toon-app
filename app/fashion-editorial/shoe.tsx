import { analyzeFashionImage } from '@/lib/api'
import { uploadImage } from '@/lib/upload'
import { NodeTutorialSheet } from '@/components/node-tutorial-sheet'
import { useFashionEditorialStore, type ShoeItem } from '@/stores/use-fashion-editorial-store'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
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
const COLS = 3
const GRID_GAP = 8
const CELL_SIZE = (SCREEN_W - 40 - GRID_GAP * (COLS - 1)) / COLS

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M19 12H5M12 19l-7-7 7-7" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
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

function useImagePicker() {
  const pickFromLibrary = useCallback(async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (r.canceled || !r.assets?.[0]) return null
    return r.assets[0].uri
  }, [])
  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Allow camera access to take photos.')
      return null
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (r.canceled || !r.assets?.[0]) return null
    return r.assets[0].uri
  }, [])
  return useCallback((): Promise<string | null> => new Promise((resolve) => {
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
      Alert.alert('Add Shoe', undefined, [
        { text: 'Take Photo', onPress: async () => resolve(await takePhoto()) },
        { text: 'Choose from Library', onPress: async () => resolve(await pickFromLibrary()) },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ])
    }
  }), [takePhoto, pickFromLibrary])
}

function ShoeCell({ item, onRemove }: { item: ShoeItem; onRemove: () => void }) {
  const isLoading = item.phase === 'uploading' || item.phase === 'analyzing'
  return (
    <View style={styles.cell}>
      <Image source={{ uri: item.localUri }} style={styles.cellImage} contentFit="cover" transition={200} />
      {isLoading && (
        <View style={styles.cellOverlay}>
          <ActivityIndicator color={ACCENT} size="small" />
          <Text style={styles.cellPhaseText}>{item.phase === 'uploading' ? 'Uploading...' : 'Analyzing...'}</Text>
        </View>
      )}
      {item.phase === 'ready' && item.shoeName && (
        <View style={styles.cellBadge}>
          <Text style={styles.cellBadgeText} numberOfLines={1}>{item.shoeName}</Text>
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

export default function ShoeScreen() {
  const router = useRouter()
  const store = useFashionEditorialStore()
  const pickImage = useImagePicker()

  const handleAddShoe = useCallback(async () => {
    const uri = await pickImage()
    if (!uri) return
    const item = store.addShoeItem(uri)
    store.updateShoeItem(item.id, { phase: 'uploading' })
    try {
      const uploadedUrl = await uploadImage(uri)
      store.updateShoeItem(item.id, { uploadedUrl, phase: 'analyzing' })
      const analysis = await analyzeFashionImage(uploadedUrl, 'shoe')
      store.updateShoeItem(item.id, {
        shoeName: analysis.productName,
        shoeType: analysis.productType,
        shoeAnalysis: analysis.clothingAnalysis,
        phase: 'ready',
      })
    } catch (err: any) {
      store.updateShoeItem(item.id, { phase: 'error', error: err?.message || 'Failed' })
    }
  }, [pickImage, store])

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <NodeTutorialSheet
        storageKey="fe-tutorial-seen-shoe"
        title="Footwear"
        intro="Upload the shoe(s) you want featured. The AI extracts silhouette, material, hardware, and stitching — and treats them as the photographic hero of every generation."
        items={[
          { label: 'Pumps', description: 'Heels, stilettos, kitten' },
          { label: 'Sneakers', description: 'Athletic, casual' },
          { label: 'Boots', description: 'Ankle, knee, chunky' },
          { label: 'Sandals', description: 'Flat, strap, mule' },
          { label: 'Loafers', description: 'Flat, classic' },
          { label: 'Detail Shot', description: 'Side / sole / hardware' },
        ]}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Footwear</Text>
          <View style={styles.headerBtnSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Add your shoes</Text>
          <Text style={styles.sectionSub}>Each shoe is analyzed for silhouette, material, hardware, and detail.</Text>
          <View style={styles.grid}>
            {store.shoeItems.map((item) => (
              <ShoeCell key={item.id} item={item} onRemove={() => store.removeShoeItem(item.id)} />
            ))}
            <TouchableOpacity style={styles.addCell} onPress={handleAddShoe} activeOpacity={0.7}>
              <PlusIcon />
              <Text style={styles.addCellText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerBtnSpacer: { width: 40 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  sectionSub: { fontSize: 13, color: MUTED, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 12, overflow: 'hidden', backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER },
  cellImage: { width: '100%', height: '100%' },
  cellOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', gap: 6 } as any,
  cellPhaseText: { fontSize: 10, color: '#FFFFFF' },
  cellBadge: { position: 'absolute', bottom: 6, left: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  cellBadgeText: { fontSize: 10, color: '#FFFFFF', fontWeight: '600' },
  cellRemove: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  addCell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 12, borderWidth: 2, borderColor: CARD_BORDER, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  addCellText: { fontSize: 11, color: MUTED, fontWeight: '600' },
})
