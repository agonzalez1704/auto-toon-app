/**
 * Parity check for the composer's rules (web `app/(estudio)/crear/referencias/motor.ts`, plan D11). Run with:
 *   npx tsx lib/crear/motor.check.ts
 *
 * `motor.ts` is copied byte for byte from the web: the web is the source of truth, so change it there and copy it
 * again, never here alone. Below the copy guard are the web's own `motor.check.ts` cases, unchanged.
 */
import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'
import { estiloImage, faltaParaRopa, motorPorDefecto, photobookImage, planFor, providerBrief, readPrompt, type MotorRef } from './motor'

const WEB = '/Users/antoniogonzalez/Sites/toon-converter/app/(estudio)/crear/referencias/motor.ts'
assert.ok(existsSync(WEB), `the web repo is not at ${WEB}, so parity cannot be verified`)
assert.strictEqual(readFileSync(new URL('./motor.ts', import.meta.url), 'utf8'), readFileSync(WEB, 'utf8'), 'lib/crear/motor.ts drifted from the web copy')

const refs: MotorRef[] = [
    { name: 'modelo', url: 'https://x/modelo.jpg' },
    { name: 'sneaker', url: 'https://x/sneaker.jpg' },
    { name: 'calle', url: 'https://x/calle.jpg' },
    { name: 'vestido', url: 'https://x/vestido.jpg' },
]

// The board's sentence: every role comes from the words before the @.
const text = 'Haz que la persona de @modelo use los tenis de @sneaker en la calle de @calle. Luz de tarde. Cambia el vestuario por el de @vestido'
const uses = readPrompt(text, refs)
assert.deepStrictEqual(
    uses.map((u) => [u.name, u.role]),
    [
        ['modelo', 'CHARACTER'],
        ['sneaker', 'PRODUCT'],
        ['calle', 'ENVIRONMENT'],
        ['vestido', 'WARDROBE'],
    ],
)
assert.strictEqual(uses[0].why, '«la persona de @modelo»')
assert.strictEqual(uses[3].why, '«el vestuario por el de @vestido»')

// D9: person first, product second, all of it in one GPT Image 2 step (owner, 2026-11-17: no step 2).
const plan = planFor(uses, refs)!
assert.strictEqual(plan.kind, 'misma-persona', 'persona, producto y ropa: D9, no el cambio de ropa')
assert.deepStrictEqual(plan.refs, ['https://x/modelo.jpg', 'https://x/sneaker.jpg', 'https://x/calle.jpg', 'https://x/vestido.jpg'])
assert.ok(!('product' in plan), 'ya no hay paso 2')
assert.deepStrictEqual(
    plan.uses.map((u) => u.model),
    ['GPT Image 2', 'GPT Image 2', 'GPT Image 2', 'GPT Image 2'],
)
const brief = providerBrief(text, plan)
assert.ok(brief.startsWith('Haz que la persona de image 1 use los tenis de image 2 en la calle de image 3.'), brief)
assert.ok(brief.endsWith('Image 4: wardrobe reference.'), brief)

// Without @: by order — 1st person, 2nd product, 3rd environment.
assert.deepStrictEqual(
    readPrompt('Luz de tarde', refs.slice(0, 3)).map((u) => u.role),
    ['CHARACTER', 'PRODUCT', 'ENVIRONMENT'],
)

// Only what is mentioned is used; the user's choice beats the words.
const two = readPrompt('pon los tenis de @sneaker en @calle', [...refs.slice(0, 2), { ...refs[2], role: 'STYLE' }])
assert.deepStrictEqual(
    two.map((u) => [u.name, u.role, u.why]),
    [
        ['sneaker', 'PRODUCT', '«los tenis de @sneaker»'],
        ['calle', 'STYLE', 'tú'],
    ],
)

// No person: one Nano Banana Pro step, product first, nothing left for a step 2.
const noPerson = planFor(two, [...refs.slice(0, 2), { ...refs[2], role: 'STYLE' }])!
assert.strictEqual(noPerson.kind, 'editar')
assert.deepStrictEqual(noPerson.refs, ['https://x/sneaker.jpg', 'https://x/calle.jpg'])
assert.strictEqual(estiloImage(noPerson), 2)
// The client marks which image is the look; saying what a look is belongs to the server.
const conEstilo = providerBrief('pon los tenis de @sneaker en @calle', noPerson)
assert.ok(!conEstilo.includes('style reference'), conEstilo)
assert.ok(conEstilo.endsWith('Image 1: product reference.'), conEstilo)
assert.strictEqual(estiloImage(plan), undefined)

// The watch brief: a persona and a product, the product's photobook on the table but never mentioned.
const conHoja: MotorRef[] = [
    { name: 'modelo', url: 'https://x/modelo.jpg', persona: true },
    { name: 'reloj', url: 'https://x/reloj.jpg', role: 'PRODUCT' },
    { name: 'photobook', url: 'https://x/hoja.jpg', role: 'PHOTOBOOK' },
]
const usos = readPrompt('@modelo con el reloj de @reloj en un barco en Grecia', conHoja)
assert.deepStrictEqual(usos.map((u) => [u.name, u.role, u.why]).at(-1), ['photobook', 'PHOTOBOOK', 'va con el producto'], 'el photobook va con su producto aunque nadie lo mencione')
const planHoja = planFor(usos, conHoja)!
assert.deepStrictEqual(planHoja.refs, ['https://x/modelo.jpg', 'https://x/reloj.jpg', 'https://x/hoja.jpg'], 'persona, producto, su hoja')
assert.strictEqual(photobookImage(planHoja), 3)
assert.ok(!providerBrief('@modelo con el reloj de @reloj en un barco en Grecia', planHoja).includes('photobook reference'), 'el servidor dice qué es un photobook, no el cliente')
// Without the product in the piece, the sheet stays home.
assert.ok(!readPrompt('@modelo en un barco en Grecia', conHoja).some((u) => u.role === 'PHOTOBOOK'))

// A cast persona is a person even when mentioned bare; an upload still in flight blocks the plan.
assert.strictEqual(readPrompt('@ana en la playa', [{ name: 'ana', url: 'https://x/a.jpg', persona: true }])[0].role, 'CHARACTER')
assert.strictEqual(planFor(readPrompt('@a', [{ name: 'a', url: null }]), [{ name: 'a', url: null }]), null)

// The case that asked for a picker: @producto on the table, a second photo with no words about it.
// By order (D11) the first free role is a person, so GPT Image 2 takes over — the plan's default, not a bug.
const dosFotos: MotorRef[] = [
    { name: 'producto', url: 'https://x/p.jpg', role: 'PRODUCT' },
    { name: 'imagen', url: 'https://x/i.jpg' },
]
const porOrden = readPrompt('@producto sobre una mesa con @imagen', dosFotos)
assert.deepStrictEqual(porOrden.map((u) => u.role), ['PRODUCT', 'CHARACTER'])
assert.strictEqual(planFor(porOrden, dosFotos)!.kind, 'misma-persona')
// Picked by hand: Nano Banana Pro in one step, everything sent, no step 2.
const aMano = planFor(porOrden, dosFotos, 'editar')!
assert.strictEqual(aMano.kind, 'editar')
assert.deepStrictEqual(aMano.refs, ['https://x/i.jpg', 'https://x/p.jpg'], 'la persona sigue primero')
assert.deepStrictEqual(aMano.uses.map((u) => u.model), ['Nano Banana Pro', 'Nano Banana Pro'])
assert.deepStrictEqual(planFor(porOrden, dosFotos, 'retoque')!.uses.map((u) => u.model), ['Nano Banana 2', 'Nano Banana 2'])
// GPT Image 2 picked with nobody in the shot: one step too, the product with it.
const soloProducto = readPrompt('los tenis de @sneaker en la calle de @calle', refs.slice(1, 3))
const gptSinPersona = planFor(soloProducto, refs.slice(1, 3), 'misma-persona')!
assert.strictEqual(gptSinPersona.kind, 'misma-persona')
assert.deepStrictEqual(gptSinPersona.uses.map((u) => u.model), ['GPT Image 2', 'GPT Image 2'])
assert.ok(providerBrief('los tenis de @sneaker en la calle de @calle', gptSinPersona).includes('Image 1: product reference.'))

// The clothes swap (2026-11-17): a man's street photo, a cardigan worn by someone else. Seedream 5.5, one step.
const hombre: MotorRef = { name: 'hombre', url: 'https://x/hombre.jpg' }
const cardigan: MotorRef = { name: 'cardigan', url: 'https://x/cardigan.jpg' }
const cambio = readPrompt('ponle a @hombre el suéter de @cardigan', [hombre, cardigan])
assert.deepStrictEqual(cambio.map((u) => [u.name, u.role]), [['hombre', 'CHARACTER'], ['cardigan', 'WARDROBE']], 'el suéter es ropa')
assert.strictEqual(motorPorDefecto(cambio), 'ropa')
const planCambio = planFor(cambio, [hombre, cardigan])!
assert.strictEqual(planCambio.kind, 'ropa')
assert.deepStrictEqual(planCambio.refs, ['https://x/hombre.jpg', 'https://x/cardigan.jpg'], 'la persona primero, luego la prenda')
assert.deepStrictEqual(planCambio.uses.map((u) => u.model), ['Seedream 5.5', 'Seedream 5.5'])
// The person written second still goes first.
const alReves = readPrompt('el pantalón de @cardigan para @hombre', [cardigan, hombre])
assert.deepStrictEqual(planFor(alReves, [cardigan, hombre])!.refs, ['https://x/hombre.jpg', 'https://x/cardigan.jpg'])
// Seedream takes ten images: an eleventh does not fit.
const muchas: MotorRef[] = [hombre, ...Array.from({ length: 10 }, (_, i) => ({ name: `p${i}`, url: `https://x/p${i}.jpg`, role: 'WARDROBE' as const }))]
const planMuchas = planFor(readPrompt('cámbiale la ropa', muchas), muchas)!
assert.strictEqual(planMuchas.kind, 'ropa')
assert.strictEqual(planMuchas.refs.length, 10)
// A person, a product and a garment is still a new shot (D9), not a swap.
assert.strictEqual(motorPorDefecto(readPrompt('@hombre con los tenis de @sneaker y el suéter de @cardigan', [hombre, refs[1], cardigan])), 'misma-persona')
// Picked by hand, GPT Image 2 or Nano Banana Pro do the same swap in one step.
assert.deepStrictEqual(planFor(cambio, [hombre, cardigan], 'misma-persona')!.uses.map((u) => u.model), ['GPT Image 2', 'GPT Image 2'])

// The owner's first real swap (2026-11-18, it cost money and came back as the street photo untouched): «Copia una
// toma» described the man's photo, the cardigan went up first (so it was named @persona) and the mentions came
// after the clause each one stands for, with no «de». The clause names the role; the swap's base is the man.
const subidas: MotorRef[] = [
    { name: 'persona', url: 'https://x/cardigan.jpg' },
    { name: 'producto', url: 'https://x/hombre.jpg' },
]
const copiada =
    'Suéter gris jaspeado de punto grueso @persona con pantalón negro ancho y tenis blancos, llevado por un hombre que baja de la banqueta con una mano en el bolsillo. Plano entero, a la altura del sujeto, en una esquina con edificio de piedra color arena, balaustrada y ventana enrejada, entre dos bolardos oscuros y losetas táctiles blancas @producto. Luz nublada, suave y difusa.'
const leida = readPrompt(copiada, subidas)
assert.deepStrictEqual(leida.map((u) => [u.name, u.role]), [['persona', 'WARDROBE'], ['producto', 'CHARACTER']], 'la frase antes de la @ dice qué es')
assert.strictEqual(leida[0].why, '«Suéter gris jaspeado de punto grueso @persona»')
assert.deepStrictEqual(planFor(leida, subidas, 'ropa')!.refs, ['https://x/hombre.jpg', 'https://x/cardigan.jpg'], 'la foto que se queda va primero')
// The clause is the words since the last mark: a scene with no role in it says nothing.
assert.strictEqual(readPrompt('en una esquina, entre dos bolardos @calle', [{ name: 'calle', url: 'https://x/c.jpg' }])[0].why, 'por orden')
// The word nearest the mention decides (2026-11-18: «Hombre vistiendo un suéter grabado @imagen» read the man).
const grabado = readPrompt('Hombre vistiendo un suéter grabado @imagen , camiseta y pantalón blancos, recargado en una barra.', [{ name: 'imagen', url: 'https://x/s.jpg' }])
assert.deepStrictEqual([grabado[0].role, grabado[0].why], ['WARDROBE', '«un suéter grabado @imagen»'])
assert.strictEqual(readPrompt('una modelo con vestido rojo @foto', [{ name: 'foto', url: 'https://x/a.jpg' }])[0].role, 'WARDROBE')
// A cast persona stays a person whatever loose clause comes before her.
assert.strictEqual(readPrompt('Vestido rojo de satín @ana', [{ name: 'ana', url: 'https://x/a.jpg', persona: true }])[0].role, 'CHARACTER')

// Seedream never runs on a guess: no garment, or no photo to keep, and there is no plan — the screen says what is missing.
const adivinadas = readPrompt('@persona y @producto', subidas)
assert.deepStrictEqual(adivinadas.map((u) => u.role), ['CHARACTER', 'PRODUCT'])
assert.strictEqual(planFor(adivinadas, subidas, 'ropa'), null, 'un cambio de ropa sin prenda se cobró')
assert.match(faltaParaRopa(adivinadas)!, /cuál es la prenda/)
const dosPrendas = readPrompt('la ropa de @persona y la ropa de @producto', subidas)
assert.strictEqual(planFor(dosPrendas, subidas, 'ropa'), null, 'un cambio de ropa sin foto base se cobró')
assert.match(faltaParaRopa(dosPrendas)!, /qué foto se queda/)
assert.strictEqual(faltaParaRopa(cambio), null)
// Only the person and the clothes go to Seedream: a street photo is not a garment.
const conCalle = [hombre, cardigan, { name: 'calle', url: 'https://x/calle.jpg' }]
assert.deepStrictEqual(planFor(readPrompt('ponle a @hombre el suéter de @cardigan en la calle de @calle', conCalle), conCalle, 'ropa')!.refs, ['https://x/hombre.jpg', 'https://x/cardigan.jpg'])

// Seedream for a new shot (2026-11-18): picked as «Seedream 5.5», a sweater alone is a reference, not a swap to refuse.
const tomaNueva = planFor(grabado, [{ name: 'imagen', url: 'https://x/s.jpg' }], 'seedream')!
assert.deepStrictEqual([tomaNueva.kind, tomaNueva.refs, tomaNueva.uses[0].model], ['seedream', ['https://x/s.jpg'], 'Seedream 5.5'])
assert.match(faltaParaRopa(grabado)!, /Para una toma nueva, elige Seedream 5\.5\./)

console.log('motor: ok')
