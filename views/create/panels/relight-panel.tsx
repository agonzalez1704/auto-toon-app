import { useCallback, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '@/components/text'
import { relightImage } from '@/lib/api'
import { requireAllConsents } from '@/stores/use-consent-guards'
import {
  CHARACTER_PRESETS,
  OBJECT_PRESETS,
  type RelightMode,
  type RelightPreset,
} from '@/stores/use-relight-store'
import { colors, radius, spacing, typography, minTap } from '@/constants/theme'
import type { PanelProps } from './types'

const MODES: { id: RelightMode; label: string }[] = [
  { id: 'object', label: 'Objeto' },
  { id: 'character', label: 'Persona' },
]

/**
 * Cambiar la luz, dentro de Crear.
 *
 * Los trece presets de `/relight` viven aquí completos — el panel no es una
 * versión recortada de la pantalla, la reemplaza. Los ids y el modo son el
 * vocabulario que la ruta espera y no se traducen; solo las etiquetas.
 */
export function RelightPanel({ imageUrl, onDone, onCancel }: PanelProps) {
  const [mode, setMode] = useState<RelightMode>('character')
  const [presetId, setPresetId] = useState<string>(CHARACTER_PRESETS[0].id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const presets: RelightPreset[] = mode === 'object' ? OBJECT_PRESETS : CHARACTER_PRESETS

  const pickMode = useCallback((next: RelightMode) => {
    setMode(next)
    // Cada modo tiene su propia lista: conservar el preset anterior mandaría
    // un id que la ruta rechaza para ese modo.
    setPresetId((next === 'object' ? OBJECT_PRESETS : CHARACTER_PRESETS)[0].id)
  }, [])

  const run = useCallback(async () => {
    if (!requireAllConsents(() => { void run() })) return
    setBusy(true)
    setError(null)
    try {
      const res = await relightImage({ baseImageUrl: imageUrl, mode, presetId })
      setResult(res.relitImageUrl)
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err instanceof Error ? err.message : null)
      setError(message ?? 'Falló el cambio de luz.')
    } finally {
      setBusy(false)
    }
  }, [imageUrl, mode, presetId])

  if (result) {
    return (
      <View style={styles.wrap}>
        <Image source={{ uri: result }} style={styles.result} resizeMode="contain" />
        <Pressable style={styles.primary} onPress={() => onDone(result)}>
          <Text style={styles.primaryLabel}>Listo</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <View style={styles.source}>
        <Image source={{ uri: imageUrl }} style={styles.thumb} />
        <Text style={styles.sourceHint}>La misma toma, otra iluminación.</Text>
      </View>

      <Text style={styles.label}>Qué hay en la foto</Text>
      <View style={styles.row}>
        {MODES.map((m) => {
          const on = mode === m.id
          return (
            <Pressable
              key={m.id}
              onPress={() => pickMode(m.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{m.label}</Text>
            </Pressable>
          )
        })}
      </View>

      <Text style={styles.label}>Luz</Text>
      <View style={styles.presets}>
        {presets.map((p) => {
          const on = presetId === p.id
          return (
            <Pressable
              key={p.id}
              onPress={() => setPresetId(p.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.preset, on && styles.presetOn]}
            >
              <View style={[styles.swatch, { backgroundColor: p.color }]} />
              <View style={styles.presetText}>
                <Text style={[styles.presetLabel, on && styles.chipLabelOn]}>{p.label}</Text>
                <Text style={styles.presetDesc} numberOfLines={1}>
                  {p.description}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.ghost} onPress={onCancel}>
          <Text style={styles.ghostLabel}>Atrás</Text>
        </Pressable>
        <Pressable
          style={[styles.primary, styles.grow, busy && styles.disabled]}
          onPress={run}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.primaryLabel}>Cambiar la luz</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  sourceHint: { ...typography.bodySm, color: colors.textMuted, flex: 1 },
  label: { ...typography.labelSm, color: colors.textMuted, marginTop: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    minHeight: minTap,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.surfaceRaised },
  chipLabel: { ...typography.cta, color: colors.textMuted },
  chipLabelOn: { color: colors.text },
  presets: { marginTop: spacing.sm, gap: spacing.xs },
  preset: {
    minHeight: minTap,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  presetOn: { backgroundColor: colors.surfaceRaised },
  swatch: { width: 20, height: 20, borderRadius: 10 },
  presetText: { flex: 1 },
  presetLabel: { ...typography.cta, color: colors.textMuted },
  presetDesc: { ...typography.caption, color: colors.textDim },
  error: { ...typography.bodySm, color: colors.danger, marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl, alignItems: 'center' },
  grow: { flex: 1 },
  primary: {
    minHeight: minTap,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  primaryLabel: { ...typography.cta, color: colors.bg },
  ghost: { minHeight: minTap, justifyContent: 'center', paddingHorizontal: spacing.md },
  ghostLabel: { ...typography.cta, color: colors.textMuted },
  disabled: { opacity: 0.6 },
  result: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.lg, backgroundColor: '#000' },
})
