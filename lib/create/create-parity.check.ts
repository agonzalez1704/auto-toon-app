/**
 * Self-check for the web↔mobile copies. Run with:
 *   pnpm exec tsx lib/create/create-parity.check.ts
 *
 * `a2ui.ts`, `next-step.ts`, `aspect.ts` and `capabilities.ts` are duplicated
 * from the web app because they are pure TypeScript with no DOM: the parser,
 * the follow-up ladder, the aspect map and the action catalogue all run
 * unchanged on React Native.
 *
 * Duplication is the risk. `lib/ai-models.ts` already drifted this way — mobile
 * is still missing `GEMINI_OMNI` — and nothing failed, it just meant a model
 * the phone could not generate with. So this fails loudly the moment the two
 * sides stop matching, instead of waiting for a user to find it.
 *
 * Web is the source of truth. To change any of these, edit the web copy and
 * re-run the copy; never patch mobile alone.
 */
import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const WEB = '/Users/antoniogonzalez/Sites/toon-converter/lib/create'

// Without the web repo beside this one the check cannot say anything true, and
// a check that silently passes is worse than none.
assert.ok(
    existsSync(WEB),
    `the web repo is not at ${WEB}, so parity cannot be verified — clone it beside this one or run this check there`,
)

/** Copied byte for byte. Any difference at all is drift. */
for (const file of ['a2ui.ts', 'next-step.ts', 'aspect.ts']) {
    const mine = readFileSync(`lib/create/${file}`, 'utf8')
    const theirs = readFileSync(`${WEB}/${file}`, 'utf8')
    assert.equal(
        mine,
        theirs,
        `lib/create/${file} has drifted from the web copy. Web is the source of truth: copy it over, do not patch mobile alone.`,
    )
}

/**
 * `capabilities.ts` has exactly one sanctioned difference: web imports
 * `ProductCategory` from `@/lib/category-prompts/types`, a module mobile does
 * not have, so the literal union is inlined here. Everything after that import
 * must still match, and the union itself must still match its source.
 */
const MARK = 'export interface Analysis'
const mine = readFileSync('lib/create/capabilities.ts', 'utf8')
const theirs = readFileSync(`${WEB}/capabilities.ts`, 'utf8')
assert.ok(mine.includes(MARK) && theirs.includes(MARK), 'capabilities.ts no longer contains the anchor this check splits on')
assert.equal(
    mine.slice(mine.indexOf(MARK)),
    theirs.slice(theirs.indexOf(MARK)),
    'capabilities.ts has drifted from the web copy below the inlined type.',
)

// The inlined union must still say what its source says, or mobile will offer
// actions for a category the web app no longer knows.
const source = readFileSync('/Users/antoniogonzalez/Sites/toon-converter/lib/category-prompts/types.ts', 'utf8')
/**
 * Only the run of `| 'literal'` lines that immediately follows the alias.
 * Reading to the end of the file instead swept up `PanelId` further down,
 * which is also a literal union — the check failed while both sides agreed.
 */
const cats = (s: string) => {
    const out: string[] = []
    for (const line of s.split('\n').slice(1)) {
        const m = line.match(/^\s*\|\s*'([a-z-]+)'/)
        if (!m) break
        out.push(m[1])
    }
    return out
}
const webCats = cats(source.slice(source.indexOf('export type ProductCategory')))
const myCats = cats(mine.slice(mine.indexOf('export type ProductCategory')))
assert.ok(webCats.length > 3, 'could not read the category union — this check is not testing anything')
assert.deepEqual(
    myCats,
    webCats,
    'the inlined ProductCategory union no longer matches lib/category-prompts/types.ts',
)

console.log(`create-parity: ok (3 files verbatim, capabilities + ${webCats.length} categories)`)
