import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import * as Clipboard from 'expo-clipboard'
import * as FileSystem from 'expo-file-system/legacy'
import { useRouter, useFocusEffect } from 'expo-router'
import Svg, { Path as SvgPath } from 'react-native-svg'
import Animated, { FadeIn, FadeInDown, FadeInUp, LinearTransition } from 'react-native-reanimated'

import { theme } from '@/constants/theme'
import {
  getWardrobeModels,
  getWardrobeItems,
  getWardrobeLooks,
  saveWardrobeItem,
  scrapeWardrobeGarment,
  generateWardrobeLook,
  ApiError,
  type WardrobeModel,
  type WardrobeItem,
  type WardrobeLook,
} from '@/lib/api'
import { uploadImage } from '@/lib/upload'
import { requireAllConsents } from '@/stores/use-consent-guards'
import { useCreditsStore } from '@/stores/use-credits-store'
import { AI_MODELS, getModelCredits } from '@/lib/ai-models'
import { GarmentInput } from './garment-input'

const ANGLE_OPTIONS = [1, 2, 3, 4, 6, 8]
// Wardrobe renders with GPT-Image-2 — credit cost from the single source.
const COST_PER_IMAGE = getModelCredits(AI_MODELS.GPT_IMAGE_2.id)

export default function WardrobeScreen() {
  const router = useRouter()
  const setShowExhaustionModal = useCreditsStore((s) => s.setShowExhaustionModal)
  // Pad the sticky footer past the translucent native tab bar. The unstable
  // native tab navigator doesn't expose useBottomTabBarHeight, so derive it
  // from the safe-area inset + the platform tab-bar height.
  const insets = useSafeAreaInsets()
  const tabBarHeight = insets.bottom + (Platform.OS === 'ios' ? 49 : 64)

  const [models, setModels] = useState<WardrobeModel[]>([])
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [looks, setLooks] = useState<WardrobeLook[]>([])
  const [loading, setLoading] = useState(true)

  const [modelId, setModelId] = useState<string | null>(null)
  const [garmentUrls, setGarmentUrls] = useState<string[]>([])
  const addGarment = useCallback((url: string) => setGarmentUrls((p) => (p.includes(url) ? p : [...p, url])), [])
  const toggleGarment = useCallback((url: string) => setGarmentUrls((p) => (p.includes(url) ? p.filter((u) => u !== url) : [...p, url])), [])
  const [scraping, setScraping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [angleCount, setAngleCount] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [tab, setTab] = useState<'create' | 'looks'>('create')

  const handleError = useCallback((err: unknown) => {
    const code = err instanceof ApiError ? err.code : undefined
    if (code === 'AI_CONSENT_REQUIRED' || code === 'TERMS_NOT_ACCEPTED') return // modal handled by interceptor
    if (err instanceof ApiError && err.status === 402) {
      setShowExhaustionModal(true)
      return
    }
    Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Try again')
  }, [setShowExhaustionModal])

  const refresh = useCallback(async () => {
    try {
      const [m, i, l] = await Promise.all([
        getWardrobeModels(),
        getWardrobeItems(),
        getWardrobeLooks(),
      ])
      setModels(m)
      setItems(i)
      setLooks(l)
      setModelId((prev) => prev ?? m[0]?.id ?? null)
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }, [handleError])

  // Refetch on focus so a model created in the wizard shows up on return.
  useFocusEffect(useCallback(() => { refresh() }, [refresh]))

  const pickGarment = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required.'); return }
    }
    const result = source === 'gallery'
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
      : await ImagePicker.launchCameraAsync({ quality: 0.85 })
    if (result.canceled || !result.assets[0]) return
    setUploading(true)
    try {
      const publicUrl = await uploadImage(result.assets[0].uri)
      addGarment(publicUrl)
      saveWardrobeItem({ imageUrl: publicUrl, name: 'Garment' }).then(refresh).catch(() => {})
    } catch (err) {
      handleError(err)
    } finally {
      setUploading(false)
    }
  }

  const pasteImage = async () => {
    if (uploading) return
    try {
      const hasImage = await Clipboard.hasImageAsync()
      if (!hasImage) { Alert.alert('No image', 'Copy an image first, then tap Paste.'); return }
      const img = await Clipboard.getImageAsync({ format: 'png' })
      if (!img?.data) { Alert.alert('No image', 'Could not read an image from the clipboard.'); return }
      setUploading(true)
      // img.data is a data URI (data:image/png;base64,...). Write the base64
      // to a temp file so uploadImage (which expects a file URI) can read it.
      const base64 = img.data.replace(/^data:image\/\w+;base64,/, '')
      const uri = `${FileSystem.cacheDirectory}wardrobe_paste_${Date.now()}.png`
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 })
      const publicUrl = await uploadImage(uri)
      addGarment(publicUrl)
      saveWardrobeItem({ imageUrl: publicUrl, name: 'Garment' }).then(refresh).catch(() => {})
    } catch (err) {
      handleError(err)
    } finally {
      setUploading(false)
    }
  }

  const scrape = async (rawUrl: string) => {
    const url = rawUrl.trim()
    if (!url) return
    setScraping(true)
    try {
      const { imageUrl, title } = await scrapeWardrobeGarment(url)
      addGarment(imageUrl)
      saveWardrobeItem({ imageUrl, name: title ?? 'Garment', sourceUrl: url }).then(refresh).catch(() => {})
    } catch (err) {
      handleError(err)
    } finally {
      setScraping(false)
    }
  }

  // Open a look's full image set (hero + angles) in the fullscreen viewer.
  const openLook = useCallback((lk: WardrobeLook) => {
    const urls = [lk.heroImageUrl, ...lk.angleUrls].filter(Boolean) as string[]
    if (urls.length === 0) return
    router.push({
      pathname: '/image-viewer',
      params: { urls: JSON.stringify(urls), title: 'Look', hideVideo: '1' },
    })
  }, [router])

  const generate = useCallback(async () => {
    if (!modelId || garmentUrls.length === 0 || generating) return
    if (!requireAllConsents(() => generate())) return
    setGenerating(true)
    try {
      const { produced, requested } = await generateWardrobeLook({
        fashionModelId: modelId,
        garmentImageUrls: garmentUrls,
        angleCount,
      })
      Alert.alert('Look ready', `${produced}/${requested} images generated.`)
      setGarmentUrls([])
      setTab('looks')
      await refresh()
      useCreditsStore.getState().fetchCredits()
    } catch (err) {
      handleError(err)
    } finally {
      setGenerating(false)
    }
  }, [modelId, garmentUrls, angleCount, generating, handleError, refresh])

  if (loading) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.center} edges={['top']}>
          <ActivityIndicator color={theme.colors.accent} />
        </SafeAreaView>
      </View>
    )
  }

  const canGenerate = !!modelId && garmentUrls.length > 0 && !generating

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          {router.canGoBack() ? (
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <SvgPath d="M15 18l-6-6 6-6" stroke={theme.colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )}
          <Text style={styles.title}>My Wardrobe</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Segmented tabs — looks reachable in one tap, no scroll */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.segment}>
          <Pressable style={({ pressed }) => [styles.segmentBtn, tab === 'create' && styles.segmentBtnActive, pressed && styles.pressed]} onPress={() => setTab('create')}>
            <Text style={[styles.segmentText, tab === 'create' && styles.segmentTextActive]}>Create</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.segmentBtn, tab === 'looks' && styles.segmentBtnActive, pressed && styles.pressed]} onPress={() => setTab('looks')}>
            <Text style={[styles.segmentText, tab === 'looks' && styles.segmentTextActive]}>
              Your looks{looks.length > 0 ? ` (${looks.length})` : ''}
            </Text>
          </Pressable>
        </Animated.View>

        {tab === 'looks' ? (
          <Animated.ScrollView key="looks" entering={FadeIn.duration(250)} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {looks.length === 0 ? (
              <Animated.View entering={FadeInUp.duration(350)} style={styles.emptyCard}>
                <Text style={styles.emptyText}>No looks yet. Build one in Create, then it shows up here.</Text>
                <Pressable style={({ pressed }) => [styles.primaryBtnSm, pressed && styles.pressed]} onPress={() => setTab('create')}>
                  <Text style={styles.primaryBtnSmText}>Start creating</Text>
                </Pressable>
              </Animated.View>
            ) : (
              <View style={styles.looksGrid}>
                {looks.map((lk, i) => {
                  const ready = !!lk.heroImageUrl
                  return (
                    <Animated.View key={lk.id} entering={FadeInDown.delay(i * 60).duration(360)} layout={LinearTransition} style={styles.lookCardWrap}>
                      <Pressable
                        disabled={!ready}
                        onPress={() => openLook(lk)}
                        style={({ pressed }) => [styles.lookCard, pressed && styles.lookCardPressed]}
                      >
                        {ready ? (
                          <Image source={{ uri: lk.heroImageUrl! }} style={styles.lookImg} />
                        ) : (
                          <View style={[styles.lookImg, styles.center]}>
                            {lk.status === 'failed' ? <Text style={styles.failText}>Failed</Text> : <ActivityIndicator color={theme.colors.textMuted} />}
                          </View>
                        )}
                        {ready && lk.angleUrls.length > 0 && (
                          <View style={styles.countPill}>
                            <Text style={styles.countPillText}>{lk.angleUrls.length + 1}</Text>
                          </View>
                        )}
                      </Pressable>
                    </Animated.View>
                  )
                })}
              </View>
            )}
            <View style={{ height: tabBarHeight + 40 }} />
          </Animated.ScrollView>
        ) : (
        <Animated.ScrollView key="create" entering={FadeIn.duration(250)} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Try any clothing on a model of yourself.</Text>

          {/* Step 1: model */}
          <Text style={styles.stepLabel}>1. Choose your model</Text>
          {models.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No model yet. Create one of yourself in Model Factory, then come back.</Text>
              <Pressable style={({ pressed }) => [styles.primaryBtnSm, pressed && styles.pressed]} onPress={() => router.push('/model-wizard')}>
                <Text style={styles.primaryBtnSmText}>Create my model</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {models.map((m) => (
                <Pressable key={m.id} onPress={() => setModelId(m.id)} style={({ pressed }) => [styles.modelCard, modelId === m.id && styles.modelCardActive, pressed && styles.cardPressed]}>
                  <Image source={{ uri: m.imageUrl }} style={styles.modelImg} />
                  <Text style={styles.modelName} numberOfLines={1}>{m.name}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => router.push('/model-wizard')} style={({ pressed }) => [styles.modelCard, styles.modelNew, pressed && styles.cardPressed]}>
                <Text style={styles.modelNewPlus}>+</Text>
                <Text style={styles.modelName}>New</Text>
              </Pressable>
            </ScrollView>
          )}

          {/* Step 2: garments (multi) */}
          <Text style={styles.stepLabel}>
            2. Add garments{garmentUrls.length > 0 ? `  ·  ${garmentUrls.length} selected` : ''}
          </Text>

          {/* selected garments */}
          {garmentUrls.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {garmentUrls.map((u) => (
                <View key={u} style={styles.selectedThumb}>
                  <Image source={{ uri: u }} style={{ flex: 1 }} resizeMode="contain" />
                  <Pressable style={styles.thumbRemove} onPress={() => setGarmentUrls((p) => p.filter((x) => x !== u))}>
                    <Text style={styles.thumbRemoveText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <GarmentInput
            onGallery={() => pickGarment('gallery')}
            onCamera={() => pickGarment('camera')}
            onPaste={pasteImage}
            onUrl={scrape}
            uploading={uploading}
            scraping={scraping}
          />

          {/* saved garments — tap to add/remove */}
          {items.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
              {items.map((it) => (
                <Pressable key={it.id} onPress={() => toggleGarment(it.imageUrl)} style={[styles.savedThumb, garmentUrls.includes(it.imageUrl) && styles.savedThumbActive]}>
                  <Image source={{ uri: it.imageUrl }} style={{ flex: 1 }} />
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Step 3: angles — compact, label + cost on one line, single-row chips */}
          <View style={styles.angleHead}>
            <Text style={[styles.stepLabel, { marginTop: 0 }]}>3. Angles</Text>
            <Text style={styles.costHint}>{angleCount} angle{angleCount > 1 ? 's' : ''} · {angleCount * COST_PER_IMAGE} credits</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.angleRow}>
            {ANGLE_OPTIONS.map((n) => (
              <Pressable key={n} onPress={() => setAngleCount(n)} style={({ pressed }) => [styles.angleChip, angleCount === n && styles.angleChipActive, pressed && styles.cardPressed]}>
                <Text style={[styles.angleChipText, angleCount === n && styles.angleChipTextActive]}>{n}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ height: 8 }} />
        </Animated.ScrollView>
        )}

        {/* Sticky action bar — Generate always reachable, no scroll past garments */}
        {tab === 'create' && (
          <Animated.View entering={FadeInUp.duration(300)} style={[styles.footer, { paddingBottom: tabBarHeight + 12 }]}>
            <Pressable style={({ pressed }) => [styles.generateBtn, !canGenerate && styles.generateBtnDisabled, pressed && canGenerate && styles.generatePressed]} disabled={!canGenerate} onPress={generate}>
              {canGenerate && (
                <LinearGradient colors={['#FBBF24', '#F59E0B', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
              )}
              {generating ? (
                <View style={styles.row}><ActivityIndicator color="#1A1330" size="small" /><Text style={styles.generateText}>Generating…</Text></View>
              ) : (
                <Text style={styles.generateText}>Generate look</Text>
              )}
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 22 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  scroll: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  subtitle: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 4 },
  stepLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginTop: 12 },

  emptyCard: { borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 18, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },
  primaryBtnSm: { backgroundColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  primaryBtnSmText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  modelCard: { width: 96, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  modelCardActive: { borderColor: '#F59E0B' },
  modelImg: { width: '100%', aspectRatio: 3 / 4 },
  modelName: { fontSize: 11, color: theme.colors.textMuted, padding: 6 },
  modelNew: { alignItems: 'center', justifyContent: 'center', aspectRatio: undefined, height: 128, borderStyle: 'dashed' },
  modelNewPlus: { fontSize: 28, color: theme.colors.textDim },

  garmentPreview: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, aspectRatio: 4 / 3, backgroundColor: theme.colors.surface },
  garmentImg: { flex: 1 },
  removeChip: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  removeChipText: { color: '#fff', fontSize: 11, fontWeight: '600' },


  savedThumb: { width: 64, height: 64, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: theme.colors.border },
  savedThumbActive: { borderColor: '#F59E0B' },
  selectedThumb: { width: 188, height: 250, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#F59E0B', backgroundColor: 'rgba(255,255,255,0.03)' },
  thumbRemove: { position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  thumbRemoveText: { color: '#fff', fontSize: 14, lineHeight: 16, fontWeight: '700' },

  segment: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 4, padding: 4, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: 4 },
  segmentBtn: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentBtnActive: { backgroundColor: 'rgba(245,158,11,0.18)' },
  segmentText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  segmentTextActive: { color: theme.colors.text },

  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.bg },

  angleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  angleRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  angleChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border },
  angleChipActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.15)' },
  angleChipText: { color: theme.colors.textMuted, fontWeight: '600' },
  angleChipTextActive: { color: theme.colors.text },
  costHint: { fontSize: 12, color: theme.colors.textDim },

  generateBtn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  generateBtnDisabled: { backgroundColor: theme.colors.surface },
  generateText: { color: '#1A1330', fontWeight: '700', fontSize: 16 },

  looksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  lookCardWrap: { width: '48%' },
  lookCard: { width: '100%', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  lookCardPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  lookImg: { width: '100%', aspectRatio: 3 / 4, backgroundColor: theme.colors.surface },
  countPill: { position: 'absolute', top: 8, right: 8, minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  countPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.6 },
  cardPressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  generatePressed: { transform: [{ scale: 0.98 }] },
  failText: { color: '#F87171', fontSize: 12 },
})
