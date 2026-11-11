import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'
import { FONT, Text } from '@/components/text'
import { theme } from '@/constants/theme'

const c = theme.colors

/** The boards' ↑ (the «accion» arrow), in any colour. */
export function Flecha({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M5 12l7-7 7 7" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** The boards' stand-in for a product with no picture yet (a bottle, viewBox 40×64). */
export function Botella({ width, height, color }: { width: number; height: number; color: string }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 40 64" fill="none" stroke={color} strokeWidth={1.5}>
      <Rect x={14} y={2} width={12} height={8} rx={2} />
      <Path d="M16 10v6c-6 3-9 8-9 15v24a6 6 0 0 0 6 6h14a6 6 0 0 0 6-6V31c0-7-3-12-9-15v-6" />
      <Rect x={11} y={34} width={18} height={14} rx={2} />
    </Svg>
  )
}

/** The boards' `.activo` / `.pulse`: opacity breathing between `min` and 1 while `activo` (still under reduced motion). */
export function Pulso({ activo, ms = 1150, min = 0.45, style, children }: { activo: boolean; ms?: number; min?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const reducir = useReducedMotion()
  const v = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!activo || reducir) return v.setValue(1)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: min, duration: ms / 2, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: ms / 2, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [activo, reducir, ms, min, v])
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>
}

/**
 * Resultados' `.beam`: a 1px border with a pink→green light running round it (a conic gradient on the web). Here a
 * wedge of that gradient turns behind the panel, clipped to the border, every 5 s.
 */
export function Haz({ children }: { children: ReactNode }) {
  const reducir = useReducedMotion()
  const [tam, setTam] = useState<{ width: number; height: number } | null>(null)
  const giro = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (reducir) return
    const a = Animated.loop(Animated.timing(giro, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true }))
    a.start()
    return () => a.stop()
  }, [reducir, giro])
  const S = tam ? Math.ceil(Math.hypot(tam.width, tam.height)) : 0
  const R = S / 2
  // The web's conic stops: transparent to 70 %, pink at 82 %, green at 92 %, transparent at 100 % (0° is up, clockwise).
  const punto = (grados: number) => {
    const r = (grados * Math.PI) / 180
    return [R + R * Math.sin(r), R - R * Math.cos(r)] as const
  }
  const [x1, y1] = punto(252)
  const [x2, y2] = punto(360)
  return (
    <View style={styles.haz} onLayout={(e) => setTam(e.nativeEvent.layout)}>
      {tam && S ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: S,
            height: S,
            left: (tam.width - S) / 2,
            top: (tam.height - S) / 2,
            transform: [{ rotate: giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
          }}
        >
          <Svg width={S} height={S}>
            <Defs>
              <LinearGradient id="haz" gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
                <Stop offset="0" stopColor={c.accent2} stopOpacity={0} />
                <Stop offset="0.4" stopColor={c.accent2} />
                <Stop offset="0.733" stopColor={c.accent} />
                <Stop offset="1" stopColor={c.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={`M${R} ${R}L${x1} ${y1}A${R} ${R} 0 0 1 ${x2} ${y2}Z`} fill="url(#haz)" />
          </Svg>
        </Animated.View>
      ) : null}
      {children}
    </View>
  )
}

/** The board's chips («Ajustes»): mono, ringed in green when on. A fact (no `onPress`) is drawn on but not pressable. */
export function Chip({ label, on, onPress, mono = true }: { label: string; on: boolean; onPress?: () => void; mono?: boolean }) {
  const familia = mono ? (on ? FONT.monoMedium : FONT.mono) : on ? FONT.medium : FONT.regular
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: on } : undefined}
      hitSlop={4}
      style={[styles.chip, { borderColor: on ? c.accent : c.border, backgroundColor: on ? c.bgOverlay : c.bgRaised }]}
    >
      <Text style={[styles.chipTexto, { color: on ? c.text : c.textMuted, fontFamily: familia }]}>{label}</Text>
    </Pressable>
  )
}

/** Main's «Generar N variantes · $X MXN» with the black ↑: green, it stays on this screen. */
export function BotonGenerar({ label, total, onPress, disabled }: { label: string; total: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.generar, { opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }]}
    >
      <Text style={[styles.generarTexto, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {label}
      </Text>
      <Text style={[styles.generarTexto, { opacity: 0.45 }]}>·</Text>
      <Text style={[styles.generarTexto, { fontFamily: FONT.monoMedium }]}>{total} MXN</Text>
      <View style={styles.generarFlecha}>
        <Flecha size={15} color={c.accent} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  haz: { borderRadius: 18, padding: 1, overflow: 'hidden', backgroundColor: c.border },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  chipTexto: { fontSize: 13 },
  generar: { minHeight: 56, borderRadius: 999, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingLeft: 20, paddingRight: 13 },
  generarTexto: { fontSize: 16, fontWeight: '600', color: c.bg },
  generarFlecha: { width: 30, height: 30, borderRadius: 999, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
})
