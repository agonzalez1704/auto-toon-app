import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CommercialPersona } from '@/lib/commercial-shots'
import type { CommercialQuality } from '@/lib/ai-models'

export type CommercialModel = 'seedance-2-pro' | 'kling-v3'

export interface CommercialState {
  // Input
  sourceImageUrl: string | null
  productName: string

  // Config
  stylePersona: CommercialPersona
  shotId: string
  customDirection: string
  aiModel: CommercialModel
  duration: 5 | 10
  aspectRatio: '16:9' | '9:16' | '1:1'
  quality: CommercialQuality

  // Generation
  generationPhase: 'idle' | 'generating' | 'complete' | 'error'
  progress: number
  progressMessage: string
  storyboardUrl: string | null
  resultVideoUrl: string | null
  videoGenerationId: string | null
  error: string | null

  // Actions
  setSourceImage: (url: string, name: string) => void
  setStylePersona: (persona: CommercialPersona) => void
  setShotId: (shotId: string) => void
  setCustomDirection: (text: string) => void
  setAiModel: (model: CommercialModel) => void
  setDuration: (duration: 5 | 10) => void
  setAspectRatio: (ratio: '16:9' | '9:16' | '1:1') => void
  setQuality: (quality: CommercialQuality) => void
  startGenerating: () => void
  setGenerationProgress: (percent: number, message: string) => void
  setStoryboard: (url: string) => void
  setGenerationResult: (videoUrl: string, id: string) => void
  setError: (error: string) => void
  resetGeneration: () => void
}

const DEFAULTS = {
  stylePersona: 'fashion-editorial' as CommercialPersona,
  shotId: 'hero-reveal',
  customDirection: '',
  aiModel: 'seedance-2-pro' as CommercialModel,
  duration: 5 as const,
  aspectRatio: '9:16' as const,
  quality: '720p' as CommercialQuality,
}

export const useCommercialStore = create<CommercialState>()(
  persist(
    (set) => ({
      sourceImageUrl: null,
      productName: '',
      ...DEFAULTS,
      generationPhase: 'idle',
      progress: 0,
      progressMessage: '',
      storyboardUrl: null,
      resultVideoUrl: null,
      videoGenerationId: null,
      error: null,

      setSourceImage: (url, name) =>
        set({
          sourceImageUrl: url,
          productName: name,
          ...DEFAULTS,
          generationPhase: 'idle',
          progress: 0,
          progressMessage: '',
          storyboardUrl: null,
          resultVideoUrl: null,
          videoGenerationId: null,
          error: null,
        }),

      setStylePersona: (stylePersona) => set({ stylePersona }),
      setShotId: (shotId) => set({ shotId }),
      setCustomDirection: (customDirection) => set({ customDirection }),
      setAiModel: (aiModel) => set({ aiModel }),
      setDuration: (duration) => set({ duration }),
      setAspectRatio: (aspectRatio) => set({ aspectRatio }),
      setQuality: (quality) => set({ quality }),

      startGenerating: () =>
        set({
          generationPhase: 'generating',
          progress: 0,
          progressMessage: 'Starting commercial...',
          storyboardUrl: null,
          resultVideoUrl: null,
          error: null,
        }),

      setGenerationProgress: (percent, message) =>
        set({ progress: percent, progressMessage: message }),

      setStoryboard: (url) => set({ storyboardUrl: url }),

      setGenerationResult: (videoUrl, id) =>
        set({
          resultVideoUrl: videoUrl,
          videoGenerationId: id,
          generationPhase: 'complete',
          progress: 100,
          progressMessage: 'Complete',
          error: null,
        }),

      setError: (error) =>
        set({ error, generationPhase: 'error', progress: 0, progressMessage: '' }),

      resetGeneration: () =>
        set({
          sourceImageUrl: null,
          productName: '',
          ...DEFAULTS,
          generationPhase: 'idle',
          progress: 0,
          progressMessage: '',
          storyboardUrl: null,
          resultVideoUrl: null,
          videoGenerationId: null,
          error: null,
        }),
    }),
    {
      name: 'commercial-generation-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
    }
  )
)
