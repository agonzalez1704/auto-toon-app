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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Colors from '@/constants/Colors'
import { useThemeColors } from '@/lib/useThemeColors'
import { getAssets, deleteAsset, type Asset } from '@/lib/api'
import { queryKeys } from '@/lib/query'

type FilterType = 'all' | 'vignette' | 'elements' | 'poster' | '3x3'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'vignette', label: 'Vignette' },
  { value: 'elements', label: 'Elements' },
  { value: 'poster', label: 'Poster' },
  { value: '3x3', label: '3x3' },
]

export default function AssetsScreen() {
  const colors = useThemeColors()
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
            } catch (err) {
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
        style={[styles.assetCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
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
          <Text style={[styles.assetName, { color: colors.text }]} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text style={[styles.assetType, { color: colors.textSecondary }]}>
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
  }, [colors, deletingId, handleDelete])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollableFilters colors={colors} filter={filter} setFilter={setFilter} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.tint} size="large" />
        </View>
      ) : filteredAssets.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {filter === 'all' ? 'No assets yet' : 'No matching assets'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
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
            <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={colors.tint} />
          }
        />
      )}
    </SafeAreaView>
  )
}

function ScrollableFilters({
  colors,
  filter,
  setFilter,
}: {
  colors: (typeof Colors)['dark'] | (typeof Colors)['light']
  filter: FilterType
  setFilter: (f: FilterType) => void
}) {
  return (
    <View style={styles.filterRow}>
      {FILTERS.map((f) => {
        const isActive = filter === f.value
        return (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterChip,
              {
                backgroundColor: isActive ? Colors.brand : colors.surface,
                borderColor: isActive ? Colors.brand : colors.surfaceBorder,
              },
            ]}
            onPress={() => setFilter(f.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterLabel,
                { color: isActive ? '#fff' : colors.text },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { paddingHorizontal: 16, paddingVertical: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 13, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 40 },
  row: { gap: 10, marginBottom: 10 },
  assetCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  assetImage: { width: '100%', aspectRatio: 3 / 4 },
  assetInfo: { padding: 10 },
  assetName: { fontSize: 13, fontWeight: '600' },
  assetType: { fontSize: 11, marginTop: 2 },
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
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
})
