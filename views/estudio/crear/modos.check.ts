/** tsx views/estudio/crear/modos.check.ts — the family of shots, the grids' rows, the tile names and which grid is on the table. */
import assert from 'node:assert'
import { cuadriculaDe, familiaDe, filas, nombreLlegada } from './modos'

assert.equal(familiaDe('shoes'), 'calzado')
assert.equal(familiaDe('other', 'Tenis Bolton café'), 'calzado')
assert.equal(familiaDe('other', null, 'Mesa nueva', 'Una bota de piel'), 'calzado')
assert.equal(familiaDe('beauty', 'Esencia de fiesta'), 'general')
assert.equal(familiaDe(null), 'general')

assert.deepStrictEqual(filas([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5, null]])
assert.deepStrictEqual(filas([0, 1, 2, 3, 4, 5, 6, 7, 8], 3), [[0, 1, 2], [3, 4, 5], [6, 7, 8]])
assert.deepStrictEqual(filas([], 3), [])

assert.equal(nombreLlegada('Cuadrícula · Seto en la banqueta · final', 'Cuadrícula · ', '4:5'), 'Seto en la banqueta · alta · 4:5')
assert.equal(nombreLlegada('Catálogo · Perfil', 'Catálogo · ', '1:1'), 'Perfil · 1:1')

const p = (id: string, label: string, status: string, resultUrl: string | null = null) => ({ id, label, status, resultUrl })
assert.equal(cuadriculaDe([], []).fase, 'pedido')
assert.equal(cuadriculaDe([p('a', 'Cuadrícula', 'running')], []).fase, 'generando')
assert.equal(cuadriculaDe([p('a', 'Cuadrícula', 'ready', 'https://x/a.png')], []).fase, 'elegir')
// Ready without its image is still on its way; a chosen grid leaves; the newest one wins, and a failed newest sends back to ordering.
assert.equal(cuadriculaDe([p('a', 'Cuadrícula', 'ready')], []).fase, 'generando')
assert.equal(cuadriculaDe([p('a', 'Cuadrícula', 'ready', 'https://x/a.png')], ['a']).fase, 'pedido')
assert.equal(cuadriculaDe([p('a', 'Cuadrícula', 'ready', 'u'), p('b', 'Cuadrícula', 'queued')], []).vigente?.id, 'b')
const f = cuadriculaDe([p('a', 'Cuadrícula', 'ready', 'u'), p('b', 'Cuadrícula', 'failed')], [])
assert.equal(f.fase, 'pedido')
assert.equal(f.fallo?.id, 'b')
// Its cells and a grid being claimed are not the grid.
assert.equal(cuadriculaDe([p('c', 'Cuadrícula · Seto · final', 'ready', 'u'), p('d', 'Cuadrícula (eligiendo)', 'ready', 'u')], []).fase, 'pedido')

console.log('modos.check ok')
