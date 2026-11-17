import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { FlechaMorph, usePresion } from '@/components/flecha'
import { FONT, Text } from '@/components/text'
import { theme } from '@/constants/theme'

/**
 * An action button with the web's arrow (AGENTS.md §1 on the web): green when the action stays on this screen,
 * pink when it goes on to another. Filled is the main action; dark is a secondary one, only its arrow coloured.
 */
export function Accion({
  label,
  detalle,
  onPress,
  tono = 'verde',
  lleno = false,
  disabled = false,
  cargando = false,
  morph,
}: {
  label: string
  /** A price or a count, in mono, after the label. */
  detalle?: string
  onPress: () => void
  tono?: 'verde' | 'rosa'
  lleno?: boolean
  disabled?: boolean
  cargando?: boolean
  /** The icon of what the tap does: the arrow turns into it while the button is held (web `data-morph`). */
  morph?: string
}) {
  const presion = usePresion()
  const color = tono === 'verde' ? theme.colors.accent : theme.colors.accent2
  const fondo = lleno ? color : theme.colors.bgRaised
  const texto = lleno ? theme.colors.bg : theme.colors.text
  return (
    <Pressable
      onPress={onPress}
      onPressIn={presion.onPressIn}
      onPressOut={presion.onPressOut}
      disabled={disabled || cargando}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || cargando }}
      style={({ pressed }) => [styles.boton, { backgroundColor: fondo, borderColor: lleno ? fondo : theme.colors.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }]}
    >
      <Text style={[styles.label, { color: texto }]}>{label}</Text>
      {detalle ? <Text style={[styles.detalle, { color: lleno ? theme.colors.bg : theme.colors.textMuted }]}>{detalle}</Text> : null}
      <View style={[styles.flecha, { backgroundColor: lleno ? theme.colors.bg : color }]}>
        {cargando ? (
          <ActivityIndicator size="small" color={lleno ? color : theme.colors.bg} />
        ) : (
          <FlechaMorph icono={morph} activo={presion.on} size={14} color={lleno ? color : theme.colors.bg} />
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  boton: { minHeight: 48, borderRadius: 999, borderWidth: 1, paddingLeft: 18, paddingRight: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  label: { fontSize: 15, fontWeight: '600' },
  detalle: { fontSize: 13, fontFamily: FONT.mono },
  flecha: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
})
