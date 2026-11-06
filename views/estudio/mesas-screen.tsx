import { FlatList, Image, Pressable, RefreshControl, StatusBar, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Svg, { Path } from 'react-native-svg'
import { FONT, Text } from '@/components/text'
import { theme } from '@/constants/theme'
import { listarMesas, mxn, verSaldo, type MesaResumen } from '@/lib/estudio'

/**
 * Crear, as on the web (board «Mesas»): one mesa per product — its photo, its locked look and what was made
 * there. «Mesa nueva» starts from a photo; a mesa opens where it was left.
 */
export default function MesasScreen() {
  const router = useRouter()
  const mesas = useQuery({ queryKey: ['mesas'], queryFn: listarMesas })
  const saldo = useQuery({ queryKey: ['saldo'], queryFn: verSaldo })

  const fila = ({ item }: { item: MesaResumen }) => (
    <Pressable
      onPress={() => router.push({ pathname: '/mesa/[id]', params: { id: item.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${item.name}`}
      style={({ pressed }) => [styles.mesa, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.portada}>
        {item.portadaUrl ?? item.photoUrl ? <Image source={{ uri: (item.portadaUrl ?? item.photoUrl)! }} style={styles.img} /> : null}
      </View>
      <View style={styles.mesaTexto}>
        <Text style={styles.mesaNombre} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.mesaMeta} numberOfLines={1}>
          {item.piezas} {item.piezas === 1 ? 'pieza' : 'piezas'} · {item.cuando}
          {item.cents ? ` · ${mxn(item.cents)}` : ''}
        </Text>
        {item.estiloLabel ? (
          <View style={styles.estilo}>
            <Text style={styles.estiloTexto} numberOfLines={1}>
              {item.estiloLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.cabecera}>
          <Text style={styles.titulo}>Crear</Text>
          <Pressable onPress={() => router.push('/account')} accessibilityRole="button" accessibilityLabel="Tu saldo" style={styles.saldo}>
            <Text style={styles.saldoTexto}>{saldo.data ? mxn(saldo.data.saldoCents) : '—'}</Text>
          </Pressable>
        </View>
        <FlatList
          data={mesas.data ?? []}
          keyExtractor={(m) => m.id}
          renderItem={fila}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={mesas.isRefetching} onRefresh={() => (mesas.refetch(), saldo.refetch())} tintColor={theme.colors.textDim} />}
          ListHeaderComponent={
            <>
              <Text style={styles.bajada}>Cada producto en su mesa: su foto, su estilo y lo que ya generaste.</Text>
              <Pressable
                onPress={() => router.push({ pathname: '/mesa/[id]', params: { id: 'nueva' } })}
                accessibilityRole="button"
                accessibilityLabel="Mesa nueva"
                style={({ pressed }) => [styles.nueva, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.mas}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 5v14M5 12h14" stroke={theme.colors.bg} strokeWidth={2.4} strokeLinecap="round" />
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mesaNombre}>Mesa nueva</Text>
                  <Text style={styles.mesaMeta}>Otro producto, desde su foto.</Text>
                </View>
              </Pressable>
              {mesas.error ? <Text style={styles.error}>{(mesas.error as Error).message}</Text> : null}
            </>
          }
          ListEmptyComponent={mesas.isLoading ? <Text style={styles.mesaMeta}>Cargando tus mesas…</Text> : null}
        />
      </SafeAreaView>
    </View>
  )
}

const c = theme.colors
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  safe: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  titulo: { fontSize: 28, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
  saldo: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.border, justifyContent: 'center' },
  saldoTexto: { fontSize: 13, color: c.text, fontFamily: FONT.mono },
  lista: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  bajada: { fontSize: 14, lineHeight: 20, color: c.textMuted, marginBottom: 12 },
  nueva: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong, marginBottom: 10 },
  mas: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  mesa: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised },
  portada: { width: 64, height: 80, borderRadius: 10, overflow: 'hidden', backgroundColor: c.bgElevated },
  img: { width: '100%', height: '100%' },
  mesaTexto: { flex: 1, gap: 4 },
  mesaNombre: { fontSize: 16, fontWeight: '600', color: c.text },
  mesaMeta: { fontSize: 12.5, color: c.textDim },
  estilo: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: c.accentBorder },
  estiloTexto: { fontSize: 11.5, color: c.accent },
  error: { fontSize: 13, color: c.accent2, marginBottom: 8 },
})
