import api from './api'
import type { Datos, Precio, SesionAbierta, SesionResumen } from './pasarela'

/** Pasarela over REST (web `lib/pasarela/nativa.ts`, owner only for now): the calls the steps screen makes. */
const s = (id: string) => `/api/pasarela/sesiones/${encodeURIComponent(id)}`
/** The owner's sessions; a 404 means Pasarela is not open to this account (owner only for now). */
export const listarSesiones = async () => (await api.get<{ sesiones: SesionResumen[] }>('/api/pasarela/sesiones')).data.sesiones
export const abrirSesion = async (id: string) => (await api.get<SesionAbierta>(s(id))).data
export const guardarNodo = async (id: string, nodoId: string, datos: Datos) =>
  (await api.patch<{ ok: true; datos: Datos }>(`${s(id)}/nodos/${encodeURIComponent(nodoId)}`, { datos })).data.datos
/** Photos already uploaded, read into the node on the server (a vision call: seconds). */
export const leerFotos = async (id: string, nodoId: string, fotos: string[]) =>
  (await api.post<{ ok: true; datos: Datos }>(`${s(id)}/nodos/${encodeURIComponent(nodoId)}/leer`, { fotos }, { timeout: 120_000 })).data.datos
export const cotizarNodo = async (sesionId: string, nodoId: string) => (await api.post<Precio>('/api/pasarela/precio', { sesionId, nodoId })).data
/** Queues the node with the firma of the price shown; a changed node answers 409 (`escena_cambio`) and nothing is charged. */
export const generarNodo = async (sesionId: string, nodoId: string, firma: string) =>
  (await api.post<{ holdId: string; ids: string[]; amountCents: number }>('/api/pasarela/generar', { id: nodoId, sesionId, firma })).data
export const llevarAHistoria = async (sesionId: string, nodoId: string) => (await api.post<{ ok: true; id: string }>(`${s(sesionId)}/historia`, { nodoId })).data.id
