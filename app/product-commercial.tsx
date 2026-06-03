import { ParticleSphere } from '@/components/particle-sphere'
import {
  getCommercialCostLabel,
  getCommercialCreditCost,
  getSupportedCommercialQualities,
  type CommercialQuality,
} from '@/lib/ai-models'
import { generateCommercialSSE } from '@/lib/api'
import { getCommercialShots, PERSONA_OPTIONS, type CommercialPersona } from '@/lib/commercial-shots'
import { useCommercialStore, type CommercialModel } from '@/stores/use-commercial-store'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useGenerationTracker } from '@/stores/use-generation-tracker'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { requireAllConsents } from '@/stores/use-consent-guards'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path as SvgPath, Rect } from 'react-native-svg'

const { width: SCREEN_W } = Dimensions.get('window')

const AURORA_NAVY = '#193153'
const AURORA_MAGENTA = '#FBBF24'

const MODEL_OPTIONS: { id: CommercialModel; label: string }[] = [
  { id: 'seedance-2-pro', label: 'Seedance 2.0' },
  { id: 'kling-v3', label: 'Kling 3.0' },
]

const ASPECT_OPTIONS: { id: '9:16' | '16:9' | '1:1'; label: string }[] = [
  { id: '9:16', label: '9:16' },
  { id: '16:9', label: '16:9' },
  { id: '1:1', label: '1:1' },
]

function CloseIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ClapperIcon({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="7" width="20" height="14" rx="2" stroke={color} strokeWidth={2} fill="none" />
      <SvgPath d="M2 7l4-4 3 4M9 3l4 4M15 3l4 4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function GeneratingTimer() {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())
  useEffect(() => {
    startRef.current = Date.now()
    setElapsed(0)
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [])
  return <Text style={styles.phaseTimerText}>Building your commercial... {elapsed}s</Text>
}

export default function ProductCommercialScreen() {
  const router = useRouter()
  const store = useCommercialStore()
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'
  const abortRef = useRef<{ abort: () => void } | null>(null)

  const shots = getCommercialShots(store.stylePersona)
  const isCustom = store.stylePersona === 'custom'
  const supportedQualities = getSupportedCommercialQualities(store.aiModel)
  const activeQuality: CommercialQuality = supportedQualities.includes(store.quality)
    ? store.quality
    : (supportedQualities[0] ?? '720p')
  const creditCost = getCommercialCreditCost(store.aiModel, activeQuality, store.duration)
  const costLabel = getCommercialCostLabel(store.aiModel, activeQuality, store.duration, isPayPerUse)

  useEffect(() => {
    if (!supportedQualities.includes(store.quality) && supportedQualities[0]) {
      store.setQuality(supportedQualities[0])
    }
  }, [store.aiModel, supportedQualities, store])

  // Register a result handler so that if the SSE socket dies (e.g. user
  // backgrounded the app), the background-resume hook can hand us the final
  // status by polling the server. Identifier 'commercial' matches the
  // `origin` we attach to each job when calling registerJob below.
  useEffect(() => {
    const { registerHandler, unregisterHandler } = useGenerationTracker.getState()
    registerHandler('commercial', (_id, result) => {
      if (result.status === 'completed' && result.videoUrl) {
        store.setGenerationResult(result.videoUrl, _id)
        fetchCredits()
        router.replace({
          pathname: '/video-player',
          params: { videoUrl: result.videoUrl, title: store.productName || 'Commercial' },
        })
      } else if (result.status === 'failed') {
        store.setError(result.errorMessage || 'Generation failed')
        fetchCredits()
      }
    })
    return () => unregisterHandler('commercial')
  }, [store, fetchCredits, router])

  const selectPersona = useCallback(
    (persona: CommercialPersona) => {
      store.setStylePersona(persona)
      const firstShot = getCommercialShots(persona)[0]
      if (firstShot) store.setShotId(firstShot.id)
    },
    [store]
  )

  const handleGenerate = useCallback(() => {
    if (!store.sourceImageUrl) return

    const consented = requireAllConsents(() => handleGenerate())
    if (!consented) return

    if (!isPayPerUse && balance !== null && balance < creditCost) {
      setShowExhaustionModal(true)
      return
    }

    store.startGenerating()

    abortRef.current = generateCommercialSSE(
      {
        sourceImageUrl: store.sourceImageUrl,
        stylePersona: store.stylePersona,
        shotId: store.shotId,
        productName: store.productName || undefined,
        customDirection: isCustom ? store.customDirection || undefined : undefined,
        aiModel: store.aiModel,
        duration: store.duration,
        aspectRatio: store.aspectRatio,
        quality: activeQuality,
      },
      {
        onProgress: (event) => store.setGenerationProgress(event.percent, event.message),
        onStoryboard: (url) => store.setStoryboard(url),
        onJobStarted: (event) => {
          useGenerationTracker.getState().registerJob({
            id: event.generationId,
            kind: event.kind,
            origin: 'commercial',
            startedAt: Date.now(),
            label: store.productName ? `Commercial: ${store.productName}` : 'Commercial',
          })
        },
        onSuccess: (event) => {
          useGenerationTracker.getState().removeJob(event.videoGenerationId)
          store.setGenerationResult(event.videoUrl, event.videoGenerationId)
          fetchCredits()
          router.replace({
            pathname: '/video-player',
            params: { videoUrl: event.videoUrl, title: store.productName || 'Commercial' },
          })
        },
        onError: (message) => {
          store.setError(message)
          fetchCredits()
        },
      }
    )
  }, [store, balance, creditCost, activeQuality, isPayPerUse, isCustom, fetchCredits, setShowExhaustionModal, router])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  if (!store.sourceImageUrl) {
    router.back()
    return null
  }

  // ─── Generating State ─────────────────────────────────────────────
  if (store.generationPhase === 'generating') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.phaseScreen}>
            {store.storyboardUrl ? (
              <Image source={{ uri: store.storyboardUrl }} style={styles.storyboardPreview} contentFit="cover" transition={200} />
            ) : (
              <ParticleSphere width={140} height={140} phase="generating" />
            )}
            <GeneratingTimer />
            <Text style={styles.phaseProgress}>{store.progressMessage}</Text>
            {store.progress > 0 && (
              <View style={styles.progressBarOuter}>
                <View style={[styles.progressBarInner, { width: `${Math.min(store.progress, 100)}%` }]} />
              </View>
            )}
            <Text style={styles.phaseHint}>
              {store.storyboardUrl ? 'Storyboard ready — rendering video' : 'Building storyboard keyframes'}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // ─── Config State ─────────────────────────────────────────────────
  const imageHeight = (SCREEN_W - 40) * (3 / 4)

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} activeOpacity={0.7}>
            <CloseIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Commercial</Text>
          <View style={styles.iconButtonSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Source preview */}
          <View style={styles.imagePreview}>
            <Image
              source={{ uri: store.sourceImageUrl }}
              style={[styles.previewImage, { height: imageHeight }]}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.imageLabel}>
              <ClapperIcon size={14} />
              <Text style={styles.imageLabelText}>{store.productName || 'Product'}</Text>
            </View>
          </View>

          {/* Style persona */}
          <Text style={styles.sectionLabel}>Style</Text>
          <View style={styles.chipWrap}>
            {PERSONA_OPTIONS.map((p) => {
              const selected = store.stylePersona === p.id
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.personaChip, selected && styles.chipSelected]}
                  onPress={() => selectPersona(p.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.personaChipLabel, selected && styles.chipLabelSelected]}>{p.label}</Text>
                  <Text style={styles.personaChipBlurb}>{p.blurb}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Shot or custom direction */}
          {isCustom ? (
            <>
              <Text style={styles.sectionLabel}>Direction</Text>
              <TextInput
                style={styles.textInput}
                value={store.customDirection}
                onChangeText={store.setCustomDirection}
                placeholder="Describe the commercial motion..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                multiline
              />
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Shot</Text>
              <View style={styles.chipWrap}>
                {shots.map((shot) => {
                  const selected = store.shotId === shot.id
                  return (
                    <TouchableOpacity
                      key={shot.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => store.setShotId(shot.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{shot.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          {/* Duration */}
          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.chipWrap}>
            {([5, 10] as const).map((d) => {
              const selected = store.duration === d
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => store.setDuration(d)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{d}s</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Aspect ratio */}
          <Text style={styles.sectionLabel}>Format</Text>
          <View style={styles.chipWrap}>
            {ASPECT_OPTIONS.map((a) => {
              const selected = store.aspectRatio === a.id
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => store.setAspectRatio(a.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{a.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Model */}
          <Text style={styles.sectionLabel}>Model</Text>
          <View style={styles.chipWrap}>
            {MODEL_OPTIONS.map((m) => {
              const selected = store.aiModel === m.id
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => store.setAiModel(m.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{m.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Quality */}
          {supportedQualities.length > 1 && (
            <>
              <Text style={styles.sectionLabel}>Quality</Text>
              <View style={styles.chipWrap}>
                {supportedQualities.map((q) => {
                  const selected = activeQuality === q
                  return (
                    <TouchableOpacity
                      key={q}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => store.setQuality(q)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{q}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          {/* Generation error */}
          {store.generationPhase === 'error' && store.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{store.error}</Text>
              <TouchableOpacity onPress={() => useCommercialStore.setState({ error: null, generationPhase: 'idle' })}>
                <Text style={styles.errorDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Generate */}
          <TouchableOpacity style={styles.generateButton} onPress={handleGenerate} activeOpacity={0.8}>
            <LinearGradient
              colors={['#FBBF24', '#F59E0B', '#B45309']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.genButtonContent}>
              <ClapperIcon size={20} />
              <Text style={styles.generateButtonText}>Generate Commercial ({costLabel})</Text>
            </View>
          </TouchableOpacity>

          {!isPayPerUse && balance !== null && (
            <Text style={styles.balanceHint}>Balance: {balance} credits</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AURORA_NAVY },
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSpacer: { width: 40 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },

  imagePreview: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewImage: { width: '100%' },
  imageLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: 'rgba(25,49,83,0.85)',
  },
  imageLabelText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  personaChip: {
    width: (SCREEN_W - 40 - 8) / 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipSelected: {
    backgroundColor: 'rgba(251,191,36,0.18)',
    borderColor: 'rgba(251,191,36,0.5)',
  },
  chipLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  chipLabelSelected: { color: '#FFFFFF' },
  personaChipLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  personaChipBlurb: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },

  textInput: {
    minHeight: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 20,
    textAlignVertical: 'top',
  },

  errorBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBoxText: { fontSize: 13, color: '#EF4444', flex: 1 },
  errorDismiss: { fontSize: 13, color: AURORA_MAGENTA, fontWeight: '600', marginLeft: 12 },

  generateButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  genButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  generateButtonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  balanceHint: { fontSize: 12, textAlign: 'center', color: 'rgba(255,255,255,0.4)' },

  // Phase screen
  phaseScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  storyboardPreview: {
    width: 200,
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  phaseTimerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  phaseProgress: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  phaseHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  progressBarOuter: {
    width: '80%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarInner: { height: '100%', borderRadius: 2, backgroundColor: AURORA_MAGENTA },
})
