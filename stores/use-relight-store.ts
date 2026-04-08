import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RelightMode = 'object' | 'character'

export interface RelightPreset {
  id: string
  label: string
  description: string
  color: string
  /** Preview image filename served from /previews/ */
  preview: string
}

export type RelightPhase = 'idle' | 'uploading' | 'generating' | 'complete' | 'error'

// ─── Preset Data ──────────────────────────────────────────────────────────────

export const OBJECT_PRESETS: RelightPreset[] = [
  { id: 'furnace-backdraft', label: 'Furnace Backdraft', description: 'Infernal orange-red heat from behind', color: '#FF4500', preview: 'furnace_backdraft_2k.png' },
  { id: 'silver-moonlight', label: 'Silver Moonlight', description: 'Cold silver-white from above', color: '#C0C0C0', preview: 'silver_moonlight_2k.png' },
  { id: 'ghostly-underlight', label: 'Ghostly Underlight', description: 'Eerie pale glow from beneath', color: '#88CCAA', preview: 'ghostly_underlight_2k.png' },
  { id: 'exhibition-spotlight', label: 'Exhibition Spotlight', description: 'Focused museum beam with dust', color: '#FFFACD', preview: 'warm_directional_2k.png' },
  { id: 'warm-directional', label: 'Warm Directional', description: 'Golden amber from upper right', color: '#DAA520', preview: 'warm_directional_2k.png' },
]

export const CHARACTER_PRESETS: RelightPreset[] = [
  { id: 'backlight-halo', label: 'Backlight Halo', description: 'Glowing rim behind silhouette', color: '#FDE68A', preview: 'backlight_halo_2k.png' },
  { id: 'orange-blue-split', label: 'Orange / Blue Split', description: 'Warm amber vs cool blue sides', color: '#F97316', preview: 'orange_blue_split_2k.png' },
  { id: 'pastel-mint-peach', label: 'Pastel Mint & Peach', description: 'Soft editorial beauty light', color: '#98D8C8', preview: 'pastel_mint_peach_2k.png' },
  { id: 'noir-monochrome', label: 'Noir Monochrome', description: 'Hard noir shadows, no color', color: '#4A4A4A', preview: 'noir_monochrome_2k.png' },
  { id: 'rembrandt-light', label: 'Rembrandt Light', description: 'Classic warm portrait triangle', color: '#CD853F', preview: 'rembrandt_light_2k.png' },
  { id: 'molten-side-light', label: 'Molten Side Light', description: 'Intense thermal glow from one side', color: '#FF6B35', preview: 'molten_side_light_2k.png' },
  { id: 'urban-sodium-night', label: 'Urban Sodium Night', description: 'Gritty amber streetlight look', color: '#CC8800', preview: 'soft_silver_portrait_2k.png' },
  { id: 'soft-silver-portrait', label: 'Soft Silver Portrait', description: 'Clean overcast editorial light', color: '#B0C4DE', preview: 'soft_silver_portrait_2k.png' },
]

// ─── Store ────────────────────────────────────────────────────────────────────

interface RelightState {
  // Source image — local pick or remote URL from assets/params
  localImageUri: string | null
  uploadedImageUrl: string | null
  sourceTitle: string | null

  // Mode & selection
  mode: RelightMode
  selectedPresetId: string | null
  customText: string

  // Generation
  phase: RelightPhase
  resultUrl: string | null
  error: string | null

  // History of relit images for this session
  history: string[]

  // Actions
  setLocalImage: (uri: string) => void
  setUploadedImage: (url: string, title?: string) => void
  setMode: (mode: RelightMode) => void
  selectPreset: (presetId: string) => void
  setCustomText: (text: string) => void
  setPhase: (phase: RelightPhase) => void
  setResult: (url: string) => void
  setError: (error: string) => void
  resetResult: () => void
  clearImage: () => void
  reset: () => void

  // Guards
  canGenerate: () => boolean
  hasImage: () => boolean
}

const initialState = {
  localImageUri: null as string | null,
  uploadedImageUrl: null as string | null,
  sourceTitle: null as string | null,
  mode: 'character' as RelightMode,
  selectedPresetId: null as string | null,
  customText: '',
  phase: 'idle' as RelightPhase,
  resultUrl: null as string | null,
  error: null as string | null,
  history: [] as string[],
}

export const useRelightStore = create<RelightState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setLocalImage: (uri) =>
        set({
          localImageUri: uri,
          uploadedImageUrl: null,
          sourceTitle: null,
          phase: 'idle',
          resultUrl: null,
          error: null,
          history: [],
        }),

      setUploadedImage: (url, title) =>
        set({
          localImageUri: null,
          uploadedImageUrl: url,
          sourceTitle: title ?? null,
          phase: 'idle',
          resultUrl: null,
          error: null,
          history: [],
        }),

      setMode: (mode) => {
        const currentPreset = get().selectedPresetId
        const presetsForMode = mode === 'object' ? OBJECT_PRESETS : CHARACTER_PRESETS
        const isValid = presetsForMode.some((p) => p.id === currentPreset)
        set({
          mode,
          selectedPresetId: isValid ? currentPreset : presetsForMode[0].id,
        })
      },

      selectPreset: (presetId) =>
        set({ selectedPresetId: presetId, error: null }),

      setCustomText: (text) => set({ customText: text }),

      setPhase: (phase) => set({ phase }),

      setResult: (url) =>
        set((state) => ({
          resultUrl: url,
          phase: 'complete',
          error: null,
          history: [...state.history, url],
        })),

      setError: (error) => set({ error, phase: 'error' }),

      resetResult: () =>
        set({ resultUrl: null, phase: 'idle', error: null }),

      clearImage: () =>
        set({
          localImageUri: null,
          uploadedImageUrl: null,
          sourceTitle: null,
          phase: 'idle',
          resultUrl: null,
          error: null,
          history: [],
        }),

      reset: () => set(initialState),

      canGenerate: () => {
        const s = get()
        if (!s.uploadedImageUrl) return false
        if (s.phase === 'generating' || s.phase === 'uploading') return false
        if (s.selectedPresetId === 'custom') {
          return s.customText.trim().length > 10
        }
        return !!s.selectedPresetId
      },

      hasImage: () => {
        const s = get()
        return !!(s.localImageUri || s.uploadedImageUrl)
      },
    }),
    {
      name: 'relight-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        mode: state.mode,
      }),
    }
  )
)

/** Get the presets array for the current mode */
export function getPresetsForMode(mode: RelightMode): RelightPreset[] {
  return mode === 'object' ? OBJECT_PRESETS : CHARACTER_PRESETS
}
