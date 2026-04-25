import { ParticleSphere } from '@/components/particle-sphere'
import { generateCharacterSheet } from '@/lib/api'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useFashionEditorialStore } from '@/stores/use-fashion-editorial-store'
import { useModelFactoryStore } from '@/stores/use-model-factory-store'
import * as FileSystem from 'expo-file-system/legacy'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import * as MediaLibrary from 'expo-media-library'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path as SvgPath } from 'react-native-svg'

const { width: SCREEN_W } = Dimensions.get('window')

const AURORA_NAVY = '#193153'
const AURORA_MAGENTA = '#FBBF24'

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
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgPath
        d="M12 17a4 4 0 100-8 4 4 0 000 8z"
        stroke="#FFFFFF"
        strokeWidth={2}
      />
    </Svg>
  )
}

function DownloadIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Character sheet timer ──────────────────────────────────────────

function SheetTimer() {
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

  return <Text style={styles.sheetTimerText}>Generating character sheet... {elapsed}s</Text>
}

export default function ModelResultScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    imageUrl: string
    modelId?: string
    title?: string
  }>()

  const { imageUrl, title } = params
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [modelName, setModelName] = useState(title || '')
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false)

  const saveModel = useModelFactoryStore((s) => s.saveModel)
  const faceAnalysis = useModelFactoryStore((s) => s.faceAnalysis)
  const facePhotoUrl = useModelFactoryStore((s) => s.faceUploadedUrl)
  const bodyPhotoUrl = useModelFactoryStore((s) => s.bodyUploadedUrl)
  const fetchCredits = useCreditsStore((s) => s.fetchCredits)

  const saveToPhotos = useCallback(async () => {
    if (!imageUrl) return
    setIsSaving(true)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Allow photo library access to save images.')
        return
      }
      const filename = `model_${Date.now()}.jpg`
      const fileUri = `${FileSystem.cacheDirectory}${filename}`
      await FileSystem.downloadAsync(imageUrl, fileUri)
      await MediaLibrary.saveToLibraryAsync(fileUri)
      Alert.alert('Saved', 'Model image saved to your photo library.')
    } catch {
      Alert.alert('Error', 'Failed to save image.')
    } finally {
      setIsSaving(false)
    }
  }, [imageUrl])

  const handleActions = useCallback(() => {
    if (!imageUrl) return
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Save to Photos', 'Share', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) saveToPhotos()
          else if (buttonIndex === 1) {
            Share.share({ url: imageUrl }).catch(() => { })
          }
        }
      )
    } else {
      Alert.alert('Image Options', undefined, [
        { text: 'Save to Photos', onPress: saveToPhotos },
        { text: 'Share', onPress: () => Share.share({ message: imageUrl }).catch(() => { }) },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }, [imageUrl, saveToPhotos])

  const handleSaveToGallery = useCallback(() => {
    setShowSaveDialog(true)
  }, [])

  const confirmSaveToGallery = useCallback(async () => {
    if (!imageUrl) return
    const name = modelName.trim() || 'Untitled Model'

    // Save a temporary local entry while we generate the character sheet
    const tempId = `temp_${Date.now()}`
    saveModel({
      id: tempId,
      name,
      imageUrl,
      prompt: faceAnalysis?.fullPrompt || '',
      facePhotoUrl: facePhotoUrl || undefined,
      bodyPhotoUrl: bodyPhotoUrl || undefined,
      createdAt: new Date().toISOString(),
    })
    setShowSaveDialog(false)

    // Trigger character sheet generation — the API creates the DB record
    setIsGeneratingSheet(true)
    try {
      const result = await generateCharacterSheet({
        referenceImageUrl: imageUrl,
        modelName: name,
        prompt: faceAnalysis?.fullPrompt || '',
      })

      // Replace temp entry with DB-backed model (use the real DB id)
      const store = useModelFactoryStore.getState()
      const updated = store.savedModels.map((m) =>
        m.id === tempId
          ? {
            ...m,
            id: result.model.id,
            imageUrl: result.model.imageUrl,
            characterSheetUrl: result.model.characterSheetUrl,
          }
          : m
      )
      useModelFactoryStore.setState({ savedModels: updated })

      // Update credits
      useCreditsStore.getState().setCredits(result.creditsRemaining)
      fetchCredits()

      Alert.alert(
        'Model Saved',
        `"${name}" has been saved with a character reference sheet for consistent generations.`
      )
    } catch (error: any) {
      // Model is saved locally — character sheet just failed
      Alert.alert(
        'Saved (Partial)',
        `"${name}" has been saved, but the character sheet could not be generated. You can regenerate it later.\n\n${error?.message || ''}`
      )
    } finally {
      setIsGeneratingSheet(false)
    }
  }, [imageUrl, modelName, faceAnalysis, facePhotoUrl, bodyPhotoUrl, saveModel, fetchCredits])

  const handleRefine = useCallback(() => {
    router.push('/model-wizard')
  }, [router])

  const handleCreatePhotoshoot = useCallback(() => {
    if (!imageUrl) return
    // Pre-select this model in the editorial store and navigate
    const editorialStore = useFashionEditorialStore.getState()
    editorialStore.reset()
    // Use modelId from params if we have one, otherwise use the imageUrl as temp id
    const id = params.modelId || `unsaved_${Date.now()}`
    editorialStore.selectModel(id, imageUrl)
    router.push('/fashion-editorial')
  }, [imageUrl, params.modelId, router])

  if (!imageUrl) {
    router.back()
    return null
  }

  // Character sheet generation loading screen
  if (isGeneratingSheet) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.sheetLoadingScreen}>
            <ParticleSphere width={140} height={140} phase="generating" />
            <SheetTimer />
            <Text style={styles.sheetLoadingHint}>
              Creating multi-angle reference sheet for consistent future generations
            </Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  const imageHeight = (SCREEN_W - 32) * (4 / 3)

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
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Generated Model'}
          </Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleActions}
            activeOpacity={0.7}
          >
            <DownloadIcon />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={[styles.image, { height: imageHeight }]}
            contentFit="contain"
            transition={200}
          />
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRefine}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>Refine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSaveToGallery}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>Save to Models</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.photoshootAction}>
          <TouchableOpacity
            style={styles.photoshootBtn}
            onPress={handleCreatePhotoshoot}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FBBF24', '#F59E0B', '#B45309']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <CameraIcon />
            <Text style={styles.photoshootBtnText}>Create Photoshoot</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Save dialog */}
      {showSaveDialog && (
        <KeyboardAvoidingView
          style={styles.dialogOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Save Model</Text>
            <Text style={styles.dialogSubtitle}>
              A character reference sheet will be generated automatically for face consistency.
            </Text>
            <TextInput
              style={styles.dialogInput}
              value={modelName}
              onChangeText={setModelName}
              placeholder="Model name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={styles.dialogButton}
                onPress={() => setShowSaveDialog(false)}
              >
                <Text style={styles.dialogButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={confirmSaveToGallery}
              >
                <LinearGradient
                  colors={['#FBBF24', '#F59E0B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]}
                />
                <Text style={[styles.dialogButtonText, styles.dialogButtonTextPrimary]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </View>
  )
}

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
    textAlign: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  image: {
    width: '100%',
    borderRadius: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoshootAction: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  photoshootBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  photoshootBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Save dialog
  dialogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25,49,83,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dialogBox: {
    width: '100%',
    backgroundColor: '#162844',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.15)',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  dialogSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 16,
    lineHeight: 18,
  },
  dialogInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dialogButtonPrimary: {
    backgroundColor: AURORA_MAGENTA,
  },
  dialogButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  dialogButtonTextPrimary: {
    color: '#FFFFFF',
  },

  // Saving overlay
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25,49,83,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  savingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Character sheet loading
  sheetLoadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  sheetTimerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  sheetLoadingHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 20,
  },
})
