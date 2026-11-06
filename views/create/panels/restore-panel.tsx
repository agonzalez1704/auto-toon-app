import { useCallback, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '@/components/text'
import { restoreImage } from '@/lib/api'
import { getCostLabel } from '@/lib/ai-models'
import { requireAllConsents } from '@/stores/use-consent-guards'
import { RESTORE_MODELS, useRestoreStore, type Resolution } from '@/stores/use-restore-store'
import { useSubscriptionStore } from '@/stores/use-subscription-store'
import { colors, radius, spacing, typography, minTap } from '@/constants/theme'
import type { PanelProps } from './types'

const RESOLUTIONS: Resolution[] = ['2K', '4K']

/**
 * Restaurar, dentro de Crear.
 *
 * La pantalla `/restore` era la única forma de hacer esto en el teléfono, y
 * vivía aparte del resto del flujo. Aquí opera sobre la imagen que Crear ya
 * tiene, así que no se vuelve a subir nada y el resultado cae en el mismo
 * sitio que todo lo demás.
 *
 * El store `use-restore-store` se reutiliza tal cual: ya sabe de modelos,
 * resolución y fases. Lo único nuevo es que esto no navega.
 */
export function RestorePanel({ imageUrl, onDone, onCancel }: PanelProps) {
  const store = useRestoreStore()
  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const modelId = RESTORE_MODELS[store.selectedModel].id

  const run = useCallback(async () => {
    if (!requireAllConsents(() => { void run() })) return
    setBusy(true)
    setError(null)
    try {
      const res = await restoreImage({
        imageUrl,
        aiModel: modelId,
        resolution: store.resolution,
      })
      setResult(res.restoredImageUrl)
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err instanceof Error ? err.message : null)
      setError(message ?? 'Falló la restauración.')
    } finally {
      setBusy(false)
    }
  }, [imageUrl, modelId, store.resolution])

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
        <Text style={styles.sourceHint}>
          Recupera detalle, textura y bordes. Todo lo demás queda igual.
        </Text>
      </View>

      <Text style={styles.label}>Resolución</Text>
      <View style={styles.row}>
        {RESOLUTIONS.map((res) => {
          const on = store.resolution === res
          return (
            <Pressable
              key={res}
              onPress={() => store.setResolution(res)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{res}</Text>
              <Text style={styles.chipCost}>
                {getCostLabel(modelId, isPayPerUse, { resolution: res })}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.ghost} onPress={onCancel}>
          <Text style={styles.ghostLabel}>Atrás</Text>
        </Pressable>
        <Pressable style={[styles.primary, styles.grow, busy && styles.disabled]} onPress={run} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.primaryLabel}>Restaurar</Text>}
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
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  sourceHint: { ...typography.bodySm, color: colors.textMuted, flex: 1 },
  label: { ...typography.labelSm, color: colors.textMuted, marginTop: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    minHeight: minTap,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: 'rgba(255,255,255,0.16)' },
  chipLabel: { ...typography.cta, color: colors.textMuted },
  chipLabelOn: { color: colors.text },
  chipCost: { ...typography.caption, color: colors.textDim, marginTop: 2 },
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
