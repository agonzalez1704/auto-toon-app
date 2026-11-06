import * as FileSystem from 'expo-file-system/legacy'
import * as MediaLibrary from 'expo-media-library'
import api, { waitForAuthToken } from './api'
import { CONFIG } from './config'
import type { Apartado, Aspecto, Cotizacion } from './estudio'

/**
 * The viewer's calls (web `components/pantallas/visor.tsx` and `app/(estudio)/biblioteca/visor.ts`), beside
 * lib/estudio: the request lines it prices and sends, the four gates, and the files it saves or hands over.
 */

/** The lines the viewer sends, shaped as the web builds them (`lib/jobs/schema.ts` jobRequest). */
export type LineaVisor =
  /** «Rehacer en alta»: a draft shot again from its own image, at final quality (web `sugerencias`). */
  | { kind: 'producto'; count: 1; refs: string[]; aspect: Aspecto; calidad: 'final'; brief: string }
  /** «Ponla en movimiento»: a 5 s reel from the shot, the web Video screen's default move (no brief). */
  | { kind: 'reel'; count: 1; refs: string[]; aspect: Aspecto; durationS: number }
  /** «Editar esta toma» in words only (web `lineaEditar` without photos or a painted zone). */
  | { kind: 'editar'; count: 1; refs: string[]; aspect: Aspecto; brief: string; labels?: string[] }

export const cotizarLinea = async (l: LineaVisor) => (await api.post<Cotizacion>('/api/jobs/quote', l)).data
export const pedirLinea = async (l: LineaVisor) => (await api.post<Apartado>('/api/jobs', l)).data

/** The draft's own image is what the finished version is shot from (web `ALTA_BRIEF`). */
export const ALTA_BRIEF =
  'Vuelve a tomar esta misma escena en calidad alta: la misma composición, la misma luz y el mismo producto de la imagen de referencia, sin cambiar el encuadre.'

// --- the four gates (web `lib/crear/puertas.ts`) ---
export type Veredicto = { ok: boolean | null; porque: string }
export interface Puertas {
  identidad: Veredicto
  lectura: Veredicto
  destinatario: Veredicto & { publico: string }
  publicable: Veredicto
  /** One direction for the next take, in the person's words; empty when everything passed. */
  arreglo: string
}
/** Three vision calls on the server: free for her, but seconds, not instant. */
export const revisarPuertas = async (imageUrl: string, refs: string[]) =>
  (await api.post<Puertas>('/api/crear/puertas', { imageUrl, refs: refs.slice(0, 5) }, { timeout: 90_000 })).data

// --- files ---
/** The piece into her photo library (an image or a video, named what it is); false when she said no to access. */
export async function guardarEnFotos(url: string, id: string) {
  const { status } = await MediaLibrary.requestPermissionsAsync()
  if (status !== 'granted') return false
  const ext = url.split('?')[0].match(/\.([a-z0-9]{3,4})$/i)?.[1]?.toLowerCase() ?? 'jpg'
  const r = await FileSystem.downloadAsync(url, `${FileSystem.cacheDirectory}auto-toon-${id}.${ext}`)
  await MediaLibrary.saveToLibraryAsync(r.uri)
  return true
}

/** «Entregar»: the original, 9:16 and 4:5 in one zip (web `GET /api/entregar`), as a local file to share. */
export async function entregarZip(url: string, base: string, pieza: string) {
  const token = await waitForAuthToken()
  const q = `url=${encodeURIComponent(url)}&base=${encodeURIComponent(base)}&pieza=${encodeURIComponent(pieza)}`
  const r = await FileSystem.downloadAsync(
    `${CONFIG.API_BASE_URL}/api/entregar?${q}`,
    `${FileSystem.cacheDirectory}entrega-${pieza}.zip`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  )
  if (r.status !== 200) throw new Error('No pudimos armar la entrega. Intenta otra vez.')
  return r.uri
}
