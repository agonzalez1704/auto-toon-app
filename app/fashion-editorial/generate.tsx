import { useCallback, useRef, useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  TextInput,
  Animated,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path as SvgPath, Rect as SvgRect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg'
import { useQueryClient } from '@tanstack/react-query'
import { useFashionEditorialStore } from '@/stores/use-fashion-editorial-store'
import { useModelFactoryStore } from '@/stores/use-model-factory-store'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'
import { generateFashionEditorial } from '@/lib/api'
import { getCostLabel, AI_MODELS } from '@/lib/ai-models'
import { ParticleSphere } from '@/components/particle-sphere'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const BG = '#193153'
const ACCENT = '#FBBF24'
const TEAL = '#0B5777'
const MUTED = 'rgba(255,255,255,0.55)'
const CARD_BG = 'rgba(255,255,255,0.05)'
const CARD_BORDER = 'rgba(255,255,255,0.08)'

const MODEL_OPTIONS = [
  { key: 'GEMINI_3_IMAGE', id: AI_MODELS.GEMINI_3_IMAGE.id, label: 'Nano Banana Pro', credits: AI_MODELS.GEMINI_3_IMAGE.credits ?? 3, Icon: GeminiIcon },
  { key: 'GEMINI_3_1_FLASH_IMAGE', id: AI_MODELS.GEMINI_3_1_FLASH_IMAGE.id, label: 'Nano Banana 2', credits: AI_MODELS.GEMINI_3_1_FLASH_IMAGE.credits ?? 3, Icon: GeminiIcon },
  { key: 'SEEDREAM_4_5', id: AI_MODELS.SEEDREAM_4_5.id, label: 'SeeDream 4.5', credits: AI_MODELS.SEEDREAM_4_5.credits ?? 1, Icon: ByteDanceIcon },
  { key: 'SEEDREAM_5_LITE', id: AI_MODELS.SEEDREAM_5_LITE.id, label: 'SeeDream 5 Lite', credits: AI_MODELS.SEEDREAM_5_LITE.credits ?? 2, Icon: ByteDanceIcon },
  { key: 'IDEOGRAM_V3_TURBO', id: AI_MODELS.IDEOGRAM_V3_TURBO.id, label: 'Ideogram V3 Turbo', credits: AI_MODELS.IDEOGRAM_V3_TURBO.credits ?? 1, Icon: IdeogramIcon },
]

const ASPECT_RATIOS = [
  { value: '3:4', w: 12, h: 16 },
  { value: '1:1', w: 12, h: 12 },
  { value: '9:16', w: 9, h: 16 },
  { value: '4:5', w: 12, h: 15 },
  { value: '16:9', w: 16, h: 9 },
] as const

function AspectRatioIcon({ w, h, color = '#fff' }: { w: number; h: number; color?: string }) {
  const maxDim = 14
  const scale = maxDim / Math.max(w, h)
  const rw = Math.round(w * scale)
  const rh = Math.round(h * scale)
  const x = (20 - rw) / 2
  const y = (20 - rh) / 2
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <SvgRect x={x} y={y} width={rw} height={rh} rx={2} stroke={color} strokeWidth={1.5} fill="none" />
    </Svg>
  )
}

// ─── Icons ─────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M19 12H5M12 19l-7-7 7-7" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function SettingsIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke="#FFFFFF"
        strokeWidth={2}
      />
      <SvgPath
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="#FFFFFF"
        strokeWidth={2}
      />
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

function GeminiIcon({ size = 16 }: { size?: number }) {
  const d = "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <SvgPath d={d} fill="#3186FF" />
      <Defs>
        <SvgLinearGradient id="g0" x1="7" y1="15.5" x2="11" y2="12" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#08B962" /><Stop offset="1" stopColor="#08B962" stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id="g1" x1="8" y1="5.5" x2="11.5" y2="11" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#F94543" /><Stop offset="1" stopColor="#F94543" stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id="g2" x1="3.5" y1="13.5" x2="17.5" y2="12" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#FABC12" /><Stop offset="0.46" stopColor="#FABC12" stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>
      <SvgPath d={d} fill="url(#g0)" />
      <SvgPath d={d} fill="url(#g1)" />
      <SvgPath d={d} fill="url(#g2)" />
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

function IdeogramIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 900 900" fill="none">
      <SvgPath d="M377.87 204.44H237.22" stroke="white" strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="M377.87 696.3H237.22" stroke="white" strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="M44.01 450.58H378.23" stroke="white" strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="m390.12 816.41h-34.3zm0-244.02c67.39 0 122.01 54.63 122.01 122.01s-54.63 122.01-122.01 122.01m0-732.92h-34.3zm0 488.9H117.42m272.7 0H117.42m272.7 0c9.26 0 18.28 1.88 26.94 3.83 54.42 12.27 95.07 60.9 95.07 119.03 0 67.39-54.63 122.01-122.01 122.01m0-488.9c67.39 0 122.01 54.63 122.01 122.01s-54.63 122.01-122.01 122.01" stroke="white" strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="m665.61 313.66c0-36.55-20.93-69.88-53.86-85.75-11.7-5.64-24.43-8.83-37.4-9.36-22.87-.95-45.32 6.38-63.23 20.64m297.28-7.97c-29.45-17-65.74-17-95.19 0-29.45 17-47.6 48.43-47.6 82.44" stroke="white" strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="m667.66 523.69c-5.75-30.22-25.74-55.81-53.68-68.68-12.05-5.55-25.11-8.52-38.33-8.72-1.89-.03-3.78 0-5.67.08-15.15.66-29.92 4.94-43.08 12.47l.05.02c-5.91 3.38-11.35 7.32-16.27 11.72m157 53.12c8.9 42.22 45 72.92 87.63 75.37l-.02.11c9.09.53 18-.24 26.51-2.17" stroke="white" strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="m474.21 798.36c-1.74-3.44-3.28-6.99-4.59-10.63M776 219.96C764.22 159.53 726.61 107.27 673.05 76.9c-30.45-17.26-64.71-26.67-99.7-27.38-43.87-.89-86.92 11.93-123.15 36.68m310.6 322.65c38.5 0 73.21-23.19 87.95-58.77 14.73-35.57 6.59-76.52-20.64-103.74-14.18-14.04-32.41-23.27-52.12-26.38m-125.87 321.92c22.06 33.77 63.01 49.97 102.2 40.44 39.19-9.54 68.12-42.74 72.2-82.87 3.71-36.59-13.99-72.05-45.47-91.08 46.65-9.64 79-52.27 75.71-99.8-3.46-49.9-44.95-88.6-94.97-88.6m-289.48 488.3c22.26 43.26 73.55 62.78 118.94 45.25 45.38-17.52 70.25-66.45 57.66-113.44M450.2 86.2c-3.04 2.16-6.01 4.4-8.92 6.7" stroke="white" strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" />
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
  return <Text style={styles.timerText}>Creating editorial... {elapsed}s</Text>
}

// ─── Main Screen ───────────────────────────────────────────────────

export default function GenerateScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const store = useFashionEditorialStore()
  const savedModels = useModelFactoryStore((s) => s.savedModels)
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'
  const { requireConsent } = useTermsConsentStore()

  const [showSettings, setShowSettings] = useState(false)
  const [selectedAiModel, setSelectedAiModel] = useState(MODEL_OPTIONS[0])
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('3:4')
  const settingsAnim = useRef(new Animated.Value(0)).current

  // Clear stale hero result when entering the generate screen fresh
  useEffect(() => {
    if (store.heroPhase === 'complete' || store.heroPhase === 'error') {
      store.resetHero()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const costLabel = getCostLabel(selectedAiModel.id, isPayPerUse)

  const toggleSettings = useCallback(() => {
    const opening = !showSettings
    setShowSettings(opening)
    Animated.timing(settingsAnim, {
      toValue: opening ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start()
  }, [showSettings, settingsAnim])

  const settingsHeight = settingsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  })

  const handleGenerate = useCallback(async () => {
    if (!store.canGenerateHero()) return
    if (!requireConsent(() => handleGenerate())) return

    const creditCost = selectedAiModel.credits
    if (!isPayPerUse && balance !== null && balance < creditCost) {
      setShowExhaustionModal(true)
      return
    }

    store.setHeroGenerating()
    try {
      const clothingUrls = store.clothingItems
        .filter((c) => c.phase === 'ready' && c.uploadedUrl)
        .map((c) => c.uploadedUrl!)

      let hairstyleAnalysis: string | undefined
      if (store.hairstyleRef?.phase === 'ready') {
        hairstyleAnalysis = [store.hairstyleRef.styleAnalysis, store.hairstyleRef.colorAnalysis]
          .filter(Boolean)
          .join(' ')
      }

      // Resolve model data from local store for inline payload
      const savedModel = savedModels.find(m => m.id === store.selectedModelId)

      const result = await generateFashionEditorial({
        modelId: store.selectedModelId!,
        clothingImageUrls: clothingUrls,
        makeupAnalysis: store.makeupRef?.phase === 'ready' ? store.makeupRef.analysis! : undefined,
        hairstyleAnalysis,
        styleData: { style: store.stylePreset },
        backgroundData: { background: store.backgroundPreset },
        promptModifier: store.promptModifier || undefined,
        aiModel: selectedAiModel.id,
        aspectRatio: selectedAspectRatio,
        models: [{
          modelId: store.selectedModelId!,
          clothingImageUrls: clothingUrls,
          imageUrl: savedModel?.imageUrl || store.selectedModelImageUrl || undefined,
          prompt: savedModel?.prompt,
          characterSheetUrl: savedModel?.characterSheetUrl,
        }],
      })

      store.setHeroResult(result.imageUrl)
      useCreditsStore.getState().setCredits(result.creditsRemaining)
      fetchCredits()
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    } catch (err: any) {
      store.setHeroError(err?.message || 'Generation failed')
    }
  }, [store, balance, isPayPerUse, requireConsent, fetchCredits, setShowExhaustionModal, savedModels, selectedAiModel])

  // ── Generating state ──
  if (store.heroPhase === 'generating') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingScreen}>
          <ParticleSphere width={140} height={140} phase="generating" />
          <GenerationTimer />
          <Text style={styles.loadingHint}>This usually takes 30-90 seconds</Text>
        </View>
      </View>
    )
  }

  // ── Result state ──
  if (store.heroPhase === 'complete' && store.heroImageUrl) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />

        {/* Full-screen image */}
        <TouchableOpacity
          activeOpacity={0.95}
          style={StyleSheet.absoluteFillObject}
          onPress={() =>
            router.push({
              pathname: '/image-viewer',
              params: { urls: JSON.stringify([store.heroImageUrl!]), title: 'Hero Shot' },
            })
          }
        >
          <Image source={{ uri: store.heroImageUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFillObject} locations={[0, 0.2, 0.6, 1]} />
        </TouchableOpacity>

        {/* Top bar */}
        <SafeAreaView style={styles.resultTopBar} edges={['top']} pointerEvents="box-none">
          <TouchableOpacity style={styles.resultBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.resultTitle}>Hero Shot</Text>
          <View style={{ width: 40 }} />
        </SafeAreaView>

        {/* Bottom actions */}
        <SafeAreaView style={styles.resultBottomBar} edges={['bottom']} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.regenerateBtn}
            onPress={handleGenerate}
            activeOpacity={0.7}
          >
            <Text style={styles.regenerateBtnText}>Regenerate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.campaignBtn}
            onPress={() => router.push('/fashion-editorial/campaign')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#FBBF24', '#F59E0B', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
            <Text style={styles.campaignBtnText}>Campaign Variations</Text>
            <ArrowRightIcon />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    )
  }

  // ── Default: ready to generate ──
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generate</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={toggleSettings} activeOpacity={0.7}>
            <SettingsIcon />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          {/* Settings drawer */}
          <Animated.View style={[styles.settingsDrawer, { height: settingsHeight }]}>
            <Text style={styles.settingsLabel}>Custom Prompt</Text>
            <TextInput
              style={styles.promptInput}
              value={store.promptModifier}
              onChangeText={store.setPromptModifier}
              placeholder="Override or add creative direction..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              maxLength={500}
            />
          </Animated.View>

          {/* Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Ready to generate</Text>
            <Text style={styles.summaryItem}>Model: {store.selectedModelId ? 'Selected' : 'None'}</Text>
            <Text style={styles.summaryItem}>
              Products: {store.clothingItems.filter((c) => c.phase === 'ready').length} item(s)
            </Text>
            {store.makeupRef?.phase === 'ready' && (
              <Text style={styles.summaryItem}>Makeup: Added</Text>
            )}
            {store.hairstyleRef?.phase === 'ready' && (
              <Text style={styles.summaryItem}>Hairstyle: Added</Text>
            )}
            <Text style={styles.summaryItem}>Style: {store.stylePreset}</Text>
            <Text style={styles.summaryItem}>Background: {store.backgroundPreset}</Text>
          </View>

          {/* AI Model selector */}
          <View style={styles.modelSelector}>
            <Text style={styles.settingsLabel}>AI Model</Text>
            <View style={styles.modelGrid}>
              {MODEL_OPTIONS.map((opt) => {
                const selected = selectedAiModel.id === opt.id
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.modelOption, selected && styles.modelOptionSelected]}
                    onPress={() => setSelectedAiModel(opt)}
                    activeOpacity={0.7}
                  >
                    <opt.Icon size={18} />
                    <Text style={[styles.modelOptionLabel, selected && styles.modelOptionLabelSelected]}>{opt.label}</Text>
                    <Text style={styles.modelOptionCost}>
                      {isPayPerUse ? getCostLabel(opt.id, true) : `${opt.credits} cr`}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Aspect Ratio selector */}
          <View style={styles.aspectSection}>
            <Text style={styles.settingsLabel}>Aspect Ratio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aspectRow}>
              {ASPECT_RATIOS.map((ratio) => {
                const isSelected = selectedAspectRatio === ratio.value
                return (
                  <TouchableOpacity
                    key={ratio.value}
                    style={[styles.aspectPill, isSelected && styles.aspectPillSelected]}
                    onPress={() => setSelectedAspectRatio(ratio.value)}
                    activeOpacity={0.7}
                  >
                    <AspectRatioIcon w={ratio.w} h={ratio.h} color={isSelected ? ACCENT : 'rgba(255,255,255,0.5)'} />
                    <Text style={[styles.aspectPillText, isSelected && styles.aspectPillTextSelected]}>
                      {ratio.value}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>

          {store.heroPhase === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{store.heroError || 'Generation failed'}</Text>
            </View>
          )}

          {/* Generate button */}
          <TouchableOpacity
            style={[styles.generateBtn, !store.canGenerateHero() && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            activeOpacity={0.8}
            disabled={!store.canGenerateHero()}
          >
            <LinearGradient colors={['#FBBF24', '#F59E0B', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
            <Text style={styles.generateBtnText}>Generate ({costLabel})</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },

  content: { flex: 1, padding: 20 },
  contentInner: { flexGrow: 1, justifyContent: 'center' },

  // Settings drawer
  settingsDrawer: { overflow: 'hidden', marginBottom: 16 },
  settingsLabel: { fontSize: 13, fontWeight: '600', color: MUTED, marginBottom: 8 },
  promptInput: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    textAlignVertical: 'top',
  },

  // Summary
  summarySection: { backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER, padding: 18, marginBottom: 20, gap: 6 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  summaryItem: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  // Model selector
  modelSelector: { marginBottom: 20 },
  modelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modelOption: {
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  modelOptionSelected: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(251,191,36,0.08)',
  },
  modelOptionLabel: { flex: 1, fontSize: 11, fontWeight: '600' as const, color: 'rgba(255,255,255,0.5)' },
  modelOptionLabelSelected: { color: '#FFFFFF' },
  modelOptionCost: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },

  // Aspect ratio
  aspectSection: { marginBottom: 20 },
  aspectRow: { flexDirection: 'row' as const, gap: 8 },
  aspectPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  aspectPillSelected: { borderColor: ACCENT, backgroundColor: 'rgba(251,191,36,0.08)' },
  aspectPillText: { fontSize: 12, fontWeight: '600' as const, color: 'rgba(255,255,255,0.5)' },
  aspectPillTextSelected: { color: '#FFFFFF' },

  // Error
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { fontSize: 13, color: '#EF4444', textAlign: 'center' },

  // Generate
  generateBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', overflow: 'hidden' },
  generateBtnDisabled: { opacity: 0.4 },
  generateBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  // Loading
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  timerText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  loadingHint: { fontSize: 13, color: MUTED, textAlign: 'center' },

  // Result overlay
  resultTopBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  resultBottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, gap: 10, alignItems: 'center' },
  resultBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', marginLeft: 16, marginTop: 10 },
  resultTitle: { position: 'absolute', top: 18, left: 0, right: 0, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  regenerateBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  regenerateBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  campaignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, overflow: 'hidden', width: '100%' },
  campaignBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
})
