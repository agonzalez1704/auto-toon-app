import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import Svg, { Path } from 'react-native-svg'
import { FONT, Text, TextInput } from '@/components/text'
import { Accion } from '@/components/accion'
import { theme } from '@/constants/theme'
import { uploadImage } from '@/lib/upload'
import {
  abrirMesa,
  analizarFoto,
  configCrear,
  cotizar,
  crearMesa,
  guardarMesa,
  lista,
  mxn,
  pedir,
  pedirPropuestas,
  type Aspecto,
  type LineaProducto,
  type Pieza,
  type Propuesta,
} from '@/lib/estudio'
import { usePedido } from './use-pedido'

/**
 * One mesa (web board «Main», mode Escena): the product's photo and angles, ideas made for it with their price,
 * «Generar», and everything made here. The server composes every prompt from what is sent (refs, the idea's
 * scene, the category); the app only picks.
 */

const FORMATOS: { id: Aspecto; label: string }[] = [
  { id: '4:5', label: '4:5 feed' },
  { id: '1:1', label: '1:1' },
  { id: '9:16', label: '9:16 historia' },
]

async function elegirFoto(): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
  if (r.canceled || !r.assets?.[0]) return null
  return uploadImage(r.assets[0].uri)
}

export default function MesaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const nueva = id === 'nueva'

  const mesa = useQuery({ queryKey: ['mesa', id], queryFn: () => abrirMesa(id), enabled: !nueva })
  const config = useQuery({ queryKey: ['crear-config'], queryFn: configCrear, staleTime: 10 * 60_000 })
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ideas, setIdeas] = useState<{ version: number; propuestas: Propuesta[]; respuesta: string } | null>(null)
  const [pensando, setPensando] = useState(false)
  const [elegidas, setElegidas] = useState<number[]>([0, 1, 2])
  const [formato, setFormato] = useState<Aspecto>('4:5')
  const [pide, setPide] = useState('')
  const [holdId, setHoldId] = useState<string | null>(null)
  const pedido = usePedido(holdId)

  const m = mesa.data
  const fotos = useMemo(() => (m?.photoUrl ? [m.photoUrl, ...m.refs] : []), [m?.photoUrl, m?.refs])
  const categoria = config.data?.categorias.find((c) => c.id === m?.categoryId)

  // The first photo makes the mesa; then the page is that mesa's.
  const subirPrimera = async () => {
    setError(null)
    setSubiendo(true)
    try {
      const url = await elegirFoto()
      if (!url) return
      const nuevaId = await crearMesa({ photoUrl: url, refs: [] })
      qc.invalidateQueries({ queryKey: ['mesas'] })
      router.replace({ pathname: '/mesa/[id]', params: { id: nuevaId } })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubiendo(false)
    }
  }

  // What the photo is: its name and category, once per mesa (the web does the same on upload).
  useEffect(() => {
    if (!m?.photoUrl || m.analysis || m.categoryId) return
    analizarFoto(m.photoUrl)
      .then((a) => guardarMesa(m.id, { name: a.nombre ?? m.name, categoryId: a.categoryId, analysis: { url: m.photoUrl, name: a.nombre, categoryId: a.categoryId } }))
      .then(() => qc.invalidateQueries({ queryKey: ['mesa', id] }))
      .catch(() => {})
    // Once per photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id, m?.photoUrl])

  const pedirIdeas = async (nuevo?: string) => {
    if (!m?.photoUrl || pensando) return
    const peticion = nuevo ? [...m.pedidos, nuevo].slice(-6) : m.pedidos
    setPensando(true)
    setError(null)
    try {
      const r = await pedirPropuestas({
        imageUrl: m.photoUrl,
        imageUrls: m.refs.slice(0, 3),
        producto: m.name,
        categoria: categoria?.name ?? null,
        peticion,
        evitar: (ideas?.propuestas ?? []).map((p) => `${p.nombre}: ${p.descripcion}`),
      })
      setIdeas({ version: (ideas?.version ?? 0) + 1, propuestas: r.propuestas, respuesta: nuevo ? r.respuesta : '' })
      setElegidas([0, 1, 2].filter((i) => i < r.propuestas.length))
      if (nuevo) {
        setPide('')
        await guardarMesa(m.id, { pedidos: peticion })
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPensando(false)
    }
  }
  // The first ideas, as soon as the mesa has its photo.
  useEffect(() => {
    if (m?.photoUrl && !ideas && !pensando) void pedirIdeas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id, m?.photoUrl])

  const agregarAngulo = async () => {
    if (!m) return
    setSubiendo(true)
    try {
      const url = await elegirFoto()
      if (url) {
        await guardarMesa(m.id, { refs: [...m.refs, url].slice(0, 8) })
        qc.invalidateQueries({ queryKey: ['mesa', id] })
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubiendo(false)
    }
  }

  // The request, exactly as the web builds it (crear-view `linea`): one product line, the chosen ideas' scenes.
  const escogidas = (ideas?.propuestas ?? []).map((p, i) => ({ p, i })).filter(({ i }) => elegidas.includes(i))
  const linea: LineaProducto | null =
    m && fotos.length && escogidas.length
      ? {
          kind: 'producto',
          count: escogidas.length,
          refs: fotos,
          aspect: formato,
          variants: {
            category: m.categoryId ?? 'other',
            ids: escogidas.map(({ i }) => `v${ideas!.version}p${i + 1}`),
            escenas: Object.fromEntries(escogidas.map(({ p, i }) => [`v${ideas!.version}p${i + 1}`, p.escena])),
          },
          mesaId: m.id,
          labels: escogidas.map(({ p }) => p.nombre),
        }
      : null
  const precio = useQuery({ queryKey: ['cotizar', linea], queryFn: () => cotizar(linea!), enabled: !!linea })

  const generar = useMutation({
    mutationFn: () => pedir(linea!),
    onSuccess: (r) => {
      setHoldId(r.holdId)
      qc.invalidateQueries({ queryKey: ['saldo'] })
    },
    onError: (e: Error & { status?: number }) =>
      e.status === 402 ? Alert.alert('Te falta saldo', e.message, [{ text: 'Ver mi saldo', onPress: () => router.push('/account') }, { text: 'Cerrar' }]) : setError(e.message),
  })
  // When the request is done, the mesa holds its pieces.
  const listo = pedido.data?.length && pedido.data.every((p) => p.status === 'ready' || p.status === 'failed')
  useEffect(() => {
    if (listo) {
      qc.invalidateQueries({ queryKey: ['mesa', id] })
      qc.invalidateQueries({ queryKey: ['mesas'] })
      qc.invalidateQueries({ queryKey: ['saldo'] })
    }
  }, [listo, qc, id])

  const piezas: Pieza[] = [...(m?.piezas ?? []).filter((p) => !pedido.data?.some((x) => x.id === p.id)), ...(pedido.data ?? [])].reverse()
  const abrir = (p: Pieza) => {
    const urls = piezas.filter(lista).map((x) => x.resultUrl ?? x.videoUrl)
    router.push({ pathname: '/image-viewer', params: { urls: JSON.stringify(urls), initialIndex: String(Math.max(0, urls.indexOf(p.resultUrl ?? p.videoUrl))), title: m?.name ?? '' } })
  }

  // --- a new mesa: only the photo ---
  if (nueva) {
    return (
      <Pantalla titulo="Mesa nueva" onBack={() => router.back()}>
        <Text style={styles.h1}>¿Qué vendes?</Text>
        <Text style={styles.bajada}>Una foto con el celular basta. Con eso hacemos todo lo demás.</Text>
        <Accion label={subiendo ? 'Subiendo…' : 'Subir la foto'} onPress={subirPrimera} cargando={subiendo} lleno />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Pantalla>
    )
  }
  if (!m) {
    return (
      <Pantalla titulo="Mesa" onBack={() => router.back()}>
        {mesa.error ? <Text style={styles.error}>{(mesa.error as Error).message}</Text> : <ActivityIndicator color={theme.colors.textDim} />}
      </Pantalla>
    )
  }

  return (
    <Pantalla titulo={m.name} onBack={() => router.back()}>
      {/* Tu producto */}
      <View style={styles.tarjeta}>
        <Text style={styles.etiqueta}>TU PRODUCTO</Text>
        <View style={styles.fila}>
          {fotos.map((u) => (
            <Image key={u} source={{ uri: u }} style={styles.foto} />
          ))}
          {fotos.length < 9 ? (
            <Pressable onPress={agregarAngulo} accessibilityRole="button" accessibilityLabel="Agregar un ángulo" style={styles.masFoto}>
              {subiendo ? <ActivityIndicator color={theme.colors.textDim} /> : <Text style={styles.masTexto}>+</Text>}
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.meta}>Categoría: {categoria?.name ?? 'leyendo la foto…'}</Text>
      </View>

      {/* ¿Qué buscas? */}
      <Text style={styles.h2}>¿Qué buscas?</Text>
      <View style={styles.pideFila}>
        <TextInput
          value={pide}
          onChangeText={setPide}
          placeholder="en la playa, para el día de las madres…"
          placeholderTextColor={theme.colors.textDim}
          style={styles.pide}
          returnKeyType="send"
          onSubmitEditing={() => pide.trim() && pedirIdeas(pide.trim())}
        />
        <Pressable
          onPress={() => (pide.trim() ? pedirIdeas(pide.trim()) : pedirIdeas())}
          disabled={pensando}
          accessibilityRole="button"
          accessibilityLabel={pide.trim() ? 'Pedir estas ideas' : 'Otras ideas'}
          style={[styles.enviar, pensando && { opacity: 0.5 }]}
        >
          {pensando ? (
            <ActivityIndicator size="small" color={theme.colors.bg} />
          ) : (
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="M12 19V5M5 12l7-7 7 7" stroke={theme.colors.bg} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
        </Pressable>
      </View>
      {ideas?.respuesta ? <Text style={styles.respuesta}>{ideas.respuesta}</Text> : null}
      {pensando && !ideas ? <Text style={styles.meta}>Pensando ideas para tu producto…</Text> : null}
      {(ideas?.propuestas ?? []).map((p, i) => {
        const on = elegidas.includes(i)
        return (
          <Pressable
            key={`${ideas!.version}-${i}`}
            onPress={() => setElegidas(on ? elegidas.filter((x) => x !== i) : [...elegidas, i])}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={[styles.idea, { borderColor: on ? theme.colors.accent : theme.colors.border, backgroundColor: on ? theme.colors.bgElevated : theme.colors.bgRaised }]}
          >
            <View style={[styles.check, { backgroundColor: on ? theme.colors.accent : 'transparent', borderColor: on ? theme.colors.accent : theme.colors.borderStrong }]}>
              {on ? (
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                  <Path d="M5 12.5 10 17 19 7" stroke={theme.colors.bg} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.ideaNombre}>{p.nombre}</Text>
              <Text style={styles.ideaDesc}>{p.descripcion}</Text>
            </View>
          </Pressable>
        )
      })}

      {/* Formato y generar */}
      {ideas?.propuestas.length ? (
        <>
          <View style={styles.formatos}>
            {FORMATOS.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => setFormato(f.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: formato === f.id }}
                style={[styles.formato, formato === f.id && { borderColor: theme.colors.accent, backgroundColor: theme.colors.bgElevated }]}
              >
                <Text style={[styles.formatoTexto, formato === f.id && { color: theme.colors.text }]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
          <Accion
            label={generar.isPending ? 'Pidiendo…' : `Generar ${escogidas.length || ''}`.trim()}
            detalle={precio.data ? mxn(precio.data.totalCents) : precio.isFetching ? '…' : undefined}
            onPress={() => linea && generar.mutate()}
            disabled={!linea || !precio.data}
            cargando={generar.isPending}
            lleno
          />
          <Text style={styles.nota}>Se aparta de tu saldo al pedir; sólo se cobra lo que llega.</Text>
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Lo que salió aquí */}
      {piezas.length ? <Text style={styles.h2}>Lo que salió aquí</Text> : null}
      <View style={styles.reja}>
        {piezas.map((p) => (
          <Pressable key={p.id} onPress={() => lista(p) && abrir(p)} disabled={!lista(p)} style={styles.pieza} accessibilityLabel={p.label ?? 'Pieza'}>
            {lista(p) ? (
              <Image source={{ uri: (p.resultUrl ?? p.videoUrl)! }} style={styles.img} />
            ) : p.status === 'failed' ? (
              <View style={styles.piezaVacia}>
                <Text style={styles.noSalio}>No salió</Text>
                <Text style={styles.noSalioMeta} numberOfLines={3}>
                  {p.errorMessage === 'Cancelado' ? 'Cancelada, no se cobró' : 'No se cobró'}
                </Text>
              </View>
            ) : (
              <View style={styles.piezaVacia}>
                <ActivityIndicator color={theme.colors.textDim} />
                <Text style={styles.noSalioMeta}>{p.status === 'queued' || p.status === 'esperando' ? 'En cola' : 'Generando'}</Text>
              </View>
            )}
            {p.label ? (
              <Text style={styles.piezaLabel} numberOfLines={1}>
                {p.label}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </Pantalla>
  )
}

function Pantalla({ titulo, onBack, children }: { titulo: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.barra}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Atrás" style={styles.atras}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M15 5 8 12l7 7" stroke={theme.colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Text style={styles.barraTitulo} numberOfLines={1}>
            {titulo}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const c = theme.colors
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  barra: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 48 },
  atras: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barraTitulo: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: c.text },
  contenido: { padding: 16, paddingBottom: 48, gap: 12 },
  h1: { fontSize: 26, fontWeight: '600', color: c.text, letterSpacing: -0.6 },
  h2: { fontSize: 18, fontWeight: '600', color: c.text, marginTop: 12 },
  bajada: { fontSize: 14, lineHeight: 20, color: c.textMuted, marginBottom: 8 },
  tarjeta: { padding: 12, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, gap: 10 },
  etiqueta: { fontSize: 11, letterSpacing: 0.6, color: c.textDim, fontFamily: FONT.mono },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  foto: { width: 72, height: 90, borderRadius: 10, backgroundColor: c.bgElevated },
  masFoto: { width: 72, height: 90, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  masTexto: { fontSize: 24, color: c.textDim },
  meta: { fontSize: 13, color: c.textDim },
  pideFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pide: { flex: 1, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, color: c.text, fontSize: 15 },
  enviar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  respuesta: { fontSize: 13.5, lineHeight: 19, color: c.textMuted },
  idea: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'flex-start' },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  ideaNombre: { fontSize: 15, fontWeight: '600', color: c.text },
  ideaDesc: { fontSize: 13, lineHeight: 18, color: c.textMuted },
  formatos: { flexDirection: 'row', gap: 8, marginTop: 4 },
  formato: { flex: 1, minHeight: 40, borderRadius: 999, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  formatoTexto: { fontSize: 13, color: c.textMuted },
  nota: { fontSize: 12, color: c.textDim, textAlign: 'center' },
  error: { fontSize: 13.5, color: c.accent2 },
  reja: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pieza: { width: '48.5%', aspectRatio: 4 / 5, borderRadius: 12, overflow: 'hidden', backgroundColor: c.bgRaised },
  img: { width: '100%', height: '100%' },
  piezaVacia: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  noSalio: { fontSize: 14, fontWeight: '600', color: c.accent2 },
  noSalioMeta: { fontSize: 12, color: c.textDim, textAlign: 'center' },
  piezaLabel: { position: 'absolute', left: 6, right: 6, bottom: 6, fontSize: 11, color: c.text, backgroundColor: 'rgba(10,10,10,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
})
