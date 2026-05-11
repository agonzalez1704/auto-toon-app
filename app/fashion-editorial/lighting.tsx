import { ModifierPresetPicker } from '@/components/modifier-preset-picker'
import {
  LIGHTING_PRESETS,
  useFashionEditorialStore,
} from '@/stores/use-fashion-editorial-store'

export default function LightingScreen() {
  const store = useFashionEditorialStore()
  const firstShoeUrl = store.shoeItems.find((s) => s.uploadedUrl)?.uploadedUrl || undefined
  const subjectImageUrl = store.heroImageUrl || store.selectedModelImageUrl || undefined

  return (
    <ModifierPresetPicker
      title="Lighting"
      intro="Lighting sets the entire mood of your image. Pick a preset — once selected you can generate a live preview to see the look applied to your subject."
      tutorialStorageKey="fe-tutorial-seen-lighting"
      kind="lighting"
      presets={LIGHTING_PRESETS}
      value={store.lighting}
      customValue={store.customLighting}
      onChange={store.setLighting}
      onCustomChange={store.setCustomLighting}
      subject={{ subjectImageUrl, footwearImageUrl: firstShoeUrl }}
    />
  )
}
