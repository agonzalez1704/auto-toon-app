/**
 * Midjourney V7 parameter controls — shown when MJ V7 is selected as the AI model.
 *
 * Supported params:
 *   --s   (stylize)    0–1000, default 100
 *   --c   (chaos)      0–100,  default 0
 *   --no  (negative)   free text
 *   --iw  (img weight) 0–2,    default 1 (img-to-img only)
 *   --sref (style ref) URL
 *   --seed             integer for reproducibility
 *   speed              draft | fast | turbo (API param, not prompt flag)
 */
import { useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, { Path as SvgPath } from 'react-native-svg'
import type { MjPhotoKitSelection } from '@/lib/mj-photo-kit'
import { MjCameraLook } from './mj-camera-look'

// ─── Types ────────────────────────────────────────────────────────

export interface MjParams {
  stylize: number
  chaos: number
  negativePrompt: string
  imageWeight: number
  styleRefUrl: string
  seed: string
  speed: 'draft' | 'fast' | 'turbo'
  /** User-picked Camera & Look dimensions (photo type, lighting, film, etc.) */
  photoKit?: MjPhotoKitSelection
}

export const DEFAULT_MJ_PARAMS: MjParams = {
  stylize: 100,
  chaos: 0,
  negativePrompt: '',
  imageWeight: 1,
  styleRefUrl: '',
  seed: '',
  speed: 'fast',
  photoKit: {},
}

/** Convert MjParams into flags that get appended to the prompt string */
export function buildMjFlags(params: MjParams): string {
  const flags: string[] = []
  if (params.stylize !== 100) flags.push(`--s ${params.stylize}`)
  if (params.chaos > 0) flags.push(`--chaos ${params.chaos}`)
  if (params.negativePrompt.trim()) flags.push(`--no ${params.negativePrompt.trim()}`)
  if (params.imageWeight !== 1) flags.push(`--iw ${params.imageWeight}`)
  if (params.styleRefUrl.trim()) flags.push(`--sref ${params.styleRefUrl.trim()}`)
  if (params.seed.trim()) flags.push(`--seed ${params.seed.trim()}`)
  return flags.join(' ')
}

// ─── Colors ───────────────────────────────────────────────────────

const BG = '#193153'
const ACCENT = '#FBBF24'
const CYAN = '#06B6D4'
const MUTED = 'rgba(255,255,255,0.45)'
const CARD_BG = 'rgba(255,255,255,0.05)'
const CARD_BORDER = 'rgba(255,255,255,0.08)'

// ─── Slider ───────────────────────────────────────────────────────

function SliderRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  const presets = [min, Math.round((max - min) * 0.25 + min), Math.round((max - min) * 0.5 + min), Math.round((max - min) * 0.75 + min), max]
  // De-duplicate if step causes overlap
  const uniquePresets = [...new Set(presets)]

  return (
    <View style={styles.paramRow}>
      <View style={styles.paramHeader}>
        <Text style={styles.paramLabel}>{label}</Text>
        <Text style={styles.paramValue}>{value}</Text>
      </View>
      <Text style={styles.paramHint}>{hint}</Text>
      {/* Track + fill */}
      <View style={styles.trackOuter}>
        <View style={[styles.trackFill, { width: `${pct}%` }]} />
      </View>
      {/* Preset chips */}
      <View style={styles.presetRow}>
        {uniquePresets.map((v) => {
          const active = value === v
          return (
            <TouchableOpacity
              key={v}
              style={[styles.presetChip, active && styles.presetChipActive]}
              onPress={() => onChange(v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>{v}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ─── Main component ───────────────────────────────────────────────

export function MidjourneyParamsPanel({
  params,
  onChange,
  showImageWeight = false,
}: {
  params: MjParams
  onChange: (p: MjParams) => void
  showImageWeight?: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const update = (partial: Partial<MjParams>) => onChange({ ...params, ...partial })

  return (
    <View style={styles.container}>
      {/* Header toggle */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Svg width={16} height={16} viewBox="0 0 1024 1024" fill="none">
            <SvgPath d="m 267.7,229.5 c 128.6,55 305,208.1 337.4,412 -148.3,-59.8 -261.2,-27.9 -339.8,20.6 119.9,-152.4 66.1,-325.7 2.4,-432.6 z" fill="none" stroke={CYAN} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
            <SvgPath d="m 242.4,752.2 -22.9,-43.8 590,-38 c -46.4,42.2 -106,76.4 -166.3,104.4" fill="none" stroke={CYAN} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
            <SvgPath d="M 454.4,300.4 C 554.8,331.1 695.2,479.4 743,638.8 716.8,628.5 697.2,618 660.4,627.4 624.8,497.9 561.1,374.2 454.4,300.4 Z" fill="none" stroke={CYAN} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.headerTitle}>Midjourney V7 Controls</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Auto-gen notice */}
      <Text style={styles.autoGenNotice}>
        Parameters are auto-optimized by AI. Adjust below to override.
      </Text>

      {/* Camera & Look — always visible, the headline feature */}
      <View style={styles.cameraLookWrap}>
        <MjCameraLook
          value={params.photoKit ?? {}}
          onChange={(photoKit) => update({ photoKit })}
        />
      </View>

      {/* Speed picker — always visible */}
      <View style={styles.speedRow}>
        {(['draft', 'fast', 'turbo'] as const).map((s) => {
          const active = params.speed === s
          const labels = { draft: 'Draft', fast: 'Fast', turbo: 'Turbo' }
          const hints = { draft: '10× faster, lower quality', fast: 'Standard', turbo: 'Ultra-fast, 2× cost' }
          return (
            <TouchableOpacity
              key={s}
              style={[styles.speedChip, active && styles.speedChipActive]}
              onPress={() => update({ speed: s })}
              activeOpacity={0.7}
            >
              <Text style={[styles.speedLabel, active && styles.speedLabelActive]}>{labels[s]}</Text>
              <Text style={[styles.speedHint, active && styles.speedHintActive]}>{hints[s]}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {expanded && (
        <View style={styles.paramsBody}>
          {/* Stylize */}
          <SliderRow
            label="Stylize"
            hint="How artistic & stylized — 0 is literal, 1000 is very artistic"
            value={params.stylize}
            min={0}
            max={1000}
            step={50}
            onChange={(v) => update({ stylize: v })}
          />

          {/* Chaos */}
          <SliderRow
            label="Chaos"
            hint="How varied the 4 results are — 0 is similar, 100 is wildly different"
            value={params.chaos}
            min={0}
            max={100}
            step={10}
            onChange={(v) => update({ chaos: v })}
          />

          {/* Image Weight (only for img2img) */}
          {showImageWeight && (
            <SliderRow
              label="Image Weight"
              hint="How much influence the reference image has — 0 ignores it, 2 copies closely"
              value={params.imageWeight}
              min={0}
              max={2}
              step={0.25}
              onChange={(v) => update({ imageWeight: v })}
            />
          )}

          {/* Negative prompt */}
          <View style={styles.paramRow}>
            <Text style={styles.paramLabel}>Exclude (--no)</Text>
            <Text style={styles.paramHint}>Things to remove from the image</Text>
            <TextInput
              style={styles.textInput}
              value={params.negativePrompt}
              onChangeText={(t) => update({ negativePrompt: t })}
              placeholder="e.g. text, watermark, blurry"
              placeholderTextColor="rgba(255,255,255,0.2)"
              maxLength={200}
            />
          </View>

          {/* Style reference URL */}
          <View style={styles.paramRow}>
            <Text style={styles.paramLabel}>Style Reference (--sref)</Text>
            <Text style={styles.paramHint}>URL of an image whose style to match</Text>
            <TextInput
              style={styles.textInput}
              value={params.styleRefUrl}
              onChangeText={(t) => update({ styleRefUrl: t })}
              placeholder="https://example.com/style.jpg"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="none"
              keyboardType="url"
              maxLength={500}
            />
          </View>

          {/* Seed */}
          <View style={styles.paramRow}>
            <Text style={styles.paramLabel}>Seed</Text>
            <Text style={styles.paramHint}>Fix seed for reproducible results (leave blank for random)</Text>
            <TextInput
              style={[styles.textInput, { width: 140 }]}
              value={params.seed}
              onChangeText={(t) => update({ seed: t.replace(/[^0-9]/g, '') })}
              placeholder="Random"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.15)',
    overflow: 'hidden',
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: CYAN,
  },
  chevron: {
    fontSize: 10,
    color: MUTED,
  },
  autoGenNotice: {
    fontSize: 11,
    color: 'rgba(6,182,212,0.6)',
    paddingHorizontal: 14,
    paddingBottom: 6,
    fontStyle: 'italic',
  },

  // Camera & Look
  cameraLookWrap: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },

  // Speed
  speedRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
    marginVertical: 12,
  },
  speedChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
  },
  speedChipActive: {
    borderColor: CYAN,
    backgroundColor: 'rgba(6,182,212,0.1)',
  },
  speedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  speedLabelActive: { color: CYAN },
  speedHint: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 2,
  },
  speedHintActive: { color: 'rgba(6,182,212,0.6)' },

  // Params body
  paramsBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 14,
  },
  paramRow: { gap: 4 },
  paramHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paramLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paramValue: {
    fontSize: 13,
    fontWeight: '700',
    color: CYAN,
    minWidth: 40,
    textAlign: 'right',
  },
  paramHint: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 6,
  },

  // Track
  trackOuter: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 6,
  },
  trackFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: CYAN,
  },

  // Preset chips
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  presetChipActive: {
    borderColor: CYAN,
    backgroundColor: 'rgba(6,182,212,0.12)',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  presetChipTextActive: { color: CYAN },

  // Text inputs
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#FFFFFF',
  },
})
