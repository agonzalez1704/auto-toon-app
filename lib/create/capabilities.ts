/**
 * What we offer, once we know what was uploaded.
 *
 * The composer used to open by asking "a product or a person?" — a question
 * the image already answers. We look at the image instead and offer only what
 * applies to it.
 *
 * The offer is assembled here rather than by the model. A vision call decides
 * *what the thing is*; this file decides *what can be done with it*, and the
 * client renders from a fixed catalogue. That split is the whole safety
 * property: an LLM can mislabel a photo, but it cannot invent a destination
 * that does not exist, put a button in front of a user that goes nowhere, or
 * name a module we removed last week. Every href below is a route that exists.
 */

/**
 * Inlined rather than importing `@/lib/category-prompts/types`: on mobile that
 * module does not exist, and this is a literal union with no dependencies of
 * its own. Web remains the source of truth — if a category is added there,
 * mobile's copy has to follow, which `create-parity.check.ts` asserts.
 */
export type ProductCategory =
  | 'jewelry'
  | 'beauty'
  | 'food'
  | 'apparel'
  | 'electronics'
  | 'home'
  | 'shoes'
  | 'other'

/**
 * Panels the composer can mount in place.
 *
 * This is the approved-component registry: an action names a panel, and the
 * client maps that name to a component it already has. Nothing here can ask
 * for a component that does not exist, which is the whole reason the offer is
 * assembled from a fixed list rather than generated.
 */
export type PanelId =
    | 'campaign'
    | 'enhancer'
    | 'restore'
    | 'relight'
    | 'upscale'
    | 'try-on'
    | 'with-model'
    | 'save-character'
    | 'video'

/** What kind of thing is in the frame. The axis the offer branches on. */
export type SubjectKind = 'product' | 'garment' | 'person' | 'scene' | 'unknown'

export interface Analysis {
    kind: SubjectKind
    /** Short human label, shown back so a misread is obvious and correctable. */
    subject: string
    /** Product taxonomy, reused from the enhancer. Null unless it is a product. */
    category: ProductCategory | null
    /** 0–1. Below `WIDEN_BELOW` we stop guessing and widen the offer. */
    confidence: number
}

export interface Action {
    id: string
    label: string
    blurb: string
    /**
     * A finished example of what this produces. New users cannot tell "Instagram
     * grid" from "Creative poster" by name; one look at the output settles it.
     * `null` where we have no honest example — a wrong picture teaches the wrong
     * thing, so the card falls back to type.
     */
    preview: string | null
    /**
     * Runs inside the hub. Actions still carrying only an `href` leave for their
     * old module; that is the migration, not the destination.
     */
    panel?: PanelId
    href: string
    /**
     * Needs a saved character to do anything. The composer checks whether the
     * user has one and routes to Model Factory first rather than dropping them
     * into a module with an empty picker.
     */
    needsModel?: boolean
}

/**
 * Goals the enhancer already understands. Passed as `?goal=`, which its view
 * hands to the existing `setGoal` — so these arrive configured rather than on
 * a blank form.
 */
const ENHANCER = (goal: string) => `/product-enhancer?goal=${goal}`

const CATALOGUE = {
    productShoot: {
        id: 'product-shoot',
        label: 'Fotos de producto',
        blurb: 'Fotografía de estudio, limpia',
        preview: '/previews/professional_photo.png',
        panel: 'enhancer',
        href: ENHANCER('professional-photo'),
    },
    grid: {
        id: 'instagram-grid',
        label: 'Cuadrícula de Instagram',
        blurb: 'Nueve piezas que se ven de la misma familia',
        preview: '/previews/instagram_feed.png',
        panel: 'enhancer',
        href: ENHANCER('instagram-feed'),
    },
    poster: {
        id: 'poster',
        label: 'Póster creativo',
        blurb: 'Una pieza compuesta, con tipografía',
        preview: '/previews/printable_poster.png',
        panel: 'enhancer',
        href: ENHANCER('printable-poster'),
    },
    advantages: {
        id: 'advantages',
        label: 'Fichas de características',
        blurb: 'Imágenes de listado que venden las specs',
        preview: '/previews/product_advantages.png',
        panel: 'enhancer',
        href: ENHANCER('product-advantages'),
    },
    angles: {
        id: 'angles',
        label: 'Todos los ángulos',
        blurb: 'La misma pieza desde cada lado',
        preview: '/previews/campaign.png',
        panel: 'enhancer',
        href: ENHANCER('multi-angle'),
    },
    food: {
        id: 'food',
        label: 'Fotografía de alimentos',
        blurb: 'Luz y montaje que dan hambre',
        preview: '/previews/food_photography.png',
        panel: 'enhancer',
        href: ENHANCER('food-photography'),
    },
    ugc: {
        id: 'ugc-model',
        label: 'UGC con una modelo',
        blurb: 'Alguien sosteniéndolo, como un post real',
        preview: '/previews/style-ugc-selfie.png',
        panel: 'with-model',
        href: '/ugc',

        needsModel: true,
    },
    tryOn: {
        id: 'try-on',
        label: 'Pruébalo en alguien',
        blurb: 'La prenda puesta en tu modelo',
        preview: '/previews/style-lookbook.jpg',
        panel: 'try-on',
        href: '/wardrobe',

        needsModel: true,
    },
    editorial: {
        id: 'editorial',
        label: 'Sesión editorial',
        blurb: 'Escena completa, luz de estudio',
        preview: '/previews/style-editorial.jpg',
        panel: 'with-model',
        href: '/fashion-editorial',

        needsModel: true,
    },
    saveCharacter: {
        id: 'save-character',
        label: 'Guardar como personaje',
        blurb: 'Fija esta cara para reutilizarla en todo',
        preview: '/previews/model.png',
        panel: 'save-character',
        href: '/model-factory',

    },
    video: {
        id: 'video',
        label: 'Conviértelo en video',
        blurb: 'Escenas, movimiento y un corte',
        // No still we own reads as video. A misleading example is worse than none.
        preview: null,
        panel: 'video',
        href: '/storyboard',

    },
    relight: {
        id: 'relight',
        label: 'Cambia la luz',
        blurb: 'La misma toma, otra iluminación',
        preview: '/previews/relight.jpg',
        panel: 'relight',
        href: '/relight',
    },
    restore: {
        id: 'restore',
        label: 'Restáurala',
        blurb: 'Repara una foto vieja o dañada',
        preview: '/restore/after.jpg',
        panel: 'restore',
        href: '/restore',
    },
} as const satisfies Record<string, Action>

const BY_KIND: Record<Exclude<SubjectKind, 'unknown'>, Action[]> = {
    product: [CATALOGUE.productShoot, CATALOGUE.grid, CATALOGUE.poster, CATALOGUE.angles, CATALOGUE.ugc],
    garment: [CATALOGUE.tryOn, CATALOGUE.productShoot, CATALOGUE.grid, CATALOGUE.editorial, CATALOGUE.ugc],
    person: [CATALOGUE.saveCharacter, CATALOGUE.editorial, CATALOGUE.ugc, CATALOGUE.video],
    scene: [CATALOGUE.poster, CATALOGUE.relight, CATALOGUE.restore],
}

/**
 * Category nudges, applied on top of the kind.
 *
 * A jar of cream and a plate of pasta are both products, but only one of them
 * wants food styling. These reorder the offer; they never replace it.
 */
const BY_CATEGORY: Partial<Record<ProductCategory, Action[]>> = {
    food: [CATALOGUE.food],
    electronics: [CATALOGUE.advantages],
    home: [CATALOGUE.advantages],
    apparel: [CATALOGUE.tryOn],
    shoes: [CATALOGUE.tryOn],
    jewelry: [CATALOGUE.angles],
}

/** Below this the classification is a guess, so we widen instead of narrowing. */
export const WIDEN_BELOW = 0.5

/** Always offered — these apply to any image, whatever it turned out to be. */
const ALWAYS: Action[] = [CATALOGUE.relight, CATALOGUE.restore]

function dedupe(actions: Action[]): Action[] {
    const seen = new Set<string>()
    return actions.filter((a) => !seen.has(a.id) && seen.add(a.id))
}

/**
 * The offer for one analysed image.
 *
 * Category nudges lead, then the offer for the kind, then the operations that
 * apply to anything. A low-confidence read widens across kinds rather than
 * committing to the wrong one — being handed five options where two fit is a
 * smaller failure than being handed three that all miss.
 */
export function actionsFor(analysis: Analysis): Action[] {
    if (analysis.kind === 'unknown' || analysis.confidence < WIDEN_BELOW) {
        return dedupe([
            ...BY_KIND.product,
            ...BY_KIND.garment,
            ...BY_KIND.person,
            ...ALWAYS,
        ])
    }
    return dedupe([
        ...(analysis.category ? BY_CATEGORY[analysis.category] ?? [] : []),
        ...BY_KIND[analysis.kind],
        ...ALWAYS,
    ])
}

/**
 * The enhancer goal an action stands for, read back out of its own href.
 *
 * Kept derived rather than stored twice: the href already encodes it, and the
 * check already asserts every one of them is a goal the enhancer defines.
 */
export function goalForAction(actionId: string): string | null {
    const action = Object.values(CATALOGUE).find((a) => a.id === actionId)
    if (!action) return null
    return new URL(action.href, 'https://x').searchParams.get('goal')
}

/**
 * Where an action goes when it cannot run in the hub.
 *
 * Nothing reaches this any more — every action carries a panel — but the hrefs
 * stay as the honest fallback for a panel that fails to mount, and the check
 * still asserts each one is a real route.
 *
 * The old behaviour is worth naming: an action needing a character used to
 * send a model-less user to Model Factory. That was a redirect dressed as
 * help. The panels now hold their own empty state and say what to do next
 * without throwing the session away.
 */
export function resolveHref(action: Action, _hasModel: boolean, imageUrl?: string): string {
    if (!imageUrl || !action.href.includes('goal=')) return action.href
    return `${action.href}&image=${encodeURIComponent(imageUrl)}`
}
