import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
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
}: {
  label: string
  /** A price or a count, in mono, after the label. */
  detalle?: string
  onPress: () => void
  tono?: 'verde' | 'rosa'
  lleno?: boolean
  disabled?: boolean
  cargando?: boolean
}) {
  const color = tono === 'verde' ? theme.colors.accent : theme.colors.accent2
  const fondo = lleno ? color : theme.colors.bgRaised
  const texto = lleno ? theme.colors.bg : theme.colors.text
  return (
    <Pressable
      onPress={onPress}
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
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path d="M12 19V5M5 12l7-7 7 7" stroke={lleno ? color : theme.colors.bg} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
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
