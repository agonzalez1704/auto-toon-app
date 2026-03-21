import { useState, useCallback } from 'react'
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
import { getAssets, deleteAsset, type Asset } from '@/lib/api'
import { queryKeys } from '@/lib/query'

const BRAND = '#8B5CF6'

type FilterType = 'all' | 'vignette' | 'elements' | 'poster' | '3x3'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'vignette', label: 'Vignette' },
  { value: 'elements', label: 'Elements' },
  { value: 'poster', label: 'Poster' },
  { value: '3x3', label: '3x3' },
]

export default function AssetsScreen() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterType>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.assets,
    queryFn: getAssets,
  })

  const filteredAssets = filter === 'all'
    ? assets
    : assets.filter((a) => a.secondImageType === filter)

  const handleDelete = useCallback(async (asset: Asset) => {
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
  }, [queryClient])

  const renderItem = useCallback(({ item }: { item: Asset }) => {
    const imageUrl = item.heroImageUrl || item.vignetteImageUrl
    if (!imageUrl) return null

    return (
      <TouchableOpacity
        style={styles.assetCard}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.assetImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.assetInfo}>
          <Text style={styles.assetName} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text style={styles.assetType}>
            {item.secondImageType === '3x3' ? '3x3 Grid' :
             item.secondImageType.charAt(0).toUpperCase() + item.secondImageType.slice(1)}
          </Text>
        </View>
        {deletingId === item.id && (
          <View style={styles.deleteOverlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    )
  }, [deletingId, handleDelete])

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Assets</Text>
        </View>

        {/* Filter Bar */}
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
                <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={BRAND} size="large" />
          </View>
        ) : filteredAssets.length === 0 ? (
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
        ) : (
          <FlatList
            data={filteredAssets}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={BRAND} />
            }
          />
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  safeArea: { flex: 1 },

  // Header
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Filters
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
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
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },

  // List
  list: {
    padding: 12,
    paddingBottom: 40,
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

  // Empty
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
