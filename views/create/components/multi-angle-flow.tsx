import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { theme } from '@/constants/theme'
import { AI_MODELS, getModelCredits } from '@/lib/ai-models'
import { ApiError, startProductAngles, confirmProductAngles, awaitProductHero, awaitProductAngles, getProductAngleSets, type ProductAngleKey } from '@/lib/api'
import { requireAllConsents } from '@/stores/use-consent-guards'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useProductEnhancerStore } from '@/stores/use-product-enhancer-store'
import { AngleCube } from './angle-cube'

type Phase = 'select' | 'confirm' | 'generating'

export function MultiAngleFlow() {
  const router = useRouter()
  const uploadedImageUrl = useProductEnhancerStore((s) => s.uploadedImageUrl)
  const productName = useProductEnhancerStore((s) => s.productName)
  const aspectRatio = useProductEnhancerStore((s) => s.seedreamConfig.aspect_ratio)

  const [selected, setSelected] = useState<ProductAngleKey[]>(['front'])
  const [phase, setPhase] = useState<Phase>('select')
  const [busy, setBusy] = useState(false)
  const [angleSetId, setAngleSetId] = useState<string | null>(null)
  const [hero, setHero] = useState<string | null>(null)

  // Multi-Angle always renders with GPT-Image-2 server-side, regardless of the
  // selected model — cost must reflect that (single source of truth).
  const cost = selected.length * getModelCredits(AI_MODELS.GPT_IMAGE_2.id)
  const ready = !!uploadedImageUrl && !!productName.trim()
  const extras = selected.length - 1

  const handleErr = useCallback((err: unknown) => {
    const code = err instanceof ApiError ? err.code : undefined
    if (code === 'AI_CONSENT_REQUIRED' || code === 'TERMS_NOT_ACCEPTED') return
    if (err instanceof ApiError && err.status === 402) { useCreditsStore.getState().setShowExhaustionModal(true); return }
    Alert.alert('Algo salió mal', err instanceof Error ? err.message : 'Inténtalo de nuevo')
  }, [])

  const toggle = useCallback((k: ProductAngleKey) => {
    if (k === 'front') return
    setSelected((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))
  }, [])

  const generate = useCallback(async () => {
    if (!ready || busy) return
    if (!requireAllConsents(() => generate())) return
    setBusy(true)
    try {
      const { angleSetId: id, heroUrl } = await startProductAngles({
        sourceImageUrl: uploadedImageUrl!, productName, aspectRatio, selectedAngles: selected,
      })
      setAngleSetId(id); setHero(heroUrl); setPhase('confirm')
    } catch (err) {
      handleErr(err)
    } finally {
      setBusy(false)
    }
  }, [ready, busy, uploadedImageUrl, productName, aspectRatio, selected, handleErr])

  // Resume an in-progress run after an app reload / navigation. Generation is
  // decoupled server-side, so the set keeps progressing; re-attach the poll.
  const didResume = useRef(false)
  useEffect(() => {
    if (didResume.current) return
    didResume.current = true
    let cancelled = false
    ;(async () => {
      try {
        const sets = await getProductAngleSets()
        const active = sets.find((s) =>
          s.status === 'generating_hero' || s.status === 'awaiting_confirmation' || s.status === 'generating_angles')
        if (!active || cancelled) return
        setAngleSetId(active.id)
        setSelected(active.selectedAngles)
        if (active.heroImageUrl) setHero(active.heroImageUrl)

        if (active.status === 'awaiting_confirmation') {
          setPhase('confirm')
        } else if (active.status === 'generating_angles') {
          setPhase('generating'); setBusy(true)
          const { allUrls, allKeys } = await awaitProductAngles(active.id)
          if (cancelled) return
          useCreditsStore.getState().fetchCredits()
          setPhase('select'); setHero(null); setAngleSetId(null); setSelected(['front'])
          router.push({ pathname: '/image-viewer', params: { urls: JSON.stringify(allUrls), initialIndex: '0', title: active.productName ?? '', angleSetId: active.id, angleKeys: JSON.stringify(allKeys) } })
        } else {
          setBusy(true)
          const { heroUrl } = await awaitProductHero(active.id)
          if (cancelled) return
          setHero(heroUrl); setPhase('confirm'); setBusy(false)
        }
      } catch {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confirm = useCallback(async (ok: boolean) => {
    if (!angleSetId) return
    if (!ok) {
      confirmProductAngles(angleSetId, false).catch(() => {})
      setPhase('select'); setHero(null); setAngleSetId(null)
      return
    }
    setBusy(true); setPhase('generating')
    try {
      const { allUrls, allKeys } = await confirmProductAngles(angleSetId, true)
      useCreditsStore.getState().fetchCredits()
      setPhase('select'); setHero(null); setAngleSetId(null); setSelected(['front'])
      router.push({ pathname: '/image-viewer', params: { urls: JSON.stringify(allUrls), initialIndex: '0', title: productName, angleSetId, angleKeys: JSON.stringify(allKeys) } })
    } catch (err) {
      handleErr(err); setPhase('confirm')
    } finally {
      setBusy(false)
    }
  }, [angleSetId, productName, router, handleErr])

  return (
    <View style={{ gap: 14 }}>
      <AngleCube selected={selected} onToggle={toggle} />

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Solo tu foto frontal es real. Los demás ángulos son recreados por IA — pueden variar en detalles no visibles en la foto original.
        </Text>
      </View>

      {phase === 'select' && (
        <Pressable disabled={!ready || busy} onPress={generate} style={[styles.genBtn, (!ready || busy) && { opacity: 0.5 }]}>
          {ready && !busy && <LinearGradient colors={['#FBBF24', '#F59E0B', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />}
          {busy
            ? <View style={styles.row}><ActivityIndicator color="#1A1330" size="small" /><Text style={styles.genText}>Generando frontal…</Text></View>
            : <Text style={styles.genText}>Generar · {selected.length} ángulo{selected.length > 1 ? 's' : ''} · {cost} cr</Text>}
        </Pressable>
      )}

      {phase === 'confirm' && hero && (
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Revisa la fidelidad: material, color y logos</Text>
          <Image source={{ uri: hero }} style={styles.heroImg} resizeMode="contain" />
          <Text style={styles.confirmSub}>Confirma para generar los {extras} ángulo{extras === 1 ? '' : 's'} restante{extras === 1 ? '' : 's'}.</Text>
          <View style={styles.row}>
            <Pressable style={[styles.confirmBtn, styles.confirmPrimary]} onPress={() => confirm(true)}><Text style={styles.confirmPrimaryText}>Confirmar</Text></Pressable>
            <Pressable style={[styles.confirmBtn, styles.confirmGhost]} onPress={() => confirm(false)}><Text style={styles.confirmGhostText}>Reintentar</Text></Pressable>
          </View>
        </View>
      )}

      {phase === 'generating' && (
        <View style={styles.genStatus}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.genStatusText}>Generando tus {extras} ángulo{extras === 1 ? '' : 's'}…</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disclaimer: { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(55,138,221,0.25)', backgroundColor: 'rgba(55,138,221,0.08)', padding: 10 },
  disclaimerText: { fontSize: 12, color: '#9cc6f2', lineHeight: 17 },
  genBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: theme.colors.surface },
  genText: { color: '#1A1330', fontWeight: '700', fontSize: 15 },
  confirmCard: { borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 12, gap: 10 },
  confirmTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  heroImg: { width: '100%', height: 320, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)' },
  confirmSub: { fontSize: 12, color: theme.colors.textMuted },
  confirmBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmPrimary: { backgroundColor: '#F59E0B' },
  confirmPrimaryText: { color: '#1A1330', fontWeight: '700' },
  confirmGhost: { borderWidth: 1, borderColor: theme.colors.border },
  confirmGhostText: { color: theme.colors.text, fontWeight: '600' },
  genStatus: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  genStatusText: { fontSize: 13, color: theme.colors.textMuted },
})
