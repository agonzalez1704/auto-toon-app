/**
 * Self-check for navigation. Run with:
 *   npx tsx app/routes.check.ts
 *
 * `router.push('/whatever')` takes a string. Delete the screen and nothing
 * complains — the button still renders, and the failure only shows up when a
 * user taps it. On the web the same mistake at least leaves a URL you can
 * reach; on a phone the menu is the only door there is.
 *
 * This ran because `/relight` and `/restore` were folded into Crear as panels
 * and their screens deleted. Three places still pointed at them: the More tab,
 * the dashboard tiles, and a pill inside the image viewer.
 *
 * It lives in `scripts/`, not `app/`: Expo Router treats every file under
 * `app/` as a route and Metro bundles it, so a Node script there fails the
 * whole app with "node:assert could not be found". Which is exactly what it
 * did before this moved.
 */
import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const files = execFileSync('git', ['ls-files', 'app', 'views', 'components'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => (f.endsWith('.tsx') || f.endsWith('.ts')) && !f.includes('.check.'))
    // The index can list a file the working tree has already deleted — a
    // normal state mid-change, and no reason for the check to crash.
    .filter((f) => existsSync(f))

/**
 * `lib/create/capabilities.ts` is a verbatim copy of the web app's — its
 * `href` fields are web routes and mobile never reads them, it reads `panel`.
 * Editing it here would break `create-parity.check.ts`, which is the point of
 * that copy.
 */
const routes = new Set<string>()
for (const file of files) {
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(/(?:route|pathname):\s*'(\/[a-z0-9/()\[\]._-]*)'/gi)) {
        routes.add(m[1])
    }
}

/** Expo Router: a route is a file under app/, with groups like `(tabs)` optional. */
function resolves(route: string): boolean {
    const clean = route.replace(/^\//, '')
    if (!clean) return existsSync('app/index.tsx')
    const candidates = [
        `app/${clean}.tsx`,
        `app/${clean}/index.tsx`,
        // `/create` may live at `app/(tabs)/create.tsx`
        `app/(tabs)/${clean}.tsx`,
        `app/${clean.replace(/^\(tabs\)\//, '(tabs)/')}.tsx`,
    ]
    return candidates.some((c) => existsSync(c))
}

const dead = [...routes].filter((r) => !resolves(r))
assert.deepEqual(
    dead,
    [],
    `these routes are referenced but no screen exists — the button renders and the tap goes nowhere:\n  ${dead.join('\n  ')}`,
)

assert.ok(routes.size > 4, `found only ${routes.size} routes — this check is not testing anything`)

// The two folded screens must stay gone, and their capability must stay
// reachable: deleting a screen without the panel would remove the feature.
for (const gone of ['app/relight.tsx', 'app/restore.tsx']) {
    assert.ok(!existsSync(gone), `${gone} is back — Crear already hosts it as a panel`)
}
for (const panel of ['views/create/panels/relight-panel.tsx', 'views/create/panels/restore-panel.tsx']) {
    assert.ok(existsSync(panel), `${panel} is missing, so that capability is gone from the app entirely`)
}
const screen = readFileSync('views/create/create-screen.tsx', 'utf8')
for (const name of ['RelightPanel', 'RestorePanel']) {
    assert.ok(screen.includes(`<${name}`) || screen.includes(name), `create-screen does not mount ${name}`)
}

console.log(`routes: ok (${routes.size} referenced, all resolve)`)
