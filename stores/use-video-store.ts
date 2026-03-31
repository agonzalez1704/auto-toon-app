import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { VideoAnalysisResult } from '@/lib/api'

export type CameraPreset =
  | 'static'
  | 'pan-left'
  | 'pan-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'tilt-up'
  | 'tilt-down'
  | 'orbit'

export interface VideoGenerationState {
  // Input
  sourceImageUrl: string | null
  tailImageUrl: string | null        // end frame for start/end mode
  availableImages: string[]
  productName: string

  // AI analysis
  analysisPhase: 'idle' | 'analyzing' | 'ready' | 'error'
  aiPlan: VideoAnalysisResult | null

  // Generation state
  generationPhase: 'idle' | 'generating' | 'complete' | 'error'
  progress: number
  progressMessage: string
  resultVideoUrl: string | null
  videoGenerationId: string | null
  error: string | null

  // Actions
  setSourceImage: (url: string, available: string[], name: string) => void
  setTailImage: (url: string | null) => void
  setAnalyzing: () => void
  setAiPlan: (plan: VideoAnalysisResult) => void
  setAnalysisError: (error: string) => void
  setGenerationProgress: (percent: number, message: string) => void
  setGenerationResult: (videoUrl: string, id: string) => void
  setError: (error: string) => void
  resetGeneration: () => void
}

export const useVideoStore = create<VideoGenerationState>()(
  persist(
    (set) => ({
      // Defaults
      sourceImageUrl: null,
      tailImageUrl: null,
      availableImages: [],
      productName: '',
      analysisPhase: 'idle',
      aiPlan: null,
      generationPhase: 'idle',
      progress: 0,
      progressMessage: '',
      resultVideoUrl: null,
      videoGenerationId: null,
      error: null,

      // Actions
      setSourceImage: (url, available, name) =>
        set({
          sourceImageUrl: url,
          tailImageUrl: null,
          availableImages: available,
          productName: name,
          analysisPhase: 'idle',
          aiPlan: null,
          generationPhase: 'idle',
          resultVideoUrl: null,
          videoGenerationId: null,
          error: null,
          progress: 0,
          progressMessage: '',
        }),

      setTailImage: (url) =>
        set({ tailImageUrl: url }),

      setAnalyzing: () =>
        set({ analysisPhase: 'analyzing', error: null }),

      setAiPlan: (plan) =>
        set({ aiPlan: plan, analysisPhase: 'ready', error: null }),

      setAnalysisError: (error) =>
        set({ analysisPhase: 'error', error }),

      setGenerationProgress: (percent, message) =>
        set({ progress: percent, progressMessage: message }),

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
        set({
          error,
          generationPhase: 'error',
          progress: 0,
          progressMessage: '',
        }),

      resetGeneration: () =>
        set({
          sourceImageUrl: null,
          tailImageUrl: null,
          availableImages: [],
          productName: '',
          analysisPhase: 'idle',
          aiPlan: null,
          generationPhase: 'idle',
          progress: 0,
          progressMessage: '',
          resultVideoUrl: null,
          videoGenerationId: null,
          error: null,
        }),
    }),
    {
      name: 'video-generation-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
    }
  )
)
