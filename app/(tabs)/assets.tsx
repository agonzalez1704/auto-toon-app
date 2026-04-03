import { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import Svg, { Path as SvgPath } from 'react-native-svg'
import { getAssets, getUserVideos, deleteAsset, type Asset, type VideoGeneration } from '@/lib/api'
import { queryKeys } from '@/lib/query'

const AURORA_NAVY = '#193153'
const AURORA_MAGENTA = '#EB96FF'

type FilterType = 'all' | 'fashion_editorial' | 'vignette' | 'elements' | 'poster' | '3x3' | 'food' | 'upscaled' | 'restored' | 'video'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'fashion_editorial', label: 'Fashion' },
  { value: 'video', label: 'Videos' },
  { value: 'restored', label: 'Restored' },
  { value: 'vignette', label: 'Vignette' },
  { value: 'elements', label: 'Elements' },
  { value: 'poster', label: 'Poster' },
  { value: '3x3', label: '3x3' },
  { value: 'food', label: 'Food' },
  { value: 'upscaled', label: 'Upscaled' },
]

const TYPE_LABELS: Record<string, string> = {
  vignette: 'Vignette',
  elements: 'Elements',
  poster: 'Poster',
  '3x3': '3x3 Grid',
  food: 'Food',
  upscale_batch: 'Upscaled',
  restore: 'Restored',
  none: 'Photo',
  video: 'Video',
  fashion_editorial: 'Fashion',
}

// A display item is either a regular asset, an individual image from an upscale_batch, or a video
interface DisplayItem {
  key: string
  imageUrl: string
  productName: string
  label: string
  isVideo?: boolean
  videoUrl?: string
  // For upscale_batch items: all URLs in the batch + index for swipe navigation
  batchUrls?: string[]
  batchIndex?: number
  // For regular assets: the asset for delete/navigation
  asset?: Asset
}

function UpscaleSmallIcon() {
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function PlaySmallIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M5 3l14 9-14 9V3z"
        fill="rgba(255,255,255,0.9)"
        stroke="none"
      />
    </Svg>
  )
}

export default function AssetsScreen() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: assets = [], isLoading: assetsLoading, refetch: refetchAssets } = useQuery({
    queryKey: queryKeys.assets,
    queryFn: getAssets,
  })

  const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: queryKeys.videos,
    queryFn: getUserVideos,
  })

  const isLoading = assetsLoading || videosLoading

  const refetch = useCallback(() => {
    refetchAssets()
    refetchVideos()
  }, [refetchAssets, refetchVideos])

  // Flatten assets + videos into display items
  const displayItems: DisplayItem[] = useMemo(() => {
    const items: DisplayItem[] = []

    // Add videos first
    for (const video of videos) {
      if (video.status === 'completed' && video.videoUrl) {
        items.push({
          key: `video_${video.id}`,
          imageUrl: video.sourceImageUrl,
          productName: video.motionPrompt ? `Video - ${video.motionPrompt.slice(0, 30)}` : 'Video',
          label: 'Video',
          isVideo: true,
          videoUrl: video.videoUrl,
        })
      }
    }

    // Add assets
    for (const asset of assets) {
      if (asset.secondImageType === 'upscale_batch' && asset.upscaledUrls?.length > 0) {
        for (let i = 0; i < asset.upscaledUrls.length; i++) {
          items.push({
            key: `${asset.id}_upscaled_${i}`,
            imageUrl: asset.upscaledUrls[i],
            productName: asset.productName,
            label: 'Upscaled',
            batchUrls: asset.upscaledUrls,
            batchIndex: i,
            asset,
          })
        }
      } else {
        const imageUrl = asset.heroImageUrl || asset.vignetteImageUrl
        if (imageUrl) {
          items.push({
            key: asset.id,
            imageUrl,
            productName: asset.productName,
            label: TYPE_LABELS[asset.secondImageType] ?? asset.secondImageType.charAt(0).toUpperCase() + asset.secondImageType.slice(1).replace(/_/g, ' '),
            asset,
          })
        }
      }
    }
    return items
  }, [assets, videos])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return displayItems
    if (filter === 'video') return displayItems.filter((d) => d.isVideo)
    if (filter === 'upscaled') return displayItems.filter((d) => !!d.batchUrls)
    if (filter === 'restored') return displayItems.filter((d) => d.asset?.secondImageType === 'restore')
    if (filter === 'fashion_editorial') return displayItems.filter((d) => d.asset?.secondImageType === 'fashion_editorial')
    return displayItems.filter(
      (d) => !d.batchUrls && !d.isVideo && d.asset?.secondImageType === filter
    )
  }, [displayItems, filter])

  const handleDelete = useCallback(
    async (asset: Asset) => {
      Alert.alert(
        'Delete Asset',
        `Delete "${asset.productName}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setDeletingId(asset.id)
              try {
                await deleteAsset(asset.id)
                queryClient.invalidateQueries({ queryKey: queryKeys.assets })
              } catch {
                Alert.alert('Error', 'Failed to delete asset')
              } finally {
                setDeletingId(null)
              }
            },
          },
        ]
      )
    },
    [queryClient]
  )

  const handlePress = useCallback(
    (item: DisplayItem) => {
      if (item.isVideo && item.videoUrl) {
        router.push({
          pathname: '/video-player',
          params: {
            videoUrl: item.videoUrl,
            title: item.productName,
          },
        })
      } else if (item.batchUrls) {
        router.push({
          pathname: '/image-viewer',
          params: {
            urls: JSON.stringify(item.batchUrls),
            initialIndex: String(item.batchIndex ?? 0),
            title: item.productName,
            assetType: 'upscale_batch',
          },
        })
      } else if (item.asset?.secondImageType === 'restore' && item.asset.originalImageUrl) {
        router.push({
          pathname: '/restore-viewer',
          params: {
            beforeUrl: item.asset.originalImageUrl,
            afterUrl: item.imageUrl,
            title: item.productName,
          },
        })
      } else if (item.asset?.secondImageType === '3x3') {
        router.push({
          pathname: '/grid-upscale',
          params: {
            imageUrl: item.imageUrl,
            productName: item.productName,
            aspectRatio: '2:3',
          },
        })
      } else if (item.asset) {
        router.push({
          pathname: '/image-viewer',
          params: {
            urls: JSON.stringify([item.imageUrl]),
            title: item.productName,
            assetType: item.asset.secondImageType || '',
          },
        })
      }
    },
    [router]
  )

  const renderItem = useCallback(
    ({ item }: { item: DisplayItem }) => {
      const isDeleting = item.asset && deletingId === item.asset.id

      return (
        <TouchableOpacity
          style={styles.assetCard}
          onPress={() => handlePress(item)}
          onLongPress={() => item.asset && handleDelete(item.asset)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.assetImage}
            contentFit="cover"
            transition={200}
          />
          {item.batchUrls && (
            <View style={styles.upscaleBadge}>
              <UpscaleSmallIcon />
            </View>
          )}
          {item.isVideo && (
            <View style={styles.videoBadge}>
              <PlaySmallIcon />
            </View>
          )}
          <View style={styles.assetInfo}>
            <Text style={styles.assetName} numberOfLines={1}>
              {item.productName}
            </Text>
            <Text style={styles.assetType}>{item.label}</Text>
          </View>
          {isDeleting && (
            <View style={styles.deleteOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      )
    },
    [deletingId, handleDelete, handlePress]
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Assets</Text>
        </View>

        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.filterBar}>
              {FILTERS.map((f) => {
                const isActive = filter === f.value
                return (
                  <TouchableOpacity
                    key={f.value}
                    style={[
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                    ]}
                    onPress={() => setFilter(f.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterLabel,
                        isActive && styles.filterLabelActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={AURORA_MAGENTA} size="large" />
              </View>
            ) : (
              <View style={styles.centered}>
                <Text style={styles.emptyTitle}>
                  {filter === 'all' ? 'No assets yet' : 'No matching assets'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {filter === 'all'
                    ? 'Generate your first product image to see it here.'
                    : 'Try a different filter.'}
                </Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={AURORA_MAGENTA}
            />
          }
        />
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AURORA_NAVY,
  },
  safeArea: { flex: 1 },

  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(235,150,255,0.15)',
    borderColor: AURORA_MAGENTA,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },

  list: {
    padding: 12,
    paddingBottom: 100,
  },
  row: {
    gap: 10,
    marginBottom: 10,
  },
  assetCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  assetImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  upscaleBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(235,150,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2,
  },
  assetInfo: {
    padding: 12,
  },
  assetName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  assetType: {
    fontSize: 11,
    marginTop: 2,
    color: 'rgba(255,255,255,0.45)',
  },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: 'rgba(255,255,255,0.7)',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
  },
})
