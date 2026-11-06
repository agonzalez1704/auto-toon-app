import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Text } from '@/components/text'
import { Accion } from '@/components/accion'
import { theme } from '@/constants/theme'
import { mxn, verSaldo } from '@/lib/estudio'
import { APPLE_SALDO_PACKS } from '@/lib/iap-apple'
import { useAppleCreditPurchase } from '@/lib/use-apple-credit-purchase'

/**
 * The studio's balance (D15 on the web): what's left, what's set aside for pieces on their way, and this
 * month's spend. On iPhone it's topped up with Apple; everything else tops up on the web.
 */
export default function SaldoScreen() {
  const qc = useQueryClient()
  const saldo = useQuery({ queryKey: ['saldo'], queryFn: verSaldo })
  const iap = useAppleCreditPurchase({
    onSaldo: ({ pack }) => {
      qc.invalidateQueries({ queryKey: ['saldo'] })
      Alert.alert('Listo', `Se sumaron ${mxn(pack.cents)} a tu saldo.`)
    },
    onError: (m) => Alert.alert('No se pudo recargar', `${m}\n\nSi Apple ya te cobró, no se pierde: vuelve a abrir esta pantalla y se acredita.`),
  })

  const s = saldo.data
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.contenido}
      refreshControl={<RefreshControl refreshing={saldo.isRefetching} onRefresh={() => saldo.refetch()} tintColor={c.textDim} />}
    >
      <Text style={styles.etiqueta}>Tu saldo</Text>
      <Text style={styles.monto}>{s ? mxn(s.saldoCents) : '—'}</Text>
      {saldo.error ? <Text style={styles.error}>No pudimos leer tu saldo. Desliza hacia abajo para intentar otra vez.</Text> : null}
      <View style={styles.fila}>
        <View style={styles.dato}>
          <Text style={styles.datoValor}>{s ? mxn(s.apartadoCents) : '—'}</Text>
          <Text style={styles.datoNombre}>Apartado para lo que se está generando</Text>
        </View>
        <View style={styles.dato}>
          <Text style={styles.datoValor}>{s ? mxn(s.gastoMesCents) : '—'}</Text>
          <Text style={styles.datoNombre}>Gastado este mes</Text>
        </View>
      </View>

      <Text style={[styles.etiqueta, { marginTop: 28 }]}>Recargar</Text>
      {Platform.OS === 'ios' ? (
        <View style={{ gap: 10 }}>
          {APPLE_SALDO_PACKS.map((p, i) => (
            <Accion
              key={p.productId}
              label={`Sumar ${mxn(p.cents)}`}
              detalle={iap.products[p.productId]?.displayPrice}
              lleno={i === 1}
              disabled={!iap.connected}
              cargando={iap.isPurchasing}
              onPress={() => iap.comprarSaldo(p.productId)}
            />
          ))}
          <Text style={styles.nota}>
            Lo pagas con tu cuenta de Apple. Cada pieza se cobra de aquí al pedirla, con su precio a la vista antes de
            generar.
          </Text>
          <Accion label="Recuperar una recarga" onPress={() => iap.restore()} cargando={iap.isRestoring} />
        </View>
      ) : (
        <Text style={styles.nota}>Recarga tu saldo desde Auto Toon en la web; aquí se ve al momento.</Text>
      )}
    </ScrollView>
  )
}

const c = theme.colors
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  contenido: { padding: 20, paddingBottom: 48 },
  etiqueta: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: c.textDim, marginBottom: 8 },
  monto: { fontSize: 44, fontWeight: '700', color: c.text, letterSpacing: -1 },
  error: { fontSize: 13, color: c.accent2, marginTop: 6 },
  fila: { flexDirection: 'row', gap: 10, marginTop: 16 },
  dato: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, gap: 4 },
  datoValor: { fontSize: 16, color: c.text, fontFamily: 'SpaceMono' },
  datoNombre: { fontSize: 12, color: c.textDim, lineHeight: 16 },
  nota: { fontSize: 13, lineHeight: 19, color: c.textMuted, marginTop: 4 },
})
