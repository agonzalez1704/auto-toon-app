import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { FONT, Text } from '@/components/text'
import { theme } from '@/constants/theme'
import { abrirCampana, listarCampanas, lista, mxn, terminada, type CampanaResumen, type PiezaCampana } from '@/lib/estudio'

/** These screens sit on the root stack (which hides headers): each turns its own on, with «Atrás». */
const encabezado = (title: string) => (
  <Stack.Screen
    options={{ headerShown: true, title, headerStyle: { backgroundColor: theme.colors.bg }, headerTintColor: theme.colors.text, headerShadowVisible: false, headerBackTitle: 'Atrás' }}
  />
)

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

/** Her campaigns, newest first. Creating one stays on the web while Crear's campaign flow settles there. */
export function CampanasScreen() {
  const router = useRouter()
  const q = useQuery({ queryKey: ['campanas'], queryFn: listarCampanas })
  const fila = ({ item }: { item: CampanaResumen }) => (
    <Pressable
      onPress={() => router.push({ pathname: '/campanas/[id]', params: { id: item.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${item.name}`}
      style={({ pressed }) => [styles.campana, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.portada}>{item.portadaUrl ? <Image source={{ uri: item.portadaUrl }} style={StyleSheet.absoluteFill} /> : null}</View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.nombre} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.meta}>
          {item.piezas} {item.piezas === 1 ? 'pieza' : 'piezas'} · {fecha(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  )
  return (
    <>
    {encabezado('Campañas')}
    <FlatList
      style={styles.root}
      data={q.data ?? []}
      keyExtractor={(c) => c.id}
      renderItem={fila}
      contentContainerStyle={styles.lista}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={c.textDim} />}
      ListEmptyComponent={
        <Text style={styles.vacio}>
          {q.isLoading ? 'Cargando tus campañas…' : q.error ? 'No pudimos leer tus campañas. Desliza hacia abajo para intentar otra vez.' : 'Aún no tienes campañas. Por ahora se arman en Auto Toon en la web; aquí las ves al momento.'}
        </Text>
      }
    />
    </>
  )
}

/** One campaign: its pieces as they arrive, and what it has cost. Polls while a piece is on its way. */
export function CampanaScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { id } = useLocalSearchParams<{ id: string }>()
  const q = useQuery({
    queryKey: ['campana', id],
    queryFn: () => abrirCampana(id),
    refetchInterval: (query) => (query.state.data?.pieces.some((p) => !terminada(p) && !p.canceled) ? 4000 : false),
  })
  const m = q.data
  const lado = (width - 32 - 8) / 2
  const visibles = (m?.pieces ?? []).filter((p) => !p.canceled)
  const abrir = (p: PiezaCampana) => {
    if (p.videoUrl) return router.push({ pathname: '/video-player', params: { videoUrl: p.videoUrl, title: m?.name ?? '' } })
    const urls = visibles.filter((x) => lista(x) && !x.videoUrl).map((x) => x.resultUrl!)
    router.push({ pathname: '/image-viewer', params: { urls: JSON.stringify(urls), initialIndex: String(Math.max(0, urls.indexOf(p.resultUrl ?? ''))), title: m?.name ?? '' } })
  }
  return (
    <>
    {encabezado('Campaña')}
    <FlatList
      style={styles.root}
      data={visibles}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 8 }}
      contentContainerStyle={styles.lista}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={c.textDim} />}
      ListHeaderComponent={
        m ? (
          <View style={{ gap: 4, marginBottom: 8 }}>
            <Text style={styles.titulo}>{m.name}</Text>
            <Text style={styles.meta}>
              {visibles.length} {visibles.length === 1 ? 'pieza' : 'piezas'} · <Text style={styles.cobrado}>{mxn(m.spentCents)}</Text>
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item: p }) => {
        const ok = lista(p)
        const fallo = p.status === 'failed'
        return (
          <Pressable
            disabled={!ok}
            onPress={() => abrir(p)}
            accessibilityRole="imagebutton"
            accessibilityLabel={ok ? 'Ver pieza' : fallo ? 'Esta pieza no salió' : 'Generándose'}
            style={[styles.pieza, { width: lado, height: lado * 1.25 }]}
          >
            {ok && p.resultUrl ? <Image source={{ uri: p.resultUrl }} style={StyleSheet.absoluteFill} /> : null}
            {!ok ? (
              <View style={styles.centro}>
                {fallo ? <Text style={styles.fallo}>Esta pieza no salió</Text> : <ActivityIndicator color={c.textMuted} />}
              </View>
            ) : null}
          </Pressable>
        )
      }}
      ListEmptyComponent={
        <Text style={styles.vacio}>{q.isLoading ? 'Cargando la campaña…' : q.error ? 'No pudimos abrir esta campaña.' : 'Esta campaña aún no tiene piezas.'}</Text>
      }
    />
    </>
  )
}

const c = theme.colors
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  lista: { padding: 16, gap: 10, paddingBottom: 40 },
  campana: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised },
  portada: { width: 64, height: 80, borderRadius: 10, overflow: 'hidden', backgroundColor: c.bgElevated },
  titulo: { fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  nombre: { fontSize: 15, fontWeight: '600', color: c.text },
  meta: { fontSize: 12.5, color: c.textDim },
  cobrado: { fontFamily: FONT.mono, color: c.accent2 },
  pieza: { borderRadius: 12, overflow: 'hidden', backgroundColor: c.bgElevated },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  fallo: { fontSize: 13, color: c.accent2, textAlign: 'center' },
  vacio: { fontSize: 14, color: c.textDim, padding: 24, textAlign: 'center', lineHeight: 20 },
})
