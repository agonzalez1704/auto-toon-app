import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import Svg, { Path, Rect } from 'react-native-svg'
import { FONT, Text, TextInput } from '@/components/text'
import { theme } from '@/constants/theme'
import { uploadImage } from '@/lib/upload'
import {
  abrirMesa,
  analizarFoto,
  configCrear,
  crearMesa,
  guardarMesa,
  lista,
  listarMesas,
  mxn,
  pedirPropuestas,
  reintentarPieza,
  terminada,
  type Apartado,
  type Aspecto,
  type MesaAbierta,
  type Pieza,
  type Propuesta,
} from '@/lib/estudio'
import { cotizarLinea, descargar, guardarHoja, pedirLinea, textoDe, verHold, type Cuerpo, type Linea, type Luz } from './crear/api'
import { Botella, BotonGenerar, Chip, Flecha, Pulso } from './crear/partes'
import { corriendo, LUCES, Resultados, type PiezaMesa } from './crear/resultados'
import { useMesaAbierta } from '@/stores/use-mesa-abierta'

/**
 * Crear (boards «Main» and «Resultados»): the mesa on the table — its product, photobook, the ideas made for it
 * with the price in the button — and, once something is asked, what arrives. It is the Crear tab (`/?mesa=`) and
 * `/mesa/[id]`: no id opens the mesa marked `actual`, `nueva` starts one from a photo. The server writes every
 * prompt from what is sent (refs, the idea's scene, the category); the app only picks.
 */

const c = theme.colors
const HOJA = 'Photobook'
const ASPECTOS: Aspecto[] = ['1:1', '3:4', '9:16', '16:9']
/** The face plus three angles ride together (the web's MAX_FOTOS = 4). */
const MAX_ANGULOS = 3

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
/** A relight or an edit over a piece that already exists. */
const esEdicion = (label: string) => label.startsWith('Relight') || label.startsWith('Edición')
/** The photobook and a «Cuadrícula» still to be chosen from have their own places; everything else is a result. */
const enResultados = (label: string) => label !== HOJA && label !== 'Cuadrícula' && label !== 'Cuadrícula (eligiendo)'
/** «3 × $4.19 + 1 × $5.00» (lib/jobs/price `desglose`). */
function desglose(ls: { count: number; unitCents: number }[]) {
  const g: { count: number; unitCents: number }[] = []
  for (const l of ls) {
    const x = g.find((y) => y.unitCents === l.unitCents)
    if (x) x.count += l.count
    else g.push({ ...l })
  }
  return g.map((x) => `${x.count} × ${mxn(x.unitCents)}`).join(' + ')
}

/** What the web keeps in the mesa's analysis: the photo's reading, and the product read from its photos. */
interface Analisis {
  /** The photo it read: another photo means another reading. */
  url?: string
  name?: string | null
  slots?: Record<string, string>
  lectura?: { ficha: string; fichaDe: string; hoja: { url: string; coincide: boolean; porque: string } | null }
}
interface Opcion {
  id: string
  name: string
  desc: string
  escena?: string
  comp?: string
}

async function elegirFotos(cuantas = 1) {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: cuantas > 1, selectionLimit: cuantas })
  return r.canceled ? [] : r.assets.map((a) => a.uri)
}

export default function MesaScreen() {
  const params = useLocalSearchParams<{ mesa?: string; id?: string }>()
  const router = useRouter()
  const enTab = params.id === undefined
  // /mesa/[id] is that mesa; the tab shows the one picked (Mesas, Recrear), else a deep link's ?mesa=, else `actual`.
  const elegida = useMesaAbierta((s) => s.id)
  const pedida = params.id ?? elegida ?? params.mesa
  const mesas = useQuery({ queryKey: ['mesas'], queryFn: listarMesas, enabled: !pedida })
  const id = pedida ?? (mesas.data ? (mesas.data.find((m) => m.actual)?.id ?? 'nueva') : undefined)
  const mesa = useQuery({ queryKey: ['mesa', id], queryFn: () => abrirMesa(id!), enabled: !!id && id !== 'nueva' })
  const volver = enTab ? undefined : () => router.back()

  if (id === 'nueva') return <Crear key="nueva" m={null} enTab={enTab} onVolver={volver} />
  if (mesa.data) return <Crear key={mesa.data.id} m={mesa.data} enTab={enTab} onVolver={volver} />
  const fallo = mesas.error ?? mesa.error
  return (
    <Marco>
      <Encabezado onVolver={volver} />
      <View style={styles.espera}>
        {fallo ? (
          <>
            <Text style={styles.esperaTexto}>No pudimos abrir tu mesa.</Text>
            <Pressable onPress={() => (pedida ? mesa.refetch() : mesas.refetch())} accessibilityRole="button" style={styles.esperaBoton}>
              <Text style={styles.esperaBotonTexto}>Intentar otra vez</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/mesas')} accessibilityRole="button" style={styles.esperaBoton}>
              <Text style={[styles.esperaBotonTexto, { color: c.textMuted }]}>Ver mis mesas</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={c.textDim} />
        )}
      </View>
    </Marco>
  )
}

function Crear({ m, enTab, onVolver }: { m: MesaAbierta | null; enTab: boolean; onVolver?: () => void }) {
  const router = useRouter()
  const qc = useQueryClient()
  const config = useQuery({ queryKey: ['crear-config'], queryFn: configCrear, staleTime: 10 * 60_000 })
  const [vista, setVista] = useState<'form' | 'results'>('form')
  const [subiendo, setSubiendo] = useState<'foto' | 'angulo' | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fallaLectura, setFallaLectura] = useState(false)
  const [ideas, setIdeas] = useState<{ version: number; propuestas: Propuesta[]; respuesta: string } | null>(null)
  const [pensando, setPensando] = useState(false)
  const [ideasError, setIdeasError] = useState<string | null>(null)
  const [pedidos, setPedidos] = useState<string[]>(m?.pedidos ?? [])
  const [pide, setPide] = useState('')
  const [categoryPick, setCategoryPick] = useState<string | null>(null)
  const [verCategorias, setVerCategorias] = useState(false)
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [aspects, setAspects] = useState<Aspecto[]>(['3:4'])
  const [enviando, setEnviando] = useState(false)
  // What this visit asked: each hold, and each piece's name until the mesa lists it.
  const [holds, setHolds] = useState<string[]>([])
  const [pedidas, setPedidas] = useState<Record<string, { label: string; aspect: Aspecto; unitCents: number; holdId: string; createdAt: string }>>({})
  const [reintentadas, setReintentadas] = useState<string[]>([])
  const [heroId, setHeroId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [luzAbierta, setLuzAbierta] = useState(false)
  const [luz, setLuz] = useState<Luz>('estudiofrio')
  const [photobook, setPhotobook] = useState(m?.photobook ?? null)
  const [marca, setMarca] = useState(m?.marca ?? '')

  const analysis = (m?.analysis ?? null) as Analisis | null
  const propias = m?.photoUrl ? [m.photoUrl, ...m.refs] : []
  const analisisVigente = !!m?.photoUrl && analysis?.url === m.photoUrl
  const analizada = analisisVigente || (!!m?.photoUrl && fallaLectura)
  const categorias = config.data?.categorias ?? []
  const cat = categorias.find((k) => k.id === (categoryPick ?? m?.categoryId)) ?? categorias.find((k) => k.id === 'other')
  const catId = cat?.id ?? m?.categoryId ?? 'other'

  // --- the request, as the web builds it (crear-view `linea`): photobook first, the locked look last ---
  const lect = analysis?.lectura
  const ficha = lect && lect.fichaDe === propias.join('|') ? lect.ficha : undefined
  const hojaOtra = !!photobook && lect?.hoja?.url === photobook.url && !lect.hoja.coincide
  const fotos = photobook && !hojaOtra ? [photobook.url, ...propias] : propias
  const conHoja = !!photobook && !hojaOtra && fotos.length > 1

  // The ideas made for this product; the category's fixed list when there are none or a category was picked by hand.
  const propuestas = !categoryPick && ideas?.propuestas.length ? ideas : null
  const opciones: Opcion[] = propuestas
    ? propuestas.propuestas.map((p, i) => ({ id: `v${propuestas.version}p${i + 1}`, name: p.nombre, desc: p.descripcion, escena: p.escena, comp: p.composicion }))
    : (cat?.variants ?? []).map((v) => ({ id: v.id, name: v.name, desc: v.desc }))
  const setKey = propuestas ? `p${propuestas.version}` : catId
  const onSet = new Set(picked[setKey] ?? opciones.slice(0, 3).map((o) => o.id))
  const chosen = opciones.filter((o) => onSet.has(o.id))
  const n = chosen.length * aspects.length

  const linea = (aspect: Aspecto): Linea => ({
    kind: 'producto',
    count: chosen.length,
    refs: m?.estilo ? [...fotos, m.estilo.url] : fotos,
    aspect,
    ...(ficha ? { fichaProducto: ficha } : {}),
    ...(conHoja ? { photobook: true } : {}),
    ...(m?.estilo ? { estilo: true } : {}),
    variants: {
      category: catId,
      ids: chosen.map((o) => o.id),
      ...(analysis?.slots ? { slots: analysis.slots } : {}),
      ...(propuestas ? { escenas: Object.fromEntries(chosen.map((o) => [o.id, o.escena!])) } : {}),
    },
    ...(m ? { mesaId: m.id } : {}),
    labels: chosen.map((o) => o.name),
  })
  const lineas = m && fotos.length && chosen.length ? aspects.map(linea) : []
  const cuerpo: Cuerpo | null = lineas.length === 1 ? lineas[0] : lineas.length ? { lines: lineas } : null
  const precio = useQuery({ queryKey: ['cotizar', cuerpo], queryFn: () => cotizarLinea(cuerpo!), enabled: !!cuerpo })

  // --- the pieces: the mesa's, with every request of this visit (and the mesa's last one) watched until done ---
  const piezasMesa = m?.piezas ?? []
  const ultimaTanda = [...piezasMesa].reverse().find((p) => p.label && !esEdicion(p.label) && enResultados(p.label))?.holdId
  const vigilar = [...new Set([...holds, ...(ultimaTanda ? [ultimaTanda] : [])])]
  const vistas = useQueries({
    queries: vigilar.map((h) => ({
      queryKey: ['pedido-mesa', h],
      queryFn: () => verHold(h),
      // Looking is also what moves the pieces along on the server (D13): keep looking while any is on its way.
      refetchInterval: (q: { state: { data?: Pieza[] } }) => (q.state.data?.length && q.state.data.every(terminada) ? false : 2500),
    })),
  })
  const vivas = new Map(vistas.flatMap((q) => q.data ?? []).map((p) => [p.id, p]))
  const conVivo = (p: Pieza, label: string, aspect: Aspecto, unitCents: number): PiezaMesa => {
    const v = vivas.get(p.id)
    return { ...p, ...(v ? { status: v.status, resultUrl: v.resultUrl, videoUrl: v.videoUrl, errorMessage: v.errorMessage, createdAt: v.createdAt, updatedAt: v.updatedAt } : {}), label, aspect, unitCents }
  }
  const deMesa = new Set(piezasMesa.map((p) => p.id))
  const piezas: PiezaMesa[] = [
    ...piezasMesa.map((g) => conVivo(g, g.label ?? 'Toma', g.aspect ?? '3:4', g.unitCents ?? g.priceCents ?? 0)),
    ...Object.entries(pedidas)
      .filter(([id]) => !deMesa.has(id))
      .map(([id, x]) => conVivo({ id, status: 'queued', resultUrl: null, videoUrl: null, errorMessage: null, createdAt: x.createdAt, updatedAt: null, holdId: x.holdId }, x.label, x.aspect, x.unitCents)),
  ].filter((p) => !reintentadas.includes(p.id))

  // A request of this visit is done: the mesa, the balance and the month's spend change.
  const terminadas = holds.filter((h) => {
    const d = vistas[vigilar.indexOf(h)]?.data
    return !!d?.length && d.every(terminada)
  })
  useEffect(() => {
    if (!terminadas.length) return
    qc.invalidateQueries({ queryKey: ['mesa', m?.id] })
    qc.invalidateQueries({ queryKey: ['mesas'] })
    qc.invalidateQueries({ queryKey: ['saldo'] })
    qc.invalidateQueries({ queryKey: ['crear-config'] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminadas.join()])

  const algoCorre = piezas.some(corriendo)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!algoCorre) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [algoCorre])

  const escena = piezas.filter((p) => enResultados(p.label))
  const mains = escena.filter((p) => !esEdicion(p.label))
  const batchHold = mains[mains.length - 1]?.holdId
  const batch = escena.filter((p) => p.holdId === batchHold)
  const hero = escena.find((p) => p.id === heroId) ?? batch.find(lista) ?? batch[0] ?? escena[escena.length - 1]
  const sigueDe = hero && lista(hero) && hero.resultUrl && !esEdicion(hero.label) && !dismissed.includes(hero.id) ? hero : undefined
  const avisoLote = batch.length && batch.every((p) => p.status === 'failed') ? 'La última tanda no salió. No se cobró nada.' : null

  // --- asking: every request is priced first and goes to the queue; only what arrives is charged ---
  const mandar = async (fn: () => Promise<Apartado>, asked: { label: string; aspect: Aspecto }[]) => {
    setEnviando(true)
    setError(null)
    try {
      const r = await fn()
      const unidades = (r.lines ?? []).flatMap((l) => Array<number>(l.count).fill(l.unitCents))
      const createdAt = new Date().toISOString()
      setPedidas((x) => ({ ...x, ...Object.fromEntries(r.ids.map((id, i) => [id, { label: asked[i]?.label ?? 'Toma', aspect: asked[i]?.aspect ?? '3:4', unitCents: unidades[i] ?? 0, holdId: r.holdId, createdAt }])) }))
      setHolds((h) => [...h, r.holdId])
      qc.invalidateQueries({ queryKey: ['saldo'] })
      return r
    } catch (e) {
      if ((e as { status?: number }).status === 402)
        Alert.alert('Te falta saldo', textoDe(e, 'Tu saldo no alcanza para este pedido.'), [
          { text: 'Ver mi saldo', onPress: () => router.push('/saldo') },
          { text: 'Cerrar', style: 'cancel' },
        ])
      else setError(textoDe(e, 'No pudimos hacer el pedido. No se cobró nada.'))
      return null
    } finally {
      setEnviando(false)
    }
  }

  const disabled = !m?.photoUrl || !analizada || pensando || n === 0 || !precio.data || enviando
  const generar = async () => {
    if (disabled || !cuerpo) return
    const asked = lineas.flatMap((l) => (l.labels ?? []).map((label) => ({ label, aspect: l.aspect })))
    if (await mandar(() => pedirLinea(cuerpo), asked)) {
      setHeroId(null)
      setVista('results')
    }
  }
  const reintentar = async (p: PiezaMesa) => {
    const r = await mandar(() => reintentarPieza(p.id), [{ label: p.label, aspect: p.aspect }])
    if (!r) return
    setReintentadas((x) => [...x, p.id])
    setHeroId(r.ids[0] ?? null)
  }

  // «Sigue»: a relight of the piece on screen, as an order — the light is picked, its price said, then asked.
  const relightBase: Linea | null = sigueDe?.resultUrl ? { kind: 'editar', count: 1, refs: [sigueDe.resultUrl], aspect: sigueDe.aspect, luz } : null
  const relightPrecio = useQuery({ queryKey: ['cotizar', relightBase], queryFn: () => cotizarLinea(relightBase!), enabled: !!relightBase && vista === 'results' })
  const pedirRelight = async () => {
    if (!sigueDe || !relightBase || !relightPrecio.data) return
    const etiqueta = `Relight · ${LUCES.find((l) => l.id === luz)?.label ?? 'otra luz'} · ${sigueDe.label}`.slice(0, 80)
    const r = await mandar(() => pedirLinea({ ...relightBase, labels: [etiqueta], ...(m ? { mesaId: m.id } : {}) }), [{ label: etiqueta, aspect: sigueDe.aspect }])
    if (!r) return
    setDismissed((d) => [...d, sigueDe.id])
    setLuzAbierta(false)
    setHeroId(r.ids[0] ?? null)
  }

  // --- the photobook: nine views of this product in one sheet, made once, riding first with every piece after ---
  const hojaBase: Linea | null = propias.length ? { kind: 'photobook', count: 1, refs: propias, aspect: '1:1' } : null
  const hojaPrecio = useQuery({ queryKey: ['cotizar', hojaBase], queryFn: () => cotizarLinea(hojaBase!), enabled: !!hojaBase })
  const hojaEnCamino = piezas.some((p) => p.label === HOJA && !!pedidas[p.id] && !terminada(p))
  const hacerPhotobook = () => {
    if (!m || !hojaBase || hojaEnCamino || enviando || !hojaPrecio.data) return
    const producto = analysis?.name?.slice(0, 120)
    void mandar(() => pedirLinea({ ...hojaBase, ...(producto ? { producto } : {}), ...(marca.trim() ? { marca: marca.trim() } : {}), labels: [HOJA], mesaId: m.id }), [{ label: HOJA, aspect: '1:1' }])
  }
  const usarHoja = (hoja: { id: string; url: string }) => {
    if (!m) return
    setPhotobook(hoja)
    guardarHoja(m.id, { photobook: hoja }).catch((e) => setError(textoDe(e, 'No pudimos guardar tu photobook en la mesa.')))
  }
  // The sheet is the product's, not the request's: it takes the mesa the moment it lands (once per sheet).
  const adoptadas = useRef(new Set<string>())
  const hojaNueva = [...piezas].reverse().find((p) => p.label === HOJA && !!pedidas[p.id] && lista(p))
  useEffect(() => {
    if (!hojaNueva?.resultUrl || adoptadas.current.has(hojaNueva.id)) return
    adoptadas.current.add(hojaNueva.id)
    usarHoja({ id: hojaNueva.id, url: hojaNueva.resultUrl })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hojaNueva?.id, hojaNueva?.resultUrl])
  const hojasMesa = piezas.filter((p) => p.label === HOJA && lista(p) && !!p.resultUrl).reverse()
  const guardarMarca = () => {
    const nueva = marca.trim()
    if (!m || nueva === (m.marca ?? '')) return
    guardarHoja(m.id, { marca: nueva || null }).catch((e) => setError(textoDe(e, 'No pudimos guardar lo que identifica tu producto.')))
  }

  // --- the product's photos ---
  const pedidasIdeas = useRef<string | null>(null)
  const subirFoto = async () => {
    if (subiendo) return
    const [uri] = await elegirFotos()
    if (!uri) return
    setError(null)
    setPreview(uri)
    setSubiendo('foto')
    try {
      const url = await uploadImage(uri)
      if (!m) {
        // The first photo makes the mesa; then the screen is that mesa's.
        const id = await crearMesa({ photoUrl: url, refs: [] })
        qc.invalidateQueries({ queryKey: ['mesas'] })
        router.setParams(enTab ? { mesa: id } : { id })
        return
      }
      // Another product on the same mesa: its angles, ideas and reading belong to the old one.
      // The old analysis stays saved but no longer matches the photo, so it is read again (the server ignores a null).
      await guardarMesa(m.id, { photoUrl: url, refs: [], categoryId: null, pedidos: [] })
      setIdeas(null)
      setPicked({})
      setCategoryPick(null)
      setPedidos([])
      setFallaLectura(false)
      pedidasIdeas.current = null
      await qc.invalidateQueries({ queryKey: ['mesa', m.id] })
    } catch (e) {
      setError(textoDe(e, 'No pudimos subir tu foto. Intenta otra vez.'))
    } finally {
      setSubiendo(null)
      setPreview(null)
    }
  }
  /** More photos of the SAME product: nothing else resets. */
  const agregarAngulos = async () => {
    if (!m || subiendo) return
    const sitio = MAX_ANGULOS - m.refs.length
    if (sitio <= 0) return
    const uris = (await elegirFotos(sitio)).slice(0, sitio)
    if (!uris.length) return
    setSubiendo('angulo')
    setError(null)
    try {
      const urls = await Promise.all(uris.map(uploadImage))
      await guardarMesa(m.id, { refs: [...m.refs, ...urls] })
      await qc.invalidateQueries({ queryKey: ['mesa', m.id] })
    } catch (e) {
      setError(textoDe(e, 'No pudimos subir esa foto. Intenta otra vez.'))
    } finally {
      setSubiendo(null)
    }
  }
  const quitarAngulo = async (url: string) => {
    if (!m) return
    const refs = m.refs.filter((u) => u !== url)
    qc.setQueryData<MesaAbierta>(['mesa', m.id], (old) => (old ? { ...old, refs } : old))
    try {
      await guardarMesa(m.id, { refs })
    } catch (e) {
      setError(textoDe(e, 'No pudimos quitar esa foto.'))
      qc.invalidateQueries({ queryKey: ['mesa', m.id] })
    }
  }

  // What the photo is: its name and category, once per photo (the web does the same on upload).
  useEffect(() => {
    if (!m?.photoUrl || analisisVigente) return
    const url = m.photoUrl
    analizarFoto(url)
      .then((a) =>
        guardarMesa(m.id, {
          // The mesa takes the product's name unless someone already gave it one.
          ...(a.nombre && (!m.name || m.name === 'Mesa nueva') ? { name: a.nombre } : {}),
          categoryId: a.categoryId,
          analysis: { url, name: a.nombre, categoryId: a.categoryId },
        }),
      )
      .then(() => {
        qc.invalidateQueries({ queryKey: ['mesa', m.id] })
        qc.invalidateQueries({ queryKey: ['mesas'] })
      })
      .catch(() => setFallaLectura(true))
    // Once per photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id, m?.photoUrl])

  // «Otras ideas» (nothing written: avoid what was seen and made here) or what she asked (the last weighs most).
  const pedirIdeas = async (nuevo?: string, inicial = false) => {
    if (!m?.photoUrl || (pensando && !inicial)) return
    const historial = nuevo ? [...pedidos, nuevo].slice(-6) : pedidos
    const hechas = [...new Set(piezas.filter((p) => !esEdicion(p.label) && p.label !== HOJA).map((p) => p.label.replace(/ · final$/, '')))].slice(-20)
    const evitar = [...new Set([...hechas, ...(ideas?.propuestas ?? []).map((p) => `${p.nombre}: ${p.descripcion}`)])].slice(-40)
    setPensando(true)
    setIdeasError(null)
    try {
      const r = await pedirPropuestas({ imageUrl: m.photoUrl, imageUrls: m.refs.slice(0, 3), producto: analysis?.name ?? null, categoria: analizada ? (cat?.name ?? null) : null, peticion: historial, evitar })
      setIdeas((v) => ({ version: (v?.version ?? 0) + 1, propuestas: r.propuestas, respuesta: inicial ? '' : r.respuesta }))
      // Asking for ideas means wanting them, even after picking a category by hand.
      setCategoryPick(null)
      if (nuevo) {
        setPedidos(historial)
        setPide('')
        guardarMesa(m.id, { pedidos: historial }).catch(() => {})
      }
    } catch (e) {
      setIdeasError(textoDe(e, 'No pudimos pensar ideas ahora. Intenta otra vez.'))
    } finally {
      setPensando(false)
    }
  }
  // The first ideas, as soon as the photo is up (in parallel with reading its name and category).
  useEffect(() => {
    if (!m?.photoUrl || pedidasIdeas.current === m.photoUrl) return
    pedidasIdeas.current = m.photoUrl
    void pedirIdeas(undefined, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.photoUrl])
  const enviarPide = () => {
    const texto = pide.trim()
    if (texto && !pensando) void pedirIdeas(texto)
  }

  const toggleVariant = (id: string) => setPicked({ ...picked, [setKey]: onSet.has(id) ? chosen.map((o) => o.id).filter((x) => x !== id) : [...chosen.map((o) => o.id), id] })
  const toggleAspect = (a: Aspecto) => {
    const next = aspects.includes(a) ? aspects.filter((x) => x !== a) : ASPECTOS.filter((x) => x === a || aspects.includes(x))
    if (next.length) setAspects(next)
  }

  const verPiezas = (ids: string[], i: number) => router.push({ pathname: '/visor', params: { ids: JSON.stringify(ids), i: String(i) } })
  const verEnVisor = (id: string) => {
    const ids = escena.filter(lista).map((p) => p.id)
    verPiezas(ids, Math.max(0, ids.indexOf(id)))
  }

  // ---------- 1b · Resultados ----------
  if (vista === 'results' && escena.length) {
    const hold = vistas[vigilar.indexOf(batchHold ?? '')]?.data?.[0]?.hold
    return (
      <Marco>
        <Resultados
          titulo={analysis?.name ?? m?.name ?? 'Tus fotos'}
          subtitulo={[cat?.name, [...new Set(batch.map((p) => p.aspect))].join(' / '), plural(new Set(batch.map((p) => p.label)).size, 'variante', 'variantes')].filter(Boolean).join(' · ')}
          onVolver={() => setVista('form')}
          piezas={escena}
          hero={hero}
          onHero={setHeroId}
          onVer={verEnVisor}
          now={now}
          readyLine={`${batch.filter(lista).length} de ${batch.length} listas`}
          desglose={desglose(batch.map((p) => ({ count: 1, unitCents: p.unitCents })))}
          chargeLine={hold?.status === 'captured' ? `Se cobraron ${mxn(hold.capturedCents ?? 0)}` : hold?.status === 'canceled' ? 'No llegó nada: no se cobró' : 'Al terminar se cobra lo que llegó'}
          onReintentar={reintentar}
          reintentando={enviando}
          onVariantes={() => setVista('form')}
          onDescargar={(url) =>
            descargar(url)
              .then(() => Alert.alert('Listo', 'La guardamos en tus fotos.'))
              .catch(() => setError('No pudimos guardarla en tus fotos. Revisa el permiso en Ajustes.'))
          }
          sigue={
            sigueDe
              ? {
                  sobre: sigueDe.label,
                  precio: relightPrecio.data ? mxn(relightPrecio.data.totalCents) : null,
                  abierto: luzAbierta,
                  luz,
                  onLuz: setLuz,
                  onAbrir: () => setLuzAbierta(true),
                  onPedir: () => void pedirRelight(),
                  onNo: () => {
                    setLuzAbierta(false)
                    setDismissed((d) => [...d, sigueDe.id])
                  },
                  enviando,
                }
              : null
          }
          error={error}
        />
      </Marco>
    )
  }

  // ---------- 1 · Crear ----------
  const foto = preview ?? m?.photoUrl ?? null
  const nombre = !foto ? 'Sube tu producto' : subiendo === 'foto' ? 'Subiendo…' : !analizada ? 'Mirando la foto…' : (analysis?.name ?? m?.name ?? 'Tu producto')
  const leyendo = (!!m?.photoUrl || subiendo === 'foto') && (subiendo === 'foto' || !analizada || pensando)
  const conversa = !!m?.photoUrl && analizada
  const fases: [string, boolean, boolean, string][] = [
    ['Mirando tu foto', !!m?.photoUrl && subiendo !== 'foto', subiendo === 'foto', 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5'],
    ['Reconociendo el producto', analizada, !!m?.photoUrl && !analizada, 'M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5ZM4 8l8 4.5M20 8l-8 4.5M12 12.5V21'],
    ['Escribiendo composiciones', !!ideas && !pensando, (analizada && pensando) || (analizada && !ideas && !ideasError), 'M4.2 4.2h15.6v15.6H4.2zM4.2 9.4h15.6M4.2 14.6h15.6M9.4 4.2v15.6M14.6 4.2v15.6'],
  ]
  const respuesta = pensando ? 'Pensando ideas para tu producto…' : (ideasError ?? ideas?.respuesta ?? '')
  const nota = error ?? avisoLote ?? (fallaLectura ? 'No pudimos leer la foto: elige la categoría a mano.' : null) ?? (precio.error ? 'No pudimos calcular el precio.' : null)
  const ctaLabel = enviando
    ? 'Apartando…'
    : m?.photoUrl && !analizada
      ? 'Mirando la foto…'
      : pensando
        ? 'Pensando ideas…'
        : `Generar ${aspects.length > 1 ? plural(n, 'imagen', 'imágenes') : plural(n, 'variante', 'variantes')}`

  return (
    <Marco>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Encabezado onVolver={onVolver} />
        <View style={styles.cuerpo}>
          {/* The mesa on the table; Mesas opens over it. */}
          <Pressable onPress={() => router.push({ pathname: '/mesas', params: m ? { actual: m.id } : {} })} accessibilityRole="button" accessibilityLabel="Cambiar de mesa de trabajo" style={styles.mesa}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="M3.5 7.5h17M3.5 7.5v10a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5v-10M3.5 7.5 5 4.5h14l1.5 3M12 11v5" stroke={c.textDim} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.mesaNombre} numberOfLines={1}>
              {m?.name ?? 'Mesa nueva'}
            </Text>
            <Text style={styles.mesaPiezas}>{plural(piezas.length, 'pieza', 'piezas')}</Text>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
              <Path d="m6 9.5 6 6 6-6" stroke={c.textDim} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>

          {/* Tu producto */}
          <View style={{ gap: 8 }}>
            <View style={styles.producto}>
              <Pressable onPress={subirFoto} accessibilityRole="button" accessibilityLabel={foto ? 'Cambiar la foto del producto' : 'Sube la foto del producto'} style={styles.foto}>
                {foto ? <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} /> : <Botella width={36} height={58} color="#C7C7C7" />}
                {subiendo === 'foto' ? (
                  <View style={styles.velo}>
                    <ActivityIndicator color={c.text} />
                  </View>
                ) : null}
              </Pressable>
              <View style={styles.productoDatos}>
                <Text style={styles.productoEtiqueta}>TU PRODUCTO</Text>
                <Text style={styles.productoNombre} numberOfLines={2}>
                  {nombre}
                </Text>
                {m?.photoUrl ? (
                  <View style={styles.categoriaFila}>
                    <Text style={styles.categoria} numberOfLines={1}>
                      Categoría: <Text style={{ color: c.text }}>{cat?.name ?? '…'}</Text>
                    </Text>
                    <Pressable onPress={() => setVerCategorias((v) => !v)} accessibilityRole="button" accessibilityLabel="Cambiar la categoría" style={styles.cambiar}>
                      <Text style={styles.cambiarTexto}>{verCategorias ? 'Listo' : 'Cambiar'}</Text>
                    </Pressable>
                  </View>
                ) : null}
                {m?.photoUrl ? (
                  <View style={styles.angulos}>
                    {m.refs.map((u, i) => (
                      <View key={u} style={styles.angulo}>
                        <Image source={{ uri: u }} style={StyleSheet.absoluteFill} accessibilityLabel={`Ángulo ${i + 2}`} />
                        <Pressable onPress={() => quitarAngulo(u)} hitSlop={14} accessibilityRole="button" accessibilityLabel={`Quitar ángulo ${i + 2}`} style={styles.quitar}>
                          <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
                            <Path d="M6 6l12 12M18 6 6 18" stroke={c.text} strokeWidth={3} strokeLinecap="round" />
                          </Svg>
                        </Pressable>
                      </View>
                    ))}
                    {m.refs.length < MAX_ANGULOS ? (
                      <Pressable onPress={agregarAngulos} hitSlop={4} accessibilityRole="button" accessibilityLabel="Agregar otra foto del mismo producto" style={styles.mas}>
                        {subiendo === 'angulo' ? (
                          <ActivityIndicator size="small" color={c.textDim} />
                        ) : (
                          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                            <Path d="M12 5v14M5 12h14" stroke={c.textDim} strokeWidth={1.9} strokeLinecap="round" />
                          </Svg>
                        )}
                      </Pressable>
                    ) : null}
                    {!m.refs.length ? <Text style={styles.pista}>Más ángulos del mismo producto</Text> : null}
                  </View>
                ) : null}
              </View>
            </View>
            {verCategorias ? (
              <View style={styles.chips}>
                {categorias.map((k) => (
                  <Chip
                    key={k.id}
                    label={k.name}
                    on={k.id === catId}
                    mono={false}
                    onPress={() => {
                      setCategoryPick(k.id)
                      setVerCategorias(false)
                    }}
                  />
                ))}
              </View>
            ) : null}
            {!m?.photoUrl && error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          {/* Photobook */}
          {propias.length ? (
            <View style={styles.hoja}>
              <View style={styles.hojaFila}>
                <Pressable
                  onPress={photobook ? () => verPiezas([photobook.id], 0) : undefined}
                  disabled={!photobook}
                  accessibilityRole={photobook ? 'imagebutton' : undefined}
                  accessibilityLabel={photobook ? 'Ver el photobook' : undefined}
                  style={styles.hojaMini}
                >
                  {photobook ? (
                    <Image source={{ uri: photobook.url }} style={StyleSheet.absoluteFill} />
                  ) : (
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c.textDim} strokeWidth={1.5}>
                      {[3.5, 9.9, 16.3].flatMap((y) =>
                        [3.5, 9.9, 16.3].map((x) => <Rect key={`${x}-${y}`} x={x} y={y} width={x > 16 ? 4.2 : 5.6} height={y > 16 ? 4.2 : 5.6} rx={1} />),
                      )}
                    </Svg>
                  )}
                </Pressable>
                <Text style={styles.hojaTitulo} numberOfLines={1}>Photobook</Text>
                <Pressable
                  onPress={hacerPhotobook}
                  disabled={hojaEnCamino || enviando || !hojaPrecio.data}
                  hitSlop={4}
                  accessibilityRole="button"
                  style={[styles.hojaBoton, (hojaEnCamino || enviando || !hojaPrecio.data) && { opacity: 0.45 }]}
                >
                  <Text style={styles.hojaBotonTexto}>{hojaEnCamino ? 'Armando el photobook…' : photobook ? 'Rehacer' : 'Crear photobook'}</Text>
                  {!hojaEnCamino ? <Text style={styles.hojaPrecio}>{hojaPrecio.data ? mxn(hojaPrecio.data.totalCents) : '—'}</Text> : null}
                  <View style={styles.hojaFlecha}>
                    <Flecha size={10} color={c.bg} />
                  </View>
                </Pressable>
              </View>
              <Text style={styles.hojaNota}>
                {photobook ? 'Nueve vistas de tu producto. Va con cada pieza, para que no se lo invente.' : 'Nueve vistas de tu producto en una hoja. Se hace una vez y sirve para siempre.'}
              </Text>
              {hojasMesa.length ? (
                <View style={styles.hojas}>
                  {hojasMesa.map((h, i) => {
                    const on = h.id === photobook?.id
                    const nombreHoja = i === 0 ? 'El más reciente' : `Photobook ${hojasMesa.length - i}`
                    return (
                      <View key={h.id} style={[styles.hojaCarta, { borderColor: on ? c.accent : 'transparent' }]}>
                        <Pressable
                          onPress={() => verPiezas(hojasMesa.map((x) => x.id), i)}
                          accessibilityRole="imagebutton"
                          accessibilityLabel={`Ver ${nombreHoja} a pantalla completa`}
                          style={styles.hojaImagen}
                        >
                          <Image source={{ uri: h.resultUrl! }} style={StyleSheet.absoluteFill} />
                        </Pressable>
                        <Text style={styles.hojaNombre}>{nombreHoja}</Text>
                        <Pressable
                          onPress={() => usarHoja({ id: h.id, url: h.resultUrl! })}
                          disabled={on}
                          hitSlop={4}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          style={[styles.usar, { backgroundColor: on ? c.accent : c.bgElevated }]}
                        >
                          <Text style={[styles.usarTexto, { color: on ? c.bg : c.text }]}>{on ? 'En uso' : 'Usar'}</Text>
                        </Pressable>
                      </View>
                    )
                  })}
                </View>
              ) : null}
              <View style={styles.marcaFila}>
                <Text style={styles.marcaEtiqueta}>LO IDENTIFICA</Text>
                <TextInput
                  value={marca}
                  onChangeText={setMarca}
                  onEndEditing={guardarMarca}
                  maxLength={120}
                  placeholder="la marca en un costado, la costura del talón…"
                  placeholderTextColor={c.textDim}
                  accessibilityLabel="Qué parte identifica tu producto"
                  style={styles.marca}
                />
              </View>
            </View>
          ) : null}

          {hojaOtra ? (
            <View style={styles.aviso}>
              <Text style={styles.avisoTexto}>
                Tu photobook es de otro producto <Text style={{ color: c.textMuted }}>({lect?.hoja?.porque || 'no coincide con tus fotos'})</Text>. No lo usamos hasta que hagas uno nuevo.
              </Text>
            </View>
          ) : null}

          {/* ¿Qué buscas? */}
          {conversa ? (
            <View style={{ gap: 8 }}>
              <View style={styles.pideFila}>
                <TextInput
                  value={pide}
                  onChangeText={setPide}
                  placeholder="¿Qué buscas? Ej. para San Valentín, fondo rojo"
                  placeholderTextColor={c.textDim}
                  maxLength={300}
                  editable={!pensando}
                  returnKeyType="send"
                  onSubmitEditing={enviarPide}
                  accessibilityLabel="Cuéntanos qué buscas"
                  style={styles.pide}
                />
                <Pressable
                  onPress={enviarPide}
                  disabled={pensando || !pide.trim()}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel="Ajustar las ideas"
                  style={[styles.enviar, (pensando || !pide.trim()) && { opacity: 0.45 }]}
                >
                  <Flecha size={16} color={c.bg} />
                </Pressable>
              </View>
              {pedidos.length ? (
                <View style={styles.pedidos}>
                  {pedidos.slice(-3).map((t, i) => (
                    <View key={`${i}-${t}`} style={styles.pedido}>
                      <Text style={styles.pedidoTexto}>{t}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {respuesta ? <Text style={[styles.respuesta, !!ideasError && !pensando && { color: c.accent2 }]}>{respuesta}</Text> : null}
            </View>
          ) : null}

          {/* What the screen is doing with the photo: real phases, not a show. */}
          {leyendo ? (
            <View style={styles.pasos}>
              {fases.map(([label, hecho, activo, d]) => (
                <Pulso key={label} activo={activo}>
                  <View style={styles.paso}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <Path d={hecho ? 'M5 12.5 10 17 19 7' : d} stroke={hecho || activo ? c.text : '#5A5A5A'} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text style={[styles.pasoTexto, { color: hecho || activo ? c.text : '#5A5A5A', fontWeight: activo ? '500' : '400' }]}>{label}</Text>
                  </View>
                </Pulso>
              ))}
            </View>
          ) : null}

          {/* Variantes */}
          {!leyendo && m?.photoUrl ? (
            <View style={{ gap: 10 }}>
              <View style={styles.titulo2Fila}>
                <Text style={styles.titulo2}>Variantes</Text>
                <Text style={styles.cuantas}>
                  {chosen.length} de {opciones.length}
                </Text>
              </View>
              <Text style={styles.variantesNota}>Cada variante es una composición distinta, no la misma foto repetida.</Text>
              {opciones.map((o) => {
                const on = onSet.has(o.id)
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => toggleVariant(o.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={[styles.variante, { backgroundColor: on ? c.bgOverlay : c.bgRaised, borderColor: on ? c.accent : c.border }]}
                  >
                    <View style={[styles.caja, { backgroundColor: on ? c.accent : 'transparent', borderColor: on ? c.accent : c.borderStrong }]}>
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" opacity={on ? 1 : 0}>
                        <Path d="M5 12.5 10 17 19 7" stroke={c.bg} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    </View>
                    <View style={styles.varianteTextos}>
                      <Text style={styles.varianteNombre}>{o.name}</Text>
                      <Text style={styles.varianteDesc}>{o.desc}</Text>
                      {o.comp ? <Text style={styles.varianteComp}>{o.comp}</Text> : null}
                    </View>
                  </Pressable>
                )
              })}
              {conversa ? (
                <Pressable onPress={() => void pedirIdeas()} disabled={pensando} accessibilityRole="button" style={[styles.otras, pensando && { opacity: 0.45 }]}>
                  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" stroke={c.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={styles.otrasTexto}>{pensando ? 'Pensando…' : 'Otras ideas'}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {m?.photoUrl ? (
            <>
              {/* Ajustes: the formats are picked; quality, count and a locked look are facts. */}
              <View style={{ gap: 10 }}>
                <Text style={styles.titulo2}>Ajustes</Text>
                <View style={styles.chips}>
                  {ASPECTOS.map((a) => (
                    <Chip key={a} label={a} on={aspects.includes(a)} onPress={() => toggleAspect(a)} />
                  ))}
                  <Chip label="2K · borrador" on />
                  <Chip label={plural(chosen.length, 'variante', 'variantes')} on />
                  {m.estilo ? <Chip label={`Estilo: ${m.estilo.label}`} on /> : null}
                </View>
              </View>

              {/* The price, said before the tap. */}
              <View style={{ gap: 12 }}>
                <View style={styles.cuentaFila}>
                  <Text style={styles.desglose}>{precio.data ? desglose(precio.data.lines) : `${n} × —`}</Text>
                  <Text style={[styles.nota, !!nota && { color: c.accent2 }]}>{nota ?? 'Se descuenta de tu saldo al terminar, sólo lo que llegue.'}</Text>
                </View>
                <BotonGenerar label={ctaLabel} total={precio.data ? mxn(precio.data.totalCents) : '—'} onPress={generar} disabled={disabled} />
                {escena.length ? (
                  <Pressable onPress={() => setVista('results')} accessibilityRole="button" style={styles.verPiezas}>
                    <Text style={styles.verPiezasTexto}>Ver lo que salió aquí · {plural(escena.length, 'pieza', 'piezas')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </Marco>
  )
}

/** Title row: «Crear» and this month's spend (and a way back when the mesa was opened from elsewhere). */
function Encabezado({ onVolver }: { onVolver?: () => void }) {
  const config = useQuery({ queryKey: ['crear-config'], queryFn: configCrear, staleTime: 10 * 60_000 })
  return (
    <View style={styles.encabezado}>
      {onVolver ? (
        <Pressable onPress={onVolver} accessibilityRole="button" accessibilityLabel="Atrás" style={styles.atras}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M15 5 8 12l7 7" stroke={c.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      ) : null}
      <Text style={styles.h1}>Crear</Text>
      <View style={styles.mes}>
        <Text style={styles.mesTexto}>
          Este mes <Text style={styles.mesValor}>{config.data ? mxn(config.data.gastoMesCents) : '—'}</Text>
        </Text>
      </View>
    </View>
  )
}

function Marco({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {children}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  espera: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  esperaTexto: { fontSize: 15, color: c.text, textAlign: 'center' },
  esperaBoton: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
  esperaBotonTexto: { fontSize: 14, fontWeight: '500', color: c.text },

  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingHorizontal: 16, paddingBottom: 12 },
  atras: { width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  h1: { flex: 1, fontSize: 24, fontWeight: '600', letterSpacing: -0.48, color: c.text },
  mes: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.bgRaised, borderWidth: 1, borderColor: c.border },
  mesTexto: { fontSize: 13, color: c.textMuted },
  mesValor: { fontFamily: FONT.mono, color: c.text },

  cuerpo: { gap: 24, paddingTop: 8, paddingHorizontal: 16, paddingBottom: 24 },
  mesa: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised },
  mesaNombre: { flexShrink: 1, fontSize: 15, fontWeight: '500', color: c.text },
  mesaPiezas: { marginLeft: 'auto', fontFamily: FONT.mono, fontSize: 11.5, color: c.textDim },

  producto: { flexDirection: 'row', gap: 14, padding: 14, borderRadius: 16, backgroundColor: c.bgRaised, borderWidth: 1, borderColor: c.border },
  foto: { width: 88, height: 110, borderRadius: 12, overflow: 'hidden', backgroundColor: c.border, alignItems: 'center', justifyContent: 'center' },
  velo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,10,0.5)', alignItems: 'center', justifyContent: 'center' },
  productoDatos: { flex: 1, minWidth: 0, gap: 6 },
  productoEtiqueta: { fontSize: 12, letterSpacing: 0.72, color: c.textDim },
  productoNombre: { fontSize: 17, fontWeight: '600', color: c.text },
  categoriaFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto' },
  categoria: { flexShrink: 1, fontSize: 14, color: c.textMuted },
  cambiar: { minHeight: 44, paddingHorizontal: 10, marginLeft: 'auto', justifyContent: 'center' },
  cambiarTexto: { fontSize: 14, fontWeight: '500', color: c.text },
  angulos: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  angulo: { width: 38, height: 46, borderRadius: 8, overflow: 'hidden', backgroundColor: c.border },
  quitar: { position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 999, backgroundColor: 'rgba(10,10,10,0.78)', alignItems: 'center', justifyContent: 'center' },
  mas: { width: 38, height: 46, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  pista: { flexShrink: 1, fontSize: 11.5, lineHeight: 15.5, color: c.textDim },

  hoja: { gap: 6, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: '#0F0F0F' },
  hojaFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hojaMini: { width: 38, height: 38, borderRadius: 8, overflow: 'hidden', backgroundColor: c.bgOverlay, alignItems: 'center', justifyContent: 'center' },
  hojaTitulo: { flex: 1, fontSize: 13, fontWeight: '500', color: c.text },
  hojaBoton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.bgElevated },
  hojaBotonTexto: { fontSize: 12.5, fontWeight: '500', color: c.text },
  hojaPrecio: { fontSize: 12.5, fontFamily: FONT.mono, color: c.textDim },
  hojaFlecha: { width: 20, height: 20, marginLeft: 2, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  hojaNota: { paddingHorizontal: 2, fontSize: 11.5, lineHeight: 16, color: c.textDim },
  hojas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, paddingHorizontal: 2, paddingBottom: 2 },
  hojaCarta: { width: '48.5%', gap: 6, padding: 6, borderRadius: 10, borderWidth: 2, backgroundColor: c.bgRaised },
  hojaImagen: { width: '100%', aspectRatio: 1, borderRadius: 6, overflow: 'hidden', backgroundColor: c.bgOverlay },
  hojaNombre: { paddingHorizontal: 2, fontSize: 11.5, color: c.textMuted },
  usar: { minHeight: 36, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  usarTexto: { fontSize: 12, fontWeight: '600' },
  marcaFila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2, paddingBottom: 2 },
  marcaEtiqueta: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.6, color: '#6E6E6E' },
  marca: { flex: 1, minWidth: 0, minHeight: 34, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, color: c.text, fontSize: 12.5 },

  aviso: { gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: '#3A2030', backgroundColor: '#160E12' },
  avisoTexto: { fontSize: 13, lineHeight: 19, color: c.text },

  pideFila: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingRight: 4, paddingLeft: 14, borderRadius: 999, backgroundColor: c.bgRaised, borderWidth: 1, borderColor: c.border },
  pide: { flex: 1, minWidth: 0, minHeight: 44, color: c.text, fontSize: 16 },
  enviar: { width: 36, height: 36, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  pedidos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pedido: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: c.bgOverlay, borderWidth: 1, borderColor: c.border },
  pedidoTexto: { fontSize: 12.5, color: '#C7C7C7' },
  respuesta: { fontSize: 12.5, lineHeight: 18, color: c.textMuted },

  pasos: { gap: 11, padding: 2 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pasoTexto: { fontSize: 15 },

  titulo2Fila: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  titulo2: { fontSize: 17, fontWeight: '600', color: c.text },
  cuantas: { fontSize: 14, color: c.textMuted },
  variantesNota: { fontSize: 14, lineHeight: 21, color: c.textMuted },
  variante: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  caja: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  varianteTextos: { flex: 1, minWidth: 0, gap: 2 },
  varianteNombre: { fontSize: 16, fontWeight: '500', color: c.text },
  varianteDesc: { fontSize: 13, color: c.textMuted },
  varianteComp: { fontFamily: FONT.mono, fontSize: 11, lineHeight: 15.4, color: c.textDim },
  otras: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong },
  otrasTexto: { fontSize: 14, color: c.text },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cuentaFila: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingHorizontal: 4 },
  desglose: { fontFamily: FONT.mono, fontSize: 13, color: c.textDim },
  nota: { flexShrink: 1, fontSize: 13, color: c.textDim, textAlign: 'right' },
  verPiezas: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  verPiezasTexto: { fontSize: 14, fontWeight: '500', color: c.text },
  error: { fontSize: 13, lineHeight: 19, color: c.accent2 },
})
