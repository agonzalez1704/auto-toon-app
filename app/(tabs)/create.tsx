import { CarouselPickerModal } from '@/components/carousel-picker-modal'
import { CreateIntroModal } from '@/components/create-intro-modal'
import { ParticleSphere } from '@/components/particle-sphere'
import { analyzeProduct, enhanceProduct } from '@/lib/api'
import { uploadImage } from '@/lib/upload'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { AI_MODELS, getModelCredits, GOAL_MAP, useProductEnhancerStore, type GoalId, type ImageModelId } from '@/stores/use-product-enhancer-store'
import { getCostLabel } from '@/lib/ai-models'
import { MidjourneyParamsPanel, DEFAULT_MJ_PARAMS, buildMjFlags, type MjParams } from '@/components/midjourney-params'
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import Svg, {
  Circle,
  Defs,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
} from 'react-native-svg'

// Aurora Blossom palette
const AURORA_NAVY = '#193153'
const AURORA_TEAL = '#0B5777'
const AURORA_MAGENTA = '#FBBF24'
const AURORA_PINK = '#F9D4E0'

// Only show these models to users
const VISIBLE_MODELS: { id: ImageModelId; label: string }[] = [
  { id: 'GEMINI_3_IMAGE', label: 'Pro' },
  { id: 'GEMINI_3_1_FLASH_IMAGE', label: 'V2' },
  { id: 'IDEOGRAM_V3_TURBO', label: 'Ideogram' },
  { id: 'MIDJOURNEY_V7', label: 'MJ V7' },
]

// MJ params state is managed inside the component via useState

const ASPECT_RATIOS = [
  { value: '3:4', w: 12, h: 16 },
  { value: '1:1', w: 12, h: 12 },
  { value: '9:16', w: 9, h: 16 },
  { value: '2:3', w: 10, h: 14 },
  { value: '3:2', w: 14, h: 10 },
  { value: '16:9', w: 16, h: 9 },
] as const

function AspectRatioIcon({ w, h, color = '#fff' }: { w: number; h: number; color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Rect
        x={(20 - w) / 2}
        y={(20 - h) / 2}
        width={w}
        height={h}
        rx={1.5}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  )
}

// ─── SVG Icons for Goals ────────────────────────────────────────────────

function InstagramIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke={AURORA_MAGENTA} strokeWidth="2" />
      <Circle cx="12" cy="12" r="5" fill="none" stroke={AURORA_MAGENTA} strokeWidth="2" />
      <Circle cx="17.5" cy="6.5" r="1.5" fill={AURORA_MAGENTA} />
    </Svg>
  )
}

function SparkleGoalIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
        fill="none" stroke={AURORA_TEAL} strokeWidth="2" strokeLinejoin="round"
      />
    </Svg>
  )
}

function PaletteIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="none" stroke={AURORA_PINK} strokeWidth="2" />
      <Circle cx="8" cy="10" r="1.5" fill={AURORA_MAGENTA} />
      <Circle cx="12" cy="7" r="1.5" fill={AURORA_TEAL} />
      <Circle cx="16" cy="10" r="1.5" fill="#9333EA" />
      <Circle cx="14" cy="15" r="1.5" fill={AURORA_PINK} />
    </Svg>
  )
}

function PosterIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke={AURORA_MAGENTA} strokeWidth="2" />
      <SvgPath d="M3 15l5-5 4 4 3-3 6 6" stroke={AURORA_MAGENTA} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

function FoodIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="14" r="8" fill="none" stroke={AURORA_PINK} strokeWidth="2" />
      <SvgPath d="M12 6V2M8 7l-2-3M16 7l2-3" stroke={AURORA_PINK} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

function CameraGoalIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        fill="none" stroke={AURORA_TEAL} strokeWidth="2"
      />
      <Circle cx="12" cy="13" r="4" fill="none" stroke={AURORA_TEAL} strokeWidth="2" />
    </Svg>
  )
}

function GalleryUploadIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <Circle cx="8.5" cy="8.5" r="2" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <SvgPath d="M21 15l-5-5L5 21" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  )
}

function CameraUploadIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"
      />
      <Circle cx="12" cy="13" r="4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
    </Svg>
  )
}

function EditPencilIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"
        stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  )
}

function SparklesIcon({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
        fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round"
      />
    </Svg>
  )
}

function GeminiIcon({ size = 14 }: { size?: number }) {
  const d = "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="gf0" x1="7" y1="15.5" x2="11" y2="12" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#08B962" />
          <Stop offset="1" stopColor="#08B962" stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id="gf1" x1="8" y1="5.5" x2="11.5" y2="11" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#F94543" />
          <Stop offset="1" stopColor="#F94543" stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id="gf2" x1="3.5" y1="13.5" x2="17.5" y2="12" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FABC12" />
          <Stop offset="0.46" stopColor="#FABC12" stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>
      <SvgPath d={d} fill="#3186FF" />
      <SvgPath d={d} fill="url(#gf0)" />
      <SvgPath d={d} fill="url(#gf1)" />
      <SvgPath d={d} fill="url(#gf2)" />
    </Svg>
  )
}

function IdeogramIcon({ size = 14 }: { size?: number }) {
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

function MidjourneyIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
      <SvgPath d="m 267.7,229.5 c 128.6,55 305,208.1 337.4,412 -148.3,-59.8 -261.2,-27.9 -339.8,20.6 119.9,-152.4 66.1,-325.7 2.4,-432.6 z" fill="none" stroke="white" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="m 242.4,752.2 -22.9,-43.8 590,-38 c -46.4,42.2 -106,76.4 -166.3,104.4" fill="none" stroke="white" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="M 454.4,300.4 C 554.8,331.1 695.2,479.4 743,638.8 716.8,628.5 697.2,618 660.4,627.4 624.8,497.9 561.1,374.2 454.4,300.4 Z" fill="none" stroke="white" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

const GOAL_ICONS: Record<GoalId, () => React.JSX.Element> = {
  'instagram-feed': InstagramIcon,
  'product-advantages': SparkleGoalIcon,
  'elements': PaletteIcon,
  'printable-poster': PosterIcon,
  'food-photography': FoodIcon,
  'professional-photo': CameraGoalIcon,
}

const GOALS: { id: GoalId; label: string; description: string; preview: string }[] = [
  { id: 'instagram-feed', label: 'Instagram Feed', description: '3x3 grid for carousels', preview: 'instagram_feed.png' },
  { id: 'product-advantages', label: 'Product Advantages', description: 'Highlight key features', preview: 'product_advantages.png' },
  { id: 'elements', label: 'Creative Elements', description: 'Artistic product composition', preview: 'elements-image.png' },
  { id: 'printable-poster', label: 'Printable Poster', description: 'Print-ready poster design', preview: 'poster.png' },
  { id: 'food-photography', label: 'Food Photography', description: 'Appetizing food shots', preview: 'food_photography.png' },
  { id: 'professional-photo', label: 'Professional Photo', description: 'Clean product shot', preview: 'pro-photo.png' },
]

function ChevronDownIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M6 9l6 6 6-6" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Generating Timer ───────────────────────────────────────────────────

function GeneratingTimer({ phase }: { phase: string }) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    startRef.current = Date.now()
    setElapsed(0)
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [phase])

  return (
    <Text style={styles.generatingTimer}>
      {phase === 'uploading' ? 'Uploading...' : `Enhancing... ${elapsed}s`}
    </Text>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────────

export default function CreateScreen() {
  const router = useRouter()
  const [isPickingImage, setIsPickingImage] = useState(false)
  const [goalModalVisible, setGoalModalVisible] = useState(false)
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [newElement, setNewElement] = useState('')
  const [newEnhancer, setNewEnhancer] = useState('')
  const [mjParams, setMjParams] = useState<MjParams>(DEFAULT_MJ_PARAMS)

  const store = useProductEnhancerStore()
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const { requireConsent } = useTermsConsentStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'

  const creditCost = getModelCredits(store.selectedModel)
  const modelId = AI_MODELS[store.selectedModel].id
  const costLabel = getCostLabel(modelId, isPayPerUse)
  const canGenerate =
    (store.localImageUri || store.uploadedImageUrl) &&
    store.productName.trim() &&
    store.selectedGoalId &&
    !store.isUploading &&
    !store.isGenerating

  const pickImage = useCallback(async () => {
    setIsPickingImage(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      })
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri
        store.setLocalImageUri(uri)
        store.setUploadedImageUrl(null)

        store.setAnalysisState(true, null)
        try {
          const publicUrl = await uploadImage(uri)
          store.setUploadedImageUrl(publicUrl)
          const analysis = await analyzeProduct(publicUrl)
          store.applyAnalysisSuggestions(analysis)
        } catch (err) {
          console.error('Upload/analysis failed:', err)
        } finally {
          store.setAnalysisState(false)
        }
      }
    } finally {
      setIsPickingImage(false)
    }
  }, [store])

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take photos.')
      return
    }

    setIsPickingImage(true)
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
      })
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri
        store.setLocalImageUri(uri)
        store.setUploadedImageUrl(null)

        store.setAnalysisState(true, null)
        try {
          const publicUrl = await uploadImage(uri)
          store.setUploadedImageUrl(publicUrl)
          const analysis = await analyzeProduct(publicUrl)
          store.applyAnalysisSuggestions(analysis)
        } catch (err) {
          console.error('Upload/analysis failed:', err)
        } finally {
          store.setAnalysisState(false)
        }
      }
    } finally {
      setIsPickingImage(false)
    }
  }, [store])

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || !store.uploadedImageUrl) return

    const consented = requireConsent(() => handleGenerate())
    if (!consented) return

    if (balance !== null && balance < creditCost) {
      setShowExhaustionModal(true)
      return
    }

    store.setGenerationPhase('generating')

    try {
      const goalConfig = store.selectedGoalId ? GOAL_MAP[store.selectedGoalId] : null

      const result = await enhanceProduct({
        imageUrl: store.uploadedImageUrl,
        productName: store.productName,
        model: AI_MODELS[store.selectedModel].id,
        ...(store.selectedModel === 'MIDJOURNEY_V7' ? { mjParams } : {}),
        generationMode: store.generationMode,
        secondImageConfig: goalConfig?.secondImageType
          ? {
            type: goalConfig.secondImageType,
            elementsConfig: store.secondImageConfig.elementsConfig,
            posterConfig: store.secondImageConfig.posterConfig as Record<string, unknown> | undefined,
          }
          : undefined,
        promptCustomizations: store.promptCustomizations,
        seedreamConfig: store.seedreamConfig,
        seasonalEnabled: store.seasonalEnabled,
        skipHeroImage: store.generationMode === 'style-only',
        skipSecondImage: store.generationMode === 'enhance-only',
        categoryAttributes: store.categoryAttributes ?? undefined,
        suggestedStyleVariant: store.suggestedStyleVariant,
        styleVariantOverride: store.selectedStyleVariant,
        extractedText: store.extractedText ?? undefined,
      })

      if (result.success) {
        store.setGenerationResult(result.heroImageUrl ?? null, result.vignetteImageUrl ?? null)
        useCreditsStore.getState().setCredits(result.creditsRemaining)
        fetchCredits()
      } else {
        store.setError('Generation failed. Please try again.')
      }
    } catch (err: any) {
      if (err?.status === 402) {
        setShowExhaustionModal(true)
        store.setGenerationPhase('idle')
      } else {
        store.setError(err?.message || 'Something went wrong')
      }
    }
  }, [canGenerate, store, balance, creditCost, requireConsent, fetchCredits, setShowExhaustionModal])

  // Collect result image URLs for the viewer
  const resultUrls = [store.heroImageUrl, store.vignetteImageUrl].filter(Boolean) as string[]

  // Generating screen — full-screen particle animation
  if (store.generationPhase === 'generating' || store.generationPhase === 'uploading') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.generatingScreen}>
            <ParticleSphere width={160} height={160} phase="generating" />
            <GeneratingTimer phase={store.generationPhase} />
            <Text style={styles.generatingPhaseLabel}>
              {store.generationPhase === 'uploading' ? 'Uploading image...' : 'Enhancing your product...'}
            </Text>
            <Text style={styles.generatingHint}>This usually takes 15-30 seconds</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // Result screen
  if (store.generationPhase === 'complete' && resultUrls.length > 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.resultTitle}>{store.productName}</Text>

            {store.heroImageUrl && (
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Hero Image</Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: '/image-viewer',
                      params: { urls: JSON.stringify(resultUrls), initialIndex: '0', title: store.productName },
                    })
                  }
                >
                  <Image
                    source={{ uri: store.heroImageUrl }}
                    style={styles.resultImage}
                    contentFit="contain"
                    transition={300}
                  />
                  <Text style={styles.tapHint}>Tap to zoom</Text>
                </TouchableOpacity>
              </View>
            )}

            {store.vignetteImageUrl && (
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>
                  {store.selectedGoalId === 'instagram-feed' ? '3x3 Grid' :
                    store.selectedGoalId === 'elements' ? 'Elements' :
                      store.selectedGoalId === 'printable-poster' ? 'Poster' :
                        'Styled Image'}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: '/image-viewer',
                      params: { urls: JSON.stringify(resultUrls), initialIndex: store.heroImageUrl ? '1' : '0', title: store.productName },
                    })
                  }
                >
                  <Image
                    source={{ uri: store.vignetteImageUrl }}
                    style={styles.resultImage}
                    contentFit="contain"
                    transition={300}
                  />
                  <Text style={styles.tapHint}>Tap to zoom</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => store.resetForNewGeneration()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#B45309']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.generateButtonText}>Enhance Another</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <CreateIntroModal />
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.pageTitle}>Enhance Product</Text>

            {/* Image Upload + Product Name Overlay */}
            <View style={styles.section}>
              {store.localImageUri ? (
                <View style={styles.imagePreview}>
                  <TouchableOpacity onPress={pickImage} activeOpacity={0.9} style={{ flex: 1 }}>
                    <Image
                      source={{ uri: store.localImageUri }}
                      style={styles.previewImage}
                      contentFit="cover"
                      transition={200}
                    />
                  </TouchableOpacity>

                  {/* Analyzing overlay */}
                  {store.isAnalyzing && (
                    <View style={styles.analyzeOverlay}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.analyzeText}>Analyzing...</Text>
                    </View>
                  )}

                  {/* Product name input overlaid at bottom */}
                  <View style={styles.nameOverlay} pointerEvents="box-none">
                    <LinearGradient
                      colors={['transparent', 'rgba(25,49,83,0.85)']}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.nameRow}>
                      <TextInput
                        style={styles.nameInput}
                        value={store.productName}
                        onChangeText={store.setProductName}
                        placeholder="Product name"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                      />
                      <EditPencilIcon />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadRow}>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={pickImage}
                    disabled={isPickingImage}
                    activeOpacity={0.7}
                  >
                    <GalleryUploadIcon />
                    <Text style={styles.uploadLabel}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={takePhoto}
                    disabled={isPickingImage}
                    activeOpacity={0.7}
                  >
                    <CameraUploadIcon />
                    <Text style={styles.uploadLabel}>Camera</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Product Name (shown only when no image) */}
            {!store.localImageUri && (
              <View style={styles.section}>
                <Text style={styles.label}>Product Name</Text>
                <TextInput
                  style={styles.standaloneInput}
                  value={store.productName}
                  onChangeText={store.setProductName}
                  placeholder="e.g. Organic Face Cream"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>
            )}

            {/* Goal Selector Button */}
            <View style={styles.section}>
              <Text style={styles.label}>Goal</Text>
              <TouchableOpacity
                style={styles.goalButton}
                onPress={() => setGoalModalVisible(true)}
                activeOpacity={0.7}
              >
                {store.selectedGoalId && GOAL_ICONS[store.selectedGoalId] ? (
                  (() => { const Icon = GOAL_ICONS[store.selectedGoalId!]; return <Icon /> })()
                ) : (
                  <InstagramIcon />
                )}
                <Text style={styles.goalButtonLabel}>
                  {GOALS.find((g) => g.id === store.selectedGoalId)?.label ?? 'Instagram Feed'}
                </Text>
                <ChevronDownIcon />
              </TouchableOpacity>
            </View>

            {/* Customize link — only for elements & poster */}
            {(store.selectedGoalId === 'elements' || store.selectedGoalId === 'printable-poster') && (
              <TouchableOpacity
                style={styles.customizeLink}
                onPress={() => setConfigModalVisible(true)}
                activeOpacity={0.7}
              >
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <SvgPath d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z" stroke={AURORA_MAGENTA} strokeWidth="2" />
                  <SvgPath d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={AURORA_MAGENTA} strokeWidth="2" />
                </Svg>
                <Text style={styles.customizeLinkText}>
                  Customize {store.selectedGoalId === 'elements' ? 'Elements' : 'Poster'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Config Bottom Sheet */}
            <Modal
              visible={configModalVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setConfigModalVisible(false)}
            >
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={() => setConfigModalVisible(false)}
              >
                <View />
              </TouchableOpacity>
              <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {store.selectedGoalId === 'elements' ? 'Elements Config' : 'Poster Config'}
                  </Text>
                  <TouchableOpacity onPress={() => setConfigModalVisible(false)} hitSlop={12}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <SvgPath d="M18 6L6 18M6 6l12 12" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" />
                    </Svg>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ paddingHorizontal: 24 }}
                  contentContainerStyle={{ paddingBottom: 40 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {store.selectedGoalId === 'elements' && store.secondImageConfig.elementsConfig && (
                    <>
                      {/* Key Elements */}
                      <Text style={styles.cfgSectionTitle}>Key Elements</Text>
                      <View style={styles.chipWrap}>
                        {store.secondImageConfig.elementsConfig.keyElements.map((el, i) => (
                          <View key={`ke-${i}`} style={styles.chip}>
                            <Text style={styles.chipText} numberOfLines={1}>{el}</Text>
                            <TouchableOpacity
                              hitSlop={8}
                              onPress={() => {
                                const updated = [...store.secondImageConfig.elementsConfig!.keyElements]
                                updated.splice(i, 1)
                                store.setSecondImageConfig({
                                  elementsConfig: { ...store.secondImageConfig.elementsConfig!, keyElements: updated },
                                })
                              }}
                            >
                              <Svg width={12} height={12} viewBox="0 0 24 24">
                                <SvgPath d="M18 6L6 18M6 6l12 12" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="round" />
                              </Svg>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                      <View style={styles.addRow}>
                        <TextInput
                          style={[styles.cfgInput, { flex: 1 }]}
                          value={newElement}
                          onChangeText={setNewElement}
                          placeholder="Add element..."
                          placeholderTextColor="rgba(255,255,255,0.3)"
                        />
                        <TouchableOpacity
                          style={[styles.addBtn, !newElement.trim() && { opacity: 0.4 }]}
                          disabled={!newElement.trim()}
                          onPress={() => {
                            store.setSecondImageConfig({
                              elementsConfig: {
                                ...store.secondImageConfig.elementsConfig!,
                                keyElements: [...store.secondImageConfig.elementsConfig!.keyElements, newElement.trim()],
                              },
                            })
                            setNewElement('')
                          }}
                        >
                          <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Enhancers */}
                      <Text style={[styles.cfgSectionTitle, { marginTop: 24 }]}>Visual Enhancers</Text>
                      <View style={styles.chipWrap}>
                        {store.secondImageConfig.elementsConfig.enhancers.map((en, i) => (
                          <View key={`en-${i}`} style={[styles.chip, { borderColor: 'rgba(11,87,119,0.5)' }]}>
                            <Text style={styles.chipText} numberOfLines={1}>{en}</Text>
                            <TouchableOpacity
                              hitSlop={8}
                              onPress={() => {
                                const updated = [...store.secondImageConfig.elementsConfig!.enhancers]
                                updated.splice(i, 1)
                                store.setSecondImageConfig({
                                  elementsConfig: { ...store.secondImageConfig.elementsConfig!, enhancers: updated },
                                })
                              }}
                            >
                              <Svg width={12} height={12} viewBox="0 0 24 24">
                                <SvgPath d="M18 6L6 18M6 6l12 12" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="round" />
                              </Svg>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                      <View style={styles.addRow}>
                        <TextInput
                          style={[styles.cfgInput, { flex: 1 }]}
                          value={newEnhancer}
                          onChangeText={setNewEnhancer}
                          placeholder="Add enhancer..."
                          placeholderTextColor="rgba(255,255,255,0.3)"
                        />
                        <TouchableOpacity
                          style={[styles.addBtn, !newEnhancer.trim() && { opacity: 0.4 }]}
                          disabled={!newEnhancer.trim()}
                          onPress={() => {
                            store.setSecondImageConfig({
                              elementsConfig: {
                                ...store.secondImageConfig.elementsConfig!,
                                enhancers: [...store.secondImageConfig.elementsConfig!.enhancers, newEnhancer.trim()],
                              },
                            })
                            setNewEnhancer('')
                          }}
                        >
                          <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {store.selectedGoalId === 'printable-poster' && store.secondImageConfig.posterConfig && (
                    <>
                      {/* Poster Text Fields */}
                      <Text style={styles.cfgSectionTitle}>Top Label</Text>
                      <TextInput
                        style={styles.cfgInput}
                        value={(store.secondImageConfig.posterConfig as any).topLabel ?? ''}
                        onChangeText={(v) => store.setSecondImageConfig({
                          posterConfig: { ...store.secondImageConfig.posterConfig!, topLabel: v } as any,
                        })}
                        placeholder="e.g. NEW, SALE, OFFER"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                      />

                      <Text style={[styles.cfgSectionTitle, { marginTop: 20 }]}>Headline</Text>
                      <TextInput
                        style={styles.cfgInput}
                        value={(store.secondImageConfig.posterConfig as any).headline ?? ''}
                        onChangeText={(v) => store.setSecondImageConfig({
                          posterConfig: { ...store.secondImageConfig.posterConfig!, headline: v } as any,
                        })}
                        placeholder="Main title"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                      />

                      <Text style={[styles.cfgSectionTitle, { marginTop: 20 }]}>Tagline</Text>
                      <TextInput
                        style={[styles.cfgInput, { minHeight: 60 }]}
                        value={(store.secondImageConfig.posterConfig as any).tagline ?? ''}
                        onChangeText={(v) => store.setSecondImageConfig({
                          posterConfig: { ...store.secondImageConfig.posterConfig!, tagline: v } as any,
                        })}
                        placeholder="Subtitle or slogan"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        multiline
                      />

                      <Text style={[styles.cfgSectionTitle, { marginTop: 20 }]}>Primary Color</Text>
                      <TextInput
                        style={styles.cfgInput}
                        value={(store.secondImageConfig.posterConfig as any).primaryColor ?? ''}
                        onChangeText={(v) => store.setSecondImageConfig({
                          posterConfig: { ...store.secondImageConfig.posterConfig!, primaryColor: v } as any,
                        })}
                        placeholder="e.g. vibrant blue, deep red"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                      />

                      <Text style={[styles.cfgSectionTitle, { marginTop: 20 }]}>Font Style</Text>
                      <View style={styles.chipWrap}>
                        {(['sans-serif', 'serif', 'display', 'handwritten'] as const).map((fs) => {
                          const active = (store.secondImageConfig.posterConfig as any)?.fontStyle === fs
                          return (
                            <TouchableOpacity
                              key={fs}
                              style={[styles.chip, active && { borderColor: AURORA_MAGENTA, backgroundColor: 'rgba(251,191,36,0.12)' }]}
                              onPress={() => store.setSecondImageConfig({
                                posterConfig: { ...store.secondImageConfig.posterConfig!, fontStyle: fs } as any,
                              })}
                            >
                              <Text style={[styles.chipText, active && { color: '#fff' }]}>{fs}</Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    </>
                  )}
                </ScrollView>
              </View>
            </Modal>

            {/* Goal Picker Modal */}
            <CarouselPickerModal
              visible={goalModalVisible}
              onClose={() => setGoalModalVisible(false)}
              title="Choose Goal"
              items={GOALS}
              selectedId={store.selectedGoalId}
              onSelect={(id) => store.selectGoal(id as GoalId)}
              initialIndex={GOALS.findIndex((g) => g.id === store.selectedGoalId)}
            />

            {/* Error */}
            {store.error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{store.error}</Text>
              </View>
            )}

            {/* Model Toggle + Generate */}
            <View style={styles.bottomSection}>
              {/* Minimal model pill toggle */}
              <View style={styles.modelToggle}>
                {VISIBLE_MODELS.map(({ id, label }) => {
                  const isSelected = store.selectedModel === id
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.modelPill, isSelected && styles.modelPillSelected]}
                      onPress={() => store.setSelectedModel(id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modelPillText, isSelected && styles.modelPillTextSelected]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Midjourney V7 params — visible when MJ is selected */}
              {store.selectedModel === 'MIDJOURNEY_V7' && (
                <MidjourneyParamsPanel
                  params={mjParams}
                  onChange={setMjParams}
                  showImageWeight={!!store.uploadedImageUrl}
                />
              )}

              {/* Aspect Ratio Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aspectRow}>
                {ASPECT_RATIOS.map((ratio) => {
                  const isSelected = store.seedreamConfig.aspect_ratio === ratio.value
                  return (
                    <TouchableOpacity
                      key={ratio.value}
                      style={[styles.aspectPill, isSelected && styles.aspectPillSelected]}
                      onPress={() => store.setSeedreamConfig({ aspect_ratio: ratio.value })}
                      activeOpacity={0.7}
                    >
                      <AspectRatioIcon w={ratio.w} h={ratio.h} color={isSelected ? AURORA_MAGENTA : 'rgba(255,255,255,0.5)'} />
                      <Text style={[styles.aspectPillText, isSelected && styles.aspectPillTextSelected]}>
                        {ratio.value}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              {/* Powered by label */}
              <View style={styles.poweredByRow}>
                {store.selectedModel === 'MIDJOURNEY_V7' ? <MidjourneyIcon size={13} /> : store.selectedModel.startsWith('IDEOGRAM') ? <IdeogramIcon size={13} /> : <GeminiIcon size={13} />}
                <Text style={styles.poweredByText}>
                  Powered by {AI_MODELS[store.selectedModel].name}
                </Text>
              </View>

              {/* Generate Button */}
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  !canGenerate && styles.generateButtonDisabled,
                  store.isGenerating && { opacity: 0.7 },
                ]}
                onPress={handleGenerate}
                disabled={!canGenerate || store.isGenerating}
                activeOpacity={0.8}
              >
                {canGenerate && !store.isGenerating && (
                  <LinearGradient
                    colors={['#FBBF24', '#F59E0B', '#B45309']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}
                {store.isGenerating ? (
                  <View style={styles.generatingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.generateButtonText}>Generating...</Text>
                  </View>
                ) : (
                  <View style={styles.generatingRow}>
                    <SparklesIcon size={20} color="#fff" />
                    <Text style={styles.generateButtonText}>
                      Generate ({costLabel})
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {!isPayPerUse && balance !== null && (
                <Text style={styles.balanceHint}>Balance: {balance} credits</Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#193153',
  },
  safeArea: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  section: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.5)',
  },

  // Upload
  uploadRow: { flexDirection: 'row', gap: 12 },
  uploadButton: {
    flex: 1,
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },

  // Image preview with overlay
  imagePreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewImage: { width: '100%', height: '100%' },
  analyzeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25,49,83,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeText: { color: '#fff', fontSize: 14, marginTop: 8, fontWeight: '500' },

  // Product name overlay on image
  nameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    padding: 0,
  },

  // Standalone input (when no image)
  standaloneInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Customize link
  customizeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: -12,
    marginBottom: 8,
    paddingVertical: 6,
  },
  customizeLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: AURORA_MAGENTA,
  },

  // Config modal form
  cfgSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  cfgInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    maxWidth: 180,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: AURORA_MAGENTA,
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Goal selector button
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  goalButtonLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Goal picker modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(25,49,83,0.75)',
  },
  modalSheet: {
    backgroundColor: '#162844',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Bottom section
  bottomSection: {
    marginTop: 4,
  },

  // Model pill toggle
  modelToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  modelPill: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modelPillSelected: {
    backgroundColor: 'rgba(251,191,36,0.2)',
  },
  modelPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  modelPillTextSelected: {
    color: '#FFFFFF',
  },
  aspectRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  aspectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  aspectPillSelected: {
    borderColor: 'rgba(251,191,36,0.4)',
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  aspectPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  aspectPillTextSelected: {
    color: '#FFFFFF',
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 16,
  },
  poweredByText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
  },

  // Error
  errorBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  errorText: { fontSize: 13, color: '#EF4444' },

  // Generate
  generateButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  generateButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  generateButtonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceHint: {
    fontSize: 12,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
  },

  // Results
  resultTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: '#FFFFFF',
  },
  resultSection: { marginBottom: 20 },
  resultLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
  resultImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
  },
  tapHint: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 6,
  },

  // Generating screen
  generatingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 60,
  },
  generatingTimer: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  generatingPhaseLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  generatingHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 4,
  },
})
