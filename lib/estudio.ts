import api from './api'
import { CONFIG } from './config'

/**
 * The web studio over REST (plan docs/plans/2026-11-05-paridad-web.md): mesas, Crear's ideas, the job queue
 * and the balance. Same shapes as the web's (`app/(estudio)/crear/mesas.ts`, `components/pantallas/runs.ts`,
 * `lib/jobs/schema.ts`); the server composes every prompt — the app sends data, never text for the model.
 */

export type Aspecto = '1:1' | '4:5' | '3:4' | '9:16' | '16:9'

export interface MesaResumen {
  id: string
  name: string
  photoUrl: string | null
  portadaUrl: string | null
  estiloLabel: string | null
  piezas: number
  cents: number
  cuando: string
  actual: boolean
}

/** A piece as the queue reports it (`GET /api/jobs?hold=`) and as a mesa lists it. */
export interface Pieza {
  id: string
  status: string
  resultUrl: string | null
  videoUrl: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string | null
  label?: string | null
  aspect?: Aspecto
  holdId?: string | null
  priceCents?: number | null
  unitCents?: number
  kind?: string
  module?: string
}

export interface MesaAbierta {
  id: string
  name: string
  photoUrl: string | null
  refs: string[]
  photobook: { id: string; url: string } | null
  marca: string | null
  analysis: unknown
  categoryId: string | null
  pedidos: string[]
  estilo: { id: string; url: string; label: string } | null
  piezas: Pieza[]
}

export interface CambioMesa {
  name?: string
  photoUrl?: string | null
  refs?: string[]
  analysis?: unknown
  categoryId?: string | null
  pedidos?: string[]
}

export interface Categoria {
  id: string
  name: string
  variants: { id: string; name: string; desc: string }[]
}

export interface Propuesta {
  nombre: string
  descripcion: string
  escena: string
  composicion: string
}

/** A product request line (`lib/jobs/schema.ts` jobRequest), the part the app uses. */
export interface LineaProducto {
  kind: 'producto'
  count: number
  refs: string[]
  aspect: Aspecto
  calidad?: 'borrador' | 'final'
  fichaProducto?: string
  variants: { category: string; ids: string[]; slots?: Record<string, string>; escenas?: Record<string, string> }
  mesaId?: string
  labels?: string[]
}
export type Pedido = LineaProducto | { lines: LineaProducto[] }

export interface Cotizacion {
  totalCents: number
  feeCents: number
  lines: { kind: string; count: number; unitCents: number }[]
}

export interface Apartado {
  holdId: string
  ids: string[]
  amountCents: number
  lines: { kind: string; unitCents: number; count: number }[]
}

export interface Saldo {
  saldoCents: number
  apartadoCents: number
  gastoMesCents: number
}

// --- mesas ---
export const listarMesas = async () => (await api.get<{ mesas: MesaResumen[] }>('/api/mesas')).data.mesas
/** The same list with «Aquí estás» on the mesa Crear shows (the server marks the last one touched otherwise). */
export const listarMesasDesde = async (actual: string | null) =>
  (await api.get<{ mesas: MesaResumen[] }>('/api/mesas', { params: actual ? { actual } : {} })).data.mesas
export const abrirMesa = async (id: string) => (await api.get<{ mesa: MesaAbierta }>(`/api/mesas/${encodeURIComponent(id)}`)).data.mesa
export const crearMesa = async (c: CambioMesa) => (await api.post<{ ok: true; id: string }>('/api/mesas', c)).data.id
export const guardarMesa = async (id: string, c: CambioMesa) => (await api.patch<{ ok: true; id: string }>(`/api/mesas/${encodeURIComponent(id)}`, c)).data.id
export const archivarMesa = async (id: string) => (await api.post(`/api/mesas/${encodeURIComponent(id)}/archivar`)).data

// --- Crear ---
export const configCrear = async () => (await api.get<{ categorias: Categoria[]; gastoMesCents: number }>('/api/crear/config')).data

/** Ideas for this product, made from its photos (and what she asked for, the last weighs most). */
export async function pedirPropuestas(o: { imageUrl: string; imageUrls?: string[]; producto?: string | null; categoria?: string | null; peticion: string[]; evitar: string[] }) {
  // Claude reads the photos and writes: it can take a while.
  return (await api.post<{ propuestas: Propuesta[]; respuesta: string }>('/api/crear/propuestas', { cuantas: 5, ...o }, { timeout: 180_000 })).data
}

/** What the photo is: its name and the studio's category (the older helper in lib/api drops the category). */
export async function analizarFoto(imageUrl: string) {
  const { data } = await api.post<{ result?: { productName?: string }; categoryId?: string }>('/api/analyze-product', { imageUrl }, { timeout: 300_000 })
  const nombre = data.result?.productName && data.result.productName !== 'Product' ? data.result.productName.slice(0, 80) : null
  return { nombre, categoryId: data.categoryId ?? 'other' }
}

// --- the queue ---
export const cotizar = async (p: Pedido) => (await api.post<Cotizacion>('/api/jobs/quote', p)).data
export const pedir = async (p: Pedido) => (await api.post<Apartado>('/api/jobs', p)).data
/** Looking is also what moves the pieces along on the server (`recover`): poll it while something runs. */
export const verPedido = async (holdId: string) => (await api.get<{ pieces: Pieza[] }>('/api/jobs', { params: { hold: holdId } })).data.pieces
export const cancelarPedido = async (holdId: string) => (await api.post('/api/jobs/cancelar', { holdId })).data
export const reintentarPieza = async (id: string) => (await api.post<Apartado>('/api/jobs/reintentar', { id })).data

// --- money ---
export const verSaldo = async () => (await api.get<Saldo>('/api/saldo')).data
/** A StoreKit balance purchase, verified with Apple and credited once (the app finishes the transaction after). */
export const acreditarSaldoApple = async (o: { transactionId: string; productId: string }) =>
  (await api.post<{ ok: true; saldoCents: number; yaEstaba: boolean }>('/api/iap/apple/saldo', o)).data

/** «$1,234.50». */
export const mxn = (cents: number) => `$${(cents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** A piece that came out, one that failed, or one still on its way. */
export const lista = (p: Pick<Pieza, 'status' | 'resultUrl' | 'videoUrl'>) => (p.status === 'ready' || p.status === 'completed') && !!(p.resultUrl ?? p.videoUrl)
export const terminada = (p: Pick<Pieza, 'status'>) => p.status === 'ready' || p.status === 'completed' || p.status === 'failed'

// --- Biblioteca and Trabajos (`app/(estudio)/biblioteca/datos.ts`, `app/(estudio)/trabajos/datos.ts` on the web) ---
export interface PiezaBiblioteca {
  id: string
  name: string
  module: string
  /** What the model was asked (the server wrote it). */
  prompt: string
  /** «Motor · forma · calidad», as the web's sheet shows it. */
  meta: string
  motor: string
  forma: string
  /** The images it was made from, in order. */
  refs: string[]
  calidad: string | null
  orden: number | null
  /** The request it came in, and what that charge finally took (null until captured). */
  holdId: string | null
  /** What ties a stack together: the product photo it was made from. */
  grupo: string
  /** The mesa that copies this piece's look, when one does. */
  ancla: string | null
  aspect: Aspecto
  time: string
  day: string
  dayKey: string
  src: string | null
  video: string | null
  poster: string | null
  priceCents: number | null
  cobradoCents: number | null
  isPublic: boolean
  campaign: boolean
  cat: 'producto' | 'persona' | 'video' | null
  antigua: boolean
}
export type EstadoPieza = 'q' | 'run' | 'ok' | 'fail' | 'cancel'
export interface Trabajo {
  id: string
  name: string
  kind: string
  src: string | null
  st: EstadoPieza
  state: string
  when: string
  cost: string
  desc: string
  steps: EstadoPieza[]
  detail: { label: string; model: string; st: EstadoPieza; meta: string }[]
  hold: string
  charged: string
  cancelable: boolean
  readyId: string | null
}
export const verBiblioteca = async () => (await api.get<{ piezas: PiezaBiblioteca[] }>('/api/biblioteca')).data.piezas
export const verTrabajos = async () => (await api.get<{ jobs: Trabajo[]; running: number }>('/api/trabajos')).data

// --- Campañas (`app/(estudio)/campanas/data.ts` on the web; read-only here for now) ---
export interface CampanaResumen {
  id: string
  name: string
  createdAt: string
  piezas: number
  portadaUrl: string | null
}
export interface PiezaCampana {
  id: string
  kind: string
  status: string
  resultUrl: string | null
  videoUrl: string | null
  aspect: Aspecto
  priceCents: number | null
  canceled: boolean
}
export interface Campana {
  id: string
  name: string
  spentCents: number
  createdAt: string
  pieces: PiezaCampana[]
}
export const listarCampanas = async () => (await api.get<{ campanas: CampanaResumen[] }>('/api/campanas')).data.campanas
export const abrirCampana = async (id: string) => (await api.get<{ campana: Campana }>(`/api/campanas/${encodeURIComponent(id)}`)).data.campana

/** next/image's own widths (the server rejects any other). */
const ANCHOS = [128, 256, 384, 640, 828, 1080, 1920] as const
/**
 * A grid-sized copy of a piece: the web's image optimizer resizes our storage's images (R2, Supabase), so a
 * mosaic doesn't pull 2K PNGs. `ancho` is in points; it's doubled for the retina screen. Other hosts go as they are.
 */
export function miniatura(url: string | null | undefined, ancho: number): string | null {
  if (!url) return null
  if (!/^https:\/\/[^/]+\.(r2\.dev|supabase\.co|supabase\.in)\//.test(url)) return url
  // A local dev server runs next/image unoptimized (no /_next/image): the original it is.
  if (/\/\/(localhost|127\.|192\.168\.|10\.)/.test(CONFIG.API_BASE_URL)) return url
  const w = ANCHOS.find((a) => a >= ancho * 2) ?? 1920
  // q=75 is the only quality the deployment accepts (Vercel rejects others with 400).
  return `${CONFIG.API_BASE_URL}/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75`
}
