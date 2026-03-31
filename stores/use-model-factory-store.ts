import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type {
  GenerationMode,
  FaceAnalysis,
  BodyAnalysis,
  SavedModel,
} from '@/lib/model-factory'

interface ModelFactoryState {
  // Face photo
  faceLocalUri: string | null
  faceUploadedUrl: string | null

  // Body photo
  bodyLocalUri: string | null
  bodyUploadedUrl: string | null

  // Mode
  mode: GenerationMode

  // Analysis results
  faceAnalysis: FaceAnalysis | null
  bodyAnalysis: BodyAnalysis | null

  // Generation
  phase: 'idle' | 'uploading' | 'analyzing' | 'generating' | 'complete' | 'error'
  generatedImageUrl: string | null
  error: string | null

  // Gallery
  savedModels: SavedModel[]
  hasSeenIntro: boolean

  // Actions — photos
  setFaceLocalUri: (uri: string | null) => void
  setFaceUploadedUrl: (url: string | null) => void
  setBodyLocalUri: (uri: string | null) => void
  setBodyUploadedUrl: (url: string | null) => void
  clearFace: () => void
  clearBody: () => void

  // Actions — mode & analysis
  setMode: (mode: GenerationMode) => void
  setFaceAnalysis: (analysis: FaceAnalysis | null) => void
  setBodyAnalysis: (analysis: BodyAnalysis | null) => void

  // Actions — generation
  setPhase: (phase: ModelFactoryState['phase']) => void
  setGeneratedImageUrl: (url: string | null) => void
  setError: (error: string | null) => void

  // Actions — gallery
  saveModel: (model: SavedModel) => void
  deleteModel: (id: string) => void
  markIntroSeen: () => void

  // Actions — reset
  resetForNew: () => void
}

export const useModelFactoryStore = create<ModelFactoryState>()(
  persist(
    (set) => ({
      faceLocalUri: null,
      faceUploadedUrl: null,
      bodyLocalUri: null,
      bodyUploadedUrl: null,
      mode: 'use-face',
      faceAnalysis: null,
      bodyAnalysis: null,
      phase: 'idle',
      generatedImageUrl: null,
      error: null,
      savedModels: [],
      hasSeenIntro: false,

      // Photos
      setFaceLocalUri: (uri) => set({ faceLocalUri: uri }),
      setFaceUploadedUrl: (url) => set({ faceUploadedUrl: url }),
      setBodyLocalUri: (uri) => set({ bodyLocalUri: uri }),
      setBodyUploadedUrl: (url) => set({ bodyUploadedUrl: url }),
      clearFace: () =>
        set({
          faceLocalUri: null,
          faceUploadedUrl: null,
          faceAnalysis: null,
          error: null,
        }),
      clearBody: () =>
        set({
          bodyLocalUri: null,
          bodyUploadedUrl: null,
          bodyAnalysis: null,
        }),

      // Mode & analysis
      setMode: (mode) => set({ mode }),
      setFaceAnalysis: (analysis) => set({ faceAnalysis: analysis }),
      setBodyAnalysis: (analysis) => set({ bodyAnalysis: analysis }),

      // Generation
      setPhase: (phase) => {
        const updates: Partial<ModelFactoryState> = { phase }
        if (phase === 'idle' || phase === 'generating') {
          updates.error = null
        }
        set(updates)
      },
      setGeneratedImageUrl: (url) =>
        set({ generatedImageUrl: url, phase: url ? 'complete' : 'idle' }),
      setError: (error) =>
        set({ error, phase: error ? 'error' : 'idle' }),

      // Gallery
      saveModel: (model) =>
        set((state) => ({ savedModels: [model, ...state.savedModels] })),
      deleteModel: (id) =>
        set((state) => ({
          savedModels: state.savedModels.filter((m) => m.id !== id),
        })),
      markIntroSeen: () => set({ hasSeenIntro: true }),

      // Reset
      resetForNew: () =>
        set({
          faceLocalUri: null,
          faceUploadedUrl: null,
          bodyLocalUri: null,
          bodyUploadedUrl: null,
          mode: 'use-face',
          faceAnalysis: null,
          bodyAnalysis: null,
          phase: 'idle',
          generatedImageUrl: null,
          error: null,
        }),
    }),
    {
      name: 'model-factory-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      partialize: (state) => ({
        savedModels: state.savedModels,
        hasSeenIntro: state.hasSeenIntro,
      }),
    }
  )
)
