import { useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
  ActionSheetIOS,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import Svg, { Path as SvgPath } from 'react-native-svg'
import { useFashionEditorialStore } from '@/stores/use-fashion-editorial-store'
import { analyzeHairstyle } from '@/lib/api'

const { width: SCREEN_W } = Dimensions.get('window')
const BG = '#193153'
const ACCENT = '#FBBF24'
const MUTED = 'rgba(255,255,255,0.55)'
const CARD_BG = 'rgba(255,255,255,0.05)'
const CARD_BORDER = 'rgba(255,255,255,0.08)'

function CloseIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export default function HairstyleScreen() {
  const router = useRouter()
  const store = useFashionEditorialStore()
  const ref = store.hairstyleRef

  const handlePick = useCallback(async () => {
    const pick = (source: 'library' | 'camera'): Promise<string | null> =>
      new Promise(async (resolve) => {
        if (source === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync()
          if (status !== 'granted') { Alert.alert('Permission Required'); resolve(null); return }
          const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
          resolve(r.canceled ? null : r.assets?.[0]?.uri ?? null)
        } else {
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
          resolve(r.canceled ? null : r.assets?.[0]?.uri ?? null)
        }
      })

    const uri = await new Promise<string | null>((resolve) => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options: ['Take Photo', 'Choose from Library', 'Cancel'], cancelButtonIndex: 2 },
          async (i) => resolve(i === 0 ? await pick('camera') : i === 1 ? await pick('library') : null)
        )
      } else {
        Alert.alert('Add Image', undefined, [
          { text: 'Take Photo', onPress: async () => resolve(await pick('camera')) },
          { text: 'Library', onPress: async () => resolve(await pick('library')) },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        ])
      }
    })

    if (!uri) return

    store.setHairstyleRef({ localUri: uri, styleAnalysis: null, colorAnalysis: null, mode: null, phase: 'analyzing' })
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
      const result = await analyzeHairstyle(base64)
      store.updateHairstyleRef({
        styleAnalysis: result.styleAnalysis,
        colorAnalysis: result.colorAnalysis,
        mode: result.mode,
        phase: 'ready',
      })
    } catch (err: any) {
      store.updateHairstyleRef({ phase: 'error', error: err?.message || 'Failed' })
    }
  }, [store])

  const analysisPreview = ref?.phase === 'ready'
    ? [ref.styleAnalysis, ref.colorAnalysis].filter(Boolean).join(' ')
    : null

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <CloseIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hairstyle Reference</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {!ref?.localUri ? (
            <>
              <Text style={styles.hint}>Upload a face photo showing a hairstyle or a hair product image.</Text>
              <TouchableOpacity style={styles.pickBtn} onPress={handlePick} activeOpacity={0.7}>
                <Text style={styles.pickBtnText}>Select Image</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.imageWrap}>
                <Image source={{ uri: ref.localUri }} style={styles.image} contentFit="contain" transition={200} />
                {ref.phase === 'analyzing' && (
                  <View style={styles.overlay}>
                    <ActivityIndicator color={ACCENT} size="large" />
                    <Text style={styles.overlayText}>Analyzing hairstyle...</Text>
                  </View>
                )}
              </View>

              {ref.phase === 'ready' && (
                <View style={styles.analysisBox}>
                  <View style={styles.modeBadge}>
                    <Text style={styles.modeBadgeText}>{ref.mode === 'face' ? 'Face Detected' : 'Product Detected'}</Text>
                  </View>
                  <Text style={styles.analysisText} numberOfLines={6}>{analysisPreview}</Text>
                </View>
              )}

              {ref.phase === 'error' && (
                <Text style={styles.errorText}>Analysis failed. Try another image.</Text>
              )}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={handlePick} activeOpacity={0.7}>
                  <Text style={styles.actionBtnText}>Replace</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => { store.setHairstyleRef(null) }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  content: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  hint: { fontSize: 15, color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 24, maxWidth: 280 },
  pickBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: CARD_BORDER },
  pickBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  imageWrap: { width: SCREEN_W - 40, height: SCREEN_W - 40, borderRadius: 16, overflow: 'hidden', backgroundColor: CARD_BG },
  image: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', gap: 8 },
  overlayText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  analysisBox: { marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, width: '100%' },
  modeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(139,92,246,0.2)', marginBottom: 8 },
  modeBadgeText: { fontSize: 11, fontWeight: '700', color: '#A78BFA' },
  analysisText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 18 },
  errorText: { fontSize: 14, color: '#EF4444', marginTop: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
})
