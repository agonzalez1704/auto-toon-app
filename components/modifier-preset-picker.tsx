import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path as SvgPath } from 'react-native-svg'
import { useModifierPreview, type CanvasSubject, type ModifierKind } from '@/lib/hooks/use-modifier-preview'
import { NodeTutorialSheet, type TutorialItem } from '@/components/node-tutorial-sheet'
import type { PromptPreset } from '@/stores/use-fashion-editorial-store'

const { width: SCREEN_W } = Dimensions.get('window')
const BG = '#193153'
const ACCENT = '#FBBF24'
const MUTED = 'rgba(255,255,255,0.55)'
const CARD_BG = 'rgba(255,255,255,0.05)'
const CARD_BORDER = 'rgba(255,255,255,0.08)'

const COLS = 2
const GAP = 12
const CELL_W = (SCREEN_W - 32 - GAP) / COLS

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M19 12H5M12 19l-7-7 7-7" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

function SparkleIcon({ color = '#FFFFFF' }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" fill={color} />
    </Svg>
  )
}

interface PresetTileProps {
  preset: PromptPreset
  selected: boolean
  kind: ModifierKind
  subject?: CanvasSubject
  onPress: () => void
}

function PresetTile({ preset, selected, kind, subject, onPress }: PresetTileProps) {
  const [cachedUrl, setCachedUrl] = useState<string | undefined>(undefined)

  // Best-effort load: only the most-specific cache key (without subject) so tiles are quick to populate
  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(`fe-preview-${kind}-${preset.id}`)
      .then((v) => { if (!cancelled && v) setCachedUrl(v) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [kind, preset.id])

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.tile, selected && styles.tileSelected]}
    >
      <View style={styles.tileImage}>
        {cachedUrl ? (
          <Image source={{ uri: cachedUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View style={styles.tilePlaceholder}>
            <SparkleIcon color="rgba(255,255,255,0.25)" />
            <Text style={styles.tilePlaceholderText}>Tap to generate</Text>
          </View>
        )}
      </View>
      <View style={styles.tileMeta}>
        <Text style={styles.tileLabel} numberOfLines={1}>{preset.label}</Text>
        <Text style={styles.tileDesc} numberOfLines={2}>{preset.description}</Text>
      </View>
      {selected && (
        <View style={styles.tileCheck}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <SvgPath d="M5 13l4 4L19 7" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      )}
    </TouchableOpacity>
  )
}

interface Props {
  title: string
  intro: string
  tutorialStorageKey: string
  kind: ModifierKind
  presets: PromptPreset[]
  value: string | null
  customValue: string
  onChange: (v: string | null) => void
  onCustomChange: (v: string) => void
  subject?: CanvasSubject
}

export function ModifierPresetPicker({
  title,
  intro,
  tutorialStorageKey,
  kind,
  presets,
  value,
  customValue,
  onChange,
  onCustomChange,
  subject,
}: Props) {
  const router = useRouter()
  const selectedPreset = presets.find((p) => p.id === value)
  const promptForPreview = value === 'custom' ? customValue : selectedPreset?.prompt

  const { url, generating, error, generate, clear } = useModifierPreview(
    kind,
    value || undefined,
    promptForPreview,
    subject,
  )

  const handleSelect = useCallback(
    (id: string) => {
      onChange(value === id ? null : id)
    },
    [value, onChange],
  )

  const tutorialItems: TutorialItem[] = presets.map((p) => ({
    label: p.label,
    description: p.description,
  }))

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <NodeTutorialSheet
        storageKey={tutorialStorageKey}
        title={title}
        intro={intro}
        items={tutorialItems}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerBtnSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Pick a preset</Text>
          <Text style={styles.sectionSub}>{intro}</Text>

          <View style={styles.grid}>
            {presets.map((p) => (
              <PresetTile
                key={p.id}
                preset={p}
                selected={value === p.id}
                kind={kind}
                subject={subject}
                onPress={() => handleSelect(p.id)}
              />
            ))}
            <TouchableOpacity
              onPress={() => onChange(value === 'custom' ? null : 'custom')}
              activeOpacity={0.85}
              style={[styles.tile, value === 'custom' && styles.tileSelected]}
            >
              <View style={styles.tileImage}>
                <View style={styles.tilePlaceholder}>
                  <Text style={styles.tileCustom}>+</Text>
                  <Text style={styles.tilePlaceholderText}>Custom</Text>
                </View>
              </View>
              <View style={styles.tileMeta}>
                <Text style={styles.tileLabel}>Custom</Text>
                <Text style={styles.tileDesc} numberOfLines={2}>Free-form description</Text>
              </View>
            </TouchableOpacity>
          </View>

          {value === 'custom' && (
            <View style={styles.customWrap}>
              <Text style={styles.customLabel}>Custom direction</Text>
              <TextInput
                style={styles.customInput}
                value={customValue}
                onChangeText={onCustomChange}
                placeholder="Describe in your own words..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
              />
            </View>
          )}

          {/* Preview for selected */}
          {value && (
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>AI Preview</Text>
              {url ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: url }} style={styles.previewImage} contentFit="cover" />
                  <TouchableOpacity style={styles.regenBtn} onPress={clear} activeOpacity={0.7}>
                    <Text style={styles.regenText}>Regen</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={generate}
                  disabled={generating || !promptForPreview}
                  activeOpacity={0.85}
                >
                  {generating ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <SparkleIcon color={ACCENT} />
                  )}
                  <Text style={styles.generateText}>
                    {generating ? 'Generating preview…' : 'Generate preview'}
                  </Text>
                </TouchableOpacity>
              )}
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#FBBF24', '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerBtnSpacer: { width: 40 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  sectionSub: { fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 17 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { width: CELL_W, borderRadius: 14, overflow: 'hidden', backgroundColor: CARD_BG, borderWidth: 2, borderColor: 'transparent' },
  tileSelected: { borderColor: ACCENT },
  tileImage: { width: CELL_W, height: CELL_W, backgroundColor: 'rgba(255,255,255,0.04)' },
  tilePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6, padding: 12 },
  tilePlaceholderText: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  tileCustom: { fontSize: 28, color: 'rgba(255,255,255,0.3)' },
  tileMeta: { padding: 10, gap: 2 },
  tileLabel: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  tileDesc: { fontSize: 11, color: MUTED, lineHeight: 14 },
  tileCheck: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },

  customWrap: { marginTop: 16, gap: 6 },
  customLabel: { fontSize: 12, color: MUTED },
  customInput: { backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 12, padding: 12, color: '#FFFFFF', fontSize: 13, minHeight: 80, textAlignVertical: 'top' },

  previewSection: { marginTop: 20, gap: 8 },
  previewTitle: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  previewWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: CARD_BORDER, backgroundColor: 'rgba(0,0,0,0.3)' },
  previewImage: { width: '100%', aspectRatio: 1 },
  regenBtn: { position: 'absolute', bottom: 8, right: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.7)' },
  regenText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER, borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.03)' },
  generateText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  errorText: { fontSize: 11, color: '#EF4444' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 34, backgroundColor: 'rgba(15,15,19,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  doneBtn: { height: 50, borderRadius: 14, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  doneText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
})
