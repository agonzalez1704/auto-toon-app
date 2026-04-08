import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import Svg, { Path as SvgPath } from 'react-native-svg'

import { upscaleGrid } from '@/lib/api'
import { queryKeys } from '@/lib/query'
import { useCreditsStore } from '@/stores/use-credits-store'

const BRAND = '#8B5CF6'
const CREDITS_PER_CELL = 3
const { width: SCREEN_W } = Dimensions.get('window')

// ─── SVG Icons ──────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M20 6L9 17l-5-5"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

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

function UpscaleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Grid Cell ──────────────────────────────────────────────────────────

function GridCell({
  index,
  isSelected,
  onToggle,
}: {
  index: number
  isSelected: boolean
  onToggle: (i: number) => void
}) {
  const row = Math.floor(index / 3)
  const col = index % 3

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onToggle(index)}
      style={[
        styles.gridCell,
        {
          top: `${(row / 3) * 100}%`,
          left: `${(col / 3) * 100}%`,
          width: '33.333%',
          height: '33.333%',
        },
        isSelected && styles.gridCellSelected,
      ]}
    >
      {isSelected && (
        <View style={styles.checkBadge}>
          <CheckIcon />
        </View>
      )}
      <View style={styles.cellNumber}>
        <Text style={styles.cellNumberText}>{index + 1}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────────

export default function GridUpscaleScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useLocalSearchParams<{
    imageUrl: string
    productName: string
    aspectRatio?: string
  }>()

  const { imageUrl, productName, aspectRatio = '2:3' } = params
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [isUpscaling, setIsUpscaling] = useState(false)

  const { setCredits } = useCreditsStore()

  const toggleIndex = useCallback((index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }, [])

  const handleUpscale = useCallback(async () => {
    if (selectedIndices.length === 0 || !imageUrl) return

    setIsUpscaling(true)
    try {
      const result = await upscaleGrid(
        imageUrl,
        selectedIndices.map((i) => i + 1),
        productName || 'Product',
        aspectRatio
      )

      if (result.success && result.urls?.length > 0) {
        if (result.creditsRemaining !== undefined) {
          setCredits(result.creditsRemaining)
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.assets })
        // Close this modal and open image viewer with results
        router.back()
        setTimeout(() => {
          router.push({
            pathname: '/image-viewer',
            params: {
              urls: JSON.stringify(result.urls),
              title: productName || 'Upscaled',
            },
          })
        }, 300)
      } else if (result.error === 'INSUFFICIENT_CREDITS') {
        useCreditsStore.getState().setShowExhaustionModal(true)
      } else {
        Alert.alert('Error', result.error || 'Failed to upscale images')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      Alert.alert('Error', message)
    } finally {
      setIsUpscaling(false)
    }
  }, [selectedIndices, imageUrl, productName, aspectRatio, setCredits, queryClient, router])

  const currentCost = selectedIndices.length * CREDITS_PER_CELL

  const [arW, arH] = aspectRatio.split(':').map(Number)
  const imageAspect = (arW || 2) / (arH || 3)
  const imageWidth = SCREEN_W - 32
  const imageHeight = imageWidth / imageAspect

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <CloseIcon />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {productName || 'Grid Upscale'}
            </Text>
            <Text style={styles.headerSubtitle}>
              Select cells to upscale
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Grid Image + Overlay */}
        <View style={styles.imageContainer}>
          <View
            style={[
              styles.imageWrapper,
              { width: imageWidth, height: imageHeight },
            ]}
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.gridImage}
              contentFit="cover"
              transition={300}
            />
            {Array.from({ length: 9 }).map((_, i) => (
              <GridCell
                key={i}
                index={i}
                isSelected={selectedIndices.includes(i)}
                onToggle={toggleIndex}
              />
            ))}
          </View>
        </View>

        {/* Bottom Action Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomInfo}>
            {selectedIndices.length > 0 ? (
              <>
                <Text style={styles.selectedCount}>
                  {selectedIndices.length} selected
                </Text>
                <Text style={styles.costText}>
                  {currentCost} credits
                </Text>
              </>
            ) : (
              <Text style={styles.hintText}>
                Tap cells to select
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.upscaleButton,
              (selectedIndices.length === 0 || isUpscaling) &&
                styles.upscaleButtonDisabled,
            ]}
            onPress={handleUpscale}
            disabled={selectedIndices.length === 0 || isUpscaling}
            activeOpacity={0.7}
          >
            {isUpscaling ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <UpscaleIcon />
            )}
            <Text style={styles.upscaleButtonText}>
              {isUpscaling ? 'Upscaling...' : 'Upscale'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#193153',
  },
  safeArea: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },

  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },

  gridCell: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCellSelected: {
    backgroundColor: 'rgba(59,130,246,0.25)',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellNumber: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cellNumberText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    fontVariant: ['tabular-nums'],
  },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,15,20,0.95)',
  },
  bottomInfo: {
    flex: 1,
  },
  selectedCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  costText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  hintText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
  },
  upscaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  upscaleButtonDisabled: {
    opacity: 0.4,
  },
  upscaleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
