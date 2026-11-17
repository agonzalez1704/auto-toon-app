import { useEffect, useRef, useState } from 'react'
import { MorphIcon } from 'morphicons/react-native'

/** The action arrow of the boards (`.accion`), on the 24-unit grid. */
export const FLECHA = 'M12 19V5M5 12l7-7 7 7'

/** What a tap does, as the web's `data-morph` icons (the boards' paths). */
export const MORPH = {
  generar: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  photobook: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  escribir: 'M4 20h4l10-10-4-4L4 16v4ZM13.5 6.5l4 4',
  movimiento: 'M8 5v14l11-7z',
  luz: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  estilo: 'M12 17v4M8 3h8l-1 6 3 3H6l3-3-1-6Z',
  abrir: 'M7 17 17 7M9 7h8v8',
} as const

/**
 * The arrow on an action (web `components/pantallas/flechas.tsx`, with Morphicons): while the button is held it
 * turns into the icon of what the tap does, and back once it is let go. A phone has no hover: the press is the
 * moment she is about to act, so that is when it shows.
 */
export function FlechaMorph({ icono, activo, size, color, ancho = 2.25 }: { icono?: string; activo: boolean; size: number; color: string; ancho?: number }) {
  return <MorphIcon icon={activo && icono ? icono : FLECHA} size={size} color={color} strokeWidth={ancho} reducedMotion="user" />
}

/** A Pressable's held state: on while pressed, off a moment after release so a quick tap still shows the morph. */
export function usePresion() {
  const [on, setOn] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  return {
    on,
    onPressIn: () => {
      clearTimeout(t.current)
      setOn(true)
    },
    onPressOut: () => {
      t.current = setTimeout(() => setOn(false), 450)
    },
  }
}
