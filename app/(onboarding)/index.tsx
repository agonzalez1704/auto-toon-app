import { getShowcaseImages } from '@/lib/api'
import { CONFIG } from '@/lib/config'
import { useOnboardingStore } from '@/stores/use-onboarding-store'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, {
  Circle,
  Defs,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
} from 'react-native-svg'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

// Aurora Blossom palette (from reference)
const AURORA_NAVY = '#193153'
const AURORA_TEAL = '#0B5777'
const AURORA_MAGENTA = '#EB96FF'
const AURORA_PINK = '#F9D4E0'

const COLUMN_COUNT = 3
const IMAGE_GAP = 4
const COLUMN_WIDTH = (SCREEN_W - IMAGE_GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT
const SCROLL_SPEED = 30 // px per second

// ─── Main Onboarding Pager ─────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter()
  const scrollRef = useRef<ScrollView>(null)
  const [page, setPage] = useState(0)
  const [images, setImages] = useState<string[]>([])
  const { setCompleted } = useOnboardingStore()

  useEffect(() => {
    getShowcaseImages()
      .then(setImages)
      .catch(() => { })
  }, [])

  const goNext = useCallback(() => {
    if (page < 2) {
      scrollRef.current?.scrollTo({ x: SCREEN_W * (page + 1), animated: true })
    }
  }, [page])

  const handleFinish = useCallback(() => {
    setCompleted()
    router.replace('/(auth)/sign-in')
  }, [setCompleted, router])

  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const p = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W)
      setPage(p)
    },
    []
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        <HeroScreen heroImage={images[0]} onNext={goNext} />
        <GalleryScreen images={images} onNext={goNext} />
        <CreditsScreen onFinish={handleFinish} backgroundImage={images[2]} />
      </ScrollView>
      <PageDots current={page} />
    </View>
  )
}

// ─── Page Dots (modern pill indicator) ──────────────────────────────────
function PageDots({ current }: { current: number }) {
  return (
    <View style={styles.dotsContainer}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i === current ? AURORA_PINK : 'rgba(255,255,255,0.2)',
              width: i === current ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  )
}

// ─── Gradient CTA Button ────────────────────────────────────────────────
function GradientCTA({
  onPress,
  label,
  large,
}: {
  onPress: () => void
  label: string
  large?: boolean
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={[AURORA_MAGENTA, '#9333EA', AURORA_TEAL]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.ctaButton, large && styles.ctaLarge]}
      >
        <Text style={[styles.ctaText, large && styles.ctaTextLarge]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}

// ─── Screen 1: Hero ─────────────────────────────────────────────────────
function HeroScreen({
  heroImage,
  onNext,
}: {
  heroImage?: string
  onNext: () => void
}) {
  const openTerms = () => {
    const base = CONFIG.API_BASE_URL.replace(/\/api\/?$/, '')
    WebBrowser.openBrowserAsync(`${base}/terms`)
  }
  const openPrivacy = () => {
    const base = CONFIG.API_BASE_URL.replace(/\/api\/?$/, '')
    WebBrowser.openBrowserAsync(`${base}/privacy`)
  }

  return (
    <View style={styles.page}>
      {/* Background image */}
      {heroImage && (
        <Image
          source={{ uri: heroImage }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={400}
        />
      )}
      {/* Aurora gradient overlay */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(25,49,83,0.25)',
          'rgba(11,87,119,0.55)',
          'rgba(25,49,83,0.92)',
        ]}
        locations={[0.15, 0.4, 0.65, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Content */}
      <View style={styles.heroContent}>
        <Text style={styles.heroHeadline}>Turn your products{'\n'}into sales</Text>
        <Text style={styles.heroSubheadline}>
          AI-powered product photography in seconds
        </Text>
        <GradientCTA onPress={onNext} label="Get Started" />
        <Text style={styles.legalText}>
          By tapping Get Started, you agree to our{' '}
          <Text style={styles.legalLink} onPress={openTerms}>
            Terms
          </Text>{' '}
          and{' '}
          <Text style={styles.legalLink} onPress={openPrivacy}>
            Privacy Policy
          </Text>
        </Text>
      </View>
    </View>
  )
}

// ─── Screen 2: Kodak Gallery ────────────────────────────────────────────
function GalleryScreen({
  images,
  onNext,
}: {
  images: string[]
  onNext: () => void
}) {
  // Split images into 3 columns with different offsets for staggered effect
  const tripled = [...images, ...images, ...images]
  const col1 = tripled.filter((_, i) => i % 3 === 0)
  const col2 = tripled.filter((_, i) => i % 3 === 1)
  const col3 = tripled.filter((_, i) => i % 3 === 2)

  // Varying aspect ratios for masonry feel
  const ratios = [1.3, 1.0, 1.5, 1.2, 0.9, 1.4, 1.1, 1.3, 1.0, 1.5, 1.2, 0.9, 1.4, 1.1, 1.3]

  return (
    <View style={styles.page}>
      <View style={styles.galleryContainer}>
        <KodakColumn images={col1} ratios={ratios} offset={0} />
        <KodakColumn images={col2} ratios={ratios.slice(1)} offset={60} />
        <KodakColumn images={col3} ratios={ratios.slice(2)} offset={30} />
      </View>
      {/* Aurora overlay gradient */}
      <LinearGradient
        colors={[
          'rgba(25,49,83,0.65)',
          'rgba(11,87,119,0.15)',
          'rgba(11,87,119,0.15)',
          'rgba(25,49,83,0.8)',
        ]}
        locations={[0, 0.25, 0.65, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <View style={styles.galleryOverlay} pointerEvents="box-none">
        <Text style={styles.galleryHeadline}>Discover what{'\n'}AI can create</Text>
        <View style={styles.galleryBottom}>
          <GradientCTA onPress={onNext} label="Start Creating" />
        </View>
      </View>
    </View>
  )
}

function KodakColumn({
  images,
  ratios,
  offset,
}: {
  images: string[]
  ratios: number[]
  offset: number
}) {
  const scrollY = useRef(new Animated.Value(0)).current
  const totalHeight = useRef(0)
  const isTouching = useRef(false)

  // Calculate total height of all images
  useEffect(() => {
    let h = 0
    images.forEach((_, i) => {
      const ratio = ratios[i % ratios.length]
      h += COLUMN_WIDTH * ratio + IMAGE_GAP
    })
    totalHeight.current = h
    // Start with initial offset for stagger
    scrollY.setValue(-offset)
  }, [images, ratios, offset])

  // Continuous auto-scroll animation
  useEffect(() => {
    if (images.length === 0) return

    let animation: Animated.CompositeAnimation

    const startScroll = () => {
      if (isTouching.current) return
      const currentVal = (scrollY as any)._value || 0
      const remaining = totalHeight.current / 3 + currentVal // scroll one "set" of images
      const duration = (Math.abs(remaining) / SCROLL_SPEED) * 1000

      animation = Animated.timing(scrollY, {
        toValue: -(totalHeight.current / 3),
        duration: Math.max(duration, 1000),
        useNativeDriver: true,
      })

      animation.start(({ finished }) => {
        if (finished) {
          scrollY.setValue(0)
          startScroll()
        }
      })
    }

    const timer = setTimeout(startScroll, 300)
    return () => {
      clearTimeout(timer)
      animation?.stop()
    }
  }, [images, scrollY])

  if (images.length === 0) return <View style={{ width: COLUMN_WIDTH }} />

  return (
    <View style={{ width: COLUMN_WIDTH, overflow: 'hidden', flex: 1 }}>
      <Animated.View style={{ transform: [{ translateY: scrollY }] }}>
        {images.map((uri, i) => {
          const ratio = ratios[i % ratios.length]
          return (
            <View
              key={`${uri}-${i}`}
              style={{
                width: COLUMN_WIDTH,
                height: COLUMN_WIDTH * ratio,
                marginBottom: IMAGE_GAP,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <Image
                source={{ uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
              />
            </View>
          )
        })}
      </Animated.View>
    </View>
  )
}

// ─── Screen 3: Free Credits ─────────────────────────────────────────────

// Floating coin positions — spread across the screen
const COINS = [
  { size: 44, left: '8%', top: '8%', delay: 0, duration: 3200 },
  { size: 32, left: '78%', top: '12%', delay: 400, duration: 2800 },
  { size: 28, left: '25%', top: '5%', delay: 800, duration: 3600 },
  { size: 38, left: '62%', top: '3%', delay: 200, duration: 3000 },
  { size: 24, left: '90%', top: '25%', delay: 600, duration: 3400 },
  { size: 34, left: '5%', top: '28%', delay: 1000, duration: 2600 },
  { size: 26, left: '45%', top: '2%', delay: 300, duration: 3800 },
  { size: 20, left: '85%', top: '35%', delay: 700, duration: 3100 },
] as const

function FloatingCoin({
  size,
  left,
  top,
  delay,
  duration,
}: (typeof COINS)[number]) {
  const translateY = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 0.7,
      duration: 600,
      delay,
      useNativeDriver: true,
    }).start()

    // Float up and down
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -12,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 12,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [translateY, opacity, delay, duration])

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: left as any,
        top: top as any,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <CoinSvg size={size} />
    </Animated.View>
  )
}

function CoinSvg({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* Outer ring */}
      <Circle cx="24" cy="24" r="22" fill="#F59E0B" />
      <Circle cx="24" cy="24" r="22" fill="url(#coinGrad)" />
      {/* Inner ring */}
      <Circle cx="24" cy="24" r="18" fill="none" stroke="#FCD34D" strokeWidth="1.5" opacity={0.6} />
      {/* Star/sparkle in center */}
      <SvgPath
        d="M24 12 L26.5 20 L34 20 L28 25 L30 33 L24 28 L18 33 L20 25 L14 20 L21.5 20 Z"
        fill="#FEF3C7"
        opacity={0.9}
      />
      <Defs>
        <SvgLinearGradient id="coinGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#D97706" />
        </SvgLinearGradient>
      </Defs>
    </Svg>
  )
}

function CreditsScreen({
  onFinish,
  backgroundImage,
}: {
  onFinish: () => void
  backgroundImage?: string
}) {
  // Pulsing glow
  const glowAnim = useRef(new Animated.Value(0.4)).current
  // Scale-in entrance for the main coin
  const coinScale = useRef(new Animated.Value(0.3)).current
  const coinOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
      ])
    ).start()

    // Coin entrance with spring
    Animated.parallel([
      Animated.spring(coinScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
        delay: 200,
      }),
      Animated.timing(coinOpacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }, [glowAnim, coinScale, coinOpacity])

  return (
    <View style={[styles.page, styles.creditsPage]}>
      {/* Background image as subtle texture */}
      {backgroundImage && (
        <Image
          source={{ uri: backgroundImage }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          blurRadius={20}
        />
      )}
      {/* Aurora gradient overlay */}
      <LinearGradient
        colors={[
          'rgba(25,49,83,0.94)',
          'rgba(11,87,119,0.88)',
          'rgba(91,33,182,0.82)',
          'rgba(235,150,255,0.65)',
        ]}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating coins */}
      {COINS.map((coin, i) => (
        <FloatingCoin key={i} {...coin} />
      ))}

      {/* Main content */}
      <View style={styles.creditsContent}>
        {/* Pulsing glow behind coin */}
        <Animated.View style={[styles.glow, { opacity: glowAnim }]} />

        {/* Central coin with number */}
        <Animated.View
          style={[
            styles.centralCoin,
            { transform: [{ scale: coinScale }], opacity: coinOpacity },
          ]}
        >
          <Svg width={140} height={140} viewBox="0 0 140 140">
            <Defs>
              <SvgLinearGradient id="bigCoinGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FBBF24" />
                <Stop offset="0.5" stopColor="#F59E0B" />
                <Stop offset="1" stopColor="#D97706" />
              </SvgLinearGradient>
              <SvgLinearGradient id="innerGlow" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FEF3C7" stopOpacity="0.3" />
                <Stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>
            {/* Shadow */}
            <Circle cx="70" cy="72" r="62" fill="rgba(0,0,0,0.3)" />
            {/* Main coin */}
            <Circle cx="70" cy="70" r="62" fill="url(#bigCoinGrad)" />
            {/* Inner highlight */}
            <Circle cx="70" cy="70" r="55" fill="url(#innerGlow)" />
            {/* Inner ring */}
            <Circle cx="70" cy="70" r="52" fill="none" stroke="#FCD34D" strokeWidth="2" opacity={0.5} />
          </Svg>
          <Text style={styles.coinNumber}>10</Text>
        </Animated.View>

        <Text style={styles.creditsLabel}>Free Credits</Text>
        <Text style={styles.creditsHeadline}>Start creating for free</Text>

        {/* Glass card with benefits */}
        <View style={styles.benefitsCard}>
          <BenefitRow icon="sparkle" text="3 product enhancements" />
          <View style={styles.benefitDivider} />
          <BenefitRow icon="grid" text="1 Instagram 3x3 grid" />
          <View style={styles.benefitDivider} />
          <BenefitRow icon="arrow-up" text="1 professional upscale" />
        </View>
      </View>

      {/* CTA pinned at bottom */}
      <View style={styles.creditsBottom}>
        <GradientCTA onPress={onFinish} label="Create My Account" large />
      </View>
    </View>
  )
}

function BenefitRow({ icon, text }: { icon: 'sparkle' | 'grid' | 'arrow-up'; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        {icon === 'sparkle' && (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <SvgPath
              d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
              fill={AURORA_MAGENTA}
            />
          </Svg>
        )}
        {icon === 'grid' && (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="3" width="5" height="5" rx="1" fill={AURORA_MAGENTA} />
            <Rect x="10" y="3" width="5" height="5" rx="1" fill={AURORA_MAGENTA} />
            <Rect x="17" y="3" width="5" height="5" rx="1" fill={AURORA_MAGENTA} />
            <Rect x="3" y="10" width="5" height="5" rx="1" fill={AURORA_MAGENTA} />
            <Rect x="10" y="10" width="5" height="5" rx="1" fill={AURORA_MAGENTA} />
            <Rect x="17" y="10" width="5" height="5" rx="1" fill={AURORA_MAGENTA} />
            <Rect x="3" y="17" width="5" height="5" rx="1" fill={AURORA_MAGENTA} />
            <Rect x="10" y="17" width="5" height="5" rx="1" fill={AURORA_MAGENTA} />
            <Rect x="17" y="17" width="5" height="5" rx="1" fill={AURORA_MAGENTA} />
          </Svg>
        )}
        {icon === 'arrow-up' && (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <SvgPath
              d="M12 3L20 11H15V21H9V11H4L12 3Z"
              fill={AURORA_MAGENTA}
            />
          </Svg>
        )}
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AURORA_NAVY,
  },
  page: {
    width: SCREEN_W,
    height: SCREEN_H,
  },

  // Dots
  dotsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Hero
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
  },
  heroHeadline: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 40,
    marginBottom: 10,
  },
  heroSubheadline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 28,
  },
  ctaButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  legalText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },

  // Gallery
  galleryContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: IMAGE_GAP,
    paddingHorizontal: IMAGE_GAP,
    paddingTop: IMAGE_GAP,
  },
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
  },
  galleryHeadline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  galleryBottom: {
    width: '100%',
  },

  // Credits
  creditsPage: {
    backgroundColor: AURORA_NAVY,
  },
  creditsContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: AURORA_MAGENTA,
    ...Platform.select({
      ios: {
        shadowColor: AURORA_MAGENTA,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 50,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  centralCoin: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  coinNumber: {
    position: 'absolute',
    fontSize: 48,
    fontWeight: '900',
    color: '#78350F',
    textShadowColor: 'rgba(254,243,199,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  creditsLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: AURORA_PINK,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  creditsHeadline: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 28,
  },
  benefitsCard: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(235,150,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(235,150,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    flex: 1,
  },
  benefitDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  creditsBottom: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
  },
  ctaLarge: {
    alignSelf: 'stretch',
    paddingVertical: 18,
    borderRadius: 16,
  },
  ctaTextLarge: {
    fontSize: 18,
    fontWeight: '800',
  },
})
