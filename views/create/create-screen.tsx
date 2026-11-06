/**
 * Create — orchestrator.
 * Reads stores, owns generation lifecycle, dispatches to dumb children.
 * SOLID:
 *   - Single responsibility: composition + lifecycle only
 *   - Open/closed: extend via data.ts (models / aspects / goals)
 *   - Dependency inversion: children take props/callbacks, no router or store imports
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native'
import { Text } from '@/components/text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'

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

import { GOALS, VISIBLE_MODELS } from './data'
import { RestorePanel } from './panels/restore-panel'
import { RelightPanel } from './panels/relight-panel'
import { DirectorSession } from './director/director-session'
import { analyzeForCreate, type CreateAnalysis } from '@/lib/api'
import { parseAspectIntent } from '@/lib/create/aspect'
import { toSeedreamAspect } from '@/lib/create/seedream-aspect'
import { conceptToPrompt } from '@/lib/create/direction'
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
  /**
   * Un panel corre aquí dentro, sobre la imagen que ya subiste. Restaurar y
   * cambiar la luz vivían en rutas propias (`/restore`, `/relight`), que en un
   * teléfono es la única puerta que existe: quitarlas del menú sin esto habría
   * borrado las dos funciones.
   */
  const [panel, setPanel] = useState<'restore' | 'relight' | null>(null)



  /**
   * Abierto desde otra pantalla — el visor de imágenes tenía un botón que
   * navegaba a `/relight`. Esa ruta ya no existe, así que ahora manda aquí con
   * la imagen y el panel a abrir, y la función se conserva.
   */
  const params = useLocalSearchParams<{ panel?: string; imageUrl?: string }>()
  useEffect(() => {
    if (params.panel !== 'restore' && params.panel !== 'relight') return
    if (params.imageUrl) store.setUploadedImageUrl(params.imageUrl)
    setPanel(params.panel)
  }, [params.panel, params.imageUrl])
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [mjParams, setMjParams] = useState<MjParams>(DEFAULT_MJ_PARAMS)

  const store = useProductEnhancerStore()

  /**
   * Lo que decidimos que es la imagen, y si el cliente prefiere el formulario.
   *
   * El director es la vía principal: se le muestra una lectura y unas ideas, no
   * una lista de objetivos. El formulario de siempre sigue ahí para quien ya
   * sabe qué quiere — pero detrás de un toque, no delante.
   */
  const [analysis, setAnalysis] = useState<CreateAnalysis | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [showStandard, setShowStandard] = useState(false)
  /**
   * Una idea aceptada, esperando a que el store la refleje.
   *
   * `handleGenerate` lee del store, y los `set` de Zustand no se ven en el
   * mismo tick: llamarla de inmediato genera con el nombre y la escena
   * anteriores.
   */
  const [pendingConcept, setPendingConcept] = useState(false)
  /**
   * La idea elegida, viva hasta que se genera.
   *
   * Va como `promptOverride`, que REEMPLAZA el prompt del hero. Metida como
   * una personalización más, la maquinaria del objetivo seguía mandando: una
   * foto de flores salió convertida en un frasco de perfume con flores de
   * fondo, porque "professional-photo" da por hecho que hay un producto.
   * El override incluye "el sujeto es X, tal como en la imagen de referencia",
   * que es la frase que impide inventarlo.
   */
  const [concept, setConcept] = useState<{ title: string; premise: string; visual: string } | null>(null)

  // Otra foto, otro producto: lo que se leyó de la anterior y la idea elegida para ella no le sirven.
  useEffect(() => {
    setAnalysis(null)
    setConcept(null)
    setShowStandard(false)
  }, [store.uploadedImageUrl])

  useEffect(() => {
    const url = store.uploadedImageUrl
    if (!url || analysis || analysing) return
    setAnalysing(true)
    analyzeForCreate(url)
      .then((a) => {
        // Sin sujeto el director no tiene de qué hablar y el servidor lo exige,
        // así que eso es una lectura fallida, no una lectura vacía.
        if (a?.subject) setAnalysis(a)
        else setShowStandard(true)
      })
      // Sin lectura no hay director, pero el formulario sigue sirviendo: la
      // pantalla no se queda sin salida.
      .catch(() => setShowStandard(true))
      .finally(() => setAnalysing(false))
  }, [store.uploadedImageUrl, analysis, analysing])
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
        ...(concept && analysis?.subject
          ? {
              promptOverride: conceptToPrompt(concept, analysis.subject),
              // Un concepto es UNA escena: la segunda imagen del objetivo
              // pide formas anidadas que nadie llenó y compite con ella.
              skipSecondImage: true,
              skipHeroImage: false,
            }
          : {}),
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

  // Auto-open the poster config sheet when the poster goal becomes active
  // (picked manually or auto-suggested by analysis) and an image is present.
  // Fires on goal change only, so dismissing it doesn't immediately reopen.
  // The user reviews + confirms inside the sheet before generation is allowed.
  const hasImageForPoster = !!(store.localImageUri || store.uploadedImageUrl)
  useEffect(() => {
    if (isPoster && hasImageForPoster && !store.posterConfirmed) setConfigModalVisible(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedGoalId, hasImageForPoster])

  const handlePosterGenerate = useCallback(() => {
    store.setPosterConfirmed(true)
    setConfigModalVisible(false)
    handleGenerate()
  }, [store, handleGenerate])

  const resultUrls = [store.heroImageUrl, store.vignetteImageUrl].filter(Boolean) as string[]

  // Before any early return: a hook below one runs on some renders and not others, and opening Restaurar or
  // Relight with a photo crashed with «Rendered fewer hooks».
  useEffect(() => {
    if (!pendingConcept) return
    if (!store.productName.trim() || !store.selectedGoalId) return
    setPendingConcept(false)
    void handleGenerate()
  }, [pendingConcept, store.productName, store.selectedGoalId, handleGenerate])

  // ── Panel (restaurar / cambiar la luz) ──
  if (panel && store.uploadedImageUrl) {
    const Panel = panel === 'restore' ? RestorePanel : RelightPanel
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.content}>
            <Panel
              imageUrl={store.uploadedImageUrl}
              onDone={(url) => {
                setPanel(null)
                router.push({
                  pathname: '/image-viewer',
                  params: { urls: JSON.stringify([url]), initialIndex: '0', title: store.productName },
                })
              }}
              onCancel={() => setPanel(null)}
            />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // ── Director (la vía principal) ──
  if (store.uploadedImageUrl && analysis?.subject && !showStandard && !panel && store.generationPhase === 'idle') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.content}>
            {/* Una generación fallida devolvía la fase a `idle`, esta rama
                volvía a coincidir, y el cliente aterrizaba en el chat sin
                explicación — la misma falla muda que el director ya evita
                para sus propios turnos. */}
            {store.error ? (
              <Pressable style={styles.genError} onPress={() => store.setError(null)}>
                <Text style={styles.genErrorText}>{store.error}</Text>
                <Text style={styles.genErrorHint}>Toca para descartar y elegir otra idea.</Text>
              </Pressable>
            ) : null}
            {/* Qué modelo va a correr y qué cuesta, antes de tocar nada.
                Estaba escondido tras el formulario, así que la conversación
                gastaba créditos sin decir con qué ni cuánto. */}
            <View style={styles.modelBar}>
              <Text style={styles.modelName}>
                {VISIBLE_MODELS.find((m) => m.id === store.selectedModel)?.label ?? store.selectedModel}
              </Text>
              <Text style={styles.modelCost}>{costLabel}</Text>
              <Pressable onPress={() => setShowStandard(true)} accessibilityRole="button">
                <Text style={styles.modelChange}>Cambiar</Text>
              </Pressable>
            </View>
            <DirectorSession
              imageUrl={store.uploadedImageUrl}
              subject={analysis.subject}
              onSaid={(text) => {
                // La forma sale de lo que el cliente dijo. "para Instagram",
                // "historia", "banner" ya llevan el recorte dentro; pedirle
                // que además elija una fracción es pedirle que traduzca.
                const heard = parseAspectIntent(text)
                if (heard) store.setSeedreamConfig({ ...store.seedreamConfig, aspect_ratio: toSeedreamAspect(heard) })
              }}
              onConceptPicked={(concept) => {
                // Elegir una idea la GENERA. Antes esto abría el formulario
                // viejo, que es exactamente la vuelta que la conversación
                // existe para evitar: el cliente ya dijo qué quiere.
                store.setProductName(concept.title)
                setConcept(concept)
                // La generación exige un objetivo y el director no habla ese
                // vocabulario; una foto limpia es el que no impone formato.
                if (!store.selectedGoalId) store.selectGoal('professional-photo')
                setPendingConcept(true)
              }}
            />
            <Pressable style={styles.standardLink} onPress={() => setShowStandard(true)}>
              <Text style={styles.standardLinkLabel}>¿Prefieres algo estándar? Ver las opciones →</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    )
  }

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
              <Text style={styles.heroEyebrow}>CREAR</Text>
              <Text style={styles.heroTitle}>¿Qué quieres crear?</Text>
              <Text style={styles.heroSub}>
                Sube una foto. La vemos y te decimos en qué se puede convertir.
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

            {/* Operaciones sobre la imagen tal cual, sin pasar por el
                formulario del enhancer. Aparecen en cuanto hay algo sobre lo
                que operar; antes de eso no tendrían sujeto. */}
            {store.uploadedImageUrl ? (
              <View style={styles.panelRow}>
                <Pressable
                  style={styles.panelBtn}
                  onPress={() => setPanel('restore')}
                  accessibilityRole="button"
                >
                  <Text style={styles.panelBtnLabel}>Restaurar</Text>
                  <Text style={styles.panelBtnHint}>Recupera detalle a 2K o 4K</Text>
                </Pressable>
                <Pressable
                  style={styles.panelBtn}
                  onPress={() => setPanel('relight')}
                  accessibilityRole="button"
                >
                  <Text style={styles.panelBtnLabel}>Cambiar la luz</Text>
                  <Text style={styles.panelBtnHint}>13 ambientes de iluminación</Text>
                </Pressable>
              </View>
            ) : null}

            {showStandard ? (
              <>
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
              </>
            ) : store.uploadedImageUrl ? (
              <Pressable style={styles.standardLink} onPress={() => setShowStandard(true)}>
                <Text style={styles.standardLinkLabel}>
                  ¿Prefieres algo estándar? Ver las opciones →
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  modelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  modelName: { ...theme.typography.labelSm, color: theme.colors.text },
  modelCost: { ...theme.typography.caption, color: theme.colors.textDim, flex: 1 },
  modelChange: { ...theme.typography.caption, color: theme.colors.accent },
  genError: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(251,113,133,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.32)',
    marginBottom: theme.spacing.md,
  },
  genErrorText: { ...theme.typography.bodySm, color: theme.colors.danger },
  genErrorHint: { ...theme.typography.caption, color: theme.colors.textDim, marginTop: 2 },
  standardLink: { paddingVertical: theme.spacing.md, alignItems: 'center' },
  standardLinkLabel: { ...theme.typography.bodySm, color: theme.colors.textDim },
  panelRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  panelBtn: {
    flex: 1,
    minHeight: theme.minTap,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  panelBtnLabel: { ...theme.typography.cta, color: theme.colors.text },
  panelBtnHint: { ...theme.typography.caption, color: theme.colors.textDim, marginTop: 2 },
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
