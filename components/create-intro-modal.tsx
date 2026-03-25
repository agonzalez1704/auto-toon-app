import { CONFIG } from '@/lib/config'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, { Path as SvgPath } from 'react-native-svg'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const BRAND = '#8B5CF6'
const BRAND_CYAN = '#06B6D4'
const { width: SCREEN_W } = Dimensions.get('window')
const IMAGE_SIZE = (SCREEN_W - 80) / 2

// ─── Persisted store ────────────────────────────────────────────────────

interface CreateIntroState {
  hasSeenIntro: boolean
  markSeen: () => void
}

export const useCreateIntroStore = create<CreateIntroState>()(
  persist(
    (set) => ({
      hasSeenIntro: false,
      markSeen: () => set({ hasSeenIntro: true }),
    }),
    {
      name: 'create-intro-seen',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

// ─── Component ──────────────────────────────────────────────────────────

export function CreateIntroModal() {
  const { hasSeenIntro, markSeen } = useCreateIntroStore()
  const [visible, setVisible] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(40)).current

  useEffect(() => {
    if (!hasSeenIntro) {
      setVisible(true)
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [hasSeenIntro])

  const handleDismiss = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false)
      markSeen()
    })
  }, [fadeAnim, markSeen])

  if (!visible) return null

  const previewA = `${CONFIG.API_BASE_URL}/previews/instagram_feed.png`
  const previewB = `${CONFIG.API_BASE_URL}/previews/creative_elements.png`

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Sparkle icon */}
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={[BRAND, BRAND_CYAN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <SvgPath
                  d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
                  fill="#FFFFFF"
                />
              </Svg>
            </LinearGradient>
          </View>

          <Text style={styles.title}>Product Enhancer</Text>
          <Text style={styles.subtitle}>
            Transform your product photos into stunning visuals with AI-powered backgrounds and styles.
          </Text>

          {/* Showcase images */}
          <View style={styles.comparison}>
            <View style={styles.imageCol}>
              <View style={styles.imageWrap}>
                <Image
                  source={{ uri: previewA }}
                  style={styles.image}
                  contentFit="cover"
                  transition={300}
                />
              </View>
              <Text style={styles.imageLabel}>Instagram</Text>
            </View>

            {/* Divider */}
            <View style={styles.dividerWrap}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <SvgPath
                  d="M12 5v14M5 12h14"
                  stroke={BRAND_CYAN}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </View>

            <View style={styles.imageCol}>
              <View style={[styles.imageWrap, styles.imageWrapAlt]}>
                <Image
                  source={{ uri: previewB }}
                  style={styles.image}
                  contentFit="cover"
                  transition={300}
                />
              </View>
              <Text style={[styles.imageLabel, { color: BRAND_CYAN }]}>Elements</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <View style={styles.featureRow}>
              <View style={[styles.featureDot, { backgroundColor: BRAND }]} />
              <Text style={styles.featureText}>6 creative goals to choose from</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={[styles.featureDot, { backgroundColor: BRAND_CYAN }]} />
              <Text style={styles.featureText}>AI-powered background generation</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={[styles.featureDot, { backgroundColor: '#34D399' }]} />
              <Text style={styles.featureText}>Multiple aspect ratios & formats</Text>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[BRAND, BRAND_CYAN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.ctaText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#141418',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 28,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },

  iconWrap: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  comparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  imageCol: {
    alignItems: 'center',
    gap: 8,
  },
  imageWrap: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE * 1.35,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  imageWrapAlt: {
    borderColor: `${BRAND_CYAN}40`,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  dividerWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  features: {
    alignSelf: 'stretch',
    gap: 10,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  featureText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },

  ctaButton: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
