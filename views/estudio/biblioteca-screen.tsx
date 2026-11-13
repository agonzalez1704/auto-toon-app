import { useMemo, useState, type ReactNode } from 'react'
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { abrirEnCrear } from '@/stores/use-mesa-abierta'
import * as Clipboard from 'expo-clipboard'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { FONT, Text, TextInput } from '@/components/text'
import { Accion } from '@/components/accion'
import { theme } from '@/constants/theme'
import { crearMesa, miniatura, mxn, verBiblioteca, verTrabajos, type PiezaBiblioteca } from '@/lib/estudio'
import { crearHistoria } from '@/lib/historia/api'
import { textoDe } from '@/views/estudio/crear/api'

/**
 * Biblioteca, board «Biblioteca» (web `app/(estudio)/biblioteca/biblioteca-view.tsx`): every piece by day in a
 * two-column mosaic, one card per product photo (a stack); a tap opens the sheet with its prompt and «Recrear».
 */

type P = PiezaBiblioteca
const FILTROS = ['Todo', 'Producto', 'Campañas', 'Video', 'Publicadas'] as const
type Filtro = (typeof FILTROS)[number]
const pasa: Record<Filtro, (p: P) => boolean> = {
  Todo: () => true,
  Producto: (p) => p.cat === 'producto' && !p.campaign,
  Campañas: (p) => p.campaign,
  Video: (p) => !!p.video,
  Publicadas: (p) => p.isPublic,
}
const TONES = ['#2C2A26', '#232A28', '#262626', '#2E2926']
const GAP = 12
const MAX = Number.MAX_SAFE_INTEGER
const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** A stack the way the person arranged it on the web, or null when nobody dragged it (then the newest leads). */
const arreglada = (items: P[]) => (items.some((p) => p.orden != null) ? [...items].reverse().sort((a, b) => (a.orden ?? MAX) - (b.orden ?? MAX)) : null)

/** CSS `column-count: 2`: the left column fills first, split where the two heights come out most even. */
function columnas<T>(items: T[], alto: (t: T) => number): [T[], T[]] {
  const hs = items.map(alto)
  const total = hs.reduce((a, b) => a + b, 0)
  let corte = 0
  let mejor = Infinity
  let acc = 0
  for (let k = 0; k <= items.length; k++) {
    const m = Math.max(acc, total - acc)
    if (m <= mejor) {
      mejor = m
      corte = k
    }
    acc += hs[k] ?? 0
  }
  return [items.slice(0, corte), items.slice(corte)]
}

export default function BibliotecaScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  // The native tab bar is translucent and the unstable navigator has no height hook (same as views/wardrobe).
  const barra = insets.bottom + (Platform.OS === 'ios' ? 49 : 64)
  const [filtro, setFiltro] = useState<Filtro>('Todo')
  const [buscando, setBuscando] = useState(false)
  const [query, setQuery] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [altoHoja, setAltoHoja] = useState(0)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [llevando, setLlevando] = useState(false)
  const [nota, setNota] = useState<string | null>(null)
  const [haciendo, setHaciendo] = useState(false)
  const [notaPila, setNotaPila] = useState<string | null>(null)
  const piezas = useQuery({ queryKey: ['biblioteca'], queryFn: verBiblioteca })
  const trabajos = useQuery({ queryKey: ['trabajos'], queryFn: verTrabajos, refetchInterval: (q) => (q.state.data?.running ? 10_000 : false) })
  const enCurso = trabajos.data?.running ?? 0

  const col = (width - 32 - GAP) / 2
  const alto = (p: P) => {
    const [w, h] = p.aspect.split(':').map(Number)
    return Math.round((col * h) / w)
  }

  const v = useMemo(() => {
    const q = sinAcentos(query.trim())
    const shown = (piezas.data ?? []).filter((p) => pasa[filtro](p) && (!q || sinAcentos(`${p.name} ${p.module} ${p.prompt}`).includes(q)))
    // One stack per product photo, in the order they first show up (newest first).
    const pilas = new Map<string, P[]>()
    for (const p of shown) pilas.set(p.grupo, [...(pilas.get(p.grupo) ?? []), p])
    const cartas = [...pilas.values()].map((items) => arreglada(items)?.[0] ?? items[0])
    // What the card was really charged: each request's capture once, on the first day its pieces show up.
    const contados = new Set<string>()
    const cobrado = new Map<string, number>()
    for (const p of shown) {
      if (!p.holdId || p.cobradoCents == null || contados.has(p.holdId)) continue
      contados.add(p.holdId)
      cobrado.set(p.dayKey, (cobrado.get(p.dayKey) ?? 0) + p.cobradoCents)
    }
    const days: { key: string; label: string; items: P[]; cents: number; n: number }[] = []
    for (const p of cartas) {
      const last = days.at(-1)
      const n = pilas.get(p.grupo)!.length
      if (last?.key === p.dayKey) {
        last.items.push(p)
        last.n += n
      } else days.push({ key: p.dayKey, label: p.day, items: [p], cents: cobrado.get(p.dayKey) ?? 0, n })
    }
    // The viewer walks the library the way the mosaic reads: whole stacks, in their own order.
    const orden = (items: P[]) => arreglada(items) ?? [...items].reverse()
    const visor = [...pilas.values()].flatMap(orden).map((p) => p.id)
    const pila = abierta ? pilas.get(abierta) : undefined
    return { shown, pilas, days, visor, tomas: pila && pila.length > 1 ? orden(pila) : [] }
  }, [piezas.data, filtro, query, abierta])

  const sel = v.shown.find((p) => p.id === selId)
  const ver = (p: P) => router.push({ pathname: '/visor', params: { ids: JSON.stringify(v.visor), i: String(Math.max(0, v.visor.indexOf(p.id))) } })
  const elegir = (p: P) => {
    if (p.id === selId) return ver(p)
    setSelId(p.id)
    setNota(null)
  }

  // As on the web: a new mesa with this image as the product; Crear prices every request before it runs.
  const puedeRecrear = (p: P) => !p.video && !!p.src?.startsWith('https://')
  const recrear = async (p: P) => {
    if (!puedeRecrear(p) || llevando) return
    setLlevando(true)
    setNota(null)
    try {
      const id = await crearMesa({ photoUrl: p.src, refs: [] })
      qc.invalidateQueries({ queryKey: ['mesas'] })
      abrirEnCrear(id)
    } catch {
      setNota('No pudimos abrir una mesa con esta imagen. Intenta otra vez.')
    } finally {
      setLlevando(false)
    }
  }
  // «Hacer una historia» from a stack: a scene per still, in the stack's order (the web picks them one by one in Crear).
  const fotos = v.tomas.filter((p) => !p.video && !!p.src?.startsWith('https://')).slice(0, 12)
  const hacerHistoria = async () => {
    if (!fotos.length || haciendo) return
    setHaciendo(true)
    setNotaPila(null)
    try {
      const id = await crearHistoria(fotos.map((p) => p.id))
      router.push({ pathname: '/historia', params: { id, nueva: '1' } })
    } catch (e) {
      setNotaPila(textoDe(e, 'No pudimos hacer la historia. Intenta otra vez.'))
    } finally {
      setHaciendo(false)
    }
  }
  const copiar = async (p: P) => {
    if (!p.prompt) return setNota('Esta pieza es de antes de la nueva versión y no guardó su prompt.')
    try {
      await Clipboard.setStringAsync(p.prompt)
      setCopiado(p.id)
      setTimeout(() => setCopiado((c) => (c === p.id ? null : c)), 1600)
    } catch {
      setNota('No pudimos copiar el prompt. Intenta otra vez.')
    }
  }

  const vacio = piezas.isLoading ? (
    <View style={styles.cargando}>
      <ActivityIndicator color={c.textDim} />
      <Text style={styles.meta}>Cargando tu biblioteca…</Text>
    </View>
  ) : piezas.error ? (
    <Tarjeta titulo="No pudimos leer tu biblioteca" texto="Revisa tu conexión y vuelve a intentarlo.">
      <Accion label="Intentar otra vez" onPress={() => piezas.refetch()} cargando={piezas.isFetching} />
    </Tarjeta>
  ) : piezas.data?.length ? (
    <Tarjeta titulo="Nada con este filtro" texto="Prueba otra pestaña u otra palabra." />
  ) : (
    <Tarjeta titulo="Aquí van tus imágenes" texto="Todavía no generas nada. Sube la foto de tu producto en Crear y aquí llega todo lo que hagas.">
      <Accion label="Ir a Crear" tono="rosa" lleno onPress={() => router.push('/')} />
    </Tarjeta>
  )

  // A plain function, not a component: a component declared in render would remount every tile on each render.
  const mosaico = (items: P[]) => (
    <View style={styles.mosaico}>
      {columnas(items, (p) => alto(p) + GAP).map((columna, k) => (
        <View key={k} style={{ width: col }}>
          {columna.map((p) => (
            <Tile key={p.id} p={p} h={alto(p)} tone={TONES[items.indexOf(p) % TONES.length]} on={p.id === sel?.id} n={v.pilas.get(p.grupo)?.length ?? 1} abierta={abierta === p.grupo} onPress={() => elegir(p)} onPila={() => setAbierta(abierta === p.grupo ? null : p.grupo)} />
          ))}
        </View>
      ))}
    </View>
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.cabecera}>
          <View style={styles.fila}>
            <Text style={styles.titulo}>Biblioteca</Text>
            <View style={styles.acciones}>
              <Pressable onPress={() => router.push('/historia')} accessibilityRole="button" accessibilityLabel="Abrir tus historias" style={styles.enCurso}>
                <Text style={styles.enCursoTexto}>Historias</Text>
              </Pressable>
              {enCurso > 0 ? (
                <Pressable onPress={() => router.push('/trabajos')} accessibilityRole="button" accessibilityLabel={`${enCurso} en curso, ver trabajos`} style={styles.enCurso}>
                  <View style={styles.punto} />
                  <Text style={styles.enCursoTexto}>{enCurso} en curso</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => (buscando ? (setBuscando(false), setQuery('')) : setBuscando(true))}
                accessibilityRole="button"
                accessibilityLabel={buscando ? 'Cerrar la búsqueda' : 'Buscar en tu trabajo'}
                style={[styles.redondo, buscando && { borderColor: c.accent, backgroundColor: c.bgOverlay }]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth={2} strokeLinecap="round">
                  <Circle cx={11} cy={11} r={7} />
                  <Path d="m20 20-3.5-3.5" />
                </Svg>
              </Pressable>
            </View>
          </View>
          {buscando ? (
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoFocus
              placeholder="Producto, campaña o palabra del prompt"
              placeholderTextColor={c.textDim}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              style={styles.buscar}
            />
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros} style={{ flexGrow: 0 }}>
          {FILTROS.map((f) => {
            const on = f === filtro
            return (
              <Pressable key={f} onPress={() => setFiltro(f)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.filtro, on && styles.filtroOn]}>
                <Text style={[styles.filtroTexto, on && styles.filtroTextoOn]}>{f}</Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {v.tomas.length ? (
          <View style={styles.compara}>
            <View style={styles.comparaFila}>
              <Text style={styles.meta}>{plural(v.tomas.length, 'toma', 'tomas')} del mismo producto</Text>
              {fotos.length > 1 ? (
                <Pressable onPress={hacerHistoria} disabled={haciendo} accessibilityRole="button" style={({ pressed }) => [styles.hacer, pressed && { opacity: 0.85 }]}>
                  <Text style={styles.enCursoTexto}>{haciendo ? 'Haciendo…' : 'Hacer una historia'}</Text>
                  <View style={styles.hacerFlecha}>
                    {haciendo ? (
                      <ActivityIndicator size="small" color={c.bg} />
                    ) : (
                      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={c.bg} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M12 19V5M5 12l7-7 7 7" />
                      </Svg>
                    )}
                  </View>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setAbierta(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cerrar la comparación" style={styles.cerrar}>
                <Text style={styles.cerrarTexto}>×</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {v.tomas.map((p, i) => (
                <Carta key={p.id} p={p} tone={TONES[i % TONES.length]} on={p.id === sel?.id} onPress={() => elegir(p)} />
              ))}
            </ScrollView>
            {notaPila ? <Text style={styles.meta}>{notaPila}</Text> : null}
          </View>
        ) : null}

        <FlatList
          data={v.days}
          keyExtractor={(d) => d.key}
          initialNumToRender={3}
          windowSize={5}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, gap: GAP, paddingBottom: barra + (sel ? altoHoja + 16 : 24) }}
          refreshControl={<RefreshControl refreshing={piezas.isRefetching} onRefresh={() => (piezas.refetch(), trabajos.refetch())} tintColor={c.textDim} />}
          renderItem={({ item: d }) => (
            <View style={{ gap: GAP }}>
              <View style={styles.dia}>
                <Text style={styles.diaLabel}>{d.label}</Text>
                <Text style={styles.meta}>
                  {plural(d.n, 'pieza', 'piezas')}
                  {d.cents ? ' · se cobró ' : ''}
                  {d.cents ? <Text style={[styles.meta, { fontFamily: FONT.mono }]}>{mxn(d.cents)}</Text> : null}
                </Text>
              </View>
              {mosaico(d.items)}
            </View>
          )}
          ListEmptyComponent={vacio}
        />
      </SafeAreaView>

      {sel ? (
        <View style={[styles.hoja, { bottom: barra + 8 }]} onLayout={(e) => setAltoHoja(e.nativeEvent.layout.height)}>
          <Pressable onPress={() => setSelId(null)} hitSlop={{ top: 14, bottom: 8, left: 60, right: 60 }} accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.asa} />
          <View style={styles.fila}>
            <Pressable onPress={() => ver(sel)} accessibilityRole="button" accessibilityLabel="Ver completa" style={styles.nombre}>
              <Text numberOfLines={1} style={styles.nombreTexto}>
                {sel.name}
              </Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={c.textDim} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 9V4h5M20 15v5h-5M20 4l-6 6M4 20l6-6" />
              </Svg>
            </Pressable>
            {sel.priceCents != null ? <Text style={styles.precio}>{mxn(sel.priceCents)}</Text> : null}
          </View>
          {sel.prompt ? (
            <Text numberOfLines={3} style={styles.prompt}>
              {sel.prompt}
            </Text>
          ) : null}
          <View style={styles.fila}>
            <Text style={[styles.meta, { flexShrink: 1 }]} numberOfLines={1}>
              {sel.meta}
            </Text>
            <Text style={styles.meta}>{sel.module}</Text>
          </View>
          <View style={styles.botones}>
            <Pressable
              onPress={() => recrear(sel)}
              disabled={!puedeRecrear(sel) || llevando}
              accessibilityRole="button"
              accessibilityState={{ disabled: !puedeRecrear(sel) }}
              style={({ pressed }) => [styles.recrear, { opacity: puedeRecrear(sel) ? (pressed ? 0.85 : 1) : 0.45 }]}
            >
              {llevando ? (
                <ActivityIndicator size="small" color={c.bg} />
              ) : (
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={c.bg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4" />
                </Svg>
              )}
              <Text style={styles.recrearTexto}>Recrear</Text>
            </Pressable>
            <Pressable onPress={() => copiar(sel)} accessibilityRole="button" style={({ pressed }) => [styles.copiar, pressed && { opacity: 0.85 }]}>
              <Text style={styles.copiarTexto}>{copiado === sel.id ? 'Copiado' : 'Copiar prompt'}</Text>
            </Pressable>
          </View>
          {nota ? <Text style={styles.meta}>{nota}</Text> : null}
          {sel.isPublic ? (
            <View style={styles.galeria}>
              <Text style={styles.galeriaTexto}>En la galería · $10 por desbloqueo, ganas $5</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

/** One card of the mosaic: the piece (or the top of its stack), its gallery dot, the style pin and the stack badge. */
function Tile({ p, h, tone, on, n, abierta, onPress, onPila }: { p: P; h: number; tone: string; on: boolean; n: number; abierta: boolean; onPress: () => void; onPila: () => void }) {
  const img = miniatura(p.video ? p.poster : p.src, 190)
  return (
    <View style={{ marginBottom: GAP }}>
      {/* Two sheets peeking out behind the card; they go away while the stack is open. */}
      {n > 1 && !abierta ? (
        <>
          <View style={[styles.hojaPila, { top: 10, left: 10, right: -10, bottom: -10, borderColor: c.bgOverlay }]} />
          <View style={[styles.hojaPila, { top: 5, left: 5, right: -5, bottom: -5, borderColor: c.border }]} />
        </>
      ) : null}
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={p.name} accessibilityState={{ selected: on }} style={[styles.tile, { height: h, backgroundColor: tone, borderColor: on ? c.accent : 'transparent' }]}>
        {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={p.id} transition={120} /> : <Botella />}
        <View style={styles.anillo}>
          <View style={[styles.punto8, { backgroundColor: p.isPublic ? theme.colors.text : 'rgba(255,255,255,0.35)' }]} />
        </View>
        {p.ancla ? <Estilo /> : null}
        {p.video ? (
          <View style={styles.play}>
            <Svg width={10} height={10} viewBox="0 0 24 24">
              <Path d="M7 4v16l13-8z" fill={c.text} />
            </Svg>
          </View>
        ) : null}
      </Pressable>
      {n > 1 ? (
        <Pressable onPress={onPila} hitSlop={10} accessibilityRole="button" accessibilityLabel="Ver las demás de este producto" style={styles.pila}>
          <Text style={styles.pilaTexto}>{abierta ? 'Cerrar' : `Ver las ${n}`}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** A take in the comparison strip: the piece, then its quality and what it cost. */
function Carta({ p, tone, on, onPress }: { p: P; tone: string; on: boolean; onPress: () => void }) {
  const img = miniatura(p.video ? p.poster : p.src, 128)
  const alta = p.calidad === 'Alta'
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={p.name} accessibilityState={{ selected: on }} style={[styles.carta, { borderColor: on ? c.accent : 'transparent' }]}>
      <View style={[styles.cartaMedia, { backgroundColor: tone }]}>{img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={p.id} /> : <Botella w={26} h={42} />}</View>
      <View style={styles.cartaPie}>
        <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 11, color: alta ? c.text : c.textDim, fontWeight: alta ? '600' : '400' }}>
          {p.calidad ?? p.time}
        </Text>
        {p.priceCents != null ? <Text style={styles.cartaPrecio}>{mxn(p.priceCents)}</Text> : null}
      </View>
    </Pressable>
  )
}

/** The pin: some mesa shoots everything to look like this piece. */
function Estilo() {
  return (
    <View style={styles.estilo}>
      <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9.5 3h5l-1 5 3 3v2H7.5v-2l3-3-1-5ZM12 13v8" />
      </Svg>
      <Text style={styles.estiloTexto}>ESTILO</Text>
    </View>
  )
}

/** The board's stand-in while a piece has no image to show. */
function Botella({ w = 30, h = 48 }: { w?: number; h?: number }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 40 64" fill="none" stroke="#D4D4D4" strokeWidth={1.5}>
      <Rect x={14} y={2} width={12} height={8} rx={2} />
      <Path d="M16 10v6c-6 3-9 8-9 15v24a6 6 0 0 0 6 6h14a6 6 0 0 0 6-6V31c0-7-3-12-9-15v-6" />
      <Rect x={11} y={34} width={18} height={14} rx={2} />
    </Svg>
  )
}

/** The board's sheet look, for the empty and error states (the web shows them in the sheet). */
function Tarjeta({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <View style={[styles.hojaBase, { marginTop: 12 }]}>
      <Text style={styles.nombreTexto}>{titulo}</Text>
      <Text style={styles.prompt}>{texto}</Text>
      {children}
    </View>
  )
}

const c = theme.colors
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  cabecera: { gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titulo: { margin: 0, fontFamily: FONT.display, fontSize: 34, lineHeight: 36, textTransform: 'uppercase', color: c.text },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  redondo: { width: 44, height: 44, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, alignItems: 'center', justifyContent: 'center' },
  enCurso: { height: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, flexDirection: 'row', alignItems: 'center', gap: 6 },
  enCursoTexto: { fontSize: 13, color: c.text },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent },
  buscar: { height: 44, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, paddingHorizontal: 16, fontSize: 14, color: c.text },
  filtros: { gap: 6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  filtro: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, justifyContent: 'center' },
  filtroOn: { borderColor: c.accent, backgroundColor: c.bgOverlay },
  filtroTexto: { fontSize: 13, color: c.textMuted, fontWeight: '400' },
  filtroTextoOn: { color: c.text, fontWeight: '500' },
  hacer: { marginLeft: 'auto', height: 34, paddingLeft: 12, paddingRight: 4, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, flexDirection: 'row', alignItems: 'center', gap: 6 },
  hacerFlecha: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.accent2, alignItems: 'center', justifyContent: 'center' },
  compara: { gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: c.bg },
  comparaFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cerrar: { width: 28, height: 28, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, alignItems: 'center', justifyContent: 'center' },
  cerrarTexto: { fontSize: 15, lineHeight: 17, color: c.text },
  carta: { width: 128, borderRadius: 12, overflow: 'hidden', backgroundColor: c.bgRaised, borderWidth: 2 },
  cartaMedia: { height: 171, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cartaPie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingTop: 9, paddingHorizontal: 9, paddingBottom: 11 },
  cartaPrecio: { fontFamily: FONT.mono, fontSize: 11, color: c.textDim },
  dia: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  diaLabel: { fontFamily: FONT.mono, fontSize: 12, letterSpacing: 0.96, textTransform: 'uppercase', color: c.accent2 },
  meta: { fontSize: 12, color: c.textDim },
  mosaico: { flexDirection: 'row', gap: GAP, alignItems: 'flex-start' },
  tile: { borderRadius: 14, overflow: 'hidden', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hojaPila: { position: 'absolute', borderRadius: 14, borderWidth: 1, backgroundColor: c.bgRaised },
  anillo: { position: 'absolute', top: 5, right: 5, width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(10,10,10,0.5)', alignItems: 'center', justifyContent: 'center' },
  punto8: { width: 8, height: 8, borderRadius: 4 },
  estilo: { position: 'absolute', zIndex: 2, bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, paddingLeft: 6, paddingRight: 8, borderRadius: 999, borderWidth: 1, borderColor: c.accent, backgroundColor: 'rgba(10,10,10,0.72)' },
  estiloTexto: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.4, color: c.accent },
  play: { position: 'absolute', right: 8, bottom: 8, width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(10,10,10,0.72)', alignItems: 'center', justifyContent: 'center' },
  pila: { position: 'absolute', zIndex: 2, top: 8, left: 8, minWidth: 30, height: 26, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(10,10,10,0.72)', alignItems: 'center', justifyContent: 'center' },
  pilaTexto: { fontFamily: FONT.mono, fontSize: 12, color: c.text },
  cargando: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  hojaBase: { gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: 'rgba(20,20,20,0.92)' },
  hoja: {
    position: 'absolute',
    left: 12,
    right: 12,
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: 'rgba(20,20,20,0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -12 },
    elevation: 12,
  },
  asa: { width: 36, height: 4, borderRadius: 999, backgroundColor: c.borderStrong, alignSelf: 'center' },
  nombre: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1, minHeight: 28 },
  nombreTexto: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: c.text },
  precio: { fontFamily: FONT.mono, fontSize: 13, color: c.accent2 },
  prompt: { fontFamily: FONT.mono, fontSize: 12.5, lineHeight: 20, color: '#C7C7C7' },
  botones: { flexDirection: 'row', gap: 8 },
  recrear: { flexGrow: 1, flexBasis: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderRadius: 999, backgroundColor: c.accent },
  recrearTexto: { fontSize: 14, fontWeight: '600', color: c.bg },
  copiar: { flexGrow: 1, flexBasis: 0, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgElevated, alignItems: 'center', justifyContent: 'center' },
  copiarTexto: { fontSize: 14, color: c.text },
  galeria: { minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.text, backgroundColor: theme.colors.bgElevated, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  galeriaTexto: { fontSize: 14, fontWeight: '500', color: '#86EFAC' },
})
