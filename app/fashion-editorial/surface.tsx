import { ModifierPresetPicker } from '@/components/modifier-preset-picker'
import {
  SURFACE_PRESETS,
  useFashionEditorialStore,
} from '@/stores/use-fashion-editorial-store'

export default function SurfaceScreen() {
  const store = useFashionEditorialStore()
  const firstShoeUrl = store.shoeItems.find((s) => s.uploadedUrl)?.uploadedUrl || undefined
  const subjectImageUrl = store.heroImageUrl || store.selectedModelImageUrl || undefined

  return (
    <ModifierPresetPicker
      title="Surface"
      intro="Surface is the floor / ground the product sits on. Wet concrete reads urban-editorial, marble reads premium, sand reads warm lifestyle."
      tutorialStorageKey="fe-tutorial-seen-surface"
      kind="surface"
      presets={SURFACE_PRESETS}
      value={store.surface}
      customValue={store.customSurface}
      onChange={store.setSurface}
      onCustomChange={store.setCustomSurface}
      subject={{ subjectImageUrl, footwearImageUrl: firstShoeUrl }}
    />
  )
}
