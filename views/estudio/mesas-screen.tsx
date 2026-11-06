import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { abrirEnCrear } from '@/stores/use-mesa-abierta'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Svg, { Path, Rect } from 'react-native-svg'
import { FONT, Text, TextInput } from '@/components/text'
import { theme } from '@/constants/theme'
import { guardarMesa, listarMesasDesde, miniatura, mxn, type MesaResumen } from '@/lib/estudio'

const c = theme.colors
/** The board's cover tones, cycled per row, behind a mesa that has no picture yet. */
const TONOS = ['#2C2A26', '#232A28', '#262626', '#2E2926']

/**
 * The board «Mesas», as a sheet over Crear: one mesa per product — its photo, its locked look and what was made
 * there. Picking one (or «Mesa nueva») closes the sheet and sets `?mesa=` on the Crear tab underneath.
 */
export default function MesasScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  // Crear opens this sheet with `actual` = the mesa on screen, so «Aquí estás» marks it.
  const { actual } = useLocalSearchParams<{ actual?: string }>()
  const mesas = useQuery({ queryKey: ['mesas', actual ?? null], queryFn: () => listarMesasDesde(actual ?? null) })
  const [editando, setEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [fallo, setFallo] = useState<string | null>(null)

  const irA = abrirEnCrear

  /** The check or Enter: closes the field, and saves only when the name really changed. */
  const guardarNombre = async (m: MesaResumen) => {
    const nuevo = nombre.trim()
    setEditando(null)
    if (!nuevo || nuevo === m.name) return
    // Show the new name now; the refetch below confirms it (or puts the old one back).
    qc.setQueryData<MesaResumen[]>(['mesas'], (old) => old?.map((x) => (x.id === m.id ? { ...x, name: nuevo } : x)))
    try {
      await guardarMesa(m.id, { name: nuevo })
    } catch {
      setFallo(m.id)
    }
    qc.invalidateQueries({ queryKey: ['mesas'] })
    qc.invalidateQueries({ queryKey: ['mesa', m.id] })
  }

  const fila = ({ item: m, index }: { item: MesaResumen; index: number }) => {
    const portada = m.portadaUrl ?? m.photoUrl
    if (editando === m.id)
      return (
        <View style={styles.editar}>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            onSubmitEditing={() => guardarNombre(m)}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            accessibilityLabel="Nombre de la mesa"
            placeholderTextColor={c.textDim}
            style={styles.input}
          />
          <Pressable onPress={() => guardarNombre(m)} accessibilityRole="button" accessibilityLabel="Guardar el nombre" style={({ pressed }) => [styles.guardar, pressed && styles.pressed]}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c.bg} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12.5 10 17 19 7" />
            </Svg>
          </Pressable>
        </View>
      )
    return (
      <View>
        <Pressable
          onPress={() => irA(m.id)}
          accessibilityRole="button"
          accessibilityLabel={`Abrir ${m.name}`}
          accessibilityState={{ selected: m.actual }}
          style={({ pressed }) => [styles.mesa, { borderColor: m.actual ? c.accent : c.border }, pressed && styles.pressed]}
        >
          <View style={[styles.portada, { backgroundColor: TONOS[index % 4] }]}>
            {portada ? (
              <Image source={{ uri: miniatura(portada, 56) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
            ) : (
              <Svg width={17} height={27} viewBox="0 0 40 64" fill="none" stroke="#D4D4D4" strokeWidth={2}>
                <Rect x={14} y={2} width={12} height={8} rx={2} />
                <Path d="M16 10v6c-6 3-9 8-9 15v24a6 6 0 0 0 6 6h14a6 6 0 0 0 6-6V31c0-7-3-12-9-15v-6" />
                <Rect x={11} y={34} width={18} height={14} rx={2} />
              </Svg>
            )}
            {/* The cover is the first piece made here; the product photo rides in the corner. */}
            {m.portadaUrl && m.photoUrl ? (
              <View style={styles.tumba}>
                <Image source={{ uri: miniatura(m.photoUrl, 20) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </View>
            ) : null}
          </View>
          <View style={styles.texto}>
            <View style={styles.nombreFila}>
              <Text style={styles.nombre} numberOfLines={1}>
                {m.name}
              </Text>
              {m.actual ? (
                <View style={styles.aqui}>
                  <Text style={styles.aquiTexto}>Aquí estás</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {m.piezas} {m.piezas === 1 ? 'pieza' : 'piezas'} · {m.cuando}
              {m.cents ? ` · ${mxn(m.cents)}` : ''}
            </Text>
            {m.estiloLabel ? (
              <View style={styles.estilo}>
                <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M12 3.4c-3.1 4-6.2 6.7-6.2 10.1a6.2 6.2 0 0 0 12.4 0c0-3.4-3.1-6.1-6.2-10.1Z" />
                </Svg>
                <Text style={styles.estiloTexto} numberOfLines={1}>
                  {m.estiloLabel}
                </Text>
              </View>
            ) : null}
            {fallo === m.id ? <Text style={styles.fallo}>No pudimos cambiarle el nombre. Inténtalo otra vez.</Text> : null}
          </View>
          <View style={styles.hueco} />
        </Pressable>
        <Pressable
          onPress={() => {
            setEditando(m.id)
            setNombre(m.name)
            setFallo(null)
          }}
          hitSlop={5}
          accessibilityRole="button"
          accessibilityLabel={`Renombrar ${m.name}`}
          style={({ pressed }) => [styles.lapiz, pressed && styles.pressed]}
        >
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 20h4l10-10-4-4L4 16v4ZM13.5 6.5l4 4" />
          </Svg>
        </Pressable>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.cabecera}>
        <View style={styles.tituloFila}>
          <Text style={styles.titulo}>Mesas</Text>
          <Pressable onPress={() => router.back()} hitSlop={4} accessibilityRole="button" accessibilityLabel="Cerrar" style={({ pressed }) => [styles.cerrar, pressed && styles.pressed]}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth={1.75} strokeLinecap="round">
              <Path d="m6 6 12 12M18 6 6 18" />
            </Svg>
          </Pressable>
        </View>
        <Text style={styles.bajada}>Cada producto en la suya: su foto, su estilo fijo y lo que ya generaste.</Text>
      </View>
      <FlatList
        data={mesas.data ?? []}
        keyExtractor={(m) => m.id}
        renderItem={fila}
        extraData={[editando, nombre, fallo]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.lista, { paddingBottom: 16 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={mesas.isRefetching} onRefresh={() => mesas.refetch()} tintColor={c.textDim} />}
        ListHeaderComponent={
          <Pressable
            onPress={() => irA('nueva')}
            accessibilityRole="button"
            accessibilityLabel="Empezar una mesa nueva"
            style={({ pressed }) => [styles.nueva, pressed && styles.pressed]}
          >
            <View style={styles.mas}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.bg} strokeWidth={2.25} strokeLinecap="round">
                <Path d="M12 6v12M6 12h12" />
              </Svg>
            </View>
            <View style={styles.nuevaTexto}>
              <Text style={styles.nombre}>Mesa nueva</Text>
              <Text style={styles.nuevaBajada}>Otra marca, otro producto, desde cero.</Text>
            </View>
          </Pressable>
        }
        ListEmptyComponent={
          mesas.isLoading ? (
            <ActivityIndicator color={c.textDim} style={styles.cargando} />
          ) : mesas.error ? (
            <Pressable onPress={() => mesas.refetch()} accessibilityRole="button" style={styles.errorCaja}>
              <Text style={styles.errorTexto}>No pudimos traer tus mesas. Toca para intentarlo otra vez.</Text>
            </Pressable>
          ) : null
        }
        ListFooterComponent={
          <Text style={styles.nota}>
            Una mesa guarda la foto del producto, lo que le pediste, el estilo fijo y las piezas que salieron. Nada se mezcla entre mesas.
          </Text>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  pressed: { opacity: 0.85 },
  cabecera: { gap: 12, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 10 },
  tituloFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  titulo: { fontFamily: FONT.display, fontSize: 34, lineHeight: 36, textTransform: 'uppercase', color: c.text },
  cerrar: { width: 40, height: 40, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, alignItems: 'center', justifyContent: 'center' },
  bajada: { fontSize: 13.5, lineHeight: 20.25, color: c.textMuted },
  lista: { gap: 10, paddingTop: 4, paddingHorizontal: 16 },
  nueva: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong },
  mas: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  nuevaTexto: { flexShrink: 1, gap: 2 },
  nuevaBajada: { fontSize: 12.5, color: c.textMuted },
  mesa: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, backgroundColor: c.bgRaised },
  portada: { width: 56, height: 70, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tumba: { position: 'absolute', bottom: 3, left: 3, width: 20, height: 25, overflow: 'hidden', borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', backgroundColor: c.bgElevated },
  texto: { flex: 1, minWidth: 0, gap: 4 },
  nombreFila: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  nombre: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: c.text },
  aqui: { flexShrink: 0, minHeight: 20, justifyContent: 'center', paddingHorizontal: 7, borderRadius: 999, backgroundColor: c.accent },
  aquiTexto: { fontSize: 10.5, fontWeight: '600', color: c.bg },
  meta: { fontFamily: FONT.mono, fontSize: 11.5, color: c.textDim },
  estilo: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, minHeight: 22, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: c.accent, backgroundColor: c.bgOverlay },
  estiloTexto: { flexShrink: 1, fontSize: 11, color: c.text },
  fallo: { fontSize: 12, color: c.textMuted },
  hueco: { width: 18 },
  lapiz: { position: 'absolute', top: '50%', marginTop: -17, right: 10, width: 34, height: 34, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgElevated, alignItems: 'center', justifyContent: 'center' },
  editar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 76, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: c.accent, backgroundColor: c.bgRaised },
  input: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, color: c.text, fontSize: 15, fontWeight: '600' },
  guardar: { width: 44, height: 44, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  cargando: { marginTop: 24 },
  errorCaja: { minHeight: 44, justifyContent: 'center', paddingVertical: 12 },
  errorTexto: { fontSize: 13.5, lineHeight: 20, color: c.textMuted },
  nota: { marginTop: 6, marginHorizontal: 2, fontSize: 12, lineHeight: 18, color: '#6E6E6E' },
})
