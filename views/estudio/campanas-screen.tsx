import { useEffect, useState } from 'react'
import { FlatList, Image, Modal, Pressable, RefreshControl, StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { FONT, Text } from '@/components/text'
import { BlurViewSafe, isBlurAvailable } from '@/components/glass/blur-view-safe'
import { theme } from '@/constants/theme'
import api from '@/lib/api'
import { listarCampanas, lista, mxn, terminada, type Campana, type CampanaResumen } from '@/lib/estudio'

/**
 * Campañas, as the board «Campanas» draws it: one campaign by its eight stages, its key visuals as they arrive and the
 * assistant's next step. Asking for that step, or starting a campaign, stays on the web for now: the card says so.
 */

/** What GET /api/campanas/[id] adds for the board, derived on the web from campana.ts (its one source). */
interface Etapas {
  current: number
  stages: { name: string; note: string; done: boolean }[]
  shots: { id: string; n: string; name: string }[]
  hero: { id: string; n: string } | null
  pendientes: ('multi' | 'video')[]
}
interface Abierta {
  campana: Campana & { brief?: { categoryName?: string } }
  etapas: Etapas
}
const abrir = async (id: string) => (await api.get<Abierta>(`/api/campanas/${encodeURIComponent(id)}`)).data

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const pad = (n: number) => String(n).padStart(2, '0')
const dia = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

/** The tab: her latest campaign, and the name opens the others. */
export function CampanasScreen() {
  const [elegida, setElegida] = useState<string>()
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Vista id={elegida} onPick={setElegida} />
      </SafeAreaView>
    </View>
  )
}

/** One campaign by id, on the root stack (which hides headers): it turns its own on, with «Atrás». */
export function CampanaScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{ title: '', headerStyle: { backgroundColor: c.bg }, headerTintColor: c.text, headerShadowVisible: false, headerBackTitle: 'Atrás' }}
      />
      <Vista id={id} onPick={(x) => router.setParams({ id: x })} />
    </View>
  )
}

function Vista({ id: pedida, onPick }: { id?: string; onPick: (id: string) => void }) {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const [menu, setMenu] = useState(false)
  const [descartadas, setDescartadas] = useState<string[]>([])
  const todas = useQuery({ queryKey: ['campanas'], queryFn: listarCampanas })
  const id = pedida ?? todas.data?.[0]?.id
  const q = useQuery({
    queryKey: ['campana-etapas', id],
    queryFn: () => abrir(id!),
    enabled: !!id,
    // While a piece is on its way, keep looking (the web's KeepFresh).
    refetchInterval: (query) => (query.state.data?.campana.pieces.some((p) => !terminada(p) && !p.canceled) ? 4000 : false),
  })
  const refrescar = () => {
    todas.refetch()
    if (id) q.refetch()
  }

  const m = q.data
  const e = m?.etapas
  const k = m?.campana
  const hero = e?.hero ?? null
  const next = hero ? (e!.pendientes.find((p) => !descartadas.includes(`${p}-${hero.id}`)) ?? null) : null

  // Key visuals: the board shows four tiles; past four, three and «04–NN».
  const piezas = new Map((k?.pieces ?? []).map((p) => [p.id, p]))
  const tomas = (e?.shots ?? []).flatMap((s) => (piezas.has(s.id) ? [{ ...s, p: piezas.get(s.id)! }] : []))
  const listas = tomas.filter((t) => lista(t.p))
  const visibles = tomas.length > 4 ? tomas.slice(0, 3) : tomas
  const lado = (width - 32 - 24) / 4
  const verToma = (i: number) => router.push({ pathname: '/visor', params: { ids: JSON.stringify(listas.map((t) => t.id)), i: String(i) } })
  const resto = listas.findIndex((t) => !visibles.includes(t))

  const etapa = ({ item: s, index: i }: { item: Etapas['stages'][number]; index: number }) => {
    const now = i + 1 === e!.current && !s.done
    return (
      <View style={styles.etapa}>
        <View style={styles.riel}>
          <View style={[styles.punto, { backgroundColor: s.done ? '#12201A' : now ? '#1F1F1F' : 'transparent', borderColor: s.done ? VERDE_OK : now ? c.accent : '#333333' }]}>
            <Text style={[styles.marca, { color: s.done ? VERDE_OK : now ? c.text : c.textDim }]}>{s.done ? '✓' : String(i + 1)}</Text>
          </View>
          <View style={[styles.linea, { backgroundColor: i === e!.stages.length - 1 ? 'transparent' : s.done ? VERDE_OK : c.border }]} />
        </View>
        <View style={styles.etapaTexto}>
          <Text style={[styles.etapaNombre, { fontWeight: now ? '600' : '500', color: s.done || now ? c.text : c.textDim }]}>{s.name}</Text>
          <Text style={styles.etapaNota}>{s.note}</Text>
        </View>
      </View>
    )
  }

  const cabeza = k && e ? (
    <View style={styles.cabeza}>
      <Text style={styles.kicker}>Campaña · {k.brief?.categoryName ?? dia(k.createdAt)}</Text>
      <Pressable
        onPress={() => setMenu(true)}
        disabled={(todas.data?.length ?? 0) < 2}
        hitSlop={{ top: 10, bottom: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`${k.name}. Cambiar de campaña`}
        style={styles.nombreFila}
      >
        <Text style={styles.h1}>{k.name}</Text>
        {(todas.data?.length ?? 0) > 1 ? (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="m6 9 6 6 6-6" stroke={c.textDim} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : null}
      </Pressable>
      <Text style={styles.sub}>
        Etapa {e.current} de {e.stages.length} · gastado <Text style={styles.gasto}>{mxn(k.spentCents)}</Text>
      </Text>
    </View>
  ) : null

  const pie = k && e ? (
    <View style={styles.pie}>
      <View style={styles.seccion}>
        <View style={styles.seccionCabeza}>
          <Text style={styles.h2}>Key visuals</Text>
          <Text style={styles.seccionMeta}>
            {listas.length} de {plural(tomas.length, 'toma', 'tomas')}
          </Text>
        </View>
        <View style={styles.reja}>
          {visibles.map((t) => {
            const ok = lista(t.p)
            const fallo = t.p.status === 'failed'
            return (
              <Pressable
                key={t.id}
                disabled={!ok}
                onPress={() => verToma(listas.indexOf(t))}
                accessibilityRole="imagebutton"
                accessibilityLabel={ok ? `Ver ${t.name}` : fallo ? `${t.name}: no salió` : `${t.name}: generándose`}
                style={{ width: lado, height: 104 }}
              >
                <View
                  style={[
                    styles.toma,
                    { backgroundColor: ok ? c.bgElevated : 'transparent', borderColor: ok ? 'transparent' : fallo ? c.borderStrong : c.border, borderStyle: ok || fallo ? 'solid' : 'dashed' },
                  ]}
                >
                  {ok && t.p.resultUrl ? <Image source={{ uri: t.p.resultUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                  <Text style={styles.tomaN}>{t.n}</Text>
                </View>
                {/* outline: 2px, offset 2px — the shot the assistant's card is about. */}
                {next && t.id === hero?.id ? <View pointerEvents="none" style={styles.anillo} /> : null}
              </Pressable>
            )
          })}
          {tomas.length > 4 ? (
            <Pressable
              disabled={resto < 0}
              onPress={() => verToma(resto)}
              accessibilityRole="button"
              accessibilityLabel={`Ver las tomas 04 a ${pad(tomas.length)}`}
              style={[styles.resto, { width: lado }]}
            >
              <Text style={styles.restoTexto}>04–{pad(tomas.length)}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {hero && next ? (
        <Sigue
          on={`· sobre la toma ${hero.n}`}
          titulo={next === 'multi' ? 'Aquí va un multi-ángulo' : 'Ponla en movimiento'}
          texto={
            next === 'multi'
              ? `La ${hero.n} es tu toma héroe. Con tres ángulos más cubres el carrusel y el anuncio sin volver a dirigirla.`
              : `La ${hero.n} pide un reel: un solo gesto, cámara casi quieta, 5 s.`
          }
          nota="Se pide en la web"
          onAhoraNo={() => setDescartadas((x) => [...x, `${next}-${hero.id}`])}
        />
      ) : null}
    </View>
  ) : null

  const sinCampanas = !pedida && todas.data?.length === 0
  const error = q.error ?? (id ? null : todas.error)
  const vacio = sinCampanas ? (
    <>
      <View style={styles.cabeza}>
        <Text style={styles.kicker}>Campaña</Text>
        <Text style={styles.h1}>Todavía no tienes campañas</Text>
        <Text style={styles.sub}>Aquí ves cada campaña por etapas, con lo que lleva gastado.</Text>
      </View>
      <View style={styles.pie}>
        <Sigue
          on="· para empezar"
          titulo="Una campaña completa, guiada"
          texto="Por ahora las campañas se arman en Auto Toon en la web: siete preguntas y queda lista. En cuanto la empieces, aquí la ves al momento."
          nota="Se arma en la web"
        />
      </View>
    </>
  ) : todas.isLoading || q.isLoading ? (
    <Text style={styles.aviso}>Cargando tu campaña…</Text>
  ) : error || (m && !e) ? (
    <Text style={styles.aviso}>No pudimos abrir tus campañas. Desliza hacia abajo para intentar otra vez.</Text>
  ) : null

  return (
    <>
      <FlatList
        style={styles.root}
        data={e?.stages ?? []}
        keyExtractor={(s) => s.name}
        renderItem={etapa}
        ListHeaderComponent={cabeza}
        ListFooterComponent={pie}
        ListEmptyComponent={vacio}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching || todas.isRefetching} onRefresh={refrescar} tintColor={c.textDim} />}
      />
      <Menu
        visible={menu}
        campanas={todas.data ?? []}
        actual={id}
        onClose={() => setMenu(false)}
        onPick={(x) => {
          setMenu(false)
          onPick(x)
        }}
      />
    </>
  )
}

/** The board's name switcher (an invisible select on the web), as a sheet. New campaigns are made on the web. */
function Menu({ visible, campanas, actual, onClose, onPick }: { visible: boolean; campanas: CampanaResumen[]; actual?: string; onClose: () => void; onPick: (id: string) => void }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable style={styles.velo} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" />
        <View style={[styles.hoja, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.asa} />
          <Text style={styles.h2}>Tus campañas</Text>
          <FlatList
            data={campanas}
            keyExtractor={(x) => x.id}
            style={{ maxHeight: 420 }}
            renderItem={({ item: x }) => (
              <Pressable
                onPress={() => onPick(x.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: x.id === actual }}
                accessibilityLabel={`Abrir ${x.name}`}
                style={({ pressed }) => [styles.opcion, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.opcionPortada}>{x.portadaUrl ? <Image source={{ uri: x.portadaUrl }} style={StyleSheet.absoluteFill} /> : null}</View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.opcionNombre} numberOfLines={1}>
                    {x.name}
                  </Text>
                  <Text style={styles.etapaNota}>
                    {plural(x.piezas, 'pieza', 'piezas')} · {dia(x.createdAt)}
                  </Text>
                </View>
                {x.id === actual ? (
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                ) : null}
              </Pressable>
            )}
          />
          <Text style={styles.hojaNota}>Las campañas nuevas se arman en la web.</Text>
        </View>
      </View>
    </Modal>
  )
}

/** The assistant's card: pink glow behind, a beam running round its border, frosted inside. */
function Sigue({ on, titulo, texto, nota, onAhoraNo }: { on: string; titulo: string; texto: string; nota: string; onAhoraNo?: () => void }) {
  const [caja, setCaja] = useState({ width: 0, height: 0 })
  return (
    <View style={styles.sigue}>
      <View pointerEvents="none" style={styles.brillo}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="brillo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c.accent2} stopOpacity={0.28} />
              <Stop offset="1" stopColor={c.accent2} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#brillo)" />
        </Svg>
      </View>
      <View style={styles.beam} onLayout={(ev) => setCaja(ev.nativeEvent.layout)}>
        {caja.width ? <Haz w={caja.width} h={caja.height} /> : null}
        <View style={styles.sigueCaja}>
          <BlurViewSafe intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isBlurAvailable ? 'rgba(20,20,20,0.66)' : 'rgba(20,20,20,0.94)' }]} />
          <View style={styles.sigueKicker}>
            <Text style={styles.sigueSigue}>Sigue</Text>
            <Text style={styles.sigueOn}>{on}</Text>
          </View>
          <Text style={styles.sigueTitulo}>{titulo}</Text>
          <Text style={styles.sigueTexto}>{texto}</Text>
          <View style={styles.sigueFila}>
            <View style={styles.nota}>
              <Text style={styles.notaTexto}>{nota}</Text>
            </View>
            {onAhoraNo ? (
              <Pressable onPress={onAhoraNo} accessibilityRole="button" style={({ pressed }) => [styles.ahoraNo, pressed && { opacity: 0.7 }]}>
                <Text style={styles.ahoraNoTexto}>Ahora no</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  )
}

// The board's conic-gradient(transparent 0 70%, pink 82%, green 92%, transparent 100%), as thin wedges.
const VERDE_OK = '#4ADE80'
const mezcla = (t: number) =>
  '#' + [1, 3, 5].map((o) => Math.round(parseInt(theme.colors.accent2.slice(o, o + 2), 16) * (1 - t) + parseInt(theme.colors.accent.slice(o, o + 2), 16) * t).toString(16).padStart(2, '0')).join('')
const CONO = Array.from({ length: 30 }, (_, i) => {
  const a = 0.7 + i * 0.01
  const t = a + 0.005
  const [color, opacidad] = t < 0.82 ? [theme.colors.accent2, (t - 0.7) / 0.12] : t < 0.92 ? [mezcla((t - 0.82) / 0.1), 1] : [theme.colors.accent, 1 - (t - 0.92) / 0.08]
  return { a, color, opacidad }
})
/** A wedge from turn a0 to a1 (0 = top, clockwise) of a circle of radius r centred at (r, r). */
const cuna = (r: number, a0: number, a1: number) => {
  const p = (a: number) => `${r + r * Math.sin(a * 2 * Math.PI)} ${r - r * Math.cos(a * 2 * Math.PI)}`
  return `M${r} ${r}L${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}Z`
}

/** The beam: the cone, turning once every 5 s (still when she asked for less motion). */
function Haz({ w, h }: { w: number; h: number }) {
  const quieto = useReducedMotion()
  const giro = useSharedValue(0)
  useEffect(() => {
    if (!quieto) giro.value = withRepeat(withTiming(360, { duration: 5000, easing: Easing.linear }), -1, false)
  }, [quieto, giro])
  const estilo = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.value}deg` }] }))
  const lado = Math.hypot(w, h)
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: lado, height: lado, left: (w - lado) / 2, top: (h - lado) / 2 }, estilo]}>
      <Svg width={lado} height={lado}>
        {CONO.map((s) => (
          <Path key={s.a} d={cuna(lado / 2, s.a, s.a + 0.0105)} fill={s.color} fillOpacity={s.opacidad} />
        ))}
      </Svg>
    </Animated.View>
  )
}

const c = theme.colors
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  // header: padding 16 16 12, gap 4; then the body's 8 on top
  cabeza: { gap: 4, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 20 },
  kicker: { fontSize: 12, color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.72 },
  nombreFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  h1: { flexShrink: 1, fontSize: 24, fontWeight: '600', letterSpacing: -0.48, color: c.text },
  sub: { fontSize: 14, color: c.textMuted },
  gasto: { fontFamily: FONT.mono, color: c.accent2 },
  // stages
  etapa: { flexDirection: 'row', gap: 12, minHeight: 58, paddingHorizontal: 16 },
  riel: { width: 24, alignItems: 'center' },
  punto: { width: 24, height: 24, borderRadius: 999, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  marca: { fontFamily: FONT.mono, fontSize: 11 },
  linea: { flexGrow: 1, width: 1.5 },
  etapaTexto: { flex: 1, minWidth: 0, gap: 2, paddingBottom: 14 },
  etapaNombre: { fontSize: 16 },
  etapaNota: { fontSize: 13, color: c.textMuted },
  // after the stages: gap 20 between sections, padding-bottom 24 (the list's)
  pie: { paddingTop: 20, paddingHorizontal: 16, gap: 20 },
  seccion: { gap: 10 },
  seccionCabeza: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  h2: { fontSize: 17, fontWeight: '600', color: c.text },
  seccionMeta: { fontSize: 14, color: c.textMuted },
  reja: { flexDirection: 'row', gap: 8 },
  toma: { ...StyleSheet.absoluteFillObject, borderRadius: 10, borderWidth: 1, overflow: 'hidden', justifyContent: 'flex-end', padding: 6 },
  tomaN: { fontFamily: FONT.mono, fontSize: 11, color: '#D4D4D4' },
  anillo: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 14, borderWidth: 2, borderColor: c.text },
  resto: { height: 104, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  restoTexto: { fontSize: 12, color: c.textDim },
  aviso: { fontSize: 14, lineHeight: 20, color: c.textDim, padding: 24, textAlign: 'center' },
  // the assistant's card
  sigue: { paddingTop: 6 },
  brillo: { position: 'absolute', top: -40, bottom: -40, left: -30, right: -30 },
  beam: { borderRadius: 18, padding: 1, overflow: 'hidden', backgroundColor: c.border },
  sigueCaja: { gap: 10, padding: 16, borderRadius: 17, overflow: 'hidden' },
  sigueKicker: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sigueSigue: { fontSize: 12, fontWeight: '600', letterSpacing: 0.96, textTransform: 'uppercase', color: c.accent2 },
  sigueOn: { fontSize: 12, color: c.textMuted },
  sigueTitulo: { fontSize: 18, fontWeight: '600', lineHeight: 23.4, color: c.text },
  sigueTexto: { fontSize: 14, lineHeight: 21, color: c.textMuted },
  sigueFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  // where the board's «3 ángulos · $precio» button is: asking stays on the web for now
  nota: { flexGrow: 1, minHeight: 48, borderRadius: 999, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  notaTexto: { fontSize: 14, color: c.textDim },
  ahoraNo: { minHeight: 48, paddingHorizontal: 14, justifyContent: 'center' },
  ahoraNoTexto: { fontSize: 15, color: c.textMuted },
  // the switcher's sheet
  modal: { flex: 1, justifyContent: 'flex-end' },
  velo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  hoja: { backgroundColor: c.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  asa: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, marginBottom: 6 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8 },
  opcionPortada: { width: 40, height: 50, borderRadius: 8, overflow: 'hidden', backgroundColor: c.bgOverlay },
  opcionNombre: { fontSize: 16, fontWeight: '500', color: c.text },
  hojaNota: { fontSize: 13, color: c.textDim, paddingTop: 4 },
})
