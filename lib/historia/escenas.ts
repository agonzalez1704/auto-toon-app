/**
 * The part of the web's `lib/historia/escenas.ts` the app needs, copied as it is there (the app has no zod, so the
 * save schema stays on the server, which checks every save). `copia.check.ts` fails if the web's version changes.
 */
export const DURACION_INICIAL = 5

export interface Escena {
    id: string
    /** Generation ids of the first and last frame. */
    inicio: string | null
    fin: string | null
    texto: string
    duracionS: number
    /** A job kind id. */
    motor: string
}

/** Swap a scene with its neighbour; at the edges the list comes back unchanged. */
export function mover(escenas: Escena[], i: number, delta: -1 | 1): Escena[] {
    const j = i + delta
    if (i < 0 || i >= escenas.length || j < 0 || j >= escenas.length) return escenas
    const out = [...escenas]
    ;[out[i], out[j]] = [out[j], out[i]]
    return out
}

/** The newest ready clip of a scene, or null. */
export function clipActual<T extends { escena: string; status: string; createdAt: string }>(clips: T[], escenaId: string): T | null {
    let best: T | null = null
    for (const c of clips) {
        if (c.escena === escenaId && c.status === 'ready' && (!best || c.createdAt > best.createdAt)) best = c
    }
    return best
}
