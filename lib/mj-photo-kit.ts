/**
 * Midjourney V7 Photo Kit — vocabularies for camera, film, lighting, etc.
 *
 * Derived from the Roco de la Portilla MJ prompt kit. Each option carries:
 *  - id            stable key for storage / routing
 *  - label         short UI label (chip / row display)
 *  - tail          the exact snippet that gets appended to the MJ prompt
 *  - blurb?        one-line hint for the picker sheet
 *
 * Prompt tail assembly order (matches the PDF's "perfect prompt" grammar):
 *   <photo-type> of <subject>, <scene/time/weather/mood>, <light>, <shot>,
 *   inspired by <director>, shot with <camera> on <film>
 *
 * Mirror on the web side: `toon-converter/lib/mj-photo-kit.ts` (identical schema).
 */

export interface MjKitOption {
  id: string
  label: string
  tail: string
  blurb?: string
}

// ─── Photo type (opener of the prompt) ────────────────────────────

export const MJ_PHOTO_TYPES: MjKitOption[] = [
  { id: 'none',              label: 'Auto',                 tail: '',                                     blurb: 'Let the assembler decide' },
  { id: 'fashion-editorial', label: 'Fashion editorial',    tail: 'Fashion editorial photograph',         blurb: 'Vogue-style magazine shoot' },
  { id: 'street-style',      label: 'Street style',         tail: 'Street style photograph',              blurb: 'Candid fashion on location' },
  { id: 'studio-portrait',   label: 'Studio portrait',      tail: 'Studio portrait photograph',           blurb: 'Clean backdrop, controlled light' },
  { id: 'beauty-portrait',   label: 'Beauty portrait',      tail: 'Beauty portrait photograph',           blurb: 'Close-up, skin-forward' },
  { id: 'lookbook',          label: 'Lookbook',             tail: 'Lookbook photograph',                  blurb: 'Full outfit, product-focused' },
  { id: 'campaign',          label: 'Campaign',             tail: 'Advertising campaign photograph',      blurb: 'High-gloss commercial feel' },
  { id: 'cinematic-still',   label: 'Cinematic still',      tail: 'Cinematic film still',                 blurb: 'Movie frame energy' },
  { id: 'documentary',       label: 'Documentary',          tail: 'Documentary photograph',               blurb: 'Natural, observational' },
  { id: 'polaroid',          label: 'Polaroid',             tail: 'Polaroid snapshot',                    blurb: 'Analog instant-film look' },
]

// ─── Cameras (still / digital + medium format) ────────────────────

export const MJ_STILL_CAMERAS: MjKitOption[] = [
  { id: 'none',                label: 'Auto',                   tail: '' },
  { id: 'hasselblad-x1d',      label: 'Hasselblad X1D',         tail: 'shot with a Hasselblad X1D',      blurb: 'Medium format, creamy bokeh' },
  { id: 'hasselblad-h6d',      label: 'Hasselblad H6D-100c',    tail: 'shot with a Hasselblad H6D-100c', blurb: 'Ultra-high-res medium format' },
  { id: 'phaseone-xf',         label: 'Phase One XF IQ4',       tail: 'shot with a Phase One XF IQ4',    blurb: 'Commercial fashion standard' },
  { id: 'sony-a7r-v',          label: 'Sony A7R V',             tail: 'shot with a Sony A7R V',          blurb: 'Sharp full-frame digital' },
  { id: 'canon-r5',            label: 'Canon EOS R5',           tail: 'shot with a Canon EOS R5',        blurb: 'Balanced color, fashion-ready' },
  { id: 'leica-q3',            label: 'Leica Q3',               tail: 'shot with a Leica Q3',            blurb: 'Signature Leica micro-contrast' },
  { id: 'leica-m11',           label: 'Leica M11',              tail: 'shot with a Leica M11',           blurb: 'Rangefinder street classic' },
  { id: 'fuji-gfx100',         label: 'Fujifilm GFX 100 II',    tail: 'shot with a Fujifilm GFX 100 II', blurb: 'Medium format film-simulation' },
  { id: 'pentax-67',           label: 'Pentax 67 (analog)',     tail: 'shot on a Pentax 67',             blurb: 'Chunky 6×7 film portrait' },
  { id: 'contax-t2',           label: 'Contax T2 (analog)',     tail: 'shot on a Contax T2',             blurb: 'Cult 35mm compact, flash grain' },
  { id: 'mamiya-rz67',         label: 'Mamiya RZ67 (analog)',   tail: 'shot on a Mamiya RZ67',           blurb: 'Legendary studio medium format' },
]

// ─── Cinema cameras (cinematic still energy) ──────────────────────

export const MJ_CINEMA_CAMERAS: MjKitOption[] = [
  { id: 'none',          label: 'Auto',                    tail: '' },
  { id: 'arri-alexa-65', label: 'ARRI Alexa 65',           tail: 'shot on ARRI Alexa 65',            blurb: 'Blockbuster cinema frame' },
  { id: 'arri-alexa-lf', label: 'ARRI Alexa LF',           tail: 'shot on ARRI Alexa LF',            blurb: 'Signature filmic large-format' },
  { id: 'red-v-raptor',  label: 'RED V-Raptor 8K VV',      tail: 'shot on RED V-Raptor 8K VV',       blurb: 'Razor-sharp commercial cinema' },
  { id: 'sony-venice-2', label: 'Sony Venice 2',           tail: 'shot on Sony Venice 2',            blurb: 'Smooth skin-tone cinema' },
  { id: 'panavision',    label: 'Panavision Millennium DXL2', tail: 'shot on Panavision Millennium DXL2', blurb: 'Prestige cinema look' },
]

// ─── Analog film stocks ──────────────────────────────────────────

export const MJ_ANALOG_FILMS: MjKitOption[] = [
  { id: 'none',             label: 'No film',            tail: '' },
  { id: 'kodak-portra-400', label: 'Kodak Portra 400',   tail: 'on Kodak Portra 400 film',  blurb: 'Warm skin tones, fashion gold standard' },
  { id: 'kodak-portra-800', label: 'Kodak Portra 800',   tail: 'on Kodak Portra 800 film',  blurb: 'Creamier, low-light portrait' },
  { id: 'kodak-gold-200',   label: 'Kodak Gold 200',     tail: 'on Kodak Gold 200 film',    blurb: 'Nostalgic golden cast' },
  { id: 'kodak-ektar',      label: 'Kodak Ektar 100',    tail: 'on Kodak Ektar 100 film',   blurb: 'Saturated landscapes' },
  { id: 'fuji-pro-400h',    label: 'Fujifilm Pro 400H',  tail: 'on Fujifilm Pro 400H film', blurb: 'Pastel greens, editorial' },
  { id: 'cinestill-800t',   label: 'Cinestill 800T',     tail: 'on Cinestill 800T film',    blurb: 'Tungsten halation glow' },
  { id: 'cinestill-50d',    label: 'Cinestill 50D',      tail: 'on Cinestill 50D film',     blurb: 'Daylight fine-grain cinema' },
  { id: 'ilford-hp5',       label: 'Ilford HP5 Plus (B&W)', tail: 'on Ilford HP5 Plus black-and-white film', blurb: 'Gritty documentary B&W' },
  { id: 'kodak-trix',       label: 'Kodak Tri-X 400 (B&W)', tail: 'on Kodak Tri-X 400 black-and-white film', blurb: 'Iconic reportage B&W' },
]

// ─── Directors / photographers for style inspiration ─────────────

export const MJ_DIRECTORS: MjKitOption[] = [
  { id: 'none',           label: 'No inspiration', tail: '' },
  { id: 'peter-lindbergh', label: 'Peter Lindbergh',       tail: 'inspired by Peter Lindbergh',       blurb: 'Natural, windswept supermodel B&W' },
  { id: 'steven-meisel',   label: 'Steven Meisel',         tail: 'inspired by Steven Meisel',         blurb: 'Conceptual Vogue editorial' },
  { id: 'mario-testino',   label: 'Mario Testino',         tail: 'inspired by Mario Testino',         blurb: 'Luxury, glossy, colorful' },
  { id: 'annie-leibovitz', label: 'Annie Leibovitz',       tail: 'inspired by Annie Leibovitz',       blurb: 'Theatrical, lit, portrait' },
  { id: 'helmut-newton',   label: 'Helmut Newton',         tail: 'inspired by Helmut Newton',         blurb: 'High-contrast, bold, provocative' },
  { id: 'tim-walker',      label: 'Tim Walker',            tail: 'inspired by Tim Walker',            blurb: 'Dreamy, whimsical, surreal sets' },
  { id: 'paolo-roversi',   label: 'Paolo Roversi',         tail: 'inspired by Paolo Roversi',         blurb: 'Ethereal, painterly, soft focus' },
  { id: 'irving-penn',     label: 'Irving Penn',           tail: 'inspired by Irving Penn',           blurb: 'Clean studio, timeless, minimal' },
  { id: 'wong-kar-wai',    label: 'Wong Kar-wai',          tail: 'inspired by Wong Kar-wai',          blurb: 'Moody neon, longing, atmospheric' },
  { id: 'denis-villeneuve', label: 'Denis Villeneuve',     tail: 'inspired by Denis Villeneuve',      blurb: 'Vast, monumental, muted palette' },
  { id: 'roger-deakins',   label: 'Roger Deakins',         tail: 'inspired by Roger Deakins',         blurb: 'Masterful natural light cinema' },
  { id: 'nan-goldin',      label: 'Nan Goldin',            tail: 'inspired by Nan Goldin',            blurb: 'Intimate, snapshot, raw' },
]

// ─── Lighting recipes ────────────────────────────────────────────

export const MJ_LIGHT_TYPES: MjKitOption[] = [
  { id: 'none',          label: 'Auto',              tail: '' },
  { id: 'rembrandt',     label: 'Rembrandt',         tail: 'Rembrandt lighting',              blurb: 'Triangle of light on cheek' },
  { id: 'butterfly',     label: 'Butterfly',         tail: 'butterfly lighting',              blurb: 'Beauty, shadow under nose' },
  { id: 'split',         label: 'Split',             tail: 'split lighting',                  blurb: 'Half face lit, dramatic' },
  { id: 'loop',          label: 'Loop',              tail: 'loop lighting',                   blurb: 'Classic portrait standard' },
  { id: 'clamshell',     label: 'Clamshell (beauty)', tail: 'clamshell beauty lighting',      blurb: 'Two softboxes, glossy mag' },
  { id: 'rim',           label: 'Rim light',         tail: 'rim lighting',                    blurb: 'Halo behind, separates from BG' },
  { id: 'backlight',     label: 'Backlight',         tail: 'strong backlight',                blurb: 'Silhouette / lens flare' },
  { id: 'golden-hour',   label: 'Golden hour',       tail: 'soft golden hour light',          blurb: 'Warm low sun glow' },
  { id: 'blue-hour',     label: 'Blue hour',         tail: 'cool blue hour light',            blurb: 'Twilight cool ambient' },
  { id: 'overcast-soft', label: 'Overcast',          tail: 'soft overcast daylight',          blurb: 'Even, diffuse, editorial' },
  { id: 'neon',          label: 'Neon',              tail: 'neon-lit, chromatic shadows',     blurb: 'Nighttime colored signage' },
  { id: 'hard-flash',    label: 'Hard flash',        tail: 'direct on-camera flash',          blurb: 'Crunchy, flat, editorial grit' },
  { id: 'candlelight',   label: 'Candlelight',       tail: 'warm candlelight',                blurb: 'Intimate, amber, low' },
  { id: 'window-light',  label: 'Window light',      tail: 'soft window light',               blurb: 'Natural side-lit portrait' },
]

// ─── Time of day ─────────────────────────────────────────────────

export const MJ_TIME_OF_DAY: MjKitOption[] = [
  { id: 'none',         label: 'Auto',          tail: '' },
  { id: 'sunrise',      label: 'Sunrise',       tail: 'at sunrise' },
  { id: 'morning',      label: 'Morning',       tail: 'in the morning' },
  { id: 'midday',       label: 'Midday',        tail: 'at midday' },
  { id: 'afternoon',    label: 'Afternoon',     tail: 'in the afternoon' },
  { id: 'golden-hour',  label: 'Golden hour',   tail: 'during golden hour' },
  { id: 'sunset',       label: 'Sunset',        tail: 'at sunset' },
  { id: 'blue-hour',    label: 'Blue hour',     tail: 'during blue hour' },
  { id: 'night',        label: 'Night',         tail: 'at night' },
]

// ─── Weather / atmosphere ────────────────────────────────────────

export const MJ_WEATHER: MjKitOption[] = [
  { id: 'none',        label: 'Auto',         tail: '' },
  { id: 'sunny',       label: 'Sunny',        tail: 'on a sunny day' },
  { id: 'overcast',    label: 'Overcast',     tail: 'on an overcast day' },
  { id: 'foggy',       label: 'Foggy',        tail: 'in thick fog' },
  { id: 'misty',       label: 'Misty',        tail: 'in soft mist' },
  { id: 'rain',        label: 'Rainy',        tail: 'in gentle rain' },
  { id: 'storm',       label: 'Stormy',       tail: 'in a dramatic storm' },
  { id: 'snow',        label: 'Snowy',        tail: 'in falling snow' },
  { id: 'windy',       label: 'Windy',        tail: 'with strong wind moving hair and fabric' },
  { id: 'dust',        label: 'Dusty',        tail: 'with drifting dust particles in the air' },
  { id: 'smoke',       label: 'Smoky',        tail: 'with atmospheric smoke haze' },
]

// ─── Shot / framing ──────────────────────────────────────────────

export const MJ_SHOT_ANGLES: MjKitOption[] = [
  { id: 'none',            label: 'Auto',              tail: '' },
  { id: 'close-up',        label: 'Close-up',          tail: 'close-up shot',                  blurb: 'Face and shoulders' },
  { id: 'headshot',        label: 'Headshot',          tail: 'tight headshot',                 blurb: 'Head only, tight crop' },
  { id: 'beauty-close',    label: 'Beauty close-up',   tail: 'extreme close-up beauty shot',   blurb: 'Skin, eyes, makeup-focus' },
  { id: 'medium',          label: 'Medium',            tail: 'medium shot',                    blurb: 'Waist up' },
  { id: 'three-quarter',   label: '3/4 length',        tail: 'three-quarter length shot',      blurb: 'Knee up — ideal for outfits' },
  { id: 'full-body',       label: 'Full body',         tail: 'full body shot',                 blurb: 'Head to toe' },
  { id: 'wide',            label: 'Wide',              tail: 'wide environmental shot',        blurb: 'Subject small in frame' },
  { id: 'low-angle',       label: 'Low angle',         tail: 'low angle shot',                 blurb: 'Camera below, heroic' },
  { id: 'high-angle',      label: 'High angle',        tail: 'high angle shot',                blurb: 'Camera above, vulnerable' },
  { id: 'over-shoulder',   label: 'Over shoulder',     tail: 'over-the-shoulder shot',         blurb: 'Narrative, candid' },
  { id: 'dutch-angle',     label: 'Dutch angle',       tail: 'dutch angle shot',               blurb: 'Tilted, unsettling' },
]

// ─── Lookup + tail assembly ──────────────────────────────────────

export const MJ_KITS = {
  photoType: MJ_PHOTO_TYPES,
  camera: [...MJ_STILL_CAMERAS, ...MJ_CINEMA_CAMERAS.filter((c) => c.id !== 'none')],
  filmStock: MJ_ANALOG_FILMS,
  director: MJ_DIRECTORS,
  lighting: MJ_LIGHT_TYPES,
  timeOfDay: MJ_TIME_OF_DAY,
  weather: MJ_WEATHER,
  shotAngle: MJ_SHOT_ANGLES,
} as const

export type MjKitKey = keyof typeof MJ_KITS

export interface MjPhotoKitSelection {
  photoType?: string
  camera?: string
  filmStock?: string
  director?: string
  lighting?: string
  timeOfDay?: string
  weather?: string
  shotAngle?: string
}

/** Look up an option by key + id. Returns undefined if id is missing, 'none', or unknown. */
export function findKitOption(key: MjKitKey, id?: string): MjKitOption | undefined {
  if (!id || id === 'none') return undefined
  return MJ_KITS[key].find((opt) => opt.id === id)
}

/**
 * Assemble the tail snippet that gets appended to the MJ prompt body.
 * Order follows the PDF grammar:
 *   [shot], [time] [weather], [lighting], inspired by [director], [camera] [film]
 */
export function assembleMjPhotoTail(sel: MjPhotoKitSelection): string {
  const parts: string[] = []

  const shot     = findKitOption('shotAngle', sel.shotAngle)
  const time     = findKitOption('timeOfDay', sel.timeOfDay)
  const weather  = findKitOption('weather',   sel.weather)
  const lighting = findKitOption('lighting',  sel.lighting)
  const director = findKitOption('director',  sel.director)
  const camera   = findKitOption('camera',    sel.camera)
  const film     = findKitOption('filmStock', sel.filmStock)

  if (shot)     parts.push(shot.tail)
  if (time)     parts.push(time.tail)
  if (weather)  parts.push(weather.tail)
  if (lighting) parts.push(lighting.tail)
  if (director) parts.push(director.tail)

  // Camera and film read best as one clause
  if (camera && film) {
    parts.push(`${camera.tail} ${film.tail.replace(/^on /, 'on ')}`)
  } else if (camera) {
    parts.push(camera.tail)
  } else if (film) {
    parts.push(film.tail.replace(/^on /, 'shot on '))
  }

  return parts.filter(Boolean).join(', ')
}

/** Get the photo-type opener (goes at the front of the prompt, before the subject). */
export function getMjPhotoTypeOpener(sel: MjPhotoKitSelection): string {
  return findKitOption('photoType', sel.photoType)?.tail ?? ''
}

/** Count how many of the 8 dimensions the user has actually set. */
export function countMjKitSelections(sel: MjPhotoKitSelection): number {
  return (Object.keys(MJ_KITS) as MjKitKey[]).reduce((n, k) => (findKitOption(k, sel[k]) ? n + 1 : n), 0)
}
