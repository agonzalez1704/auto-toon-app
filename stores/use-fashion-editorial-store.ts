import type { FashionImageAnalysis } from '@/lib/api'
import { create } from 'zustand'

// ─── Types ──────────────────────────────────────────────────────────

export type ItemPhase = 'idle' | 'uploading' | 'analyzing' | 'ready' | 'error'

export interface ClothingItem {
  id: string
  localUri: string
  uploadedUrl: string | null
  analysis: FashionImageAnalysis | null
  phase: ItemPhase
  error?: string
}

export interface ShoeItem {
  id: string
  localUri: string
  uploadedUrl: string | null
  shoeName: string | null
  shoeType: string | null
  shoeAnalysis: string | null
  phase: ItemPhase
  error?: string
}

export interface MakeupRef {
  localUri: string
  analysis: string | null
  mode: 'face' | 'product' | null
  phase: ItemPhase
  error?: string
}

export interface HairstyleRef {
  localUri: string
  styleAnalysis: string | null
  colorAnalysis: string | null
  mode: 'face' | 'product' | null
  phase: ItemPhase
  error?: string
}

export type GenerationPhase = 'idle' | 'generating' | 'complete' | 'error'

// ─── Style Presets (with preview images) ────────────────────────────

export interface PresetOption {
  id: string
  label: string
  preview: number // bundled asset module id from require()
}

export const STYLE_PRESETS: PresetOption[] = [
  { id: 'ugc-selfie', label: 'UGC Selfie', preview: require('@/assets/images/previews/style-ugc-selfie.png') },
  { id: 'influencer-lifestyle', label: 'Lifestyle', preview: require('@/assets/images/previews/style-lifestyle.jpg') },
  { id: 'editorial-vogue', label: 'Editorial', preview: require('@/assets/images/previews/style-editorial.jpg') },
  { id: 'ecommerce', label: 'E-commerce', preview: require('@/assets/images/previews/style-ecommerce.jpg') },
  { id: 'lookbook', label: 'Lookbook', preview: require('@/assets/images/previews/style-lookbook.jpg') },
  { id: 'street-style', label: 'Street Style', preview: require('@/assets/images/previews/style-street.jpg') },
  { id: 'minimalist-clean', label: 'Minimalist', preview: require('@/assets/images/previews/style-minimalist.jpg') },
]

export const BACKGROUND_PRESETS: PresetOption[] = [
  { id: 'studio-white', label: 'Studio White', preview: require('@/assets/images/previews/bg-studio-white.jpg') },
  { id: 'studio-gray', label: 'Studio Gray', preview: require('@/assets/images/previews/bg-studio-gray.jpg') },
  { id: 'coffee-shop', label: 'Coffee Shop', preview: require('@/assets/images/previews/bg-coffee-shop.jpg') },
  { id: 'urban-street', label: 'Urban Street', preview: require('@/assets/images/previews/bg-urban-street.jpg') },
  { id: 'beach-sunset', label: 'Beach', preview: require('@/assets/images/previews/bg-beach.jpg') },
  { id: 'park', label: 'Park', preview: require('@/assets/images/previews/bg-park.jpg') },
  { id: 'bedroom-morning', label: 'Bedroom', preview: require('@/assets/images/previews/bg-bedroom.jpg') },
]

// Presets with prompt fragments (for shot type, surface, lighting — sent to /preview-modifier)
export interface PromptPreset {
  id: string
  label: string
  description: string
  prompt: string
}

export const SHOT_TYPE_PRESETS: PromptPreset[] = [
  { id: 'foot-hero', label: 'Foot Hero', description: 'Close-up of feet, dramatic', prompt: 'Eye-level close-up shot framed on the subject\'s feet and lower legs (knees down), shoes are the unmistakable hero. Tight framing crops out the upper body. Background simple to push focus to the footwear; razor-sharp focus on the upper, vamp, and toe of the shoe; gentle falloff into shallow depth-of-field.' },
  { id: 'walking', label: 'Walking', description: 'Mid-stride lower body', prompt: 'Full lower-body shot mid-stride, captured at hip height, subject walking confidently toward or across the frame. One foot lifted, sole visible. Slight motion blur on hem and trailing leg, pin-sharp on the leading shoe. Editorial walking-shot energy.' },
  { id: 'seated-crossed', label: 'Seated / Crossed', description: 'Legs crossed, sole + side', prompt: 'Subject seated with legs crossed, three-quarter view of the lower body. The crossed leg displays the side profile of one shoe and the sole of the other simultaneously, both fully readable.' },
  { id: 'detail-macro', label: 'Detail Macro', description: 'Macro of buckle / sole / stitch', prompt: 'Extreme macro close-up of a single high-craft detail of the footwear — buckle, hardware, stitching line, sole edge, or heel cap. Frame fills with material texture; razor-thin depth-of-field with the focal detail tack-sharp.' },
  { id: 'top-down-flat', label: 'Top-Down Flat', description: 'Overhead flat-lay', prompt: 'Direct top-down overhead view, camera perpendicular to the surface. Shoe(s) staged as a flat-lay composition, soft asymmetry, intentional negative space.' },
  { id: 'lifestyle-cu', label: 'Lifestyle CU', description: 'Mid-shot in environment', prompt: 'Mid-shot in a lifestyle environment that frames the footwear without overpowering it. Subject is engaged in a believable everyday moment — pausing on a curb, stepping out of a car. The shoes are the photographic anchor.' },
]

export const SURFACE_PRESETS: PromptPreset[] = [
  { id: 'marble-polished', label: 'Polished Marble', description: 'Cool veined marble', prompt: 'Polished cool-toned marble surface with subtle grey veining; surface returns a soft, low-amplitude reflection; clean, premium, editorial.' },
  { id: 'wet-concrete', label: 'Wet Concrete', description: 'Rain-slicked pavement', prompt: 'Rain-slicked dark concrete pavement with sharp specular highlights along edges; thin water layer mirrors the subject and ambient lights; cinematic urban editorial.' },
  { id: 'sand-soft', label: 'Soft Sand', description: 'Golden sand', prompt: 'Soft golden-beige sand with shallow rake marks and fine grain texture; subtle imprints; warm late-afternoon light grazing the surface.' },
  { id: 'mirror', label: 'Mirror Floor', description: 'Reflective mirror', prompt: 'Pristine mirror floor reflecting the subject one-to-one with a slight haze; high-fashion conceptual.' },
  { id: 'autumn-leaves', label: 'Autumn Leaves', description: 'Dry leaves carpet', prompt: 'Carpet of dry autumn leaves in russet, ochre, and burnt-sienna tones; varied scale and overlap; warm directional sunlight raking across the surface.' },
  { id: 'shallow-water', label: 'Shallow Water', description: '1-2cm clear water', prompt: 'Shallow clear water 1–2cm deep over a smooth dark surface; ripples; specular caustics dancing on the upper of the shoe.' },
  { id: 'silk-drape', label: 'Silk Drape', description: 'Folded silk fabric', prompt: 'Soft draped silk fabric in a single tonal color forming the floor; gentle folds create directional highlight and shadow; couture editorial mood.' },
  { id: 'studio-sweep', label: 'Studio Sweep', description: 'Seamless backdrop', prompt: 'Seamless studio sweep, neutral mid-tone, wall and floor merge in a perfect curve; clean controlled studio lighting.' },
  { id: 'hardwood', label: 'Hardwood Plank', description: 'Aged oak grain', prompt: 'Aged oak hardwood planks with directional grain pattern; warm umber tones; soft window light grazing along the grain.' },
  { id: 'cobblestone', label: 'Cobblestone', description: 'European stones', prompt: 'Weathered European cobblestone street, irregular stone shapes, mossy seams, slightly damp; warm streetlamp ambient color.' },
]

export const LIGHTING_PRESETS: PromptPreset[] = [
  { id: 'soft-silver-portrait', label: 'Soft Silver Portrait', description: 'Cool soft key, beauty', prompt: 'Soft, cool-toned key light wrapping gently around the subject with a low-power silver fill on the shadow side. Smooth highlight rolloff, no hard shadows. Beauty-portrait style, refined and clean.' },
  { id: 'warm-directional', label: 'Warm Directional', description: 'Amber side key', prompt: 'Warm amber-tinted directional key light from camera-left at 45°. Deep negative fill on camera-right side creating defined shadow shape. Skin reads warm and luminous; mood is intimate and golden.' },
  { id: 'backlight-halo', label: 'Backlight Halo', description: 'Rim light, dark BG', prompt: 'Strong rim/back light positioned behind subject creating a luminous halo around hair and shoulders. Background is dark and unlit; subject reads in silhouette with bright edge detail. Cinematic.' },
  { id: 'noir-monochrome', label: 'Noir Monochrome', description: 'B&W hard shadow', prompt: 'High-contrast black-and-white photography. Hard key light from camera-left creates sharp directional shadow with strong falloff. Deep blacks, film-noir editorial mood.' },
  { id: 'orange-blue-split', label: 'Orange/Blue Split', description: 'Teal-orange split', prompt: 'Two-tone lighting: warm orange/amber key from one side and cool teal/blue fill from the opposite side. Cinematic teal-and-orange grade.' },
  { id: 'pastel-mint-peach', label: 'Pastel Mint & Peach', description: 'Dreamy duotone', prompt: 'Soft, low-contrast pastel duotone lighting in mint-green and peach. Even diffuse light overall. Dreamy, romantic editorial mood with milky highlights.' },
  { id: 'silver-moonlight', label: 'Silver Moonlight', description: 'Cool silver-blue', prompt: 'Low-key cool silver-blue ambient light, as if the only source were full moonlight. Subdued exposure, gentle modeling, no warm tones. Quiet, nocturnal mood.' },
  { id: 'molten-side-light', label: 'Molten Side Light', description: 'Hot grazing light', prompt: 'Intense, near-orange grazing light from camera-left raking across the subject. Hot specular highlights on skin and fabric edges, deep dramatic shadow falloff into black.' },
  { id: 'golden-hour', label: 'Golden Hour', description: 'Sunset, long shadows', prompt: 'Warm sunset-quality directional light, low angle, long soft shadows, golden tone throughout. Lifestyle editorial mood.' },
  { id: 'studio-bright', label: 'Studio Bright', description: 'High-key clean', prompt: 'High-key clean studio lighting. Large soft sources, near-shadowless, bright and crisp. Commercial product look.' },
]

export const POSE_PRESETS: PresetOption[] = [
  { id: 'selfie-mirror', label: 'Selfie', preview: require('@/assets/images/previews/pose-selfie-mirror.png') },
  { id: 'story-casual', label: 'Casual', preview: require('@/assets/images/previews/pose-story-casual.png') },
  { id: 'lifestyle', label: 'Lifestyle', preview: require('@/assets/images/previews/pose-lifestyle.jpg') },
  { id: 'editorial', label: 'Editorial', preview: require('@/assets/images/previews/pose-editorial.png') },
  { id: 'product-focus', label: 'Product Focus', preview: require('@/assets/images/previews/pose-product-focus.png') },
  { id: 'walking', label: 'Walking', preview: require('@/assets/images/previews/pose-walking.jpg') },
  { id: 'dynamic', label: 'Dynamic', preview: require('@/assets/images/previews/pose-dynamic.jpg') },
  { id: 'static', label: 'Static', preview: require('@/assets/images/previews/pose-static.jpg') },
]

// ─── Store ──────────────────────────────────────────────────────────

interface FashionEditorialState {
  // Model selection
  selectedModelId: string | null
  selectedModelImageUrl: string | null

  // Clothing items (unlimited)
  clothingItems: ClothingItem[]

  // Shoe items (footwear pack, unlimited)
  shoeItems: ShoeItem[]

  // Modifier nodes (footwear pack Phase 1)
  shotType: string | null
  customShot: string
  surface: string | null
  customSurface: string
  lighting: string | null
  customLighting: string

  // Makeup reference (optional, max 1)
  makeupRef: MakeupRef | null

  // Hairstyle reference (optional, max 1)
  hairstyleRef: HairstyleRef | null

  // Configuration
  stylePreset: string
  backgroundPreset: string
  promptModifier: string

  // Hero generation
  heroPhase: GenerationPhase
  heroImageUrl: string | null
  heroError: string | null
  heroStreamingPartial: boolean

  // Main product (for UGC showcase)
  mainProductId: string | null

  // Campaign variations
  poseStyle: string
  variationsPhase: GenerationPhase
  variationUrls: string[]
  variationsError: string | null

  // Multi-angle camera grid
  multiAngleSourceUrl: string | null
  multiAnglePhase: GenerationPhase
  multiAngleGridUrl: string | null
  multiAngleUrls: string[]
  multiAngleError: string | null

  // Product showcase (UGC)
  showcasePhase: GenerationPhase
  showcaseUrls: string[]
  showcaseError: string | null

  // Upscale
  upscalePhase: GenerationPhase
  upscaleProgress: string
  upscaledUrls: string[]
  upscaleError: string | null

  // Actions — Model
  selectModel: (id: string, imageUrl: string) => void
  clearModel: () => void

  // Actions — Main Product
  setMainProduct: (id: string | null) => void

  // Actions — Clothing
  addClothingItem: (localUri: string) => ClothingItem
  updateClothingItem: (id: string, updates: Partial<ClothingItem>) => void
  removeClothingItem: (id: string) => void

  // Actions — Shoe
  addShoeItem: (localUri: string) => ShoeItem
  updateShoeItem: (id: string, updates: Partial<ShoeItem>) => void
  removeShoeItem: (id: string) => void

  // Actions — Modifiers
  setShotType: (v: string | null) => void
  setCustomShot: (v: string) => void
  setSurface: (v: string | null) => void
  setCustomSurface: (v: string) => void
  setLighting: (v: string | null) => void
  setCustomLighting: (v: string) => void

  // Actions — Makeup
  setMakeupRef: (ref: MakeupRef | null) => void
  updateMakeupRef: (updates: Partial<MakeupRef>) => void

  // Actions — Hairstyle
  setHairstyleRef: (ref: HairstyleRef | null) => void
  updateHairstyleRef: (updates: Partial<HairstyleRef>) => void

  // Actions — Config
  setStylePreset: (v: string) => void
  setBackgroundPreset: (v: string) => void
  setPromptModifier: (v: string) => void

  // Actions — Hero
  setHeroGenerating: () => void
  setHeroResult: (imageUrl: string) => void
  setHeroPartial: (imageUrl: string) => void
  setHeroError: (error: string) => void
  resetHero: () => void

  // Actions — Campaign
  setPoseStyle: (v: string) => void
  setVariationsGenerating: () => void
  setVariationsResult: (urls: string[]) => void
  setVariationsError: (error: string) => void

  // Actions — Multi-Angle
  setMultiAngleSource: (url: string) => void
  setMultiAngleGenerating: () => void
  setMultiAngleResult: (gridUrl: string, urls: string[]) => void
  setMultiAngleError: (error: string) => void
  resetMultiAngle: () => void

  // Actions — Showcase
  setShowcaseGenerating: () => void
  setShowcaseResult: (urls: string[]) => void
  setShowcaseError: (error: string) => void
  resetShowcase: () => void

  // Actions — Upscale
  setUpscaleGenerating: () => void
  setUpscaleProgress: (msg: string) => void
  addUpscaledUrl: (url: string) => void
  setUpscaleComplete: () => void
  setUpscaleError: (error: string) => void
  resetUpscale: () => void

  // Guards
  canGenerateHero: () => boolean
  canGenerateVariations: () => boolean
  canShowcaseProduct: () => boolean

  // Reset
  reset: () => void
}

const INITIAL_STATE = {
  selectedModelId: null,
  selectedModelImageUrl: null,
  clothingItems: [],
  shoeItems: [] as ShoeItem[],
  shotType: null as string | null,
  customShot: '',
  surface: null as string | null,
  customSurface: '',
  lighting: null as string | null,
  customLighting: '',
  mainProductId: null,
  makeupRef: null,
  hairstyleRef: null,
  stylePreset: 'editorial-vogue',
  backgroundPreset: 'studio-white',
  promptModifier: '',
  heroPhase: 'idle' as GenerationPhase,
  heroImageUrl: null,
  heroStreamingPartial: false,
  heroError: null,
  poseStyle: 'editorial',
  variationsPhase: 'idle' as GenerationPhase,
  variationUrls: [],
  variationsError: null,
  multiAngleSourceUrl: null,
  multiAnglePhase: 'idle' as GenerationPhase,
  multiAngleGridUrl: null,
  multiAngleUrls: [] as string[],
  multiAngleError: null,
  showcasePhase: 'idle' as GenerationPhase,
  showcaseUrls: [] as string[],
  showcaseError: null,
  upscalePhase: 'idle' as GenerationPhase,
  upscaleProgress: '',
  upscaledUrls: [] as string[],
  upscaleError: null,
}

export const useFashionEditorialStore = create<FashionEditorialState>()((set, get) => ({
  ...INITIAL_STATE,

  // Model
  selectModel: (id, imageUrl) => set({ selectedModelId: id, selectedModelImageUrl: imageUrl }),
  clearModel: () => set({ selectedModelId: null, selectedModelImageUrl: null }),

  // Main Product
  setMainProduct: (id) => set({ mainProductId: id }),

  // Clothing
  addClothingItem: (localUri) => {
    const item: ClothingItem = {
      id: Date.now().toString(),
      localUri,
      uploadedUrl: null,
      analysis: null,
      phase: 'idle',
    }
    set((s) => ({ clothingItems: [...s.clothingItems, item] }))
    return item
  },
  updateClothingItem: (id, updates) =>
    set((s) => ({
      clothingItems: s.clothingItems.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  removeClothingItem: (id) =>
    set((s) => ({
      clothingItems: s.clothingItems.filter((c) => c.id !== id),
      mainProductId: s.mainProductId === id ? null : s.mainProductId,
    })),

  // Shoe
  addShoeItem: (localUri) => {
    const item: ShoeItem = {
      id: Date.now().toString(),
      localUri,
      uploadedUrl: null,
      shoeName: null,
      shoeType: null,
      shoeAnalysis: null,
      phase: 'idle',
    }
    set((s) => ({ shoeItems: [...s.shoeItems, item] }))
    return item
  },
  updateShoeItem: (id, updates) =>
    set((s) => ({
      shoeItems: s.shoeItems.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  removeShoeItem: (id) => set((s) => ({ shoeItems: s.shoeItems.filter((c) => c.id !== id) })),

  // Modifiers
  setShotType: (v) => set({ shotType: v }),
  setCustomShot: (v) => set({ customShot: v }),
  setSurface: (v) => set({ surface: v }),
  setCustomSurface: (v) => set({ customSurface: v }),
  setLighting: (v) => set({ lighting: v }),
  setCustomLighting: (v) => set({ customLighting: v }),

  // Makeup
  setMakeupRef: (ref) => set({ makeupRef: ref }),
  updateMakeupRef: (updates) =>
    set((s) => ({ makeupRef: s.makeupRef ? { ...s.makeupRef, ...updates } : s.makeupRef })),

  // Hairstyle
  setHairstyleRef: (ref) => set({ hairstyleRef: ref }),
  updateHairstyleRef: (updates) =>
    set((s) => ({
      hairstyleRef: s.hairstyleRef ? { ...s.hairstyleRef, ...updates } : s.hairstyleRef,
    })),

  // Config
  setStylePreset: (v) => set({ stylePreset: v }),
  setBackgroundPreset: (v) => set({ backgroundPreset: v }),
  setPromptModifier: (v) => set({ promptModifier: v }),

  // Hero
  setHeroGenerating: () => set({ heroPhase: 'generating', heroError: null, heroStreamingPartial: false }),
  setHeroResult: (imageUrl) => set({ heroPhase: 'complete', heroImageUrl: imageUrl, heroStreamingPartial: false }),
  setHeroPartial: (imageUrl) => set({ heroPhase: 'complete', heroImageUrl: imageUrl, heroStreamingPartial: true }),
  setHeroError: (error) => set({ heroPhase: 'error', heroError: error, heroStreamingPartial: false }),
  resetHero: () => set({ heroPhase: 'idle', heroImageUrl: null, heroError: null, heroStreamingPartial: false }),

  // Campaign
  setPoseStyle: (v) => set({ poseStyle: v }),
  setVariationsGenerating: () => set({ variationsPhase: 'generating', variationsError: null }),
  setVariationsResult: (urls) => set({ variationsPhase: 'complete', variationUrls: urls }),
  setVariationsError: (error) => set({ variationsPhase: 'error', variationsError: error }),

  // Multi-Angle
  setMultiAngleSource: (url) => set({ multiAngleSourceUrl: url }),
  setMultiAngleGenerating: () => set({ multiAnglePhase: 'generating', multiAngleError: null }),
  setMultiAngleResult: (gridUrl, urls) => set({ multiAnglePhase: 'complete', multiAngleGridUrl: gridUrl, multiAngleUrls: urls }),
  setMultiAngleError: (error) => set({ multiAnglePhase: 'error', multiAngleError: error }),
  resetMultiAngle: () => set({ multiAnglePhase: 'idle', multiAngleGridUrl: null, multiAngleUrls: [], multiAngleError: null, multiAngleSourceUrl: null }),

  // Showcase
  setShowcaseGenerating: () => set({ showcasePhase: 'generating', showcaseError: null }),
  setShowcaseResult: (urls) => set({ showcasePhase: 'complete', showcaseUrls: urls }),
  setShowcaseError: (error) => set({ showcasePhase: 'error', showcaseError: error }),
  resetShowcase: () => set({ showcasePhase: 'idle', showcaseUrls: [], showcaseError: null }),

  // Upscale
  setUpscaleGenerating: () => set({ upscalePhase: 'generating', upscaleError: null, upscaledUrls: [], upscaleProgress: '' }),
  setUpscaleProgress: (msg) => set({ upscaleProgress: msg }),
  addUpscaledUrl: (url) => set((s) => ({ upscaledUrls: [...s.upscaledUrls, url] })),
  setUpscaleComplete: () => set({ upscalePhase: 'complete' }),
  setUpscaleError: (error) => set({ upscalePhase: 'error', upscaleError: error }),
  resetUpscale: () => set({ upscalePhase: 'idle', upscaleProgress: '', upscaledUrls: [], upscaleError: null }),

  // Guards
  canGenerateHero: () => {
    const s = get()
    return !!s.selectedModelId && s.clothingItems.some((c) => c.phase === 'ready')
  },
  canGenerateVariations: () => !!get().heroImageUrl,
  canShowcaseProduct: () => {
    const s = get()
    return !!s.heroImageUrl && !!s.mainProductId
  },

  // Reset
  reset: () => set(INITIAL_STATE),
}))
