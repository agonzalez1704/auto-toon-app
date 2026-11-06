import * as FileSystem from 'expo-file-system/legacy'
import * as MediaLibrary from 'expo-media-library'
import api from '@/lib/api'
import type { Apartado, Aspecto, Cotizacion, Pieza } from '@/lib/estudio'

/**
 * The parts of the queue and the mesa that Crear needs beyond lib/estudio: any job kind (a photobook, a relight,
 * a product shot riding with its photobook and locked look), a request's pieces with their charge, and the mesa
 * fields the REST takes (`lib/mesas-esquema.ts` on the web) that `CambioMesa` doesn't list.
 */

export type Luz = 'estudiofrio' | 'ventana' | 'tarde' | 'contraluz' | 'noche' | 'nublado' | 'dura'

/** One line of `lib/jobs/schema.ts` jobRequest — the fields Crear sends. */
export interface Linea {
  kind: 'producto' | 'photobook' | 'editar'
  count: number
  refs: string[]
  aspect: Aspecto
  fichaProducto?: string
  /** The first ref is the product's photobook. */
  photobook?: boolean
  /** The last ref is a look to follow, not a thing to copy. */
  estilo?: boolean
  luz?: Luz
  producto?: string
  marca?: string
  variants?: { category: string; ids: string[]; slots?: Record<string, string>; escenas?: Record<string, string> }
  mesaId?: string
  labels?: string[]
}
export type Cuerpo = Linea | { lines: Linea[] }

export const cotizarLinea = async (c: Cuerpo) => (await api.post<Cotizacion>('/api/jobs/quote', c)).data
export const pedirLinea = async (c: Cuerpo) => (await api.post<Apartado>('/api/jobs', c)).data

/** A piece as `GET /api/jobs?hold=` reports it: no label or aspect (the mesa has those), but the charge it rides on. */
export type PiezaVigilada = Pieza & { hold?: { status: string; capturedCents: number | null } | null }
export const verHold = async (holdId: string) => (await api.get<{ pieces: PiezaVigilada[] }>('/api/jobs', { params: { hold: holdId } })).data.pieces

export const guardarHoja = async (id: string, c: { photobook?: { id: string; url: string } | null; marca?: string | null }) =>
  (await api.patch<{ ok: true }>(`/api/mesas/${encodeURIComponent(id)}`, c)).data

/** Saves a piece to the phone's photos (as image-viewer does). */
export async function descargar(url: string) {
  const { status } = await MediaLibrary.requestPermissionsAsync()
  if (status !== 'granted') throw new Error('Sin permiso para guardar en tus fotos.')
  const archivo = `${FileSystem.cacheDirectory}auto-toon-${Date.now()}.jpg`
  await FileSystem.downloadAsync(url, archivo)
  await MediaLibrary.saveToLibraryAsync(archivo)
}

/** Customer words for a failed call: the server's own text, or the network's in Spanish. */
export const textoDe = (e: unknown, respaldo: string) => {
  const err = e as { message?: string; status?: number }
  return err?.status && err.message ? err.message : respaldo
}
