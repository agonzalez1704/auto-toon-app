import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef } from 'react'
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, { Path as SvgPath } from 'react-native-svg'
import { useTutorialSeen } from '@/lib/hooks/use-tutorial-seen'

const { width: SCREEN_W } = Dimensions.get('window')
const ACCENT = '#FBBF24'
const BG = '#0F1B2E'

export interface TutorialItem {
  label: string
  description?: string
  preview?: string | number | null // local require() or remote URL
}

interface Props {
  storageKey: string
  title: string
  intro: string
  items: TutorialItem[]
  ctaLabel?: string
}

function CloseIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

function SparkleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2zM19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14zM5 14l.75 2.25L8 17l-2.25.75L5 20l-.75-2.25L2 17l2.25-.75L5 14z"
        fill={ACCENT}
      />
    </Svg>
  )
}

export function NodeTutorialSheet({ storageKey, title, intro, items, ctaLabel = 'Got it' }: Props) {
  const { seen, loading, dismiss } = useTutorialSeen(storageKey)
  const fade = useRef(new Animated.Value(0)).current
  const slide = useRef(new Animated.Value(40)).current

  const visible = !loading && !seen

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  const grid = items.slice(0, 12)

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <LinearGradient colors={['#6366F1', '#A855F7']} style={StyleSheet.absoluteFillObject} />
              <SparkleIcon />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.intro}>{intro}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={dismiss} activeOpacity={0.7}>
              <CloseIcon />
            </TouchableOpacity>
          </View>

          {/* Grid */}
          <ScrollView contentContainerStyle={styles.gridScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {grid.map((item, idx) => (
                <View key={`${item.label}-${idx}`} style={styles.tile}>
                  <View style={styles.tileImageWrap}>
                    {item.preview ? (
                      <Image
                        source={typeof item.preview === 'string' ? { uri: item.preview } : item.preview}
                        style={styles.tileImage}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <View style={styles.tilePlaceholder}>
                        <Text style={styles.tilePlaceholderText}>Preview soon</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.tileLabel} numberOfLines={1}>{item.label}</Text>
                  {item.description && (
                    <Text style={styles.tileDesc} numberOfLines={2}>{item.description}</Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* CTA */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cta} onPress={dismiss} activeOpacity={0.85}>
              <LinearGradient colors={['#FBBF24', '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const TILE_W = (SCREEN_W - 32 - 24) / 3

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingTop: 12,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  headerIcon: { width: 36, height: 36, borderRadius: 10, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1, paddingTop: 2 },
  title: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  intro: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4, lineHeight: 17 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },

  gridScroll: { padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: TILE_W },
  tileImageWrap: { width: TILE_W, height: TILE_W, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tileImage: { width: '100%', height: '100%' },
  tilePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tilePlaceholderText: { fontSize: 9, color: 'rgba(255,255,255,0.3)' },
  tileLabel: { fontSize: 11, fontWeight: '600', color: '#FFFFFF', marginTop: 6 },
  tileDesc: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 13 },

  footer: { padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  cta: { height: 46, borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  ctaText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})
