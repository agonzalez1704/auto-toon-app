/** The back-to-back player's steps and the zip's file names. Pure and client-safe. */
import { clipActual, type Escena } from './escenas'

export interface PasoCorrido {
    tipo: 'clip' | 'imagen'
    src: string
    duracionS: number
    etiqueta: string
}

type ClipLike = { escena: string; status: string; createdAt: string; videoUrl: string | null }

/** One step per scene with something to show: its current clip, else its start image held for its duration. */
export function pasosCorrido(escenas: Escena[], clips: ClipLike[], urls: Record<string, string>): PasoCorrido[] {
    return escenas.flatMap((e): PasoCorrido[] => {
        const clip = clipActual(clips.filter((c) => c.videoUrl), e.id)
        if (clip?.videoUrl) return [{ tipo: 'clip', src: clip.videoUrl, duracionS: e.duracionS, etiqueta: '' }]
        const imagen = e.inicio && urls[e.inicio]
        return imagen ? [{ tipo: 'imagen', src: imagen, duracionS: e.duracionS, etiqueta: 'sin generar' }] : []
    })
}

/** «01-escena.mp4»: sorts in story order inside the zip; the extension is the clip's own. */
export function nombreArchivo(n: number, url: string): string {
    const ext = url.split('?')[0].match(/\.([a-z0-9]{3,4})$/i)?.[1]?.toLowerCase() ?? 'mp4'
    return `${String(n).padStart(2, '0')}-escena.${ext}`
}
