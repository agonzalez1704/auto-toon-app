import { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path as SvgPath, Circle } from 'react-native-svg'
import { relightImage } from '@/lib/api'
import { useCreditsStore } from '@/stores/use-credits-store'
import { useVideoStore } from '@/stores/use-video-store'
import { getCostLabel, AI_MODELS } from '@/lib/ai-models'
import { useSubscriptionStore } from '@/stores/use-subscription-store'

const BG = '#0F0F13'
const ACCENT = '#F59E0B'

const LIGHTING_PRESETS = [
  { id: 'golden-hour', label: 'Golden Hour', desc: 'Warm sunset glow', color: '#F59E0B' },
  { id: 'blue-hour', label: 'Blue Hour', desc: 'Cool twilight tones', color: '#3B82F6' },
  { id: 'studio-soft', label: 'Studio Soft', desc: 'Even diffused light', color: '#E5E7EB' },
  { id: 'dramatic', label: 'Dramatic', desc: 'High contrast shadows', color: '#EF4444' },
  { id: 'neon', label: 'Neon', desc: 'Vibrant colored glow', color: '#EC4899' },
  { id: 'natural-window', label: 'Window Light', desc: 'Soft directional', color: '#FDE68A' },
  { id: 'backlit', label: 'Backlit', desc: 'Rim light silhouette', color: '#F97316' },
  { id: 'moonlight', label: 'Moonlight', desc: 'Silver cool tones', color: '#94A3B8' },
] as const

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M19 12H5M12 19l-7-7 7-7" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function SunIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="5" stroke="#FFF" strokeWidth={2} />
      <SvgPath d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#FFF" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

export default function RelightScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ imageUrl: string; title?: string }>()
  const { imageUrl, title } = params

  const isPayPerUse = useSubscriptionStore((s) => s.plan) === 'PAYPERUSE'
  const fetchCredits = useCreditsStore((s) => s.fetchCredits)

  const [selected, setSelected] = useState(LIGHTING_PRESETS[0].id)
  const [generating, setGenerating] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const costLabel = getCostLabel(AI_MODELS.GEMINI_3_IMAGE.id, isPayPerUse)

  const handleGenerate = useCallback(async () => {
    if (!imageUrl || generating) return
    setGenerating(true)
    setError(null)
    try {
      const result = await relightImage({
        baseImageUrl: imageUrl,
        lighting: selected,
      })
      setResultUrl(result.imageUrl)
      fetchCredits()
    } catch (err: any) {
      setError(err?.message || 'Relight failed')
    } finally {
      setGenerating(false)
    }
  }, [imageUrl, selected, generating, fetchCredits])

  if (!imageUrl) {
    router.back()
    return null
  }

  // Result view
  if (resultUrl) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <Image source={{ uri: resultUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFillObject} locations={[0, 0.2, 0.6, 1]} />

        <SafeAreaView style={styles.resultTopBar} edges={['top']} pointerEvents="box-none">
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.resultTitle}>Relit</Text>
          <View style={{ width: 40 }} />
        </SafeAreaView>

        <SafeAreaView style={styles.resultBottom} edges={['bottom']} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => { setResultUrl(null) }}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Try Another</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gradientBtn}
            onPress={() => {
              useVideoStore.getState().setSourceImage(resultUrl, [resultUrl], title || 'Relit')
              router.push('/video-generator')
            }}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#EB96FF', '#9333EA', '#0B5777']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
            <Text style={styles.gradientBtnText}>Create Video</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    )
  }

  // Editor view
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Relight</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          {/* Preview */}
          <View style={styles.previewCard}>
            <Image source={{ uri: imageUrl }} style={styles.previewImage} contentFit="cover" transition={200} />
            {generating && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={ACCENT} size="large" />
                <Text style={styles.loadingText}>Relighting...</Text>
              </View>
            )}
          </View>

          {/* Lighting presets */}
          <Text style={styles.sectionLabel}>Lighting Style</Text>
          <View style={styles.presetsGrid}>
            {LIGHTING_PRESETS.map((preset) => {
              const isActive = selected === preset.id
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetCard, isActive && { borderColor: preset.color }]}
                  onPress={() => setSelected(preset.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.presetDot, { backgroundColor: preset.color }]} />
                  <Text style={[styles.presetLabel, isActive && { color: '#FFF' }]}>{preset.label}</Text>
                  <Text style={styles.presetDesc}>{preset.desc}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Generate button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.generateBtn, generating && { opacity: 0.5 }]}
            onPress={handleGenerate}
            activeOpacity={0.8}
            disabled={generating}
          >
            <LinearGradient colors={['#F59E0B', '#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
            <SunIcon />
            <Text style={styles.generateBtnText}>
              {generating ? 'Generating...' : `Relight (${costLabel})`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },

  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 20 },

  previewCard: { width: '100%', aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 24 },
  previewImage: { width: '100%', height: '100%' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  sectionLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: 12 },

  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetCard: {
    flexBasis: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  presetDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  presetLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  presetDesc: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },

  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { fontSize: 13, color: '#EF4444', textAlign: 'center' },

  footer: { paddingHorizontal: 20, paddingBottom: 8 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, overflow: 'hidden' },
  generateBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Result view
  resultTopBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10 },
  resultTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  resultBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, gap: 10, alignItems: 'center' },
  secondaryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  gradientBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, overflow: 'hidden', width: '100%' },
  gradientBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
})
