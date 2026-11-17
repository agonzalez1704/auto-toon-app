import { useEffect, useSyncExternalStore } from 'react'
import { Alert, Dimensions, Image, StyleSheet, View, type View as RNView } from 'react-native'
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated'
import { FONT, Text } from '@/components/text'
import { theme } from '@/constants/theme'

/**
 * The images that fly between screens (the web's `components/pantallas/vuelo.tsx`): from Crear they gather in a pile
 * over everything, the pile holds while the server creates the story and Historia opens, and then each one flies to
 * its scene. Mounted once above the routes (app/_layout.tsx); the screens talk to it through `vuelo`.
 */

export type Caja = { x: number; y: number; w: number; h: number; r: number }
type Carta = {
  key: number
  src: string
  /** Its number in the selection. */
  n: number
  z: number
  from: Caja
  to: Caja
  /** pila: gathering or holding. vuela: on its way to `to`. funde: goes out where it is. */
  etapa: 'pila' | 'vuela' | 'funde'
  delay: number
  dur: number
  bounce: number
  aterriza?: () => void
}
type Estado = { cartas: Carta[]; pila: { on: boolean; n: number; top: number } }

// The web's timings (seconds), so both feel the same.
const LLEGADA_MS = 15_000
const MARGEN_MS = 1_000
const JUNTAR = { dur: 0.5, bounce: 0.22, entre: 0.05 }
const REPARTIR = { dur: 0.62, bounce: 0.16, entre: 0.08, inicio: 0.08 }
const REGRESAR = { dur: 0.5, bounce: 0.16 }
const GIROS = [-7, 5, -3, 8, -5, 3, -8, 6]

/** Where each image of the pile sits (the web's `posicionesPila` at phone size): the first in the selection on top. */
export function posicionesPila(n: number, vw: number, vh: number): Caja[] {
  const w = 120
  const h = (w * 4) / 3
  const medio = (n - 1) / 2
  const x = vw / 2 - w / 2
  const y = vh * 0.4 - h / 2
  return Array.from({ length: n }, (_, i) => ({ x: x + (i - medio) * 16, y: y - (medio - Math.abs(i - medio)) * 6, w, h, r: GIROS[i % GIROS.length] }))
}

/** A view's box on the screen, in the layer's coordinates (the window). */
export const medir = (el: RNView | null | undefined) =>
  new Promise<Caja | null>((res) => (el ? el.measureInWindow((x, y, w, h) => res(w && h ? { x, y, w, h, r: 0 } : null)) : res(null)))

function crearVuelo() {
  let estado: Estado = { cartas: [], pila: { on: false, n: 0, top: 0 } }
  let reloj: ReturnType<typeof setTimeout> | undefined
  let apiladaEn = 0
  let uid = 0
  const hechas = new Set<number>()
  const oyentes = new Set<() => void>()
  const poner = (cambio: Partial<Estado>) => {
    estado = { ...estado, ...cambio }
    oyentes.forEach((o) => o())
  }

  /** Once per card, whichever comes first: its animation ending or the timer behind it. */
  const aterrizo = (key: number) => {
    const c = estado.cartas.find((x) => x.key === key)
    if (!c || c.etapa === 'pila' || hechas.has(key)) return
    hechas.add(key)
    c.aterriza?.()
    // The real image paints first; only then does its copy leave.
    setTimeout(() => poner({ cartas: estado.cartas.filter((x) => x.key !== key) }), 60)
  }
  const respaldo = (c: Carta) => setTimeout(() => aterrizo(c.key), (c.delay + c.dur) * 1000 + MARGEN_MS)

  /** Back to where they came from: the story was not made. */
  const devolver = () => {
    clearTimeout(reloj)
    const cartas = estado.cartas.map((c): Carta => ({ ...c, etapa: 'vuela', to: { ...c.from, r: 0 }, delay: 0, ...REGRESAR }))
    poner({ cartas, pila: { ...estado.pila, on: false } })
    cartas.forEach(respaldo)
  }

  return {
    subscribe: (o: () => void) => {
      oyentes.add(o)
      return () => void oyentes.delete(o)
    },
    leer: () => estado,
    aterrizo,

    apilar(items: { src: string; desde: Caja }[]) {
      if (!items.length) return
      clearTimeout(reloj)
      const n = items.length
      const { width, height } = Dimensions.get('window')
      const posiciones = posicionesPila(n, width, height)
      const cartas = items.map((it, i): Carta => ({ key: uid++, src: it.src, n: i + 1, z: 100 + n - i, from: it.desde, to: posiciones[i], etapa: 'pila', delay: i * JUNTAR.entre, dur: JUNTAR.dur, bounce: JUNTAR.bounce }))
      poner({ cartas, pila: { on: true, n, top: posiciones[0].y + posiciones[0].h + 34 } })
      apiladaEn = Date.now()
    },

    /** The story exists and its screen is on the way; if it never asks for the pile, the cards go back and say why. */
    esperarPagina(texto: string) {
      clearTimeout(reloj)
      reloj = setTimeout(() => {
        devolver()
        Alert.alert(texto)
      }, LLEGADA_MS)
    },

    devolver,

    /**
     * Each card to its place (`destinos[i]`, or out where it is when it has none). The pile gets its moment even when
     * the server is quick, as on the web. Says false when there is no pile (the story was opened another way).
     */
    repartir(destinos: (Caja | null)[], aterriza: (i: number) => void) {
      clearTimeout(reloj)
      const enPila = estado.cartas.filter((c) => c.etapa === 'pila')
      if (!enPila.length) return false
      const espera = apiladaEn + (500 + enPila.length * 50 + 320) - Date.now()
      reloj = setTimeout(() => {
        const cartas = estado.cartas.map((c, i): Carta => {
          const to = destinos[i]
          if (!to) {
            aterriza(i)
            return { ...c, etapa: 'funde', delay: 0, dur: 0.25 }
          }
          return { ...c, etapa: 'vuela', to, delay: REPARTIR.inicio + i * REPARTIR.entre, dur: REPARTIR.dur, bounce: REPARTIR.bounce, aterriza: () => aterriza(i) }
        })
        poner({ cartas, pila: { ...estado.pila, on: false } })
        cartas.forEach(respaldo)
      }, Math.max(espera, 34))
      return true
    },

    /** Is a pile waiting for its screen? (Historia asks before it shows its images.) */
    enPila: () => estado.cartas.some((c) => c.etapa === 'pila'),
  }
}

export const vuelo = crearVuelo()

/** One card: a spring from where it is to where it goes, or a fade when she asked for less motion. */
function Copia({ c }: { c: Carta }) {
  const quieto = useReducedMotion()
  const x = useSharedValue(quieto ? c.to.x : c.from.x)
  const y = useSharedValue(quieto ? c.to.y : c.from.y)
  const w = useSharedValue(quieto ? c.to.w : c.from.w)
  const h = useSharedValue(quieto ? c.to.h : c.from.h)
  const r = useSharedValue(quieto ? c.to.r : 0)
  const opacidad = useSharedValue(quieto ? 0 : 1)
  const sombra = useSharedValue(0)
  const numero = useSharedValue(0)

  useEffect(() => {
    const fin = () => {
      'worklet'
      runOnJS(vuelo.aterrizo)(c.key)
    }
    if (quieto || c.etapa === 'funde') {
      const t = { duration: 250 }
      if (c.etapa === 'funde') opacidad.value = withTiming(0, t, (ok) => ok && fin())
      else {
        x.value = c.to.x
        y.value = c.to.y
        w.value = c.to.w
        h.value = c.to.h
        r.value = c.to.r
        opacidad.value = withTiming(1, t, (ok) => ok && c.etapa === 'vuela' && fin())
      }
    } else {
      const resorte = { duration: c.dur * 1000, dampingRatio: 1 - c.bounce }
      const ms = c.delay * 1000
      x.value = withDelay(ms, withSpring(c.to.x, resorte, (ok) => ok && c.etapa === 'vuela' && fin()))
      y.value = withDelay(ms, withSpring(c.to.y, resorte))
      w.value = withDelay(ms, withSpring(c.to.w, resorte))
      h.value = withDelay(ms, withSpring(c.to.h, resorte))
      r.value = withDelay(ms, withSpring(c.to.r, resorte))
    }
    sombra.value = withDelay(c.delay * 1000, withTiming(c.etapa === 'pila' ? 1 : 0, { duration: 300 }))
    numero.value = withDelay(c.delay * 1000, withTiming(c.etapa === 'pila' ? 1 : 0, { duration: 200 }))
    // A new stage is a new target: the card animates again from wherever it is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.etapa, c.to.x, c.to.y])

  const estilo = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    width: w.value,
    height: h.value,
    opacity: opacidad.value,
    transform: [{ rotate: `${r.value}deg` }],
    shadowOpacity: 0.6 * sombra.value,
  }))
  const placa = useAnimatedStyle(() => ({ opacity: numero.value }))
  return (
    <Animated.View style={[styles.carta, { zIndex: c.z }, estilo]}>
      {/* Clipped inside, so the card's shadow can fall outside it. */}
      <View style={styles.marco}>
        {/* React Native's Image, as Crear's tiles: the same cache, so the card is the picture from its first frame. */}
        <Image source={{ uri: c.src }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
      <Animated.View style={[styles.numero, placa]}>
        <Text style={styles.numeroTexto}>{c.n}</Text>
      </Animated.View>
    </Animated.View>
  )
}

/** The layer over every route: the dark veil while the pile holds, the cards and «Armando tu historia». */
export function CapaVuelo() {
  const { cartas, pila } = useSyncExternalStore(vuelo.subscribe, vuelo.leer)
  const velo = useSharedValue(0)
  const leyenda = useSharedValue(0)
  useEffect(() => {
    velo.value = withTiming(pila.on ? 0.86 : 0, { duration: 300 })
    leyenda.value = pila.on ? withDelay(250, withTiming(1, { duration: 250 })) : withTiming(0, { duration: 150 })
  }, [pila.on, velo, leyenda])
  const veloEstilo = useAnimatedStyle(() => ({ opacity: velo.value }))
  const leyendaEstilo = useAnimatedStyle(() => ({ opacity: leyenda.value, transform: [{ translateY: (1 - leyenda.value) * 8 }] }))
  if (!cartas.length && !pila.on) return null
  return (
    // While the pile is up, the screen behind doesn't take taps.
    <View pointerEvents={pila.on ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg }, veloEstilo]} />
      {cartas.map((c) => (
        <Copia key={c.key} c={c} />
      ))}
      {pila.n > 0 ? (
        <Animated.View accessibilityRole="text" accessibilityLiveRegion="polite" style={[styles.leyenda, { top: pila.top }, leyendaEstilo]}>
          <Text style={styles.leyendaTitulo}>Armando tu historia</Text>
          <Text style={styles.leyendaNota}>
            {pila.n} {pila.n === 1 ? 'escena' : 'escenas'} · nada se genera todavía
          </Text>
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  carta: { position: 'absolute', borderRadius: 10, backgroundColor: theme.colors.bgElevated, shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowRadius: 18 },
  marco: { ...StyleSheet.absoluteFillObject, borderRadius: 10, overflow: 'hidden' },
  numero: { position: 'absolute', left: 6, top: 6, minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 999, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { fontFamily: FONT.mono, fontSize: 11.5, color: theme.colors.bg },
  leyenda: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 3 },
  leyendaTitulo: { fontSize: 13.5, fontWeight: '500', color: theme.colors.text },
  leyendaNota: { fontSize: 11.5, color: theme.colors.textMuted },
})
