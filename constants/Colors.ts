/** Brand purple from the web app's at-violet color */
const brand = '#8B5CF6'
const brandLight = '#A78BFA'

export default {
  brand,
  brandLight,
  light: {
    text: '#0f172a',
    textSecondary: '#64748b',
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceBorder: '#e2e8f0',
    tint: brand,
    tabIconDefault: '#94a3b8',
    tabIconSelected: brand,
    error: '#ef4444',
    success: '#22c55e',
  },
  dark: {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    background: '#0f172a',
    surface: '#1e293b',
    surfaceBorder: '#334155',
    tint: brandLight,
    tabIconDefault: '#64748b',
    tabIconSelected: brandLight,
    error: '#f87171',
    success: '#4ade80',
  },
} as const

export type ThemeColors = (typeof import('./Colors'))['default']['light']
