import { useState } from 'react'
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Text } from '@/components/text'
import { Accion } from '@/components/accion'
import { theme } from '@/constants/theme'
import { cancelarPedido, verTrabajos, type EstadoPieza, type Trabajo } from '@/lib/estudio'

/** The step colours of the web's Trabajos board. */
const COLOR: Record<EstadoPieza, string> = { ok: '#4ADE80', run: theme.colors.text, q: theme.colors.borderStrong, fail: theme.colors.accent2, cancel: theme.colors.textDim }

/**
 * Trabajos, as on the web (board «Trabajos»): each request with its pieces, its state and what it cost. Looking is
 * what moves the queue along, so it polls while something runs; what's still queued can be cancelled.
 */
export default function TrabajosScreen() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState<string | null>(null)
  const q = useQuery({
    queryKey: ['trabajos'],
    queryFn: verTrabajos,
    refetchInterval: (query) => (query.state.data?.jobs.some((j) => j.st === 'run' || j.st === 'q') ? 4000 : false),
  })
  const cancelar = useMutation({
    mutationFn: cancelarPedido,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trabajos'] })
      qc.invalidateQueries({ queryKey: ['saldo'] })
    },
    onError: (e: Error) => Alert.alert('No se pudo cancelar', e.message),
  })
  const pedirCancelar = (j: Trabajo) =>
    Alert.alert('¿Cancelar lo que sigue en cola?', 'Lo que ya salió se queda y se cobra; lo que no empezó se libera de tu saldo.', [
      { text: 'Seguir', style: 'cancel' },
      { text: 'Cancelar en cola', style: 'destructive', onPress: () => cancelar.mutate(j.id) },
    ])

  const fila = ({ item: j }: { item: Trabajo }) => {
    const abiertoEste = abierto === j.id
    return (
      <Pressable onPress={() => setAbierto(abiertoEste ? null : j.id)} accessibilityRole="button" accessibilityLabel={`${j.name}, ${j.state}`} style={styles.trabajo}>
        <View style={styles.fila}>
          <View style={styles.miniatura}>{j.src ? <Image source={{ uri: j.src }} style={StyleSheet.absoluteFill} /> : null}</View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.nombre} numberOfLines={2}>
              {j.name}
            </Text>
            <Text style={[styles.estado, { color: j.st === 'fail' ? theme.colors.accent2 : j.st === 'ok' ? theme.colors.text : theme.colors.textMuted }]}>{j.state}</Text>
            <Text style={styles.meta}>
              {j.when} · <Text style={styles.mono}>{j.cost}</Text>
            </Text>
            <View style={styles.pasos}>
              {j.steps.map((s, i) => (
                <View key={i} style={[styles.paso, { backgroundColor: COLOR[s] }]} />
              ))}
            </View>
          </View>
        </View>
        {abiertoEste ? (
          <View style={styles.detalle}>
            {j.desc ? <Text style={styles.meta}>{j.desc}</Text> : null}
            {j.detail.map((d, i) => (
              <View key={i} style={styles.lineaDetalle}>
                <View style={[styles.paso, { backgroundColor: COLOR[d.st] }]} />
                <Text style={styles.detalleTexto} numberOfLines={1}>
                  {d.label} · {d.model}
                </Text>
                <Text style={styles.detalleMeta}>{d.meta}</Text>
              </View>
            ))}
            <Text style={styles.meta}>
              Apartado <Text style={styles.mono}>{j.hold}</Text> · Cobrado <Text style={styles.mono}>{j.charged}</Text>
            </Text>
          </View>
        ) : null}
        {j.cancelable ? <Accion label="Cancelar lo que sigue en cola" onPress={() => pedirCancelar(j)} cargando={cancelar.isPending && cancelar.variables === j.id} /> : null}
      </Pressable>
    )
  }

  return (
    <FlatList
      style={styles.root}
      data={q.data?.jobs ?? []}
      keyExtractor={(j) => j.id}
      renderItem={fila}
      contentContainerStyle={styles.lista}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={theme.colors.textDim} />}
      ListEmptyComponent={
        <Text style={styles.vacio}>
          {q.isLoading ? 'Cargando tus trabajos…' : q.error ? 'No pudimos leer tus trabajos. Desliza hacia abajo para intentar otra vez.' : 'Aquí ves cada pedido mientras se genera.'}
        </Text>
      }
    />
  )
}

const c = theme.colors
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  lista: { padding: 16, gap: 10, paddingBottom: 40 },
  trabajo: { padding: 12, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, gap: 12 },
  fila: { flexDirection: 'row', gap: 12 },
  miniatura: { width: 56, height: 70, borderRadius: 10, overflow: 'hidden', backgroundColor: c.bgElevated },
  nombre: { fontSize: 15, fontWeight: '600', color: c.text },
  estado: { fontSize: 13 },
  meta: { fontSize: 12.5, color: c.textDim },
  mono: { fontFamily: 'SpaceMono', color: c.textMuted },
  pasos: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  paso: { width: 8, height: 8, borderRadius: 4 },
  detalle: { gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  lineaDetalle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detalleTexto: { flex: 1, fontSize: 13, color: c.textMuted },
  detalleMeta: { fontSize: 12, color: c.textDim, fontFamily: 'SpaceMono' },
  vacio: { fontSize: 14, color: c.textDim, padding: 24, textAlign: 'center' },
})
