import { useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path as SvgPath } from 'react-native-svg'
import { useModelFactoryStore } from '@/stores/use-model-factory-store'
import {
  useFashionEditorialStore,
  STYLE_PRESETS,
  BACKGROUND_PRESETS,
  type PresetOption,
} from '@/stores/use-fashion-editorial-store'
import { CONFIG } from '@/lib/config'

const { width: SCREEN_W } = Dimensions.get('window')
const BG = '#0F0F13'
const ACCENT = '#EB96FF'
const TEAL = '#0B5777'
const MUTED = 'rgba(255,255,255,0.45)'
const CARD_BG = 'rgba(255,255,255,0.05)'
const CARD_BORDER = 'rgba(255,255,255,0.08)'

const MODEL_CARD_W = (SCREEN_W - 40 - 12) / 2
const PRESET_CARD_W = 110
const PRESET_CARD_H = 140

// ─── Icons ─────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function PlusIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M12 5v14M5 12h14" stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  )
}

function ArrowRightIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M5 12h14M13 6l6 6-6 6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Preset Card ───────────────────────────────────────────────────

function PresetCard({
  item,
  selected,
  onPress,
}: {
  item: PresetOption
  selected: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.presetCard, selected && styles.presetCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: `${CONFIG.API_BASE_URL}/previews/${item.preview}` }}
        style={styles.presetImage}
        contentFit="cover"
        transition={200}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.presetOverlay}
      />
      <Text style={styles.presetLabel}>{item.label}</Text>
      {selected && <View style={styles.presetCheck} />}
    </TouchableOpacity>
  )
}

// ─── Main Screen ───────────────────────────────────────────────────

export default function ModelSelectorScreen() {
  const router = useRouter()
  const savedModels = useModelFactoryStore((s) => s.savedModels)
  const store = useFashionEditorialStore()

  const handleSelectModel = useCallback(
    (id: string, imageUrl: string) => {
      if (store.selectedModelId === id) {
        store.clearModel()
      } else {
        store.selectModel(id, imageUrl)
      }
    },
    [store]
  )

  const handleContinue = useCallback(() => {
    if (!store.selectedModelId) return
    router.push('/fashion-editorial/clothing')
  }, [store.selectedModelId, router])

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => { store.reset(); router.back() }}
            activeOpacity={0.7}
          >
            <CloseIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fashion Editorial</Text>
          <View style={styles.headerBtnSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Model Selection ── */}
          <Text style={styles.sectionTitle}>Select Model</Text>
          <Text style={styles.sectionSub}>Choose your AI model for the photoshoot</Text>

          <View style={styles.modelGrid}>
            {savedModels.map((m) => {
              const selected = store.selectedModelId === m.id
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modelCard, selected && styles.modelCardSelected]}
                  onPress={() => handleSelectModel(m.id, m.imageUrl)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: m.imageUrl }} style={styles.modelImage} contentFit="cover" transition={200} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.modelOverlay} />
                  <Text style={styles.modelName} numberOfLines={1}>{m.name}</Text>
                  {selected && (
                    <View style={styles.modelSelectedBadge}>
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <SvgPath d="M5 13l4 4L19 7" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}

            {/* Create New */}
            <TouchableOpacity
              style={styles.modelCardEmpty}
              onPress={() => router.push('/model-wizard')}
              activeOpacity={0.7}
            >
              <PlusIcon />
              <Text style={styles.modelEmptyText}>Create New</Text>
            </TouchableOpacity>
          </View>

          {/* ── Style Preset ── */}
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Style</Text>
          <Text style={styles.sectionSub}>Set the photography style</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
            {STYLE_PRESETS.map((item) => (
              <PresetCard
                key={item.id}
                item={item}
                selected={store.stylePreset === item.id}
                onPress={() => store.setStylePreset(item.id)}
              />
            ))}
          </ScrollView>

          {/* ── Background Preset ── */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Background</Text>
          <Text style={styles.sectionSub}>Choose the scene</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
            {BACKGROUND_PRESETS.map((item) => (
              <PresetCard
                key={item.id}
                item={item}
                selected={store.backgroundPreset === item.id}
                onPress={() => store.setBackgroundPreset(item.id)}
              />
            ))}
          </ScrollView>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Bottom Continue ── */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.continueBtn, !store.selectedModelId && styles.continueBtnDisabled]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={!store.selectedModelId}
          >
            <LinearGradient colors={[ACCENT, '#9333EA', TEAL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
            <Text style={styles.continueBtnText}>Continue</Text>
            <ArrowRightIcon />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  scrollContent: { padding: 20 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerBtnSpacer: { width: 40 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },

  // Section labels
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  sectionSub: { fontSize: 13, color: MUTED, marginBottom: 14 },

  // Model grid
  modelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  modelCard: {
    width: MODEL_CARD_W,
    height: MODEL_CARD_W * 1.3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modelCardSelected: { borderColor: ACCENT },
  modelImage: { width: '100%', height: '100%' },
  modelOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  modelName: { position: 'absolute', bottom: 10, left: 12, right: 12, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  modelSelectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelCardEmpty: {
    width: MODEL_CARD_W,
    height: MODEL_CARD_W * 1.3,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: CARD_BORDER,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CARD_BG,
  },
  modelEmptyText: { fontSize: 13, fontWeight: '600', color: ACCENT },

  // Preset cards
  presetRow: { gap: 10 },
  presetCard: {
    width: PRESET_CARD_W,
    height: PRESET_CARD_H,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: CARD_BG,
  },
  presetCardSelected: { borderColor: ACCENT },
  presetImage: { width: '100%', height: '100%' },
  presetOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 50 },
  presetLabel: { position: 'absolute', bottom: 8, left: 8, right: 8, fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  presetCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACCENT,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 34,
    backgroundColor: 'rgba(15,15,19,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
})
