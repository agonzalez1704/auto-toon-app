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
  mainProductId: null,
  makeupRef: null,
  hairstyleRef: null,
  stylePreset: 'editorial-vogue',
  backgroundPreset: 'studio-white',
  promptModifier: '',
  heroPhase: 'idle' as GenerationPhase,
  heroImageUrl: null,
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
  setHeroGenerating: () => set({ heroPhase: 'generating', heroError: null }),
  setHeroResult: (imageUrl) => set({ heroPhase: 'complete', heroImageUrl: imageUrl }),
  setHeroError: (error) => set({ heroPhase: 'error', heroError: error }),
  resetHero: () => set({ heroPhase: 'idle', heroImageUrl: null, heroError: null }),

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
