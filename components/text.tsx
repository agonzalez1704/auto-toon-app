import { Text as RNText, TextInput as RNTextInput, type TextProps, type TextInputProps } from 'react-native'

/**
 * Text that carries the app's typeface.
 *
 * React Native has no cascade: setting a font on a parent does nothing, and
 * `Text.defaultProps` — the old trick for this — is gone under React 19. So the
 * only way a font reaches every screen is for every screen to render a Text
 * that already has it. That is what this is.
 *
 * `style` is applied after the font, so any caller that genuinely needs a
 * different face (a monospace token, say) still wins by passing one.
 *
 * Import this instead of `react-native`'s Text. `components/text.check.ts`
 * fails the build if anything imports the bare one, because the failure mode is
 * invisible: the screen renders fine, just in the system font, and nobody
 * notices until the app looks like two apps.
 */

export const FONT = {
    regular: 'InstrumentSans_400Regular',
    medium: 'InstrumentSans_500Medium',
    semibold: 'InstrumentSans_600SemiBold',
    bold: 'InstrumentSans_700Bold',
} as const

/**
 * RN maps `fontWeight` against the family's own weights on iOS but not
 * reliably on Android with custom fonts, so the weight is resolved to a real
 * family name here. Android otherwise renders every weight as regular.
 */
function familyFor(weight: TextProps['style'] extends never ? never : string | number | undefined) {
    const w = typeof weight === 'string' ? parseInt(weight, 10) : weight
    if (!w || Number.isNaN(w)) return FONT.regular
    if (w >= 700) return FONT.bold
    if (w >= 600) return FONT.semibold
    if (w >= 500) return FONT.medium
    return FONT.regular
}

export function Text({ style, ...rest }: TextProps) {
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style
    const weight = (flat as { fontWeight?: string | number } | undefined)?.fontWeight
    return <RNText {...rest} style={[{ fontFamily: familyFor(weight) }, style]} />
}

/**
 * The instance type, re-exported: callers hold refs as `RefObject<TextInput>`,
 * and a function component is a value, not a type. Without this the migration
 * turns every typed ref into a compile error.
 */
export type TextInput = RNTextInput

export function TextInput({ style, ...rest }: TextInputProps) {
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style
    const weight = (flat as { fontWeight?: string | number } | undefined)?.fontWeight
    return <RNTextInput {...rest} style={[{ fontFamily: familyFor(weight) }, style]} />
}
