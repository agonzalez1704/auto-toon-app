import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import Svg, { Path as SvgPath } from 'react-native-svg'

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

const ANGLE_OPTIONS = [1, 2, 3, 4, 6, 8]
const COST_PER_IMAGE = 4

export default function WardrobeScreen() {
  const router = useRouter()
  const setShowExhaustionModal = useCreditsStore((s) => s.setShowExhaustionModal)

  const [models, setModels] = useState<WardrobeModel[]>([])
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [looks, setLooks] = useState<WardrobeLook[]>([])
  const [loading, setLoading] = useState(true)

  const [modelId, setModelId] = useState<string | null>(null)
  const [garmentUrl, setGarmentUrl] = useState<string | null>(null)
  const [pasteUrl, setPasteUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [angleCount, setAngleCount] = useState(1)
  const [generating, setGenerating] = useState(false)

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

  useEffect(() => { refresh() }, [refresh])

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
      setGarmentUrl(publicUrl)
      saveWardrobeItem({ imageUrl: publicUrl, name: 'Garment' }).then(refresh).catch(() => {})
    } catch (err) {
      handleError(err)
    } finally {
      setUploading(false)
    }
  }

  const scrape = async () => {
    if (!pasteUrl.trim()) return
    setScraping(true)
    try {
      const { imageUrl, title } = await scrapeWardrobeGarment(pasteUrl.trim())
      setGarmentUrl(imageUrl)
      saveWardrobeItem({ imageUrl, name: title ?? 'Garment', sourceUrl: pasteUrl.trim() }).then(refresh).catch(() => {})
      setPasteUrl('')
    } catch (err) {
      handleError(err)
    } finally {
      setScraping(false)
    }
  }

  const generate = useCallback(async () => {
    if (!modelId || !garmentUrl || generating) return
    if (!requireAllConsents(() => generate())) return
    setGenerating(true)
    try {
      const { produced, requested } = await generateWardrobeLook({
        fashionModelId: modelId,
        garmentImageUrl: garmentUrl,
        angleCount,
      })
      Alert.alert('Look ready', `${produced}/${requested} angles generated.`)
      setGarmentUrl(null)
      await refresh()
      useCreditsStore.getState().fetchCredits()
    } catch (err) {
      handleError(err)
    } finally {
      setGenerating(false)
    }
  }, [modelId, garmentUrl, angleCount, generating, handleError, refresh])

  if (loading) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.center} edges={['top']}>
          <ActivityIndicator color={theme.colors.accent} />
        </SafeAreaView>
      </View>
    )
  }

  const canGenerate = !!modelId && !!garmentUrl && !generating

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <SvgPath d="M15 18l-6-6 6-6" stroke={theme.colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Text style={styles.title}>My Wardrobe</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Try any clothing on a model of yourself.</Text>

          {/* Step 1: model */}
          <Text style={styles.stepLabel}>1. Choose your model</Text>
          {models.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No model yet. Create one of yourself in Model Factory, then come back.</Text>
              <Pressable style={styles.primaryBtnSm} onPress={() => router.push('/model-wizard')}>
                <Text style={styles.primaryBtnSmText}>Create my model</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {models.map((m) => (
                <Pressable key={m.id} onPress={() => setModelId(m.id)} style={[styles.modelCard, modelId === m.id && styles.modelCardActive]}>
                  <Image source={{ uri: m.imageUrl }} style={styles.modelImg} />
                  <Text style={styles.modelName} numberOfLines={1}>{m.name}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => router.push('/model-wizard')} style={[styles.modelCard, styles.modelNew]}>
                <Text style={styles.modelNewPlus}>+</Text>
                <Text style={styles.modelName}>New</Text>
              </Pressable>
            </ScrollView>
          )}

          {/* Step 2: garment */}
          <Text style={styles.stepLabel}>2. Add a garment</Text>
          {garmentUrl ? (
            <View style={styles.garmentPreview}>
              <Image source={{ uri: garmentUrl }} style={styles.garmentImg} resizeMode="contain" />
              <Pressable style={styles.removeChip} onPress={() => setGarmentUrl(null)}>
                <Text style={styles.removeChipText}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={styles.uploadBtn} disabled={uploading} onPress={() => pickGarment('gallery')}>
                  {uploading ? <ActivityIndicator color={theme.colors.text} /> : <Text style={styles.uploadBtnText}>Gallery</Text>}
                </Pressable>
                <Pressable style={styles.uploadBtn} disabled={uploading} onPress={() => pickGarment('camera')}>
                  <Text style={styles.uploadBtnText}>Camera</Text>
                </Pressable>
              </View>
              <View style={styles.urlRow}>
                <TextInput
                  style={styles.urlInput}
                  value={pasteUrl}
                  onChangeText={setPasteUrl}
                  placeholder="Paste a product link…"
                  placeholderTextColor={theme.colors.textDisabled}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <Pressable style={styles.fetchBtn} disabled={scraping || !pasteUrl.trim()} onPress={scrape}>
                  {scraping ? <ActivityIndicator color="#1A1330" size="small" /> : <Text style={styles.fetchBtnText}>Fetch</Text>}
                </Pressable>
              </View>
            </View>
          )}

          {/* saved garments */}
          {items.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
              {items.map((it) => (
                <Pressable key={it.id} onPress={() => setGarmentUrl(it.imageUrl)} style={[styles.savedThumb, garmentUrl === it.imageUrl && styles.savedThumbActive]}>
                  <Image source={{ uri: it.imageUrl }} style={{ flex: 1 }} />
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Step 3: angles */}
          <Text style={styles.stepLabel}>3. Angles</Text>
          <View style={styles.angleRow}>
            {ANGLE_OPTIONS.map((n) => (
              <Pressable key={n} onPress={() => setAngleCount(n)} style={[styles.angleChip, angleCount === n && styles.angleChipActive]}>
                <Text style={[styles.angleChipText, angleCount === n && styles.angleChipTextActive]}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.costHint}>{angleCount} angle{angleCount > 1 ? 's' : ''} · {angleCount * COST_PER_IMAGE} credits</Text>

          {/* Generate */}
          <Pressable style={[styles.generateBtn, !canGenerate && styles.generateBtnDisabled]} disabled={!canGenerate} onPress={generate}>
            {canGenerate && (
              <LinearGradient colors={['#FBBF24', '#F59E0B', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
            )}
            {generating ? (
              <View style={styles.row}><ActivityIndicator color="#1A1330" size="small" /><Text style={styles.generateText}>Generating…</Text></View>
            ) : (
              <Text style={styles.generateText}>Generate look</Text>
            )}
          </Pressable>

          {/* Looks */}
          {looks.length > 0 && (
            <>
              <Text style={[styles.stepLabel, { marginTop: 24 }]}>Your looks ({looks.length})</Text>
              <View style={styles.looksGrid}>
                {looks.map((lk) => (
                  <View key={lk.id} style={styles.lookCard}>
                    {lk.heroImageUrl ? (
                      <Image source={{ uri: lk.heroImageUrl }} style={styles.lookImg} />
                    ) : (
                      <View style={[styles.lookImg, styles.center]}>
                        {lk.status === 'failed' ? <Text style={styles.failText}>Failed</Text> : <ActivityIndicator color={theme.colors.textMuted} />}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
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
  primaryBtnSm: { backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  primaryBtnSmText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  modelCard: { width: 96, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  modelCardActive: { borderColor: '#8B5CF6' },
  modelImg: { width: '100%', aspectRatio: 3 / 4 },
  modelName: { fontSize: 11, color: theme.colors.textMuted, padding: 6 },
  modelNew: { alignItems: 'center', justifyContent: 'center', aspectRatio: undefined, height: 128, borderStyle: 'dashed' },
  modelNewPlus: { fontSize: 28, color: theme.colors.textDim },

  garmentPreview: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, aspectRatio: 4 / 3, backgroundColor: theme.colors.surface },
  garmentImg: { flex: 1 },
  removeChip: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  removeChipText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  uploadBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  uploadBtnText: { color: theme.colors.text, fontWeight: '600', fontSize: 14 },
  urlRow: { flexDirection: 'row', gap: 8 },
  urlInput: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14, color: theme.colors.text, backgroundColor: theme.colors.surface },
  fetchBtn: { paddingHorizontal: 18, height: 48, borderRadius: 12, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  fetchBtnText: { color: '#1A1330', fontWeight: '700' },

  savedThumb: { width: 64, height: 64, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: theme.colors.border },
  savedThumbActive: { borderColor: '#8B5CF6' },

  angleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  angleChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border },
  angleChipActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.15)' },
  angleChipText: { color: theme.colors.textMuted, fontWeight: '600' },
  angleChipTextActive: { color: theme.colors.text },
  costHint: { fontSize: 12, color: theme.colors.textDim },

  generateBtn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 8 },
  generateBtnDisabled: { backgroundColor: theme.colors.surface },
  generateText: { color: '#1A1330', fontWeight: '700', fontSize: 16 },

  looksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  lookCard: { width: '48%', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  lookImg: { width: '100%', aspectRatio: 3 / 4, backgroundColor: theme.colors.surface },
  failText: { color: '#F87171', fontSize: 12 },
})
