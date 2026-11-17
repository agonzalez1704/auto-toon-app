import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { FONT, Text } from '@/components/text'
import { Accion } from '@/components/accion'
import { theme } from '@/constants/theme'
import { lista, mxn, type Aspecto, type Pieza } from '@/lib/estudio'
import { useAltoBarra } from '@/lib/hooks/use-alto-barra'
import type { Luz } from './api'
import { Botella, Chip, Haz, Pulso } from './partes'

const c = theme.colors

/** A piece of this mesa with what the mesa calls it. */
export type PiezaMesa = Pieza & { label: string; aspect: Aspecto; unitCents: number }

const CORRIENDO = new Set(['submitting', 'submitted', 'settling', 'running'])
export const corriendo = (p: Pick<Pieza, 'status'>) => CORRIENDO.has(p.status)
export const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
export const transcurrido = (desde: string, now: number) => {
  const s = Math.max(0, Math.floor((now - Date.parse(desde)) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** The lights a relight can ask for (the web's LUCES, lib/jobs/compose). */
export const LUCES: { id: Luz; label: string }[] = [
  { id: 'estudiofrio', label: 'Estudio frío' },
  { id: 'ventana', label: 'Ventana lateral' },
  { id: 'tarde', label: 'Tarde dorada' },
  { id: 'contraluz', label: 'Contraluz' },
  { id: 'noche', label: 'Noche, un foco' },
  { id: 'nublado', label: 'Día nublado' },
  { id: 'dura', label: 'Sol duro' },
]

const REINTENTAR = 'M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4'

/** One next step the assistant offers (the web's «siguientes»): pink when it goes on to another screen. */
export interface Paso {
  id: string
  titulo: string
  copia: string
  label: string
  precio: string | null
  otra: boolean
  morph: string
  go: () => void
}

/**
 * «Sigue» on the piece on screen: the first of its next steps, and the rest under it. The relight is an order —
 * the light is picked and the price said before asking.
 */
export interface Sigue {
  sobre: string
  pasos: Paso[]
  precio: string | null
  abierto: boolean
  luz: Luz
  onLuz: (l: Luz) => void
  onPedir: () => void
  onNo: () => void
  enviando: boolean
}

/**
 * Board «Resultados» (1b): the piece on screen big, every piece of the mesa under it, what is set aside and what
 * gets charged, and «Sigue». Tapping the big one opens the Visor.
 */
export function Resultados(o: {
  titulo: string
  subtitulo: string
  onVolver: () => void
  piezas: PiezaMesa[]
  hero: PiezaMesa | undefined
  onHero: (id: string) => void
  onVer: (id: string) => void
  now: number
  readyLine: string
  desglose: string
  chargeLine: string
  onReintentar: (p: PiezaMesa) => void
  reintentando: boolean
  onVariantes: () => void
  onDescargar: (url: string) => void
  sigue: Sigue | null
  error: string | null
}) {
  const barra = useAltoBarra()
  const h = o.hero
  const listo = h && lista(h) ? h : null
  const [aw, ah] = (h?.aspect ?? '3:4').split(':').map(Number)
  const tools = [
    ...(listo ? [{ label: 'Ampliar', d: 'M4 9V4h5M20 15v5h-5M20 4l-6 6M4 20l6-6', go: () => o.onVer(listo.id) }] : []),
    { label: 'Variantes', d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', go: o.onVariantes },
    ...(listo?.resultUrl ? [{ label: 'Descargar', d: 'M12 4v11M7 10l5 5 5-5M4 20h16', go: () => o.onDescargar(listo.resultUrl!) }] : []),
  ]

  return (
    <>
      <View style={styles.cabeza}>
        <Pressable onPress={o.onVolver} accessibilityRole="button" accessibilityLabel="Volver a Crear" style={styles.volver}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M15 5 8 12l7 7" stroke={c.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={styles.titulo} numberOfLines={1}>
            {o.titulo}
          </Text>
          <Text style={styles.subtitulo} numberOfLines={1}>
            {o.subtitulo}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.cuerpo, { paddingBottom: 20 + barra }]}>
        {/* The colour behind the panel (the board's radial bleed). */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="bleed" cx="50%" cy="62%" rx="60%" ry="45%">
              <Stop offset="0" stopColor="#C48A5C" stopOpacity={0.35} />
              <Stop offset="1" stopColor="#C48A5C" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bleed)" />
        </Svg>

        <Pressable
          onPress={listo ? () => o.onVer(listo.id) : undefined}
          disabled={!listo}
          accessibilityRole={listo ? 'imagebutton' : undefined}
          accessibilityLabel={listo ? `Ver ${listo.label} en grande` : h?.label}
          style={[styles.hero, { aspectRatio: aw && ah ? aw / ah : 3 / 4 }]}
        >
          {listo ? (
            <Image source={{ uri: (listo.resultUrl ?? listo.videoUrl)! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Botella width={72} height={116} color="#D4D4D4" />
          )}
          {h ? (
            <>
              <View style={[styles.etiqueta, { left: 12, maxWidth: '58%' }]}>
                <Text style={styles.etiquetaNombre} numberOfLines={1}>
                  {h.label}
                </Text>
              </View>
              <View style={[styles.etiqueta, { right: 12 }]}>
                <Text style={styles.etiquetaMeta}>{h.status === 'failed' ? `No salió · ${hora(h.updatedAt ?? h.createdAt)}` : `${h.aspect} · 2K`}</Text>
              </View>
            </>
          ) : null}
          {h?.status === 'failed' ? (
            <Pressable
              onPress={() => o.onReintentar(h)}
              disabled={o.reintentando}
              accessibilityRole="button"
              accessibilityLabel="Reintentar esta pieza"
              style={[styles.reintentar, o.reintentando && { opacity: 0.45 }]}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d={REINTENTAR} stroke={c.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.reintentarTexto}>{h.unitCents > 0 ? `Reintentar · ${mxn(h.unitCents)}` : 'Reintentar'}</Text>
            </Pressable>
          ) : null}
          <View style={styles.barraLugar} pointerEvents="box-none">
            <View style={styles.barra} accessibilityRole="toolbar" accessibilityLabel="Acciones de la imagen">
              {tools.map((t) => (
                <Pressable key={t.label} onPress={t.go} accessibilityRole="button" accessibilityLabel={t.label} style={styles.tool}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path d={t.d} stroke={c.text} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>

        <View style={styles.miniaturas}>
          {o.piezas.map((p) => {
            const on = p.id === h?.id
            const va = corriendo(p)
            const hecha = lista(p)
            return (
              <Pulso key={p.id} activo={va} ms={1600}>
                <Pressable
                  onPress={() => o.onHero(p.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${p.label} · ${p.aspect}${va ? ' · generando' : ''}`}
                  style={[styles.miniatura, { borderColor: on ? c.accent : va ? c.borderStrong : 'transparent' }]}
                >
                  {hecha ? (
                    <Image source={{ uri: (p.resultUrl ?? p.videoUrl)! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <Text style={styles.miniTexto}>{va ? transcurrido(p.createdAt, o.now) : p.status === 'failed' ? 'falló' : 'en cola'}</Text>
                  )}
                </Pressable>
              </Pulso>
            )
          })}
          <View style={styles.cuenta}>
            <Text style={styles.cuentaLinea}>{o.readyLine}</Text>
            <Text style={styles.cuentaApartado}>Apartado de tu saldo {o.desglose}</Text>
            <Text style={styles.cuentaCobro}>{o.chargeLine}</Text>
          </View>
        </View>

        {o.sigue ? <TarjetaSigue s={o.sigue} /> : null}
        {o.error ? <Text style={styles.error}>{o.error}</Text> : null}
      </ScrollView>
    </>
  )
}

function TarjetaSigue({ s }: { s: Sigue }) {
  // The light picker is the relight's own step: open, it is what the card asks for.
  const relight = s.pasos.find((x) => x.id === 'relight')
  const [primero, ...despues] = s.abierto && relight ? [relight, ...s.pasos.filter((x) => x !== relight)] : s.pasos
  if (!primero) return null
  const pidiendoLuz = s.abierto && primero.id === 'relight'
  return (
    <Haz>
      <View style={styles.sigue}>
        <Text style={styles.sigueEtiqueta} numberOfLines={1}>
          SIGUE <Text style={styles.sigueSobre}>· sobre {s.sobre}</Text>
        </Text>
        <Text style={styles.sigueTitulo}>{primero.titulo}</Text>
        <Text style={styles.sigueCopia}>{pidiendoLuz ? 'Escoge la luz. La composición y el producto se quedan igual.' : primero.copia}</Text>
        {pidiendoLuz ? (
          <View style={styles.luces}>
            {LUCES.map((l) => (
              <Chip key={l.id} label={l.label} on={l.id === s.luz} onPress={() => s.onLuz(l.id)} mono={false} />
            ))}
          </View>
        ) : null}
        <View style={styles.sigueBotones}>
          <View style={{ flex: 1 }}>
            {pidiendoLuz ? (
              <Accion label={s.enviando ? 'Apartando…' : 'Pedir relight'} detalle={s.precio ?? '—'} onPress={s.onPedir} disabled={!s.precio || s.enviando} cargando={s.enviando} lleno morph={primero.morph} />
            ) : (
              // Pink when the step goes on to another screen, the accent when it stays (AGENTS.md §1).
              <Accion
                label={primero.label}
                detalle={primero.precio ?? undefined}
                tono={primero.otra ? 'rosa' : 'verde'}
                lleno
                morph={primero.morph}
                disabled={s.enviando || (primero.id !== 'estilo' && !primero.precio)}
                onPress={primero.go}
              />
            )}
          </View>
          <Pressable onPress={s.onNo} accessibilityRole="button" style={styles.ahoraNo}>
            <Text style={styles.ahoraNoTexto}>Ahora no</Text>
          </Pressable>
        </View>
        {despues.length ? (
          <View style={styles.despues}>
            <Text style={styles.despuesEtiqueta}>Después</Text>
            {despues.map((x) => (
              <Pressable key={x.id} onPress={x.go} accessibilityRole="button" accessibilityHint={x.otra ? 'Sigue en otra pantalla' : undefined} style={({ pressed }) => [styles.despuesFila, pressed && { opacity: 0.7 }]}>
                <View style={[styles.despuesChip, { backgroundColor: x.otra ? c.accent2 : c.accent }]} />
                <Text style={styles.despuesTitulo} numberOfLines={1}>
                  {x.titulo}
                </Text>
                {x.precio ? <Text style={styles.despuesPrecio}>{x.precio}</Text> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Haz>
  )
}

const styles = StyleSheet.create({
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 10, paddingHorizontal: 8, paddingBottom: 8 },
  volver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 19, fontWeight: '600', lineHeight: 22, letterSpacing: -0.475, color: c.text },
  subtitulo: { fontSize: 13, color: c.textMuted },
  cuerpo: { gap: 16, paddingTop: 4, paddingHorizontal: 16, paddingBottom: 20 },
  hero: { width: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: c.bgElevated, alignItems: 'center', justifyContent: 'center' },
  etiqueta: { position: 'absolute', top: 12, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(10,10,10,0.6)' },
  etiquetaNombre: { fontSize: 12, fontWeight: '500', color: c.text },
  etiquetaMeta: { fontSize: 11, fontFamily: FONT.mono, color: '#C7C7C7' },
  reintentar: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: 'rgba(20,20,20,0.9)' },
  reintentarTexto: { fontSize: 14, color: c.text },
  barraLugar: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center' },
  barra: { flexDirection: 'row', gap: 2, padding: 4, borderRadius: 999, backgroundColor: 'rgba(10,10,10,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tool: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  miniaturas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'stretch' },
  miniatura: { width: 72, height: 96, borderRadius: 12, borderWidth: 2, backgroundColor: c.bgElevated, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  miniTexto: { fontSize: 11, fontFamily: FONT.mono, color: c.textMuted },
  cuenta: { marginLeft: 'auto', justifyContent: 'center', alignItems: 'flex-end', gap: 6 },
  cuentaLinea: { fontSize: 13, color: c.textMuted, textAlign: 'right' },
  cuentaApartado: { fontSize: 13, fontFamily: FONT.mono, color: c.text, textAlign: 'right' },
  cuentaCobro: { fontSize: 12, color: c.textDim, textAlign: 'right' },
  sigue: { gap: 10, padding: 16, borderRadius: 17, backgroundColor: 'rgba(20,20,20,0.94)' },
  sigueEtiqueta: { fontSize: 12, fontWeight: '600', letterSpacing: 0.96, color: c.accent2 },
  sigueSobre: { fontWeight: '400', letterSpacing: 0, color: c.textMuted },
  sigueTitulo: { fontSize: 18, fontWeight: '600', lineHeight: 23.4, color: c.text },
  sigueCopia: { fontSize: 14, lineHeight: 21, color: c.textMuted },
  luces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sigueBotones: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  ahoraNo: { minHeight: 48, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  despues: { gap: 2, paddingTop: 10, marginTop: 2, borderTopWidth: 1, borderTopColor: c.border },
  despuesEtiqueta: { fontSize: 11, fontFamily: FONT.mono, letterSpacing: 0.88, textTransform: 'uppercase', color: c.textDim, paddingBottom: 4 },
  despuesFila: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  despuesChip: { width: 8, height: 8, borderRadius: 999 },
  despuesTitulo: { flex: 1, fontSize: 14, color: c.text },
  despuesPrecio: { fontSize: 13, fontFamily: FONT.mono, color: c.textMuted },
  ahoraNoTexto: { fontSize: 15, color: c.textMuted },
  error: { fontSize: 13, lineHeight: 19, color: c.accent2 },
})
