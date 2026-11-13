import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, AppState, Modal, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { VideoView, useVideoPlayer } from 'expo-video'
import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import * as MediaLibrary from 'expo-media-library'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'
import { FONT, Text, TextInput } from '@/components/text'
import { Accion } from '@/components/accion'
import { theme } from '@/constants/theme'
import { miniatura, mxn, terminada, verPedido } from '@/lib/estudio'
import { abrirEnCrear } from '@/stores/use-mesa-abierta'
import { textoDe } from '@/views/estudio/crear/api'
import { createAutoguardado } from '@/lib/historia/autoguardado'
import { nombreArchivo, pasosCorrido, type PasoCorrido } from '@/lib/historia/corrido'
import { clipActual, DURACION_INICIAL, mover, type Escena } from '@/lib/historia/escenas'
import { abrirHistoria, cotizarEscena, generarEscena, guardarHistoria, unirACampana, type Borrador, type Clip, type HistoriaAbierta, type Opciones } from '@/lib/historia/api'

/**
 * Historia, board «Historia» (web `app/(estudio)/historia/historia-view.tsx`, states in «HistoriaEstados»): a scene
 * per image — start, optional end, what happens, duration, engine — each priced before «Generar» and generated
 * on its own; played back to back in «Ver corrido». The server decides what each scene can be (`opciones`).
 * Not here yet: «Un solo video largo» (hidden on the web too) and the pile flying from Crear (see the PR).
 */

const c = theme.colors
const PINK = c.accent2
const PAUSA_MS = 800
/** The web's MOTOR_DEFECTO. A new scene starts with it; if it can't make the scene, the server's options move it. */
const MOTOR_DEFECTO = 'spot25'

/** A slot waiting for an image from the tray; `escena: null` is the new scene of «+ Escena». */
type Hueco = { escena: string | null; slot: 'inicio' | 'fin' }

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })
const reloj = (desde: string, ahora: number) => {
  const s = Math.max(0, Math.floor((ahora - Date.parse(desde)) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const fraseFallo = (u: Clip) => (u.motivo ? `A las ${hora(u.updatedAt)} esta escena no salió. ${u.motivo}` : 'Cancelaste esta escena. No se te cobró.')

/** Ticks while something is generating, for its clock. */
function useAhora(activo: boolean) {
  const [ahora, setAhora] = useState(Date.now)
  useEffect(() => {
    if (!activo) return
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [activo])
  return ahora
}

/** A clip to the phone's photos, named as the web's zip names it. */
async function guardarClip(n: number, url: string) {
  const { status } = await MediaLibrary.requestPermissionsAsync()
  if (status !== 'granted') throw new Error('Sin permiso para guardar en tus fotos.')
  const archivo = `${FileSystem.cacheDirectory}${Date.now()}-${nombreArchivo(n, url)}`
  await FileSystem.downloadAsync(url, archivo)
  await MediaLibrary.saveToLibraryAsync(archivo)
}

export default function HistoriaScreen() {
  const router = useRouter()
  const { id, nueva } = useLocalSearchParams<{ id?: string; nueva?: string }>()
  const q = useQuery({
    queryKey: ['historia', id ?? null],
    queryFn: () => abrirHistoria(id ?? null),
    // While a clip is on its way (from here or from the web), look again: it shows up when it arrives.
    refetchInterval: (x) => (x.state.data?.clips.some((k) => !terminada(k)) ? 4000 : false),
  })
  const atras = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/biblioteca'))

  let cuerpo: ReactNode
  if (q.isLoading) cuerpo = <ActivityIndicator color={c.textDim} style={{ marginTop: 80 }} />
  else if (q.error || q.data === undefined)
    cuerpo = (
      <Vacia titulo="No cargó tu historia" texto={textoDe(q.error, 'Revisa tu conexión y vuelve a intentarlo.')}>
        <Accion label="Intentar otra vez" onPress={() => q.refetch()} cargando={q.isFetching} />
      </Vacia>
    )
  else if (q.data === null)
    cuerpo = (
      <Vacia titulo="Tu primera historia" texto="En Biblioteca, abre una pila con varias tomas y elige «Hacer una historia». Cada imagen abre una escena.">
        <Accion label="Ir a Biblioteca" tono="rosa" lleno onPress={() => router.replace('/(tabs)/biblioteca')} />
      </Vacia>
    )
  else return <Editor key={q.data.id} h={q.data} refrescar={() => q.refetch()} recienHecha={nueva === '1'} />

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[styles.cabecera, { paddingHorizontal: 16 }]}>
          <Volver label="Atrás" onPress={atras} />
        </View>
        {cuerpo}
      </SafeAreaView>
    </View>
  )
}

function Editor({ h, refrescar, recienHecha }: { h: HistoriaAbierta; refrescar: () => void; recienHecha: boolean }) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  // An image deleted from Biblioteca leaves its slot: the server would refuse every save of a story that still names it.
  const [d, setD] = useState<Borrador>(() => ({
    name: h.name,
    modo: h.modo,
    largo: h.largo,
    escenas: h.escenas.map((e) => ({ ...e, inicio: e.inicio && h.urls[e.inicio] ? e.inicio : null, fin: e.fin && h.urls[e.fin] ? e.fin : null })),
  }))
  const vivo = useRef(d)
  const opcionesRef = useRef(h.opciones)
  const [opciones, setOpciones] = useState(h.opciones)
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [activaId, setActivaId] = useState(() => (h.escenas.find((e) => !clipActual(h.clips, e.id)) ?? h.escenas[0])?.id ?? null)
  const [espera, setEspera] = useState<Hueco | null>(null)
  const [escribiendo, setEscribiendo] = useState<string | null>(null)
  const [pidiendo, setPidiendo] = useState<string[]>([])
  const [holds, setHolds] = useState<string[]>([])
  const [aviso, setAviso] = useState<string | null>(null)
  const [menu, setMenu] = useState<'historias' | 'campana' | null>(null)
  const [uniendo, setUniendo] = useState(false)
  const [corrido, setCorrido] = useState<PasoCorrido[] | null>(null)
  const guardadoFallo = useRef(false)
  const alGuardar = useRef<(ops: Record<string, Opciones>, guardado: Borrador) => void>(() => {})

  const [auto] = useState(() =>
    createAutoguardado<Borrador>(async (b) => {
      setEscribiendo(null)
      try {
        const r = await guardarHistoria(h.id, { ...b, name: b.name.trim() || h.name })
        guardadoFallo.current = false
        opcionesRef.current = { ...opcionesRef.current, ...r.opciones }
        setOpciones(opcionesRef.current)
        alGuardar.current(r.opciones, b)
      } catch (err) {
        guardadoFallo.current = true
        setAviso(textoDe(err, 'No pudimos guardar tu historia. Revisa tu conexión.'))
      }
    }, PAUSA_MS),
  )

  const editar = useCallback(
    (cambio: (b: Borrador) => Borrador) => {
      const b = cambio(vivo.current)
      if (b === vivo.current) return
      vivo.current = b
      setD(b)
      auto.cambiar(b)
    },
    [auto],
  )
  const editarEscena = (id: string, cambio: Partial<Escena>) => editar((b) => ({ ...b, escenas: b.escenas.map((x) => (x.id === id ? { ...x, ...cambio } : x)) }))
  const olvidar = (id: string) => {
    setNotas((n) => ({ ...n, [id]: '' }))
    setErrores((x) => ({ ...x, [id]: '' }))
  }

  // A scene whose engine can't make it anymore moves to the one the server names, and says so — unless she
  // changed its engine since that save.
  alGuardar.current = (ops, guardado) => {
    const nuevas: Record<string, string> = {}
    const escenas = vivo.current.escenas.map((e) => {
      const cambio = ops[e.id]?.cambio
      if (!cambio || guardado.escenas.find((x) => x.id === e.id)?.motor !== e.motor) return e
      nuevas[e.id] = `${cambio.de} ya no puede con esta escena. La pasamos a ${cambio.a.nombre} y el precio cambió.`
      return { ...e, motor: cambio.a.id }
    })
    if (!Object.keys(nuevas).length) return
    setNotas((n) => ({ ...n, ...nuevas }))
    editar((b) => ({ ...b, escenas }))
  }

  // On opening: an engine that stopped being able moves, and what was stripped of deleted images is saved and said.
  useEffect(() => {
    alGuardar.current(h.opciones, vivo.current)
    const sinInicio = h.escenas.some((e) => e.inicio && !h.urls[e.inicio])
    const sinFin = h.escenas.some((e) => e.fin && !h.urls[e.fin])
    if (!sinInicio && !sinFin) return
    auto.cambiar(vivo.current)
    setAviso(
      [
        sinFin && 'Una imagen de fin ya no está en tu biblioteca y la quitamos de su escena.',
        sinInicio && 'A una escena le falta su imagen de inicio porque ya no está en tu biblioteca. Pon otra.',
      ]
        .filter(Boolean)
        .join(' '),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Leaving, or going to the background, must not lose the last words.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && void auto.vaciar())
    return () => {
      sub.remove()
      void auto.vaciar()
    }
  }, [auto])

  // Her own requests are watched until they end (looking is what moves them along); then the story is read again.
  const pedidos = useQueries({
    queries: holds.map((hold) => ({ queryKey: ['pedido', hold], queryFn: () => verPedido(hold), refetchInterval: (x: { state: { data?: { status: string }[] } }) => (x.state.data?.length && x.state.data.every(terminada) ? false : 2500) })),
  })
  const terminados = pedidos.filter((p) => p.data?.length && p.data.every(terminada)).length
  useEffect(() => {
    if (terminados) refrescar()
  }, [terminados, refrescar])

  const ahora = useAhora(h.clips.some((k) => !terminada(k)))
  const activa = d.escenas.some((e) => e.id === activaId) ? activaId : (d.escenas[0]?.id ?? null)
  const segundos = d.escenas.reduce((n, e) => n + e.duracionS, 0)

  /** What gets charged or joined is what the server has: the last words first, and a save that failed gets one more try. */
  const vaciar = async () => {
    if (guardadoFallo.current) auto.cambiar(vivo.current)
    await auto.vaciar()
    return !guardadoFallo.current
  }

  const generar = async (e: Escena) => {
    setPidiendo((p) => [...p, e.id])
    olvidar(e.id)
    try {
      if (!(await vaciar())) return
      const o = opcionesRef.current[e.id]
      if (!o?.motores.some((m) => m.id === vivo.current.escenas.find((x) => x.id === e.id)?.motor)) return
      const r = await generarEscena({ historiaId: h.id, escena: e.id, firma: o.firma })
      setHolds((x) => [...x, r.holdId])
      refrescar()
    } catch (err) {
      setErrores((x) => ({ ...x, [e.id]: textoDe(err, 'No pudimos pedir esta escena. No se generó ni se cobró nada.') }))
    } finally {
      setPidiendo((p) => p.filter((x) => x !== e.id))
    }
  }

  const borrar = (e: Escena, conClip: boolean) => {
    const fuera = () => {
      setEspera((x) => (x?.escena === e.id ? null : x))
      editar((b) => ({ ...b, escenas: b.escenas.filter((x) => x.id !== e.id) }))
    }
    if (!conClip) return fuera()
    Alert.alert('¿Borrar esta escena?', 'Su clip se queda en tu Biblioteca.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: fuera },
    ])
  }

  const tocarImagen = async (imagen: string) => {
    const pedido = espera?.escena ? { escena: espera.escena, slot: espera.slot } : null
    const nueva: Escena | null = pedido ? null : { id: Crypto.randomUUID(), inicio: imagen, fin: null, texto: '', duracionS: DURACION_INICIAL, motor: MOTOR_DEFECTO }
    const previa = pedido ? (vivo.current.escenas.find((e) => e.id === pedido.escena)?.[pedido.slot] ?? null) : null
    setEspera(null)
    if (nueva) editar((b) => ({ ...b, escenas: [...b.escenas, nueva] }))
    else editarEscena(pedido!.escena, { [pedido!.slot]: imagen })
    setActivaId(nueva?.id ?? pedido!.escena)
    await auto.vaciar()
    if (!guardadoFallo.current) return
    // Refused (another shape, gone from Biblioteca, too many scenes): it comes back out, or every later save fails too.
    if (nueva) editar((b) => ({ ...b, escenas: b.escenas.filter((x) => x.id !== nueva.id) }))
    else if (vivo.current.escenas.find((e) => e.id === pedido!.escena)?.[pedido!.slot] === imagen) editarEscena(pedido!.escena, { [pedido!.slot]: previa })
  }

  const alternarEspera = (x: Hueco) => setEspera((y) => (y?.escena === x.escena && y?.slot === x.slot ? null : x))

  const unir = async (campaignId: string | null) => {
    setMenu(null)
    setUniendo(true)
    setAviso(null)
    try {
      // A scene just deleted must not bring its clip along.
      if (!(await vaciar())) return
      await unirACampana(h.id, campaignId)
      refrescar()
    } catch (err) {
      setAviso(textoDe(err, 'No pudimos agregarla a la campaña. Intenta otra vez.'))
    } finally {
      setUniendo(false)
    }
  }

  const cambiarHistoria = async (id: string) => {
    setMenu(null)
    if (id === h.id) return
    await auto.vaciar()
    router.setParams({ id, nueva: undefined })
  }

  const verCorrido = () => {
    const pasos = pasosCorrido(d.escenas, h.clips, h.urls)
    if (!pasos.length) return setAviso('Todavía no hay nada que ver: agrega una imagen a una escena.')
    setCorrido(pasos)
  }

  const volver = () => {
    void auto.vaciar()
    if (h.mesa) abrirEnCrear(h.mesa.id)
    else if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/biblioteca')
  }

  const listos = d.escenas.flatMap((e, i) => {
    const url = clipActual(h.clips.filter((k) => k.videoUrl), e.id)?.videoUrl
    return url ? [{ n: i + 1, url }] : []
  })
  const [bajando, setBajando] = useState(false)
  const descargarTodo = async () => {
    if (!listos.length) return setAviso('Todavía no hay clips listos para descargar.')
    setBajando(true)
    let n = 0
    try {
      for (const k of listos) {
        n = k.n
        await guardarClip(k.n, k.url)
      }
      setAviso(`${listos.length === 1 ? 'Tu clip está' : `Tus ${listos.length} clips están`} en tus fotos.`)
    } catch {
      setAviso(`No pudimos bajar el clip de la escena ${n || 1}. Intenta de nuevo.`)
    } finally {
      setBajando(false)
    }
  }

  const nEspera = espera?.escena ? d.escenas.findIndex((e) => e.id === espera.escena) + 1 : 0
  const destino = !espera ? null : nEspera ? `${espera.slot === 'fin' ? 'el fin' : 'el inicio'} de la escena ${nEspera}` : 'una escena nueva'
  const campanaLabel = h.campana ? `En campaña: ${h.campana.name}` : uniendo ? 'Agregando…' : 'Agregar a campaña'

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 10, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={styles.cabecera}>
            <Volver label={h.mesa?.name ?? 'Atrás'} onPress={volver} />
            <Text style={styles.meta}>
              {d.escenas.length} {d.escenas.length === 1 ? 'escena' : 'escenas'} · {segundos} s
            </Text>
          </View>
          <View style={styles.tituloFila}>
            <Text style={styles.titulo}>Historia</Text>
            <TextInput
              value={d.name}
              onChangeText={(t) => editar((b) => ({ ...b, name: t.slice(0, 80) }))}
              accessibilityLabel="Nombre de la historia"
              placeholder={h.name}
              placeholderTextColor={c.textDim}
              style={styles.nombre}
            />
            <Pressable onPress={() => setMenu('historias')} hitSlop={6} accessibilityRole="button" accessibilityLabel="Cambiar de historia" style={styles.ico}>
              <Icono d="m6 9 6 6 6-6" />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pastilla label="Ver corrido" onPress={verCorrido} morph="M7 5v14l12-7z" />
            <Pastilla label={campanaLabel} onPress={() => (h.campana ? router.push(`/campanas/${h.campana.id}`) : !uniendo && setMenu('campana'))} rosa cargando={uniendo} />
          </View>
          {aviso ? (
            <Pressable onPress={() => setAviso(null)} accessibilityRole="button" accessibilityHint="Cierra el aviso" style={styles.aviso}>
              <Text style={styles.avisoTexto}>{aviso}</Text>
            </Pressable>
          ) : null}

          {d.escenas.map((e, i) => (
            <Animated.View key={e.id} entering={recienHecha ? FadeIn.delay(80 + i * 80).duration(420) : undefined}>
              <EscenaCard
                e={e}
                n={i + 1}
                total={d.escenas.length}
                h={h}
                o={opciones[e.id]}
                abierta={e.id === activa}
                espera={espera?.escena === e.id ? espera.slot : null}
                escribiendo={escribiendo === e.id}
                apartando={pidiendo.includes(e.id)}
                nota={notas[e.id] ?? ''}
                errorEnvio={errores[e.id] ?? ''}
                ahora={ahora}
                abrir={() => setActivaId(e.id)}
                pedir={(slot) => alternarEspera({ escena: e.id, slot })}
                quitarFin={() => editarEscena(e.id, { fin: null })}
                texto={(t) => {
                  setEscribiendo(e.id)
                  editarEscena(e.id, { texto: t })
                }}
                duracion={(s) => editarEscena(e.id, { duracionS: s })}
                motor={(m) => {
                  olvidar(e.id)
                  editarEscena(e.id, { motor: m })
                }}
                generar={() => generar(e)}
                ver={(src) => setCorrido([{ tipo: 'clip', src, duracionS: e.duracionS, etiqueta: '' }])}
                subir={() => editar((b) => ({ ...b, escenas: mover(b.escenas, b.escenas.findIndex((x) => x.id === e.id), -1) }))}
                bajar={() => editar((b) => ({ ...b, escenas: mover(b.escenas, b.escenas.findIndex((x) => x.id === e.id), 1) }))}
                borrar={(conClip) => borrar(e, conClip)}
              />
            </Animated.View>
          ))}
          <Pressable
            onPress={() => alternarEspera({ escena: null, slot: 'inicio' })}
            accessibilityRole="button"
            accessibilityLabel="Agregar escena"
            style={[styles.agregar, espera && !espera.escena && styles.espera]}
          >
            <Text style={[styles.agregarTexto, espera && !espera.escena && { color: c.accent }]}>+ Escena</Text>
          </Pressable>
        </ScrollView>

        <Animated.View entering={recienHecha ? FadeInDown.delay(550).duration(400) : undefined} style={[styles.tira, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Text style={[styles.tiraTexto, destino ? { color: c.accent } : null]}>
            {destino ? `Toca una imagen: será ${destino}` : `Tus imágenes${h.mesa ? ` de ${h.mesa.name}` : ''} · toca una para abrir otra escena`}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {h.imagenes.map((img) => {
              const usos = d.escenas.flatMap((e, i) => (e.inicio === img.id || e.fin === img.id ? [i + 1] : [])).join(',')
              return (
                <Pressable key={img.id} onPress={() => tocarImagen(img.id)} accessibilityRole="button" accessibilityLabel="Usar esta imagen" style={[styles.tiraImg, destino ? { borderColor: c.accent } : null]}>
                  <Image source={{ uri: miniatura(img.url, 50) ?? img.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  {usos ? <Text style={styles.usos}>{usos}</Text> : null}
                </Pressable>
              )
            })}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>

      <Menu
        visible={menu === 'historias'}
        titulo="Tus historias"
        opciones={h.lista.map((x) => ({ label: x.id === h.id ? d.name || x.name : x.name, on: x.id === h.id, onPress: () => cambiarHistoria(x.id) }))}
        cerrar={() => setMenu(null)}
      />
      <Menu
        visible={menu === 'campana'}
        titulo="Agregar a campaña"
        opciones={[
          ...h.campanas.slice(0, 8).map((x) => ({ label: x.name, onPress: () => unir(x.id) })),
          { label: h.hayLibres ? 'Campaña nueva' : 'Nueva: sin imágenes libres', disabled: !h.hayLibres, onPress: () => unir(null) },
        ]}
        cerrar={() => setMenu(null)}
      />
      {corrido ? <Corrido pasos={corrido} cerrar={() => setCorrido(null)} descargarTodo={descargarTodo} bajando={bajando} /> : null}
    </View>
  )
}

function EscenaCard(p: {
  e: Escena
  n: number
  total: number
  h: HistoriaAbierta
  o: Opciones | undefined
  abierta: boolean
  espera: Hueco['slot'] | null
  escribiendo: boolean
  apartando: boolean
  nota: string
  errorEnvio: string
  ahora: number
  abrir: () => void
  pedir: (slot: Hueco['slot']) => void
  quitarFin: () => void
  texto: (t: string) => void
  duracion: (s: number) => void
  motor: (id: string) => void
  generar: () => void
  ver: (src: string) => void
  subir: () => void
  bajar: () => void
  borrar: (conClip: boolean) => void
}) {
  const { e, h, o, abierta } = p
  const inicioSrc = e.inicio ? h.urls[e.inicio] : undefined
  const finSrc = e.fin ? h.urls[e.fin] : undefined
  const intentos = h.clips.filter((k) => k.escena === e.id)
  const ultimo = intentos.reduce<Clip | null>((a, k) => (!a || k.createdAt > a.createdAt ? k : a), null)
  const clip = clipActual(intentos.filter((k) => k.videoUrl), e.id)
  const generando = !!ultimo && !terminada(ultimo)
  const fallo = ultimo?.status === 'failed'
  const cambio = !!clip?.firma && !!o && clip.firma !== o.firma
  const motorOk = !!o?.motores.some((m) => m.id === e.motor)
  const [bajando, setBajando] = useState(false)
  const [notaClip, setNotaClip] = useState('')

  const precio = useQuery({
    queryKey: ['historia-precio', e.motor, inicioSrc, o?.aspecto, e.duracionS],
    queryFn: () => cotizarEscena({ kind: e.motor, url: inicioSrc!, aspect: o!.aspecto, durationS: e.duracionS }),
    enabled: !!inicioSrc && !!o && motorOk,
    staleTime: 5 * 60_000,
  })
  const precioTexto = precio.data ? mxn(precio.data.totalCents) : ''

  const error = !inicioSrc ? 'La imagen ya no está en tu biblioteca. Pon otra; no se generó ni se cobró nada.' : p.errorEnvio || (fallo && ultimo ? fraseFallo(ultimo) : '')
  const [estado, estadoColor] = p.espera
    ? ['Esperando imagen', c.accent]
    : generando
      ? [`Generando · ${reloj(ultimo.createdAt, p.ahora)}`, c.textMuted]
      : fallo
        ? ['Falló', c.text]
        : clip
          ? [`${clip.priceCents == null ? '' : `${mxn(clip.priceCents)} · `}Lista`, PINK]
          : p.escribiendo
            ? ['Escribiendo', c.textMuted]
            : ['Sin generar', c.textDim]
  const generarLabel = p.apartando ? 'Apartando…' : generando ? 'Generando…' : fallo ? 'Reintentar' : clip ? 'Rehacer' : 'Generar'
  const lleno = !(generando || p.apartando || (clip && !cambio && !fallo))
  const faltan = o ? [...o.faltan.map((f) => `${f.nombre}: ${f.porque.toLowerCase()}.`), o.finPosible ? '' : 'Todavía ningún motor acepta imagen de fin.'].filter(Boolean).join(' ') : ''

  const bajar = async () => {
    if (!clip?.videoUrl) return
    setBajando(true)
    try {
      await guardarClip(p.n, clip.videoUrl)
      setNotaClip('Está en tus fotos.')
    } catch {
      setNotaClip('No pudimos guardarlo. Intenta otra vez.')
    } finally {
      setBajando(false)
    }
  }

  const slots = (
    <View style={[styles.slots, { width: abierta ? '100%' : 100 }]}>
      <Slot
        src={inicioSrc}
        etiqueta={abierta ? 'Inicio' : null}
        vacio="+ Inicio"
        nota={abierta ? 'falta' : null}
        esperando={p.espera === 'inicio'}
        onPedir={() => p.pedir('inicio')}
        onVer={clip?.videoUrl && abierta ? () => p.ver(clip.videoUrl!) : undefined}
        play={!!clip && abierta}
      />
      <Icono d="M5 12h14M13 6l6 6-6 6" color={c.textDisabled} lado={abierta ? 14 : 10} />
      <Slot
        src={finSrc}
        etiqueta={abierta ? 'Fin' : null}
        vacio="+ Fin"
        nota={abierta ? 'opcional' : null}
        esperando={p.espera === 'fin'}
        onPedir={o?.finPosible ? () => p.pedir('fin') : undefined}
        onQuitar={abierta ? p.quitarFin : undefined}
      />
      {generando ? <View pointerEvents="none" style={styles.generando} /> : null}
    </View>
  )

  if (!abierta)
    return (
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {slots}
          <Pressable onPress={p.abrir} accessibilityRole="button" accessibilityLabel={`Abrir la escena ${p.n}`} style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={styles.escenaN}>Escena {p.n}</Text>
              <Text style={[styles.estado, { color: estadoColor, fontSize: 11.5 }]}>{estado}</Text>
            </View>
            <Text numberOfLines={2} style={[styles.previa, !e.texto && { color: c.textDisabled }]}>
              {e.texto || 'Sin escribir todavía'}
            </Text>
          </Pressable>
        </View>
      </View>
    )

  return (
    <View style={[styles.card, { borderColor: c.accent }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 30 }}>
        <Text style={styles.escenaN}>Escena {p.n}</Text>
        <Text style={[styles.estado, { color: estadoColor }]} numberOfLines={1}>
          {estado}
        </Text>
        <View style={{ marginLeft: 'auto', flexDirection: 'row' }}>
          <IcoBoton d="m6 15 6-6 6 6" label="Mover antes" off={p.n === 1} onPress={p.subir} />
          <IcoBoton d="m6 9 6 6 6-6" label="Mover después" off={p.n === p.total} onPress={p.bajar} />
          <IcoBoton d="M6 6l12 12M18 6 6 18" label="Borrar la escena" onPress={() => p.borrar(!!clip || generando)} />
        </View>
      </View>
      {slots}
      <View style={{ gap: 5 }}>
        <TextInput
          value={e.texto}
          onChangeText={p.texto}
          multiline
          maxLength={1500}
          placeholder="¿Qué pasa aquí? Cámara, luz, sonido…"
          placeholderTextColor={c.textDim}
          accessibilityLabel={`Qué pasa en la escena ${p.n}`}
          style={styles.campo}
        />
        {e.texto ? null : <Text style={styles.linea}>Sin texto sale con un solo gesto y la cámara casi quieta.</Text>}
      </View>
      {o ? (
        <View style={{ gap: 8 }}>
          <View style={styles.chips}>
            {o.duraciones.map((s) => (
              <Chip key={s} label={`${s} s`} on={s === e.duracionS} mono onPress={() => p.duracion(s)} />
            ))}
          </View>
          <View style={styles.chips}>
            {o.motores.map((m) => (
              <Chip key={m.id} label={m.nombre} on={m.id === e.motor} onPress={() => p.motor(m.id)} />
            ))}
          </View>
          {faltan ? <Text style={styles.linea}>{faltan}</Text> : null}
        </View>
      ) : (
        <ActivityIndicator color={c.textDim} style={{ alignSelf: 'flex-start' }} />
      )}
      {p.nota ? <Text style={styles.nota}>{p.nota}</Text> : null}
      {cambio ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={styles.puntito} />
          <Text style={{ fontSize: 12, color: c.text }}>Cambió desde este clip. Rehazlo para verlo.</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.error}>
          <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.text }}>{error}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {clip?.videoUrl ? <Pastilla label="Descargar" onPress={bajar} morph="M12 4v11M7 11l5 5 5-5M5 20h14" cargando={bajando} /> : null}
        <View style={{ flex: 1 }}>
          <Accion
            label={generarLabel}
            detalle={generando || p.apartando ? undefined : precio.isFetching && !precio.data ? '…' : precioTexto}
            onPress={p.generar}
            lleno={lleno}
            disabled={!motorOk || !inicioSrc || !precio.data || generando || p.apartando}
            cargando={p.apartando}
          />
        </View>
      </View>
      {notaClip ? <Text style={styles.linea}>{notaClip}</Text> : null}
    </View>
  )
}

function Slot(p: { src?: string; etiqueta: string | null; vacio: string; nota: string | null; esperando: boolean; onPedir?: () => void; onQuitar?: () => void; onVer?: () => void; play?: boolean }) {
  if (!p.src)
    return (
      <Pressable
        onPress={p.onPedir}
        disabled={!p.onPedir}
        accessibilityRole="button"
        accessibilityLabel={p.vacio === '+ Fin' ? 'Poner imagen de fin' : 'Poner imagen de inicio'}
        style={[styles.slot, styles.slotVacio, p.esperando && styles.espera, !p.onPedir && { opacity: 0.4 }]}
      >
        <Text style={[styles.slotVacioTexto, p.esperando && { color: c.accent }]}>{p.vacio}</Text>
        {p.nota ? <Text style={{ fontSize: 10.5, color: c.textDisabled }}>{p.nota}</Text> : null}
      </Pressable>
    )
  return (
    <Pressable onPress={p.onVer} disabled={!p.onVer} accessibilityRole={p.onVer ? 'button' : 'image'} accessibilityLabel={p.onVer ? 'Ver el clip' : (p.etiqueta ?? 'Imagen')} style={styles.slot}>
      <Image source={{ uri: miniatura(p.src, 170) ?? p.src }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      {p.play ? (
        <View pointerEvents="none" style={styles.centro}>
          <View style={styles.play}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path d="M7 5v14l12-7z" fill={c.text} />
            </Svg>
          </View>
        </View>
      ) : null}
      {p.etiqueta ? <Text style={styles.etiqueta}>{p.etiqueta}</Text> : null}
      {p.onQuitar ? (
        <Pressable onPress={p.onQuitar} hitSlop={6} accessibilityRole="button" accessibilityLabel="Quitar el fin" style={styles.quitar}>
          <Icono d="M6 6l12 12M18 6 6 18" lado={13} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}

/** «Ver corrido»: the scenes back to back — a clip plays to its end, a still holds for its scene's duration. */
function Corrido({ pasos, cerrar, descargarTodo, bajando }: { pasos: PasoCorrido[]; cerrar: () => void; descargarTodo: () => void; bajando: boolean }) {
  const [i, setI] = useState(0)
  const paso = pasos[i]
  const avanzar = useCallback(() => (i + 1 >= pasos.length ? cerrar() : setI(i + 1)), [i, pasos.length, cerrar])
  useEffect(() => {
    if (paso.tipo !== 'imagen') return
    const t = setTimeout(avanzar, paso.duracionS * 1000)
    return () => clearTimeout(t)
  }, [paso, avanzar])
  return (
    <Modal visible animationType="fade" onRequestClose={cerrar} presentationStyle="fullScreen">
      <View style={styles.corrido}>
        <Pressable onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.cerrar}>
          <Icono d="M6 6l12 12M18 6 6 18" lado={18} />
        </Pressable>
        <View style={styles.pantalla}>
          {paso.tipo === 'clip' ? <ClipVideo key={i} src={paso.src} alTerminar={avanzar} /> : <Image source={{ uri: paso.src }} style={StyleSheet.absoluteFill} contentFit="cover" />}
          <Text style={styles.corridoEtiqueta}>{`Escena ${i + 1} de ${pasos.length}${paso.etiqueta ? ` · ${paso.etiqueta}` : ''}`}</Text>
        </View>
        <Text style={styles.corridoAviso}>El sonido de cada escena se genera aparte; la música puede cambiar entre escenas.</Text>
        <Pastilla label="Descargar todo" onPress={descargarTodo} morph="M12 4v11M7 11l5 5 5-5M5 20h14" cargando={bajando} />
      </View>
    </Modal>
  )
}

function ClipVideo({ src, alTerminar }: { src: string; alTerminar: () => void }) {
  const player = useVideoPlayer(src, (pl) => pl.play())
  useEffect(() => {
    const sub = player.addListener('playToEnd', alTerminar)
    return () => sub.remove()
  }, [player, alTerminar])
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
}

function Menu({ visible, titulo, opciones, cerrar }: { visible: boolean; titulo: string; opciones: { label: string; on?: boolean; disabled?: boolean; onPress: () => void }[]; cerrar: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <Pressable style={styles.velo} onPress={cerrar} accessibilityLabel="Cerrar">
        <View style={styles.menu}>
          <Text style={styles.menuTitulo}>{titulo}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {opciones.map((x, k) => (
              <Pressable key={k} onPress={x.onPress} disabled={x.disabled} accessibilityRole="button" style={({ pressed }) => [styles.menuOpcion, pressed && { backgroundColor: c.bgOverlay }, x.disabled && { opacity: 0.45 }]}>
                <Text numberOfLines={1} style={[styles.menuTexto, x.on && { color: c.accent }]}>
                  {x.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  )
}

function Vacia({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <View style={styles.vacia}>
      <Text style={[styles.titulo, { fontSize: 40, lineHeight: 42, textAlign: 'center' }]}>{titulo}</Text>
      <Text style={{ maxWidth: 340, fontSize: 14, lineHeight: 21, color: c.textMuted, textAlign: 'center' }}>{texto}</Text>
      {children}
    </View>
  )
}

function Volver({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Volver a ${label}`} style={styles.volver}>
      <Icono d="m15 6-6 6 6 6" />
      <Text numberOfLines={1} style={{ fontSize: 13, color: c.text, maxWidth: 180 }}>
        {label}
      </Text>
    </Pressable>
  )
}

/** The board's small action: a pill with the round arrow — green stays here, pink goes on to another screen. */
function Pastilla({ label, onPress, rosa = false, cargando = false, morph }: { label: string; onPress: () => void; rosa?: boolean; cargando?: boolean; morph?: string }) {
  const color = rosa ? PINK : c.accent
  return (
    <Pressable onPress={onPress} disabled={cargando} accessibilityRole="button" style={({ pressed }) => [styles.pastilla, pressed && { opacity: 0.85 }]}>
      <Text numberOfLines={1} style={{ fontSize: 13.5, color: c.text, flexShrink: 1 }}>
        {label}
      </Text>
      <View style={[styles.flecha, { backgroundColor: color }]}>
        {cargando ? <ActivityIndicator size="small" color={c.bg} /> : <Icono d={morph ?? 'M12 19V5M5 12l7-7 7 7'} lado={13} ancho={2.25} color={c.bg} />}
      </View>
    </Pressable>
  )
}

function Chip({ label, on, mono = false, onPress }: { label: string; on: boolean; mono?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipTexto, mono && { fontFamily: FONT.mono }, on && { color: c.text }]}>{label}</Text>
    </Pressable>
  )
}

function IcoBoton({ d, label, off = false, onPress }: { d: string; label: string; off?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={off} hitSlop={4} accessibilityRole="button" accessibilityLabel={label} style={[styles.ico, off && { opacity: 0.35 }]}>
      <Icono d={d} />
    </Pressable>
  )
}

function Icono({ d, lado = 16, ancho = 1.75, color = c.textDim }: { d: string; lado?: number; ancho?: number; color?: string }) {
  return (
    <Svg width={lado} height={lado} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={ancho} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 40 },
  meta: { fontFamily: FONT.mono, fontSize: 12, color: c.textDim },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 34, paddingLeft: 7, paddingRight: 13, borderRadius: 999, borderWidth: 1, borderColor: c.border },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titulo: { fontFamily: FONT.display, fontSize: 34, lineHeight: 36, textTransform: 'uppercase', color: c.text },
  nombre: { flex: 1, minWidth: 0, height: 34, paddingHorizontal: 8, borderRadius: 8, fontSize: 15, color: c.text },
  ico: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pastilla: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingLeft: 14, paddingRight: 5, borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.bgElevated },
  flecha: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  aviso: { padding: 12, borderRadius: 12, backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.borderStrong },
  avisoTexto: { fontSize: 13, lineHeight: 19, color: c.text },
  card: { gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, borderRadius: 16, backgroundColor: c.bgRaised, borderWidth: 1, borderColor: c.border },
  escenaN: { fontSize: 14, fontWeight: '600', color: c.text },
  estado: { flexShrink: 1, fontFamily: FONT.mono, fontSize: 12 },
  previa: { fontSize: 12.5, lineHeight: 17, color: c.textMuted },
  slots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slot: { flex: 1, aspectRatio: 3 / 4, borderRadius: 10, backgroundColor: c.bgOverlay, overflow: 'hidden' },
  slotVacio: { alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong },
  slotVacioTexto: { fontSize: 12.5, color: c.textMuted },
  espera: { borderColor: c.accent, borderStyle: 'solid' },
  etiqueta: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(10,10,10,0.68)', fontFamily: FONT.mono, fontSize: 10.5, color: c.text },
  quitar: { position: 'absolute', right: 5, top: 5, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,10,0.68)' },
  centro: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  play: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,10,0.68)' },
  generando: { ...StyleSheet.absoluteFillObject, borderRadius: 10, backgroundColor: 'rgba(10,10,10,0.58)' },
  campo: { minHeight: 100, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 9, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, fontSize: 14, lineHeight: 20, color: c.text, textAlignVertical: 'top' },
  linea: { fontSize: 12, lineHeight: 17, color: c.textDim },
  nota: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, overflow: 'hidden', backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.borderStrong, fontSize: 12, lineHeight: 17, color: c.text },
  puntito: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent },
  error: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.borderStrong },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised },
  chipOn: { borderColor: c.text, backgroundColor: c.bgOverlay },
  chipTexto: { fontSize: 12, color: c.textMuted },
  agregar: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong },
  agregarTexto: { fontSize: 14, color: c.textMuted },
  tira: { gap: 6, paddingTop: 8, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg },
  tiraTexto: { fontSize: 12, color: c.textMuted },
  tiraImg: { width: 50, height: 66, borderRadius: 8, overflow: 'hidden', backgroundColor: c.bgOverlay, borderWidth: 1, borderColor: 'transparent' },
  usos: { position: 'absolute', left: 3, top: 3, paddingHorizontal: 5, borderRadius: 999, overflow: 'hidden', backgroundColor: c.accent, color: c.bg, fontFamily: FONT.mono, fontSize: 10 },
  vacia: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  menu: { borderRadius: 16, backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.borderStrong, paddingVertical: 8 },
  menuTitulo: { paddingHorizontal: 16, paddingVertical: 8, fontFamily: FONT.mono, fontSize: 12, color: c.textDim },
  menuOpcion: { paddingHorizontal: 16, paddingVertical: 13 },
  menuTexto: { fontSize: 15, color: c.text },
  corrido: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16 },
  cerrar: { position: 'absolute', top: 56, right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bgRaised },
  pantalla: { width: '100%', maxWidth: 343, aspectRatio: 3 / 4, borderRadius: 20, overflow: 'hidden', backgroundColor: c.bgOverlay },
  corridoEtiqueta: { position: 'absolute', left: 12, top: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(10,10,10,0.68)', fontFamily: FONT.mono, fontSize: 12, color: c.text },
  corridoAviso: { maxWidth: 340, textAlign: 'center', fontSize: 13, lineHeight: 19, color: c.textMuted },
})
