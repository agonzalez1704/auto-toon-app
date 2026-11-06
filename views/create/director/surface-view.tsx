import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/text'
import { theme } from '@/constants/theme'
import type { DirectorComponent, Surface } from '@/lib/create/a2ui'

/**
 * El catálogo, dibujado.
 *
 * Esto es la mitad cliente de A2UI: el servidor manda ids y nombres de
 * componente, y el cliente decide cómo se ven. Por eso el catálogo es cerrado —
 * el director no puede pedir un componente que no exista aquí, ni mandar
 * marcado. `parseSurface` ya descartó lo que no reconoce; esto solo pinta.
 *
 * Es el mismo parser y el mismo protocolo que la web (v0.9.1). Lo único
 * distinto es que aquí se dibuja con React Native.
 */
export function SurfaceView({
  surface,
  onConcept,
  onChoice,
  disabled,
}: {
  surface: Surface
  onConcept: (c: Extract<DirectorComponent, { component: 'Concept' }>) => void
  onChoice: (
    c: Extract<DirectorComponent, { component: 'Choice' }>,
    option: { id: string; label: string },
  ) => void
  disabled?: boolean
}) {
  return (
    <View style={styles.stack}>
      {surface.order.map((id) => {
        const c = surface.components.get(id)
        if (!c) return null

        switch (c.component) {
          case 'Text':
            return (
              <Text key={id} style={styles.said}>
                {c.text}
              </Text>
            )

          case 'Palette':
            return (
              <View key={id} style={styles.palette}>
                {c.swatches.map((s) => (
                  <View key={s.hex + s.name} style={styles.swatchWrap}>
                    <View style={[styles.swatch, { backgroundColor: s.hex }]} />
                    <Text style={styles.swatchName} numberOfLines={1}>
                      {s.name}
                    </Text>
                  </View>
                ))}
              </View>
            )

          case 'TypePairing':
            return (
              <View key={id} style={styles.card}>
                <Text style={styles.typeDisplay}>{c.display}</Text>
                <Text style={styles.typeBody}>{c.body}</Text>
                <Text style={styles.hint}>{c.note}</Text>
              </View>
            )

          case 'Concept':
            return (
              <View key={id} style={styles.card}>
                <Text style={styles.conceptTitle}>{c.title}</Text>
                <Text style={styles.conceptPremise}>{c.premise}</Text>
                <Text style={styles.conceptVisual}>{c.visual}</Text>
                <Pressable
                  onPress={() => onConcept(c)}
                  disabled={disabled}
                  accessibilityRole="button"
                  style={[styles.cta, disabled && styles.dim]}
                >
                  <Text style={styles.ctaLabel}>Créala</Text>
                </Pressable>
              </View>
            )

          case 'Choice':
            return (
              <View key={id} style={styles.card}>
                <Text style={styles.question}>{c.question}</Text>
                <View style={styles.options}>
                  {c.options.map((o) => (
                    <Pressable
                      key={o.id}
                      onPress={() => onChoice(c, o)}
                      disabled={disabled}
                      accessibilityRole="button"
                      style={[styles.option, disabled && styles.dim]}
                    >
                      <Text style={styles.optionLabel}>{o.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )

          // Column is layout the parser already flattened into `order`.
          default:
            return null
        }
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.md },
  said: { ...theme.typography.body, color: theme.colors.text, lineHeight: 22 },
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  palette: { flexDirection: 'row', gap: theme.spacing.sm },
  swatchWrap: { alignItems: 'center', width: 56 },
  swatch: { width: 40, height: 40, borderRadius: theme.radius.md },
  swatchName: { ...theme.typography.caption, color: theme.colors.textDim, marginTop: 4 },
  typeDisplay: { ...theme.typography.sectionTitle, color: theme.colors.text },
  typeBody: { ...theme.typography.body, color: theme.colors.textMuted },
  hint: { ...theme.typography.caption, color: theme.colors.textDim, marginTop: 2 },
  conceptTitle: { ...theme.typography.label, color: theme.colors.text },
  conceptPremise: { ...theme.typography.bodySm, color: theme.colors.textMuted },
  conceptVisual: { ...theme.typography.bodySm, color: theme.colors.textDim, marginTop: 4 },
  cta: {
    marginTop: theme.spacing.sm,
    minHeight: theme.minTap,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { ...theme.typography.cta, color: theme.colors.bg },
  question: { ...theme.typography.label, color: theme.colors.text },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  option: {
    minHeight: theme.minTap,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
  },
  optionLabel: { ...theme.typography.cta, color: theme.colors.text },
  dim: { opacity: 0.5 },
})
