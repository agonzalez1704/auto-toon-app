/**
 * Self-check for the app's typeface. Run with:
 *   npx tsx components/text.check.ts
 *
 * React Native has no cascade. A screen that imports `Text` from
 * `react-native` renders in the system font, looks completely fine, and is
 * invisible in review — until the app reads like two apps stitched together.
 * That is exactly how this repo shipped with no typeface at all: `expo-font`
 * loaded SpaceMono and one file used it.
 *
 * So the rule is mechanical and checked: nothing imports Text or TextInput
 * from `react-native` except the wrapper that defines them.
 */
import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const OWNER = 'components/text.tsx'

const files = execFileSync('git', ['ls-files', 'app', 'views', 'components'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    .filter((f) => f && f !== OWNER)

const offences: string[] = []
for (const file of files) {
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'react-native'/g)) {
        // `Text as Something` is still the bare one — aliasing was how
        // Themed.tsx slipped past the first pass of this migration.
        const names = m[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0].trim())
        for (const bad of ['Text', 'TextInput']) {
            if (names.includes(bad)) offences.push(`${file}: imports ${bad} from react-native`)
        }
    }
}

assert.deepEqual(
    offences,
    [],
    `these render in the system font instead of the app's typeface:\n  ${offences.join('\n  ')}\n` +
        `Import { Text, TextInput } from '@/components/text' instead.`,
)

// Worthless if the wrapper stopped applying anything — prove it still names a
// family, and that the app still loads those families.
const wrapper = readFileSync(OWNER, 'utf8')
assert.ok(/fontFamily:\s*familyFor/.test(wrapper), `${OWNER} no longer sets a fontFamily`)
const layout = readFileSync('app/_layout.tsx', 'utf8')
for (const weight of ['400Regular', '500Medium', '600SemiBold', '700Bold']) {
    assert.ok(
        layout.includes(`InstrumentSans_${weight}`),
        `app/_layout.tsx does not load InstrumentSans_${weight}, so text asking for it falls back silently`,
    )
}

console.log(`text: ok (${files.length} files scanned, 4 weights loaded)`)
