import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Image, type ImageContentPosition } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import Svg, { Path } from 'react-native-svg'
import { Accion } from '@/components/accion'
import { FONT, Text, TextInput } from '@/components/text'
import { theme } from '@/constants/theme'
import { miniatura, mxn } from '@/lib/estudio'
import {
  alternarToma, escenasDe, estadoDe, etiquetaGenerar, ids, presetDe, resumenPrecio,
  type Catalogo, type Datos, type Nodo, type Precio, type SesionAbierta, type TipoNodo, type TipoPreset, type Toma,
} from '@/lib/pasarela'
import { abrirSesion, cotizarNodo, generarNodo, guardarNodo, leerFotos, llevarAHistoria } from '@/lib/pasarela-api'
import { uploadImage } from '@/lib/upload'
import { textoDe } from './crear/api'

/**
 * A Pasarela session as steps (web board «Pasarela», spec §4.6): the same session made on the computer, continued
 * here. Lo que vendes, Dirección, Sesión, Ampliar 4K, Video, «Sigue» (read-only) and Historia; «Generar» fixed at
 * the bottom with its price before the tap. The phone changes options and generates; it never adds or connects nodes,
 * so a node the session lacks is simply not here. Param: `id` (the session).
 */

const c = theme.colors
const SAVE_MS = 700
const DIRECCION: TipoNodo[] = ['set', 'luz', 'toma', 'peinado', 'maquillaje', 'moodboard', 'pose']
const PRESETS: TipoNodo[] = ['set', 'luz', 'peinado', 'maquillaje']
const MAX_FOTOS: Partial<Record<TipoNodo, number>> = { pieza: 10, moodboard: 6, pose: 1, set: 1, peinado: 1, maquillaje: 1 }
const ICONO_TOMA = 'M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M9 12h6'
const PLUS = 'M12 5v14M5 12h14'
/** What the price says is missing, in the phone's words (the canvas's mention connecting, which happens there). */
const FALTA: Record<string, string> = {
  falta_pieza: 'Falta la pieza: conéctala a la sesión en la compu. No se generó ni se cobró nada.',
  falta_toma: 'Escoge al menos una toma lista. No se generó ni se cobró nada.',
}
const posicion = (pos: string): ImageContentPosition => {
  const [left, top] = pos.split(' ')
  return { left: left as `${number}%`, top: (top ?? '50%') as `${number}%` }
}
const plural = (k: number, uno: string, varios: string) => `${k} ${k === 1 ? uno : varios}`
const texto = (v: unknown) => (typeof v === 'string' ? v : '')
const reloj = (desde: string, ahora: number) => {
  const s = Math.max(0, Math.floor((ahora - Date.parse(desde)) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
/** A Pieza's name: the first words read from its photo. */
const tituloPieza = (n: Nodo) => {
  const t = texto(n.datos.texto).split(/[.,;:\n]/)[0].trim()
  return t ? (t.length > 40 ? `${t.slice(0, 39)}…` : t) : ids(n.datos.fotos).length ? 'Tu pieza' : 'Sin foto todavía'
}

export default function PasarelaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const clave = useMemo(() => ['pasarela', id] as const, [id])
  const q = useQuery({
    queryKey: clave,
    queryFn: () => abrirSesion(id),
    enabled: !!id,
    // While a take is on its way, keep looking: looking is also what moves it along on the server.
    refetchInterval: (query) => (query.state.data?.corriendo ? 4000 : false),
  })
  const data = q.data

  // Options changed here and not saved yet, per node, over what the server has.
  const [pendientes, setPendientes] = useState<Record<string, Datos>>({})
  const pend = useRef(pendientes)
  pend.current = pendientes
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const guardando = useRef<Record<string, Promise<void>>>({})
  const [abierto, setAbierto] = useState<string | null>(null)
  const [objetivoSel, setObjetivo] = useState<string | null>(null)
  const [precio, setPrecio] = useState<(Precio & { mensaje?: string }) | null>(null)
  const version = useRef(0)
  const [leyendo, setLeyendo] = useState<string[]>([])
  const [pidiendo, setPidiendo] = useState(false)
  const [llevando, setLlevando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  // Only her pull shows the spinner: the polling's refetches would move the page under her finger.
  const [tirando, setTirando] = useState(false)
  const [ahora, setAhora] = useState(Date.now())
  useEffect(() => {
    if (!data?.corriendo) return
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [data?.corriendo])

  const nodos: Nodo[] = useMemo(() => (data?.nodos ?? []).map((n) => (pendientes[n.id] ? { ...n, datos: { ...n.datos, ...pendientes[n.id] } } : n)), [data?.nodos, pendientes])
  const de = (tipo: TipoNodo) => nodos.filter((n) => n.tipo === tipo)
  const sesion = de('sesion')[0]
  const objetivo = nodos.find((n) => n.id === objetivoSel) ?? sesion ?? null
  const tomaDe = useCallback((tid: string) => data?.tomas.find((t) => t.id === tid), [data?.tomas])

  // The price of what the bottom button generates, for the graph as the server has it.
  const cotizar = useCallback(
    async (nodoId: string | undefined) => {
      if (!nodoId) return
      const v = ++version.current
      setPrecio(null)
      try {
        const p = await cotizarNodo(id, nodoId)
        if (v === version.current) setPrecio(p)
      } catch (e) {
        // The server's own words (e.g. a persona that no longer exists); cleared by the next price.
        if (v === version.current) setPrecio({ falta: 'precio', mensaje: textoDe(e, 'No pudimos calcular el precio. Desliza hacia abajo para intentar otra vez.') })
      }
    },
    [id],
  )
  useEffect(() => {
    if (data && objetivo) void cotizar(objetivo.id)
    // Priced again when the target changes or a save lands (guardar calls it); not on every poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivo?.id, !!data])

  /** Saves a node's pending options; what changed meanwhile stays pending for the next save. */
  const guardar = useCallback(
    async (nodoId: string) => {
      clearTimeout(timers.current[nodoId])
      const enviado = pend.current[nodoId]
      if (!enviado) return
      const tarea = (async () => {
        try {
          const datos = await guardarNodo(id, nodoId, enviado)
          qc.setQueryData<SesionAbierta>(clave, (d) => d && { ...d, nodos: d.nodos.map((n) => (n.id === nodoId ? { ...n, datos } : n)) })
          // What the server derives from the options («Sigue», the takes each node gets) comes back with the session.
          void qc.invalidateQueries({ queryKey: clave })
          setPendientes((p) => {
            const resto = Object.fromEntries(Object.entries(p[nodoId] ?? {}).filter(([k, v]) => v !== enviado[k]))
            const { [nodoId]: _, ...otros } = p
            return Object.keys(resto).length ? { ...otros, [nodoId]: resto } : otros
          })
        } catch (e) {
          setAviso(textoDe(e, 'No pudimos guardar el cambio. Revisa tu conexión y vuelve a intentar.'))
          throw e
        }
      })()
      guardando.current[nodoId] = tarea.catch(() => {})
      await tarea
    },
    [id, clave, qc],
  )
  /** Every pending save, now: before generating, taking to Historia or leaving. */
  const vaciar = async () => {
    await Promise.all(Object.values(guardando.current))
    await Promise.all(Object.keys(pend.current).map((k) => guardar(k)))
  }
  useEffect(() => () => void Promise.all(Object.keys(pend.current).map((k) => guardar(k))).catch(() => {}), [guardar])

  const cambiar = (n: Nodo, cambio: Datos, { objetivo: obj }: { objetivo?: string } = {}) => {
    if (!Object.keys(cambio).length) return
    setAviso(null)
    setPendientes((p) => ({ ...p, [n.id]: { ...p[n.id], ...cambio } }))
    pend.current = { ...pend.current, [n.id]: { ...pend.current[n.id], ...cambio } }
    clearTimeout(timers.current[n.id])
    version.current++
    setPrecio(null)
    const target = obj ?? objetivo?.id
    if (obj) setObjetivo(obj)
    timers.current[n.id] = setTimeout(() => {
      void guardar(n.id)
        .then(() => cotizar(target))
        .catch(() => {})
    }, SAVE_MS)
  }

  // Photos for a Pieza or a reference: uploaded, read on the server, and the reading kept in the node.
  const subir = async (n: Nodo, cambio?: Datos) => {
    const max = MAX_FOTOS[n.tipo] ?? 1
    const actuales = ids(n.datos.fotos)
    const cuantas = n.tipo === 'moodboard' ? max - actuales.length : max
    if (cuantas <= 0) return setAviso(`Un moodboard lleva hasta ${max} fotos.`)
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsMultipleSelection: cuantas > 1, selectionLimit: cuantas })
    if (r.canceled || !r.assets.length) return
    setLeyendo((l) => [...l, n.id])
    setAviso(null)
    try {
      if (cambio) {
        cambiar(n, cambio)
        await guardar(n.id)
      }
      const nuevas = await Promise.all(r.assets.slice(0, cuantas).map((a) => uploadImage(a.uri)))
      const fotos = (n.tipo === 'moodboard' ? [...actuales, ...nuevas] : nuevas).slice(0, max)
      const datos = await leerFotos(id, n.id, fotos)
      qc.setQueryData<SesionAbierta>(clave, (d) => d && { ...d, nodos: d.nodos.map((x) => (x.id === n.id ? { ...x, datos } : x)) })
      void cotizar(objetivo?.id)
    } catch (e) {
      setAviso(textoDe(e, 'No pudimos leer tu foto. Intenta con otra.'))
    } finally {
      setLeyendo((l) => l.filter((x) => x !== n.id))
    }
  }

  const generar = async () => {
    if (!objetivo || !precio || !('firma' in precio) || pidiendo) return
    const visto = precio
    setPidiendo(true)
    setAviso(null)
    try {
      // What gets charged is what the server has: the last change first, and the price must still be the one shown.
      await vaciar()
      const ahoraP = await cotizarNodo(id, objetivo.id)
      setPrecio(ahoraP)
      if (!('firma' in ahoraP)) return
      if (ahoraP.firma !== visto.firma) return setAviso('El precio cambió con lo último que moviste. Revísalo y vuelve a generar.')
      const r = await generarNodo(id, objetivo.id, ahoraP.firma)
      setAviso(`Apartamos ${mxn(r.amountCents)} de tu saldo. Se cobra sólo lo que llegue.`)
      qc.invalidateQueries({ queryKey: ['saldo'] })
      await q.refetch()
    } catch (e) {
      if ((e as { status?: number }).status === 402)
        Alert.alert('Te falta saldo', textoDe(e, 'Tu saldo no alcanza para este pedido.'), [
          { text: 'Ver mi saldo', onPress: () => router.push('/saldo') },
          { text: 'Cerrar', style: 'cancel' },
        ])
      else setAviso(textoDe(e, 'No pudimos hacer el pedido. No se cobró nada.'))
    } finally {
      setPidiendo(false)
    }
  }

  // Historia: the chosen takes, in order, with the text between them. Taking them costs nothing.
  const llevar = async (n: Nodo) => {
    if (!ids(n.datos.tomas).length || llevando) return
    setLlevando(true)
    setAviso(null)
    try {
      await vaciar()
      const historiaId = await llevarAHistoria(id, n.id)
      qc.setQueryData<SesionAbierta>(clave, (d) => d && { ...d, nodos: d.nodos.map((x) => (x.id === n.id ? { ...x, datos: { ...x.datos, historiaId } } : x)) })
      Alert.alert('Tu historia está lista', 'Ábrela en Historia, en la compu: ahí escoges el motor de cada escena y ves su precio antes de generar.')
    } catch (e) {
      setAviso(textoDe(e, 'No pudimos armar la historia. No se cobró nada.'))
    } finally {
      setLlevando(false)
    }
  }

  /** The header's way back is Campañas, wherever she came from (the viewer's own pattern: close, then switch tab). */
  const aCampanas = () => {
    if (router.canGoBack()) router.back()
    router.navigate('/campanas')
  }

  const verTomas = (lista: Toma[], tid: string) => {
    const listas = lista.filter((t) => estadoDe(t) === 'lista').map((t) => t.id)
    router.push({ pathname: '/visor', params: { ids: JSON.stringify(listas), i: String(Math.max(0, listas.indexOf(tid))) } })
  }

  if (!data) {
    return (
      <View style={[styles.root, styles.centro, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        {q.isError ? (
          <>
            <Text style={styles.aviso}>
              {(q.error as { status?: number }).status === 404 ? 'No encontramos esta sesión.' : 'No pudimos abrir la sesión. Revisa tu conexión.'}
            </Text>
            <Accion label="Volver a Campañas" tono="rosa" onPress={() => aCampanas()} />
          </>
        ) : (
          <ActivityIndicator color={c.textDim} />
        )}
      </View>
    )
  }

  const cat = data.catalogo
  const formato = String(sesion?.datos.formato ?? '3:4')
  const piezasSinFoto = de('pieza').some((n) => !ids(n.datos.fotos).length)
  const p = precio && 'lines' in precio ? resumenPrecio(precio, mxn) : null
  const falta = precio && 'falta' in precio ? (FALTA[precio.falta] ?? precio.mensaje ?? 'No pudimos calcular el precio. Desliza hacia abajo para intentar otra vez.') : piezasSinFoto && objetivo?.tipo === 'sesion' ? 'Sube la foto de tu pieza en «Lo que vendes».' : null
  const k = p?.k ?? (objetivo?.tipo === 'sesion' ? (data.mosaico[objetivo.id]?.length ?? 0) : ids(objetivo?.datos.tomas).length)
  const generarNo = !objetivo || !p || !!falta
  const pie =
    objetivo?.tipo === 'sesion'
      ? `${plural(k, 'toma', 'tomas')} · ${formato} · se cobra sólo lo que llega`
      : objetivo
        ? `${cat.etiquetas[objetivo.tipo]} · se cobra sólo lo que llega`
        : ''

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[styles.cuerpo, { paddingTop: insets.top + 14, paddingBottom: 150 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          <RefreshControl
            refreshing={tirando}
            onRefresh={() => {
              setTirando(true)
              void q
                .refetch()
                .then(() => cotizar(objetivo?.id))
                .finally(() => setTirando(false))
            }}
            tintColor={c.textDim}
          />
        }
      >
        {/* header */}
        <View style={{ gap: 10 }}>
          <View style={styles.filaEntre}>
            <Pressable onPress={() => aCampanas()} accessibilityRole="link" style={({ pressed }) => [styles.regreso, pressed && { opacity: 0.7 }]}>
              <Icono d="m15 6-6 6 6 6" lado={16} color={c.textMuted} />
              <Text style={styles.regresoTexto}>Campañas</Text>
            </Pressable>
            {data.sesion.plantilla ? (
              <View style={styles.plantilla}>
                <Text style={styles.plantillaTexto}>Plantilla · {data.sesion.plantilla}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.titulo}>
            <Text style={styles.h1}>PASARELA</Text>
            <Text style={styles.nombre} numberOfLines={1}>
              {data.sesion.name}
            </Text>
          </View>
          <Text style={styles.ayuda}>Es la misma sesión que armaste en la compu, paso por paso. Toca un paso para cambiarlo.</Text>
        </View>

        {/* Lo que vendes */}
        {de('pieza').length || de('modelo').length ? (
          <Seccion titulo="Lo que vendes">
            <Tarjeta>
              {[...de('pieza'), ...de('modelo')].map((n, i, a) => (
                <Desplegable
                  key={n.id}
                  abierto={abierto === n.id}
                  onToggle={() => setAbierto(abierto === n.id ? null : n.id)}
                  ultima={i === a.length - 1}
                  {...(n.tipo === 'pieza' ? filaPieza(n, cat) : filaModelo(n, data))}
                  alto={58}
                >
                  {n.tipo === 'pieza' ? (
                    <View style={{ gap: 10 }}>
                      <Chips
                        titulo="Categoría"
                        opciones={cat.categorias}
                        actual={String(n.datos.categoria ?? 'ropa')}
                        onPick={(v) => cambiar(n, { categoria: v, categoriaElegida: true }, { objetivo: sesion?.id })}
                      />
                      <Chips titulo="Cómo se muestra" opciones={cat.muestras} actual={String(n.datos.muestra ?? 'puesta')} onPick={(v) => cambiar(n, { muestra: v }, { objetivo: sesion?.id })} />
                      <Carril>
                        {ids(n.datos.fotos).map((src, j) => (
                          <Cuadro key={src} label={`Foto ${j + 1}`} src={src} />
                        ))}
                        <Cuadro label={ids(n.datos.fotos).length ? 'Cambiar fotos' : 'Subir fotos'} icono={PLUS} onPress={() => void subir(n)} />
                      </Carril>
                      <Text style={styles.desc}>
                        {leyendo.includes(n.id) ? 'Leyendo tu foto…' : texto(n.datos.texto) || 'Sube fotos de la pieza: la leemos y sale idéntica en cada toma. Varias fotos son un look.'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      <Carril>
                        {data.personas.map((x) => (
                          <Cuadro key={x.id} label={x.name} src={x.face} pos="50% 20%" on={n.datos.personaId === x.id} onPress={() => cambiar(n, { personaId: x.id }, { objetivo: sesion?.id })} />
                        ))}
                        <Cuadro label="Sin modelo" icono="M5 5l14 14M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" on={!data.personas.some((x) => x.id === n.datos.personaId)} onPress={() => cambiar(n, { personaId: null }, { objetivo: sesion?.id })} />
                      </Carril>
                      <Text style={styles.desc}>{cat.ayuda.modelo}</Text>
                    </View>
                  )}
                </Desplegable>
              ))}
            </Tarjeta>
          </Seccion>
        ) : null}

        {/* Dirección */}
        {DIRECCION.some((t) => de(t).length) ? (
          <Seccion titulo="Dirección" nota="Vale para toda la sesión">
            <Tarjeta>
              {DIRECCION.flatMap((t) => de(t)).map((n, i, a) => {
                const fila = filaDireccion(n, cat)
                return (
                  <Desplegable key={n.id} abierto={abierto === n.id} onToggle={() => setAbierto(abierto === n.id ? null : n.id)} ultima={i === a.length - 1} {...fila} alto={44}>
                    <View style={{ gap: 10 }}>
                      {PRESETS.includes(n.tipo) ? (
                        <Carril>
                          {cat.presets[n.tipo as TipoPreset].map((pr) => {
                            const on = presetDe(n, n.tipo as TipoPreset, cat)?.id === pr.id
                            const propia = ids(n.datos.fotos)[0]
                            if (pr.propia)
                              return (
                                <Cuadro
                                  key={pr.id}
                                  label={pr.label}
                                  src={propia}
                                  icono={propia ? undefined : PLUS}
                                  on={on}
                                  onPress={() => (on || !propia ? void subir(n, { preset: pr.id }) : cambiar(n, { preset: pr.id }, { objetivo: sesion?.id }))}
                                />
                              )
                            return <Cuadro key={pr.id} label={pr.label} src={pr.src ?? undefined} pos={pr.pos} sw={pr.sw} on={on} onPress={() => cambiar(n, { preset: pr.id }, { objetivo: sesion?.id })} />
                          })}
                        </Carril>
                      ) : n.tipo === 'toma' ? (
                        (['plano', 'punto', 'sitio', 'fuera'] as const).map((eje) => (
                          <Chips
                            key={eje}
                            titulo={{ plano: 'Plano', punto: 'Punto de vista', sitio: 'Sitio', fuera: 'Qué dejas fuera' }[eje]}
                            opciones={cat.toma[eje]}
                            actual={String(n.datos[eje] ?? cat.toma[eje][0].id)}
                            onPick={(v) => cambiar(n, { [eje]: v }, { objetivo: sesion?.id })}
                          />
                        ))
                      ) : (
                        <Carril>
                          {ids(n.datos.fotos).map((src, j) => (
                            <Cuadro key={src} label={`Foto ${j + 1}`} src={src} />
                          ))}
                          {ids(n.datos.fotos).length < (MAX_FOTOS[n.tipo] ?? 1) || n.tipo === 'pose' ? (
                            <Cuadro label={n.tipo === 'pose' && ids(n.datos.fotos).length ? 'Cambiar' : 'Agregar'} icono={PLUS} onPress={() => void subir(n)} />
                          ) : null}
                        </Carril>
                      )}
                      <Text style={styles.desc}>{leyendo.includes(n.id) ? 'Leyendo tu foto…' : fila.desc}</Text>
                    </View>
                  </Desplegable>
                )
              })}
            </Tarjeta>
          </Seccion>
        ) : null}

        {/* Sesión: the takes */}
        {de('sesion').map((n) => {
          const amp = de('ampliar').find((a) => data.llegan[a.id]?.length)
          const elegidas = ids(amp?.datos.tomas)
          const mos = (data.mosaico[n.id] ?? []).map((tid) => (tid ? tomaDe(tid) : undefined))
          const listas = mos.filter((t) => estadoDe(t) === 'lista').length
          const malas = mos.flatMap((t, i) => (estadoDe(t) === 'no-salio' ? [i + 1] : []))
          return (
            <Seccion key={n.id} titulo="Sesión" nota={`${listas} de ${mos.length} listas`}>
              <View style={[styles.caja, objetivo?.id === n.id && styles.cajaActiva]}>
                <Text style={styles.linea}>{lineaDe(nodos, cat)}</Text>
                <View style={styles.reja}>
                  {mos.map((t, i) => (
                    <Mosaico
                      key={t?.id ?? `v${i}`}
                      t={t}
                      ahora={ahora}
                      elegida={!!t && elegidas.includes(t.id)}
                      onPress={
                        estadoDe(t) !== 'lista'
                          ? undefined
                          : amp
                            ? () => cambiar(amp, alternarToma(amp, t!.id, 9), { objetivo: amp.id })
                            : () => verTomas(mos.filter((x): x is Toma => !!x), t!.id)
                      }
                      onLongPress={estadoDe(t) === 'lista' ? () => verTomas(mos.filter((x): x is Toma => !!x), t!.id) : undefined}
                    />
                  ))}
                </View>
                {malas.length ? (
                  <Text style={styles.desc}>
                    {malas.length === 1 ? `La toma ${malas[0]} no salió.` : `Las tomas ${malas.join(', ')} no salieron.`} No se te cobró.
                  </Text>
                ) : null}
                {objetivo?.id !== n.id ? (
                  <Pressable onPress={() => setObjetivo(n.id)} accessibilityRole="button" style={styles.usar}>
                    <Text style={styles.usarTexto}>Generar la sesión</Text>
                  </Pressable>
                ) : null}
              </View>
            </Seccion>
          )
        })}

        {/* Ampliar 4K */}
        {de('ampliar').map((n) => {
          const el = ids(n.datos.tomas).flatMap((tid) => {
            const t = tomaDe(tid)
            return t?.resultUrl ? [t] : []
          })
          const activo = objetivo?.id === n.id
          return (
            <Seccion key={n.id} titulo="Ampliar 4K" nota="Toca una toma para elegirla">
              <Pressable onPress={() => setObjetivo(n.id)} accessibilityRole="button" accessibilityLabel={`Ampliar 4K: ${plural(el.length, 'elegida', 'elegidas')}`} style={[styles.caja, styles.cajaFila, activo && styles.cajaActiva]}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {el.length ? (
                    el.slice(0, 3).map((t) => (
                      <View key={t.id} style={[styles.tile, { width: 54, height: 72 }]}>
                        <Foto src={miniatura(t.resultUrl, 54)} />
                        <Text style={styles.cuatroK}>4K</Text>
                      </View>
                    ))
                  ) : (
                    <View style={[styles.tile, styles.tileVacio, { width: 54, height: 72 }]} />
                  )}
                </View>
                <View style={styles.cajaTexto}>
                  <Text style={styles.cajaTitulo}>{plural(el.length, 'elegida', 'elegidas')}</Text>
                  <Text style={styles.cajaSub}>{el.length ? 'Más detalle en la tela; no cambia el encuadre. Sólo se cobran las elegidas.' : 'Toca en la sesión las tomas que vas a usar.'}</Text>
                  {activo && p ? <Text style={styles.precio}>{p.detalle}</Text> : null}
                </View>
              </Pressable>
            </Seccion>
          )
        })}

        {/* Video */}
        {de('video').map((n) => {
          const llegan = (data.llegan[n.id] ?? []).flatMap((tid) => {
            const t = tomaDe(tid)
            return t && estadoDe(t) === 'lista' ? [t] : []
          })
          const el = ids(n.datos.tomas).flatMap((tid) => {
            const t = tomaDe(tid)
            return t?.resultUrl ? [t] : []
          })
          const mov = cat.movimientos.find((m) => m.id === n.datos.movimiento)?.label ?? cat.movimientos[0]?.label
          const dur = Number(n.datos.duracionS) || 5
          const activo = objetivo?.id === n.id
          const abiertoV = abierto === n.id
          return (
            <Seccion key={n.id} titulo="Video">
              <View style={[styles.caja, { padding: 0 }, activo && styles.cajaActiva]}>
                <Pressable
                  onPress={() => {
                    setObjetivo(n.id)
                    setAbierto(abiertoV ? null : n.id)
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: abiertoV }}
                  style={[styles.cajaFila, { padding: 10 }]}
                >
                  <View style={[styles.tile, { width: 72, height: 96 }]}>
                    {el[0] ? <Foto src={miniatura(el[0].resultUrl, 72)} pos="50% 30%" /> : null}
                    <View style={styles.play}>
                      <Icono d="M9 7v10l8-5z" lado={14} color={c.text} relleno />
                    </View>
                  </View>
                  <View style={styles.cajaTexto}>
                    <Text style={styles.cajaTitulo}>{mov}</Text>
                    <Text style={styles.cajaSub}>
                      {dur} s · {formato} · {el.length ? (el.length === 1 ? 'de la toma elegida' : `de ${el.length} tomas`) : 'elige una toma'}
                    </Text>
                    {activo && p ? <Text style={styles.precio}>{p.detalle}</Text> : null}
                  </View>
                  <Icono d="m6 9 6 6 6-6" lado={16} color={c.textDim} rota={abiertoV} />
                </Pressable>
                {abiertoV ? (
                  <View style={styles.cuerpoFila}>
                    <Text style={styles.chipsTitulo}>De qué toma</Text>
                    {llegan.length ? (
                      <Carril>
                        {llegan.map((t, i) => (
                          <Cuadro key={t.id} label={`Toma ${i + 1}`} src={miniatura(t.resultUrl, 92) ?? undefined} on={el.some((x) => x.id === t.id)} onPress={() => cambiar(n, alternarToma(n, t.id, 9), { objetivo: n.id })} />
                        ))}
                      </Carril>
                    ) : (
                      <Text style={styles.desc}>Todavía no hay tomas listas: genera la sesión primero.</Text>
                    )}
                    <Chips titulo="Duración" opciones={cat.duraciones.map((s) => ({ id: String(s), label: `${s} s` }))} actual={String(dur)} onPick={(v) => cambiar(n, { duracionS: Number(v) }, { objetivo: n.id })} />
                    <Chips titulo="Movimiento" opciones={cat.movimientos} actual={String(n.datos.movimiento ?? 'camina')} onPick={(v) => cambiar(n, { movimiento: v }, { objetivo: n.id })} />
                    <Text style={styles.desc}>{cat.ayuda.video}</Text>
                  </View>
                ) : null}
              </View>
            </Seccion>
          )
        })}

        {/* Sigue: the assistant's next step, added on the computer */}
        {data.sigue ? (
          <View style={styles.sigue}>
            <Text style={styles.sigueKicker}>Sigue</Text>
            <Text style={styles.cajaTitulo}>{data.sigue.titulo}</Text>
            <Text style={styles.desc}>{data.sigue.texto}</Text>
            <View style={styles.sigueNota}>
              <Text style={styles.sigueNotaTexto}>Se agrega en la compu</Text>
            </View>
          </View>
        ) : null}

        {/* Historia */}
        {de('historia').map((n) => {
          const llegan = (data.llegan[n.id] ?? []).map((tid) => tomaDe(tid)).filter((t): t is Toma => !!t)
          const el = ids(n.datos.tomas)
          const esc = escenasDe(n.datos)
          const url = (tid: string) => miniatura(tomaDe(tid)?.resultUrl, 28)
          const escribir = (i: number, cambio: Partial<{ texto: string; fin: boolean }>) => cambiar(n, { escenas: esc.map((e, j) => (j === i ? { ...e, ...cambio } : e)) })
          return (
            <Seccion key={n.id} titulo="Historia" nota={`Toca en orden · hasta ${cat.maxHistoria}`}>
              <View style={styles.caja}>
                {llegan.length ? (
                  <View style={styles.reja4}>
                    {llegan.map((t, i) => {
                      const lista = estadoDe(t) === 'lista'
                      const k = el.indexOf(t.id) + 1
                      return (
                        <Pressable
                          key={t.id}
                          disabled={!lista}
                          onPress={() => {
                            const cambio = alternarToma(n, t.id, cat.maxHistoria)
                            if (!Object.keys(cambio).length) return setAviso(`Una historia lleva hasta ${cat.maxHistoria} tomas.`)
                            cambiar(n, cambio)
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected: k > 0, disabled: !lista }}
                          accessibilityLabel={lista ? `Toma ${i + 1}` : estadoDe(t) === 'no-salio' ? 'No salió' : 'Generándose'}
                          style={[styles.tile, styles.tileHist, { opacity: lista ? 1 : 0.6, borderColor: k ? c.text : 'transparent' }]}
                        >
                          {lista ? <Foto src={miniatura(t.resultUrl, 80)} /> : null}
                          {k ? <Text style={styles.numero}>{k}</Text> : null}
                        </Pressable>
                      )
                    })}
                  </View>
                ) : (
                  <Text style={styles.desc}>Todavía no hay tomas listas: genera la sesión primero.</Text>
                )}
                {el.map((tid, i) => {
                  const hay = i < el.length - 1
                  const fin = hay && esc[i]?.fin
                  return (
                    <View key={tid} style={styles.escena}>
                      <View style={styles.escenaFila}>
                        <View style={[styles.tile, styles.mini]}>
                          <Foto src={url(tid)} />
                        </View>
                        <Icono d="M1 7h18M14 2l5 5-5 5" lado={18} alto={12} caja="0 0 22 14" color={c.textDim} />
                        {fin ? (
                          <View style={[styles.tile, styles.mini]}>
                            <Foto src={url(el[i + 1])} />
                          </View>
                        ) : null}
                        <Text style={styles.escenaTitulo}>Escena {i + 1}</Text>
                        <Pressable
                          disabled={!hay}
                          onPress={() => escribir(i, { fin: !fin })}
                          accessibilityRole="switch"
                          accessibilityState={{ checked: !!fin }}
                          style={[styles.chip, styles.chipChico, { marginLeft: 'auto', backgroundColor: fin ? c.text : c.bgRaised, borderColor: fin ? c.text : c.border }]}
                        >
                          <Text style={[styles.chipTexto, { fontSize: 12, color: fin ? c.bg : c.textMuted }]}>{hay ? `Termina en la ${i + 2}` : 'Última'}</Text>
                        </Pressable>
                      </View>
                      <TextInput
                        accessibilityLabel={`Qué pasa en la escena ${i + 1}`}
                        value={esc[i]?.texto ?? ''}
                        onChangeText={(v) => escribir(i, { texto: v.slice(0, cat.maxTexto) })}
                        onBlur={() => void guardar(n.id).catch(() => {})}
                        maxLength={cat.maxTexto}
                        multiline
                        placeholder="¿Qué pasa aquí? Cámara, luz, sonido…"
                        placeholderTextColor={c.textDim}
                        style={styles.texto}
                      />
                    </View>
                  )
                })}
                <Accion label={`Llevar ${el.length} a Historia`} tono="rosa" lleno disabled={!el.length} cargando={llevando} onPress={() => void llevar(n)} />
                <Text style={styles.cajaSub}>En Historia escoges el motor de cada escena y ves su precio. Llevarlas no cuesta.</Text>
              </View>
            </Seccion>
          )
        })}
      </ScrollView>

      {/* Generar, fixed at the bottom with its price */}
      <View style={[styles.barra, { paddingBottom: insets.bottom + 10 }]}>
        {aviso || falta ? <Text style={[styles.avisoBarra, aviso ? { color: c.text } : null]}>{aviso ?? falta}</Text> : null}
        <View style={styles.filaEntre}>
          <Text style={styles.pieTexto} numberOfLines={1}>
            {pie}
          </Text>
          <Text style={styles.saldo}>Saldo {mxn(data.saldoCents)}</Text>
        </View>
        <Accion
          label={pidiendo ? 'Apartando…' : objetivo ? etiquetaGenerar(objetivo.tipo, k) : 'Generar'}
          detalle={p?.detalle ?? (falta ? undefined : '…')}
          lleno
          disabled={generarNo}
          cargando={pidiendo}
          onPress={() => void generar()}
        />
      </View>
    </View>
  )
}

// --- rows ---

type FilaProps = { label?: string; titulo: string; meta?: string; src?: string | null; pos?: string; sw?: string; icono?: string; desc?: string }

function filaPieza(n: Nodo, cat: Catalogo): FilaProps {
  const categoria = cat.categorias.find((x) => x.id === (n.datos.categoria ?? 'ropa'))?.label ?? 'Ropa'
  const muestra = cat.muestras.find((x) => x.id === (n.datos.muestra ?? 'puesta'))?.label ?? 'Puesta'
  return { titulo: tituloPieza(n), meta: `${categoria} · ${muestra.toLowerCase()}`, src: ids(n.datos.fotos)[0] }
}

function filaModelo(n: Nodo, data: SesionAbierta): FilaProps {
  const p = data.personas.find((x) => x.id === n.datos.personaId)
  return p ? { titulo: p.name, meta: p.soulId ? 'Modelo · cara fija' : 'Modelo · de sus fotos', src: p.face, pos: '50% 14%' } : { titulo: 'Sin modelo', meta: 'Bodegón o sin cara' }
}

function filaDireccion(n: Nodo, cat: Catalogo): FilaProps & { desc: string } {
  const label = cat.etiquetas[n.tipo]
  const fotos = ids(n.datos.fotos)
  const leido = texto(n.datos.texto)
  if (n.tipo === 'toma') {
    const l = (eje: keyof Catalogo['toma']) => cat.toma[eje].find((x) => x.id === n.datos[eje])?.label ?? cat.toma[eje][0].label
    const fuera = String(n.datos.fuera ?? 'nada')
    return {
      label,
      titulo: `${l('plano')} · ${l('punto').toLowerCase()}`,
      icono: ICONO_TOMA,
      desc: [
        `Plano ${l('plano').toLowerCase()}, ${l('punto').toLowerCase()}, ${l('sitio').toLowerCase()}. Las tomas varían plano y punto de vista a partir de esta base.`,
        fuera === 'la-cara' ? 'En una de cada tres tomas la cara queda fuera, para que mande la pieza.' : fuera === 'el-fondo' ? 'Sin fondo: la pieza sobre una superficie lisa.' : '',
      ].filter(Boolean).join(' '),
    }
  }
  if (n.tipo === 'moodboard' || n.tipo === 'pose') {
    const titulo = n.tipo === 'moodboard' ? (fotos.length ? plural(fotos.length, 'referencia', 'referencias') : 'Sube fotos') : fotos.length ? 'De tu foto' : 'Sube una foto'
    return { label, titulo, src: fotos[0], desc: leido || cat.ayuda[n.tipo] }
  }
  const pr = presetDe(n, n.tipo as TipoPreset, cat)
  const propia = pr?.propia || (!pr && !!leido)
  return {
    label,
    titulo: pr?.label ?? (leido ? 'Tu referencia' : 'Sin elegir'),
    src: propia ? fotos[0] : (pr?.src ?? undefined),
    pos: propia ? '50% 50%' : pr?.pos,
    sw: pr?.sw,
    desc: (propia && leido) || pr?.desc || '',
  }
}

/** The Sesión's line: set · light · framing, as the Dirección has them now (or the server's fallback). */
function lineaDe(nodos: Nodo[], cat: Catalogo) {
  const n = (t: TipoNodo) => nodos.find((x) => x.tipo === t)
  const set = presetDe(n('set'), 'set', cat)?.label ?? 'Tu foto'
  const luz = presetDe(n('luz'), 'luz', cat)?.label ?? 'Tu referencia'
  const plano = cat.toma.plano.find((x) => x.id === n('toma')?.datos.plano)?.label ?? 'Entero'
  return `${set} · ${luz.toLowerCase()} · plano ${plano.toLowerCase()}`
}

// --- pieces of the board ---

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }} accessibilityLabel={titulo}>
      <View style={styles.filaEntre}>
        <Text style={styles.kicker}>{titulo}</Text>
        {nota ? <Text style={styles.nota}>{nota}</Text> : null}
      </View>
      {children}
    </View>
  )
}

const Tarjeta = ({ children }: { children: ReactNode }) => <View style={styles.tarjeta}>{children}</View>

function Desplegable({ abierto, onToggle, ultima, label, titulo, meta, src, pos, sw, icono, alto, children }: FilaProps & { abierto: boolean; onToggle: () => void; ultima: boolean; alto: number; children: ReactNode }) {
  return (
    <View style={{ borderBottomWidth: ultima ? 0 : 1, borderBottomColor: c.border }}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: abierto }} accessibilityLabel={`${label ?? ''} ${titulo}`.trim()} style={({ pressed }) => [styles.fila, pressed && { backgroundColor: c.bgOverlay }]}>
        <View style={[styles.tile, { width: 44, height: alto, backgroundColor: sw ?? c.bgElevated, alignItems: 'center', justifyContent: 'center' }]}>
          {src ? <Foto src={src} pos={pos} /> : icono ? <Icono d={icono} lado={20} color="#C7C7C7" /> : null}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          {label ? <Text style={styles.filaLabel}>{label}</Text> : null}
          <Text style={styles.filaTitulo} numberOfLines={1}>
            {titulo}
          </Text>
          {meta ? <Text style={styles.filaMeta}>{meta}</Text> : null}
        </View>
        <Icono d="m6 9 6 6 6-6" lado={16} color={c.textDim} rota={abierto} />
      </Pressable>
      {abierto ? <View style={styles.cuerpoFila}>{children}</View> : null}
    </View>
  )
}

const Carril = ({ children }: { children: ReactNode }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -12 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 12, paddingVertical: 2 }}>
    {children}
  </ScrollView>
)

/** A preset card (92 wide, a 122 tall photo, its label under). */
function Cuadro({ label, src, pos = '50% 50%', sw, icono, on = false, onPress }: { label: string; src?: string | null; pos?: string; sw?: string; icono?: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} style={styles.preset}>
      <View style={[styles.cuadro, { backgroundColor: sw ?? c.bgElevated, borderColor: on ? c.text : 'transparent' }, icono && !src ? styles.subir : null]}>
        {src ? <Foto src={src} pos={pos} /> : icono ? <Icono d={icono} lado={18} color={c.textDim} /> : null}
      </View>
      <Text style={[styles.presetLabel, { color: on ? c.text : c.textMuted }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  )
}

function Chips({ titulo, opciones, actual, onPick }: { titulo: string; opciones: { id: string; label: string }[]; actual: string; onPick: (id: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.chipsTitulo}>{titulo}</Text>
      <View style={styles.chips}>
        {opciones.map((o) => {
          const on = o.id === actual
          return (
            <Pressable key={o.id} onPress={() => onPick(o.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, { backgroundColor: on ? c.text : c.bgRaised, borderColor: on ? c.text : c.border }]}>
              <Text style={[styles.chipTexto, { color: on ? c.bg : '#C7C7C7' }]}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

/** One take tile in the board's four looks: Lista, Generando (with its clock), En cola, No salió. */
function Mosaico({ t, ahora, elegida, onPress, onLongPress }: { t: Toma | undefined; ahora: number; elegida: boolean; onPress?: () => void; onLongPress?: () => void }) {
  const e = estadoDe(t)
  const label = e === 'lista' ? (elegida ? 'Toma elegida para ampliar' : 'Toma lista') : e === 'generando' ? 'Generando' : e === 'no-salio' ? 'No salió' : e === 'en-cola' ? 'En cola' : 'Sin pedir'
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={label}
      accessibilityState={{ selected: elegida }}
      style={[styles.tile, styles.mosaico, e === 'lista' ? null : { borderWidth: 1, borderStyle: 'dashed', borderColor: e === 'generando' ? c.borderStrong : c.border, backgroundColor: e === 'generando' ? c.bgElevated : '#121212' }]}
    >
      {e === 'lista' ? <Foto src={miniatura(t!.resultUrl, 110)} /> : null}
      {elegida ? (
        <View style={styles.palomita}>
          <Icono d="m5 12 5 5 9-10" lado={12} color={c.bg} ancho={3} />
        </View>
      ) : null}
      {e !== 'lista' && e !== 'vacia' ? (
        <View style={styles.centro}>
          <Text style={[styles.estado, e === 'generando' && { color: c.text }]}>{e === 'generando' ? 'Generando' : e === 'en-cola' ? 'En cola' : 'No salió'}</Text>
          {e === 'generando' ? <Text style={styles.reloj}>{reloj(t!.createdAt, ahora)}</Text> : e === 'no-salio' ? <Text style={styles.reloj}>No se cobró</Text> : null}
        </View>
      ) : null}
    </Pressable>
  )
}

const Foto = ({ src, pos = '50% 50%' }: { src: string | null | undefined; pos?: string }) =>
  src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={posicion(pos)} transition={150} /> : null

function Icono({ d, lado, alto, caja = '0 0 24 24', color, ancho = 1.75, rota = false, relleno = false }: { d: string; lado: number; alto?: number; caja?: string; color: string; ancho?: number; rota?: boolean; relleno?: boolean }) {
  return (
    <Svg width={lado} height={alto ?? lado} viewBox={caja} fill={relleno ? color : 'none'} style={rota ? { transform: [{ rotate: '180deg' }] } : undefined}>
      <Path d={d} stroke={relleno ? 'none' : color} strokeWidth={ancho} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  cuerpo: { gap: 20, paddingHorizontal: 16 },
  filaEntre: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  // header
  regreso: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 34, paddingLeft: 7, paddingRight: 13, borderRadius: 999, borderWidth: 1, borderColor: c.border, alignSelf: 'center' },
  regresoTexto: { fontSize: 13, color: c.textMuted },
  plantilla: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong, alignSelf: 'center' },
  plantillaTexto: { fontFamily: FONT.mono, fontSize: 11, color: c.textMuted },
  titulo: { flexDirection: 'row', alignItems: 'baseline', gap: 10, minWidth: 0 },
  h1: { fontFamily: FONT.display, fontSize: 34, lineHeight: 36, color: c.text },
  nombre: { flexShrink: 1, fontSize: 15, fontWeight: '500', color: c.text },
  ayuda: { fontSize: 12.5, lineHeight: 19, color: c.textDim },
  // sections
  kicker: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: c.textDim },
  nota: { fontSize: 11.5, color: c.textDim },
  tarjeta: { borderRadius: 14, backgroundColor: c.bgRaised, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8, paddingLeft: 8, paddingRight: 12 },
  filaLabel: { fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 0.76, textTransform: 'uppercase', color: c.textDim },
  filaTitulo: { fontSize: 14.5, fontWeight: '500', color: c.text },
  filaMeta: { fontSize: 12, color: c.textDim },
  cuerpoFila: { gap: 10, paddingTop: 2, paddingHorizontal: 12, paddingBottom: 14 },
  desc: { fontSize: 12.5, lineHeight: 19, color: c.textMuted },
  tile: { borderRadius: 10, overflow: 'hidden', backgroundColor: c.bgElevated },
  tileVacio: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: c.border },
  preset: { width: 92, gap: 6 },
  cuadro: { height: 122, borderRadius: 10, overflow: 'hidden', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  subir: { borderStyle: 'dashed', borderWidth: 1, borderColor: c.borderStrong },
  presetLabel: { fontSize: 12, lineHeight: 15.6 },
  chipsTitulo: { fontSize: 12, color: c.textDim },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 38, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  chipChico: { minHeight: 32, paddingHorizontal: 11 },
  chipTexto: { fontSize: 13 },
  // Sesión
  caja: { gap: 10, padding: 12, borderRadius: 14, backgroundColor: c.bgRaised, borderWidth: 1, borderColor: c.border },
  cajaActiva: { borderColor: c.textDim },
  cajaFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cajaTexto: { flex: 1, minWidth: 0, gap: 3 },
  cajaTitulo: { fontSize: 14.5, fontWeight: '600', color: c.text },
  cajaSub: { fontSize: 12, lineHeight: 17, color: c.textDim },
  precio: { fontFamily: FONT.mono, fontSize: 12, color: '#C7C7C7' },
  linea: { fontFamily: FONT.mono, fontSize: 11, color: c.textMuted },
  reja: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mosaico: { width: '31.9%', height: 132 },
  palomita: { position: 'absolute', left: 5, top: 5, width: 20, height: 20, borderRadius: 999, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' },
  estado: { fontSize: 12, color: c.textDim },
  reloj: { fontFamily: FONT.mono, fontSize: 11, color: '#C7C7C7' },
  usar: { alignSelf: 'flex-start', minHeight: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong, justifyContent: 'center' },
  usarTexto: { fontSize: 12.5, color: c.text },
  cuatroK: { position: 'absolute', right: 3, bottom: 3, paddingHorizontal: 4, borderRadius: 999, backgroundColor: 'rgba(10,10,10,0.72)', fontFamily: FONT.mono, fontSize: 9, color: c.text, overflow: 'hidden' },
  play: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  // Sigue
  sigue: { gap: 8, padding: 12, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,61,138,0.4)', backgroundColor: 'rgba(20,20,20,0.5)' },
  sigueKicker: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: c.accent2 },
  sigueNota: { alignSelf: 'flex-start', minHeight: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong, justifyContent: 'center' },
  sigueNotaTexto: { fontSize: 13, color: c.textDim },
  // Historia
  reja4: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tileHist: { width: '23.4%', height: 96, borderWidth: 1.5 },
  numero: { position: 'absolute', left: 5, top: 5, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 999, backgroundColor: c.text, color: c.bg, fontFamily: FONT.mono, fontSize: 11, lineHeight: 20, textAlign: 'center', overflow: 'hidden' },
  escena: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border },
  escenaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mini: { width: 28, height: 37, borderRadius: 6 },
  escenaTitulo: { fontFamily: FONT.mono, fontSize: 11, color: c.textMuted },
  texto: { minHeight: 64, paddingHorizontal: 9, paddingVertical: 8, borderWidth: 1, borderColor: c.border, borderRadius: 9, backgroundColor: c.bg, color: c.text, fontSize: 16, lineHeight: 23, textAlignVertical: 'top' },
  // the bottom bar
  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 8, paddingTop: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: '#0F0F0F' },
  pieTexto: { flexShrink: 1, fontSize: 12, color: c.textDim },
  saldo: { fontFamily: FONT.mono, fontSize: 12, color: c.textDim },
  avisoBarra: { fontSize: 12.5, lineHeight: 18, color: c.textMuted },
  aviso: { fontSize: 14, lineHeight: 20, color: c.textDim, textAlign: 'center' },
})
