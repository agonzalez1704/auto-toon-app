/**
 * Create — orchestrator.
 * Reads stores, owns generation lifecycle, dispatches to dumb children.
 * SOLID:
 *   - Single responsibility: composition + lifecycle only
 *   - Open/closed: extend via data.ts (models / aspects / goals)
 *   - Dependency inversion: children take props/callbacks, no router or store imports
 */
import { useCallback, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { theme } from '@/constants/theme'
import { CarouselPickerModal } from '@/components/carousel-picker-modal'
import { CreateIntroModal } from '@/components/create-intro-modal'
import { MidjourneyParamsPanel, DEFAULT_MJ_PARAMS, type MjParams } from '@/components/midjourney-params'
import { enhanceProduct } from '@/lib/api'
import { getCostLabel } from '@/lib/ai-models'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'
import {
  AI_MODELS,
  GOAL_MAP,
  getModelCredits,
  useProductEnhancerStore,
  type GoalId,
} from '@/stores/use-product-enhancer-store'

import { GOALS } from './data'
import { useImagePipeline } from './lib/use-image-pipeline'
import { UploadSection } from './components/upload-section'
import { NameInput } from './components/name-input'
import { GoalSelector } from './components/goal-selector'
import { CustomizeModal } from './components/customize-modal'
import { ModelToggle } from './components/model-toggle'
import { GenerateButton } from './components/generate-button'
import { GeneratingView } from './components/generating-view'
import { ResultView } from './components/result-view'

export default function CreateScreen() {
  const router = useRouter()
  const [goalModalVisible, setGoalModalVisible] = useState(false)
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [mjParams, setMjParams] = useState<MjParams>(DEFAULT_MJ_PARAMS)

  const store = useProductEnhancerStore()
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const { requireConsent } = useTermsConsentStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'
  const { isPicking, pickFromGallery, takePhoto } = useImagePipeline()

  const creditCost = getModelCredits(store.selectedModel)
  const modelId = AI_MODELS[store.selectedModel].id
  const costLabel = getCostLabel(modelId, isPayPerUse)
  const canGenerate =
    !!(store.localImageUri || store.uploadedImageUrl) &&
    !!store.productName.trim() &&
    !!store.selectedGoalId &&
    !store.isUploading &&
    !store.isGenerating

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
  }, [canGenerate, store, balance, creditCost, requireConsent, fetchCredits, setShowExhaustionModal, mjParams])

  const resultUrls = [store.heroImageUrl, store.vignetteImageUrl].filter(Boolean) as string[]

  // ── Generating phase ──
  if (store.generationPhase === 'generating' || store.generationPhase === 'uploading') {
    return <GeneratingView phase={store.generationPhase} />
  }

  // ── Result phase ──
  if (store.generationPhase === 'complete' && resultUrls.length > 0) {
    return (
      <ResultView
        productName={store.productName}
        heroImageUrl={store.heroImageUrl}
        vignetteImageUrl={store.vignetteImageUrl}
        goalId={store.selectedGoalId}
        onZoom={(initialIndex) =>
          router.push({
            pathname: '/image-viewer',
            params: {
              urls: JSON.stringify(resultUrls),
              initialIndex: String(initialIndex),
              title: store.productName,
            },
          })
        }
        onAgain={() => store.resetForNewGeneration()}
      />
    )
  }

  // ── Idle / form phase ──
  const showCustomize =
    store.selectedGoalId === 'elements' || store.selectedGoalId === 'printable-poster'

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
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Enhance Product</Text>

            <UploadSection
              localImageUri={store.localImageUri}
              productName={store.productName}
              isAnalyzing={store.isAnalyzing}
              isPicking={isPicking}
              onProductNameChange={store.setProductName}
              onPickGallery={pickFromGallery}
              onTakePhoto={takePhoto}
            />

            {!store.localImageUri && (
              <NameInput value={store.productName} onChange={store.setProductName} />
            )}

            <GoalSelector
              selectedGoalId={store.selectedGoalId}
              onPress={() => setGoalModalVisible(true)}
              showCustomize={showCustomize}
              onCustomizePress={() => setConfigModalVisible(true)}
            />

            <CustomizeModal
              visible={configModalVisible}
              goalId={store.selectedGoalId}
              onClose={() => setConfigModalVisible(false)}
            />

            <CarouselPickerModal
              visible={goalModalVisible}
              onClose={() => setGoalModalVisible(false)}
              title="Choose Goal"
              items={GOALS}
              selectedId={store.selectedGoalId}
              onSelect={(id) => store.selectGoal(id as GoalId)}
              initialIndex={GOALS.findIndex((g) => g.id === store.selectedGoalId)}
            />

            {store.error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{store.error}</Text>
              </View>
            )}

            <View style={styles.bottom}>
              <ModelToggle
                selectedModel={store.selectedModel}
                onSelect={store.setSelectedModel}
                selectedAspect={store.seedreamConfig.aspect_ratio}
                onSelectAspect={(value) => store.setSeedreamConfig({ aspect_ratio: value })}
              />

              {store.selectedModel === 'MIDJOURNEY_V7' && (
                <MidjourneyParamsPanel
                  params={mjParams}
                  onChange={setMjParams}
                  showImageWeight={!!store.uploadedImageUrl}
                />
              )}

              <GenerateButton
                canGenerate={canGenerate}
                isGenerating={store.isGenerating}
                costLabel={costLabel}
                onPress={handleGenerate}
              />

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  safeArea: { flex: 1 },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  title: {
    ...theme.typography.pageTitle,
    color: theme.colors.text,
    marginBottom: theme.spacing['2xl'],
  },
  bottom: { marginTop: theme.spacing.xs },
  errorBox: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  errorText: { fontSize: 13, color: theme.colors.danger },
  balanceHint: {
    fontSize: 12,
    textAlign: 'center',
    color: theme.colors.textDisabled,
  },
})
