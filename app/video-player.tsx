import { useCallback, useRef, useState, useEffect } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { VideoView, useVideoPlayer } from 'expo-video'
import { useEvent } from 'expo'
import * as FileSystem from 'expo-file-system/legacy'
import * as MediaLibrary from 'expo-media-library'
import Svg, { Path as SvgPath } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

const AURORA_MAGENTA = '#EB96FF'

// ─── Icons ────────────────────────────────────────────────────────────

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

function SaveIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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

function ShareIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function LoopIcon({ active }: { active: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"
        stroke={active ? AURORA_MAGENTA : '#FFFFFF'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function PlayIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M5 3l14 9-14 9V3z"
        fill="rgba(255,255,255,0.9)"
        stroke="none"
      />
    </Svg>
  )
}

function PauseIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M6 4h4v16H6V4zM14 4h4v16h-4V4z"
        fill="rgba(255,255,255,0.9)"
        stroke="none"
      />
    </Svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────

export default function VideoPlayerScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    videoUrl: string
    title?: string
  }>()

  const { videoUrl, title } = params

  const [isLooping, setIsLooping] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [progress, setProgress] = useState(0)
  const [currentTimeStr, setCurrentTimeStr] = useState('0:00')
  const [durationStr, setDurationStr] = useState('0:00')

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Create expo-video player
  const player = useVideoPlayer(videoUrl ?? '', (p) => {
    p.loop = true
    p.play()
  })

  // Track playing state via expo event
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  })

  // Poll for progress (expo-video doesn't have continuous time updates like expo-av)
  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      if (player.duration > 0) {
        const current = player.currentTime
        const total = player.duration
        setProgress(current / total)
        setCurrentTimeStr(formatTime(current))
        setDurationStr(formatTime(total))
      }
    }, 250)

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [player])

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (showControls && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [showControls, isPlaying])

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      player.pause()
    } else {
      player.play()
    }
  }, [isPlaying, player])

  const toggleControls = useCallback(() => {
    setShowControls((prev) => !prev)
  }, [])

  const toggleLoop = useCallback(() => {
    const newLoop = !isLooping
    setIsLooping(newLoop)
    player.loop = newLoop
  }, [isLooping, player])

  const handleSave = useCallback(async () => {
    if (!videoUrl) return
    setIsSaving(true)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Allow photo library access to save videos.')
        return
      }
      const filename = `video_${Date.now()}.mp4`
      const fileUri = `${FileSystem.cacheDirectory}${filename}`
      const download = await FileSystem.downloadAsync(videoUrl, fileUri)
      await MediaLibrary.saveToLibraryAsync(download.uri)
      Alert.alert('Saved', 'Video saved to your photo library.')
    } catch {
      Alert.alert('Error', 'Failed to save video.')
    } finally {
      setIsSaving(false)
    }
  }, [videoUrl])

  const handleShare = useCallback(async () => {
    if (!videoUrl) return
    try {
      if (Platform.OS === 'ios') {
        const filename = `video_${Date.now()}.mp4`
        const fileUri = `${FileSystem.cacheDirectory}${filename}`
        await FileSystem.downloadAsync(videoUrl, fileUri)
        await Share.share({ url: fileUri })
      } else {
        await Share.share({ message: videoUrl })
      }
    } catch {
      // User cancelled or share failed
    }
  }, [videoUrl])

  if (!videoUrl) {
    router.back()
    return null
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Video */}
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={toggleControls}
        activeOpacity={1}
      >
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
        />

        {/* Controls overlay */}
        {showControls && (
          <View style={styles.controlsOverlay}>
            {/* Header */}
            <SafeAreaView edges={['top']} style={styles.topBar}>
              <TouchableOpacity
                style={styles.topButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <CloseIcon />
              </TouchableOpacity>
              <Text style={styles.topTitle} numberOfLines={1}>
                {title || 'Video'}
              </Text>
              <TouchableOpacity
                style={[styles.topButton, isLooping && styles.topButtonActive]}
                onPress={toggleLoop}
                activeOpacity={0.7}
              >
                <LoopIcon active={isLooping} />
              </TouchableOpacity>
            </SafeAreaView>

            {/* Center play/pause */}
            <TouchableOpacity
              style={styles.centerControl}
              onPress={togglePlayPause}
              activeOpacity={0.7}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </TouchableOpacity>

            {/* Bottom bar */}
            <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
              {/* Progress bar */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]}>
                  <LinearGradient
                    colors={[AURORA_MAGENTA, '#9333EA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{currentTimeStr}</Text>
                <Text style={styles.timeText}>{durationStr}</Text>
              </View>

              {/* Action buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <SaveIcon />
                  )}
                  <Text style={styles.actionText}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                  activeOpacity={0.7}
                >
                  <ShareIcon />
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        )}
      </TouchableOpacity>

      {/* Saving overlay */}
      {isSaving && !showControls && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={styles.savingText}>Saving to Photos...</Text>
        </View>
      )}
    </View>
  )
}

function formatTime(seconds: number) {
  const totalSeconds = Math.floor(seconds)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: SCREEN_W,
    height: SCREEN_H,
  },

  // Controls overlay
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'space-between',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  topButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topButtonActive: {
    backgroundColor: 'rgba(235,150,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(235,150,255,0.4)',
  },
  topTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Center play/pause
  centerControl: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // Progress bar
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },

  // Action buttons
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingBottom: 8,
  },
  actionButton: {
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Saving overlay
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
