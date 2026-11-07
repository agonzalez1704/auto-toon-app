import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import * as WebBrowser from 'expo-web-browser'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'
import Svg, { Circle, Path } from 'react-native-svg'
import { FONT, Text } from '@/components/text'
import { theme } from '@/constants/theme'
import { CONFIG } from '@/lib/config'
import { eliminarCuenta, verTrabajos } from '@/lib/estudio'
import { useAIConsentStore } from '@/stores/use-ai-consent-store'

/**
 * Más: what doesn't get a tab, in the studio's look (no board draws it; it borrows Mesas' cards and the
 * Visor's mono labels). The studio's other screens first, then the account — profile, AI permission, the
 * legal pages and signing out. The old Director, Assets and Model Factory entries are gone: Crear,
 * Biblioteca and Personas replace them.
 */
export default function MasScreen() {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useAuth()
  const { accepted, revoke, setShowConsentModal } = useAIConsentStore()
  const trabajos = useQuery({ queryKey: ['trabajos'], queryFn: verTrabajos })
  const enCurso = trabajos.data?.running ?? 0

  const nombre = user?.fullName || user?.firstName || 'Tu cuenta'
  const correo = user?.primaryEmailAddress?.emailAddress
  const legal = (path: string) => WebBrowser.openBrowserAsync(`${CONFIG.API_BASE_URL.replace(/\/api\/?$/, '')}${path}`)

  const permiso = () =>
    accepted
      ? Alert.alert('¿Quitar el permiso de IA?', 'No podrás generar hasta que lo vuelvas a dar.', [
          { text: 'Dejarlo', style: 'cancel' },
          { text: 'Quitar', style: 'destructive', onPress: () => void revoke().catch(() => {}) },
        ])
      : setShowConsentModal(true)
  const [borrando, setBorrando] = useState(false)
  const borrar = async () => {
    setBorrando(true)
    try {
      await eliminarCuenta()
      await signOut()
    } catch {
      setBorrando(false)
      Alert.alert('No pudimos eliminar tu cuenta', 'Algo falló a medio camino. Intenta de nuevo; lo que ya se borró no regresa.')
    }
  }
  // Two steps on purpose: nothing of hers comes back, and the balance is lost with it.
  const eliminar = () =>
    Alert.alert('¿Eliminar tu cuenta?', 'Se borran tus mesas, tus fotos y videos, tus campañas, tus personas y tu saldo. No se puede deshacer.', [
      { text: 'Conservarla', style: 'cancel' },
      {
        text: 'Continuar',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Última confirmación', 'Tu cuenta y todo lo que hiciste se eliminan ahora.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar mi cuenta', style: 'destructive', onPress: () => void borrar() },
          ]),
      },
    ])
  const salir = () =>
    Alert.alert('¿Cerrar sesión?', 'Tus mesas y tu saldo te esperan cuando vuelvas a entrar.', [
      { text: 'Seguir aquí', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void signOut() },
    ])

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
          <Text style={styles.titulo}>Más</Text>

          <View style={styles.perfil}>
            <View style={styles.avatar}>
              {/* Clerk's default avatar is a coloured gradient: only a photo she set goes here. */}
              {user?.hasImage ? <Image source={{ uri: user.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.inicial}>{(user?.firstName || correo || nombre).charAt(0).toUpperCase()}</Text>}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.nombre} numberOfLines={1}>
                {nombre}
              </Text>
              {correo ? (
                <Text style={styles.correo} numberOfLines={1}>
                  {correo}
                </Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.rotulo}>Estudio</Text>
          <View style={styles.grupo}>
            <Fila
              icono="trabajos"
              titulo="Trabajos"
              meta={enCurso ? `${enCurso} en curso` : 'Cada pedido mientras se genera, y lo que costó'}
              punto={enCurso > 0}
              onPress={() => router.push('/trabajos')}
            />
            <Separador />
            <Fila icono="personas" titulo="Personas" meta="Tus modelos, con su identidad fija" onPress={() => router.push('/model-factory')} />
            <Separador />
            <Fila icono="probador" titulo="Probador" meta="Tu ropa en tus personas" onPress={() => router.push('/wardrobe')} />
          </View>

          <Text style={styles.rotulo}>Cuenta</Text>
          <View style={styles.grupo}>
            <Fila icono="ia" titulo="Procesamiento con IA" meta={accepted ? 'Permitido · toca para quitarlo' : 'Sin permiso · toca para darlo'} onPress={permiso} />
            <Separador />
            <Fila icono="legal" titulo="Términos" meta="Lo que aceptaste al entrar" onPress={() => void legal('/terms')} />
            <Separador />
            <Fila icono="legal" titulo="Aviso de privacidad" meta="Qué guardamos y para qué" onPress={() => void legal('/privacy')} />
            <Separador />
            <Fila icono="salir" titulo="Cerrar sesión" onPress={salir} sinFlecha />
          </View>

          <View style={[styles.grupo, { marginTop: 14 }]}>
            {borrando ? (
              <View style={[styles.fila, { justifyContent: 'center' }]}>
                <ActivityIndicator color={c.text} />
                <Text style={styles.meta}>Eliminando tu cuenta…</Text>
              </View>
            ) : (
              <Fila icono="eliminar" titulo="Eliminar cuenta" meta="Borra tu cuenta y todo lo que hiciste" onPress={eliminar} sinFlecha />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

/** Stroke icons on the 24 grid. */
const ICONOS = {
  trabajos: { d: 'M12 7.5V12l3 2', circulo: { cx: 12, cy: 12, r: 8.5 } },
  personas: { d: 'M5.5 20a6.5 6.5 0 0 1 13 0', circulo: { cx: 12, cy: 8.5, r: 3.2 } },
  probador: { d: 'M12 6.5a1.75 1.75 0 1 1 1.75 1.75c-.97 0-1.75.78-1.75 1.75v.5M12 10.5 3.5 16.5a1 1 0 0 0 .58 1.82h15.84a1 1 0 0 0 .58-1.82L12 10.5Z' },
  ia: { d: 'M12 3 19 7v5c0 4.5-3 8.2-7 9-4-.8-7-4.5-7-9V7l7-4ZM9 12l2 2 4-4' },
  legal: { d: 'M7 3h7l5 5v13H7V3ZM14 3v5h5M10 13h6M10 17h6' },
  salir: { d: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11' },
  eliminar: { d: 'M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3' },
} as const satisfies Record<string, { d: string; circulo?: { cx: number; cy: number; r: number } }>

function Fila({ icono, titulo, meta, onPress, punto, sinFlecha }: { icono: keyof typeof ICONOS; titulo: string; meta?: string; onPress: () => void; punto?: boolean; sinFlecha?: boolean }) {
  const i: { d: string; circulo?: { cx: number; cy: number; r: number } } = ICONOS[icono]
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={titulo} accessibilityHint={meta} style={({ pressed }) => [styles.fila, pressed && { backgroundColor: c.bgElevated }]}>
      <View style={styles.icono}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          {i.circulo ? <Circle {...i.circulo} /> : null}
          <Path d={i.d} />
        </Svg>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.filaTitulo}>{titulo}</Text>
        {meta ? (
          <View style={styles.metaFila}>
            {punto ? <View style={styles.punto} /> : null}
            <Text style={styles.meta} numberOfLines={2}>
              {meta}
            </Text>
          </View>
        ) : null}
      </View>
      {sinFlecha ? null : (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c.textDim} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m9 6 6 6-6 6" />
        </Svg>
      )}
    </Pressable>
  )
}

const Separador = () => <View style={styles.separador} />

const c = theme.colors
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  contenido: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120, gap: 10 },
  titulo: { fontFamily: FONT.display, fontSize: 34, lineHeight: 36, textTransform: 'uppercase', color: c.text, marginBottom: 6 },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: c.bgOverlay, alignItems: 'center', justifyContent: 'center' },
  inicial: { fontSize: 18, fontWeight: '600', color: c.text },
  nombre: { fontSize: 15, fontWeight: '600', color: c.text },
  correo: { fontFamily: FONT.mono, fontSize: 11.5, color: c.textDim },
  rotulo: { fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: 0.63, textTransform: 'uppercase', color: c.textDim, marginTop: 14, marginLeft: 4 },
  grupo: { borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgRaised, overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12, paddingHorizontal: 12 },
  icono: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.bgOverlay, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { fontSize: 15, fontWeight: '600', color: c.text },
  metaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent },
  meta: { flex: 1, fontSize: 12.5, lineHeight: 17, color: c.textMuted },
  separador: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 64 },
})
