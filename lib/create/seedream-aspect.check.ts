/**
 * Self-check for the aspect translation. Run with:
 *   npx tsx lib/create/seedream-aspect.check.ts
 *
 * Live failure: saying "para Instagram" produced `4:5`, which went straight
 * into `seedreamConfig.aspect_ratio` — a field whose enum does not contain it.
 * `/api/enhance-product` answered 400 and the generation died right after the
 * client had chosen their idea.
 *
 * The same pair of lists caused the same failure on the web. Two enums in one
 * route that look interchangeable and are not, so this reads both from the
 * route itself instead of trusting a copy.
 */
import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'
import { ASPECTS } from './aspect'
import { toSeedreamAspect } from './seedream-aspect'

const ROUTE = '/Users/antoniogonzalez/Sites/toon-converter/app/api/enhance-product/route.ts'
assert.ok(existsSync(ROUTE), `the web repo is not beside this one, so the enums cannot be read: ${ROUTE}`)
const src = readFileSync(ROUTE, 'utf8')

const enumAt = (pattern: RegExp, label: string) => {
    const m = src.match(pattern)
    assert.ok(m, `could not read ${label} — this check is not testing anything`)
    return new Set(m![1].split(',').map((s) => s.trim().replace(/['"]/g, '')))
}

const seedream = enumAt(/aspect_ratio: z\.enum\(\[([^\]]+)\]\)/, 'seedreamConfig.aspect_ratio')
const topLevel = enumAt(/aspectRatio: z\.enum\(\[([^\]]+)\]\)/, 'the top-level aspectRatio')

// Every shape the director can hear must survive the translation.
for (const a of ASPECTS) {
    const out = toSeedreamAspect(a.id)
    assert.ok(
        seedream.has(out),
        `"${a.id}" translates to "${out}", which seedreamConfig rejects — generation would 400`,
    )
}

// The two lists must still genuinely differ, or this module is dead weight and
// should be deleted rather than left as ceremony.
const onlyTop = [...topLevel].filter((r) => !seedream.has(r))
assert.ok(
    onlyTop.length > 0,
    'the two enums now agree; if that is deliberate, delete this translation and its check',
)

// And the reason it exists must still be the reason: 4:5 is the one the
// director reaches for first and the one seedream lacks.
assert.ok(onlyTop.includes('4:5'), `expected 4:5 to be top-level only, found ${onlyTop.join('/')}`)
assert.equal(toSeedreamAspect('4:5'), '3:4')

console.log(`seedream-aspect: ok (${ASPECTS.length} shapes translate, ${onlyTop.join('/')} needed it)`)
