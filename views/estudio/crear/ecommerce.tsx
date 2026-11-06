import { useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import Svg, { Path } from 'react-native-svg'
import { FONT, Text, TextInput } from '@/components/text'
import { theme } from '@/constants/theme'
import { configCrear, mxn, type Aspecto } from '@/lib/estudio'
import { cotizarLinea, pedirLinea, type Catalogo, type Linea } from './api'
import { Etiqueta, Llegando, ProductoResumen, plural, type Comun } from './llegando'
import { CATALOGO, DE_ENTRADA, filas, type Familia, type Fondo, type Mandar } from './modos'
import { BotonGenerar, Chip } from './partes'
import type { PiezaMesa } from './resultados'

/**
 * Crear's «E-commerce» (board «Ecommerce»; the web's app/(estudio)/crear/ecommerce.ts): catalogue photos of the
 * mesa's product — the shots of its family, a studio background, a quality — priced in the button and sent as one
 * request. The shots and backgrounds come from GET /api/crear/config (names only); the server writes the prompt.
 */

const c = theme.colors
const FORMATOS: Aspecto[] = ['1:1', '4:5', '3:4']
type Calidad = 'final' | 'borrador'
const CALIDADES: [Calidad, string, string][] = [
  ['final', 'Alta', 'Para tu tienda: la textura y el color, como en tus fotos'],
  ['borrador', 'Borrador', 'Para probar el ángulo; improvisa los detalles finos'],
]

export function useEcommerce(o: { activa: boolean; mesaId: string | null; propias: string[]; familia: Familia; ficha?: string; piezas: PiezaMesa[]; mandar: Mandar; enviando: boolean }) {
  const { familia, propias } = o
  // The same query Crear's header reads; `catalogo` is the part only this mode uses.
  const config = useQuery({ queryKey: ['crear-config'], queryFn: configCrear, staleTime: 10 * 60_000 })
  const catalogo = (config.data as { catalogo?: Catalogo } | undefined)?.catalogo
  const lista = catalogo?.tomas[familia] ?? []
  const [elegidas, setElegidas] = useState<string[] | null>(null)
  const [fondo, setFondo] = useState<Fondo>('puro')
  // A shop's photo is final: the draft improvises the fine texture.
  const [calidad, setCalidad] = useState<Calidad>('final')
  const [formato, setFormato] = useState<Aspecto>('1:1')

  const tomas = (elegidas ?? DE_ENTRADA[familia]).filter((id) => lista.some((t) => t.id === id))
  const nombre = (id: string) => lista.find((t) => t.id === id)?.nombre ?? id
  const linea = (q: Calidad, ids: string[]): Linea | null =>
    propias.length && ids.length
      ? { kind: 'producto', count: ids.length, refs: propias, aspect: formato, calidad: q, ...(o.ficha ? { fichaProducto: o.ficha } : {}), catalogo: { familia, tomas: ids, fondo } }
      : null
  const pedido = linea(calidad, tomas)
  const precio = useQuery({ queryKey: ['cotizar', pedido], queryFn: () => cotizarLinea(pedido!), enabled: o.activa && !!pedido })
  // Each quality's price per photo, said on its own button before it is picked.
  const unaFinal = lista[0] ? linea('final', [lista[0].id]) : null
  const unaBorrador = lista[0] ? linea('borrador', [lista[0].id]) : null
  const final = useQuery({ queryKey: ['cotizar', unaFinal], queryFn: () => cotizarLinea(unaFinal!), enabled: o.activa && !!unaFinal })
  const borrador = useQuery({ queryKey: ['cotizar', unaBorrador], queryFn: () => cotizarLinea(unaBorrador!), enabled: o.activa && !!unaBorrador })

  const q = precio.data
  const disabled = !pedido || !q || o.enviando
  const generar = () => {
    if (disabled || !pedido) return
    // « · final» is how the mesa marks a piece in high quality.
    const labels = tomas.map((id) => `${CATALOGO}${nombre(id)}${calidad === 'final' ? ' · final' : ''}`)
    const cuerpo: Linea = { ...pedido, ...(o.mesaId ? { mesaId: o.mesaId } : {}), labels }
    const aspect = formato
    Alert.alert(
      `¿Generar ${plural(tomas.length, 'foto', 'fotos')} de catálogo?`,
      `${tomas.length} × ${mxn(q.lines[0]?.unitCents ?? 0)} (${calidad === 'final' ? 'alta' : 'borrador'}, ${aspect}). Se apartan ${mxn(q.totalCents)} de tu saldo; sólo se cobra lo que llegue.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Generar', onPress: () => void o.mandar(() => pedirLinea(cuerpo), labels.map((label) => ({ label, aspect }))) },
      ],
    )
  }

  return {
    cargando: config.isLoading,
    lista,
    fondos: catalogo?.fondos ?? [],
    tomas,
    toggle: (id: string) => setElegidas(tomas.includes(id) ? tomas.filter((x) => x !== id) : [...tomas, id]),
    fondo,
    setFondo,
    calidad,
    setCalidad,
    unidad: { final: final.data?.lines[0]?.unitCents, borrador: borrador.data?.lines[0]?.unitCents } as Record<Calidad, number | undefined>,
    formato,
    setFormato,
    precio: q,
    errorPrecio: !!precio.error,
    generar,
    disabled,
    piezas: o.piezas.filter((p) => p.label.startsWith(CATALOGO)).reverse(),
  }
}

/** Board «Ecommerce» (10): the shots, the background and the quality, the price in the button. */
export function Ecommerce({
  q,
  o,
  familiaLabel,
  ficha,
  hoja,
}: {
  q: ReturnType<typeof useEcommerce>
  o: Comun
  familiaLabel: string
  /** «Así lo ve el modelo»: the product read from its photos, correctable in place. */
  ficha: { texto?: string; editada: boolean; onCorregir: (texto: string) => void }
  /** The mesa's photobook is of another product: said, with a way to make a new one (priced). */
  hoja: { porque: string; label: string; precio: string; onPress: () => void; disabled: boolean } | null
}) {
  const [editando, setEditando] = useState<string | null>(null)
  const listas = q.piezas.filter((p) => (p.status === 'ready' || p.status === 'completed') && !!p.resultUrl).length
  const enCurso = q.piezas.filter((p) => p.status !== 'failed' && !(p.status === 'ready' || p.status === 'completed')).length
  const nota = o.error ?? (q.errorPrecio ? 'No pudimos calcular el precio.' : null)
  const pick = (on: boolean) => ({ borderColor: on ? c.accent : c.border, backgroundColor: on ? c.bgOverlay : c.bgRaised })
  const fichaBoton = () => {
    if (editando === null) return setEditando(ficha.texto ?? '')
    if (editando.trim().length >= 20) ficha.onCorregir(editando)
    setEditando(null)
  }

  return (
    <>
      <Llegando
        titulo="Llegando"
        resumen={[plural(listas, 'lista', 'listas'), ...(enCurso ? [`${enCurso} en curso`] : [])].join(' · ')}
        piezas={q.piezas}
        prefijo={CATALOGO}
        o={o}
      />
      <ProductoResumen o={o} />

      <View style={styles.ficha}>
        <View style={styles.fichaCabeza}>
          <Etiqueta color={c.textDim}>Así lo ve el modelo</Etiqueta>
          {ficha.texto ? (
            <Pressable onPress={fichaBoton} accessibilityRole="button" style={[styles.fichaBoton, { borderColor: editando !== null ? c.accent : c.border }]}>
              <Text style={styles.fichaBotonTexto}>{editando !== null ? 'Guardar' : 'Corregir'}</Text>
            </Pressable>
          ) : null}
        </View>
        {editando !== null ? (
          <TextInput value={editando} onChangeText={setEditando} multiline maxLength={1200} accessibilityLabel="Así es tu producto" style={styles.fichaEdit} />
        ) : (
          <Text style={[styles.fichaTexto, { color: ficha.texto ? '#C7C7C7' : c.textDim }]}>{ficha.texto || 'Todavía no la leemos.'}</Text>
        )}
        {editando !== null || ficha.texto ? (
          <Text style={styles.fichaNota}>
            {editando !== null
              ? 'Escribe cómo es de verdad: colores, materiales y texturas. Va tal cual en cada toma.'
              : `${ficha.editada ? 'Corregido por ti' : `Leído de tus ${plural(o.fotos, 'foto', 'fotos')}`}. Va en cada toma, para que no invente la textura ni el color.`}
          </Text>
        ) : null}
      </View>

      {hoja ? (
        <View style={styles.hoja}>
          <View style={styles.hojaFila}>
            <View style={styles.hojaIcono}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M12 8v5M12 16.5v.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke={c.accent2} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={styles.hojaTexto}>
              Tu photobook es de otro producto <Text style={{ color: c.textMuted }}>({hoja.porque})</Text>. No lo usamos hasta que hagas uno nuevo.
            </Text>
          </View>
          <Pressable onPress={hoja.onPress} disabled={hoja.disabled} accessibilityRole="button" style={[styles.hojaBoton, hoja.disabled && { opacity: 0.45 }]}>
            <Text style={styles.hojaBotonTexto}>{hoja.label}</Text>
            <Text style={styles.hojaPrecio}>{hoja.precio}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <View style={styles.cabeza}>
          <Text style={styles.h2}>Tomas</Text>
          <Text style={styles.cabezaNota}>
            {q.tomas.length} de {q.lista.length} · {familiaLabel}
          </Text>
        </View>
        {!q.lista.length && !q.cargando ? <Text style={[styles.cabezaNota, { color: c.accent2 }]}>No pudimos traer las tomas. Intenta otra vez en un momento.</Text> : null}
        <View style={{ gap: 8 }}>
          {filas(q.lista, 2).map((fila, r) => (
            <View key={r} style={styles.fila}>
              {fila.map((t, k) => {
                if (!t) return <View key={k} style={{ flex: 1 }} />
                const on = q.tomas.includes(t.id)
                return (
                  <Pressable key={t.id} onPress={() => q.toggle(t.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[styles.toma, pick(on)]}>
                    <View style={styles.tomaFila}>
                      <View style={[styles.caja, { borderColor: on ? c.accent : c.borderStrong, backgroundColor: on ? c.accent : 'transparent' }]}>
                        {on ? (
                          <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                            <Path d="M5 12.5 10 17 19 7" stroke={c.bg} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
                          </Svg>
                        ) : null}
                      </View>
                      <Text style={styles.tomaNombre}>{t.nombre}</Text>
                    </View>
                    <Text style={styles.tomaDesc}>{t.desc}</Text>
                  </Pressable>
                )
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Etiqueta>Fondo</Etiqueta>
        <View style={{ gap: 6 }}>
          {q.fondos.map((f) => {
            const on = q.fondo === f.id
            return (
              <Pressable key={f.id} onPress={() => q.setFondo(f.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.fondo, pick(on)]}>
                <View style={[styles.muestra, { backgroundColor: f.muestra }]} />
                <Text style={styles.fondoNombre}>{f.nombre}</Text>
                <Text style={styles.fondoDesc} numberOfLines={1}>
                  {f.desc}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Etiqueta>Calidad</Etiqueta>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {CALIDADES.map(([id, label, sub]) => {
            const on = q.calidad === id
            const u = q.unidad[id]
            return (
              <Pressable key={id} onPress={() => q.setCalidad(id)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.calidad, pick(on)]}>
                <View style={styles.calidadFila}>
                  <Text style={styles.calidadNombre}>{label}</Text>
                  <Text style={styles.calidadPrecio}>{u ? `${mxn(u)} c/u` : '—'}</Text>
                </View>
                <Text style={styles.calidadSub}>{sub}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <View style={styles.formatos}>
          {FORMATOS.map((f) => (
            <Chip key={f} label={f} on={q.formato === f} onPress={() => q.setFormato(f)} />
          ))}
          <View style={styles.hecho}>
            <Text style={styles.hechoTexto}>2K</Text>
          </View>
        </View>
        <Text style={styles.cuenta}>
          {q.tomas.length} × <Text style={styles.mono}>{q.precio ? mxn(q.precio.lines[0]?.unitCents ?? 0) : '—'}</Text> ·{' '}
          <Text style={{ color: nota ? c.accent2 : c.textDim }}>{nota ?? 'se descuenta de tu saldo, sólo lo que llegue'}</Text>
        </Text>
        <BotonGenerar
          label={o.enviando ? 'Apartando…' : q.tomas.length ? `Generar ${plural(q.tomas.length, 'foto', 'fotos')} de catálogo` : 'Elige al menos una toma'}
          total={q.precio ? mxn(q.precio.totalCents) : '—'}
          onPress={q.generar}
          disabled={q.disabled}
        />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  ficha: { gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: '#0F0F0F' },
  fichaCabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  fichaBoton: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  fichaBotonTexto: { fontSize: 12, color: c.text },
  fichaTexto: { fontSize: 13, lineHeight: 19.5 },
  fichaEdit: { minHeight: 137, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, color: c.text, fontSize: 13, lineHeight: 19.5, textAlignVertical: 'top' },
  fichaNota: { fontSize: 11.5, color: '#6E6E6E' },

  hoja: { gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: '#3A2030', backgroundColor: '#160E12' },
  hojaFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hojaIcono: { width: 40, height: 40, borderRadius: 8, backgroundColor: c.bgOverlay, alignItems: 'center', justifyContent: 'center' },
  hojaTexto: { flex: 1, fontSize: 13, lineHeight: 18.2, color: c.text },
  hojaBoton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.bgElevated },
  hojaBotonTexto: { fontSize: 12.5, fontWeight: '500', color: c.text },
  hojaPrecio: { fontSize: 12.5, fontFamily: FONT.mono, color: c.textDim },

  cabeza: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  h2: { fontSize: 16, fontWeight: '600', color: c.text },
  cabezaNota: { flexShrink: 1, fontSize: 13, color: c.textMuted },
  fila: { flexDirection: 'row', gap: 8 },
  toma: { flex: 1, minWidth: 0, gap: 3, minHeight: 70, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  tomaFila: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  caja: { width: 16, height: 16, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tomaNombre: { flexShrink: 1, fontSize: 13.5, fontWeight: '500', color: c.text },
  tomaDesc: { fontSize: 11.5, lineHeight: 15.5, color: c.textDim },

  fondo: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  muestra: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: c.borderStrong },
  fondoNombre: { fontSize: 13.5, fontWeight: '500', color: c.text },
  fondoDesc: { flexShrink: 1, marginLeft: 'auto', fontSize: 11.5, color: c.textDim },

  calidad: { flex: 1, gap: 2, minHeight: 58, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  calidadFila: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 },
  calidadNombre: { fontSize: 13.5, fontWeight: '500', color: c.text },
  calidadPrecio: { fontFamily: FONT.mono, fontSize: 12, color: c.textMuted },
  calidadSub: { fontSize: 11, lineHeight: 14.85, color: c.textDim },

  formatos: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  hecho: { minHeight: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.bgOverlay, justifyContent: 'center' },
  hechoTexto: { fontFamily: FONT.mono, fontSize: 12, color: c.text },
  cuenta: { paddingHorizontal: 4, fontSize: 13, color: c.textDim },
  mono: { fontFamily: FONT.mono },
})
