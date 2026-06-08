/**
 * Data layer — bento cards, utility links, plan labels.
 * Open/closed: extend by editing arrays, no component edits.
 */
import { gradients, palette } from '@/constants/theme'

export interface BentoCardConfig {
  label: string
  description: string
  route: string
  preview: number // require() result — feature preview / fallback bg
  /**
   * Full-bleed background scene image. When set, fills the card and the
   * gradient becomes a bottom scrim only (image stays visible).
   */
  backgroundImage?: number
  gradient: readonly [string, string]
  /** Solid hex used for border, glow, and accent stripe. */
  accent: string
  pro?: boolean
}

export const BENTO_CARDS: BentoCardConfig[] = [
  {
    label: 'Enhance Product',
    description: 'Studio-quality AI photos in 8s',
    route: '/(tabs)/create',
    preview: require('@/assets/images/previews/pro-photo.png'),
    backgroundImage: require('@/assets/images/previews/pro-photo.png'),
    gradient: gradients.enhance,
    accent: 'rgba(251,191,36,0.55)', // amber — primary
  },
  {
    label: 'Fashion Editorial',
    description: 'AI sessions with models',
    route: '/fashion-editorial',
    preview: require('@/assets/images/previews/fashion-editorial-1.png'),
    backgroundImage: require('@/assets/images/previews/style-editorial.jpg'),
    gradient: gradients.fashion,
    accent: 'rgba(167,139,250,0.55)', // violet — brand
    pro: true,
  },
  {
    label: 'Model Factory',
    description: 'Create & save AI models',
    route: '/model-factory',
    preview: require('@/assets/images/previews/professional_photo.png'),
    backgroundImage: require('@/assets/images/previews/pose-editorial.png'),
    gradient: gradients.fashion,
    accent: 'rgba(167,139,250,0.55)', // violet
    pro: true,
  },
  {
    label: 'My Wardrobe',
    description: 'Try clothing on a model of you',
    route: '/wardrobe',
    preview: require('@/assets/images/previews/style-editorial.jpg'),
    backgroundImage: require('@/assets/images/previews/style-editorial.jpg'),
    gradient: gradients.fashion,
    accent: 'rgba(167,139,250,0.55)', // violet
    pro: true,
  },
  {
    label: 'AI Relight',
    description: 'Cinematic lighting presets',
    route: '/relight',
    preview: require('@/assets/images/previews/backlight_halo_2k.png'),
    backgroundImage: require('@/assets/images/previews/molten_side_light_2k.png'),
    gradient: gradients.relight,
    accent: 'rgba(34,211,238,0.55)', // cyan — info
  },
  {
    label: 'Image Restore',
    description: 'Upscale to 2K / 4K',
    route: '/restore',
    preview: require('@/assets/images/previews/upscale.jpg'),
    backgroundImage: require('@/assets/images/previews/upscale.jpg'),
    gradient: gradients.restore,
    accent: 'rgba(52,211,153,0.55)', // emerald — secondary
  },
]

export interface UtilityLinkConfig {
  label: string
  route: string
}

export const UTILITY_LINKS: UtilityLinkConfig[] = [
  { label: 'Assets', route: '/(tabs)/assets' },
  { label: 'API', route: '/developer' },
  { label: 'Pricing', route: '/account/pricing' },
]

export const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  WEEKLY: 'Weekly',
  BASIC: 'Starter',
  STARTER: 'Starter',
  PRO: 'Pro',
  BUSINESS: 'Business',
  PAYPERUSE: 'Pay Per Use',
}
