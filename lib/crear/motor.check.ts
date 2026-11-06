/**
 * Parity check for the composer's rules (web `app/(estudio)/crear/referencias/motor.ts`, plan D11). Run with:
 *   npx tsx lib/crear/motor.check.ts
 *
 * `motor.ts` is copied byte for byte from the web: the web is the source of truth, so change it there and copy it
 * again, never here alone. Below the copy guard are the web's own `motor.check.ts` cases, unchanged.
 */
import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'
import { estiloImage, photobookImage, planFor, providerBrief, readPrompt, type MotorRef } from './motor'

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

// D9: person first, product second; the product goes to Nano Banana Pro afterwards.
const plan = planFor(uses, refs)!
assert.strictEqual(plan.kind, 'misma-persona')
assert.deepStrictEqual(plan.refs, ['https://x/modelo.jpg', 'https://x/sneaker.jpg', 'https://x/calle.jpg', 'https://x/vestido.jpg'])
assert.strictEqual(plan.product, 'https://x/sneaker.jpg')
assert.deepStrictEqual(
    plan.uses.map((u) => u.model),
    ['GPT Image 2', 'Nano Banana Pro', 'GPT Image 2', 'GPT Image 2'],
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
assert.strictEqual(noPerson.product, null)
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
assert.strictEqual(planHoja.photobook, 'https://x/hoja.jpg', 'el paso 2 también se lleva la hoja')
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
assert.strictEqual(aMano.product, null)
assert.deepStrictEqual(aMano.uses.map((u) => u.model), ['Nano Banana Pro', 'Nano Banana Pro'])
assert.deepStrictEqual(planFor(porOrden, dosFotos, 'retoque')!.uses.map((u) => u.model), ['Nano Banana 2', 'Nano Banana 2'])
// GPT Image 2 picked with nobody in the shot still gets the real product put back in step 2.
const soloProducto = readPrompt('los tenis de @sneaker en la calle de @calle', refs.slice(1, 3))
const gptSinPersona = planFor(soloProducto, refs.slice(1, 3), 'misma-persona')!
assert.strictEqual(gptSinPersona.kind, 'misma-persona')
assert.strictEqual(gptSinPersona.product, 'https://x/sneaker.jpg')
assert.deepStrictEqual(gptSinPersona.uses.map((u) => u.model), ['Nano Banana Pro', 'GPT Image 2'])
assert.ok(providerBrief('los tenis de @sneaker en la calle de @calle', gptSinPersona).includes('Image 1: product reference.'))

console.log('motor: ok')
