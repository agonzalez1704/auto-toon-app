import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import Svg, { Path } from 'react-native-svg'
import { FONT, Text } from '@/components/text'
import { theme } from '@/constants/theme'
import { lista, miniatura, mxn } from '@/lib/estudio'
import { filas, nombreLlegada } from './modos'
import { Pulso } from './partes'
import { corriendo, type PiezaMesa } from './resultados'

/**
 * What the «E-commerce» and «Cuadrícula» boards share with Main: the mode tabs, the product on the table, and
 * «Llegando» — the pieces of that mode on their way, two per row, each opening the Visor once it arrived.
 */

const c = theme.colors
const REINTENTAR = 'M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4'

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** What both modes get from the mesa: the product, its pieces, and how to open or retry one. */
export interface Comun {
  foto: string | null
  nombre: string
  categoria: string
  fotos: number
  piezas: PiezaMesa[]
  now: number
  error: string | null
  enviando: boolean
  onVer: (ids: string[], i: number) => void
  onReintentar: (p: PiezaMesa) => void
}

/** Main's «Qué tipo de foto»: a pill row, and what the mode on does said once under it. */
export function Pestanas<T extends string>({ modos, activo, onCambiar }: { modos: { id: T; label: string; sub: string; listo: boolean }[]; activo: T; onCambiar: (id: T) => void }) {
  return (
    <>
      <View accessibilityRole="tablist" accessibilityLabel="Qué tipo de foto" style={styles.pestanas}>
        {modos.map((m) => {
          const on = m.id === activo
          return (
            <Pressable
              key={m.id}
              onPress={() => onCambiar(m.id)}
              disabled={!m.listo}
              accessibilityRole="tab"
              accessibilityState={{ selected: on, disabled: !m.listo }}
              style={[styles.pestana, { borderColor: on ? c.accent : 'transparent', backgroundColor: on ? c.bgOverlay : 'transparent' }]}
            >
              <Text numberOfLines={1} style={[styles.pestanaTexto, { color: on ? c.text : m.listo ? c.textMuted : '#5A5A5A', fontWeight: on ? '600' : '400' }]}>
                {m.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <Text style={styles.modoSub}>{modos.find((m) => m.id === activo)?.sub ?? ''}</Text>
    </>
  )
}

/** The boards' mono caps label («Fondo», «En alta como»). */
export function Etiqueta({ children, color = '#6E6E6E' }: { children: string; color?: string }) {
  return <Text style={[styles.etiqueta, { color }]}>{children.toUpperCase()}</Text>
}

/** The product on the table, as the mode boards show it (not editable here: Escena changes it). */
export function ProductoResumen({ o }: { o: Comun }) {
  const src = miniatura(o.foto, 72)
  return (
    <View style={styles.producto}>
      <View style={styles.productoFoto}>{src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
      <View style={styles.productoDatos}>
        <Text style={styles.productoNombre}>{o.nombre}</Text>
        <Text style={styles.productoCategoria}>Categoría: {o.categoria}</Text>
        <Text style={styles.productoFotos}>{plural(o.fotos, 'foto', 'fotos')} de tu producto</Text>
      </View>
    </View>
  )
}

/** «Llegando»: this mode's pieces, newest first; a ready one opens the Visor, a failed one can be asked again. */
export function Llegando({ titulo, resumen, piezas, prefijo, o }: { titulo: string; resumen: string; piezas: PiezaMesa[]; prefijo: string; o: Comun }) {
  if (!piezas.length) return null
  const listas = piezas.filter(lista).map((p) => p.id)
  const reintentar = (p: PiezaMesa) =>
    Alert.alert('¿Reintentar esta pieza?', p.unitCents > 0 ? `Se apartan ${mxn(p.unitCents)} de tu saldo; sólo se cobra si llega.` : 'Sólo se cobra si llega.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reintentar', onPress: () => o.onReintentar(p) },
    ])
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.cabeza}>
        <Text style={styles.h2}>{titulo}</Text>
        <Text style={styles.resumen}>{resumen}</Text>
      </View>
      {filas(piezas, 2).map((fila, i) => (
        <View key={i} style={styles.fila}>
          {fila.map((p, j) => (p ? <Ficha key={p.id} p={p} nombre={nombreLlegada(p.label, prefijo, p.aspect)} o={o} listas={listas} onReintentar={reintentar} /> : <View key={j} style={{ flex: 1 }} />))}
        </View>
      ))}
    </View>
  )
}

function Ficha({ p, nombre, o, listas, onReintentar }: { p: PiezaMesa; nombre: string; o: Comun; listas: string[]; onReintentar: (p: PiezaMesa) => void }) {
  const [aw, ah] = p.aspect.split(':').map(Number)
  const hecha = lista(p)
  const fallo = p.status === 'failed'
  const va = corriendo(p)
  const estado = hecha ? ['Lista', c.text] : fallo ? ['Falló', c.accent2] : va ? ['En curso', c.text] : ['En cola', c.textMuted]
  const caja = hecha
    ? { backgroundColor: '#FFFFFF', borderColor: 'transparent', borderStyle: 'solid' as const }
    : fallo
      ? { backgroundColor: 'transparent', borderColor: c.borderStrong, borderStyle: 'solid' as const }
      : va
        ? { backgroundColor: c.bgElevated, borderColor: c.borderStrong, borderStyle: 'dashed' as const }
        : { backgroundColor: 'transparent', borderColor: c.border, borderStyle: 'dashed' as const }
  const src = hecha ? miniatura(p.resultUrl ?? p.videoUrl, 170) : null
  return (
    <View style={styles.ficha}>
      <Pulso activo={va} ms={1600}>
        <Pressable
          onPress={hecha ? () => o.onVer(listas, Math.max(0, listas.indexOf(p.id))) : undefined}
          disabled={!hecha}
          accessibilityRole={hecha ? 'imagebutton' : undefined}
          accessibilityLabel={hecha ? `Ver ${nombre}` : `${nombre} · ${estado[0]}`}
          style={[styles.caja, caja, { aspectRatio: aw && ah ? aw / ah : 1 }]}
        >
          {src ? (
            <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={p.id} transition={120} />
          ) : (
            <Text style={[styles.centro, { color: fallo || !va ? c.textMuted : c.text }]}>{fallo ? 'No salió. No se cobró.' : va ? 'Generando' : 'En cola'}</Text>
          )}
          {fallo ? (
            <Pressable onPress={() => onReintentar(p)} disabled={o.enviando} accessibilityRole="button" accessibilityLabel="Reintentar esta pieza" style={[styles.reintentar, o.enviando && { opacity: 0.45 }]}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d={REINTENTAR} stroke={c.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.reintentarTexto}>{p.unitCents > 0 ? `Reintentar · ${mxn(p.unitCents)}` : 'Reintentar'}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pulso>
      <View style={styles.fichaPie}>
        <Text style={styles.fichaNombre} numberOfLines={1}>
          {nombre}
        </Text>
        <Text style={[styles.fichaEstado, { color: estado[1] }]}>{estado[0]}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  pestanas: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 999, backgroundColor: c.bgRaised, borderWidth: 1, borderColor: c.border },
  pestana: { flex: 1, minWidth: 0, minHeight: 42, paddingHorizontal: 6, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pestanaTexto: { fontSize: 14 },
  modoSub: { marginTop: 8, paddingHorizontal: 8, fontSize: 13, lineHeight: 18.2, color: c.textDim, textAlign: 'center' },
  etiqueta: { fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: 0.63 },

  producto: { flexDirection: 'row', gap: 14, padding: 14, borderRadius: 16, backgroundColor: c.bgRaised, borderWidth: 1, borderColor: c.border },
  productoFoto: { width: 72, height: 90, borderRadius: 12, overflow: 'hidden', backgroundColor: c.border },
  productoDatos: { flex: 1, minWidth: 0, gap: 4, justifyContent: 'center' },
  productoNombre: { fontSize: 16, fontWeight: '600', color: c.text },
  productoCategoria: { fontSize: 14, color: c.textMuted },
  productoFotos: { fontSize: 12, color: c.textDim },

  cabeza: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  h2: { fontSize: 17, fontWeight: '600', color: c.text },
  resumen: { flexShrink: 1, fontSize: 13, color: c.textMuted, textAlign: 'right' },
  fila: { flexDirection: 'row', gap: 10 },
  ficha: { flex: 1, minWidth: 0, gap: 8 },
  caja: { width: '100%', borderRadius: 14, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 6 },
  centro: { paddingHorizontal: 10, fontSize: 13, lineHeight: 17.55, textAlign: 'center' },
  reintentar: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.bgRaised },
  reintentarTexto: { fontSize: 12.5, color: c.text },
  fichaPie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  fichaNombre: { flexShrink: 1, fontSize: 14, fontWeight: '500', color: c.text },
  fichaEstado: { flexShrink: 0, fontSize: 12 },
})
