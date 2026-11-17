import type { Aspecto } from './estudio'

/**
 * Pasarela's shapes and pure rules (calls in lib/pasarela-api.ts; web `lib/pasarela/nativa.ts`): the phone only continues a session made on the computer — it
 * changes options, prices and generates, and takes takes to Historia. It never creates sessions, adds or connects
 * nodes. The server composes every prompt; the catalog it sends has labels and photos, never prompt text.
 */

export type TipoNodo =
  | 'pieza' | 'modelo' | 'moodboard' | 'set' | 'luz' | 'toma' | 'peinado' | 'maquillaje' | 'pose'
  | 'sesion' | 'macro' | 'ampliar' | 'video' | 'relight' | 'formatos' | 'historia'
export type Datos = Record<string, unknown>
export interface Nodo {
  id: string
  tipo: TipoNodo
  datos: Datos
}
/** A Generation of the session: `toma` is its place in its node. */
export interface Toma {
  id: string
  nodoId: string
  toma: number
  status: string
  resultUrl: string | null
  errorMessage: string | null
  createdAt: string
}
export interface Persona {
  id: string
  name: string
  face: string
  soulId: boolean
}
export interface Opcion {
  id: string
  label: string
}
export interface Preset extends Opcion {
  src: string | null
  pos: string
  sw: string
  /** «Tu foto» / «Tu referencia»: the person's own photo, read to words. */
  propia: boolean
  desc: string
}
export type TipoPreset = 'set' | 'luz' | 'peinado' | 'maquillaje'
export interface Catalogo {
  presets: Record<TipoPreset, Preset[]>
  defecto: Partial<Record<TipoNodo, string>>
  toma: { plano: Opcion[]; punto: Opcion[]; sitio: Opcion[]; fuera: Opcion[] }
  categorias: Opcion[]
  muestras: Opcion[]
  movimientos: Opcion[]
  duraciones: number[]
  etiquetas: Record<TipoNodo, string>
  ayuda: Record<TipoNodo, string>
  maxHistoria: number
  maxTexto: number
}
export interface SesionAbierta {
  sesion: { id: string; name: string; plantilla: string | null; updatedAt: string }
  nodos: Nodo[]
  tomas: Toma[]
  /** The take ids that reach each result node (Ampliar, Video, Historia…), in the canvas's order. */
  llegan: Record<string, string[]>
  /** Each Sesión's tiles: its latest take per place, or null when not asked yet. */
  mosaico: Record<string, (string | null)[]>
  corriendo: number
  personas: Persona[]
  saldoCents: number
  sigue: { tipo: TipoNodo; titulo: string; texto: string } | null
  catalogo: Catalogo
}
export interface SesionResumen {
  id: string
  name: string
  plantilla: string | null
  updatedAt: string
  portadaUrl: string | null
}
export interface Linea {
  kind: string
  unitCents: number
  count: number
  luego?: boolean
}
/** POST /api/pasarela/precio: the price and its firma, or what is missing (a code of the web's lib/errores). */
export type Precio = { lines: Linea[]; totalCents: number; firma: string } | { falta: string }

// --- pure (lib/pasarela.check.ts) ---

export const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const texto = (v: unknown) => (typeof v === 'string' ? v : '')

export type Estado = 'lista' | 'generando' | 'en-cola' | 'no-salio' | 'vacia'
const CORRIENDO = ['submitting', 'submitted', 'settling', 'running']
/** The web's four looks of a tile (and empty, never asked). */
export function estadoDe(t: Pick<Toma, 'status' | 'resultUrl'> | undefined): Estado {
  if (!t) return 'vacia'
  if (t.status === 'ready') return t.resultUrl ? 'lista' : 'no-salio'
  if (t.status === 'failed') return 'no-salio'
  return CORRIENDO.includes(t.status) ? 'generando' : 'en-cola'
}

/** The preset a node shows: its own, else what the server falls back to (unless it carries its own reading). */
export function presetDe(n: Nodo | undefined, tipo: TipoPreset, c: Catalogo): Preset | undefined {
  const id = n?.datos.preset ?? (n && texto(n.datos.texto) ? undefined : c.defecto[tipo])
  return c.presets[tipo].find((p) => p.id === id)
}

/** A Historia node's scenes, one per chosen take: «Termina en la siguiente» on unless turned off; the last has no next. */
export function escenasDe(datos: Datos): { texto: string; fin: boolean }[] {
  const t = ids(datos.tomas)
  const esc = Array.isArray(datos.escenas) ? (datos.escenas as { texto?: unknown; fin?: unknown }[]) : []
  return t.map((_, i) => ({ texto: texto(esc[i]?.texto), fin: i < t.length - 1 && esc[i]?.fin !== false }))
}

/**
 * Chooses or drops a take (the web's `alternarToma`): Historia keeps the order, up to `max`, with its scenes; the
 * others just toggle it. Answers only what changes, to save.
 */
export function alternarToma(n: Nodo, tomaId: string, max: number): Datos {
  const t = ids(n.datos.tomas)
  const k = t.indexOf(tomaId)
  if (n.tipo !== 'historia') return { tomas: k >= 0 ? t.filter((x) => x !== tomaId) : [...t, tomaId] }
  const esc = escenasDe(n.datos)
  if (k >= 0) {
    t.splice(k, 1)
    esc.splice(k, 1)
  } else {
    if (t.length >= max) return {}
    // The scene that was last now has a next: on, as every scene starts.
    if (esc.length) esc[esc.length - 1].fin = true
    t.push(tomaId)
    esc.push({ texto: '', fin: false })
  }
  if (esc.length) esc[esc.length - 1].fin = false
  return { tomas: t, escenas: esc }
}

/** The bottom button's words for the node it generates (the canvas's). */
export function etiquetaGenerar(tipo: TipoNodo, k: number): string {
  const p = (uno: string, varios: string) => `${k} ${k === 1 ? uno : varios}`
  if (tipo === 'sesion') return `Generar ${p('toma', 'tomas')}`
  if (tipo === 'macro') return `Generar ${p('detalle', 'detalles')}`
  if (tipo === 'ampliar') return `Ampliar ${k}`
  if (tipo === 'video') return `Generar ${p('video', 'videos')}`
  return 'Generar'
}

/** How many pieces the price asks for (the accessories step rides on its take) and «N × $X» when they cost the same. */
export function resumenPrecio(p: { lines: Linea[]; totalCents: number }, mxn: (c: number) => string) {
  const propias = p.lines.filter((l) => !l.luego)
  const k = propias.reduce((a, l) => a + l.count, 0)
  // Only when it is exactly what is charged: a minimum charge or an accessories step makes the total differ.
  const unico = propias.every((l) => l.unitCents === propias[0]?.unitCents) && k * (propias[0]?.unitCents ?? 0) === p.totalCents
  return { k, detalle: unico && k > 1 ? `${k} × ${mxn(propias[0].unitCents)} MXN` : `${mxn(p.totalCents)} MXN` }
}

export const ASPECTOS: Aspecto[] = ['1:1', '4:5', '3:4', '9:16', '16:9']
