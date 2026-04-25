/**
 * MjCameraLook — one-decision "Pick a Look" picker.
 *
 * Primary UI: horizontal row of 9 curated preset cards + "Auto" + "Custom".
 * One tap applies camera + film + lighting + time + weather + shot + director
 * all at once. Advanced controls live behind "Customize" for power users.
 */
import { useMemo, useState } from 'react'
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import {
  MJ_KITS,
  countMjKitSelections,
  findKitOption,
  type MjKitKey,
  type MjKitOption,
  type MjPhotoKitSelection,
} from '@/lib/mj-photo-kit'
import { MJ_LOOKS, matchMjLook, type MjLook } from '@/lib/mj-looks'
import { MjPickerSheet } from './mj-picker-sheet'

// ─── Theme ────────────────────────────────────────────────────────

const CYAN = '#06B6D4'
const AMBER = '#FBBF24'
const MUTED = 'rgba(255,255,255,0.55)'
const CARD_BG = 'rgba(255,255,255,0.035)'
const CARD_BORDER = 'rgba(255,255,255,0.06)'
const CHIP_BG = 'rgba(255,255,255,0.04)'
const CHIP_BORDER = 'rgba(255,255,255,0.08)'

// ─── Advanced rows config ────────────────────────────────────────

type RowDef = {
  key: MjKitKey
  label: string
  sheetTitle: string
  sheetSubtitle?: string
}

const ADVANCED_ROWS: RowDef[] = [
  { key: 'photoType', label: 'Photo type',  sheetTitle: 'Photo type' },
  { key: 'shotAngle', label: 'Shot',        sheetTitle: 'Shot & framing' },
  { key: 'lighting',  label: 'Lighting',    sheetTitle: 'Lighting',   sheetSubtitle: 'The biggest mood lever' },
  { key: 'timeOfDay', label: 'Time',        sheetTitle: 'Time of day' },
  { key: 'weather',   label: 'Weather',     sheetTitle: 'Weather & atmosphere' },
  { key: 'camera',    label: 'Camera',      sheetTitle: 'Camera',     sheetSubtitle: 'Body only; film grain is separate' },
  { key: 'filmStock', label: 'Film',        sheetTitle: 'Film stock', sheetSubtitle: 'Leave blank for clean digital' },
  { key: 'director',  label: 'Inspired by', sheetTitle: 'Inspired by' },
]

// ─── Props ──────────────────────────────────────────────────────

export interface MjCameraLookProps {
  value: MjPhotoKitSelection
  onChange: (v: MjPhotoKitSelection) => void
}

export function MjCameraLook({ value, onChange }: MjCameraLookProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [openKey, setOpenKey] = useState<MjKitKey | null>(null)

  const selectedCount = countMjKitSelections(value)
  const activeLook = useMemo(() => matchMjLook(value), [value])
  const isAuto = selectedCount === 0
  const isCustom = !isAuto && !activeLook

  const tapLook = (look: MjLook | null) => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync().catch(() => {})
    }
    if (!look) {
      // Auto = clear everything
      onChange({})
      return
    }
    onChange({ ...look.photoKit })
  }

  const tapCustom = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync().catch(() => {})
    }
    setShowCustom(!showCustom)
  }

  const setAdvanced = (key: MjKitKey, id: string) => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync().catch(() => {})
    }
    onChange({ ...value, [key]: id === 'none' ? undefined : id })
  }

  const openRow = openKey ? ADVANCED_ROWS.find((r) => r.key === openKey) ?? null : null

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pick a look</Text>
        <Text style={styles.subtitle}>
          We'll handle the camera, lighting, and mood
        </Text>
      </View>

      {/* Look cards — horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.looksRow}
        decelerationRate="fast"
        snapToAlignment="start"
      >
        {/* Auto */}
        <TouchableOpacity
          style={[styles.autoCard, isAuto && styles.cardActive]}
          onPress={() => tapLook(null)}
          activeOpacity={0.8}
          accessibilityLabel="Auto — let AI decide the look"
          accessibilityRole="button"
          accessibilityState={{ selected: isAuto }}
        >
          <Text style={styles.autoBadge}>✨</Text>
          <Text style={[styles.cardTitle, isAuto && styles.cardTitleActive]}>Auto</Text>
          <Text style={styles.cardVibe} numberOfLines={2}>
            Let AI pick the vibe
          </Text>
        </TouchableOpacity>

        {/* Preset looks */}
        {MJ_LOOKS.map((look) => {
          const active = activeLook?.id === look.id
          return (
            <TouchableOpacity
              key={look.id}
              onPress={() => tapLook(look)}
              activeOpacity={0.8}
              accessibilityLabel={`${look.name} — ${look.vibe}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.lookCard, active && styles.cardActive]}
            >
              <LinearGradient
                colors={look.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              />
              <View style={styles.lookOverlay}>
                <Text style={[styles.cardTitle, styles.lookCardTitle]} numberOfLines={1}>
                  {look.name}
                </Text>
                <Text style={styles.lookCardVibe} numberOfLines={2}>
                  {look.vibe}
                </Text>
              </View>
              {active && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkBadgeTxt}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}

        {/* Custom */}
        <TouchableOpacity
          style={[styles.customCard, (isCustom || showCustom) && styles.cardActive]}
          onPress={tapCustom}
          activeOpacity={0.8}
          accessibilityLabel="Custom — customize the look yourself"
          accessibilityRole="button"
          accessibilityState={{ selected: isCustom || showCustom }}
        >
          <Text style={styles.customBadge}>⚙</Text>
          <Text style={[styles.cardTitle, (isCustom || showCustom) && styles.cardTitleActive]}>
            Custom
          </Text>
          <Text style={styles.cardVibe} numberOfLines={2}>
            {isCustom ? `${selectedCount} set` : 'Pick each setting'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Advanced — tucked away, only shown when Custom is tapped */}
      {showCustom && (
        <View style={styles.advanced}>
          <View style={styles.advancedHeader}>
            <Text style={styles.advancedTitle}>Customize each dimension</Text>
            {selectedCount > 0 && (
              <TouchableOpacity
                onPress={() => tapLook(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Reset all selections"
                accessibilityRole="button"
              >
                <Text style={styles.advancedReset}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.advancedRows}>
            {ADVANCED_ROWS.map((row) => {
              const options = MJ_KITS[row.key] as readonly MjKitOption[]
              const selected = findKitOption(row.key, value[row.key])
              return (
                <TouchableOpacity
                  key={row.key}
                  onPress={() => setOpenKey(row.key)}
                  style={styles.advancedRow}
                  activeOpacity={0.7}
                  accessibilityLabel={`${row.label}${selected ? `: ${selected.label}` : ': not set'}`}
                  accessibilityHint={`Opens ${options.length} options`}
                  accessibilityRole="button"
                >
                  <Text style={styles.advancedRowLabel}>{row.label}</Text>
                  <View style={styles.advancedRowRight}>
                    <Text
                      style={[
                        styles.advancedRowValue,
                        !selected && styles.advancedRowValueEmpty,
                      ]}
                      numberOfLines={1}
                    >
                      {selected ? selected.label : 'Auto'}
                    </Text>
                    <Text style={styles.advancedRowChevron}>›</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      {/* Advanced sheet */}
      {openRow && (
        <MjPickerSheet
          visible={!!openKey}
          title={openRow.sheetTitle}
          subtitle={openRow.sheetSubtitle}
          options={[...MJ_KITS[openRow.key]]}
          selectedId={value[openRow.key]}
          onSelect={(id) => setAdvanced(openRow.key, id)}
          onClose={() => setOpenKey(null)}
        />
      )}
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────

const CARD_W = 132
const CARD_H = 150
const SMALL_CARD_W = 108

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },

  // Header
  header: {
    paddingHorizontal: 2,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    color: MUTED,
  },

  // Look row
  looksRow: {
    gap: 10,
    paddingVertical: 2,
    paddingRight: 14,
  },

  // Preset card (gradient)
  lookCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  lookOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    paddingTop: 40,
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 2,
  },
  lookCardTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  lookCardVibe: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 14,
  },

  // Auto / Custom cards (flat, no gradient)
  autoCard: {
    width: SMALL_CARD_W,
    height: CARD_H,
    borderRadius: 16,
    backgroundColor: 'rgba(6,182,212,0.08)',
    borderWidth: 2,
    borderColor: CHIP_BORDER,
    padding: 12,
    justifyContent: 'flex-end',
    gap: 4,
  },
  customCard: {
    width: SMALL_CARD_W,
    height: CARD_H,
    borderRadius: 16,
    backgroundColor: 'rgba(251,191,36,0.06)',
    borderWidth: 2,
    borderColor: CHIP_BORDER,
    padding: 12,
    justifyContent: 'flex-end',
    gap: 4,
  },
  autoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    fontSize: 24,
  },
  customBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    fontSize: 22,
    color: AMBER,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardTitleActive: {
    color: CYAN,
  },
  cardVibe: {
    fontSize: 11,
    color: MUTED,
    lineHeight: 14,
  },

  cardActive: {
    borderColor: CYAN,
  },

  // Check badge on active preset
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: CYAN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  checkBadgeTxt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // Advanced (hidden by default)
  advanced: {
    marginTop: 6,
    padding: 14,
    borderRadius: 14,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    gap: 10,
  },
  advancedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  advancedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: AMBER,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  advancedReset: {
    fontSize: 12,
    fontWeight: '600',
    color: AMBER,
  },
  advancedRows: {
    gap: 2,
  },
  advancedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  advancedRowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  advancedRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '60%',
  },
  advancedRowValue: {
    fontSize: 13,
    color: CYAN,
    fontWeight: '500',
  },
  advancedRowValueEmpty: {
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
  },
  advancedRowChevron: {
    fontSize: 20,
    color: MUTED,
    marginLeft: 4,
  },
})
