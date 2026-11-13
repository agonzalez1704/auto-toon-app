/**
 * Parity check for Historia's client helpers. Run with:
 *   npx tsx lib/historia/copia.check.ts
 *
 * `corrido.ts` and `autoguardado.ts` are the web's files byte for byte, and `escenas.ts` copies three of the web's
 * functions: the web is the source of truth, so change them there and copy them again, never here alone.
 */
import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createAutoguardado } from './autoguardado'
import { pasosCorrido } from './corrido'
import { clipActual, mover, type Escena } from './escenas'

/** The web's file as `develop` has it (the local checkout may be on any branch, or behind). */
function deLaWeb(f: string): string | null {
  try {
    return execFileSync('git', ['-C', '/Users/antoniogonzalez/Sites/toon-converter', 'show', `origin/develop:lib/historia/${f}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null
  }
}
const aqui = (f: string) => readFileSync(`${__dirname}/${f}`, 'utf8')

const web = deLaWeb('escenas.ts')
if (web) {
  for (const f of ['corrido.ts', 'autoguardado.ts']) assert.equal(aqui(f), deLaWeb(f), `${f} ya no es la copia de la web`)
  const bloque = (src: string, inicio: string) => {
    const i = src.indexOf(inicio)
    assert(i >= 0, `falta ${inicio}`)
    return src.slice(i, src.indexOf('\n}\n', i) + 2)
  }
  for (const b of ['export interface Escena {', 'export function mover(', 'export function clipActual<']) assert.equal(bloque(aqui('escenas.ts'), b), bloque(web, b), `${b} cambió en la web`)
  assert.match(web, /export const DURACION_INICIAL = 5\n/, 'DURACION_INICIAL cambió en la web')
} else console.warn('copia.check: no está el repo web; sólo corren los casos')

const e = (id: string, inicio: string | null): Escena => ({ id, inicio, fin: null, texto: '', duracionS: 5, motor: 'spot25' })
const clip = (escena: string, createdAt: string, status = 'ready', videoUrl: string | null = `v-${createdAt}.mp4`) => ({ escena, createdAt, status, videoUrl })

// The newest ready clip of each scene; the player shows it, else the start image for the scene's duration.
assert.equal(clipActual([clip('a', '1'), clip('a', '3'), clip('a', '4', 'failed')], 'a')?.createdAt, '3')
assert.deepEqual(
  pasosCorrido([e('a', 'x'), e('b', 'y'), e('c', null)], [clip('a', '2')], { x: 'x.jpg', y: 'y.jpg' }).map((p) => [p.tipo, p.src]),
  [['clip', 'v-2.mp4'], ['imagen', 'y.jpg']],
)
assert.deepEqual(mover([e('a', null), e('b', null)], 0, 1).map((x) => x.id), ['b', 'a'])
assert.deepEqual(mover([e('a', null)], 0, 1).map((x) => x.id), ['a'])

// Autosave: one save at a time, always of the newest value.
async function main() {
  const guardados: number[] = []
  const auto = createAutoguardado<number>(async (v) => void guardados.push(v), 10_000)
  auto.cambiar(1)
  auto.cambiar(2)
  await auto.vaciar()
  assert.deepEqual(guardados, [2])
  console.log('historia copia: ok')
}
main()
