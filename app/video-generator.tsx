import { ParticleSphere } from '@/components/particle-sphere'
import { AI_MODELS, getCostLabel } from '@/lib/ai-models'
import { analyzeProductForVideo, generateVideoSSE } from '@/lib/api'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'
import { useVideoStore } from '@/stores/use-video-store'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Rect, Path as SvgPath } from 'react-native-svg'

const { width: SCREEN_W } = Dimensions.get('window')

const AURORA_NAVY = '#193153'
const AURORA_TEAL = '#0B5777'
const AURORA_MAGENTA = '#FBBF24'

// Credit cost for video (matches backend: 10 credits per 5s, 20 per 10s)
function getVideoCreditCost(duration: 5 | 10): number {
  return duration === 5 ? 10 : 20
}

// ─── SVG Icons ──────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M18 6L6 18M6 6l12 12"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function VideoIcon({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="15" height="16" rx="2" stroke={color} strokeWidth={2} fill="none" />
      <SvgPath d="M17 9l5-3v12l-5-3V9z" stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
    </Svg>
  )
}

function SparkleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"
        fill={AURORA_MAGENTA}
        stroke="none"
      />
    </Svg>
  )
}

function RefreshIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M1 4v6h6M23 20v-6h-6"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgPath
        d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Camera preset icons
function CameraIcon({ preset }: { preset: string }) {
  const c = AURORA_MAGENTA
  switch (preset) {
    case 'pan-left':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <SvgPath d="M19 12H5M5 12l5-5M5 12l5 5" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'pan-right':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <SvgPath d="M5 12h14M19 12l-5-5M19 12l-5 5" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'zoom-in':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="7" stroke={c} strokeWidth={2} fill="none" />
          <SvgPath d="M21 21l-4.35-4.35M8 11h6M11 8v6" stroke={c} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      )
    case 'zoom-out':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="7" stroke={c} strokeWidth={2} fill="none" />
          <SvgPath d="M21 21l-4.35-4.35M8 11h6" stroke={c} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      )
    case 'tilt-up':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <SvgPath d="M12 19V5M12 5l-5 5M12 5l5 5" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'tilt-down':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <SvgPath d="M12 5v14M12 19l-5-5M12 19l5-5" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    case 'orbit':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <SvgPath d="M21.5 12c0 5.25-4.25 9.5-9.5 9.5S2.5 17.25 2.5 12 6.75 2.5 12 2.5" stroke={c} strokeWidth={2} strokeLinecap="round" />
          <SvgPath d="M16 2l5 3-3 5" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )
    default: // static
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth={2} fill="none" />
          <Circle cx="12" cy="12" r="8" stroke={c} strokeWidth={1.5} fill="none" strokeDasharray="3 3" />
        </Svg>
      )
  }
}

const CAMERA_LABELS: Record<string, string> = {
  static: 'Static',
  'pan-left': 'Pan Left',
  'pan-right': 'Pan Right',
  'zoom-in': 'Zoom In',
  'zoom-out': 'Zoom Out',
  'tilt-up': 'Tilt Up',
  'tilt-down': 'Tilt Down',
  orbit: 'Orbit',
}

// ─── Timer Components ────────────────────────────────────────────────

function AnalyzingTimer() {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    startRef.current = Date.now()
    setElapsed(0)
    const interval = setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      1000
    )
    return () => clearInterval(interval)
  }, [])

  return (
    <Text style={styles.phaseTimerText}>
      Crafting your video ad... {elapsed}s
    </Text>
  )
}

function GeneratingTimer() {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    startRef.current = Date.now()
    setElapsed(0)
    const interval = setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      1000
    )
    return () => clearInterval(interval)
  }, [])

  return (
    <Text style={styles.phaseTimerText}>
      Generating video... {elapsed}s
    </Text>
  )
}

function PlusIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M12 5v14M5 12h14" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M20 6L9 17l-5-5" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function FrameIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M5 3l14 9-14 9V3z" fill={AURORA_MAGENTA} stroke="none" />
    </Svg>
  )
}

function EndFrameIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x="15" y="5" width="4" height="14" rx="1" fill={AURORA_MAGENTA} />
      <SvgPath d="M4 5l9 7-9 7V5z" fill={AURORA_MAGENTA} stroke="none" />
    </Svg>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────

export default function VideoGeneratorScreen() {
  const router = useRouter()
  const store = useVideoStore()
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const { requireConsent } = useTermsConsentStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'
  const abortRef = useRef<{ abort: () => void } | null>(null)
  const [showEndFramePicker, setShowEndFramePicker] = useState(false)

  const plan = store.aiPlan
  const creditCost = plan ? getVideoCreditCost(plan.duration) : 10
  const duration = plan?.duration ?? 5
  const videoCostLabel = getCostLabel(AI_MODELS.KLING_V3.id, isPayPerUse, { videoDuration: duration })

  // Auto-analyze on mount
  useEffect(() => {
    if (store.sourceImageUrl && store.analysisPhase === 'idle') {
      runAnalysis()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const runAnalysis = useCallback(async () => {
    if (!store.sourceImageUrl) return

    store.setAnalyzing()
    try {
      const result = await analyzeProductForVideo(
        store.sourceImageUrl,
        store.productName || undefined
      )
      console.log("🚀 ~ VideoGeneratorScreen ~ result:", result)
      store.setAiPlan(result)
    } catch (error: any) {
      store.setAnalysisError(error?.message || 'Failed to analyze product')
    }
  }, [store])

  const handleGenerate = useCallback(() => {
    if (!store.sourceImageUrl || !plan) return

    const consented = requireConsent(() => handleGenerate())
    if (!consented) return

    if (balance !== null && balance < creditCost) {
      setShowExhaustionModal(true)
      return
    }

    store.setGenerationProgress(0, 'Starting video generation...')
    useVideoStore.setState({ generationPhase: 'generating' })

    const controller = generateVideoSSE(
      {
        sourceImageUrl: store.sourceImageUrl,
        tailImageUrl: store.tailImageUrl || undefined,
        motionPrompt: plan.motionPrompt || undefined,
        duration: plan.duration,
        aspectRatio: plan.aspectRatio,
        cameraPreset: plan.cameraPreset === 'static' ? undefined : plan.cameraPreset,
      },
      {
        onProgress: (event) => {
          store.setGenerationProgress(event.percent, event.message)
        },
        onSuccess: (event) => {
          store.setGenerationResult(event.videoUrl, event.videoGenerationId)
          fetchCredits()
          router.replace({
            pathname: '/video-player',
            params: {
              videoUrl: event.videoUrl,
              title: plan.productName || store.productName,
            },
          })
        },
        onError: (message) => {
          store.setError(message)
          fetchCredits()
        },
      }
    )

    abortRef.current = controller
  }, [store, plan, balance, creditCost, requireConsent, fetchCredits, setShowExhaustionModal, router])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  if (!store.sourceImageUrl) {
    router.back()
    return null
  }

  // ─── Analyzing State ──────────────────────────────────────────────
  if (store.analysisPhase === 'analyzing') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} activeOpacity={0.7}>
              <CloseIcon />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Video</Text>
            <View style={styles.iconButtonSpacer} />
          </View>
          <View style={styles.phaseScreen}>
            <ParticleSphere width={140} height={140} phase="generating" />
            <AnalyzingTimer />
            <Text style={styles.phaseHint}>
              AI is analyzing your product to create the perfect video ad
            </Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // ─── Generating State ─────────────────────────────────────────────
  if (store.generationPhase === 'generating') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.phaseScreen}>
            <ParticleSphere width={140} height={140} phase="generating" />
            <GeneratingTimer />
            <Text style={styles.phaseProgress}>{store.progressMessage}</Text>
            {store.progress > 0 && (
              <View style={styles.progressBarOuter}>
                <View style={[styles.progressBarInner, { width: `${Math.min(store.progress, 100)}%` }]} />
              </View>
            )}
            <Text style={styles.phaseHint}>This usually takes 1-3 minutes</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // ─── Error State ──────────────────────────────────────────────────
  if (store.analysisPhase === 'error' && !plan) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} activeOpacity={0.7}>
              <CloseIcon />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Video</Text>
            <View style={styles.iconButtonSpacer} />
          </View>
          <View style={styles.phaseScreen}>
            <Text style={styles.errorTitle}>Analysis Failed</Text>
            <Text style={styles.errorMessage}>{store.error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={runAnalysis} activeOpacity={0.7}>
              <RefreshIcon />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // ─── Ready State — AI Plan ────────────────────────────────────────
  const imageHeight = (SCREEN_W - 40) * (3 / 4)

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} activeOpacity={0.7}>
            <CloseIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Video</Text>
          <View style={styles.iconButtonSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Source Image Preview */}
          <View style={styles.imagePreview}>
            <Image
              source={{ uri: store.sourceImageUrl }}
              style={[styles.previewImage, { height: imageHeight }]}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.imageLabel}>
              <VideoIcon size={14} />
              <Text style={styles.imageLabelText}>
                {plan?.productName || store.productName || 'Product Video'}
              </Text>
            </View>
          </View>

          {/* Start & End Frame */}
          {store.availableImages.length > 1 && (
            <View style={styles.frameSection}>
              <Text style={styles.frameSectionTitle}>Frames</Text>
              <View style={styles.frameRow}>
                {/* Start Frame */}
                <View style={styles.frameCard}>
                  <Image
                    source={{ uri: store.sourceImageUrl }}
                    style={styles.frameThumbnail}
                    contentFit="cover"
                  />
                  <View style={styles.frameBadge}>
                    <FrameIcon />
                    <Text style={styles.frameBadgeText}>Start</Text>
                  </View>
                </View>

                {/* Arrow */}
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" style={{ marginTop: 20 }}>
                  <SvgPath d="M5 12h14M13 6l6 6-6 6" stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>

                {/* End Frame */}
                {store.tailImageUrl ? (
                  <TouchableOpacity
                    style={styles.frameCard}
                    onPress={() => setShowEndFramePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: store.tailImageUrl }}
                      style={styles.frameThumbnail}
                      contentFit="cover"
                    />
                    <View style={styles.frameBadge}>
                      <EndFrameIcon />
                      <Text style={styles.frameBadgeText}>End</Text>
                    </View>
                    {/* Remove button */}
                    <TouchableOpacity
                      style={styles.frameRemove}
                      onPress={() => store.setTailImage(null)}
                      activeOpacity={0.7}
                    >
                      <CloseIcon />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.frameCard, styles.frameCardEmpty]}
                    onPress={() => setShowEndFramePicker(true)}
                    activeOpacity={0.7}
                  >
                    <PlusIcon />
                    <Text style={styles.frameEmptyLabel}>End Frame</Text>
                    <Text style={styles.frameEmptyHint}>Optional</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* End Frame Picker Modal */}
          <Modal
            visible={showEndFramePicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowEndFramePicker(false)}
          >
            <View style={styles.pickerModal}>
              <SafeAreaView edges={['top']} style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select End Frame</Text>
                <TouchableOpacity
                  style={styles.pickerClose}
                  onPress={() => setShowEndFramePicker(false)}
                  activeOpacity={0.7}
                >
                  <CloseIcon />
                </TouchableOpacity>
              </SafeAreaView>
              <Text style={styles.pickerSubtitle}>
                Pick an image from your batch to use as the final frame
              </Text>
              <FlatList
                data={store.availableImages.filter((url) => url !== store.sourceImageUrl)}
                numColumns={2}
                contentContainerStyle={styles.pickerGrid}
                columnWrapperStyle={styles.pickerRow}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const isSelected = store.tailImageUrl === item
                  return (
                    <TouchableOpacity
                      style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                      onPress={() => {
                        store.setTailImage(item)
                        setShowEndFramePicker(false)
                      }}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: item }}
                        style={styles.pickerImage}
                        contentFit="cover"
                      />
                      {isSelected && (
                        <View style={styles.pickerCheck}>
                          <CheckIcon />
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                }}
              />
            </View>
          </Modal>

          {/* AI Plan Card */}
          {plan && (
            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={styles.planHeaderLeft}>
                  <SparkleIcon />
                  <Text style={styles.planHeaderText}>AI Video Plan</Text>
                </View>
                <TouchableOpacity
                  style={styles.regenerateButton}
                  onPress={runAnalysis}
                  activeOpacity={0.7}
                >
                  <RefreshIcon />
                </TouchableOpacity>
              </View>

              {/* Creative Brief */}
              {plan.creativeBrief ? (
                <Text style={styles.creativeBrief}>{plan.creativeBrief}</Text>
              ) : null}

              {/* Motion Description */}
              <View style={styles.planSection}>
                <Text style={styles.planSectionLabel}>Motion</Text>
                <Text style={styles.planSectionValue}>{plan.motionPrompt}</Text>
              </View>

              {/* Settings Row */}
              <View style={styles.planSettingsRow}>
                {/* Camera */}
                <View style={styles.planSettingCard}>
                  <CameraIcon preset={plan.cameraPreset} />
                  <Text style={styles.planSettingLabel}>Camera</Text>
                  <Text style={styles.planSettingValue}>
                    {CAMERA_LABELS[plan.cameraPreset] || plan.cameraPreset}
                  </Text>
                </View>

                {/* Duration */}
                <View style={styles.planSettingCard}>
                  <Text style={styles.planSettingEmoji}>{plan.duration}s</Text>
                  <Text style={styles.planSettingLabel}>Duration</Text>
                  <Text style={styles.planSettingValue}>
                    {plan.duration === 5 ? 'Quick' : 'Cinematic'}
                  </Text>
                </View>

                {/* Aspect Ratio */}
                <View style={styles.planSettingCard}>
                  <Text style={styles.planSettingEmoji}>{plan.aspectRatio}</Text>
                  <Text style={styles.planSettingLabel}>Format</Text>
                  <Text style={styles.planSettingValue}>
                    {plan.aspectRatio === '9:16' ? 'Vertical' : plan.aspectRatio === '16:9' ? 'Wide' : 'Square'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Generation Error */}
          {store.generationPhase === 'error' && store.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{store.error}</Text>
              <TouchableOpacity
                onPress={() => useVideoStore.setState({ error: null, generationPhase: 'idle' })}
              >
                <Text style={styles.errorDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Generate Button */}
          <TouchableOpacity
            style={[styles.generateButton, !plan && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={!plan}
            activeOpacity={0.8}
          >
            {plan && (
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#B45309']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <View style={styles.genButtonContent}>
              <VideoIcon size={20} />
              <Text style={styles.generateButtonText}>
                Generate Video ({videoCostLabel})
              </Text>
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

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AURORA_NAVY,
  },
  safeArea: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Header
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
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Image preview
  imagePreview: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewImage: {
    width: '100%',
  },
  imageLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: 'rgba(25,49,83,0.85)',
  },
  imageLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Phase screens (analyzing, generating)
  phaseScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  phaseTimerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  phaseProgress: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
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
  progressBarInner: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: AURORA_MAGENTA,
  },

  // Error state
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Frame section
  frameSection: {
    marginBottom: 20,
  },
  frameSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  frameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 12,
  },
  frameCard: {
    width: (SCREEN_W - 40 - 48) / 2,
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  frameCardEmpty: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  frameThumbnail: {
    width: '100%',
    height: '100%',
  },
  frameBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  frameBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  frameRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameEmptyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  frameEmptyHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
  },

  // End frame picker modal
  pickerModal: {
    flex: 1,
    backgroundColor: AURORA_NAVY,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pickerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  pickerGrid: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  pickerRow: {
    gap: 10,
    marginBottom: 10,
  },
  pickerItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pickerItemSelected: {
    borderColor: AURORA_MAGENTA,
  },
  pickerImage: {
    width: '100%',
    height: '100%',
  },
  pickerCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AURORA_MAGENTA,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // AI Plan Card
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.12)',
    padding: 16,
    marginBottom: 20,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: AURORA_MAGENTA,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  regenerateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Creative brief
  creativeBrief: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
    marginBottom: 16,
    fontStyle: 'italic',
  },

  // Plan sections
  planSection: {
    marginBottom: 16,
  },
  planSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  planSectionValue: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },

  // Settings row
  planSettingsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  planSettingCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  planSettingLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  planSettingValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planSettingEmoji: {
    fontSize: 16,
    fontWeight: '700',
    color: AURORA_MAGENTA,
  },

  // Error box (generation error)
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

  // Generate button
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
  genButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  balanceHint: {
    fontSize: 12,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
  },
})
