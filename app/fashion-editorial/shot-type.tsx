import { ModifierPresetPicker } from '@/components/modifier-preset-picker'
import {
  SHOT_TYPE_PRESETS,
  useFashionEditorialStore,
} from '@/stores/use-fashion-editorial-store'

export default function ShotTypeScreen() {
  const store = useFashionEditorialStore()
  const firstShoeUrl = store.shoeItems.find((s) => s.uploadedUrl)?.uploadedUrl || undefined
  const subjectImageUrl = store.heroImageUrl || store.selectedModelImageUrl || undefined

  return (
    <ModifierPresetPicker
      title="Shot Type"
      intro="Shot type controls how the camera frames your subject. Portrait crops hide the shoes — walking and detail shots make them the hero."
      tutorialStorageKey="fe-tutorial-seen-shotType"
      kind="shotType"
      presets={SHOT_TYPE_PRESETS}
      value={store.shotType}
      customValue={store.customShot}
      onChange={store.setShotType}
      onCustomChange={store.setCustomShot}
      subject={{ subjectImageUrl, footwearImageUrl: firstShoeUrl }}
    />
  )
}
