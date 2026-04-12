import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AnalysisResult } from '@/lib/api'
import { AI_MODELS } from '@/lib/ai-models'

export { AI_MODELS }

// ─── Types ──────────────────────────────────────────────────────────

export type GenerationMode = 'both' | 'enhance-only' | 'style-only'

export type GoalId =
  | 'instagram-feed'
  | 'product-advantages'
  | 'elements'
  | 'printable-poster'
  | 'food-photography'
  | 'professional-photo'

export type ImageModelId =
  | 'GEMINI_3_IMAGE'
  | 'GEMINI_3_1_FLASH_IMAGE'
  | 'SEEDREAM_4_5'
  | 'SEEDREAM_5_LITE'
  | 'IDEOGRAM_V3_TURBO'
  | 'IDEOGRAM_V3_DEFAULT'
  | 'IDEOGRAM_V3_QUALITY'

export interface PromptCustomizations {
  background?: string
  lighting?: string
  composition?: string
  camera?: string
  style?: string
}

export interface ElementsConfig {
  keyElements: string[]
  enhancers: string[]
}

export interface PosterConfig {
  topLabel: string
  headline: string
  tagline: string
  text: string
  primaryColor: string
  colorScheme: 'monochromatic' | 'complementary' | 'analogous' | 'custom'
  customColors: string[]
  textColor: string
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9' | '3:4'
  productStyle: 'photorealistic' | 'illustrated' | 'minimalist' | '3d-render'
  backgroundType: 'gradient' | 'solid' | 'textured' | 'abstract'
  decorativeElements: {
    halftone: boolean
    particles: boolean
    geometricShapes: boolean
    customElement: string
  }
  fontStyle: 'sans-serif' | 'serif' | 'display' | 'handwritten'
  fontWeight: 'light' | 'regular' | 'bold' | 'extra-bold'
  textAlignment: 'left' | 'center' | 'right'
  fontFamily?: string
}

export type SecondImageType = 'vignette' | 'elements' | 'poster' | '3x3' | 'food'

export interface SecondImageConfig {
  enabled: boolean
  type: SecondImageType
  elementsConfig?: ElementsConfig
  posterConfig?: PosterConfig
}

export interface SeedreamConfig {
  aspect_ratio: string
}

// ─── Constants ──────────────────────────────────────────────────────

export const GOAL_MAP: Record<GoalId, {
  generationMode: GenerationMode
  imageUseCase: string
  secondImageType: SecondImageType | null
  showConfigure?: boolean
}> = {
  'instagram-feed': {
    generationMode: 'style-only',
    imageUseCase: 'instagram-carousel',
    secondImageType: '3x3',
  },
  'product-advantages': {
    generationMode: 'style-only',
    imageUseCase: 'amazon-listing',
    secondImageType: 'vignette',
  },
  'elements': {
    generationMode: 'style-only',
    imageUseCase: 'general',
    secondImageType: 'elements',
    showConfigure: true,
  },
  'printable-poster': {
    generationMode: 'style-only',
    imageUseCase: 'general',
    secondImageType: 'poster',
    showConfigure: true,
  },
  'food-photography': {
    generationMode: 'style-only',
    imageUseCase: 'general',
    secondImageType: 'food',
  },
  'professional-photo': {
    generationMode: 'enhance-only',
    imageUseCase: 'shopify-product',
    secondImageType: null,
  },
}

export const DEFAULT_ELEMENTS_CONFIG: ElementsConfig = {
  keyElements: [
    'Product untouched and clearly visible',
    'Product elements spread beside product',
    'Dynamic motion and splashes',
  ],
  enhancers: [
    'subtle sparkle or soft glow',
    'soft vignette to direct focus',
    'slight reflection on floor for depth',
    'warm cinematic tones',
  ],
}

export const DEFAULT_POSTER_CONFIG: PosterConfig = {
  topLabel: 'NEW',
  headline: 'PRODUCT NAME',
  tagline: 'Your compelling product tagline goes here.',
  text: '',
  primaryColor: 'vibrant blue',
  colorScheme: 'monochromatic',
  customColors: [],
  textColor: 'pure white',
  aspectRatio: '4:5',
  productStyle: 'photorealistic',
  backgroundType: 'gradient',
  decorativeElements: {
    halftone: true,
    particles: false,
    geometricShapes: false,
    customElement: '',
  },
  fontStyle: 'sans-serif',
  fontWeight: 'extra-bold',
  textAlignment: 'center',
}

export function getModelCredits(modelKey: ImageModelId): number {
  return AI_MODELS[modelKey].credits ?? 3
}

// ─── Store ──────────────────────────────────────────────────────────

interface ProductEnhancerState {
  // Product
  productName: string
  localImageUri: string | null
  uploadedImageUrl: string | null

  // Goal & generation
  selectedGoalId: GoalId | null
  generationMode: GenerationMode
  selectedModel: ImageModelId
  seedreamConfig: SeedreamConfig
  promptCustomizations: PromptCustomizations
  secondImageConfig: SecondImageConfig

  // Analysis
  isAnalyzing: boolean
  analysisResult: AnalysisResult | null
  hasAppliedSuggestions: boolean
  detectedCategory: string | null
  categoryAttributes: Record<string, string> | null
  suggestedStyleVariant: string | null
  selectedStyleVariant: string | null
  extractedText: string[] | null

  // Generation
  isUploading: boolean
  isGenerating: boolean
  generationPhase: 'idle' | 'uploading' | 'generating' | 'complete' | 'error'
  heroImageUrl: string | null
  vignetteImageUrl: string | null
  error: string | null

  // Preferences
  autoSuggestEnabled: boolean
  seasonalEnabled: boolean

  // Actions
  setProductName: (name: string) => void
  setLocalImageUri: (uri: string | null) => void
  setUploadedImageUrl: (url: string | null) => void
  selectGoal: (goalId: GoalId) => void
  setSelectedModel: (model: ImageModelId) => void
  setPromptCustomizations: (customizations: PromptCustomizations) => void
  setSecondImageConfig: (config: Partial<SecondImageConfig>) => void
  setSeedreamConfig: (config: Partial<SeedreamConfig>) => void
  setSelectedStyleVariant: (variant: string | null) => void
  applyAnalysisSuggestions: (analysis: AnalysisResult) => void
  setAnalysisState: (analyzing: boolean, result?: AnalysisResult | null) => void
  setGenerationPhase: (phase: ProductEnhancerState['generationPhase']) => void
  setGenerationResult: (hero: string | null, vignette: string | null) => void
  setError: (error: string | null) => void
  resetForNewGeneration: () => void
  resetAll: () => void
}

export const useProductEnhancerStore = create<ProductEnhancerState>()(
  persist(
    (set, get) => ({
      // Defaults
      productName: '',
      localImageUri: null,
      uploadedImageUrl: null,
      selectedGoalId: null,
      generationMode: 'both',
      selectedModel: 'GEMINI_3_IMAGE',
      seedreamConfig: { aspect_ratio: '3:4' },
      promptCustomizations: {},
      secondImageConfig: { enabled: true, type: 'vignette' },
      isAnalyzing: false,
      analysisResult: null,
      hasAppliedSuggestions: false,
      detectedCategory: null,
      categoryAttributes: null,
      suggestedStyleVariant: null,
      selectedStyleVariant: null,
      extractedText: null,
      isUploading: false,
      isGenerating: false,
      generationPhase: 'idle',
      heroImageUrl: null,
      vignetteImageUrl: null,
      error: null,
      autoSuggestEnabled: true,
      seasonalEnabled: false,

      // Actions
      setProductName: (name) => set({ productName: name }),
      setLocalImageUri: (uri) => set({ localImageUri: uri }),
      setUploadedImageUrl: (url) => set({ uploadedImageUrl: url }),

      selectGoal: (goalId) => {
        const goalConfig = GOAL_MAP[goalId]
        const updates: Partial<ProductEnhancerState> = {
          selectedGoalId: goalId,
          generationMode: goalConfig.generationMode,
        }

        if (goalConfig.secondImageType) {
          const currentConfig = get().secondImageConfig
          updates.secondImageConfig = {
            ...currentConfig,
            enabled: true,
            type: goalConfig.secondImageType,
          }
          // Initialize defaults if needed
          if (goalConfig.secondImageType === 'elements' && !currentConfig.elementsConfig) {
            updates.secondImageConfig.elementsConfig = { ...DEFAULT_ELEMENTS_CONFIG }
          }
          if (goalConfig.secondImageType === 'poster' && !currentConfig.posterConfig) {
            updates.secondImageConfig.posterConfig = { ...DEFAULT_POSTER_CONFIG }
          }
        } else {
          updates.secondImageConfig = { enabled: false, type: 'vignette' }
        }

        set(updates)
      },

      setSelectedModel: (model) => set({ selectedModel: model }),

      setPromptCustomizations: (customizations) =>
        set({ promptCustomizations: customizations }),

      setSecondImageConfig: (config) =>
        set((state) => ({
          secondImageConfig: { ...state.secondImageConfig, ...config },
        })),

      setSeedreamConfig: (config) =>
        set((state) => ({ seedreamConfig: { ...state.seedreamConfig, ...config } })),

      setSelectedStyleVariant: (variant) =>
        set({ selectedStyleVariant: variant }),

      applyAnalysisSuggestions: (analysis) => {
        const state = get()
        const updates: Partial<ProductEnhancerState> = {
          analysisResult: analysis,
          hasAppliedSuggestions: true,
          detectedCategory: analysis.productCategory,
          categoryAttributes: analysis.categoryAttributes ?? null,
          suggestedStyleVariant: analysis.suggestedStyleVariant ?? null,
          selectedStyleVariant: null, // Reset override on new analysis
          extractedText: analysis.extractedText ?? null,
        }

        if (state.autoSuggestEnabled) {
          if (analysis.productName) {
            updates.productName = analysis.productName
          }
          // Force Gemini if text detected (best at rendering text)
          if (analysis.hasText) {
            updates.selectedModel = 'GEMINI_3_IMAGE'
          } else if (analysis.suggestedModel) {
            // Map backend model names to our enum
            const modelMap: Record<string, ImageModelId> = {
              gemini: 'GEMINI_3_IMAGE',
              seedream: 'SEEDREAM_4_5',
              ideogram: 'IDEOGRAM_V3_TURBO',
            }
            updates.selectedModel = modelMap[analysis.suggestedModel] ?? state.selectedModel
          }
          // Apply hero customizations without overwriting user edits
          if (analysis.suggestedHero) {
            updates.promptCustomizations = {
              ...state.promptCustomizations,
              ...analysis.suggestedHero,
            }
          }
          // Merge elements config
          if (analysis.suggestedElementsConfig) {
            updates.secondImageConfig = {
              ...state.secondImageConfig,
              elementsConfig: {
                ...DEFAULT_ELEMENTS_CONFIG,
                ...analysis.suggestedElementsConfig,
              },
            }
          }
          // Merge poster config
          if (analysis.suggestedPosterConfig) {
            const pc = analysis.suggestedPosterConfig as Record<string, unknown>
            updates.secondImageConfig = {
              ...(updates.secondImageConfig ?? state.secondImageConfig),
              posterConfig: {
                ...DEFAULT_POSTER_CONFIG,
                ...(pc.headline ? { headline: pc.headline as string } : {}),
                ...(pc.tagline ? { tagline: pc.tagline as string } : {}),
                ...(pc.primaryColor ? { primaryColor: pc.primaryColor as string } : {}),
                ...(pc.fontFamily ? { fontFamily: pc.fontFamily as string } : {}),
                ...(pc.decorativeElements ? {
                  decorativeElements: {
                    ...DEFAULT_POSTER_CONFIG.decorativeElements,
                    ...(pc.decorativeElements as Record<string, unknown>),
                  },
                } : {}),
              },
            }
          }
        }

        set(updates)
      },

      setAnalysisState: (analyzing, result) => {
        const updates: Partial<ProductEnhancerState> = { isAnalyzing: analyzing }
        if (result !== undefined) updates.analysisResult = result
        set(updates)
      },

      setGenerationPhase: (phase) => {
        const updates: Partial<ProductEnhancerState> = { generationPhase: phase }
        if (phase === 'uploading') {
          updates.isUploading = true
          updates.isGenerating = false
          updates.error = null
        } else if (phase === 'generating') {
          updates.isUploading = false
          updates.isGenerating = true
        } else if (phase === 'complete') {
          updates.isUploading = false
          updates.isGenerating = false
        } else if (phase === 'error') {
          updates.isUploading = false
          updates.isGenerating = false
        } else {
          updates.isUploading = false
          updates.isGenerating = false
        }
        set(updates)
      },

      setGenerationResult: (hero, vignette) =>
        set({ heroImageUrl: hero, vignetteImageUrl: vignette, generationPhase: 'complete', isGenerating: false, isUploading: false }),

      setError: (error) => set({ error, generationPhase: error ? 'error' : 'idle', isGenerating: false, isUploading: false }),

      resetForNewGeneration: () =>
        set({
          localImageUri: null,
          uploadedImageUrl: null,
          heroImageUrl: null,
          vignetteImageUrl: null,
          error: null,
          generationPhase: 'idle',
          isGenerating: false,
          isUploading: false,
          isAnalyzing: false,
          analysisResult: null,
          hasAppliedSuggestions: false,
          detectedCategory: null,
          categoryAttributes: null,
          suggestedStyleVariant: null,
          selectedStyleVariant: null,
          extractedText: null,
          productName: '',
        }),

      resetAll: () =>
        set({
          productName: '',
          localImageUri: null,
          uploadedImageUrl: null,
          selectedGoalId: null,
          generationMode: 'both',
          selectedModel: 'GEMINI_3_IMAGE',
          seedreamConfig: { aspect_ratio: '3:4' },
          promptCustomizations: {},
          secondImageConfig: { enabled: true, type: 'vignette' },
          isAnalyzing: false,
          analysisResult: null,
          hasAppliedSuggestions: false,
          detectedCategory: null,
          categoryAttributes: null,
          suggestedStyleVariant: null,
          selectedStyleVariant: null,
          extractedText: null,
          isUploading: false,
          isGenerating: false,
          generationPhase: 'idle',
          heroImageUrl: null,
          vignetteImageUrl: null,
          error: null,
        }),
    }),
    {
      name: 'product-enhancer-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        productName: state.productName,
        selectedGoalId: state.selectedGoalId,
        generationMode: state.generationMode,
        selectedModel: state.selectedModel,
        seedreamConfig: state.seedreamConfig,
        promptCustomizations: state.promptCustomizations,
        secondImageConfig: state.secondImageConfig,
        autoSuggestEnabled: state.autoSuggestEnabled,
        seasonalEnabled: state.seasonalEnabled,
      }),
    }
  )
)
