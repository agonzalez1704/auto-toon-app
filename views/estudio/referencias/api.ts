import api from '@/lib/api'
import type { Motor } from '@/lib/crear/motor'
import type { Apartado, Aspecto, Cotizacion } from '@/lib/estudio'

/**
 * Crear con referencias' calls beside lib/estudio: the line it prices and sends (web composer-view `step1` and its
 * step 2), and her cast — the people she can point at with @ (UGC Studio's characters, as the web page loads them).
 */

/** One line of `lib/jobs/schema.ts` jobRequest, as the composer sends it. */
export interface LineaRef {
  kind: Motor
  count: 1
  refs: string[]
  aspect: Aspecto
  /** The prompt with each @name as «image N» (motor.ts `providerBrief`); the server adds the doctrine. */
  brief: string
  /** Where the look and the product's photobook sit in `refs` (1-based). */
  estilo?: number
  photobook?: number
  mesaId?: string
  labels?: string[]
}

export const cotizarRef = async (l: LineaRef) => (await api.post<Cotizacion>('/api/jobs/quote', l)).data
export const pedirRef = async (l: LineaRef) => (await api.post<Apartado>('/api/jobs', l)).data

export interface Persona {
  name: string
  face: string
}

/** Her cast with a face we host (web page.tsx `elenco`): always a person, whatever the prompt says. */
export async function verElenco(): Promise<Persona[]> {
  const { data } = await api.get<{ characters: { name: string; anchorFaceUrl: string | null; faceRef1Url: string | null }[] }>('/api/ugc/characters')
  return data.characters.flatMap((p) => {
    const face = p.anchorFaceUrl ?? p.faceRef1Url
    return face?.startsWith('https://') ? [{ name: p.name, face }] : []
  })
}
