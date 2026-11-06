import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import Svg, { Path } from 'react-native-svg'
import { FONT, Text, TextInput } from '@/components/text'
import { theme } from '@/constants/theme'
import { CONFIG } from '@/lib/config'
import { uploadImage } from '@/lib/upload'
import { abrirMesa, lista, miniatura, mxn, terminada, verBiblioteca, type Aspecto, type MesaAbierta, type Pieza, type PiezaBiblioteca } from '@/lib/estudio'
import { MENTION, ROLES, ROLE_COLOR, estiloImage, motorPorDefecto, photobookImage, planFor, providerBrief, readPrompt, type Motor, type Plan, type Role, type Use } from '@/lib/crear/motor'
import { textoDe, verHold } from './crear/api'
import { hora, transcurrido } from './crear/resultados'
import { cotizarRef, pedirRef, verElenco, type LineaRef, type Persona } from './referencias/api'

/**
 * Crear con referencias (web board «Composer», 1d; plan D11 + D9; web `app/(estudio)/crear/referencias`). Each image
 * gets an @name and the prompt points at them; lib/crear/motor (the web's rules, copied) reads the roles and picks the
 * models: GPT Image 2 keeps the person, then Nano Banana Pro puts the real product back — offered as step 2 once step 1
 * is ready (the queue has no follow-up jobs, so the screen asks for it). The mesa it opens from (param `mesa`) brings
 * its product photo, photobook and locked look as references. Every request is priced, confirmed, then queued.
 */

const c = theme.colors
const MAX_REFS = 8
const ASPECTS: Aspecto[] = ['3:4', '4:5', '9:16', '1:1', '16:9']
const GRAY = '#8A8A8A'
// The step-2 price doesn't depend on the photo; before step 1 lands, this stands in for it.
const STAND_IN = 'https://example.com/paso-1.jpg'
const PRODUCT_FIX =
  'Replace the product in image 1 with the exact product from image 2: same shape, colours, materials, label and proportions. Keep the person, pose, framing, background and light exactly as they are.'
// Without @ the engine reads roles by order, so the default names say the same.
const DEFAULT_NAMES = ['persona', 'producto', 'entorno']
// «Salida de fin de semana» → @salida: a mention is typed, so it has to be short.
const CORTAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'con', 'y', 'un', 'una', 'al'])
/** What the mesa calls the pieces asked here. */
const PASO1 = 'Con referencias'
const PASO2 = 'Producto real'
const ICONOS = `${CONFIG.API_BASE_URL}/icons`
/** Step 1's engines as the web registry names them, with their maker's logo and what «Powered by»'s menu says. */
const MOTOR: Record<Motor, { nombre: string; logo: string; nota: string }> = {
  'misma-persona': { nombre: 'GPT Image 2', logo: `${ICONOS}/openai-color.svg`, nota: 'Mantiene la cara de una persona. El producto real lo pone después Nano Banana Pro.' },
  editar: { nombre: 'Nano Banana Pro', logo: `${ICONOS}/nanobanana-color.svg`, nota: 'Respeta producto y escena tal cual. Hasta 6 referencias, 2K.' },
  retoque: { nombre: 'Nano Banana 2', logo: `${ICONOS}/nanobanana-color.svg`, nota: 'Más rápido y más barato. 1K.' },
}
const PERSONA = MOTOR['misma-persona'].nombre
const PRODUCTO = MOTOR.editar.nombre

interface Ref {
  key: string
  name: string
  /** What is drawn: the local photo while it uploads. */
  src: string
  /** Public URL once uploaded. */
  url: string | null
  source: string
  persona?: boolean
  role?: Role
}
/** A finished piece this mesa holds (or this visit made), one tap from the prompt. */
interface Hecha {
  id: string
  url: string
  label?: string | null
}
/** What a piece of this visit was asked as. */
interface Paso {
  step: 1 | 2
  key: string
  product: string | null
  photobook: string | null
  aspect: Aspecto
  kind: Motor
  /** Step 2: the step-1 piece it puts the product on. */
  from?: string
}
type Enviado = Paso & { holdId: string; createdAt: string }
interface Match {
  name: string
  src: string
  hint: string
  ref?: Ref
  persona?: Persona
  hecha?: Hecha
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_-]+/g, '')
function unique(base: string, taken: string[]) {
  const root = base || 'imagen'
  let name = root
  for (let n = 2; taken.includes(name); n++) name = `${root}${n}`
  return name
}
const refsWord = (n: number) => `${n} ${n === 1 ? 'ref' : 'refs'}`

function chainLine(plan: Plan | null) {
  const persona = !plan || (plan.kind === 'misma-persona' && plan.uses.some((u) => u.role === 'CHARACTER'))
  const que = [persona && 'misma persona', plan && refsWord(plan.refs.length)].filter(Boolean).join(', ')
  if (plan && !plan.product) return `Un paso: ${MOTOR[plan.kind].nombre} (${que}). Se cobra al terminar, sólo si llega.`
  return `Dos pasos: ${PERSONA} (${que}) → ${PRODUCTO} (producto real). Cada paso se cobra al terminar, sólo por lo que llegue.`
}

/** The prompt cut where its @mentions are, so the editor can draw them (a known name as the board's chip). */
function trozos(text: string, names: Set<string>) {
  const out: { text: string; at?: boolean; ref?: boolean }[] = []
  let i = 0
  for (const m of text.matchAll(MENTION)) {
    const at = m.index ?? 0
    if (at > i) out.push({ text: text.slice(i, at) })
    out.push({ text: m[0], at: true, ref: names.has(m[1].toLowerCase()) })
    i = at + m[0].length
  }
  if (i < text.length) out.push({ text: text.slice(i) })
  return out
}

async function elegirFotos(cuantas: number) {
  if (cuantas <= 0) return []
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: cuantas > 1, selectionLimit: cuantas })
  return r.canceled ? [] : r.assets.map((a) => a.uri).slice(0, cuantas)
}

const confirmar = (titulo: string, texto: string, accion: string) =>
  new Promise<boolean>((res) =>
    Alert.alert(
      titulo,
      texto,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => res(false) },
        { text: accion, onPress: () => res(true) },
      ],
      { cancelable: true, onDismiss: () => res(false) },
    ),
  )

export default function ReferenciasScreen() {
  const { mesa: id } = useLocalSearchParams<{ mesa?: string }>()
  const router = useRouter()
  const mesa = useQuery({ queryKey: ['mesa', id], queryFn: () => abrirMesa(id!), enabled: !!id && id !== 'nueva' })
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'))

  if (!id || id === 'nueva' || mesa.data) return <Composer key={mesa.data?.id ?? 'sin-mesa'} m={mesa.data ?? null} onVolver={volver} />
  return (
    <Marco>
      <Cabeza onVolver={volver} />
      <View style={styles.espera}>
        {mesa.error ? (
          <>
            <Text style={styles.esperaTexto}>No pudimos abrir tu mesa.</Text>
            <Pressable onPress={() => mesa.refetch()} accessibilityRole="button" style={styles.esperaBoton}>
              <Text style={styles.esperaBotonTexto}>Intentar otra vez</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={c.textDim} />
        )}
      </View>
    </Marco>
  )
}

function Composer({ m, onVolver }: { m: MesaAbierta | null; onVolver: () => void }) {
  const router = useRouter()
  const qc = useQueryClient()
  const input = useRef<TextInput>(null)
  const llaves = useRef(0)
  /**
   * The mesa arrives already named: its product photo as @producto, its photobook, and the piece whose look was
   * locked as @estilo — the locked style stops being a flag and becomes a reference with a role.
   */
  const [refs, setRefs] = useState<Ref[]>(() => {
    const puestas: Ref[] = []
    if (m?.photoUrl) puestas.push({ key: 'mesa-producto', name: 'producto', src: m.photoUrl, url: m.photoUrl, source: `de ${m.name}`, role: 'PRODUCT' })
    if (m?.photobook) puestas.push({ key: 'mesa-photobook', name: 'photobook', src: m.photobook.url, url: m.photobook.url, source: `photobook de ${m.name}`, role: 'PHOTOBOOK' })
    if (m?.estilo) puestas.push({ key: 'mesa-estilo', name: 'estilo', src: m.estilo.url, url: m.estilo.url, source: `estilo fijo · ${m.estilo.label}`, role: 'STYLE' })
    return puestas
  })
  const [text, setText] = useState('')
  const [sel, setSel] = useState({ start: 0, end: 0 })
  const [aspect, setAspect] = useState<Aspecto>('3:4')
  // Plan D9's pick until she picks one under «Powered by».
  const [motor, setMotor] = useState<Motor | null>(null)
  const [menu, setMenu] = useState(false)
  const [biblio, setBiblio] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<Record<string, Enviado>>({})
  const elenco = useQuery({ queryKey: ['elenco'], queryFn: verElenco, staleTime: 5 * 60_000 })

  // --- the engine (rules, no tokens) ---
  const uses = readPrompt(text, refs)
  const plan = planFor(uses, refs, motor)
  const usedAt = (i: number) => uses.find((u) => u.index === i)
  const person = uses.some((u) => u.role === 'CHARACTER')
  const product = uses.some((u) => u.role === 'PRODUCT')
  const step1: LineaRef | null =
    plan && text.trim() ? { kind: plan.kind, count: 1, refs: plan.refs, aspect, brief: providerBrief(text, plan), estilo: estiloImage(plan), photobook: photobookImage(plan) } : null
  const key1 = step1 ? JSON.stringify(step1) : null
  // Prices don't depend on the wording, so typing doesn't re-quote.
  const cuerpo1: LineaRef | null = plan ? { kind: plan.kind, count: 1, refs: plan.refs, aspect, brief: '·' } : null
  const cuerpo2: LineaRef | null = plan?.product ? { kind: 'editar', count: 1, refs: [STAND_IN, plan.product], aspect, brief: '·' } : null
  const q1 = useQuery({ queryKey: ['cotizar', cuerpo1], queryFn: () => cotizarRef(cuerpo1!), enabled: !!cuerpo1 })
  const q2 = useQuery({ queryKey: ['cotizar', cuerpo2], queryFn: () => cotizarRef(cuerpo2!), enabled: !!cuerpo2 })

  // --- what this visit asked for, watched until it arrives (looking is what moves it along, D13) ---
  const holds = [...new Set(Object.values(sent).map((s) => s.holdId))]
  const vistas = useQueries({
    queries: holds.map((h) => ({
      queryKey: ['pedido-ref', h],
      queryFn: () => verHold(h),
      refetchInterval: (q: { state: { data?: Pieza[] } }) => (q.state.data?.length && q.state.data.every(terminada) ? false : 2500),
    })),
  })
  const vivas = new Map(vistas.flatMap((q) => q.data ?? []).map((p) => [p.id, p]))
  const mine = Object.entries(sent).map(([id, s]) => ({
    s,
    p: vivas.get(id) ?? ({ id, status: 'queued', resultUrl: null, videoUrl: null, errorMessage: null, createdAt: s.createdAt, updatedAt: null } as Pieza),
  }))
  const running = mine.filter((x) => !terminada(x.p))
  const inFlight = running.length > 0
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!inFlight) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [inFlight])
  // A request is done: the mesa, the balance and the library change.
  const hechos = holds.filter((_, i) => {
    const d = vistas[i]?.data
    return !!d?.length && d.every(terminada)
  })
  useEffect(() => {
    if (!hechos.length) return
    for (const queryKey of [['mesa', m?.id], ['mesas'], ['saldo'], ['biblioteca'], ['trabajos'], ['crear-config']]) qc.invalidateQueries({ queryKey })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hechos.join()])

  const alReves = [...mine].reverse()
  const lastOne = alReves.find((x) => x.s.step === 1)
  // Step 2 is offered while step 1 is ready, had a product, and nothing changed since.
  const offer =
    !inFlight && lastOne && lista(lastOne.p) && lastOne.p.resultUrl && lastOne.s.product && lastOne.s.key === key1 && !mine.some((x) => x.s.from === lastOne.p.id)
      ? { id: lastOne.p.id, url: lastOne.p.resultUrl, product: lastOne.s.product, photobook: lastOne.s.photobook, aspect: lastOne.s.aspect }
      : null
  const lastReady = alReves.find((x) => lista(x.p))?.p
  const ultima = alReves[0]
  const fallo = !inFlight && ultima?.p.status === 'failed' ? ultima : null

  // --- references ---
  const addRefs = (items: { src: string; url: string | null; source: string; name?: string; persona?: boolean }[]) => {
    const taken = refs.map((r) => r.name)
    const fresh = items.slice(0, MAX_REFS - refs.length).map((it, i) => {
      const name = unique(it.name ? slug(it.name) : (DEFAULT_NAMES[refs.length + i] ?? 'imagen'), taken)
      taken.push(name)
      return { key: `r${++llaves.current}`, name, src: it.src, url: it.url, source: it.source, persona: it.persona }
    })
    setRefs((rs) => [...rs, ...fresh])
    return fresh
  }
  const upload = (uris: string[], name?: string) => {
    setUploadError(null)
    const fresh = addRefs(uris.map((src) => ({ src, url: null, source: 'subida', name })))
    for (const r of fresh)
      uploadImage(r.src).then(
        (url) => setRefs((rs) => rs.map((x) => (x.key === r.key ? { ...x, url } : x))),
        () => {
          setRefs((rs) => rs.filter((x) => x.key !== r.key))
          setUploadError('No pudimos subir esa foto. Intenta otra vez.')
        },
      )
    return fresh
  }
  const quitar = (r: Ref) =>
    Alert.alert(`¿Quitar @${r.name}?`, 'Sale de tus referencias. Lo que escribiste se queda igual.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => setRefs((rs) => rs.filter((x) => x.key !== r.key)) },
    ])
  const cycle = (u: Use) => setRefs((rs) => rs.map((x, i) => (i === u.index ? { ...x, role: ROLES[(ROLES.indexOf(u.role) + 1) % ROLES.length] } : x)))

  // --- the @word being typed, and putting a mention in the prompt ---
  const tok = sel.start === sel.end ? text.slice(0, sel.start).match(/@([\p{L}\p{N}_-]*)$/u) : null
  const q = tok ? slug(tok[1]) : null
  /** Replaces the @word being typed with «@name », or puts it at the caret when none is being typed. */
  const mention = (name: string) => {
    const from = tok ? sel.start - tok[0].length : sel.start
    const before = text.slice(0, from)
    const ins = `${before && !/\s$/.test(before) ? ' ' : ''}@${name} `
    const pos = from + ins.length
    setText(before + ins + text.slice(tok ? sel.start : sel.end))
    setSel({ start: pos, end: pos })
    setTimeout(() => input.current?.setSelection(pos, pos), 0)
  }

  // --- what this mesa already made: the work, and quoting one with @ brings it in as a reference ---
  const session: Hecha[] = mine
    .filter((x) => lista(x.p) && x.p.resultUrl)
    .reverse()
    .map((x) => ({ id: x.p.id, url: x.p.resultUrl!, label: x.s.step === 2 ? PASO2 : PASO1 }))
  const deMesa: Hecha[] = (m?.piezas ?? [])
    .filter((p) => p.status === 'ready' && p.resultUrl)
    .reverse()
    // The web composer labels its pieces with an id (c<uuid>): never make a name out of one.
    .map((p) => ({ id: p.id, url: p.resultUrl!, label: p.label && !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(p.label) ? p.label : null }))
  const suyas = m ? [...session, ...deMesa.filter((h) => !session.some((s) => s.id === h.id))] : []
  const nombreDe = (h: Hecha, i: number, taken: string[]) => {
    const palabras = (h.label ?? '').split(/[\s·|,]+/).filter((w) => slug(w) && !CORTAS.has(slug(w)))
    return unique(slug(palabras[0] ?? '').slice(0, 14) || `toma${i + 1}`, taken)
  }
  const nombres: string[] = []
  const delaMesa = suyas.map((h, i) => {
    // Once it is a reference it answers to the name it already has there.
    const ya = refs.find((r) => (r.url ?? r.src) === h.url)
    const name = ya ? ya.name : nombreDe(h, i, [...nombres, ...refs.map((r) => r.name)])
    if (!ya) nombres.push(name)
    return { h, name, ya: !!ya }
  })
  const inRefs = new Set(refs.map((r) => r.url ?? r.src))
  // The cast before the mesa's pieces: a bare «@» shows the first few, and a mesa can hold twenty pieces.
  const pool: Match[] = [
    ...refs.map((r, i) => ({ name: r.name, src: r.src, hint: `${usedAt(i)?.role ?? 'SIN USAR'} · ${r.source}`, ref: r })),
    ...(elenco.data ?? []).filter((p) => !inRefs.has(p.face)).map((p) => ({ name: slug(p.name) || 'persona', src: p.face, hint: `CHARACTER · elenco · ${p.name}`, persona: p })),
    ...delaMesa.filter((g) => !g.ya).map((g) => ({ name: g.name, src: g.h.url, hint: `DE LA MESA · ${g.h.label ?? 'una pieza de aquí'}`, hecha: g.h })),
  ]
  const matches = q === null ? [] : pool.filter((x) => x.name.includes(q)).slice(0, 8)

  const lleno = refs.length >= MAX_REFS
  const pick = (x: Match) => {
    if (x.ref) return mention(x.ref.name)
    if (lleno) return setUploadError(`Ya tienes ${MAX_REFS} referencias: quita una (mantenla presionada) para traer otra.`)
    const r = x.persona
      ? addRefs([{ src: x.persona.face, url: x.persona.face, source: `elenco · ${x.persona.name}`, name: x.name, persona: true }])[0]
      : x.hecha
        ? addRefs([{ src: x.hecha.url, url: x.hecha.url, source: m ? `de ${m.name}` : 'de esta mesa', name: x.name }])[0]
        : undefined
    if (r) mention(r.name)
  }
  const citar = (g: (typeof delaMesa)[number]) => {
    const r = refs.find((x) => (x.url ?? x.src) === g.h.url)
    if (r) return mention(r.name)
    pick({ name: g.name, src: g.h.url, hint: '', hecha: g.h })
  }
  const agregar = async () => upload(await elegirFotos(MAX_REFS - refs.length))
  // «Subir nueva» from the list: the typed @word names it, and it goes into the prompt.
  const subirNueva = async () => {
    if (lleno) return
    const [uri] = await elegirFotos(1)
    const [r] = uri ? upload([uri], tok?.[1]) : []
    if (r) mention(r.name)
  }
  const deBiblioteca = (p: PiezaBiblioteca) => {
    setBiblio(false)
    const ya = refs.find((r) => r.url === p.src)
    if (ya) return mention(ya.name)
    if (lleno || !p.src) return
    const [r] = addRefs([{ src: p.src, url: p.src, source: 'de tu biblioteca', name: tok?.[1] }])
    if (r) mention(r.name)
  }

  // --- the order: priced, confirmed, queued ---
  const mesaId = m ? { mesaId: m.id } : {}
  const orden: { linea: LineaRef; paso: Paso; titulo: string; texto: string } | null = offer
    ? {
        linea: {
          kind: 'editar',
          count: 1,
          refs: offer.photobook ? [offer.url, offer.product, offer.photobook] : [offer.url, offer.product],
          aspect: offer.aspect,
          brief: PRODUCT_FIX,
          ...(offer.photobook ? { photobook: 3 } : {}),
          ...mesaId,
          labels: [PASO2],
        },
        paso: { step: 2, kind: 'editar', key: '', product: null, photobook: null, aspect: offer.aspect, from: offer.id },
        titulo: 'Poner el producto real',
        texto: `${PRODUCTO} pone tu producto real sobre el paso 1, sin deformarlo.`,
      }
    : step1 && plan && key1
      ? {
          linea: { ...step1, ...mesaId, labels: [PASO1] },
          paso: { step: 1, kind: plan.kind, key: key1, product: plan.product, photobook: plan.photobook, aspect },
          titulo: 'Generar con referencias',
          texto: `${MOTOR[plan.kind].nombre} · ${refsWord(plan.refs.length)} · ${aspect}.${plan.product ? ` Cuando llegue, ${PRODUCTO} puede poner el producto real: ese paso se cotiza aparte.` : ''}`,
        }
      : null
  const precio = offer ? q2.data : q1.data
  const disabled = sending || inFlight || !orden || !precio
  const go = async () => {
    if (disabled || !orden || !precio) return
    const si = await confirmar(orden.titulo, `${orden.texto}\n\nSe apartan ${mxn(precio.totalCents)} de tu saldo y se cobra al terminar, sólo si llega.`, `Pedir · ${mxn(precio.totalCents)}`)
    if (!si) return
    setSending(true)
    setSendError(null)
    try {
      const r = await pedirRef(orden.linea)
      const createdAt = new Date().toISOString()
      setSent((x) => ({ ...x, ...Object.fromEntries(r.ids.map((id) => [id, { ...orden.paso, holdId: r.holdId, createdAt }])) }))
      qc.invalidateQueries({ queryKey: ['saldo'] })
    } catch (e) {
      if ((e as { status?: number }).status === 402)
        Alert.alert('Te falta saldo', textoDe(e, 'Tu saldo no alcanza para este pedido.'), [
          { text: 'Ver mi saldo', onPress: () => router.push('/saldo') },
          { text: 'Cerrar', style: 'cancel' },
        ])
      else setSendError(textoDe(e, 'No pudimos hacer el pedido. No se cobró nada.'))
    } finally {
      setSending(false)
    }
  }
  const verPiezas = (id: string) => {
    const ids = mine.filter((x) => lista(x.p)).map((x) => x.p.id)
    router.push({ pathname: '/visor', params: { ids: JSON.stringify(ids), i: String(Math.max(0, ids.indexOf(id))) } })
  }

  // --- what the board says ---
  const model = (u: Use) => {
    const usado = plan?.uses.find((x) => x.index === u.index)
    if (plan && !usado?.image) return `no entra · máx. ${plan.kind === 'misma-persona' ? 4 : 6}`
    return (usado?.model ?? (person && u.role !== 'PRODUCT' ? PERSONA : PRODUCTO)).replace('Nano Banana', 'NB')
  }
  const chips: { label: string; on: boolean; pick?: () => void }[] = [
    { label: aspect, on: true, pick: () => setAspect(ASPECTS[(ASPECTS.indexOf(aspect) + 1) % ASPECTS.length]) },
    { label: plan?.kind === 'retoque' ? '1K' : '2K', on: uses.length > 0 && (plan?.kind !== 'misma-persona' || product) },
    { label: 'misma persona', on: person },
    { label: 'producto real', on: product },
  ]
  // What «Generar» runs now: step 2 alone once step 1 is back, else the plan's chain (both steps before there is one).
  const kinds: Motor[] = offer ? ['editar'] : plan ? [...new Set<Motor>([plan.kind, ...(plan.product ? (['editar'] as const) : [])])] : ['misma-persona', 'editar']
  const auto = motorPorDefecto(uses)
  const error = sendError ?? uploadError ?? (q1.error || q2.error ? 'No pudimos calcular el precio. Revisa tu conexión.' : null)
  const nota =
    error ??
    (fallo
      ? `No salió la pieza de las ${hora(fallo.p.updatedAt ?? fallo.p.createdAt)} con ${MOTOR[fallo.s.kind].nombre}. No se cobró: puedes pedirla otra vez.`
      : offer
        ? `Paso 1 listo: toca aquí para verlo. Luego ${PRODUCTO} pone el producto real.`
        : lastReady && !inFlight
          ? 'Lista: toca aquí para verla.'
          : chainLine(plan))
  const notaVa = !error && !fallo && !inFlight && lastReady ? () => verPiezas(offer?.id ?? lastReady.id) : undefined
  const oldest = running.reduce<string | null>((a, x) => (a && a < x.p.createdAt ? a : x.p.createdAt), null)
  const ctaLabel = sending ? 'Apartando…' : inFlight ? 'Generando' : offer ? 'Poner el producto real' : 'Generar'
  const ctaPrice = inFlight && oldest ? transcurrido(oldest, now) : precio ? mxn(precio.totalCents) : '—'
  const nombresRef = new Set(refs.map((r) => r.name))

  return (
    <Marco>
      <Cabeza onVolver={onVolver} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.cuerpo} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {/* Referencias */}
        <View style={{ gap: 8 }}>
          <View style={styles.filaEntre}>
            <Text style={styles.seccion}>Referencias</Text>
            <Text style={styles.cuenta}>
              {refs.length} de {MAX_REFS}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
            {refs.map((r, i) => {
              const u = usedAt(i)
              return (
                <Pressable
                  key={r.key}
                  onPress={() => mention(r.name)}
                  onLongPress={() => quitar(r)}
                  accessibilityRole="button"
                  accessibilityLabel={`@${r.name}, ${u ? u.role : 'sin usar aún'}. Toca para citarla; mantenla presionada para quitarla.`}
                  style={styles.ref}
                >
                  <View style={[styles.refFoto, { borderColor: u ? c.border : c.borderStrong }]}>
                    <Image source={{ uri: miniatura(r.src, 72) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
                    {r.url ? null : (
                      <View style={styles.velo}>
                        <ActivityIndicator size="small" color={c.text} />
                      </View>
                    )}
                    <View style={styles.rol}>
                      <Text style={[styles.rolTexto, { color: u ? ROLE_COLOR[u.role] : GRAY }]} numberOfLines={1}>
                        {u?.role ?? '—'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.refNombre} numberOfLines={1}>
                    <Text style={styles.arroba11}>@</Text>
                    {r.name}
                  </Text>
                </Pressable>
              )
            })}
            {lleno ? null : (
              <Pressable onPress={agregar} accessibilityRole="button" accessibilityLabel="Agregar imagen" style={styles.agregar}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M12 5v14M5 12h14" stroke={c.textMuted} strokeWidth={1.75} strokeLinecap="round" />
                </Svg>
              </Pressable>
            )}
          </ScrollView>
        </View>

        {/* De esta mesa */}
        {delaMesa.length ? (
          <View style={{ gap: 6 }}>
            <View style={styles.filaBase}>
              <Text style={[styles.seccion, { flexShrink: 1 }]} numberOfLines={1}>
                {m ? `De ${m.name} · ${delaMesa.length}` : `Ya hechas · ${delaMesa.length}`}
              </Text>
              <Text style={styles.pista}>tócalas para citarlas</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }}>
              {delaMesa.map((g) => (
                <Pressable
                  key={g.h.id}
                  onPress={() => citar(g)}
                  accessibilityRole="button"
                  accessibilityLabel={g.ya ? `@${g.name} ya está en tus referencias` : `Citar @${g.name} en el prompt`}
                  style={[styles.toma, { opacity: g.ya ? 0.45 : 1 }]}
                >
                  <Image source={{ uri: miniatura(g.h.url, 56) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
                  <View style={styles.tomaEtiqueta}>
                    <Text style={styles.tomaNombre} numberOfLines={1}>
                      @{g.name}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* The prompt, its @chips, and the list of what matches the @word being typed */}
        <View style={{ gap: 10 }}>
          <TextInput
            ref={input}
            multiline
            onChangeText={setText}
            onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
            placeholder="Escribe lo que quieres y señala tus imágenes con @"
            placeholderTextColor={c.textDim}
            selectionColor={c.accent}
            submitBehavior={matches.length ? 'submit' : 'blurAndSubmit'}
            onSubmitEditing={() => (matches[0] ? pick(matches[0]) : undefined)}
            accessibilityLabel="Qué quieres crear"
            style={styles.editor}
          >
            {trozos(text, nombresRef).map((t, i) =>
              t.ref ? (
                <Text key={i} style={styles.mencion}>
                  <Text style={styles.mencionArroba}>@</Text>
                  {t.text.slice(1)}
                </Text>
              ) : (
                <Text key={i} style={t.at ? styles.mencionSuelta : undefined}>
                  {t.text}
                </Text>
              ),
            )}
          </TextInput>
          {q !== null ? (
            <View accessibilityLabel="Referencias que coinciden" style={styles.lista}>
              <Text style={styles.listaCabeza}>{`@${q} — ${matches.length ? `${matches.length} ${matches.length === 1 ? 'coincide' : 'coinciden'}` : 'sin coincidencias'}`}</Text>
              {matches.map((x, i) => (
                <Pressable
                  key={`${x.name}-${x.src}`}
                  onPress={() => pick(x)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: i === 0 }}
                  accessibilityLabel={`@${x.name}, ${x.hint}`}
                  style={[styles.opcion, i === 0 && { backgroundColor: c.bgOverlay }]}
                >
                  <View style={styles.opcionFoto}>
                    <Image source={{ uri: miniatura(x.src, 34) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                    <Text style={styles.opcionNombre} numberOfLines={1}>
                      <Text style={styles.arroba115}>@</Text>
                      {x.name}
                    </Text>
                    <Text style={styles.opcionPista} numberOfLines={1}>
                      {x.hint}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <View style={styles.listaPie}>
                <Pressable onPress={subirNueva} disabled={lleno} accessibilityRole="button" style={[styles.listaBoton, lleno && { opacity: 0.45 }]}>
                  <Text style={styles.listaBotonTexto}>Subir nueva</Text>
                </Pressable>
                <Pressable onPress={() => setBiblio(true)} accessibilityRole="button" style={styles.listaBoton}>
                  <Text style={styles.listaBotonTexto}>De la biblioteca</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {/* Lo que entendió el motor */}
        {uses.length ? (
          <View style={styles.plan}>
            <Text style={styles.planCabeza}>Lo que entendió el motor</Text>
            {uses.map((u) => (
              <View key={u.index} style={styles.planFila}>
                <Text style={styles.planNombre} numberOfLines={1}>
                  <Text style={styles.arroba11}>@</Text>
                  {u.name}
                </Text>
                <Pressable onPress={() => cycle(u)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Rol de @${u.name}: ${u.role}. Toca para cambiarlo`} style={styles.planRol}>
                  <Text style={[styles.planRolTexto, { color: ROLE_COLOR[u.role] }]}>{u.role}</Text>
                </Pressable>
                <Text style={styles.planModelo} numberOfLines={1}>
                  {model(u)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Format (picked) and facts */}
        <View style={styles.chips}>
          {chips.map((k) => (
            <Pressable
              key={k.label}
              onPress={k.pick}
              disabled={!k.pick}
              accessibilityRole={k.pick ? 'button' : 'text'}
              accessibilityLabel={k.pick ? `Formato ${aspect}; toca para cambiarlo` : k.label}
              style={[styles.chip, { borderColor: k.on ? c.borderStrong : c.border, backgroundColor: k.on ? c.bgOverlay : c.bgRaised }]}
            >
              <Text style={[styles.chipTexto, { color: k.on ? c.text : GRAY }]}>{k.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.pie}>
          <Pressable onPress={notaVa} disabled={!notaVa} accessibilityRole={notaVa ? 'button' : 'text'}>
            <Text style={[styles.nota, { color: error || fallo ? c.accent2 : GRAY }]}>{nota}</Text>
          </Pressable>
          <View style={styles.motorCaja}>
            {/* Tapping «Powered by» picks step 1's engine; «Automático» is plan D9 reading the references. */}
            {menu ? (
              <View style={styles.menu}>
                <Text style={styles.menuCabeza}>Modelo del paso 1</Text>
                {([null, 'misma-persona', 'editar', 'retoque'] as const).map((k) => {
                  const on = motor === k
                  return (
                    <Pressable
                      key={k ?? 'auto'}
                      onPress={() => {
                        setMotor(k)
                        setMenu(false)
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.menuOpcion, on && { backgroundColor: c.bgOverlay }]}
                    >
                      {k ? <Image source={{ uri: MOTOR[k].logo }} style={styles.logo16} contentFit="contain" /> : null}
                      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                        <Text style={styles.menuNombre}>{k ? MOTOR[k].nombre : 'Automático'}</Text>
                        <Text style={styles.menuNota}>
                          {k ? MOTOR[k].nota : `Según tus referencias: ${MOTOR[auto].nombre}${auto === 'misma-persona' ? ', porque hay una persona.' : ', porque no hay persona.'}`}
                        </Text>
                      </View>
                      <Text style={styles.menuCheck}>{on ? '✓' : ''}</Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : null}
            <Pressable onPress={() => setMenu((v) => !v)} accessibilityRole="button" accessibilityLabel="Cambiar el modelo" accessibilityState={{ expanded: menu }} style={styles.powered}>
              <Text style={styles.poweredTexto}>Powered by</Text>
              {kinds.map((k, i) => (
                <Fragment key={k}>
                  {i ? <Text style={styles.poweredTexto}>+</Text> : null}
                  <View style={styles.poweredMotor}>
                    <Image source={{ uri: MOTOR[k].logo }} style={styles.logo14} contentFit="contain" />
                    <Text style={styles.poweredNombre}>{MOTOR[k].nombre}</Text>
                  </View>
                </Fragment>
              ))}
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                <Path d="m6 9 6 6 6-6" stroke={GRAY} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          </View>
          <Pressable
            onPress={go}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled, busy: sending || inFlight }}
            style={({ pressed }) => [styles.generar, { opacity: disabled && !inFlight ? 0.45 : pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.generarTexto}>{ctaLabel}</Text>
            <Text style={[styles.generarTexto, { opacity: 0.45 }]}>·</Text>
            <Text style={[styles.generarTexto, styles.generarPrecio]}>{ctaPrice}</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Biblioteca visible={biblio} onClose={() => setBiblio(false)} onPick={deBiblioteca} />
    </Marco>
  )
}

/** «De la biblioteca»: her finished photos, one tap to bring one in as a reference. */
function Biblioteca({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (p: PiezaBiblioteca) => void }) {
  const { width } = useWindowDimensions()
  const piezas = useQuery({ queryKey: ['biblioteca'], queryFn: verBiblioteca, enabled: visible })
  const fotos = (piezas.data ?? []).filter((p) => p.src && !p.video)
  const lado = (width - 32 - 12) / 3
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.hoja}>
        <View style={styles.filaEntre}>
          <Text style={styles.hojaTitulo}>De tu biblioteca</Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.esperaBoton}>
            <Text style={styles.esperaBotonTexto}>Cerrar</Text>
          </Pressable>
        </View>
        {piezas.isPending ? (
          <ActivityIndicator color={c.textDim} style={{ marginTop: 40 }} />
        ) : piezas.error ? (
          <View style={styles.espera}>
            <Text style={styles.esperaTexto}>No pudimos abrir tu biblioteca.</Text>
            <Pressable onPress={() => piezas.refetch()} accessibilityRole="button" style={styles.esperaBoton}>
              <Text style={styles.esperaBotonTexto}>Intentar otra vez</Text>
            </Pressable>
          </View>
        ) : !fotos.length ? (
          <View style={styles.espera}>
            <Text style={styles.esperaTexto}>Todavía no hay fotos en tu biblioteca.</Text>
          </View>
        ) : (
          <FlatList
            data={fotos}
            keyExtractor={(p) => p.id}
            numColumns={3}
            columnWrapperStyle={{ gap: 6 }}
            contentContainerStyle={{ gap: 6, paddingBottom: 32 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => onPick(item)} accessibilityRole="imagebutton" accessibilityLabel={`Usar ${item.name} como referencia`} style={[styles.hojaFoto, { width: lado }]}>
                <Image source={{ uri: miniatura(item.src, lado) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  )
}

/** The board's title row: the way back to Crear, and how this screen is used. */
function Cabeza({ onVolver }: { onVolver: () => void }) {
  return (
    <View style={styles.cabeza}>
      <Pressable onPress={onVolver} accessibilityRole="button" accessibilityLabel="Volver a crear sin referencias" style={styles.volver}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M15 5 8 12l7 7" stroke={c.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={styles.titulo} accessibilityRole="header">
          Crear con referencias
        </Text>
        <Text style={styles.subtitulo}>
          Señala las imágenes con <Text style={{ fontFamily: FONT.mono, color: c.accent2 }}>@</Text>
        </Text>
      </View>
    </View>
  )
}

function Marco({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
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

  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 10, paddingHorizontal: 8, paddingBottom: 8 },
  volver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 19, fontWeight: '600', letterSpacing: -0.38, color: c.text },
  subtitulo: { fontSize: 12.5, color: c.textMuted },

  cuerpo: { flexGrow: 1, gap: 14, paddingTop: 8, paddingHorizontal: 16, paddingBottom: 16 },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filaBase: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  seccion: { fontSize: 12.5, color: c.textMuted },
  cuenta: { fontFamily: FONT.mono, fontSize: 11, color: GRAY },
  pista: { fontSize: 11.5, color: GRAY },

  ref: { width: 72, gap: 4 },
  refFoto: { width: 72, height: 88, borderRadius: 10, borderWidth: 1, overflow: 'hidden', backgroundColor: c.bgElevated },
  velo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,10,0.5)', alignItems: 'center', justifyContent: 'center' },
  rol: { position: 'absolute', left: 4, right: 4, bottom: 4, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(10,10,10,0.78)', alignItems: 'center' },
  rolTexto: { fontFamily: FONT.mono, fontSize: 8, letterSpacing: 0.32 },
  refNombre: { fontSize: 12, fontWeight: '500', color: c.text },
  arroba11: { fontFamily: FONT.mono, fontSize: 11, color: c.accent2 },
  agregar: { width: 72, height: 88, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },

  toma: { width: 56, height: 70, borderRadius: 9, overflow: 'hidden', backgroundColor: c.bgElevated },
  tomaEtiqueta: { position: 'absolute', left: 3, right: 3, bottom: 3, paddingVertical: 1, borderRadius: 4, backgroundColor: 'rgba(10,10,10,0.78)', alignItems: 'center' },
  tomaNombre: { fontFamily: FONT.mono, fontSize: 8.5, color: c.text },

  editor: {
    minHeight: 150,
    padding: 14,
    paddingTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: c.bgRaised,
    color: c.text,
    fontSize: 15.5,
    lineHeight: 28.7,
    textAlignVertical: 'top',
  },
  mencion: { fontFamily: FONT.medium, fontSize: 14, color: c.text, backgroundColor: c.bgOverlay },
  mencionArroba: { fontFamily: FONT.mono, fontSize: 11.5, color: c.accent2 },
  mencionSuelta: { fontFamily: FONT.mono, color: c.accent2 },

  lista: {
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.bgRaised,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  listaCabeza: { paddingVertical: 4, paddingHorizontal: 10, fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: GRAY },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  opcionFoto: { width: 34, height: 42, borderRadius: 6, overflow: 'hidden', backgroundColor: c.bgElevated },
  opcionNombre: { fontSize: 14, fontWeight: '500', color: c.text },
  arroba115: { fontFamily: FONT.mono, fontSize: 11.5, color: c.accent2 },
  opcionPista: { fontSize: 11.5, color: GRAY },
  listaPie: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingHorizontal: 8, paddingBottom: 4, borderTopWidth: 1, borderTopColor: c.bgOverlay },
  listaBoton: { flex: 1, minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  listaBotonTexto: { fontSize: 12.5, color: c.text },

  plan: { gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border },
  planCabeza: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: c.accent2 },
  planFila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.bgOverlay },
  planNombre: { width: 76, flexShrink: 0, fontSize: 12.5, fontWeight: '500', color: c.text },
  planRol: { width: 84, flexShrink: 0 },
  planRolTexto: { fontFamily: FONT.mono, fontSize: 10 },
  planModelo: { flexShrink: 1, marginLeft: 'auto', fontFamily: FONT.mono, fontSize: 10.5, color: GRAY, textAlign: 'right' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 32, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  chipTexto: { fontFamily: FONT.mono, fontSize: 11.5 },

  pie: { gap: 8, marginTop: 'auto' },
  nota: { fontSize: 12, lineHeight: 18 },
  motorCaja: { alignSelf: 'center', alignItems: 'center', gap: 6 },
  powered: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, minHeight: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.border },
  poweredTexto: { fontSize: 12, color: GRAY },
  poweredMotor: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  poweredNombre: { fontSize: 12, fontWeight: '500', color: '#C7C7C7' },
  logo14: { width: 14, height: 14 },
  logo16: { width: 16, height: 16 },
  menu: { width: 320, maxWidth: '100%', gap: 2, padding: 6, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: '#111111' },
  menuCabeza: { paddingTop: 4, paddingHorizontal: 8, paddingBottom: 6, fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: '#6E6E6E' },
  menuOpcion: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  menuNombre: { fontSize: 13, fontWeight: '500', color: c.text },
  menuNota: { fontSize: 11.5, lineHeight: 15.5, color: GRAY },
  menuCheck: { fontSize: 13, color: c.accent },
  generar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 54, borderRadius: 999, backgroundColor: c.accent },
  generarTexto: { fontSize: 16, fontWeight: '600', color: c.bg },
  generarPrecio: { fontFamily: FONT.monoMedium, fontWeight: '500' },

  hoja: { flex: 1, gap: 12, paddingTop: 12, paddingHorizontal: 16, backgroundColor: c.bg },
  hojaTitulo: { fontSize: 17, fontWeight: '600', color: c.text },
  hojaFoto: { aspectRatio: 3 / 4, borderRadius: 10, overflow: 'hidden', backgroundColor: c.bgElevated },
})
