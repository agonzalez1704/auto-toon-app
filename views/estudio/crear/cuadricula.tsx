import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { useQuery } from '@tanstack/react-query'
import Svg, { Path, Rect } from 'react-native-svg'
import { FONT, Text } from '@/components/text'
import { theme } from '@/constants/theme'
import { miniatura, mxn, type Propuesta } from '@/lib/estudio'
import { cotizarLinea, pasarAAlta, pedirEscenas, pedirLinea, textoDe, type Linea } from './api'
import { Etiqueta, Llegando, ProductoResumen, plural, type Comun } from './llegando'
import { CUADRICULA, DE_CUADRICULA, cuadriculaDe, filas, type Mandar } from './modos'
import { BotonGenerar, Chip, Pulso } from './partes'
import { hora, transcurrido, type PiezaMesa } from './resultados'

/**
 * Crear's «Cuadrícula» (boards «Cuadricula» and «CuadriculaElegir»; the web's app/(estudio)/crear/cuadricula.ts):
 * nine scenes Claude writes for this product, in ONE image for the price of one; the person taps the cells they
 * like, only those go to alta and stay on the mesa, and the grid is deleted (lib/crear/cuadricula on the web).
 * The hook lives in Crear so the scenes and the picks survive a tab change; the server writes every prompt.
 */

const c = theme.colors
const REHACER = 'M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4'
type Formato = '1:1' | '4:5'

export function useCuadricula(o: {
  /** The mode is on and the product is up. */
  activa: boolean
  mesaId: string | null
  imagen: string | null
  angulos: string[]
  producto: string | null
  categoria: string | null
  propias: string[]
  ficha?: string
  piezas: PiezaMesa[]
  mandar: Mandar
  enviando: boolean
}) {
  const [escenas, setEscenas] = useState<Propuesta[] | null>(null)
  const [pensando, setPensando] = useState(false)
  const [ideasError, setIdeasError] = useState<string | null>(null)
  const [vistas, setVistas] = useState<string[]>([])
  const [elegidas, setElegidas] = useState<number[]>([])
  const [formato, setFormato] = useState<Formato>('4:5')
  // The names a grid asked in this visit was written with (a stored grid brings its own, `escenas`).
  const [nombres, setNombres] = useState<Record<string, string[]>>({})
  // Grids whose cells were already asked: the server deleted them, but this visit still holds them.
  const [usadas, setUsadas] = useState<string[]>([])
  const pedidas = useRef<string | null>(null)

  // Nine scenes for this product (lib/crear/propuestas on the web); «Otras 9 ideas» avoids the ones seen.
  const pedir = async (evitar: string[]) => {
    if (!o.imagen || pensando) return
    setPensando(true)
    setIdeasError(null)
    try {
      const ps = await pedirEscenas({ imageUrl: o.imagen, imageUrls: o.angulos.slice(0, 3), producto: o.producto, categoria: o.categoria, evitar: evitar.slice(-40).map((s) => s.slice(0, 140)) })
      setEscenas(ps.slice(0, 9))
    } catch (e) {
      setIdeasError(textoDe(e, 'No pudimos escribir las escenas ahora. Intenta otra vez.'))
    } finally {
      setPensando(false)
    }
  }
  useEffect(() => {
    if (!o.activa || !o.imagen || pedidas.current === o.imagen) return
    pedidas.current = o.imagen
    setEscenas(null)
    setVistas([])
    void pedir([])
    // Once per product photo, when the mode is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.activa, o.imagen])

  const { vigente, fallo, fase } = cuadriculaDe(o.piezas, usadas)
  const nombresDe = vigente ? ((vigente as PiezaMesa & { escenas?: string[] }).escenas ?? nombres[vigente.id] ?? []) : []
  const nombreDe = (i: number) => nombresDe[i] ?? `Escena ${i + 1}`

  const lineaGrid: Linea | null =
    o.propias.length && escenas?.length === 9
      ? {
          kind: 'producto',
          count: 1,
          refs: o.propias,
          aspect: '1:1',
          calidad: 'final',
          ...(o.ficha ? { fichaProducto: o.ficha } : {}),
          cuadricula: { escenas: escenas.map((e) => ({ nombre: e.nombre, escena: e.escena })) },
          ...(o.mesaId ? { mesaId: o.mesaId } : {}),
          labels: [CUADRICULA],
        }
      : null
  const precioGrid = useQuery({ queryKey: ['cotizar', lineaGrid], queryFn: () => cotizarLinea(lineaGrid!), enabled: o.activa && fase === 'pedido' && !!lineaGrid })
  const cuantas = elegidas.length
  // What the picked cells cost in alta, said before they are sent (the web prices them the same way).
  const lineaAlta: Linea | null = o.propias.length ? { kind: 'producto', count: Math.max(1, cuantas), refs: o.propias, aspect: formato, calidad: 'final' } : null
  const precioAlta = useQuery({ queryKey: ['cotizar', lineaAlta], queryFn: () => cotizarLinea(lineaAlta!), enabled: o.activa && fase === 'elegir' && !!lineaAlta })

  const grid = precioGrid.data
  const sinPedir = !lineaGrid || !grid || o.enviando || pensando
  const generar = () => {
    if (sinPedir || !lineaGrid || !escenas) return
    const linea = lineaGrid
    const nombresGrid = escenas.map((e) => e.nombre)
    Alert.alert('¿Generar tu cuadrícula?', `Una imagen con las 9 escenas. Se apartan ${mxn(grid.totalCents)} de tu saldo; sólo se cobra si llega.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Generar',
        onPress: async () => {
          const r = await o.mandar(() => pedirLinea(linea), [{ label: CUADRICULA, aspect: '1:1' }])
          const id = r?.ids[0]
          if (id) setNombres((m) => ({ ...m, [id]: nombresGrid }))
          setElegidas([])
        },
      },
    ])
  }

  const alta = precioAlta.data
  const sinConfirmar = fase !== 'elegir' || !cuantas || !alta || o.enviando
  const confirmar = () => {
    if (sinConfirmar || !vigente) return
    const id = vigente.id
    const celdas = [...elegidas].sort((a, b) => a - b)
    const aspect = formato
    Alert.alert(
      `¿Pasar ${plural(cuantas, 'escena', 'escenas')} a alta?`,
      `${cuantas} × ${mxn(alta.lines[0]?.unitCents ?? 0)} en ${aspect}. Se apartan ${mxn(alta.totalCents)} de tu saldo; sólo se cobra lo que llegue. Después la cuadrícula se borra.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pasar a alta',
          onPress: async () => {
            const r = await o.mandar(
              () => pasarAAlta({ id, celdas, aspect }),
              celdas.map((n) => ({ label: `${DE_CUADRICULA}${nombreDe(n)} · final`, aspect })),
            )
            if (!r) return
            setUsadas((u) => [...u, id])
            setElegidas([])
          },
        },
      ],
    )
  }

  return {
    fase,
    vigente,
    fallo,
    escenas,
    pensando,
    ideasError,
    otras: () => {
      const nuevas = [...vistas, ...(escenas ?? []).map((e) => `${e.nombre}: ${e.descripcion}`)]
      setVistas(nuevas)
      void pedir(nuevas)
    },
    grid,
    errorGrid: !!precioGrid.error,
    generar,
    sinPedir,
    elegidas,
    toggle: (i: number) => setElegidas((e) => (e.includes(i) ? e.filter((x) => x !== i) : [...e, i])),
    todas: () => setElegidas([0, 1, 2, 3, 4, 5, 6, 7, 8]),
    ninguna: () => setElegidas([]),
    formato,
    setFormato,
    alta,
    errorAlta: !!precioAlta.error,
    confirmar,
    sinConfirmar,
    nombreDe,
    /** What arrives on the mesa from the grids: the cells in alta. */
    celdas: o.piezas.filter((p) => p.label.startsWith(DE_CUADRICULA)).reverse(),
  }
}

/** Boards «Cuadricula» (the order: the nine scenes and the price of one image) and «CuadriculaElegir» (the picking). */
export function Cuadricula({ q, o }: { q: ReturnType<typeof useCuadricula>; o: Comun }) {
  if (q.fase === 'pedido') {
    const listas = q.celdas.filter((p) => (p.status === 'ready' || p.status === 'completed') && !!p.resultUrl).length
    const enCurso = q.celdas.filter((p) => p.status !== 'failed' && !(p.status === 'ready' || p.status === 'completed')).length
    const nota = o.error ?? (q.errorGrid ? 'No pudimos calcular el precio.' : null) ?? (q.fallo ? 'La cuadrícula no salió. No se cobró.' : null)
    const escenas = q.escenas ?? Array.from({ length: 9 }, () => null)
    const notaEscenas = q.pensando ? 'Claude está escribiendo 9 escenas para tu producto…' : q.ideasError
    return (
      <>
        <Llegando titulo="Llegando a tu mesa" resumen={[plural(listas, 'lista', 'listas'), ...(enCurso ? [`${enCurso} en alta`] : [])].join(' · ')} piezas={q.celdas} prefijo={DE_CUADRICULA} o={o} />
        <ProductoResumen o={o} />

        <View style={styles.aviso}>
          <View style={styles.avisoTitulo}>
            <IconoCuadricula color={c.text} />
            <Text style={styles.avisoTituloTexto}>Una imagen, 9 escenas</Text>
          </View>
          <Text style={styles.avisoTexto}>Pagas una sola imagen con las 9. Después eliges las que te gusten: sólo esas se pasan a alta y se quedan en tu mesa. La cuadrícula se borra.</Text>
        </View>

        <View style={{ gap: 10 }}>
          <View style={styles.cabeza}>
            <Text style={styles.h2Chico}>Las 9 escenas</Text>
            <Text style={styles.cabezaNota}>escritas para tu producto</Text>
          </View>
          <View accessibilityLabel="Así se acomodan en la cuadrícula" style={{ gap: 6 }}>
            {filas(escenas, 3).map((fila, r) => (
              <View key={r} style={styles.filaEscenas}>
                {fila.map((e, k) => {
                  const i = r * 3 + k
                  return (
                    <Pulso key={i} activo={q.pensando} ms={1150} style={{ flex: 1 }}>
                      <View style={styles.escena}>
                        <Text style={styles.escenaN}>{i + 1}</Text>
                        <Text style={styles.escenaNombre}>{e?.nombre ?? 'Escribiendo…'}</Text>
                        <Text style={styles.escenaDesc}>{e?.descripcion ?? ''}</Text>
                      </View>
                    </Pulso>
                  )
                })}
              </View>
            ))}
          </View>
          {notaEscenas ? <Text style={[styles.escenasNota, { color: q.ideasError && !q.pensando ? c.accent2 : c.textMuted }]}>{notaEscenas}</Text> : null}
          <Pressable onPress={q.otras} disabled={q.pensando} accessibilityRole="button" style={[styles.otras, q.pensando && { opacity: 0.45 }]}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d={REHACER} stroke={c.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.otrasTexto}>{q.pensando ? 'Escribiendo…' : 'Otras 9 ideas'}</Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <View style={styles.formatoFila}>
            <View style={styles.hecho}>
              <Text style={styles.hechoTexto}>3×3 · 1:1</Text>
            </View>
            <Text style={styles.formatoNota}>las que elijas salen en 1:1 o 4:5</Text>
          </View>
          <Text style={styles.cuenta}>
            1 imagen × <Text style={styles.mono}>{q.grid ? mxn(q.grid.lines[0]?.unitCents ?? q.grid.totalCents) : '—'}</Text> ·{' '}
            <Text style={{ color: nota ? c.accent2 : c.textDim }}>{nota ?? 'se descuenta de tu saldo, sólo si llega'}</Text>
          </Text>
          <BotonGenerar label={o.enviando ? 'Apartando…' : 'Generar cuadrícula'} total={q.grid ? mxn(q.grid.totalCents) : '—'} onPress={q.generar} disabled={q.sinPedir} />
        </View>
      </>
    )
  }

  // ---------- «CuadriculaElegir» ----------
  const g = q.vigente!
  const generando = q.fase === 'generando'
  const cuantas = q.elegidas.length
  const src = miniatura(g.resultUrl, 360)
  const nota = o.error ?? (q.errorAlta ? 'No pudimos calcular el precio.' : null)
  return (
    <>
      <View style={{ gap: 10 }}>
        <View style={styles.cabeza}>
          <Text style={styles.h2}>{generando ? 'Generando tu cuadrícula' : 'Tu cuadrícula llegó'}</Text>
          <Text style={styles.cabezaNota}>{generando ? 'unos 2 minutos' : hora(g.updatedAt ?? g.createdAt)}</Text>
        </View>
        <Text style={styles.estadoNota}>
          {generando
            ? 'Cuando llegue, tocas las escenas que te gusten. Puedes seguir con otra cosa: aquí te espera.'
            : 'Toca las escenas que te gusten. Sólo esas se pasan a alta y se quedan en tu mesa; la cuadrícula se borra.'}
        </Text>
        {generando ? (
          <Pulso activo ms={1600}>
            <View style={styles.generando}>
              <IconoCuadricula color={c.textDim} />
              <Text style={styles.generandoTitulo}>Generando tu cuadrícula</Text>
              <Text style={styles.generandoTiempo}>{transcurrido(g.createdAt, o.now)} · Marketing Studio</Text>
            </View>
          </Pulso>
        ) : (
          <View style={styles.grid}>
            {src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Tu cuadrícula: 9 escenas del producto" /> : null}
            <View style={StyleSheet.absoluteFill}>
              {filas([0, 1, 2, 3, 4, 5, 6, 7, 8], 3).map((fila, r) => (
                <View key={r} style={styles.gridFila}>
                  {fila.map((i) => {
                    if (i === null) return null
                    const on = q.elegidas.includes(i)
                    return (
                      <Pressable
                        key={i}
                        onPress={() => q.toggle(i)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`Escena ${i + 1}: ${q.nombreDe(i)}`}
                        style={[
                          styles.celda,
                          { backgroundColor: on || !cuantas ? 'transparent' : 'rgba(10,10,10,0.38)', borderWidth: on ? 3 : 1, borderColor: on ? c.accent : 'rgba(10,10,10,0.55)' },
                        ]}
                      >
                        {/* The board's ring is an inset shadow; here it is the border, so the badges move in by its width to stay 6pt from the edge. */}
                        <View style={[styles.celdaN, on && { left: 3, top: 3 }]}>
                          <Text style={styles.celdaNTexto}>{i + 1}</Text>
                        </View>
                        {on ? (
                          <View style={styles.check}>
                            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                              <Path d="M5 12.5 10 17 19 7" stroke={c.bg} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                          </View>
                        ) : null}
                      </Pressable>
                    )
                  })}
                </View>
              ))}
            </View>
          </View>
        )}
        {!generando ? (
          <View style={styles.contador}>
            <Text style={styles.contadorTexto}>{cuantas} de 9 elegidas</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable onPress={q.todas} accessibilityRole="button" style={styles.todas}>
                <Text style={styles.todasTexto}>Todas</Text>
              </Pressable>
              <Pressable onPress={q.ninguna} accessibilityRole="button" style={styles.todas}>
                <Text style={styles.todasTexto}>Ninguna</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {!generando ? (
        <View style={{ gap: 10 }}>
          <View style={styles.formatoFila}>
            <Etiqueta>En alta como</Etiqueta>
            {(['1:1', '4:5'] as const).map((f) => (
              <Chip key={f} label={f} on={q.formato === f} onPress={() => q.setFormato(f)} />
            ))}
          </View>
          <Text style={styles.cuenta}>
            {cuantas} × <Text style={styles.mono}>{q.alta ? mxn(q.alta.lines[0]?.unitCents ?? 0) : '—'}</Text> ·{' '}
            <Text style={{ color: nota ? c.accent2 : c.textDim }}>{nota ?? 'se descuenta de tu saldo, sólo lo que llegue'}</Text>
          </Text>
          <Text style={styles.cobrado}>
            La cuadrícula ya se cobró: <Text style={[styles.mono, { color: c.accent2 }]}>{g.unitCents ? mxn(g.unitCents) : '—'}</Text>
          </Text>
          <BotonGenerar
            label={o.enviando ? 'Apartando…' : cuantas ? `Pasar ${cuantas} a alta` : 'Elige al menos una'}
            total={q.alta && cuantas ? mxn(q.alta.totalCents) : '—'}
            onPress={q.confirmar}
            disabled={q.sinConfirmar}
          />
        </View>
      ) : null}
    </>
  )
}

function IconoCuadricula({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7}>
      <Rect x={3.5} y={3.5} width={17} height={17} rx={2.5} />
      <Path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" />
    </Svg>
  )
}

const styles = StyleSheet.create({
  aviso: { gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: '#0F0F0F' },
  avisoTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avisoTituloTexto: { fontSize: 14, fontWeight: '600', color: c.text },
  avisoTexto: { fontSize: 13, lineHeight: 19.5, color: c.textMuted },

  cabeza: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  h2: { fontSize: 17, fontWeight: '600', color: c.text },
  h2Chico: { fontSize: 16, fontWeight: '600', color: c.text },
  cabezaNota: { fontSize: 13, color: c.textMuted },
  filaEscenas: { flexDirection: 'row', gap: 6 },
  escena: { flex: 1, gap: 4, minHeight: 92, paddingTop: 9, paddingHorizontal: 9, paddingBottom: 10, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised },
  escenaN: { fontFamily: FONT.mono, fontSize: 11, color: c.textDim },
  escenaNombre: { fontSize: 12.5, fontWeight: '500', lineHeight: 16.25, color: c.text },
  escenaDesc: { fontSize: 10.5, lineHeight: 14.2, color: c.textDim },
  escenasNota: { fontSize: 13, lineHeight: 19.5 },
  otras: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong },
  otrasTexto: { fontSize: 14, color: c.text },

  formatoFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  hecho: { minHeight: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.bgOverlay, justifyContent: 'center' },
  hechoTexto: { fontFamily: FONT.mono, fontSize: 12, color: c.text },
  formatoNota: { fontSize: 12, color: c.textDim },
  cuenta: { paddingHorizontal: 4, fontSize: 13, color: c.textDim },
  mono: { fontFamily: FONT.mono },
  cobrado: { paddingHorizontal: 4, fontSize: 12.5, color: c.textDim },

  estadoNota: { fontSize: 14, lineHeight: 21, color: c.textMuted },
  generando: { width: '100%', aspectRatio: 1, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong, backgroundColor: c.bgRaised, alignItems: 'center', justifyContent: 'center', gap: 8 },
  generandoTitulo: { fontSize: 15, fontWeight: '500', color: c.text },
  generandoTiempo: { fontFamily: FONT.mono, fontSize: 12, color: c.textMuted },
  grid: { width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: c.bgElevated },
  gridFila: { flex: 1, flexDirection: 'row' },
  celda: { flex: 1 },
  celdaN: { position: 'absolute', left: 5, top: 5, minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 999, backgroundColor: 'rgba(10,10,10,0.72)', alignItems: 'center', justifyContent: 'center' },
  celdaNTexto: { fontFamily: FONT.mono, fontSize: 11, color: c.text },
  check: { position: 'absolute', right: 3, top: 3, width: 24, height: 24, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  contador: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  contadorTexto: { fontSize: 14, fontWeight: '500', color: c.text },
  todas: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, justifyContent: 'center' },
  todasTexto: { fontSize: 13, color: c.text },
})
