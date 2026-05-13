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

  // Editorial warm-slate scale — neutral, lets content provide the color
  bg: '#0B0F14',         // app deep bg — near-black warm slate
  bgRaised: '#131820',   // raised surface (cards, stat blocks)
  bgElevated: '#1B222D', // modal / sheet
  bgSubtle: '#0E141B',
  bgOverlay: '#252D3B',  // pressed / hover states

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
  bg: palette.bg,             // #0B0F14 — near-black warm slate
  bgRaised: palette.bgRaised, // #131820
  bgElevated: palette.bgElevated, // #1B222D
  bgOverlay: '#252D3B',
  bgDeep: '#070A0F',
  surface: 'rgba(255,255,255,0.04)',
  surfaceRaised: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',

  text: '#F8FAFC',
  textMuted: 'rgba(248,250,252,0.72)', // body copy — bumped from 0.55 for readability
  textDim: 'rgba(248,250,252,0.48)', // labels, metadata
  textDisabled: 'rgba(248,250,252,0.28)',

  // Primary accent (amber — primary CTAs, conversion accent, matches login pitch card)
  accent: '#FBBF24',
  accentHot: '#F59E0B',
  accentSoft: 'rgba(251,191,36,0.14)',
  accentBorder: 'rgba(251,191,36,0.32)',

  // Secondary accent (violet — brand mark, signature gradient, secondary actions)
  accent2: palette.violetLight, // #A78BFA — lighter so it reads against dark slate
  accent2Soft: 'rgba(167,139,250,0.14)',
  accent2Border: 'rgba(167,139,250,0.32)',

  // Tertiary / informational
  info: '#22D3EE',
  infoSoft: 'rgba(34,211,238,0.12)',

  success: '#34D399',
  warning: '#FBBF24',
  danger: '#FB7185',
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
  // Bento card scrims — neutral dark gradient so user's photo provides color
  fashion: ['rgba(11,15,20,0.45)', 'rgba(11,15,20,0.95)'] as const,
  relight: ['rgba(11,15,20,0.45)', 'rgba(11,15,20,0.95)'] as const,
  enhance: ['rgba(11,15,20,0.45)', 'rgba(11,15,20,0.95)'] as const,
  restore: ['rgba(11,15,20,0.45)', 'rgba(11,15,20,0.95)'] as const,
  // Ambient page gradient — kept for back-compat but new screens use flat bg
  pageVignette: ['#0B0F14', '#0B0F14', '#0B0F14'] as const,
  // Amber CTA gradient (primary action — matches login pay-per-use card)
  amberCta: ['#FBBF24', '#F59E0B'] as const,
  amberCtaSoft: ['rgba(251,191,36,0.95)', 'rgba(245,158,11,0.95)'] as const,
  // Subtle halo behind hero card only
  amberHalo: ['rgba(251,191,36,0.18)', 'rgba(251,191,36,0)'] as const,
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
    ios: { shadowColor: '#FBBF24', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18 },
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
