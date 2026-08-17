/**
 * What comes next.
 *
 * Most sessions end at one image. Not because the user is done — because
 * nothing told them what a second one would be for. A commercial is not one
 * picture; it is a still that becomes a scene, a scene that gets a body, a body
 * that gets lit, a frame that gets sharp enough to print, and then it moves.
 *
 * The order of those steps is not a creative judgement, so it is not left to a
 * model: it is the order a shoot actually runs in, and the same every time.
 * What the model contributes is the idea for the step — written once, after the
 * image lands, by `writeNextStep`. That split keeps the feed free to paint and
 * keeps the sequence from wandering.
 *
 * A step is only offered when it is still available. Offering "upscale to 4K"
 * on something already upscaled is how a guide loses its authority.
 */
import type { PanelId } from './capabilities'

/** Modules that write generation rows, named as the log records them. */
export type Module =
    | 'restore'
    | 'upscale'
    | 'relight'
    | 'with-model'
    | 'product-enhancer'
    | 'campaign'

export interface NextStep {
    /** The panel that performs it — the hub runs it inline, never navigates. */
    panel: PanelId
    /** What it is, in the director's words. Falls back to `fallbackTitle`. */
    title: string
    /** Why this, now. One line; it is the whole argument for a second click. */
    why: string
    /** Scene text to seed the panel with, when the step takes one. */
    seed?: string
}

/** The rung each module sits on, and what the shoot does after it. */
interface Rung {
    panel: PanelId
    fallbackTitle: string
    fallbackWhy: string
}

/**
 * The ladder, in shoot order. Each entry answers "the image exists — now what
 * would a director ask for?"
 *
 * · A clean product shot wants a body in it: scale, drape, how it is held.
 * · Anything with a subject wants light before anything else — light is the
 *   difference between a photograph and a catalogue entry.
 * · A frame you have committed to gets resolution.
 * · A frame that is finished gets movement, which is where a commercial starts.
 */
const AFTER: Record<Module, Rung[]> = {
    campaign: [
        { panel: 'relight', fallbackTitle: 'Dale otra luz', fallbackWhy: 'Nueve tomas con la misma luz se ven como nueve versiones de una.' },
        { panel: 'upscale', fallbackTitle: 'Súbela a 4K', fallbackWhy: 'La toma que elijas va a terminar en grande.' },
        { panel: 'video', fallbackTitle: 'Ponla en movimiento', fallbackWhy: 'Ya tienes el set; falta el que se mueve.' },
    ],
    'product-enhancer': [
        { panel: 'with-model', fallbackTitle: 'Ponlo en una modelo', fallbackWhy: 'La escala y la caída solo se leen sobre un cuerpo.' },
        { panel: 'relight', fallbackTitle: 'Dale otra luz', fallbackWhy: 'La luz es lo que separa una foto de una ficha de catálogo.' },
        { panel: 'upscale', fallbackTitle: 'Súbela a 4K', fallbackWhy: 'Impresión y banners grandes necesitan los píxeles.' },
        { panel: 'video', fallbackTitle: 'Ponla en movimiento', fallbackWhy: 'Una foto se vuelve comercial en cuanto se mueve.' },
    ],
    restore: [
        { panel: 'upscale', fallbackTitle: 'Súbela a 4K', fallbackWhy: 'Ya recuperaste el detalle; ahora dale resolución para lucirlo.' },
        { panel: 'relight', fallbackTitle: 'Dale otra luz', fallbackWhy: 'La toma quedó limpia, pero el ambiente sigue siendo el del original.' },
        { panel: 'video', fallbackTitle: 'Ponla en movimiento', fallbackWhy: 'Un cuadro restaurado es el mejor primer frame que tienes.' },
    ],
    upscale: [
        { panel: 'video', fallbackTitle: 'Ponla en movimiento', fallbackWhy: 'Ya está lo bastante nítida para aguantar un movimiento de cámara.' },
        { panel: 'relight', fallbackTitle: 'Dale otra luz', fallbackWhy: 'Ajusta el color antes de que salga a cualquier lado.' },
    ],
    relight: [
        { panel: 'upscale', fallbackTitle: 'Súbela a 4K', fallbackWhy: 'El color ya quedó; congélalo a tamaño completo.' },
        { panel: 'video', fallbackTitle: 'Ponla en movimiento', fallbackWhy: 'La luz ya está haciendo el trabajo; que la cámara la acompañe.' },
    ],
    'with-model': [
        { panel: 'campaign', fallbackTitle: 'Sácale nueve tomas', fallbackWhy: 'Una foto no es campaña: misma modelo, misma prenda, nueve situaciones.' },
        { panel: 'relight', fallbackTitle: 'Dale otra luz', fallbackWhy: 'Con un cuerpo en cuadro es donde la luz se gana su lugar.' },
        { panel: 'upscale', fallbackTitle: 'Súbela a 4K', fallbackWhy: 'La piel y la tela necesitan resolución para convencer.' },
        { panel: 'video', fallbackTitle: 'Ponla en movimiento', fallbackWhy: 'Un solo gesto convierte un lookbook en anuncio.' },
    ],
}

/** What the user has already done to this image, so it is not offered twice. */
export interface Done {
    /** Panels already run on this result — from its own history chain. */
    panels?: PanelId[]
    /** No saved character means no model to dress. */
    hasCharacter?: boolean
    /** Videos are the end of the ladder; nothing here operates on one. */
    isVideo?: boolean
    /**
     * Already at full resolution — a restore run at 4K, or anything that came
     * out of the upscaler. Offering "take it to 4K" on a 4K image is the exact
     * moment a guide stops being read: it proves it is not looking.
     */
    alreadyMaxRes?: boolean
}

/**
 * The single next step, or null when the ladder is finished.
 *
 * One, never a menu. A list of four options is the same paralysis as no
 * suggestion at all — the point is that a director tells you what to shoot
 * next, and you either take it or you don't.
 */
export function nextStepFor(module: string, done: Done = {}): Rung | null {
    // Nothing in the ladder operates on a video: it is the last rung.
    if (done.isVideo) return null

    const rungs = AFTER[module as Module]
    if (!rungs) return null

    const already = new Set(done.panels ?? [])
    for (const rung of rungs) {
        if (already.has(rung.panel)) continue
        // Dressing a model needs a model. Offering it without one sends the
        // user to build a character, which is the handoff the hub exists to end.
        if (rung.panel === 'with-model' && !done.hasCharacter) continue
        if (rung.panel === 'upscale' && done.alreadyMaxRes) continue
        return rung
    }
    return null
}

/** Every module the ladder knows — used by the check and by the writer. */
export const MODULES = Object.keys(AFTER) as Module[]
