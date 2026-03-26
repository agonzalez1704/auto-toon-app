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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system/legacy'
import * as MediaLibrary from 'expo-media-library'
import Svg, { Path as SvgPath } from 'react-native-svg'
import { BeforeAfterSlider } from '@/components/before-after-slider'

const { width: SCREEN_W } = Dimensions.get('window')

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

export default function RestoreViewerScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    beforeUrl: string
    afterUrl: string
    title?: string
  }>()

  const { beforeUrl, afterUrl, title } = params
  const [isSaving, setIsSaving] = useState(false)

  const saveImage = useCallback(async () => {
    if (!afterUrl) return
    setIsSaving(true)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Allow photo library access to save images.')
        return
      }
      const filename = `restored_${Date.now()}.jpg`
      const fileUri = `${FileSystem.cacheDirectory}${filename}`
      await FileSystem.downloadAsync(afterUrl, fileUri)
      await MediaLibrary.saveToLibraryAsync(fileUri)
      Alert.alert('Saved', 'Restored image saved to your photo library.')
    } catch {
      Alert.alert('Error', 'Failed to save image.')
    } finally {
      setIsSaving(false)
    }
  }, [afterUrl])

  const handleActions = useCallback(() => {
    if (!afterUrl) return
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Save to Photos', 'Share', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) saveImage()
          else if (buttonIndex === 1) {
            Share.share({ url: afterUrl }).catch(() => {})
          }
        }
      )
    } else {
      Alert.alert('Image Options', undefined, [
        { text: 'Save to Photos', onPress: saveImage },
        { text: 'Share', onPress: () => Share.share({ message: afterUrl }).catch(() => {}) },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }, [afterUrl, saveImage])

  if (!beforeUrl || !afterUrl) {
    router.back()
    return null
  }

  const sliderHeight = (SCREEN_W - 32) * (4 / 3)

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
            {title || 'Restored'}
          </Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleActions}
            activeOpacity={0.7}
          >
            <DownloadIcon />
          </TouchableOpacity>
        </View>

        {/* Before/After Slider */}
        <View style={styles.sliderContainer}>
          <BeforeAfterSlider
            beforeUri={beforeUrl}
            afterUri={afterUrl}
            height={sliderHeight}
            revealOnMount
          />
        </View>

        {/* Hint */}
        <Text style={styles.hint}>Slide to compare before & after</Text>
      </SafeAreaView>

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
  sliderContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    paddingBottom: 16,
  },
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
