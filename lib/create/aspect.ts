/**
 * Where the image is going, and therefore what shape it is.
 *
 * The enhancer defaulted to `3:4` whenever nobody said otherwise, silently, so
 * an image destined for a Reel or a hero banner came back in the wrong shape
 * and the user paid for the crop. Shape is not a setting — it is the first
 * thing a client tells a photographer, and it is not guessable from the
 * product.
 *
 * People say a destination, not a ratio: "for Instagram", "para el hero de la
 * landing", "story". `parseAspectIntent` reads that. The ratios themselves are
 * exactly the five the generation route accepts, so nothing here can produce a
 * value the API will reject.
 */

/** The five the enhance-product schema allows. Nothing else may be produced. */
export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '3:4'

export interface AspectOption {
    id: AspectRatio
    /** What a person calls it, not the numbers. */
    label: string
    /** Where it lands. */
    hint: string
}

/**
 * Ordered by how often product work needs them, since the first is what a
 * hurried user takes.
 */
export const ASPECTS: AspectOption[] = [
    { id: '4:5', label: 'Post de Instagram', hint: 'Feed, vertical — la que llena más pantalla' },
    { id: '1:1', label: 'Cuadrada', hint: 'Cuadrículas, catálogos, marketplaces' },
    { id: '9:16', label: 'Historia o Reel', hint: 'Vertical a pantalla completa, TikTok' },
    { id: '16:9', label: 'Banner principal', hint: 'Encabezados de sitio, YouTube, diapositivas' },
    { id: '3:4', label: 'Impresión vertical', hint: 'Lookbooks, pósters, empaque' },
]

/**
 * Destination phrases, longest-match first.
 *
 * Ordering matters more than it looks: "instagram story" must beat "instagram",
 * and "reels" must beat "real". Each entry is matched as a whole word or
 * phrase, so "hero" does not fire inside "heroína".
 */
const INTENTS: { ratio: AspectRatio; phrases: string[] }[] = [
    { ratio: '9:16', phrases: [
        'instagram story', 'ig story', 'historia de instagram', 'stories', 'story', 'historia',
        'reels', 'reel', 'tiktok', 'tik tok', 'shorts', 'short', 'vertical completo',
        'pantalla completa', 'full screen', 'fullscreen', '9:16', '9x16',
    ] },
    { ratio: '16:9', phrases: [
        'hero section', 'hero-section', 'hero banner', 'seccion hero', 'sección hero', 'hero',
        'banner', 'youtube', 'thumbnail', 'miniatura', 'presentacion', 'presentación',
        'slide', 'diapositiva', 'landing', 'website header', 'encabezado', 'widescreen',
        'horizontal', 'apaisado', '16:9', '16x9',
    ] },
    { ratio: '4:5', phrases: [
        'instagram post', 'post de instagram', 'feed de instagram', 'instagram feed',
        'publicacion', 'publicación', 'instagram', 'ig', 'feed', 'post', '4:5', '4x5',
    ] },
    { ratio: '1:1', phrases: [
        'cuadrada', 'cuadrado', 'square', 'grid', 'cuadricula', 'cuadrícula', 'catalogo',
        'catálogo', 'catalogue', 'marketplace', 'amazon', 'shopify', 'thumbnail cuadrado',
        'perfil', 'avatar', '1:1', '1x1',
    ] },
    { ratio: '3:4', phrases: [
        'impresion', 'impresión', 'imprimir', 'print', 'poster', 'póster', 'lookbook',
        'revista', 'magazine', 'editorial impreso', 'packaging', 'empaque', 'retrato',
        'portrait', '3:4', '3x4',
    ] },
]

/** Accents off, punctuation to spaces — so "presentación" matches "presentacion". */
function normalise(text: string): string {
    return ` ${text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9:]+/g, ' ')
        .trim()} `
}

/**
 * Read a destination out of what the user said.
 *
 * Returns null when nothing matches, which is the important case: it means we
 * still have to ask, and asking beats guessing a shape they pay to crop. Every
 * phrase is matched with word boundaries, so "hero" inside "heroina" does not
 * count.
 */
export function parseAspectIntent(text: string): AspectRatio | null {
    if (!text?.trim()) return null
    const haystack = normalise(text)

    // Longest phrase across all ratios wins, so "instagram story" beats
    // "instagram" no matter which list it sits in.
    let best: { ratio: AspectRatio; length: number } | null = null
    for (const { ratio, phrases } of INTENTS) {
        for (const phrase of phrases) {
            const needle = ` ${normalise(phrase).trim()} `
            if (haystack.includes(needle) && (!best || needle.length > best.length)) {
                best = { ratio, length: needle.length }
            }
        }
    }
    return best?.ratio ?? null
}

export function aspectLabel(ratio: AspectRatio): string {
    return ASPECTS.find((a) => a.id === ratio)?.label ?? ratio
}

/**
 * The pixels the chosen model will actually return.
 *
 * Shown while waiting, so it has to be true rather than decorative. The two
 * families size differently and neither honours the requested ratio exactly:
 *
 *  · GPT Image 2 buckets everything into three sizes — `aspectRatioToGptImageSize`
 *    in `lib/openai-image.ts` is the source, and 4:5 lands in the portrait
 *    bucket, so a 4:5 request comes back 1024×1536.
 *  · Gemini renders at a "2K" long edge and fits the ratio to it.
 *
 * When the model is unknown, the Gemini figures are used: that is the default
 * this app generates with.
 */
/**
 * The pixels an operation that *keeps* the source shape will return.
 *
 * Restore and upscale do not choose a shape — they hand back what they were
 * given, at a larger size. So their waiting state cannot use `resolutionFor`,
 * which starts from one of the five offered ratios; it starts from the source's
 * own dimensions and a target long edge (2048 at "2K", 3840 at "4K").
 *
 * Both dimensions come back even, since odd sizes are rejected downstream.
 */
export function fitLongEdge(width: number, height: number, longEdge: number): string {
    if (!(width > 0) || !(height > 0)) return `${longEdge} × ${longEdge}`
    const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)
    const short = even((longEdge * Math.min(width, height)) / Math.max(width, height))
    return width >= height ? `${even(longEdge)} × ${short}` : `${short} × ${even(longEdge)}`
}

export function resolutionFor(aspect: AspectRatio, modelId?: string): string {
    const [w, h] = aspect.split(':').map(Number)
    const ratio = w / h

    if (modelId?.startsWith('gpt-image')) {
        if (ratio < 0.85) return '1024 × 1536'
        if (ratio > 1.15) return '1536 × 1024'
        return '1024 × 1024'
    }

    // Gemini: long edge ~2048 at 2K, short edge derived and rounded to an even
    // number, since encoders reject odd dimensions.
    const long = 2048
    const short = Math.round((long * Math.min(w, h)) / Math.max(w, h) / 2) * 2
    return ratio < 1 ? `${short} × ${long}` : ratio > 1 ? `${long} × ${short}` : `${long} × ${long}`
}
