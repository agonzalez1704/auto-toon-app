import { useCallback, useRef, useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { useRouter } from 'expo-router'
import Svg, { Path as SvgPath, Circle } from 'react-native-svg'
import { useModelFactoryStore } from '@/stores/use-model-factory-store'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useTermsConsentStore } from '@/stores/use-terms-consent-store'
import { uploadImage } from '@/lib/upload'
import {
  generateFashionModel,
  analyzeFacePhoto,
  analyzeBodyPhoto,
} from '@/lib/api'
import { ParticleSphere } from '@/components/particle-sphere'
import { AI_MODELS, getModelCredits } from '@/lib/ai-models'

const AURORA_NAVY = '#193153'
const AURORA_MAGENTA = '#EB96FF'
const AURORA_TEAL = '#0B5777'

// ─── Icons ──────────────────────────────────────────────────────────

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

function CameraIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgPath
        d="M12 17a4 4 0 100-8 4 4 0 000 8z"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={2}
      />
    </Svg>
  )
}

function UploadIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Timer ──────────────────────────────────────────────────────────

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

  return <Text style={styles.timerText}>Creating model... {elapsed}s</Text>
}

// ─── Photo Upload Section ───────────────────────────────────────────

function PhotoSection({
  label,
  hint,
  localUri,
  isUploading,
  isAnalyzing,
  isAnalyzed,
  onPickGallery,
  onTakePhoto,
  onClear,
}: {
  label: string
  hint: string
  localUri: string | null
  isUploading: boolean
  isAnalyzing?: boolean
  isAnalyzed?: boolean
  onPickGallery: () => void
  onTakePhoto: () => void
  onClear: () => void
}) {
  if (localUri) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <View style={styles.imagePreview}>
          <Image
            source={{ uri: localUri }}
            style={styles.previewImage}
            contentFit="cover"
            transition={200}
          />
          {isUploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.uploadOverlayText}>Uploading...</Text>
            </View>
          )}
          {isAnalyzing && !isUploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.uploadOverlayText}>Analyzing...</Text>
            </View>
          )}
          {isAnalyzed && !isAnalyzing && !isUploading && (
            <View style={styles.analyzedBadge}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <SvgPath
                  d="M20 6L9 17l-5-5"
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.analyzedText}>Analyzed</Text>
            </View>
          )}
          <TouchableOpacity style={styles.removeBtn} onPress={onClear}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <SvgPath
                d="M18 6L6 18M6 6l12 12"
                stroke="#FFFFFF"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionHint}>{hint}</Text>
      <View style={styles.uploadRow}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={onPickGallery}
          activeOpacity={0.7}
        >
          <UploadIcon />
          <Text style={styles.uploadLabel}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={onTakePhoto}
          activeOpacity={0.7}
        >
          <CameraIcon />
          <Text style={styles.uploadLabel}>Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ModelWizardScreen() {
  const router = useRouter()
  const store = useModelFactoryStore()
  const { balance, fetchCredits, setShowExhaustionModal } = useCreditsStore()
  const { requireConsent } = useTermsConsentStore()

  const [isFaceUploading, setIsFaceUploading] = useState(false)
  const [isBodyUploading, setIsBodyUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const isSubmittingRef = useRef(false)
  const isAnalyzingRef = useRef(false)

  // Auto-analyze face when "describe-generate" mode is selected and face is ready
  useEffect(() => {
    if (
      store.mode !== 'describe-generate' ||
      !store.faceUploadedUrl ||
      !store.faceLocalUri ||
      store.faceAnalysis ||
      isFaceUploading ||
      isAnalyzingRef.current
    )
      return

    const localUri = store.faceLocalUri

    isAnalyzingRef.current = true
    setIsAnalyzing(true)
    store.setError(null)
    ;(async () => {
      try {
        const faceBase64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: 'base64',
        })
        const analysis = await analyzeFacePhoto(faceBase64)
        store.setFaceAnalysis(analysis)
      } catch {
        store.setError('Face analysis failed. Please try again.')
      } finally {
        isAnalyzingRef.current = false
        setIsAnalyzing(false)
      }
    })()
  }, [store.mode, store.faceUploadedUrl, store.faceLocalUri, store.faceAnalysis, isFaceUploading])

  const canGenerate =
    store.faceUploadedUrl &&
    !isFaceUploading &&
    !isBodyUploading &&
    !isAnalyzing &&
    store.phase === 'idle' &&
    (store.mode === 'use-face' || store.faceAnalysis !== null)

  // ─── Image picking helpers ────────────────────────────────────────

  const pickImageFrom = useCallback(
    async (source: 'gallery' | 'camera', target: 'face' | 'body') => {
      const setUploading =
        target === 'face' ? setIsFaceUploading : setIsBodyUploading
      const setLocalUri =
        target === 'face' ? store.setFaceLocalUri : store.setBodyLocalUri
      const setUploadedUrl =
        target === 'face' ? store.setFaceUploadedUrl : store.setBodyUploadedUrl

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (!permission.granted) {
          Alert.alert(
            'Permission needed',
            'Camera access is required to take photos.'
          )
          return
        }
      }

      try {
        const result =
          source === 'gallery'
            ? await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
              })
            : await ImagePicker.launchCameraAsync({ quality: 0.8 })

        if (!result.canceled && result.assets[0]) {
          const uri = result.assets[0].uri
          setLocalUri(uri)
          setUploadedUrl(null)
          store.setError(null)

          if (target === 'face') {
            store.setFaceAnalysis(null)
            isAnalyzingRef.current = false
          } else {
            store.setBodyAnalysis(null)
          }

          setUploading(true)
          try {
            const publicUrl = await uploadImage(uri)
            setUploadedUrl(publicUrl)
          } catch {
            store.setError('Upload failed. Please try again.')
          } finally {
            setUploading(false)
          }
        }
      } catch {
        // User cancelled
      }
    },
    [store]
  )

  // ─── Generate ─────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || !store.faceUploadedUrl || isSubmittingRef.current) return
    isSubmittingRef.current = true

    const consented = requireConsent(() => {
      isSubmittingRef.current = false
      handleGenerate()
    })
    if (!consented) {
      isSubmittingRef.current = false
      return
    }

    const creditCost = store.mode === 'use-face'
      ? getModelCredits(AI_MODELS.GEMINI_3_IMAGE.id)
      : getModelCredits(AI_MODELS.Z_IMAGE_TURBO.id)
    if (balance !== null && balance < creditCost) {
      setShowExhaustionModal(true)
      isSubmittingRef.current = false
      return
    }

    store.setError(null)

    try {
      let prompt: string

      if (store.mode === 'describe-generate') {
        // Face analysis was already done when mode was selected
        if (!store.faceAnalysis) {
          store.setError('Face analysis not ready. Please wait.')
          isSubmittingRef.current = false
          return
        }

        // Use the full prompt from the pre-computed analysis
        prompt = store.faceAnalysis.fullPrompt

        // If body photo exists, analyze and append body context
        store.setPhase('analyzing')
        if (store.bodyUploadedUrl && store.bodyLocalUri) {
          const bodyBase64 = await FileSystem.readAsStringAsync(
            store.bodyLocalUri,
            { encoding: 'base64' }
          )
          const bodyAnalysis = await analyzeBodyPhoto(bodyBase64)
          store.setBodyAnalysis(bodyAnalysis)

          if (bodyAnalysis.isPerson) {
            prompt += `\n\nBody details: ${bodyAnalysis.bodyType}. ${bodyAnalysis.clothing}. ${bodyAnalysis.accessories}.`
          }
        }

        // Natural teeth directive
        prompt +=
          '\n\nTeeth: if visible, render natural with subtle imperfections — not perfectly white, slight irregularity in alignment. No Hollywood veneers look.'
      } else {
        // "use-face" mode — pass photo as img2img reference via Nano Banana
        prompt =
          'Generate a professional beauty-editorial portrait of the person in @img1. Preserve their exact facial features, skin tone, and identity. Natural teeth with subtle imperfections if visible. Black studio setup, soft beauty-dish lighting, editorial finish. SFW. No CGI, no 3D rendering, no watermarks.'
      }

      // Generate
      store.setPhase('generating')

      const generateParams: Parameters<typeof generateFashionModel>[0] = {
        prompt,
        width: 768,
        height: 1024,
        output_format: 'jpg',
        output_quality: 90,
        num_inference_steps: 8,
      }

      if (store.mode === 'use-face') {
        // Read face photo as base64 for Gemini/Nano Banana
        const faceBase64 = await FileSystem.readAsStringAsync(
          store.faceLocalUri!,
          { encoding: 'base64' }
        )
        generateParams.imageBase64 = faceBase64
        generateParams.aiModelId = AI_MODELS.GEMINI_3_IMAGE.id
      }

      const result = await generateFashionModel(generateParams)

      store.setGeneratedImageUrl(result.imageUrl)
      useCreditsStore.getState().setCredits(result.creditsRemaining)
      fetchCredits()

      router.push({
        pathname: '/model-result',
        params: {
          imageUrl: result.imageUrl,
          title:
            store.faceAnalysis?.subjectDescriptor || 'Generated Model',
        },
      })
    } catch (error: any) {
      if (error?.status === 402) {
        setShowExhaustionModal(true)
      } else {
        store.setError(
          error?.message || 'Generation failed. Please try again.'
        )
      }
      store.setPhase('idle')
    } finally {
      isSubmittingRef.current = false
    }
  }, [
    canGenerate,
    store,
    balance,
    requireConsent,
    fetchCredits,
    setShowExhaustionModal,
    router,
  ])

  // ─── Generating / Analyzing state ─────────────────────────────────

  if (store.phase === 'analyzing' || store.phase === 'generating') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.loadingScreen}>
            <ParticleSphere width={160} height={160} phase="generating" />
            <GeneratingTimer />
            <Text style={styles.loadingHint}>
              {store.phase === 'analyzing'
                ? 'Analyzing your photo...'
                : 'This usually takes 10-30 seconds'}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // ─── Main form ────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <CloseIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Model</Text>
          {balance !== null && (
            <View style={styles.creditsBadge}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <SvgPath
                  d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"
                  fill={AURORA_MAGENTA}
                />
              </Svg>
              <Text style={styles.creditsText}>{balance}</Text>
            </View>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Face photo */}
          <PhotoSection
            label="Face Reference"
            hint="Upload or take a photo of the face you want to use"
            localUri={store.faceLocalUri}
            isUploading={isFaceUploading}
            isAnalyzing={isAnalyzing}
            isAnalyzed={store.mode === 'describe-generate' && store.faceAnalysis !== null}
            onPickGallery={() => pickImageFrom('gallery', 'face')}
            onTakePhoto={() => pickImageFrom('camera', 'face')}
            onClear={store.clearFace}
          />

          {/* Mode selector — show after face is uploaded */}
          {store.faceUploadedUrl && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>How to use this photo?</Text>
              <View style={styles.modeRow}>
                <TouchableOpacity
                  style={[
                    styles.modeCard,
                    store.mode === 'use-face' && styles.modeCardSelected,
                  ]}
                  onPress={() => store.setMode('use-face')}
                  activeOpacity={0.7}
                >
                  <View style={styles.modeRadio}>
                    {store.mode === 'use-face' && (
                      <View style={styles.modeRadioFilled} />
                    )}
                  </View>
                  <View style={styles.modeTextContainer}>
                    <Text style={styles.modeTitle}>Use exact face</Text>
                    <Text style={styles.modeDesc}>
                      Keep this face as-is in the generation
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeCard,
                    store.mode === 'describe-generate' &&
                      styles.modeCardSelected,
                  ]}
                  onPress={() => store.setMode('describe-generate')}
                  activeOpacity={0.7}
                >
                  <View style={styles.modeRadio}>
                    {store.mode === 'describe-generate' && (
                      <View style={styles.modeRadioFilled} />
                    )}
                  </View>
                  <View style={styles.modeTextContainer}>
                    <Text style={styles.modeTitle}>Describe & generate</Text>
                    <Text style={styles.modeDesc}>
                      AI analyzes features and generates a new model inspired by
                      them
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Body photo (optional) — show after face is uploaded */}
          {store.faceUploadedUrl && (
            <PhotoSection
              label="Body Reference (Optional)"
              hint="Upload a body photo for build, tattoos, piercings, etc."
              localUri={store.bodyLocalUri}
              isUploading={isBodyUploading}
              onPickGallery={() => pickImageFrom('gallery', 'body')}
              onTakePhoto={() => pickImageFrom('camera', 'body')}
              onClear={store.clearBody}
            />
          )}

          {/* Error */}
          {store.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{store.error}</Text>
            </View>
          )}

          {/* Generate button */}
          <TouchableOpacity
            style={[
              styles.generateButton,
              !canGenerate && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={!canGenerate}
            activeOpacity={0.8}
          >
            {canGenerate && (
              <LinearGradient
                colors={[AURORA_MAGENTA, '#9333EA', AURORA_TEAL]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <View style={styles.generateBtnContent}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="7" r="4" fill="#FFFFFF" />
                <SvgPath
                  d="M5.5 21c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5"
                  fill="#FFFFFF"
                />
              </Svg>
              <Text style={styles.generateBtnText}>
                Generate Model ({store.mode === 'use-face' ? `${getModelCredits(AI_MODELS.GEMINI_3_IMAGE.id)} credits` : `${getModelCredits(AI_MODELS.Z_IMAGE_TURBO.id)} credit`})
              </Text>
            </View>
          </TouchableOpacity>

          {balance !== null && (
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
  safeArea: {
    flex: 1,
  },
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
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  creditsText: {
    fontSize: 14,
    fontWeight: '700',
    color: AURORA_MAGENTA,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.5)',
  },
  sectionHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 12,
  },

  // Upload
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
  },
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

  // Preview
  imagePreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25,49,83,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlayText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(25,49,83,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzedBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34,197,94,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  analyzedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Mode selector
  modeRow: {
    gap: 10,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 12,
  },
  modeCardSelected: {
    borderColor: AURORA_MAGENTA,
    backgroundColor: 'rgba(235,150,255,0.1)',
  },
  modeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeRadioFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AURORA_MAGENTA,
  },
  modeTextContainer: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modeDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
    lineHeight: 16,
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },

  // Generate button
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  generateButtonDisabled: {
    opacity: 0.4,
  },
  generateBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 4,
  },

  // Loading screen
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  loadingHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
})
