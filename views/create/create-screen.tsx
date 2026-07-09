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
  Alert,
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
import { useAIConsentStore } from '@/stores/use-ai-consent-store'
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'
import { requireAllConsents } from '@/stores/use-consent-guards'
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
import { MultiAngleFlow } from './components/multi-angle-flow'

export default function CreateScreen() {
  const router = useRouter()
  const [goalModalVisible, setGoalModalVisible] = useState(false)
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [mjParams, setMjParams] = useState<MjParams>(DEFAULT_MJ_PARAMS)

  const store = useProductEnhancerStore()
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'
  const { isPicking, pickFromGallery, takePhoto } = useImagePipeline()

  const creditCost = getModelCredits(store.selectedModel)
  const modelId = AI_MODELS[store.selectedModel].id
  const costLabel = getCostLabel(modelId, isPayPerUse)
  const missing: string[] = []
  if (!(store.localImageUri || store.uploadedImageUrl)) missing.push('image')
  if (!store.productName.trim()) missing.push('name')
  if (!store.selectedGoalId) missing.push('goal')
  if (store.isUploading) missing.push('upload-in-progress')
  if (store.isGenerating) missing.push('already-generating')
  const canGenerate = missing.length === 0
  // Credit-plan users with a balance below the per-call cost get a
  // "Get more credits" CTA in place of Generate (mirrors web). Pay-per-use
  // users are metered server-side, so the gate never applies.
  const hasInsufficientCredits =
    !isPayPerUse && balance !== null && balance < creditCost

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) {
      // Surface why the button was tappable but generation didn't fire —
      // this happens when the canGenerate boolean and the per-field
      // missing[] computation get out of sync.
      console.warn('[generate] blocked, missing:', missing.join(','))
      Alert.alert('Not ready', `Missing: ${missing.join(', ') || 'unknown'}`)
      return
    }
    if (!store.uploadedImageUrl) {
      // Image picked but upload hasn't finished (or failed silently). Tell
      // the user instead of swallowing the tap.
      Alert.alert('Upload pending', 'The image is still uploading. Try again in a moment.')
      return
    }

    const consented = requireAllConsents(() => handleGenerate())
    if (!consented) {
      const terms = useSubscriptionStore.getState().termsAccepted
      const ai = useAIConsentStore.getState().accepted
      const termsModal = useTermsConsentStore.getState().showConsentModal
      const aiModal = useAIConsentStore.getState().showConsentModal
      console.warn('[generate] consent gate blocked', { terms, ai, termsModal, aiModal })
      // Defensive fallback: if the consent guard returned false but
      // somehow no modal is flagged for display (modal mount race, store
      // re-hydration), force the missing modal open so the user has a
      // recovery path instead of a silent Generate button.
      if (!termsModal && !aiModal) {
        if (!terms) useTermsConsentStore.getState().setShowConsentModal(true)
        else if (ai !== true) useAIConsentStore.setState({ showConsentModal: true })
      }
      return
    }

    if (!isPayPerUse && balance !== null && balance < creditCost) {
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
        store.setGenerationResult(result.heroImageUrl ?? null, result.vignetteImageUrl ?? null, result.secondImageType ?? null, result.aspectRatio ?? null)
        useCreditsStore.getState().setCredits(result.creditsRemaining)
        fetchCredits()
      } else {
        store.setError('Generation failed. Please try again.')
      }
    } catch (err: any) {
      if (err?.status === 402) {
        setShowExhaustionModal(true)
        store.setGenerationPhase('idle')
      } else if (err?.code === 'AI_CONSENT_REQUIRED' || err?.code === 'TERMS_NOT_ACCEPTED') {
        // Consent gates open their own modal via the axios interceptor.
        // Reset the phase so the user lands back on the create form,
        // accepts consent, and can re-tap Generate (the modal also queues
        // the action via requireConsent when going through the guard).
        store.setGenerationPhase('idle')
      } else {
        store.setError(err?.message || 'Something went wrong')
        store.setGenerationPhase('idle')
      }
    }
  }, [canGenerate, store, balance, creditCost, isPayPerUse, fetchCredits, setShowExhaustionModal, mjParams])

  // Poster gate: generation is only reachable after the user opens the config
  // sheet (language, copy, style) and taps the sheet's confirm CTA.
  const isPoster = store.selectedGoalId === 'printable-poster'
  const handlePosterGenerate = useCallback(() => {
    store.setPosterConfirmed(true)
    setConfigModalVisible(false)
    handleGenerate()
  }, [store, handleGenerate])

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
        secondImageType={store.serverSecondImageType}
        onUpscaleGrid={
          store.serverSecondImageType === '3x3' && store.vignetteImageUrl
            ? () =>
                router.push({
                  pathname: '/grid-upscale',
                  params: {
                    imageUrl: store.vignetteImageUrl as string,
                    productName: store.productName,
                    // Respect the aspect ratio the grid was generated at
                    aspectRatio: store.serverAspectRatio ?? store.seedreamConfig.aspect_ratio,
                  },
                })
            : undefined
        }
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
            <View style={styles.heroHeader}>
              <Text style={styles.heroEyebrow}>ENHANCE</Text>
              <Text style={styles.heroTitle}>
                {store.localImageUri ? 'Looking good.' : 'Snap your product.'}
              </Text>
              <Text style={styles.heroSub}>
                {store.localImageUri
                  ? 'Name it, pick a goal — studio shot in 8 seconds.'
                  : 'One photo. Studio-grade result in under 10 seconds.'}
              </Text>
            </View>

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
              onConfirmGenerate={isPoster ? handlePosterGenerate : undefined}
              confirmLabel={`Generate poster (${costLabel})`}
              confirming={store.isGenerating}
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

              {store.selectedGoalId === 'multi-angle' ? (
                <MultiAngleFlow />
              ) : (
              <>
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
                insufficientCredits={hasInsufficientCredits}
                label={isPoster && !hasInsufficientCredits ? 'Configure poster' : undefined}
                onPress={
                  hasInsufficientCredits
                    ? () => router.push('/account/credits')
                    : isPoster
                      ? () => setConfigModalVisible(true)
                      : handleGenerate
                }
              />
              {hasInsufficientCredits && !store.isGenerating && (
                <Text style={styles.disabledReason}>
                  Not enough credits — tap to top up via App Store.
                </Text>
              )}
              {!hasInsufficientCredits && !canGenerate && !store.isGenerating && (
                <Text style={styles.disabledReason}>
                  Missing: {missing.join(', ')}
                </Text>
              )}
              </>
              )}

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
  heroHeader: {
    marginBottom: theme.spacing['2xl'],
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
    letterSpacing: 1.6,
    marginBottom: theme.spacing.sm,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.8,
    lineHeight: 34,
    marginBottom: theme.spacing.sm,
  },
  heroSub: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
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
  disabledReason: {
    fontSize: 12,
    textAlign: 'center',
    color: theme.colors.textDisabled,
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  balanceHint: {
    fontSize: 12,
    textAlign: 'center',
    color: theme.colors.textDisabled,
  },
})
