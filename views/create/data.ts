/**
 * Data layer — model registry, aspect ratios, goal definitions.
 * Open/closed: extend by editing arrays.
 */
import type { GoalId, ImageModelId } from '@/stores/use-product-enhancer-store'
import type { ComponentType } from 'react'
import {
  CameraGoalIcon,
  FoodIcon,
  InstagramIcon,
  PaletteIcon,
  PosterIcon,
  SparkleGoalIcon,
} from './icons'

export const VISIBLE_MODELS: { id: ImageModelId; label: string }[] = [
  { id: 'GEMINI_3_IMAGE', label: 'Pro' },
  { id: 'GEMINI_3_1_FLASH_IMAGE', label: 'V2' },
  { id: 'IDEOGRAM_V3_TURBO', label: 'Ideogram' },
  { id: 'MIDJOURNEY_V7', label: 'MJ V7' },
]

export const ASPECT_RATIOS = [
  { value: '3:4', w: 12, h: 16 },
  { value: '1:1', w: 12, h: 12 },
  { value: '9:16', w: 9, h: 16 },
  { value: '2:3', w: 10, h: 14 },
  { value: '3:2', w: 14, h: 10 },
  { value: '16:9', w: 16, h: 9 },
] as const

export interface GoalDef {
  id: GoalId
  label: string
  description: string
  preview: string
}

export const GOALS: GoalDef[] = [
  { id: 'instagram-feed', label: 'Instagram Feed', description: '3x3 grid for carousels', preview: 'instagram_feed.png' },
  { id: 'product-advantages', label: 'Product Advantages', description: 'Highlight key features', preview: 'product_advantages.png' },
  { id: 'elements', label: 'Creative Elements', description: 'Artistic product composition', preview: 'elements-image.png' },
  { id: 'printable-poster', label: 'Printable Poster', description: 'Print-ready poster design', preview: 'poster.png' },
  { id: 'food-photography', label: 'Food Photography', description: 'Appetizing food shots', preview: 'food_photography.png' },
  { id: 'professional-photo', label: 'Professional Photo', description: 'Clean product shot', preview: 'pro-photo.png' },
]

export const GOAL_ICONS: Record<GoalId, ComponentType> = {
  'instagram-feed': InstagramIcon,
  'product-advantages': SparkleGoalIcon,
  elements: PaletteIcon,
  'printable-poster': PosterIcon,
  'food-photography': FoodIcon,
  'professional-photo': CameraGoalIcon,
}

export function getResultLabel(goalId: GoalId | null | undefined): string {
  if (goalId === 'instagram-feed') return '3x3 Grid'
  if (goalId === 'elements') return 'Elements'
  if (goalId === 'printable-poster') return 'Poster'
  return 'Styled Image'
}
