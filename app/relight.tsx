import { CarouselPickerModal } from '@/components/carousel-picker-modal'
import { AI_MODELS, getCostLabel } from '@/lib/ai-models'
import { getAssets, relightImage, type Asset } from '@/lib/api'
import { CONFIG } from '@/lib/config'
import { queryKeys } from '@/lib/query'
import { uploadImage } from '@/lib/upload'
import { useCreditsStore } from '@/stores/use-credits-store'
import {
  getPresetsForMode,
  useRelightStore
} from '@/stores/use-relight-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { useVideoStore } from '@/stores/use-video-store'
import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
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
import Svg, { Circle, Path as SvgPath } from 'react-native-svg'

const { width: SCREEN_W } = Dimensions.get('window')
const BG = '#193153'
const SURFACE = 'rgba(255,255,255,0.05)'
const ACCENT = '#FBBF24'
const ACCENT_ALT = '#0B5777'
const CARD_BORDER = 'rgba(255,255,255,0.08)'

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M19 12H5M12 19l-7-7 7-7" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function SunIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="5" stroke="#FFF" strokeWidth={2} />
      <SvgPath d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#FFF" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

function ObjectIcon({ active }: { active: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke={active ? '#FFF' : '#888'} strokeWidth={1.5} strokeLinejoin="round" />
      <SvgPath d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke={active ? '#FFF' : '#888'} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  )
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={active ? '#FFF' : '#888'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={7} r={4} stroke={active ? '#FFF' : '#888'} strokeWidth={1.5} />
    </Svg>
  )
}

function ImageIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx={8.5} cy={8.5} r={1.5} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
      <SvgPath d="M21 15l-5-5L5 21" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function CameraIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#FFF" strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx={12} cy={13} r={4} stroke="#FFF" strokeWidth={1.5} />
    </Svg>
  )
}

function GalleryIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" stroke="#FFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="#FFF" strokeWidth={1.5} />
    </Svg>
  )
}

function FolderIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="#FFF" strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Image Picker Helper ──────────────────────────────────────────────────────

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

  return { pickFromLibrary, takePhoto }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RelightScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ imageUrl?: string; title?: string; initialMode?: string }>()
  const { imageUrl: paramImageUrl, title, initialMode } = params

  const store = useRelightStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'
  const fetchCredits = useCreditsStore((s) => s.fetchCredits)
  const { pickFromLibrary, takePhoto } = useImagePicker()

  const costLabel = getCostLabel(AI_MODELS.GEMINI_NANO_BANANA_REPLICATE.id, isPayPerUse)

  // Seed store from params, or reset if opened fresh (no image param)
  useEffect(() => {
    if (paramImageUrl && paramImageUrl !== store.uploadedImageUrl) {
      store.setUploadedImage(paramImageUrl, title)
      if (initialMode === 'object' || initialMode === 'character') {
        store.setMode(initialMode)
      }
      const presets = getPresetsForMode(store.mode)
      if (!store.selectedPresetId) {
        store.selectPreset(presets[0].id)
      }
    } else if (!paramImageUrl) {
      store.clearImage()
    }
  }, [paramImageUrl])

  // ── Lighting picker modal ────────────────────────────────────────────────
  const [lightingModalVisible, setLightingModalVisible] = useState(false)

  // ── Image picking ───────────────────────────────────────────────────────
  const [isUploading, setIsUploading] = useState(false)

  const handlePickFromLibrary = useCallback(async () => {
    const uri = await pickFromLibrary()
    if (!uri) return
    store.setLocalImage(uri)
    // Upload in background
    setIsUploading(true)
    store.setPhase('uploading')
    try {
      const publicUrl = await uploadImage(uri)
      store.setUploadedImage(publicUrl)
      // Default-select first preset
      const presets = getPresetsForMode(store.mode)
      if (!store.selectedPresetId) store.selectPreset(presets[0].id)
      store.setPhase('idle')
    } catch (err: any) {
      store.setError(err?.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [pickFromLibrary, store.mode, store.selectedPresetId])

  const handleTakePhoto = useCallback(async () => {
    const uri = await takePhoto()
    if (!uri) return
    store.setLocalImage(uri)
    setIsUploading(true)
    store.setPhase('uploading')
    try {
      const publicUrl = await uploadImage(uri)
      store.setUploadedImage(publicUrl)
      const presets = getPresetsForMode(store.mode)
      if (!store.selectedPresetId) store.selectPreset(presets[0].id)
      store.setPhase('idle')
    } catch (err: any) {
      store.setError(err?.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [takePhoto, store.mode, store.selectedPresetId])

  const handleSelectAsset = useCallback((asset: Asset) => {
    const url = asset.heroImageUrl || asset.vignetteImageUrl
    if (!url) return
    store.setUploadedImage(url, asset.productName)
    const presets = getPresetsForMode(store.mode)
    if (!store.selectedPresetId) store.selectPreset(presets[0].id)
    store.setPhase('idle')
  }, [store.mode, store.selectedPresetId])

  // ── Generate ────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!store.canGenerate() || !store.uploadedImageUrl) return
    store.setPhase('generating')
    try {
      const result = await relightImage({
        baseImageUrl: store.uploadedImageUrl,
        mode: store.mode,
        presetId: store.selectedPresetId!,
        customText: store.selectedPresetId === 'custom' ? store.customText : undefined,
      })
      store.setResult(result.relitImageUrl)
      fetchCredits()
    } catch (err: any) {
      store.setError(err?.message || 'Relight failed')
    }
  }, [store.uploadedImageUrl, store.mode, store.selectedPresetId, store.customText, fetchCredits])

  const presets = getPresetsForMode(store.mode)
  const isCustom = store.selectedPresetId === 'custom'
  const previewUri = store.uploadedImageUrl || store.localImageUri

  // ── Result View ─────────────────────────────────────────────────────────
  if (store.resultUrl) {
    const selectedPreset = presets.find((p) => p.id === store.selectedPresetId)

    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.circleBtn} onPress={() => { store.reset(); router.back() }} activeOpacity={0.7}>
              <BackIcon />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedPreset?.label ?? 'Relit'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Result image */}
          <View style={styles.resultImageWrap}>
            <Image
              source={{ uri: store.resultUrl }}
              style={styles.resultImage}
              contentFit="contain"
              transition={300}
            />
          </View>

          {/* Actions */}
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.resultActionBtn}
              onPress={() => store.resetResult()}
              activeOpacity={0.7}
            >
              <SunIcon />
              <Text style={styles.resultActionLabel}>Try Another</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resultActionBtn}
              onPress={() => {
                store.reset()
                router.replace('/(tabs)/assets')
              }}
              activeOpacity={0.7}
            >
              <FolderIcon />
              <Text style={styles.resultActionLabel}>View Assets</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resultActionBtn}
              onPress={() => {
                useVideoStore.getState().setSourceImage(store.resultUrl!, [store.resultUrl!], store.sourceTitle || 'Relit')
                router.push('/video-generator')
              }}
              activeOpacity={0.7}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <SvgPath d="M5 3l14 9-14 9V3z" fill="#FFF" />
              </Svg>
              <Text style={styles.resultActionLabel}>Create Video</Text>
            </TouchableOpacity>
          </View>

          {/* Primary CTA */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.gradientBtn}
              onPress={() => {
                store.reset()
                router.back()
              }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#FBBF24', '#F59E0B', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
              <Text style={styles.gradientBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // ── No image yet → Image Picker View ────────────────────────────────────
  if (!previewUri) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.circleBtn} onPress={() => { store.reset(); router.back() }} activeOpacity={0.7}>
              <BackIcon />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Relight</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.pickerContentInner} showsVerticalScrollIndicator={false}>
            {/* Hero prompt */}
            <View style={styles.pickerHero}>
              <SunIcon />
              <Text style={styles.pickerTitle}>Choose an Image</Text>
              <Text style={styles.pickerSubtitle}>
                Select a photo to relight with cinematic lighting presets
              </Text>
            </View>

            {/* Pick actions */}
            <View style={styles.pickerActions}>
              <TouchableOpacity style={styles.pickerActionBtn} onPress={handlePickFromLibrary} activeOpacity={0.7}>
                <View style={styles.pickerActionIcon}><GalleryIcon /></View>
                <Text style={styles.pickerActionLabel}>Photo Library</Text>
                <Text style={styles.pickerActionDesc}>Choose from your camera roll</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickerActionBtn} onPress={handleTakePhoto} activeOpacity={0.7}>
                <View style={styles.pickerActionIcon}><CameraIcon /></View>
                <Text style={styles.pickerActionLabel}>Take Photo</Text>
                <Text style={styles.pickerActionDesc}>Use your camera</Text>
              </TouchableOpacity>
            </View>

            {/* Assets section */}
            <AssetGrid onSelect={handleSelectAsset} />
          </ScrollView>
        </SafeAreaView>
      </View>
    )
  }

  // ── Editor View (image selected) ────────────────────────────────────────
  const generating = store.phase === 'generating'

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => { store.reset(); router.back() }} activeOpacity={0.7}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Relight</Text>
          <TouchableOpacity style={styles.circleBtn} onPress={() => store.clearImage()} activeOpacity={0.7}>
            <ImageIcon />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Preview */}
          <View style={styles.previewCard}>
            <Image source={{ uri: previewUri }} style={styles.previewImage} contentFit="cover" transition={200} />
            {(generating || isUploading) && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={ACCENT} size="large" />
                <Text style={styles.loadingText}>
                  {isUploading ? 'Uploading...' : 'Relighting...'}
                </Text>
              </View>
            )}
          </View>

          {/* Mode Toggle */}
          <Text style={styles.sectionLabel}>Subject Type</Text>
          <View style={styles.modeToggle}>
            <ModeButton
              label="Character"
              icon={<PersonIcon active={store.mode === 'character'} />}
              active={store.mode === 'character'}
              onPress={() => store.setMode('character')}
            />
            <ModeButton
              label="Product"
              icon={<ObjectIcon active={store.mode === 'object'} />}
              active={store.mode === 'object'}
              onPress={() => store.setMode('object')}
            />
          </View>

          {/* Lighting style — trigger button */}
          <Text style={styles.sectionLabel}>Lighting Style</Text>
          {(() => {
            const selectedPreset = presets.find((p) => p.id === store.selectedPresetId)
            return (
              <TouchableOpacity
                style={styles.lightingTrigger}
                onPress={() => setLightingModalVisible(true)}
                activeOpacity={0.7}
              >
                {selectedPreset ? (
                  <Image
                    source={{ uri: `${CONFIG.API_BASE_URL}/previews/${selectedPreset.preview}` }}
                    style={styles.lightingTriggerThumb}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.lightingTriggerPlaceholder}>
                    <SunIcon />
                  </View>
                )}
                <View style={styles.lightingTriggerInfo}>
                  <Text style={styles.lightingTriggerLabel}>
                    {selectedPreset?.label ?? (isCustom ? 'Custom Lighting' : 'Choose lighting...')}
                  </Text>
                  <Text style={styles.lightingTriggerDesc}>
                    {selectedPreset?.description ?? (isCustom ? 'Your custom description' : 'Tap to browse presets')}
                  </Text>
                </View>
                {selectedPreset?.color && (
                  <View style={[styles.lightingTriggerDot, { backgroundColor: selectedPreset.color }]} />
                )}
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <SvgPath d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
            )
          })()}

          {/* Custom option inline */}
          <TouchableOpacity
            style={[styles.customToggle, isCustom && { borderColor: ACCENT_ALT, backgroundColor: 'rgba(11,87,119,0.15)' }]}
            onPress={() => store.selectPreset('custom')}
            activeOpacity={0.7}
          >
            <View style={[styles.presetDot, { backgroundColor: ACCENT_ALT }]} />
            <Text style={[styles.customToggleLabel, isCustom && { color: '#FFF' }]}>Custom Lighting</Text>
          </TouchableOpacity>

          {/* Custom prompt input */}
          {isCustom && (
            <View style={styles.customInputWrap}>
              <Text style={styles.customHint}>
                Describe how the light should behave — source direction, color temperature, shadows, atmosphere.
              </Text>
              <TextInput
                style={styles.customInput}
                value={store.customText}
                onChangeText={store.setCustomText}
                placeholder="e.g. a cold teal bioluminescent underlight from below, pale cyan-green rising through the costume, hollow dark zones at the top, eerie supernatural realism."
                placeholderTextColor="rgba(255,255,255,0.2)"
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Lighting Carousel Modal */}
          <CarouselPickerModal
            visible={lightingModalVisible}
            onClose={() => setLightingModalVisible(false)}
            title="Choose Lighting"
            items={presets.map((p) => ({
              id: p.id,
              label: p.label,
              description: p.description,
              preview: p.preview,
              color: p.color,
            }))}
            selectedId={store.selectedPresetId}
            onSelect={(id) => store.selectPreset(id)}
          />

          {/* Error */}
          {store.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{store.error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Generate button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.generateBtn, (!store.canGenerate() || generating) && { opacity: 0.45 }]}
            onPress={handleGenerate}
            activeOpacity={0.8}
            disabled={!store.canGenerate() || generating}
          >
            <LinearGradient colors={['#F59E0B', '#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
            <SunIcon />
            <Text style={styles.generateBtnText}>
              {generating ? 'Generating...' : `Relight (${costLabel})`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

// ─── Asset Grid (embedded in picker view) ─────────────────────────────────────

function AssetGrid({ onSelect }: { onSelect: (asset: Asset) => void }) {
  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.assets,
    queryFn: getAssets,
  })

  // Only show assets that have an image
  const imageAssets = useMemo(
    () => assets.filter((a) => a.heroImageUrl || a.vignetteImageUrl),
    [assets]
  )

  if (isLoading) {
    return (
      <View style={styles.assetSection}>
        <Text style={styles.sectionLabel}>From Your Assets</Text>
        <View style={styles.assetLoading}>
          <ActivityIndicator color={ACCENT} />
        </View>
      </View>
    )
  }

  if (imageAssets.length === 0) return null

  return (
    <View style={styles.assetSection}>
      <View style={styles.assetSectionHeader}>
        <FolderIcon />
        <Text style={styles.assetSectionTitle}>From Your Assets</Text>
      </View>
      <View style={styles.assetGrid}>
        {imageAssets.slice(0, 12).map((asset) => {
          const url = asset.heroImageUrl || asset.vignetteImageUrl
          return (
            <TouchableOpacity
              key={asset.id}
              style={styles.assetThumb}
              onPress={() => onSelect(asset)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: url! }} style={styles.assetThumbImg} contentFit="cover" transition={200} />
              <Text style={styles.assetThumbName} numberOfLines={1}>{asset.productName}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModeButton({ label, icon, active, onPress }: {
  label: string
  icon: React.ReactNode
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.modeBtn, active && styles.modeBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GRID_GAP = 8
const ASSET_COLS = 3
const ASSET_CELL = (SCREEN_W - 32 - GRID_GAP * (ASSET_COLS - 1)) / ASSET_COLS

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },

  // Content
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 32 },

  // ── Picker view ─────────────────────────────────────────────────────────
  pickerContentInner: { padding: 16, paddingBottom: 40 },

  pickerHero: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  pickerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  pickerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 280 },

  pickerActions: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  pickerActionBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    gap: 8,
    alignItems: 'center',
  },
  pickerActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(251,191,36,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  pickerActionLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  pickerActionDesc: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },

  // ── Asset grid ──────────────────────────────────────────────────────────
  assetSection: { marginTop: 4 },
  assetSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  assetSectionTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.5 },
  assetLoading: { paddingVertical: 32, alignItems: 'center' },
  assetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  assetThumb: {
    width: ASSET_CELL,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  assetThumbImg: { width: '100%', aspectRatio: 3 / 4 },
  assetThumbName: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.55)', paddingHorizontal: 6, paddingVertical: 6 },

  // ── Editor view (shared with previous version) ─────────────────────────
  // Preview
  previewCard: { width: '100%', aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 24 },
  previewImage: { width: '100%', height: '100%' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  // Section label
  sectionLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Mode toggle
  modeToggle: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modeBtnActive: { borderColor: ACCENT, backgroundColor: 'rgba(251,191,36,0.08)' },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  modeBtnTextActive: { color: '#FFF' },

  // Lighting trigger
  lightingTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 10,
  },
  lightingTriggerThumb: {
    width: 56,
    height: 72,
    borderRadius: 10,
  },
  lightingTriggerPlaceholder: {
    width: 56,
    height: 72,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightingTriggerInfo: {
    flex: 1,
    gap: 2,
  },
  lightingTriggerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  lightingTriggerDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  lightingTriggerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Custom toggle
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 4,
  },
  customToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  presetDot: { width: 10, height: 10, borderRadius: 5 },

  // Custom input
  customInputWrap: { marginTop: 16 },
  customHint: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8, lineHeight: 17 },
  customInput: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    padding: 14,
    color: '#FFF',
    fontSize: 14,
    minHeight: 100,
    lineHeight: 20,
  },

  // Error
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { fontSize: 13, color: '#EF4444', textAlign: 'center' },

  // Footer
  footer: { paddingHorizontal: 20, paddingBottom: 8 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, overflow: 'hidden' },
  generateBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Result view
  resultImageWrap: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 20,
  },
  resultActionBtn: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resultActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  gradientBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, overflow: 'hidden', width: '100%' },
  gradientBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
})
