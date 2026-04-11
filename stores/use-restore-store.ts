import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type RestoreModelId = 'GEMINI_3_IMAGE' | 'GEMINI_3_1_FLASH_IMAGE'
export type Resolution = '2K' | '4K'

export const RESTORE_MODELS: Record<RestoreModelId, { id: string; name: string }> = {
  GEMINI_3_IMAGE: { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro' },
  GEMINI_3_1_FLASH_IMAGE: { id: 'gemini-3.1-flash-image-preview', name: 'Nano Banana 2' },
}

const CREDIT_COSTS: Record<Resolution, number> = {
  '2K': 3,
  '4K': 5,
}

export type RestorePhase = 'idle' | 'uploading' | 'restoring' | 'complete' | 'error'

interface RestoreState {
  selectedModel: RestoreModelId
  resolution: Resolution
  localImageUri: string | null
  uploadedImageUrl: string | null
  phase: RestorePhase
  restoredImageUrl: string | null
  error: string | null

  setSelectedModel: (model: RestoreModelId) => void
  setResolution: (resolution: Resolution) => void
  setLocalImageUri: (uri: string | null) => void
  setUploadedImageUrl: (url: string | null) => void
  setPhase: (phase: RestorePhase) => void
  setRestoredImageUrl: (url: string | null) => void
  setError: (error: string | null) => void
  resetForNew: () => void
  resetAll: () => void
  creditCost: () => number
}

export const useRestoreStore = create<RestoreState>()(
  persist(
    (set, get) => ({
      selectedModel: 'GEMINI_3_IMAGE',
      resolution: '2K',
      localImageUri: null,
      uploadedImageUrl: null,
      phase: 'idle',
      restoredImageUrl: null,
      error: null,

      setSelectedModel: (model) => set({ selectedModel: model }),
      setResolution: (resolution) => set({ resolution }),
      setLocalImageUri: (uri) => set({ localImageUri: uri }),
      setUploadedImageUrl: (url) => set({ uploadedImageUrl: url }),
      setPhase: (phase) => {
        const updates: Partial<RestoreState> = { phase }
        if (phase === 'idle' || phase === 'error') {
          // Clear error on idle, keep it on error (set separately)
        }
        set(updates)
      },
      setRestoredImageUrl: (url) => set({ restoredImageUrl: url }),
      setError: (error) => set((state) => ({
        error,
        // Only transition phase when setting an error; clearing should not reset phase
        phase: error ? 'error' : state.phase,
      })),
      resetForNew: () =>
        set({
          localImageUri: null,
          uploadedImageUrl: null,
          phase: 'idle',
          restoredImageUrl: null,
          error: null,
        }),
      resetAll: () =>
        set({
          selectedModel: 'GEMINI_3_IMAGE',
          resolution: '2K',
          localImageUri: null,
          uploadedImageUrl: null,
          phase: 'idle',
          restoredImageUrl: null,
          error: null,
        }),
      creditCost: () => CREDIT_COSTS[get().resolution],
    }),
    {
      name: 'restore-storage-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        resolution: state.resolution,
      }),
    }
  )
)
