import { useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import Svg, { Path as SvgPath, Circle } from 'react-native-svg'
import { useModelFactoryStore } from '@/stores/use-model-factory-store'
import type { SavedModel } from '@/lib/model-factory'

const { width: SCREEN_W } = Dimensions.get('window')
const GRID_GAP = 12
const GRID_COLS = 2
const CARD_W = (SCREEN_W - 32 - GRID_GAP) / GRID_COLS

const BRAND = '#8B5CF6'

function PlusIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 5v14M5 12h14"
        stroke="#FFFFFF"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function PersonIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="7" r="4" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} fill="none" />
      <SvgPath
        d="M5.5 21c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  )
}

export default function ModelsScreen() {
  const router = useRouter()
  const savedModels = useModelFactoryStore((s) => s.savedModels)
  const deleteModel = useModelFactoryStore((s) => s.deleteModel)
  const resetForNew = useModelFactoryStore((s) => s.resetForNew)

  const handleNewModel = useCallback(() => {
    resetForNew()
    router.push('/model-wizard')
  }, [resetForNew, router])

  const handleModelPress = useCallback(
    (model: SavedModel) => {
      router.push({
        pathname: '/model-result',
        params: {
          imageUrl: model.imageUrl,
          modelId: model.id,
          title: model.name,
        },
      })
    },
    [router]
  )

  const handleModelLongPress = useCallback(
    (model: SavedModel) => {
      Alert.alert(model.name, undefined, [
        {
          text: 'Regenerate',
          onPress: () => {
            resetForNew()
            router.push('/model-wizard')
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Delete Model', `Remove "${model.name}" from your gallery?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteModel(model.id) },
            ])
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ])
    },
    [resetForNew, deleteModel, router]
  )

  const renderItem = useCallback(
    ({ item }: { item: SavedModel }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleModelPress(item)}
        onLongPress={() => handleModelLongPress(item)}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.cardOverlay}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [handleModelPress, handleModelLongPress]
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Model Factory</Text>
          <TouchableOpacity
            style={styles.newButton}
            onPress={handleNewModel}
            activeOpacity={0.7}
          >
            <PlusIcon />
            <Text style={styles.newButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        {savedModels.length === 0 ? (
          /* Empty state */
          <View style={styles.emptyContainer}>
            <PersonIcon />
            <Text style={styles.emptyTitle}>No models yet</Text>
            <Text style={styles.emptyDescription}>
              Create your first AI fashion model with full customization — face, body, style, and more.
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleNewModel}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaText}>Create Your First Model</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Gallery */
          <FlatList
            data={savedModels}
            numColumns={GRID_COLS}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
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
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  ctaButton: {
    marginTop: 24,
    backgroundColor: BRAND,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Gallery grid
  gridContent: {
    padding: 16,
    paddingBottom: 100,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  card: {
    width: CARD_W,
    height: CARD_W * 1.3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
