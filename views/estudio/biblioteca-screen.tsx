import { useMemo, useState } from 'react'
import { FlatList, Image, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Svg, { Path } from 'react-native-svg'
import { Text } from '@/components/text'
import { theme } from '@/constants/theme'
import { verBiblioteca, verTrabajos, type PiezaBiblioteca } from '@/lib/estudio'

/** The phone tabs of the Biblioteca board. */
const FILTROS = ['Todo', 'Producto', 'Campañas', 'Video', 'Publicadas'] as const
type Filtro = (typeof FILTROS)[number]
const pasa: Record<Filtro, (p: PiezaBiblioteca) => boolean> = {
  Todo: () => true,
  Producto: (p) => p.cat === 'producto' && !p.campaign,
  Campañas: (p) => p.campaign,
  Video: (p) => !!p.video,
  Publicadas: (p) => p.isPublic,
}
const COLS = 3
const GAP = 2

/** Biblioteca, as on the web (board «Biblioteca»): everything made, newest first; a tap opens it full screen. */
export default function BibliotecaScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const [filtro, setFiltro] = useState<Filtro>('Todo')
  const piezas = useQuery({ queryKey: ['biblioteca'], queryFn: verBiblioteca })
  const trabajos = useQuery({ queryKey: ['trabajos'], queryFn: verTrabajos })
  const lista = useMemo(() => (piezas.data ?? []).filter(pasa[filtro]), [piezas.data, filtro])
  const lado = (width - GAP * (COLS - 1)) / COLS

  const abrir = (p: PiezaBiblioteca) => {
    if (p.video) return router.push({ pathname: '/video-player', params: { videoUrl: p.video, title: p.name } })
    const urls = lista.filter((x) => !x.video && x.src).map((x) => x.src!)
    router.push({ pathname: '/image-viewer', params: { urls: JSON.stringify(urls), initialIndex: String(Math.max(0, urls.indexOf(p.src ?? ''))), title: p.name } })
  }

  const enCurso = trabajos.data?.running ?? 0
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.cabecera}>
          <Text style={styles.titulo}>Biblioteca</Text>
          <Pressable onPress={() => router.push('/trabajos')} accessibilityRole="button" accessibilityLabel="Trabajos" style={styles.chip}>
            {enCurso ? <View style={styles.punto} /> : null}
            <Text style={styles.chipTexto}>{enCurso ? `${enCurso} en curso` : 'Trabajos'}</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros} style={{ flexGrow: 0 }}>
          {FILTROS.map((f) => (
            <Pressable key={f} onPress={() => setFiltro(f)} accessibilityRole="tab" accessibilityState={{ selected: f === filtro }} style={[styles.filtro, f === filtro && styles.filtroActivo]}>
              <Text style={[styles.filtroTexto, f === filtro && { color: theme.colors.bg }]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <FlatList
          data={lista}
          keyExtractor={(p) => p.id}
          numColumns={COLS}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ gap: GAP, paddingBottom: 32 }}
          initialNumToRender={18}
          windowSize={7}
          removeClippedSubviews
          getItemLayout={(_, i) => ({ length: lado + GAP, offset: (lado + GAP) * Math.floor(i / COLS), index: i })}
          refreshControl={<RefreshControl refreshing={piezas.isRefetching} onRefresh={() => (piezas.refetch(), trabajos.refetch())} tintColor={theme.colors.textDim} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => abrir(item)} accessibilityRole="imagebutton" accessibilityLabel={item.name} style={{ width: lado, height: lado, backgroundColor: theme.colors.bgElevated }}>
              {item.src ?? item.poster ? <Image source={{ uri: (item.video ? item.poster : item.src) ?? item.src! }} style={StyleSheet.absoluteFill} /> : null}
              {item.video ? (
                <View style={styles.play}>
                  <Svg width={12} height={12} viewBox="0 0 24 24">
                    <Path d="M7 4v16l13-8z" fill={theme.colors.text} />
                  </Svg>
                </View>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.vacio}>
              {piezas.isLoading ? 'Cargando tu biblioteca…' : piezas.error ? 'No pudimos leer tu biblioteca. Desliza hacia abajo para intentar otra vez.' : filtro === 'Todo' ? 'Aquí llega todo lo que generes.' : `Nada en «${filtro}» todavía.`}
            </Text>
          }
        />
      </SafeAreaView>
    </View>
  )
}

const c = theme.colors
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  titulo: { fontSize: 28, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipTexto: { fontSize: 13, color: c.text },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent },
  filtros: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filtro: { minHeight: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.border, justifyContent: 'center' },
  filtroActivo: { backgroundColor: c.text, borderColor: c.text },
  filtroTexto: { fontSize: 13, color: c.textMuted },
  play: { position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  vacio: { fontSize: 14, color: c.textDim, padding: 24, textAlign: 'center' },
})
