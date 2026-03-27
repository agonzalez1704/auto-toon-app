import { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
  ActionSheetIOS,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system/legacy'
import * as MediaLibrary from 'expo-media-library'
import Svg, { Path as SvgPath } from 'react-native-svg'
import { useModelFactoryStore } from '@/stores/use-model-factory-store'

const { width: SCREEN_W } = Dimensions.get('window')

const BRAND = '#8B5CF6'

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

  const saveModel = useModelFactoryStore((s) => s.saveModel)
  const faceAnalysis = useModelFactoryStore((s) => s.faceAnalysis)
  const facePhotoUrl = useModelFactoryStore((s) => s.faceUploadedUrl)
  const bodyPhotoUrl = useModelFactoryStore((s) => s.bodyUploadedUrl)

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
            Share.share({ url: imageUrl }).catch(() => {})
          }
        }
      )
    } else {
      Alert.alert('Image Options', undefined, [
        { text: 'Save to Photos', onPress: saveToPhotos },
        { text: 'Share', onPress: () => Share.share({ message: imageUrl }).catch(() => {}) },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }, [imageUrl, saveToPhotos])

  const handleSaveToGallery = useCallback(() => {
    setShowSaveDialog(true)
  }, [])

  const confirmSaveToGallery = useCallback(() => {
    if (!imageUrl) return
    const name = modelName.trim() || 'Untitled Model'
    saveModel({
      id: Date.now().toString(),
      name,
      imageUrl,
      prompt: faceAnalysis?.fullPrompt || '',
      facePhotoUrl: facePhotoUrl || undefined,
      bodyPhotoUrl: bodyPhotoUrl || undefined,
      createdAt: new Date().toISOString(),
    })
    setShowSaveDialog(false)
    Alert.alert('Saved', `"${name}" has been added to your models gallery.`)
  }, [imageUrl, modelName, faceAnalysis, facePhotoUrl, bodyPhotoUrl, saveModel])

  const handleRefine = useCallback(() => {
    // Form is already loaded in store from the generation, just go back to wizard
    router.push('/model-wizard')
  }, [router])

  if (!imageUrl) {
    router.back()
    return null
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
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={handleSaveToGallery}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
              Save to Models
            </Text>
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
    backgroundColor: '#0a0a0f',
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
  },
  actionButtonPrimary: {
    backgroundColor: BRAND,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },

  // Save dialog
  dialogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dialogBox: {
    width: '100%',
    backgroundColor: '#1a1a24',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  dialogInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  },
  dialogButtonPrimary: {
    backgroundColor: BRAND,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  savingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
