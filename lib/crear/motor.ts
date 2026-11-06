/**
 * «Lo que entendió el motor» (plan D11): reads the @mentions in the prompt,
 * gives each reference a role from what is said about it, and picks the
 * models by plan D9. Rules only, no tokens.
 */

export type Role = 'CHARACTER' | 'PRODUCT' | 'PHOTOBOOK' | 'ENVIRONMENT' | 'WARDROBE' | 'STYLE'
export const ROLES: Role[] = ['CHARACTER', 'PRODUCT', 'PHOTOBOOK', 'ENVIRONMENT', 'WARDROBE', 'STYLE']
export const ROLE_COLOR: Record<Role, string> = { CHARACTER: '#86EFAC', PRODUCT: '#D4FF3D', PHOTOBOOK: '#E8FF8A', ENVIRONMENT: '#C48A5C', WARDROBE: '#7CF2D6', STYLE: '#C7C7C7' }
const ROLE_EN: Record<Role, string> = { CHARACTER: 'character', PRODUCT: 'product', PHOTOBOOK: 'photobook', ENVIRONMENT: 'environment', WARDROBE: 'wardrobe', STYLE: 'style' }

// «la persona de @x», «los tenis de @x», «el vestuario por el de @x»: the noun before «de» says the role.
const CUES: [Role, string][] = [
    ['CHARACTER', 'persona modelo cara rostro personaje chica chico mujer hombre'],
    ['PRODUCT', 'producto productos tenis zapatos zapato bolsa botella frasco perfume crema sérum serum reloj lentes gorra joya anillo collar aretes empaque caja lata'],
    ['ENVIRONMENT', 'calle fondo lugar escena escenario entorno cuarto recámara cocina baño playa oficina tienda casa parque locación'],
    ['WARDROBE', 'vestuario ropa outfit atuendo'],
    ['STYLE', 'estilo luz iluminación encuadre estética color colores tono paleta'],
]
const CUE = new Map(CUES.flatMap(([role, words]) => words.split(' ').map((w) => [w, role] as const)))

export const MENTION = /@([\p{L}\p{N}_-]+)/gu

/** The role said right before a mention, and the words that said it. */
export function cueBefore(before: string): { role: Role; phrase: string } | null {
    const words = before.trimEnd().split(/\s+/)
    if (!/^(de|del)$/i.test(words.at(-1) ?? '')) return null
    for (let i = words.length - 2; i >= Math.max(0, words.length - 5); i--) {
        const role = CUE.get(words[i].toLowerCase().replace(/[^\p{L}]/gu, ''))
        if (!role) continue
        const from = /^(el|la|los|las)$/i.test(words[i - 1] ?? '') ? i - 1 : i
        return { role, phrase: words.slice(from).join(' ') }
    }
    return null
}

export interface MotorRef {
    name: string
    url: string | null
    /** From the user's cast: a person, whatever the prompt says. */
    persona?: boolean
    /** Set by the user in the table; beats everything else. */
    role?: Role
}

export interface Use {
    /** Index in the refs list. */
    index: number
    name: string
    role: Role
    /** Why: the words in the prompt, «elenco», «por orden» or «tú». */
    why: string
}

/**
 * Which references the prompt uses, each with its role. With @mentions only
 * the mentioned ones, in the order they are mentioned; without, all of them
 * by order: 1st person, 2nd product, 3rd environment.
 */
export function readPrompt(text: string, refs: MotorRef[]): Use[] {
    const byName = new Map(refs.map((r, i) => [r.name, i]))
    const said = new Map<number, ReturnType<typeof cueBefore>>()
    for (const m of text.matchAll(MENTION)) {
        const i = byName.get(m[1].toLowerCase())
        if (i !== undefined && !said.has(i)) said.set(i, cueBefore(text.slice(0, m.index)))
    }
    const order = said.size ? [...said.keys()] : refs.map((_, i) => i)
    const uses = order.map((index) => {
        const r = refs[index]
        const cue = said.get(index)
        const [role, why]: [Role | null, string] = r.role ? [r.role, 'tú'] : cue ? [cue.role, `«${cue.phrase} @${r.name}»`] : r.persona ? ['CHARACTER', 'elenco'] : [null, 'por orden']
        return { index, name: r.name, role, why }
    })
    const taken = new Set(uses.map((u) => u.role))
    const resueltos = uses.map((u) => {
        if (u.role) return u as Use
        const role = (['CHARACTER', 'PRODUCT', 'ENVIRONMENT'] as Role[]).find((x) => !taken.has(x)) ?? 'STYLE'
        taken.add(role)
        return { ...u, role }
    })
    // The product's photobook rides with the product whenever the product is in
    // the piece, named or not: the sheet is how the model knows its other sides,
    // and a prompt that forgot to mention it should not get an invented product.
    const hoja = refs.findIndex((r) => r.role === 'PHOTOBOOK')
    if (hoja >= 0 && resueltos.some((u) => u.role === 'PRODUCT') && !resueltos.some((u) => u.index === hoja))
        resueltos.push({ index: hoja, name: refs[hoja].name, role: 'PHOTOBOOK', why: 'va con el producto' })
    return resueltos
}

/** The engines step 1 can run, by job kind: GPT Image 2, Nano Banana Pro, Nano Banana 2. */
export type Motor = 'misma-persona' | 'editar' | 'retoque'
export type NombreMotor = 'GPT Image 2' | 'Nano Banana Pro' | 'Nano Banana 2'
const NOMBRE: Record<Motor, NombreMotor> = { 'misma-persona': 'GPT Image 2', editar: 'Nano Banana Pro', retoque: 'Nano Banana 2' }

/** Plan D9's pick: GPT Image 2 when a person is in the shot, Nano Banana Pro when not. */
export const motorPorDefecto = (uses: Use[]): Motor => (uses.some((u) => u.role === 'CHARACTER') ? 'misma-persona' : 'editar')

export interface Plan {
    /** Step 1: plan D9's engine (GPT Image 2 with a person, Nano Banana Pro without), or the one the person picked. */
    kind: Motor
    /** URLs in the order they are sent: the person first, then the product, then the rest. */
    refs: string[]
    /** Step 2 (Nano Banana Pro puts the real product), when GPT Image 2 drew one. */
    product: string | null
    /** The product's photobook, which goes with it into step 2 as well. */
    photobook: string | null
    uses: (Use & { model: NombreMotor; image: number | null })[]
}

/**
 * Plan D9 applied to what the prompt uses, or the engine the person picked.
 * Null until every used image is uploaded.
 */
export function planFor(uses: Use[], refs: MotorRef[], elegido?: Motor | null): Plan | null {
    if (!uses.length || uses.some((u) => !refs[u.index].url)) return null
    const kind = elegido ?? motorPorDefecto(uses)
    // GPT Image 2 redraws the product, so Nano Banana puts the real one back afterwards — person or not.
    const gpt = kind === 'misma-persona'
    const person = uses.find((u) => u.role === 'CHARACTER')
    const product = uses.find((u) => u.role === 'PRODUCT')
    const hoja = uses.find((u) => u.role === 'PHOTOBOOK')
    const first = person ? [person, product, hoja] : [product, hoja]
    const ordered = [...first.filter((u): u is Use => !!u), ...uses.filter((u) => u !== person && u !== product && u !== hoja)]
    const sent = ordered.slice(0, gpt ? 4 : 6)
    return {
        kind,
        refs: sent.map((u) => refs[u.index].url!),
        product: gpt && product ? refs[product.index].url : null,
        photobook: gpt && product && hoja ? refs[hoja.index].url : null,
        uses: uses.map((u) => {
            const at = sent.indexOf(u)
            const pasoDos = gpt && (u.role === 'PRODUCT' || u.role === 'PHOTOBOOK')
            return { ...u, model: pasoDos ? 'Nano Banana Pro' : NOMBRE[kind], image: at < 0 ? null : at + 1 }
        }),
    }
}

/** The prompt in the provider's words: each @name becomes «image N», plus which image is what. */
export function providerBrief(text: string, plan: Plan): string {
    const image = new Map(plan.uses.filter((u) => u.image).map((u) => [u.name, u]))
    const body = text
        .replace(/\u00a0/g, ' ')
        .replace(MENTION, (_, name: string) => {
            const u = image.get(name.toLowerCase())
            return u ? `image ${u.image}` : name
        })
        .replace(/\s+/g, ' ')
        .trim()
    // A style reference and a photobook are not announced here: the server says what each one is.
    const roles = [...image.values()]
        .filter((u) => u.role !== 'STYLE' && u.role !== 'PHOTOBOOK')
        .sort((a, b) => a.image! - b.image!)
        .map((u) => `Image ${u.image}: ${ROLE_EN[u.role]} reference.`)
    return [body, ...roles].join(' ').slice(0, 1900)
}

/** The image the plan sends as a look, for the job's `estilo`. Nothing when it did not fit. */
export function estiloImage(plan: Plan): number | undefined {
    return plan.uses.find((u) => u.role === 'STYLE' && u.image)?.image ?? undefined
}

/** Where the photobook sits among the images sent, for the job's `photobook`. */
export function photobookImage(plan: Plan): number | undefined {
    return plan.uses.find((u) => u.role === 'PHOTOBOOK' && u.image)?.image ?? undefined
}
