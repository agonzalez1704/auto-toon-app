import { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  FlatList,
  Share,
  Platform,
  ActionSheetIOS,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system/legacy'
import * as MediaLibrary from 'expo-media-library'
import Svg, { Path as SvgPath, Rect } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { useVideoStore } from '@/stores/use-video-store'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

// ─── SVG Icons ──────────────────────────────────────────────────────────

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

function VideoIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="15" height="16" rx="2" stroke="#FFFFFF" strokeWidth={2} fill="none" />
      <SvgPath d="M17 9l5-3v12l-5-3V9z" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Zoomable Image Page ────────────────────────────────────────────────

function ZoomablePage({
  url,
  onLongPress,
}: {
  url: string
  onLongPress: () => void
}) {
  const scrollRef = useRef<ScrollView>(null)
  const zoomedIn = useRef(false)
  const lastTap = useRef(0)

  const handleDoubleTap = useCallback(() => {
    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected — toggle zoom
      if (zoomedIn.current) {
        scrollRef.current?.scrollResponderZoomTo({
          x: 0,
          y: 0,
          width: SCREEN_W,
          height: SCREEN_H,
          animated: true,
        })
        zoomedIn.current = false
      } else {
        // Zoom to 2.5x at center
        const zoomW = SCREEN_W / 2.5
        const zoomH = SCREEN_H / 2.5
        scrollRef.current?.scrollResponderZoomTo({
          x: (SCREEN_W - zoomW) / 2,
          y: (SCREEN_H - zoomH) / 2,
          width: zoomW,
          height: zoomH,
          animated: true,
        })
        zoomedIn.current = true
      }
      lastTap.current = 0
    } else {
      lastTap.current = now
    }
  }, [])

  return (
    <View style={styles.page}>
      <ScrollView
        ref={scrollRef}
        style={styles.zoomScroll}
        contentContainerStyle={styles.zoomContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bouncesZoom
        centerContent
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDoubleTap}
          onLongPress={onLongPress}
          delayLongPress={400}
          style={styles.imageTouchable}
        >
          <Image
            source={{ uri: url }}
            style={styles.fullImage}
            contentFit="contain"
            transition={200}
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────────

export default function ImageViewerScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    urls: string
    initialIndex?: string
    title?: string
  }>()

  const urls: string[] = params.urls ? JSON.parse(params.urls) : []
  const initialIndex = parseInt(params.initialIndex || '0', 10)
  const title = params.title || ''

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isSaving, setIsSaving] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const saveImage = useCallback(async (url: string) => {
    setIsSaving(true)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Allow photo library access to save images.')
        return
      }
      const filename = `upscaled_${Date.now()}.jpg`
      const fileUri = `${FileSystem.cacheDirectory}${filename}`
      await FileSystem.downloadAsync(url, fileUri)
      await MediaLibrary.saveToLibraryAsync(fileUri)
      Alert.alert('Saved', 'Image saved to your photo library.')
    } catch {
      Alert.alert('Error', 'Failed to save image.')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const shareImage = useCallback(async (url: string) => {
    try {
      if (Platform.OS === 'ios') {
        await Share.share({ url })
      } else {
        await Share.share({ message: url })
      }
    } catch {
      // User cancelled
    }
  }, [])

  const handleLongPress = useCallback(() => {
    const url = urls[currentIndex]
    if (!url) return

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Save to Photos', 'Share', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) saveImage(url)
          else if (buttonIndex === 1) shareImage(url)
        }
      )
    } else {
      Alert.alert('Image Options', undefined, [
        { text: 'Save to Photos', onPress: () => saveImage(url) },
        { text: 'Share', onPress: () => shareImage(url) },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }, [urls, currentIndex, saveImage, shareImage])

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index)
      }
    },
    []
  )

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current

  if (urls.length === 0) {
    router.back()
    return null
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen image pager */}
      <FlatList
        ref={flatListRef}
        data={urls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: SCREEN_W,
          offset: SCREEN_W * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item: url }) => (
          <ZoomablePage url={url} onLongPress={handleLongPress} />
        )}
      />

      {/* Top overlay: close + title */}
      <SafeAreaView style={styles.topOverlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <CloseIcon />
          </TouchableOpacity>
          <View style={styles.topCenter} pointerEvents="none">
            {title ? (
              <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
            ) : null}
            {urls.length > 1 && (
              <Text style={styles.topCounter}>
                {currentIndex + 1} of {urls.length}
              </Text>
            )}
          </View>
          <View style={styles.iconButtonSpacer} />
        </View>
      </SafeAreaView>

      {/* Bottom overlay: Create Video + hint */}
      <SafeAreaView style={styles.bottomOverlay} edges={['bottom']} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.createVideoButton}
          onPress={() => {
            useVideoStore.getState().setSourceImage(urls[currentIndex], urls, title)
            router.push('/video-generator')
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#EB96FF', '#9333EA', '#0B5777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <VideoIcon />
          <Text style={styles.createVideoText}>Create Video</Text>
        </TouchableOpacity>
        <Text style={styles.hintText} pointerEvents="none">Hold image to save or share</Text>
      </SafeAreaView>

      {/* Saving overlay */}
      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Image pager
  page: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  zoomScroll: {
    flex: 1,
  },
  zoomContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchable: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_W,
    height: SCREEN_H,
  },

  // Top overlay
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSpacer: {
    width: 40,
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  topCounter: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Bottom overlay
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 8,
    gap: 10,
  },
  createVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
  createVideoText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hintText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
