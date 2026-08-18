/**
 * The creative direction we hand back for an uploaded image.
 *
 * The offer in `capabilities.ts` answers "what can be done with this". This
 * answers the harder question a client actually pays for: *what should be
 * made, and why*. Positioning, the voice to say it in, a palette, and concepts
 * abstract enough to shoot.
 *
 * The split from `capabilities.ts` is deliberate and is the safety boundary.
 * Destinations are a fixed catalogue because a model must never invent a route.
 * Direction is *content* — prose, colours, ideas — so the model does produce
 * it, and everything below exists to make sure what comes back is safe to put
 * on screen. Nothing here is rendered until it has been through `parseDirection`.
 */

export interface Swatch {
    /** Validated `#rrggbb`. Goes straight into a style attribute, so it is checked. */
    hex: string
    name: string
    /** What it is for — "ground", "accent", "type". Keeps the palette usable. */
    role: string
}

export interface Concept {
    title: string
    /** The idea in one or two sentences. */
    premise: string
    /** What you would actually see on screen. This is what becomes a prompt. */
    visual: string
}

export interface Direction {
    /** What this is and who it is for, in one paragraph. */
    positioning: string
    /** Words that describe the tone, and one line written in it. */
    voice: { tone: string[]; sample: string }
    palette: Swatch[]
    typography: { display: string; body: string; note: string } | null
    concepts: Concept[]
}

/**
 * Caps. A model asked for "some concepts" will happily return twenty, and a
 * panel of twenty is the wall of text this screen was rebuilt to avoid.
 */
const LIMITS = { tone: 5, palette: 6, concepts: 4 } as const

/** Anything longer is a model ignoring the brief, not a longer thought. */
const MAX = { positioning: 400, sample: 160, title: 48, premise: 240, visual: 320, word: 24 } as const

const HEX = /^#[0-9a-fA-F]{6}$/

function str(value: unknown, max: number): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed ? trimmed.slice(0, max) : null
}

function strList(value: unknown, max: number, cap: number): string[] {
    if (!Array.isArray(value)) return []
    return value.map((v) => str(v, max)).filter((v): v is string => !!v).slice(0, cap)
}

/**
 * Colour is the one field that becomes CSS, so it is the one that is checked
 * hardest. A model-authored string reaching a style attribute unvalidated is
 * how "here is your palette" turns into an injection point; anything that is
 * not exactly `#rrggbb` is dropped rather than repaired.
 */
function parseSwatch(raw: unknown): Swatch | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const hex = typeof o.hex === 'string' ? o.hex.trim() : ''
    if (!HEX.test(hex)) return null
    return {
        hex: hex.toLowerCase(),
        name: str(o.name, MAX.word) ?? hex,
        role: str(o.role, MAX.word) ?? '',
    }
}

function parseConcept(raw: unknown): Concept | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const title = str(o.title, MAX.title)
    const visual = str(o.visual, MAX.visual)
    // A concept with no title or nothing to see is not a concept.
    if (!title || !visual) return null
    return { title, premise: str(o.premise, MAX.premise) ?? '', visual }
}

/**
 * Turn whatever the model returned into something renderable, or into nothing.
 *
 * Partial is fine and expected — a brief with a palette but no typography still
 * earns its place on screen. Returning `null` is reserved for the case where
 * there is no substance at all, so the composer can fall back to the plain
 * offer instead of rendering an empty panel with headings and no content.
 */
export function parseDirection(raw: unknown): Direction | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const voice = (o.voice ?? {}) as Record<string, unknown>
    const type = (o.typography ?? {}) as Record<string, unknown>

    const display = str(type.display, MAX.word)
    const body = str(type.body, MAX.word)

    const direction: Direction = {
        positioning: str(o.positioning, MAX.positioning) ?? '',
        voice: {
            tone: strList(voice.tone, MAX.word, LIMITS.tone),
            sample: str(voice.sample, MAX.sample) ?? '',
        },
        palette: Array.isArray(o.palette)
            ? o.palette.map(parseSwatch).filter((s): s is Swatch => !!s).slice(0, LIMITS.palette)
            : [],
        typography:
            display && body
                ? { display, body, note: str(type.note, MAX.premise) ?? '' }
                : null,
        concepts: Array.isArray(o.concepts)
            ? o.concepts.map(parseConcept).filter((c): c is Concept => !!c).slice(0, LIMITS.concepts)
            : [],
    }

    const hasSubstance =
        !!direction.positioning ||
        direction.palette.length > 0 ||
        direction.concepts.length > 0 ||
        direction.voice.tone.length > 0
    return hasSubstance ? direction : null
}

/**
 * A concept, as prompt text.
 *
 * This is where direction stops being something to read and starts being
 * something that generates. It goes in as an override, so what the user sees
 * described is literally what gets sent — a concept that quietly becomes a
 * different prompt is worse than no concept.
 */
export function conceptToPrompt(concept: Concept, subject: string): string {
    return [
        `${concept.visual}`,
        `The subject is ${subject}, rendered exactly as in the reference image.`,
        concept.premise && `Creative intent: ${concept.premise}`,
    ]
        .filter(Boolean)
        .join(' ')
}

/**
 * The direction, as art-direction text for a generator.
 *
 * This is what stops the brief being decoration. The hub was showing a palette
 * on screen while the generator derived its own from the image, so the advice
 * and the output disagreed — and advice nobody applies is worse than none,
 * because it looks like the product is ignoring itself.
 *
 * Capped at 500 characters: it rides in the enhancer's `style` customisation
 * slot, which is validated at that length. Palette leads because colour is the
 * part a viewer notices first and the part a generator most readily obeys.
 */
export function directionToStyle(direction: Direction | null): string | undefined {
    if (!direction) return undefined

    const parts: string[] = []
    if (direction.palette.length > 0) {
        parts.push(
            `Colour palette, used consistently: ${direction.palette
                .map((s) => `${s.name} (${s.hex})`)
                .join(', ')}`,
        )
    }
    if (direction.voice.tone.length > 0) {
        parts.push(`Overall mood: ${direction.voice.tone.join(', ')}`)
    }
    const text = parts.join('. ')
    return text ? text.slice(0, 500) : undefined
}
