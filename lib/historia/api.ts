import api from '@/lib/api'
import type { Apartado, Aspecto, Cotizacion } from '@/lib/estudio'
import type { Escena } from './escenas'

/**
 * Historia over REST (web `app/api/historia/rest.ts`). The server derives everything with a rule in it (which
 * engines can make a scene and why the others can't, its durations, the shape it's quoted in, its signature) and
 * sends it as `opciones`; the app shows it and sends data back, never a rule of its own.
 */

export interface Clip {
  id: string
  escena: string
  firma: string
  status: string
  videoUrl: string | null
  createdAt: string
  updatedAt: string
  priceCents: number | null
  /** Why it failed, in her words; null when she canceled it (or it didn't fail). */
  motivo: string | null
}

/** `opcionesDe` on the web (`lib/historia/motores.ts`), for one scene as the server last saved it. */
export interface Opciones {
  motores: { id: string; nombre: string }[]
  faltan: { nombre: string; porque: string }[]
  finPosible: boolean
  duraciones: number[]
  /** Its engine can't make it anymore: the one it moves to, and the name of the one it leaves. */
  cambio: { de: string; a: { id: string; nombre: string } } | null
  aspecto: Aspecto
  /** What a clip of it would be made from: sent with «Generar» so a stale screen is never charged. */
  firma: string
}

export interface InfoImagen {
  persona: boolean
  caraReal: boolean
  forma: string | null
}

export interface HistoriaAbierta {
  id: string
  name: string
  modo: 'escenas' | 'largo'
  escenas: Escena[]
  largo: { duracionS: number; motor: string } | null
  mesa: { id: string; name: string } | null
  campana: { id: string; name: string; href: string } | null
  clips: Clip[]
  /** The tray: ready images to put in scenes. */
  imagenes: { id: string; url: string; label: string }[]
  /** Url of every image in the tray or in a scene. */
  urls: Record<string, string>
  info: Record<string, InfoImagen>
  lista: { id: string; name: string }[]
  campanas: { id: string; name: string }[]
  /** Some image of its scenes is free: «Campaña nueva» can start from it. */
  hayLibres: boolean
  opciones: Record<string, Opciones>
}

/** What she edits; everything else comes from the server. */
export type Borrador = Pick<HistoriaAbierta, 'name' | 'modo' | 'escenas' | 'largo'>

const enc = encodeURIComponent

/** The story asked for, else the last one touched; null when she has none yet. */
export const abrirHistoria = async (id: string | null) =>
  (await api.get<{ historia: HistoriaAbierta | null }>('/api/historia', { params: id ? { id } : {} })).data.historia

/** «Hacer una historia»: one scene per image, in this order. Reading the images can take a while. */
export const crearHistoria = async (piezas: string[]) => (await api.post<{ ok: true; id: string }>('/api/historia', { piezas }, { timeout: 180_000 })).data.id

export const guardarHistoria = async (id: string, b: Borrador) =>
  (await api.patch<{ ok: true; id: string; info: Record<string, InfoImagen>; opciones: Record<string, Opciones> }>(`/api/historia/${enc(id)}`, b, { timeout: 90_000 })).data

/** Into one of her campaigns, or (`null`) a new one from the story's free images. Answers with the campaign's id. */
export const unirACampana = async (id: string, campaignId: string | null) => (await api.post<{ ok: true; id: string }>(`/api/historia/${enc(id)}/campana`, { campaignId })).data.id

/** The price shown before «Generar», as the web's Historia quotes a scene. */
export const cotizarEscena = async (l: { kind: string; url: string; aspect: Aspecto; durationS: number }) =>
  (await api.post<Cotizacion>('/api/jobs/quote', { kind: l.kind, count: 1, refs: [l.url], aspect: l.aspect, durationS: l.durationS })).data

/** One scene as one paid clip: the server reads the scene it saved and checks `firma` against it. */
export const generarEscena = async (o: { historiaId: string; escena: string; firma: string }) =>
  (await api.post<Apartado & { unitCents: number }>('/api/historia/generar', { id: o.escena, historiaId: o.historiaId, firma: o.firma })).data
