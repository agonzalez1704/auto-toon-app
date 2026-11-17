/**
 * Self-check for Pasarela's pure helpers (the web's vista.ts rules the phone repeats). Run with:
 *   npx tsx lib/pasarela.check.ts
 */
import assert from 'node:assert'
import { alternarToma, escenasDe, estadoDe, etiquetaGenerar, presetDe, resumenPrecio, type Catalogo, type Nodo } from './pasarela'

// The four looks of a tile, as the web's estadoDe.
assert.equal(estadoDe(undefined), 'vacia')
assert.equal(estadoDe({ status: 'ready', resultUrl: 'https://x/a.jpg' }), 'lista')
assert.equal(estadoDe({ status: 'ready', resultUrl: null }), 'no-salio')
assert.equal(estadoDe({ status: 'failed', resultUrl: null }), 'no-salio')
assert.equal(estadoDe({ status: 'running', resultUrl: null }), 'generando')
assert.equal(estadoDe({ status: 'queued', resultUrl: null }), 'en-cola')
assert.equal(estadoDe({ status: 'esperando', resultUrl: null }), 'en-cola')

// Historia: in order, numbered; dropping one closes the gap; «Termina en la siguiente» on by default, never on the last.
let h: Nodo = { id: 'h', tipo: 'historia', datos: {} }
const tocar = (id: string, max = 12) => (h = { ...h, datos: { ...h.datos, ...alternarToma(h, id, max) } })
tocar('a')
tocar('b')
tocar('c')
assert.deepEqual(h.datos.tomas, ['a', 'b', 'c'])
assert.deepEqual(escenasDe(h.datos).map((e) => e.fin), [true, true, false])
h = { ...h, datos: { ...h.datos, escenas: [{ texto: 'gira', fin: false }, { texto: 'baja', fin: true }, { texto: 'negro', fin: false }] } }
tocar('a')
assert.deepEqual(h.datos.tomas, ['b', 'c'])
assert.deepEqual(escenasDe(h.datos), [{ texto: 'baja', fin: true }, { texto: 'negro', fin: false }])
tocar('d')
assert.deepEqual(escenasDe(h.datos), [{ texto: 'baja', fin: true }, { texto: 'negro', fin: true }, { texto: '', fin: false }])
// Up to the limit: one more changes nothing.
assert.deepEqual(alternarToma(h, 'e', 3), {})
// Other nodes just toggle, in the order tapped.
const amp: Nodo = { id: 'a', tipo: 'ampliar', datos: { tomas: ['x'] } }
assert.deepEqual(alternarToma(amp, 'y', 12), { tomas: ['x', 'y'] })
assert.deepEqual(alternarToma(amp, 'x', 12), { tomas: [] })

// Presets: her own, the server's fallback, or her own reading when she has one.
const p = (id: string) => ({ id, label: id, src: null, pos: '50% 50%', sw: '#000', propia: id === 'tu-foto', desc: '' })
const cat = { presets: { set: [p('piedra'), p('sin-costura-hueso'), p('tu-foto')], luz: [], peinado: [], maquillaje: [] }, defecto: { set: 'sin-costura-hueso' } } as unknown as Catalogo
assert.equal(presetDe({ id: 's', tipo: 'set', datos: { preset: 'piedra' } }, 'set', cat)?.id, 'piedra')
assert.equal(presetDe({ id: 's', tipo: 'set', datos: {} }, 'set', cat)?.id, 'sin-costura-hueso')
assert.equal(presetDe(undefined, 'set', cat)?.id, 'sin-costura-hueso')
assert.equal(presetDe({ id: 's', tipo: 'set', datos: { texto: 'un patio' } }, 'set', cat), undefined)

// The button: its words, and «N × $X» only when every piece costs the same.
assert.equal(etiquetaGenerar('sesion', 6), 'Generar 6 tomas')
assert.equal(etiquetaGenerar('ampliar', 2), 'Ampliar 2')
assert.equal(etiquetaGenerar('video', 1), 'Generar 1 video')
const mxn = (c: number) => `$${(c / 100).toFixed(2)}`
assert.deepEqual(resumenPrecio({ lines: [{ kind: 'soul', unitCents: 1200, count: 1 }, { kind: 'soul', unitCents: 1200, count: 1 }], totalCents: 2400 }, mxn), { k: 2, detalle: '2 × $12.00 MXN' })
assert.deepEqual(
  resumenPrecio({ lines: [{ kind: 'soul', unitCents: 1200, count: 2 }, { kind: 'editar', unitCents: 800, count: 2, luego: true }], totalCents: 4000 }, mxn),
  { k: 2, detalle: '$40.00 MXN' },
  'the accessories step is part of the total, not of the count',
)

assert.deepEqual(
  resumenPrecio({ lines: [{ kind: 'seedream', unitCents: 100, count: 1 }, { kind: 'seedream', unitCents: 100, count: 1 }], totalCents: 1000 }, mxn),
  { k: 2, detalle: '$10.00 MXN' },
  'a minimum charge shows the total, never a product that is not what is charged',
)

console.log('pasarela ok')
