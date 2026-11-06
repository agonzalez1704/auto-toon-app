import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, type Href } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { VideoView, useVideoPlayer } from 'expo-video'
import * as Clipboard from 'expo-clipboard'
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { FONT, Text, TextInput } from '@/components/text'
import { Accion } from '@/components/accion'
import { theme } from '@/constants/theme'
import { ApiError } from '@/lib/api'
import { crearMesa, lista as estaLista, mxn, terminada, verBiblioteca, type Aspecto, type PiezaBiblioteca } from '@/lib/estudio'
import { ALTA_BRIEF, cotizarLinea, entregarZip, guardarEnFotos, pedirLinea, revisarPuertas, type LineaVisor, type Puertas } from '@/lib/visor'
import { usePedido } from './use-pedido'
import { abrirEnCrear } from '@/stores/use-mesa-abierta'

/**
 * A piece at full screen (web board «Visor», components/pantallas/visor.tsx): swipe through the pieces it was
 * opened with, the stack's takes in the strip, «Antes» held to see what it was made from, and the sheet with the
 * prompt, what to do next (each with its price before the tap), the four gates and «Editar esta toma».
 * Params: `ids` (JSON string[] of Generation ids) and `i` (the one to open).
 */

type P = PiezaBiblioteca
const c = theme.colors
const ROSA = c.accent2
const VIDRIO = 'rgba(20, 20, 20, 0.72)'
const TONOS = ['#2C2A26', '#232A28', '#262626', '#2E2926']

/** The board's icons, in its 24-grid. */
const ICONO = {
  cerrar: 'm6 6 12 12M18 6 6 18',
  mas: 'M6 12h.01M12 12h.01M18 12h.01',
  flecha: 'M12 19V5M5 12l7-7 7 7',
  chispa: 'M4.5 19.5 14 10M16 3.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z',
  palomita: 'M5 12.5 10 17 19 7',
  // The suggestions' (web app/(estudio)/biblioteca/visor.ts).
  sigueMovimiento: 'M5 5.2h14A1.5 1.5 0 0 1 20.5 6.7v10.6A1.5 1.5 0 0 1 19 18.8H5a1.5 1.5 0 0 1-1.5-1.5V6.7A1.5 1.5 0 0 1 5 5.2Zm5.4 4.3 4.6 2.5-4.6 2.5v-5Z',
  sigueAlta: 'M4.5 7.5h3L9 5.5h6l1.5 2h3A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9a1.5 1.5 0 0 1 1.5-1.5ZM12 16.2a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z',
  movimiento: ['M5 5.2h14A1.5 1.5 0 0 1 20.5 6.7v10.6A1.5 1.5 0 0 1 19 18.8H5a1.5 1.5 0 0 1-1.5-1.5V6.7A1.5 1.5 0 0 1 5 5.2Z', 'm10.4 9.5 4.6 2.5-4.6 2.5v-5Z'],
  editar: ['M4.5 19.5h3.8L18.6 9.2a2.2 2.2 0 0 0-3.1-3.1L5.2 16.4v3.1Z', 'm13.8 7.8 3.1 3.1'],
  copiar: ['M9 9.5h9A1.5 1.5 0 0 1 19.5 11v8a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 19v-8A1.5 1.5 0 0 1 9 9.5Z', 'M5.5 14.5H5A1.5 1.5 0 0 1 3.5 13V5A1.5 1.5 0 0 1 5 3.5h8A1.5 1.5 0 0 1 14.5 5v.5'],
  descargar: ['M12 3.5v10m0 0 3.8-3.8M12 13.5 8.2 9.7', 'M4.5 16.5v2A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-2'],
} as const

/** A paid next step: what it is, the line that prices it and the one that asks for it, and how it reads on its way. */
interface PedidoVisor {
  titulo: string
  detalle: string
  motor: string
  icono: string
  linea: LineaVisor
  cotiza: LineaVisor
  haciendo: string
  tarda: string
  /** The piece it was asked from: its frame shows it on its way. */
  sobre: string
}
type Revision = { estado: 'revisando' } | { estado: 'listo'; p: Puertas } | { estado: 'error'; mensaje: string }
interface Encargo {
  holdId: string
  sobre: string
  haciendo: string
  tarda: string
  inicio: number
}

const proporcion = (a: string) => {
  const [w, h] = a.split(':').map(Number)
  return w && h ? w / h : 3 / 4
}
const reloj = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
/** A still we host: only those can be shot again, edited or moved (web `sugerencias`). */
const foto = (p: P) => (!p.video && p.src?.startsWith('https://') ? p.src : null)
const corto = (t: string) => (t.length > 40 ? `${t.slice(0, 40).replace(/\s+\S*$/, '')}…` : t)
/** The server's own words when it answered (lib/errores on the web), ours otherwise. */
const motivo = (e: unknown, otro: string) => (e instanceof ApiError && e.status ? e.message : otro)

/** The stack's takes as the web strip shows them: as she arranged them, else oldest first. */
function tomasDe(todas: P[], p: P) {
  const items = todas.filter((x) => x.grupo === p.grupo).reverse()
  return items.some((x) => x.orden != null) ? items.sort((a, b) => (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER)) : items
}

/** «Rehacer en alta», only on a draft (web `sugerencias`). */
function pedidoAlta(p: P): PedidoVisor | null {
  const f = foto(p)
  if (!f || p.calidad !== 'Borrador') return null
  const linea: LineaVisor = { kind: 'producto', count: 1, refs: [f], aspect: p.aspect, calidad: 'final', brief: ALTA_BRIEF }
  return { titulo: 'Rehacer en alta', detalle: 'Rehacer esta toma en calidad alta', motor: 'Marketing Studio', icono: ICONO.sigueAlta, linea, cotiza: linea, haciendo: 'Rehaciendo en alta con Marketing Studio', tarda: 'Suele tardar 1 a 2 min', sobre: p.id }
}
/** «Ponla en movimiento»: the web Video screen's default (5 s, one subtle move). */
function pedidoReel(p: P): PedidoVisor | null {
  const f = foto(p)
  if (!f || p.antigua) return null
  const linea: LineaVisor = { kind: 'reel', count: 1, refs: [f], aspect: p.aspect, durationS: 5 }
  return { titulo: 'Ponla en movimiento', detalle: 'Un reel de 5 segundos con esta toma', motor: 'Kling 3.0', icono: ICONO.sigueMovimiento, linea, cotiza: linea, haciendo: 'Haciendo el reel con Kling 3.0', tarda: 'Suele tardar unos minutos', sobre: p.id }
}
/** Web `lineaEditar` in words only; named as Crear names an edit. */
const lineaEditar = (src: string, aspect: Aspecto, texto: string, nombrada: boolean): LineaVisor => ({
  kind: 'editar',
  count: 1,
  refs: [src],
  aspect,
  brief: texto,
  ...(nombrada ? { labels: [`Edición · ${corto(texto)}`] } : {}),
})

const usePrecio = (l: LineaVisor | null) => useQuery({ queryKey: ['cotizar', l], queryFn: () => cotizarLinea(l!), enabled: !!l, staleTime: 5 * 60_000 })
const etiqueta = (q: ReturnType<typeof usePrecio>) => (q.data ? mxn(q.data.totalCents) : q.isError ? '—' : '…')

/** The four gates in their order; after the first «no», the rest dim (web useVisor). */
const GATES = [
  ['identidad', 'Identidad'],
  ['lectura', 'Lectura'],
  ['destinatario', 'Destinatario'],
  ['publicable', 'Publicable'],
] as const
function puertasDe(rev: Revision | undefined) {
  const listo = rev?.estado === 'listo' ? rev.p : null
  const primeraFalla = listo ? GATES.findIndex(([k]) => listo[k].ok === false) : -1
  const filas = GATES.map(([k, nombre], n) => {
    if (!listo) return { nombre, porque: rev?.estado === 'revisando' ? 'Revisando…' : '', marca: String(n + 1), fondo: '#1F1F1F', tinta: '#8A8A8A', opacity: rev?.estado === 'revisando' ? 0.6 : 0.45 }
    const g = listo[k]
    const despues = primeraFalla >= 0 && n > primeraFalla
    const porque = k === 'destinatario' && listo.destinatario.publico ? `${g.porque} · ${listo.destinatario.publico}` : g.porque
    if (g.ok === null) return { nombre, porque, marca: '?', fondo: '#1F1F1F', tinta: '#A3A3A3', opacity: 1 }
    return g.ok
      ? { nombre, porque, marca: '✓', fondo: '#12201A', tinta: '#4ADE80', opacity: despues ? 0.4 : 1 }
      : { nombre, porque, marca: '✕', fondo: '#2A1320', tinta: ROSA, opacity: despues ? 0.4 : 1 }
  })
  // A failed identity has nothing to fix in the prompt: that piece goes back to the photobook.
  const arreglo = listo && listo.identidad.ok !== false ? listo.arreglo : ''
  const aviso = rev?.estado === 'error' ? rev.mensaje : listo?.identidad.ok === false ? 'Falla la identidad: no hay nada que elegir. Se vuelve al photobook.' : ''
  return { filas, arreglo, aviso }
}

export default function VisorScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const params = useLocalSearchParams<{ ids?: string; i?: string }>()

  const inicial = useMemo(() => {
    try {
      const a: unknown = JSON.parse(params.ids ?? '[]')
      return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : []
    } catch {
      return []
    }
  }, [params.ids])
  // The walk, and the piece on screen by id: a take picked from the strip, or one that just arrived, joins it.
  const [orden, setOrden] = useState(inicial)
  const [actual, setActual] = useState(() => inicial[Number(params.i) || 0] ?? inicial[0])

  const q = useQuery({ queryKey: ['biblioteca'], queryFn: verBiblioteca })
  const porId = useMemo(() => new Map((q.data ?? []).map((p) => [p.id, p])), [q.data])
  // A piece made a moment ago may not be in the list we had: look once more.
  const reintento = useRef(false)
  const falta = !!q.data && orden.some((id) => !porId.has(id))
  const { refetch } = q
  useEffect(() => {
    if (!falta || reintento.current) return
    reintento.current = true
    void refetch()
  }, [falta, refetch])

  const idx = Math.max(0, orden.indexOf(actual))
  const p = actual ? porId.get(actual) : undefined
  const tomas = useMemo(() => (p ? tomasDe(q.data ?? [], p) : []), [p, q.data])

  const [area, setArea] = useState<{ w: number; h: number } | null>(null)
  const listaRef = useRef<FlatList<string>>(null)
  const [antes, setAntes] = useState(false)
  const [abierta, setAbierta] = useState(true)
  const [promptEntero, setPromptEntero] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [entregando, setEntregando] = useState(false)
  const [recreando, setRecreando] = useState(false)
  const [revisiones, setRevisiones] = useState<Record<string, Revision>>({})
  const [edicion, setEdicion] = useState<{ id: string; texto: string } | null>(null)
  const [confirmar, setConfirmar] = useState<PedidoVisor | null>(null)
  const [encargo, setEncargo] = useState<Encargo | null>(null)
  const [irA, setIrA] = useState<string | null>(null)

  // --- what was asked from here, on its way ---
  const pedido = usePedido(encargo?.holdId ?? null)
  const llegada = pedido.data?.[0]
  const enCamino = !!encargo && !(llegada && terminada(llegada))
  const fallo = !!encargo && llegada?.status === 'failed'
  const [ahora, setAhora] = useState(Date.now())
  useEffect(() => {
    if (!enCamino) return
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [enCamino])
  const llegadaId = llegada && estaLista(llegada) ? llegada.id : null
  useEffect(() => {
    if (!llegadaId) return
    for (const key of ['biblioteca', 'trabajos', 'saldo']) qc.invalidateQueries({ queryKey: [key] })
    setIrA(llegadaId)
  }, [llegadaId, qc])
  // Arrived: the viewer goes to it, beside the one it was asked from.
  useEffect(() => {
    if (!irA || !porId.has(irA) || !encargo) return
    const sobre = encargo.sobre
    setOrden((o) => (o.includes(irA) ? o : o.flatMap((id) => (id === sobre ? [id, irA] : [id]))))
    setActual(irA)
    setEncargo(null)
    setIrA(null)
  }, [irA, porId, encargo])
  const camino =
    encargo && (enCamino || fallo)
      ? {
          sobre: encargo.sobre,
          reloj: enCamino ? reloj(ahora - encargo.inicio) : '',
          titulo: fallo ? 'No salió · no se cobró' : encargo.haciendo,
          detalle: fallo ? 'El modelo no entregó la pieza.' : `${encargo.tarda} · se cobra sólo si llega. Puedes moverte por la tira y volver.`,
          fallo,
        }
      : null

  const ir = (id: string | undefined) => {
    if (!id || id === actual) return
    setOrden((o) => (o.includes(id) ? o : [...o.slice(0, idx + 1), id, ...o.slice(idx + 1)]))
    setActual(id)
    setAntes(false)
    if (fallo) setEncargo(null)
  }
  // A pick from the strip (or a piece that arrived) moves the pages; a swipe is already there.
  useEffect(() => {
    if (area && orden.length) listaRef.current?.scrollToIndex({ index: idx, animated: false })
  }, [idx, area, orden.length])

  // --- next steps, priced before the tap ---
  const alta = p ? pedidoAlta(p) : null
  const reel = p ? pedidoReel(p) : null
  const precioAlta = usePrecio(alta?.cotiza ?? null)
  const precioReel = usePrecio(reel?.cotiza ?? null)
  const chips = [alta ? { ...alta, precio: etiqueta(precioAlta) } : null, reel ? { ...reel, precio: etiqueta(precioReel) } : null].filter((x) => !!x)

  const fotoP = p ? foto(p) : null
  const editable = !!fotoP && !p?.antigua
  const edi = edicion && edicion.id === p?.id ? edicion : null
  // The price does not depend on the words: quoted with a stand-in, so typing does not re-ask it (as on the web).
  const precioEditar = usePrecio(edi && fotoP && p ? lineaEditar(fotoP, p.aspect, '·', false) : null)
  const precioConfirmar = usePrecio(confirmar?.cotiza ?? null)

  const mandar = useMutation({
    mutationFn: (x: PedidoVisor) => pedirLinea(x.linea),
    onSuccess: (r, x) => {
      setEncargo({ holdId: r.holdId, sobre: x.sobre, haciendo: x.haciendo, tarda: x.tarda, inicio: Date.now() })
      setAhora(Date.now())
      setConfirmar(null)
      if (x.linea.kind === 'editar') setEdicion(null)
      qc.invalidateQueries({ queryKey: ['saldo'] })
      qc.invalidateQueries({ queryKey: ['trabajos'] })
    },
  })
  const cerrarConfirmar = () => {
    setConfirmar(null)
    mandar.reset()
  }
  const sinSaldo = mandar.error instanceof ApiError && mandar.error.status === 402

  /** Out of the viewer to another screen. */
  const salir = (href: Href) => {
    router.back()
    router.navigate(href)
  }

  // --- free actions ---
  const copiar = async () => {
    if (!p) return
    if (!p.prompt) return Alert.alert('Sin prompt', 'Esta pieza es de antes de la nueva versión y no guardó su prompt.')
    await Clipboard.setStringAsync(p.prompt)
    setCopiado(p.id)
    setTimeout(() => setCopiado((x) => (x === p.id ? null : x)), 1600)
  }
  const descargar = async () => {
    const url = p?.video ?? p?.src
    if (!p || !url || guardando) return
    setGuardando(true)
    try {
      if (await guardarEnFotos(url, p.id)) Alert.alert('Listo', 'Se guardó en tus fotos.')
      else Alert.alert('Sin permiso', 'Permite el acceso a tus fotos para guardarla.')
    } catch {
      Alert.alert('No se guardó', 'No pudimos guardarla. Intenta otra vez.')
    } finally {
      setGuardando(false)
    }
  }
  const compartir = (url: string) => void Share.share(Platform.OS === 'ios' ? { url } : { message: url }).catch(() => {})
  const mas = () => {
    const url = p?.video ?? p?.src
    if (!url) return
    const opciones: [string, () => void][] = [
      ['Guardar en tus fotos', () => void descargar()],
      ['Compartir', () => compartir(url)],
      ['Copiar el prompt', () => void copiar()],
    ]
    if (Platform.OS === 'ios')
      return ActionSheetIOS.showActionSheetWithOptions({ options: [...opciones.map(([t]) => t), 'Cancelar'], cancelButtonIndex: opciones.length, userInterfaceStyle: 'dark' }, (n) => opciones[n]?.[1]())
    // Android shows three buttons at most; copying is also in the sheet.
    Alert.alert('Esta pieza', undefined, [...opciones.slice(0, 2).map(([text, onPress]) => ({ text, onPress })), { text: 'Cerrar', style: 'cancel' as const }])
  }
  // Delivering a still to a client: original, 9:16 and 4:5, named, in one zip — handed to the share sheet.
  const entregar = async () => {
    if (!p?.src || entregando) return
    setEntregando(true)
    try {
      await Share.share({ url: await entregarZip(p.src, p.module, p.id) })
    } catch {
      Alert.alert('No se armó la entrega', 'No pudimos armar la entrega. Intenta otra vez.')
    } finally {
      setEntregando(false)
    }
  }
  // As on the web: a new mesa with this image as the product; Crear prices every request before it runs.
  const recrear = async () => {
    if (!fotoP || recreando) return
    setRecreando(true)
    try {
      const id = await crearMesa({ photoUrl: fotoP, refs: [] })
      qc.invalidateQueries({ queryKey: ['mesas'] })
      abrirEnCrear(id)
    } catch {
      Alert.alert('No se abrió la mesa', 'No pudimos abrir una mesa con esta imagen. Intenta otra vez.')
    } finally {
      setRecreando(false)
    }
  }
  /** The four gates, asked once per piece while the viewer is open. */
  const revisar = async (pieza: P) => {
    if (!pieza.src) return
    setRevisiones((m) => ({ ...m, [pieza.id]: { estado: 'revisando' } }))
    try {
      const r = await revisarPuertas(pieza.src, pieza.refs)
      setRevisiones((m) => ({ ...m, [pieza.id]: { estado: 'listo', p: r } }))
    } catch (e) {
      setRevisiones((m) => ({ ...m, [pieza.id]: { estado: 'error', mensaje: motivo(e, 'No pudimos revisarla. Intenta otra vez.') } }))
    }
  }

  const rev = p ? revisiones[p.id] : undefined
  const puertas = puertasDe(rev)
  const antesUrl = p && !p.video && p.refs[0] && p.refs[0] !== p.src ? p.refs[0] : null
  const puedeEditar = !!edi?.texto.trim() && !!precioEditar.data && !mandar.isPending

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.medio} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <RadialGradient id="fondo" cx="50%" cy="30%" rx="120%" ry="70%" fx="50%" fy="30%">
                <Stop offset="0" stopColor="#141414" />
                <Stop offset="0.75" stopColor="#0A0A0A" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#fondo)" />
          </Svg>
          {area && orden.length ? (
            <FlatList
              ref={listaRef}
              data={orden}
              keyExtractor={(id) => id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={idx}
              getItemLayout={(_, n) => ({ length: area.w, offset: area.w * n, index: n })}
              onMomentumScrollEnd={(e) => ir(orden[Math.round(e.nativeEvent.contentOffset.x / area.w)])}
              initialNumToRender={1}
              windowSize={3}
              extraData={{ actual, antes, camino, q: q.status }}
              renderItem={({ item, index }) => (
                <Pagina
                  pieza={porId.get(item)}
                  n={index}
                  area={area}
                  activa={item === actual}
                  antes={item === actual && antes ? antesUrl : null}
                  camino={camino?.sobre === item ? camino : null}
                  estado={q.isPending || q.isFetching ? 'cargando' : q.isError && !q.data ? 'error' : 'perdida'}
                  onReintentar={() => void refetch()}
                />
              )}
            />
          ) : area ? (
            <View style={[styles.centro, { flex: 1 }]}>
              <Text style={styles.nota}>No hay nada que mostrar aquí.</Text>
            </View>
          ) : null}
        </View>

        {p ? (
          <View style={[styles.hoja, { marginBottom: 8 + insets.bottom, maxHeight: height * 0.66 }]}>
            <ScrollView contentContainerStyle={styles.hojaDentro} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Pressable
                onPress={() => setAbierta((a) => !a)}
                accessibilityRole="button"
                accessibilityLabel={abierta ? 'Bajar la hoja' : 'Subir la hoja'}
                hitSlop={{ top: 14, bottom: 14, left: 60, right: 60 }}
                style={styles.asa}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>
                {tomas.map((t, n) => {
                  const on = t.id === actual
                  const img = t.video ? t.poster : t.src
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => ir(t.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t.name}
                      accessibilityState={{ selected: on }}
                      style={[styles.toma, { backgroundColor: TONOS[n % TONOS.length], borderColor: on ? c.accent : 'transparent', opacity: on ? 1 : 0.6 }]}
                    >
                      {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                    </Pressable>
                  )
                })}
              </ScrollView>

              <View style={styles.titulo}>
                <Text numberOfLines={1} style={styles.nombre}>
                  {p.name}
                </Text>
                <Text style={styles.meta}>{p.meta}</Text>
              </View>

              {abierta ? (
                <>
                  {p.prompt ? (
                    <Text onPress={() => setPromptEntero((x) => !x)} numberOfLines={promptEntero ? undefined : 2} style={styles.prompt}>
                      {p.prompt}
                    </Text>
                  ) : null}

                  {chips.length ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>
                      {chips.map((s, n) => (
                        <Pressable
                          key={s.titulo}
                          onPress={() => setConfirmar(s)}
                          accessibilityRole="button"
                          accessibilityLabel={s.detalle}
                          hitSlop={{ top: 4, bottom: 4 }}
                          style={[styles.chip, { borderColor: n === 0 ? c.accent : c.border }]}
                        >
                          <Icono d={s.icono} lado={14} ancho={1.6} color={c.textMuted} />
                          <Text style={styles.chipTexto}>{s.titulo}</Text>
                          <Text style={styles.chipPrecio}>{s.precio}</Text>
                          <Flecha lado={22} icono={11} fondo={ROSA} color={c.bg} />
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : null}

                  {p.src && !p.video ? (
                    <View style={styles.tarjeta}>
                      <View style={styles.tarjetaCabeza}>
                        <Text style={styles.rotulo}>Las cuatro puertas</Text>
                        <Pressable onPress={() => void revisar(p)} disabled={rev?.estado === 'revisando'} accessibilityRole="button" hitSlop={8} style={styles.revisar}>
                          <Text style={styles.revisarTexto}>{rev?.estado === 'revisando' ? 'Revisando…' : rev?.estado === 'listo' ? 'Revisar otra vez' : 'Revisar antes de entregar'}</Text>
                          <Flecha lado={18} icono={9} fondo={c.accent} color={c.bg} />
                        </Pressable>
                      </View>
                      {puertas.filas.map((g) => (
                        <View key={g.nombre} style={[styles.puerta, { opacity: g.opacity }]}>
                          <View style={[styles.marca, { backgroundColor: g.fondo }]}>
                            <Text style={[styles.marcaTexto, { color: g.tinta }]}>{g.marca}</Text>
                          </View>
                          <View style={{ flex: 1, gap: 1 }}>
                            <Text style={styles.puertaNombre}>{g.nombre}</Text>
                            {g.porque ? <Text style={styles.porque}>{g.porque}</Text> : null}
                          </View>
                        </View>
                      ))}
                      {puertas.aviso ? <Text style={styles.aviso}>{puertas.aviso}</Text> : null}
                      {puertas.arreglo ? (
                        <View style={styles.arreglo}>
                          <Text style={[styles.rotulo, { fontSize: 10, letterSpacing: 0.6 }]}>Para la siguiente toma</Text>
                          <Text style={styles.arregloTexto}>{puertas.arreglo}</Text>
                          {/* The web writes the fix into the mesa's next take; the app's mesa can't take it yet. */}
                          <View accessible accessibilityRole="button" accessibilityLabel="Arreglar esto" accessibilityState={{ disabled: true }} style={[styles.botonRosa, { minHeight: 40, opacity: 0.45 }]}>
                            <Icono d={ICONO.chispa} lado={15} ancho={1.8} color={c.bg} />
                            <Text style={styles.botonRosaTexto}>Arreglar esto</Text>
                            <Flecha lado={24} icono={12} fondo={c.bg} color={ROSA} />
                          </View>
                          <Text style={styles.letraChica}>Por ahora se arregla desde la web, en la mesa de esta toma.</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {edi && fotoP ? (
                    <View style={[styles.tarjeta, { gap: 10 }]}>
                      <View style={styles.tarjetaCabeza}>
                        <Text style={styles.rotulo}>Editar esta toma</Text>
                        <Text style={styles.motor}>Nano Banana Pro</Text>
                      </View>
                      <TextInput
                        multiline
                        value={edi.texto}
                        onChangeText={(texto) => setEdicion({ id: edi.id, texto })}
                        placeholder="Qué cambias: «la suela por la de la foto»"
                        placeholderTextColor="#6E6E6E"
                        accessibilityLabel="Qué cambias"
                        style={styles.campo}
                      />
                      <Text style={styles.ayuda}>La toma se queda igual: misma luz, ángulo y fondo. Sólo cambia lo que escribes.</Text>
                      {precioEditar.isError ? <Text style={[styles.ayuda, { color: ROSA }]}>No pudimos calcular el precio. Intenta otra vez.</Text> : null}
                      <Pressable
                        onPress={() =>
                          setConfirmar({
                            titulo: 'Editar esta toma',
                            detalle: `«${corto(edi.texto.trim())}»`,
                            motor: 'Nano Banana Pro',
                            icono: ICONO.editar[0],
                            linea: lineaEditar(fotoP, p.aspect, edi.texto.trim(), true),
                            cotiza: lineaEditar(fotoP, p.aspect, '·', false),
                            haciendo: 'Editando con Nano Banana Pro',
                            tarda: 'Suele tardar alrededor de 1 min',
                            sobre: p.id,
                          })
                        }
                        disabled={!puedeEditar}
                        accessibilityRole="button"
                        accessibilityLabel="Mandar la edición"
                        accessibilityState={{ disabled: !puedeEditar }}
                        style={[styles.botonRosa, { minHeight: 42, opacity: puedeEditar ? 1 : 0.45 }]}
                      >
                        <Text style={styles.botonRosaTexto}>{precioEditar.data ? `Editar · ${mxn(precioEditar.data.totalCents)}` : 'Editar'}</Text>
                        <Flecha lado={24} icono={12} fondo={c.bg} color={ROSA} />
                      </Pressable>
                    </View>
                  ) : null}

                  {/* iOS hands the zip to the share sheet; Android's Share can't carry a file. */}
                  {p.src && !p.video && Platform.OS === 'ios' ? (
                    <Pressable onPress={() => void entregar()} disabled={entregando} accessibilityRole="button" accessibilityLabel="Entregar al cliente" style={styles.entregar}>
                      <Text style={styles.entregarTexto}>{entregando ? 'Armando la entrega…' : 'Entregar · original, 9:16 y 4:5'}</Text>
                      <Flecha lado={24} icono={12} fondo={c.accent} color={c.bg} />
                    </Pressable>
                  ) : null}

                  <View style={styles.acciones}>
                    {fotoP ? (
                      <Pressable onPress={() => void recrear()} disabled={recreando} accessibilityRole="button" accessibilityLabel="Recrear con esta composición" style={[styles.botonRosa, styles.recrear]}>
                        <Text style={[styles.botonRosaTexto, { fontSize: 14 }]}>{recreando ? 'Abriendo una mesa…' : 'Recrear'}</Text>
                        <Flecha lado={26} icono={13} fondo={c.bg} color={ROSA} />
                      </Pressable>
                    ) : null}
                    {reel ? (
                      <Redondo lado={46} fondo={c.bgElevated} label="Ponla en movimiento" onPress={() => setConfirmar(reel)}>
                        <Icono d={ICONO.movimiento} />
                      </Redondo>
                    ) : null}
                    {editable ? (
                      <Redondo lado={46} fondo={c.bgElevated} borde={edi ? c.accent : c.border} label="Editar esta toma" onPress={() => setEdicion(edi ? null : { id: p.id, texto: '' })}>
                        <Icono d={ICONO.editar} />
                      </Redondo>
                    ) : null}
                    <Redondo lado={46} fondo={c.bgElevated} label={copiado === p.id ? 'Copiado' : 'Copiar el prompt'} onPress={() => void copiar()}>
                      <Icono d={copiado === p.id ? ICONO.palomita : ICONO.copiar} />
                    </Redondo>
                    <Redondo lado={46} fondo={c.bgElevated} label="Descargar" onPress={() => void descargar()}>
                      {guardando ? <ActivityIndicator size="small" color={c.text} /> : <Icono d={ICONO.descargar} />}
                    </Redondo>
                  </View>
                  {orden.length > 1 ? <Text style={styles.pie}>Desliza para ver las demás</Text> : null}
                </>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <View style={[styles.cabecera, { paddingTop: insets.top + 14 }]} pointerEvents="box-none">
        <LinearGradient colors={['rgba(10, 10, 10, 0.85)', 'rgba(10, 10, 10, 0)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <Redondo lado={40} fondo={VIDRIO} label="Cerrar el visor" onPress={() => router.back()}>
          <Icono d={ICONO.cerrar} lado={17} ancho={1.75} />
        </Redondo>
        <View style={{ flex: 1, alignItems: 'center' }} pointerEvents="none">
          {p ? (
            <View style={styles.contador}>
              <Text style={styles.contadorTexto}>{`${idx + 1} / ${orden.length}`}</Text>
              {p.calidad || p.priceCents != null ? <Text style={[styles.contadorTexto, { color: '#6E6E6E' }]}>·</Text> : null}
              {p.calidad ? <Text style={styles.contadorTexto}>{p.calidad}</Text> : null}
              {p.priceCents != null ? <Text style={[styles.contadorTexto, { color: ROSA }]}>{mxn(p.priceCents)}</Text> : null}
            </View>
          ) : null}
        </View>
        {antesUrl ? (
          <Pressable
            onPressIn={() => setAntes(true)}
            onPressOut={() => setAntes(false)}
            accessibilityRole="button"
            accessibilityLabel="Mantén presionado para ver la toma de antes"
            accessibilityState={{ selected: antes }}
            hitSlop={4}
            style={styles.antes}
          >
            <Text style={styles.antesTexto}>Antes</Text>
          </Pressable>
        ) : null}
        <Redondo lado={40} fondo={VIDRIO} label="Más opciones" onPress={mas}>
          <Icono d={ICONO.mas} lado={17} ancho={2} />
        </Redondo>
      </View>

      <Modal visible={!!confirmar} transparent animationType="slide" onRequestClose={cerrarConfirmar}>
        <View style={styles.modal}>
          <Pressable style={[StyleSheet.absoluteFill, styles.velo]} onPress={cerrarConfirmar} accessibilityLabel="Cerrar" />
          {confirmar ? (
            <View style={[styles.confirmar, { paddingBottom: 16 + insets.bottom }]}>
              <View style={[styles.asa, { marginBottom: 4 }]} />
              <View style={styles.confirmarCabeza}>
                <Icono d={confirmar.icono} lado={18} color={c.textMuted} />
                <Text style={styles.confirmarTitulo}>{confirmar.titulo}</Text>
              </View>
              <Text style={styles.confirmarDetalle}>{confirmar.detalle}</Text>
              <Text style={styles.motor}>{confirmar.motor}</Text>
              <Text style={styles.letraChica}>Se aparta de tu saldo al pedir; sólo se cobra lo que llega.</Text>
              {precioConfirmar.isError ? <Text style={styles.aviso}>No pudimos calcular el precio. Intenta otra vez.</Text> : null}
              {mandar.error ? <Text style={styles.aviso}>{motivo(mandar.error, 'No se mandó. No se cobró nada; intenta otra vez.')}</Text> : null}
              {sinSaldo ? <Accion label="Ver mi saldo" tono="rosa" onPress={() => salir('/saldo')} /> : null}
              <Accion
                label="Pedir"
                detalle={precioConfirmar.data ? mxn(precioConfirmar.data.totalCents) : etiqueta(precioConfirmar)}
                tono="rosa"
                lleno
                cargando={mandar.isPending}
                disabled={!precioConfirmar.data}
                onPress={() => mandar.mutate(confirmar)}
              />
              <Pressable onPress={cerrarConfirmar} accessibilityRole="button" style={styles.cancelar}>
                <Text style={styles.cancelarTexto}>Cancelar</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  )
}

/** One page of the walk: the piece in a frame of its own shape, filling the height it gets. */
function Pagina({
  pieza,
  n,
  area,
  activa,
  antes,
  camino,
  estado,
  onReintentar,
}: {
  pieza: P | undefined
  n: number
  area: { w: number; h: number }
  activa: boolean
  antes: string | null
  camino: { reloj: string; titulo: string; detalle: string; fallo: boolean } | null
  estado: 'cargando' | 'error' | 'perdida'
  onReintentar: () => void
}) {
  if (!pieza)
    return (
      <View style={[styles.centro, { width: area.w, height: area.h }]}>
        {estado === 'cargando' ? (
          <ActivityIndicator color={c.textDim} />
        ) : estado === 'error' ? (
          <>
            <Text style={styles.nota}>No pudimos abrir esta pieza.</Text>
            <Pressable onPress={onReintentar} accessibilityRole="button" style={styles.cancelar}>
              <Text style={[styles.cancelarTexto, { color: c.text }]}>Intentar otra vez</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.nota}>Esta pieza ya no está en tu biblioteca.</Text>
        )}
      </View>
    )
  const r = proporcion(pieza.aspect)
  const alto = Math.min(area.h, area.w / r)
  const poster = pieza.poster ?? pieza.src
  return (
    <View style={[styles.centro, { width: area.w, height: area.h }]}>
      <View style={[styles.marco, { width: alto * r, height: alto, backgroundColor: TONOS[n % TONOS.length] }]}>
        {pieza.video ? (
          activa ? (
            <Video uri={pieza.video} />
          ) : poster ? (
            <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="contain" />
          ) : null
        ) : pieza.src ? (
          <Image source={{ uri: pieza.src }} style={StyleSheet.absoluteFill} contentFit="contain" />
        ) : null}
        {antes ? <Image source={{ uri: antes }} style={StyleSheet.absoluteFill} contentFit="contain" /> : null}
        {camino ? (
          <View style={StyleSheet.absoluteFill}>
            {/* The shot it started from, dimmed, with what is happening over it. */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.45)' }]} />
            <LinearGradient colors={['rgba(10, 10, 10, 0)', 'rgba(10, 10, 10, 0.7)']} locations={[0.35, 1]} style={[StyleSheet.absoluteFill, styles.caminoFondo]}>
              <View style={styles.caminoCaja}>
                {camino.reloj ? <Text style={styles.caminoReloj}>{camino.reloj}</Text> : null}
                <Text style={[styles.caminoTitulo, camino.fallo && { color: ROSA }]}>{camino.titulo}</Text>
                <Text style={styles.caminoDetalle}>{camino.detalle}</Text>
              </View>
            </LinearGradient>
          </View>
        ) : null}
      </View>
    </View>
  )
}

/** Mounted only on the page on screen, so one player runs at a time. */
function Video({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (pl) => {
    pl.loop = true
    pl.play()
  })
  return <VideoView player={player} style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} contentFit="contain" nativeControls />
}

function Icono({ d, lado = 16, ancho = 1.6, color = c.text }: { d: string | readonly string[]; lado?: number; ancho?: number; color?: string }) {
  return (
    <Svg width={lado} height={lado} viewBox="0 0 24 24" fill="none">
      {(typeof d === 'string' ? [d] : d).map((x) => (
        <Path key={x} d={x} stroke={color} strokeWidth={ancho} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  )
}

/** The board's round arrow inside a button (its `.accion`). */
function Flecha({ lado, icono, fondo, color }: { lado: number; icono: number; fondo: string; color: string }) {
  return (
    <View style={{ width: lado, height: lado, borderRadius: lado / 2, backgroundColor: fondo, alignItems: 'center', justifyContent: 'center' }}>
      <Icono d={ICONO.flecha} lado={icono} ancho={2.25} color={color} />
    </View>
  )
}

function Redondo({ lado, fondo, borde = c.border, label, onPress, children }: { lado: number; fondo: string; borde?: string; label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={lado < 44 ? (44 - lado) / 2 : 0}
      style={({ pressed }) => [{ width: lado, height: lado, borderRadius: lado / 2, borderWidth: 1, borderColor: borde, backgroundColor: fondo, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 }]}
    >
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  centro: { alignItems: 'center', justifyContent: 'center' },
  nota: { fontSize: 14, color: c.textDim, textAlign: 'center', paddingHorizontal: 24 },

  cabecera: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 14 },
  contador: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: VIDRIO },
  contadorTexto: { fontFamily: FONT.mono, fontSize: 12, color: c.text },
  antes: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: VIDRIO, justifyContent: 'center' },
  antesTexto: { fontSize: 13, color: c.text },

  medio: { flex: 1, minHeight: 0, overflow: 'hidden' },
  marco: { overflow: 'hidden' },
  caminoFondo: { justifyContent: 'flex-end', alignItems: 'center', padding: 20 },
  caminoCaja: { alignItems: 'center', gap: 6, maxWidth: 320, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: 'rgba(20, 20, 20, 0.9)' },
  caminoReloj: { fontFamily: FONT.monoMedium, fontSize: 24, color: c.text },
  caminoTitulo: { fontSize: 13.5, fontWeight: '500', color: c.text, textAlign: 'center' },
  caminoDetalle: { fontSize: 12, lineHeight: 17, color: c.textMuted, textAlign: 'center' },

  hoja: {
    zIndex: 2,
    flexShrink: 1,
    marginHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: 'rgba(20, 20, 20, 0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  hojaDentro: { gap: 12, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 16 },
  asa: { width: 36, height: 4, borderRadius: 999, backgroundColor: c.borderStrong, alignSelf: 'center' },
  toma: { width: 44, height: 58, borderRadius: 7, borderWidth: 2, overflow: 'hidden' },
  titulo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  nombre: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: c.text },
  meta: { flexShrink: 0, fontFamily: FONT.mono, fontSize: 12, color: c.textDim },
  prompt: { fontFamily: FONT.mono, fontSize: 12.5, lineHeight: 20, color: '#C7C7C7' },

  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, backgroundColor: c.bgRaised },
  chipTexto: { fontSize: 12.5, color: c.text },
  chipPrecio: { fontFamily: FONT.mono, fontSize: 11.5, color: c.textDim },

  tarjeta: { gap: 8, paddingVertical: 12, paddingHorizontal: 14, marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: '#0F0F0F' },
  tarjetaCabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rotulo: { flexShrink: 1, fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: 0.63, textTransform: 'uppercase', color: c.textDim },
  motor: { fontFamily: FONT.mono, fontSize: 11, color: '#6E6E6E' },
  revisar: { minHeight: 30, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong, flexDirection: 'row', alignItems: 'center', gap: 6 },
  revisarTexto: { fontSize: 12, color: c.text },
  puerta: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  marca: { width: 20, height: 20, marginTop: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  marcaTexto: { fontSize: 11, fontWeight: '600' },
  puertaNombre: { fontSize: 12.5, fontWeight: '500', color: c.text },
  porque: { fontSize: 11.5, lineHeight: 16, color: c.textMuted },
  aviso: { fontSize: 11.5, lineHeight: 16, color: ROSA },
  arreglo: { gap: 8, marginTop: 2, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong, backgroundColor: c.bgRaised },
  arregloTexto: { fontSize: 12.5, lineHeight: 18, color: c.text },
  letraChica: { fontSize: 11, lineHeight: 15, color: '#6E6E6E' },

  campo: { minHeight: 60, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, color: c.text, fontSize: 13, lineHeight: 19, textAlignVertical: 'top' },
  ayuda: { fontSize: 11.5, lineHeight: 17, color: '#6E6E6E' },
  botonRosa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, backgroundColor: ROSA },
  botonRosaTexto: { fontSize: 13, fontWeight: '600', color: c.bg },

  entregar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, marginHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.bgRaised },
  entregarTexto: { fontSize: 13, color: c.text },
  acciones: { flexDirection: 'row', gap: 8 },
  recrear: { flexGrow: 1, minHeight: 46 },
  pie: { textAlign: 'center', fontSize: 11.5, color: '#6E6E6E' },

  modal: { flex: 1, justifyContent: 'flex-end' },
  velo: { backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  confirmar: { gap: 10, paddingTop: 10, paddingHorizontal: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised },
  confirmarCabeza: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmarTitulo: { fontSize: 17, fontWeight: '600', color: c.text },
  confirmarDetalle: { fontSize: 13.5, lineHeight: 19, color: c.textMuted },
  cancelar: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelarTexto: { fontSize: 14, color: c.textMuted },
})
