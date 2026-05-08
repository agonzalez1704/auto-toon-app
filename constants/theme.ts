/**
 * Auto Toon — Mobile Design Tokens
 * Single source of truth. Mirrors web brand book.
 * Import via:  import { theme } from '@/constants/theme'
 */

// ── Brand palette ──────────────────────────────────────────────────────
// Primary:   violet  (brand identity, primary CTA)
// Secondary: fuchsia (analogous accent — bridges violet→pink, glass-friendly)
// Tertiary:  emerald (functional/success only)
export const palette = {
  // Primary
  violet: '#7C3AED',
  violetLight: '#A78BFA',
  violetSoft: '#8B5CF6',
  violetDeep: '#5B21B6',

  // Secondary (NEW — fuchsia, 23° hue distance from violet)
  fuchsia: '#D946EF',
  fuchsiaLight: '#E879F9',
  fuchsiaDeep: '#A21CAF',

  // Supporting
  indigo: '#6366F1',
  cyan: '#06B6D4',
  cyanLight: '#22D3EE',
  emerald: '#10B981',
  amber: '#F59E0B',

  // Violet-shifted slate scale (replaces pure navy blue)
  bg: '#16102A', // app deep bg — slate w/ violet hue
  bgRaised: '#1E1740', // raised surface
  bgElevated: '#28204D', // modal / sheet
  bgSubtle: '#1A1330',

  slate900: '#0F172A',
  slate800: '#193153', // legacy navy — DO NOT use for new screens
  slate700: '#1E2D4A',
  slate600: '#334155',

  ghost: '#F8FAFC',
  white: '#FFFFFF',
  black: '#000000',
} as const

// ── Semantic colors (dark mode primary) ───────────────────────────────
export const colors = {
  bg: palette.bg,           // #16102A — violet-tinted slate (was #193153 navy)
  bgRaised: palette.bgRaised,
  bgElevated: palette.bgElevated,
  bgDeep: '#0E0820',
  surface: 'rgba(255,255,255,0.05)',
  surfaceRaised: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.18)',

  text: palette.white,
  textMuted: 'rgba(255,255,255,0.72)',
  textDim: 'rgba(255,255,255,0.55)',
  textDisabled: 'rgba(255,255,255,0.35)',

  // Primary accent (violet — primary CTAs, brand chrome)
  accent: palette.violet,
  accentSoft: 'rgba(124,58,237,0.20)',
  accentBorder: 'rgba(124,58,237,0.40)',

  // Secondary accent (fuchsia — secondary actions, highlights, badges)
  accent2: palette.fuchsia,
  accent2Soft: 'rgba(217,70,239,0.20)',
  accent2Border: 'rgba(217,70,239,0.40)',

  success: palette.emerald,
  warning: palette.amber,
  danger: '#EF4444',
} as const

// ── Brand gradients (tight hue ramps for natural liquid-glass feel) ──
// Rule: keep hue distance ≤45° for organic look.
export const gradients = {
  // Primary brand — violet → fuchsia (23° hue, signature gradient)
  brand: [palette.violet, palette.fuchsia] as const,
  brandSoft: ['rgba(124,58,237,0.92)', 'rgba(217,70,239,0.82)'] as const,
  // Wider brand ramp for hero / splash
  brandWide: [palette.violetDeep, palette.violet, palette.fuchsia] as const,
  // Mono violet ramp
  violet: [palette.violet, palette.violetSoft] as const,
  violetDeep: [palette.violetDeep, palette.violet] as const,
  // Mono fuchsia ramp
  fuchsia: [palette.fuchsia, palette.fuchsiaLight] as const,
  // Bento card variants — each stays within close hue family
  fashion: ['rgba(217,70,239,0.88)', 'rgba(124,58,237,0.78)'] as const,
  relight: ['rgba(99,102,241,0.88)', 'rgba(124,58,237,0.78)'] as const,
  enhance: ['rgba(124,58,237,0.88)', 'rgba(217,70,239,0.78)'] as const,
  restore: ['rgba(91,33,182,0.88)', 'rgba(99,102,241,0.78)'] as const,
  // Ambient page gradient
  pageVignette: ['#16102A', '#1E1740', '#16102A'] as const,
} as const

// ── 8pt spacing scale ─────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const

// ── Border radius scale ───────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const

// ── Typography (mobile-design skill compliant) ────────────────────────
export const typography = {
  // Page title — large
  pageTitle: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  // Section header
  sectionTitle: { fontSize: 20, fontWeight: '700' as const },
  sectionLabel: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
  // Body
  bodyLg: { fontSize: 16, fontWeight: '400' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySm: { fontSize: 13, fontWeight: '400' as const },
  // Labels
  label: { fontSize: 14, fontWeight: '600' as const },
  labelSm: { fontSize: 12, fontWeight: '600' as const },
  // CTAs
  ctaLg: { fontSize: 17, fontWeight: '600' as const },
  cta: { fontSize: 15, fontWeight: '600' as const },
  ctaSm: { fontSize: 13, fontWeight: '600' as const },
  // Caption / tertiary
  caption: { fontSize: 12, fontWeight: '500' as const },
  // Badge
  badge: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
} as const

// ── Liquid-glass tokens ───────────────────────────────────────────────
// Layered translucency + highlight border = glass. Pair with <BlurView>
// (intensity per tier) for true frosted effect, or use as standalone
// overlay on dark backgrounds for visual approximation.
export const glass = {
  // Tint fills — paired with BlurView. Low values when blur is real;
  // bumped fallback if BlurView is missing (handled in GlassCard).
  tintLow: 'rgba(255,255,255,0.04)',
  tint: 'rgba(255,255,255,0.07)',
  tintHigh: 'rgba(255,255,255,0.12)',
  tintViolet: 'rgba(124,58,237,0.22)',
  tintCyan: 'rgba(6,182,212,0.16)',

  // Fallback fills (when expo-blur not installed)
  // Translucent enough to feel glass-y over violet bg, opaque enough to read.
  fallback: 'rgba(40,32,77,0.55)',
  fallbackViolet: 'rgba(91,33,182,0.55)',

  // Highlight borders — top edge bright, bottom subtle (natural specular)
  borderTop: 'rgba(255,255,255,0.18)',
  border: 'rgba(255,255,255,0.10)',
  borderSubtle: 'rgba(255,255,255,0.06)',

  // BlurView intensity (lowered for natural look — Apple ~20-30 typical)
  blur: {
    sm: 18,
    md: 26,
    lg: 36,
    xl: 50,
  },
} as const

// ── Tap target ────────────────────────────────────────────────────────
export const minTap = 44

// ── Hit slop helper ───────────────────────────────────────────────────
export const hitSlop = (n: number = 8) => ({
  top: n,
  bottom: n,
  left: n,
  right: n,
})

// ── Shadow presets ────────────────────────────────────────────────────
import { Platform } from 'react-native'

export const shadow = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 6 },
    android: { elevation: 3 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 12 },
    android: { elevation: 6 },
    default: {},
  }),
  brand: Platform.select({
    ios: { shadowColor: palette.violet, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16 },
    android: { elevation: 8 },
    default: {},
  }),
} as const

// ── Aggregate ─────────────────────────────────────────────────────────
export const theme = {
  palette,
  colors,
  gradients,
  glass,
  spacing,
  radius,
  typography,
  shadow,
  minTap,
  hitSlop,
} as const

export type Theme = typeof theme
