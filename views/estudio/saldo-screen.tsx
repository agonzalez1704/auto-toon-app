import { useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, StatusBar, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAltoBarra } from '@/lib/hooks/use-alto-barra'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Svg, { Path } from 'react-native-svg'
import { FONT, Text } from '@/components/text'
import { theme } from '@/constants/theme'
import { Image } from 'expo-image'
import { miniatura, mxn } from '@/lib/estudio'
import { verSaldoDetalle, type EstadoMovimiento, type Movimiento } from '@/lib/saldo-api'
import { APPLE_SALDO_PACKS } from '@/lib/iap-apple'
import { useAppleCreditPurchase } from '@/lib/use-apple-credit-purchase'

/**
 * Saldo, as the board «Gasto» draws it: what's available and what's set aside, a top-up (Apple's fixed
 * packs on iPhone; the web everywhere else), this month's charges and give-backs, and every movement.
 */

const c = theme.colors
const PINK = c.accent2
// What came back or was paid in is white: the green «ready» is gone (dos calmos, uno fuerte).
const GREEN = theme.colors.text
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
// [label, state color, amount color, struck through, thumbnail opacity] — the web's table (ajustes-view).
const ESTADO: Record<EstadoMovimiento, [string, string, string, boolean, number]> = {
  abonado: ['Abonado', GREEN, GREEN, false, 1],
  cobrada: ['Cobrada', c.textDim, c.text, false, 1],
  'en-curso': ['Apartado · en curso', c.textMuted, c.textDim, false, 1],
  regreso: ['Falló · regresó a tu saldo', GREEN, c.textDim, true, 0.45],
}

const ios = Platform.OS === 'ios'
const piezas = (n: number) => `${n} ${n === 1 ? 'pieza' : 'piezas'}`
const pesos = (cents: number) => `$${(cents / 100).toLocaleString('es-MX')}`
const conSigno = (cents: number) => `${cents < 0 ? '−' : '+'}${mxn(Math.abs(cents))}`

function Fila({ m }: { m: Movimiento }) {
  const [label, stateColor, costColor, tachado, opacity] = ESTADO[m.estado]
  // A charged request shows what it finally took; what came back is said under it.
  const cents = m.estado === 'cobrada' ? m.cents + m.devueltoCents : m.cents
  const estado = m.estado === 'cobrada' && m.devueltoCents > 0 ? `Cobrada · regresaron ${mxn(m.devueltoCents)}` : label
  return (
    <View style={styles.fila}>
      <View style={[styles.thumb, { opacity }]}>
        {m.thumbUrl ? (
          <Image source={{ uri: miniatura(m.thumbUrl, 44) ?? undefined }} style={styles.img} contentFit="cover" transition={120} />
        ) : (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 5v14M5 12h14" />
          </Svg>
        )}
      </View>
      <View style={styles.filaTexto}>
        <Text style={styles.filaNombre} numberOfLines={1}>
          {m.nombre}
        </Text>
        <Text style={styles.filaDetalle}>{m.detalle}</Text>
        <Text style={[styles.filaEstado, { color: stateColor }]}>{estado}</Text>
      </View>
      <Text style={[styles.costo, { color: costColor }, tachado && styles.tachado]}>{conSigno(cents)}</Text>
    </View>
  )
}

export default function SaldoScreen() {
  const qc = useQueryClient()
  const barra = useAltoBarra()
  const saldo = useQuery({ queryKey: ['saldo'], queryFn: verSaldoDetalle })
  const [elegido, setElegido] = useState(APPLE_SALDO_PACKS[1].productId)
  const iap = useAppleCreditPurchase({
    onSaldo: ({ pack }) => {
      qc.invalidateQueries({ queryKey: ['saldo'] })
      Alert.alert('Listo', `Se sumaron ${mxn(pack.cents)} a tu saldo.`)
    },
    onError: (m) => Alert.alert('No se pudo recargar', `${m}\n\nSi Apple ya te cobró, no se pierde: vuelve a abrir esta pantalla y se acredita.`),
  })

  const s = saldo.data
  const fotoCents = s?.fotoCents ?? null
  const bajo = !!s && fotoCents !== null && s.saldoCents < fotoCents
  const pack = APPLE_SALDO_PACKS.find((p) => p.productId === elegido) ?? APPLE_SALDO_PACKS[1]
  const precio = iap.products[pack.productId]?.displayPrice

  const cabecera = (
    <View style={styles.cuerpo}>
      <View style={[styles.card, bajo && { borderColor: PINK }]}>
        <View style={styles.cardArriba}>
          <Text style={styles.disponible}>Disponible</Text>
          <Text style={styles.apartado}>apartado {s ? mxn(s.apartadoCents) : '—'}</Text>
        </View>
        <Text style={styles.monto}>
          {s ? mxn(s.saldoCents) : '—'} <Text style={styles.mxn}>MXN</Text>
        </Text>
        {s && fotoCents ? <Text style={styles.alcanza}>Alcanza para ≈ {Math.floor(s.saldoCents / fotoCents)} fotos de producto.</Text> : null}
        {saldo.error ? <Text style={styles.error}>No pudimos leer tu saldo. Desliza hacia abajo para intentar otra vez.</Text> : null}

        {ios ? (
          <>
            <View style={styles.montos} accessibilityRole="radiogroup" accessibilityLabel="Monto de la recarga">
              {APPLE_SALDO_PACKS.map((p) => {
                const on = p.productId === elegido
                return (
                  <Pressable
                    key={p.productId}
                    onPress={() => setElegido(p.productId)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.montoTile, on && styles.montoOn]}
                  >
                    <Text style={styles.montoValor}>{pesos(p.cents)}</Text>
                    {fotoCents ? <Text style={styles.montoAlcanza}>≈ {Math.floor(p.cents / fotoCents)} fotos</Text> : null}
                  </Pressable>
                )
              })}
            </View>
            <Pressable
              onPress={() => iap.comprarSaldo(pack.productId)}
              disabled={!iap.connected || iap.isPurchasing}
              accessibilityRole="button"
              accessibilityLabel={`Recargar ${pesos(pack.cents)} MXN`}
              style={({ pressed }) => [styles.recargar, !iap.connected && styles.apagado, pressed && styles.pressed]}
            >
              {iap.isPurchasing ? (
                <ActivityIndicator color={c.bg} />
              ) : (
                <Text style={styles.recargarTexto}>
                  Recargar <Text style={styles.recargarMonto}>{pesos(pack.cents)} MXN</Text>
                </Text>
              )}
            </Pressable>
            <Text style={styles.apple}>
              {!iap.connected ? 'Conectando con la App Store…' : precio ? `Pagas ${precio} con tu cuenta de Apple.` : 'Lo pagas con tu cuenta de Apple.'}
            </Text>
          </>
        ) : (
          <Text style={styles.alcanza}>Tu saldo se recarga desde Auto Toon en la web; aquí lo ves al momento.</Text>
        )}
      </View>

      {bajo && s ? (
        <View style={styles.bajo}>
          <View style={styles.bajoTitulo}>
            <View style={styles.punto} />
            <Text style={styles.bajoTituloTexto}>Saldo bajo</Text>
          </View>
          <Text style={styles.bajoTexto}>
            Te quedan {mxn(s.saldoCents)}, menos de lo que cuesta una foto. Lo que ya está en cola sigue; para pedir más, recarga.
          </Text>
        </View>
      ) : null}

      <View style={styles.resumen}>
        <View style={styles.resumenFila}>
          <Text style={styles.resumenTexto}>Cobrado este mes · {piezas(s?.cobradasMes ?? 0)}</Text>
          <Text style={styles.resumenMonto}>{s ? mxn(s.cobradoMesCents ?? 0) : '—'}</Text>
        </View>
        <View style={styles.resumenFila}>
          <Text style={styles.resumenTexto}>Regresaron a tu saldo</Text>
          <Text style={[styles.resumenMonto, { color: GREEN }]}>{piezas(s?.regresaronMes ?? 0)}</Text>
        </View>
      </View>

      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Movimientos</Text>
        <Text style={styles.seccionNota}>Lo que falla regresa solo</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Saldo</Text>
        <View style={styles.mes}>
          <Text style={styles.mesTexto}>{MESES[new Date().getMonth()]}</Text>
        </View>
      </View>
      <FlatList
        data={s?.movimientos ?? []}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <Fila m={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={cabecera}
        ListEmptyComponent={
          <Text style={styles.vacio}>
            {saldo.isPending ? 'Cargando tus movimientos…' : saldo.error ? 'Tus movimientos aparecen aquí en cuanto podamos leerlos.' : 'Aún no hay movimientos. Tus recargas y lo que pidas aparecen aquí.'}
          </Text>
        }
        ListFooterComponent={
          ios ? (
            <Pressable onPress={() => iap.restore()} disabled={iap.isRestoring} accessibilityRole="button" style={({ pressed }) => [styles.recuperar, pressed && styles.pressed]}>
              <Text style={styles.recuperarTexto}>{iap.isRestoring ? 'Buscando tus recargas…' : 'Recuperar una recarga'}</Text>
            </Pressable>
          ) : null
        }
        contentContainerStyle={[styles.lista, { paddingBottom: 16 + barra }]}
        refreshControl={<RefreshControl refreshing={saldo.isRefetching} onRefresh={() => saldo.refetch()} tintColor={c.textDim} />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingHorizontal: 16, paddingBottom: 8 },
  titulo: { fontFamily: FONT.display, fontSize: 34, lineHeight: 36, textTransform: 'uppercase', color: c.text },
  mes: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: PINK, backgroundColor: c.bgRaised },
  mesTexto: { fontSize: 13, color: c.text },
  lista: { paddingTop: 8, paddingHorizontal: 16 },
  cuerpo: { gap: 16, marginBottom: 16 },

  card: { gap: 10, padding: 16, borderRadius: 16, backgroundColor: c.bgRaised, borderWidth: 1, borderColor: c.border },
  cardArriba: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  disponible: { fontSize: 13, color: c.textMuted },
  apartado: { fontFamily: FONT.mono, fontSize: 12, color: c.textDim },
  monto: { fontFamily: FONT.display, fontSize: 64, lineHeight: 66, color: c.text },
  mxn: { fontFamily: FONT.mono, fontSize: 14, letterSpacing: 0, color: c.textDim },
  alcanza: { fontSize: 12.5, color: c.textMuted },
  error: { fontSize: 12.5, color: PINK },
  montos: { flexDirection: 'row', gap: 6 },
  montoTile: { flex: 1, alignItems: 'flex-start', gap: 3, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: '#0F0F0F' },
  montoOn: { borderColor: c.accent, backgroundColor: c.bgOverlay },
  montoValor: { fontFamily: FONT.monoMedium, fontSize: 17, letterSpacing: -0.34, color: c.text },
  montoAlcanza: { fontSize: 11, lineHeight: 14.3, color: c.textMuted },
  recargar: { minHeight: 46, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  recargarTexto: { fontSize: 15, fontWeight: '600', color: c.bg },
  recargarMonto: { fontFamily: FONT.monoMedium, fontWeight: '500', fontSize: 15, color: c.bg },
  apple: { fontSize: 12, color: c.textDim, textAlign: 'center' },
  apagado: { opacity: 0.5 },
  pressed: { opacity: 0.85 },

  bajo: { gap: 6, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: c.bgElevated, borderWidth: 1, borderColor: PINK },
  bajoTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punto: { width: 8, height: 8, borderRadius: 999, backgroundColor: PINK },
  bajoTituloTexto: { fontSize: 14, fontWeight: '600', color: c.text },
  bajoTexto: { fontSize: 13, lineHeight: 19.5, color: c.textMuted },

  resumen: { gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  resumenTexto: { flexShrink: 1, fontSize: 12.5, color: c.textMuted },
  resumenMonto: { fontFamily: FONT.mono, fontSize: 12.5, color: c.text },

  seccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seccionTitulo: { fontFamily: FONT.mono, fontSize: 12, letterSpacing: 0.96, textTransform: 'uppercase', color: PINK },
  seccionNota: { fontSize: 12, color: c.textDim },

  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.bgRaised, borderWidth: 1, borderColor: c.border },
  thumb: { width: 44, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: c.border, alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  filaTexto: { flex: 1, minWidth: 0, gap: 3 },
  filaNombre: { fontSize: 14, fontWeight: '500', color: c.text },
  filaDetalle: { fontSize: 12, color: c.textDim },
  filaEstado: { fontSize: 11.5 },
  costo: { fontFamily: FONT.mono, fontSize: 14 },
  tachado: { textDecorationLine: 'line-through' },

  vacio: { fontSize: 13, lineHeight: 19.5, color: c.textMuted, paddingVertical: 12 },
  recuperar: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  recuperarTexto: { fontSize: 13, color: c.textDim },
})
