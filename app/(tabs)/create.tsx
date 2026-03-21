import { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import Svg, {
  Path as SvgPath,
  Rect,
  Circle,
} from 'react-native-svg'
import { useProductEnhancerStore, GOAL_MAP, AI_MODELS, getModelCredits, type GoalId } from '@/stores/use-product-enhancer-store'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'
import { uploadImage } from '@/lib/upload'
import { analyzeProduct, enhanceProduct } from '@/lib/api'

const BRAND = '#8B5CF6'
const BRAND_CYAN = '#06B6D4'

// ─── SVG Icons for Goals ────────────────────────────────────────────────

function InstagramIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke={BRAND} strokeWidth="2" />
      <Circle cx="12" cy="12" r="5" fill="none" stroke={BRAND} strokeWidth="2" />
      <Circle cx="17.5" cy="6.5" r="1.5" fill={BRAND} />
    </Svg>
  )
}

function SparkleGoalIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
        fill="none" stroke={BRAND_CYAN} strokeWidth="2" strokeLinejoin="round"
      />
    </Svg>
  )
}

function PaletteIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="none" stroke="#F59E0B" strokeWidth="2" />
      <Circle cx="8" cy="10" r="1.5" fill="#EF4444" />
      <Circle cx="12" cy="7" r="1.5" fill="#3B82F6" />
      <Circle cx="16" cy="10" r="1.5" fill="#22C55E" />
      <Circle cx="14" cy="15" r="1.5" fill="#F59E0B" />
    </Svg>
  )
}

function PosterIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#A78BFA" strokeWidth="2" />
      <SvgPath d="M3 15l5-5 4 4 3-3 6 6" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

function FoodIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="14" r="8" fill="none" stroke="#F97316" strokeWidth="2" />
      <SvgPath d="M12 6V2M8 7l-2-3M16 7l2-3" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

function CameraGoalIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        fill="none" stroke="#10B981" strokeWidth="2"
      />
      <Circle cx="12" cy="13" r="4" fill="none" stroke="#10B981" strokeWidth="2" />
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

const GOAL_ICONS: Record<GoalId, () => React.JSX.Element> = {
  'instagram-feed': InstagramIcon,
  'product-advantages': SparkleGoalIcon,
  'elements': PaletteIcon,
  'printable-poster': PosterIcon,
  'food-photography': FoodIcon,
  'professional-photo': CameraGoalIcon,
}

const GOALS: { id: GoalId; label: string; description: string }[] = [
  { id: 'instagram-feed', label: 'Instagram Feed', description: '3x3 grid for carousels' },
  { id: 'product-advantages', label: 'Product Advantages', description: 'Highlight key features' },
  { id: 'elements', label: 'Creative Elements', description: 'Artistic product composition' },
  { id: 'printable-poster', label: 'Printable Poster', description: 'Print-ready poster design' },
  { id: 'food-photography', label: 'Food Photography', description: 'Appetizing food shots' },
  { id: 'professional-photo', label: 'Professional Photo', description: 'Clean product shot' },
]

// ─── Main Screen ────────────────────────────────────────────────────────

export default function CreateScreen() {
  const router = useRouter()
  const [isPickingImage, setIsPickingImage] = useState(false)

  const store = useProductEnhancerStore()
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const { requireConsent } = useTermsConsentStore()

  const creditCost = getModelCredits(store.selectedModel)
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

  // Result screen
  if (store.generationPhase === 'complete' && (store.heroImageUrl || store.vignetteImageUrl)) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.resultTitle}>{store.productName}</Text>

            {store.heroImageUrl && (
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Hero Image</Text>
                <Image
                  source={{ uri: store.heroImageUrl }}
                  style={styles.resultImage}
                  contentFit="contain"
                  transition={300}
                />
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
                <Image
                  source={{ uri: store.vignetteImageUrl }}
                  style={styles.resultImage}
                  contentFit="contain"
                  transition={300}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => store.resetForNewGeneration()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[BRAND, '#7C3AED']}
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
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>Enhance Product</Text>

          {/* Image Upload */}
          <View style={styles.section}>
            {store.localImageUri ? (
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                <View style={styles.imagePreview}>
                  <Image
                    source={{ uri: store.localImageUri }}
                    style={styles.previewImage}
                    contentFit="cover"
                    transition={200}
                  />
                  {store.isAnalyzing && (
                    <View style={styles.analyzeOverlay}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.analyzeText}>Analyzing...</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
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

          {/* Product Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              value={store.productName}
              onChangeText={store.setProductName}
              placeholder="e.g. Organic Face Cream"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
          </View>

          {/* Goal Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Goal</Text>
            <View style={styles.goalGrid}>
              {GOALS.map((goal) => {
                const isSelected = store.selectedGoalId === goal.id
                const IconComponent = GOAL_ICONS[goal.id]
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[
                      styles.goalCard,
                      isSelected && styles.goalCardSelected,
                    ]}
                    onPress={() => store.selectGoal(goal.id)}
                    activeOpacity={0.7}
                  >
                    <IconComponent />
                    <Text style={[styles.goalLabel, isSelected && { color: '#FFFFFF' }]} numberOfLines={1}>
                      {goal.label}
                    </Text>
                    <Text style={styles.goalDesc} numberOfLines={1}>
                      {goal.description}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* AI Model Selector */}
          <View style={styles.section}>
            <Text style={styles.label}>AI Model</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.modelRow}>
                {(Object.entries(AI_MODELS) as [string, { name: string; credits: number }][]).map(
                  ([id, model]) => {
                    const isSelected = store.selectedModel === id
                    return (
                      <TouchableOpacity
                        key={id}
                        style={[
                          styles.modelChip,
                          isSelected && styles.modelChipSelected,
                        ]}
                        onPress={() => store.setSelectedModel(id as any)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.modelName, isSelected && { color: '#fff' }]}>
                          {model.name}
                        </Text>
                        <Text style={[styles.modelCredits, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>
                          {model.credits}cr
                        </Text>
                      </TouchableOpacity>
                    )
                  }
                )}
              </View>
            </ScrollView>
          </View>

          {/* Error */}
          {store.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{store.error}</Text>
            </View>
          )}

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
                colors={[BRAND, '#7C3AED']}
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
              <Text style={styles.generateButtonText}>
                Generate ({creditCost} credits)
              </Text>
            )}
          </TouchableOpacity>

          {balance !== null && (
            <Text style={styles.balanceHint}>Balance: {balance} credits</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  safeArea: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
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

  // Image preview
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeText: { color: '#fff', fontSize: 14, marginTop: 8, fontWeight: '500' },

  // Input
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Goals
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalCard: {
    width: '48.5%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  goalCardSelected: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderColor: BRAND,
    borderWidth: 1.5,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 2,
    color: 'rgba(255,255,255,0.85)',
  },
  goalDesc: {
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.4)',
  },

  // Models
  modelRow: { flexDirection: 'row', gap: 8 },
  modelChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modelChipSelected: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  modelName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  modelCredits: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
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
})
