/**
 * Auto Toon — Mobile Design Tokens
 * Single source of truth. Mirrors web brand book.
 * Import via:  import { theme } from '@/constants/theme'
 */

// ── Brand palette ──────────────────────────────────────────────────────
// «Dos calmos, uno fuerte» (2026-11): the studio is ink and white and the photo
// sets the colour; the shop window (sign-in) is red. The lime is the action that
// stays on the screen, the pink what was charged or goes on to another screen.
// The old violet / fuchsia / cyan / amber are gone.
export const palette = {
  // The shop window's field (sign-in), as the web's landing and Acceso.
  rojo: '#E42600',

  // Editorial warm-slate scale — neutral, lets content provide the color
  bg: '#0A0A0A',         // app deep bg — the web studio's black (redesign 2026-11)
  bgRaised: '#141414',   // raised surface (cards, stat blocks)
  bgElevated: '#1A1A1A', // modal / sheet
  bgSubtle: '#0F0F0F',
  bgOverlay: '#1F1F1F',  // pressed / hover states

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
  bg: palette.bg,             // #0A0A0A
  bgRaised: palette.bgRaised, // #141414
  bgElevated: palette.bgElevated, // #1A1A1A
  bgOverlay: '#1F1F1F',
  bgDeep: '#050505',
  surface: 'rgba(255,255,255,0.04)',
  surfaceRaised: 'rgba(255,255,255,0.07)',
  border: '#262626',
  borderStrong: '#3D3D3D',

  text: '#FAFAFA',
  textMuted: '#A3A3A3', // body copy
  textDim: '#8A8A8A', // labels, metadata
  textDisabled: '#3D3D3D',

  // Primary accent (the web's green: actions that stay on the screen — «Generar»)
  accent: '#D4FF3D',
  accentHot: '#C2EE2B',
  accentSoft: 'rgba(212,255,61,0.14)',
  accentBorder: 'rgba(212,255,61,0.32)',

  // Secondary accent (the web's pink: what was charged, and actions that go on to another screen)
  accent2: '#FF3D8A',
  accent2Soft: 'rgba(255,61,138,0.14)',
  accent2Border: 'rgba(255,61,138,0.32)',

  // The shop window's red (sign-in only: the studio never shows it).
  rojo: palette.rojo,

  warning: '#D4FF3D',
  danger: '#FB7185',
} as const

// ── Brand gradients (tight hue ramps for natural liquid-glass feel) ──
// Rule: keep hue distance ≤45° for organic look.
export const gradients = {
  // The redesign is monochrome: the colour comes from the images; the one accent is the green.
  brand: ['#D4FF3D', '#B8E62E'] as const,
  brandSoft: ['rgba(212,255,61,0.92)', 'rgba(184,230,46,0.82)'] as const,
  // Wider brand ramp for hero / splash
  brandWide: ['#1A1A1A', '#0A0A0A', '#0A0A0A'] as const,
  // Bento card scrims — neutral dark gradient so user's photo provides color
  fashion: ['rgba(10,10,10,0.45)', 'rgba(10,10,10,0.95)'] as const,
  relight: ['rgba(10,10,10,0.45)', 'rgba(10,10,10,0.95)'] as const,
  enhance: ['rgba(10,10,10,0.45)', 'rgba(10,10,10,0.95)'] as const,
  restore: ['rgba(10,10,10,0.45)', 'rgba(10,10,10,0.95)'] as const,
  // Ambient page gradient — kept for back-compat but new screens use flat bg
  pageVignette: ['#0A0A0A', '#0A0A0A', '#0A0A0A'] as const,
  // Amber CTA gradient (primary action — matches login pay-per-use card)
  // The primary action's green (names kept: screens import them).
  amberCta: ['#D4FF3D', '#C2EE2B'] as const,
  amberCtaSoft: ['rgba(212,255,61,0.95)', 'rgba(194,238,43,0.95)'] as const,
  // Subtle halo behind hero card only
  amberHalo: ['rgba(212,255,61,0.16)', 'rgba(212,255,61,0)'] as const,
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

import { FONT } from '@/components/text'

// ── Typography (mobile-design skill compliant) ────────────────────────
// Every token names its own family: RN resolves custom-font weights
// unreliably on Android, where an unnamed weight renders as regular.
export const typography = {
  // Page title — large
  pageTitle: { fontFamily: FONT.bold, fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  // Section header
  sectionTitle: { fontFamily: FONT.bold, fontSize: 20, fontWeight: '700' as const },
  sectionLabel: { fontFamily: FONT.semibold, fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
  // Body
  bodyLg: { fontFamily: FONT.regular, fontSize: 16, fontWeight: '400' as const },
  body: { fontFamily: FONT.regular, fontSize: 15, fontWeight: '400' as const },
  bodySm: { fontFamily: FONT.regular, fontSize: 13, fontWeight: '400' as const },
  // Labels
  label: { fontFamily: FONT.semibold, fontSize: 14, fontWeight: '600' as const },
  labelSm: { fontFamily: FONT.semibold, fontSize: 12, fontWeight: '600' as const },
  // CTAs
  ctaLg: { fontFamily: FONT.semibold, fontSize: 17, fontWeight: '600' as const },
  cta: { fontFamily: FONT.semibold, fontSize: 15, fontWeight: '600' as const },
  ctaSm: { fontFamily: FONT.semibold, fontSize: 13, fontWeight: '600' as const },
  // Caption / tertiary
  caption: { fontFamily: FONT.medium, fontSize: 12, fontWeight: '500' as const },
  // Badge
  badge: { fontFamily: FONT.bold, fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
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

  // Fallback fills (when expo-blur not installed)
  // Translucent enough to feel glass-y over the ink, opaque enough to read.
  fallback: 'rgba(20,20,20,0.78)',
  fallbackHigh: 'rgba(40,40,40,0.78)',

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
