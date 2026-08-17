/**
 * A2UI v0.9.1, as this app speaks it.
 *
 * This replaces the bespoke block wire with the actual protocol
 * (github.com/google/A2UI, spec v0_9_1): the agent emits standard
 * server→client messages — `createSurface`, `updateComponents`,
 * `updateDataModel` — whose components form an id-referenced tree under a
 * `root`, and the client answers with the standard `action` message carrying
 * `{ name, surfaceId, sourceComponentId, timestamp, context }`.
 *
 * The components themselves are OUR catalog. A2UI's whole security model is
 * that the client owns a catalog of pre-approved components and renders
 * nothing else; `CATALOG` below is that list, and this parser is the border
 * that enforces it. Palette hexes are checked because they become CSS; ids
 * are slugged because signals reference them; unknown components and unknown
 * message kinds are dropped, never repaired.
 *
 * One surface per director turn. The spec allows updating one surface
 * incrementally forever, but this screen is a transcript — history stays
 * visible and inert, so each turn creates a fresh surface and only the newest
 * one is live.
 */

export const A2UI_VERSION = 'v0.9.1'
export const CATALOG_ID = 'autotoon.app:director-catalog:v1'

// ─── Our catalog ─────────────────────────────────────────────────────────────

export interface TextComponent {
    id: string
    component: 'Text'
    text: string
}

export interface PaletteComponent {
    id: string
    component: 'Palette'
    swatches: { hex: string; name: string; role: string }[]
}

export interface TypePairingComponent {
    id: string
    component: 'TypePairing'
    display: string
    body: string
    note: string
}

/** Clicking fires action `concept_selected` with context `{ conceptId }`. */
export interface ConceptComponent {
    id: string
    component: 'Concept'
    title: string
    premise: string
    visual: string
    /**
     * The scene has a person in it wearing or using the product.
     *
     * The director knows this — it wrote the scene — so it says so, instead of
     * the client guessing from the words. It decides which pipeline runs: a
     * scene with a person needs one of the user's characters, and routing it
     * through the product enhancer instead is how a "model wearing it" concept
     * ended up carrying poster and grid machinery it had no use for.
     */
    needsCharacter: boolean
}

/** Picking fires action `choice_selected` with `{ choiceId, optionId, label }`. */
export interface ChoiceComponent {
    id: string
    component: 'Choice'
    question: string
    options: { id: string; label: string }[]
}

/** Layout, per the basic catalog's shape: children are id references. */
export interface ColumnComponent {
    id: string
    component: 'Column'
    children: string[]
}

export type DirectorComponent =
    | TextComponent
    | PaletteComponent
    | TypePairingComponent
    | ConceptComponent
    | ChoiceComponent
    | ColumnComponent

/** A parsed, safe-to-render surface: flat map plus the root's paint order. */
export interface Surface {
    surfaceId: string
    components: Map<string, DirectorComponent>
    /** Children of `root`, resolved and cycle-free, in paint order. */
    order: string[]
}

// ─── Client → server, straight from client_to_server.json ────────────────────

export interface UserAction {
    version: typeof A2UI_VERSION
    action: {
        name: string
        surfaceId: string
        sourceComponentId: string
        timestamp: string
        context: Record<string, unknown>
    }
}

export function userAction(
    name: string,
    surfaceId: string,
    sourceComponentId: string,
    context: Record<string, unknown>,
): UserAction {
    return {
        version: A2UI_VERSION,
        action: { name, surfaceId, sourceComponentId, timestamp: new Date().toISOString(), context },
    }
}

// ─── The border ──────────────────────────────────────────────────────────────

const LIMITS = { components: 16, swatches: 6, options: 5, concepts: 4, children: 12 } as const
const MAX = { text: 600, title: 48, premise: 240, visual: 320, word: 24, question: 160, label: 40, id: 48 } as const
const HEX = /^#[0-9a-fA-F]{6}$/

function str(v: unknown, max: number): string | null {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t ? t.slice(0, max) : null
}

function slug(v: unknown): string | null {
    const s = str(v, MAX.id)
    if (!s) return null
    const cleaned = s.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
    return cleaned || null
}

function parseComponent(raw: unknown, budget: { concepts: number }): DirectorComponent | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const id = slug(o.id)
    if (!id) return null

    switch (o.component) {
        case 'Text': {
            const text = str(o.text, MAX.text)
            return text ? { id, component: 'Text', text } : null
        }
        case 'Palette': {
            if (!Array.isArray(o.swatches)) return null
            const swatches = o.swatches
                .map((s) => {
                    const sw = s as Record<string, unknown>
                    const hex = typeof sw?.hex === 'string' ? sw.hex.trim() : ''
                    // The one field that becomes CSS. Dropped, never repaired.
                    if (!HEX.test(hex)) return null
                    return {
                        hex: hex.toLowerCase(),
                        name: str(sw.name, MAX.word) ?? hex,
                        role: str(sw.role, MAX.word) ?? '',
                    }
                })
                .filter((s): s is NonNullable<typeof s> => !!s)
                .slice(0, LIMITS.swatches)
            return swatches.length ? { id, component: 'Palette', swatches } : null
        }
        case 'TypePairing': {
            const display = str(o.display, MAX.word)
            const body = str(o.body, MAX.word)
            if (!display || !body) return null
            return { id, component: 'TypePairing', display, body, note: str(o.note, MAX.premise) ?? '' }
        }
        case 'Concept': {
            if (budget.concepts <= 0) return null
            const title = str(o.title, MAX.title)
            const visual = str(o.visual, MAX.visual)
            if (!title || !visual) return null
            budget.concepts--
            return {
                id,
                component: 'Concept',
                title,
                premise: str(o.premise, MAX.premise) ?? '',
                visual,
                // Absent means no: the product-only pipeline needs nothing the
                // user might not have, so it is the safe default.
                needsCharacter: o.needsCharacter === true,
            }
        }
        case 'Choice': {
            const question = str(o.question, MAX.question)
            if (!question || !Array.isArray(o.options)) return null
            const options = o.options
                .map((opt) => {
                    const op = opt as Record<string, unknown>
                    const oid = slug(op?.id)
                    const label = str(op?.label, MAX.label)
                    return oid && label ? { id: oid, label } : null
                })
                .filter((op): op is NonNullable<typeof op> => !!op)
                .slice(0, LIMITS.options)
            // A question with fewer than two answers is a statement.
            return options.length >= 2 ? { id, component: 'Choice', question, options } : null
        }
        case 'Column': {
            if (!Array.isArray(o.children)) return null
            const children = o.children
                .map((c) => slug(c))
                .filter((c): c is string => !!c)
                .slice(0, LIMITS.children)
            return children.length ? { id, component: 'Column', children } : null
        }
        default:
            return null
    }
}

/**
 * Parse one turn's worth of server→client messages into a surface.
 *
 * Accepts what the spec sends — a list of `{version, createSurface|
 * updateComponents|updateDataModel|deleteSurface}` messages — plus the
 * envelope drift live models actually produce: a single message object, or a
 * bare `{components: [...]}`. Tolerance stops at the envelope; components
 * always go through the same strict parse.
 *
 * The root's children are resolved here, depth-first through Columns with a
 * visited set, so the renderer receives a flat paint order and cannot be sent
 * into a reference cycle.
 */
export function parseSurface(raw: unknown, fallbackSurfaceId: string): Surface | null {
    if (!raw || typeof raw !== 'object') return null

    // Collect updateComponents payloads from whatever envelope arrived.
    const messages: Record<string, unknown>[] = Array.isArray(raw)
        ? (raw.filter((m) => m && typeof m === 'object') as Record<string, unknown>[])
        : [raw as Record<string, unknown>]

    let surfaceId: string | null = null
    const rawComponents: unknown[] = []
    for (const m of messages) {
        const envelope = (m.messages ?? m) as Record<string, unknown> | Record<string, unknown>[]
        for (const msg of Array.isArray(envelope) ? envelope : [envelope]) {
            if (!msg || typeof msg !== 'object') continue
            const create = msg.createSurface as Record<string, unknown> | undefined
            if (create) surfaceId = str(create.surfaceId, MAX.id) ?? surfaceId
            const update = msg.updateComponents as Record<string, unknown> | undefined
            if (update && Array.isArray(update.components)) {
                surfaceId = str(update.surfaceId, MAX.id) ?? surfaceId
                rawComponents.push(...update.components)
            }
            // Bare {components:[...]} — updateComponents without its wrapper.
            if (!update && Array.isArray(msg.components)) rawComponents.push(...msg.components)
        }
    }
    if (rawComponents.length === 0) return null

    const budget = { concepts: LIMITS.concepts }
    const components = new Map<string, DirectorComponent>()
    for (const rawComponent of rawComponents.slice(0, LIMITS.components)) {
        const parsed = parseComponent(rawComponent, budget)
        // Last definition of an id wins, per the spec's update semantics.
        if (parsed) components.set(parsed.id, parsed)
    }
    if (components.size === 0) return null

    // Paint order: root's tree flattened depth-first. A model that forgot the
    // root gets declaration order — content beats ceremony.
    const order: string[] = []
    const visited = new Set<string>()
    const walk = (id: string) => {
        if (visited.has(id)) return
        visited.add(id)
        const c = components.get(id)
        if (!c) return
        if (c.component === 'Column') {
            for (const child of c.children) walk(child)
        } else {
            order.push(id)
        }
    }
    const root = components.get('root')
    if (root) walk('root')
    if (order.length === 0) {
        for (const id of components.keys()) {
            if (id !== 'root') walk(id)
        }
    }
    if (order.length === 0) return null

    return { surfaceId: surfaceId ?? fallbackSurfaceId, components, order }
}

/**
 * A concept's generation prompt. Verbatim from the card: what the user was
 * shown is what generates, or the button lies.
 */
export function conceptToPromptText(concept: ConceptComponent, subject: string): string {
    return [
        concept.visual,
        `The subject is ${subject}, rendered exactly as in the reference image.`,
        concept.premise && `Creative intent: ${concept.premise}`,
    ]
        .filter(Boolean)
        .join(' ')
}
