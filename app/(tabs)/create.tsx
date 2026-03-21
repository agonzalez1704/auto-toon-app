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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import Colors from '@/constants/Colors'
import { useThemeColors } from '@/lib/useThemeColors'
import { useProductEnhancerStore, GOAL_MAP, AI_MODELS, getModelCredits, type GoalId } from '@/stores/use-product-enhancer-store'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'
import { uploadImage } from '@/lib/upload'
import { analyzeProduct, enhanceProduct } from '@/lib/api'

const GOALS: { id: GoalId; label: string; emoji: string; description: string }[] = [
  { id: 'instagram-feed', label: 'Instagram Feed', emoji: '📱', description: '3x3 grid for carousels' },
  { id: 'product-advantages', label: 'Product Advantages', emoji: '✨', description: 'Highlight key features' },
  { id: 'elements', label: 'Creative Elements', emoji: '🎨', description: 'Artistic product composition' },
  { id: 'printable-poster', label: 'Printable Poster', emoji: '🖼️', description: 'Print-ready poster design' },
  { id: 'food-photography', label: 'Food Photography', emoji: '🍽️', description: 'Appetizing food shots' },
  { id: 'professional-photo', label: 'Professional Photo', emoji: '📸', description: 'Clean product shot' },
]

export default function CreateScreen() {
  const colors = useThemeColors()
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

        // Auto-upload and analyze
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

    // Terms consent gate
    const consented = requireConsent(() => handleGenerate())
    if (!consented) return

    // Credit check
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

  // Show result screen if generation is complete
  if (store.generationPhase === 'complete' && (store.heroImageUrl || store.vignetteImageUrl)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.resultContent}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {store.productName}
          </Text>

          {store.heroImageUrl && (
            <View style={styles.resultSection}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Hero Image</Text>
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
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
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
            style={[styles.generateButton, { backgroundColor: Colors.brand }]}
            onPress={() => store.resetForNewGeneration()}
            activeOpacity={0.8}
          >
            <Text style={styles.generateButtonText}>Enhance Another</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Enhance Product</Text>

        {/* Image Upload */}
        <View style={styles.section}>
          {store.localImageUri ? (
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
              <View style={[styles.imagePreview, { borderColor: colors.surfaceBorder }]}>
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
                style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                onPress={pickImage}
                disabled={isPickingImage}
                activeOpacity={0.7}
              >
                <Text style={[styles.uploadEmoji]}>🖼️</Text>
                <Text style={[styles.uploadLabel, { color: colors.text }]}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                onPress={takePhoto}
                disabled={isPickingImage}
                activeOpacity={0.7}
              >
                <Text style={[styles.uploadEmoji]}>📷</Text>
                <Text style={[styles.uploadLabel, { color: colors.text }]}>Camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Product Name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Product Name</Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            value={store.productName}
            onChangeText={store.setProductName}
            placeholder="e.g. Organic Face Cream"
            placeholderTextColor={colors.tabIconDefault}
          />
        </View>

        {/* Goal Selection */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Goal</Text>
          <View style={styles.goalGrid}>
            {GOALS.map((goal) => {
              const isSelected = store.selectedGoalId === goal.id
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: isSelected ? `${Colors.brand}15` : colors.surface,
                      borderColor: isSelected ? Colors.brand : colors.surfaceBorder,
                    },
                  ]}
                  onPress={() => store.selectGoal(goal.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                  <Text style={[styles.goalLabel, { color: colors.text }]} numberOfLines={1}>
                    {goal.label}
                  </Text>
                  <Text style={[styles.goalDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    {goal.description}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* AI Model Selector */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>AI Model</Text>
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
                        {
                          backgroundColor: isSelected ? Colors.brand : colors.surface,
                          borderColor: isSelected ? Colors.brand : colors.surfaceBorder,
                        },
                      ]}
                      onPress={() => store.setSelectedModel(id as any)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modelName,
                          { color: isSelected ? '#fff' : colors.text },
                        ]}
                      >
                        {model.name}
                      </Text>
                      <Text
                        style={[
                          styles.modelCredits,
                          { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary },
                        ]}
                      >
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
          <View style={[styles.errorBox, { borderColor: colors.error }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{store.error}</Text>
          </View>
        )}

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            {
              backgroundColor: canGenerate ? Colors.brand : colors.surfaceBorder,
              opacity: store.isGenerating ? 0.7 : 1,
            },
          ]}
          onPress={handleGenerate}
          disabled={!canGenerate || store.isGenerating}
          activeOpacity={0.8}
        >
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
          <Text style={[styles.balanceHint, { color: colors.textSecondary }]}>
            Balance: {balance} credits
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  section: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Upload
  uploadRow: { flexDirection: 'row', gap: 12 },
  uploadButton: {
    flex: 1,
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadEmoji: { fontSize: 32, marginBottom: 8 },
  uploadLabel: { fontSize: 14, fontWeight: '600' },

  // Image preview
  imagePreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
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
    borderRadius: 12,
    borderWidth: 1.5,
  },
  goalEmoji: { fontSize: 24, marginBottom: 6 },
  goalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  goalDesc: { fontSize: 11, lineHeight: 14 },

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
  },
  modelName: { fontSize: 13, fontWeight: '600' },
  modelCredits: { fontSize: 12, fontWeight: '500' },

  // Error
  errorBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 13 },

  // Generate
  generateButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  generateButtonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceHint: { fontSize: 12, textAlign: 'center' },

  // Results
  resultContent: { padding: 20, paddingBottom: 40 },
  resultTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  resultSection: { marginBottom: 20 },
  resultLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  resultImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
  },
})
