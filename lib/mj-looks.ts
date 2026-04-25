/**
 * Curated MJ V7 preset Looks — think Instagram filters for fashion editorial.
 *
 * One tap picks camera + film + lighting + time + weather + shot + director
 * in one go. The goal is to hide the technical vocabulary behind a single
 * mood decision. Users who want granular control can open Custom.
 */
import type { MjPhotoKitSelection } from './mj-photo-kit'

export interface MjLook {
  id: string
  name: string                 // chip label — short, descriptive
  vibe: string                 // one-line sell
  gradient: [string, string]   // card background, sets the mood
  photoKit: MjPhotoKitSelection
}

export const MJ_LOOKS: MjLook[] = [
  {
    id: 'soft-editorial',
    name: 'Soft Editorial',
    vibe: 'Vogue cover, natural window light',
    gradient: ['#F5E6D3', '#D4B896'],
    photoKit: {
      photoType: 'fashion-editorial',
      director: 'paolo-roversi',
      camera: 'hasselblad-x1d',
      filmStock: 'kodak-portra-400',
      lighting: 'window-light',
      timeOfDay: 'morning',
      shotAngle: 'three-quarter',
    },
  },
  {
    id: 'golden-campaign',
    name: 'Golden Hour',
    vibe: 'Warm, glowing, luxury campaign',
    gradient: ['#F9C974', '#E8843F'],
    photoKit: {
      photoType: 'campaign',
      director: 'mario-testino',
      camera: 'hasselblad-x1d',
      filmStock: 'kodak-portra-400',
      lighting: 'golden-hour',
      timeOfDay: 'golden-hour',
      weather: 'sunny',
      shotAngle: 'three-quarter',
    },
  },
  {
    id: 'moody-cinematic',
    name: 'Moody Cinematic',
    vibe: 'Big-screen, atmospheric, brooding',
    gradient: ['#3E4E6E', '#1A2238'],
    photoKit: {
      photoType: 'cinematic-still',
      director: 'denis-villeneuve',
      camera: 'arri-alexa-65',
      lighting: 'rim',
      timeOfDay: 'blue-hour',
      shotAngle: 'medium',
    },
  },
  {
    id: 'studio-beauty',
    name: 'Studio Beauty',
    vibe: 'Clean backdrop, glossy magazine skin',
    gradient: ['#FDECEC', '#E8C9C9'],
    photoKit: {
      photoType: 'beauty-portrait',
      director: 'irving-penn',
      camera: 'phaseone-xf',
      lighting: 'clamshell',
      shotAngle: 'beauty-close',
    },
  },
  {
    id: 'street-analog',
    name: 'Street Analog',
    vibe: 'Gritty night flash, documentary edge',
    gradient: ['#2C2C2C', '#0A0A0A'],
    photoKit: {
      photoType: 'street-style',
      director: 'nan-goldin',
      camera: 'contax-t2',
      filmStock: 'cinestill-800t',
      lighting: 'hard-flash',
      timeOfDay: 'night',
      shotAngle: 'medium',
    },
  },
  {
    id: 'dreamy-pastel',
    name: 'Dreamy Pastel',
    vibe: 'Whimsical, soft, storybook-like',
    gradient: ['#E8D5F2', '#C4A5D8'],
    photoKit: {
      photoType: 'fashion-editorial',
      director: 'tim-walker',
      camera: 'mamiya-rz67',
      filmStock: 'fuji-pro-400h',
      lighting: 'overcast-soft',
      weather: 'misty',
      timeOfDay: 'morning',
      shotAngle: 'full-body',
    },
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    vibe: 'Chromatic shadows, city noir',
    gradient: ['#E83E8C', '#6B3FA0'],
    photoKit: {
      photoType: 'cinematic-still',
      director: 'wong-kar-wai',
      camera: 'sony-a7r-v',
      filmStock: 'cinestill-800t',
      lighting: 'neon',
      timeOfDay: 'night',
      shotAngle: 'medium',
    },
  },
  {
    id: 'desert-campaign',
    name: 'Desert Campaign',
    vibe: 'Sun-kissed, windswept, big sky',
    gradient: ['#E8B87D', '#C97F4A'],
    photoKit: {
      photoType: 'campaign',
      director: 'annie-leibovitz',
      camera: 'canon-r5',
      filmStock: 'kodak-portra-800',
      lighting: 'golden-hour',
      timeOfDay: 'golden-hour',
      weather: 'windy',
      shotAngle: 'full-body',
    },
  },
  {
    id: 'bw-timeless',
    name: 'Timeless B&W',
    vibe: 'High-contrast, classic monochrome',
    gradient: ['#9A9A9A', '#1A1A1A'],
    photoKit: {
      photoType: 'fashion-editorial',
      director: 'peter-lindbergh',
      camera: 'leica-m11',
      filmStock: 'kodak-trix',
      lighting: 'rembrandt',
      shotAngle: 'medium',
    },
  },
]

/** Check if current selection exactly matches a preset look. */
export function matchMjLook(sel: MjPhotoKitSelection | undefined): MjLook | undefined {
  if (!sel) return undefined
  const selKeys = Object.keys(sel).filter((k) => sel[k as keyof MjPhotoKitSelection])
  if (selKeys.length === 0) return undefined

  return MJ_LOOKS.find((look) => {
    const lookKeys = Object.keys(look.photoKit)
    if (lookKeys.length !== selKeys.length) return false
    return lookKeys.every(
      (k) =>
        look.photoKit[k as keyof MjPhotoKitSelection] ===
        sel[k as keyof MjPhotoKitSelection]
    )
  })
}
