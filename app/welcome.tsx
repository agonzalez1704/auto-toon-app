import { useEffect, useRef } from 'react'
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import Svg, {
  Circle,
  Defs,
  Path as SvgPath,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg'

const { width: SCREEN_W } = Dimensions.get('window')

// Aurora Blossom palette
const AURORA_NAVY = '#193153'
const AURORA_TEAL = '#0B5777'
const AURORA_MAGENTA = '#EB96FF'
const AURORA_PINK = '#F9D4E0'

// ─── Confetti Particle ──────────────────────────────────────────────────

const CONFETTI_COLORS = [AURORA_MAGENTA, AURORA_TEAL, '#FBBF24', AURORA_PINK, '#34D399', '#9333EA']

function ConfettiParticle({ delay, color, left }: { delay: number; color: string; left: number }) {
  const translateY = useRef(new Animated.Value(-20)).current
  const opacity = useRef(new Animated.Value(0)).current
  const rotate = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 400, duration: 2200, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration: 2200, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ])
    anim.start()
  }, [delay, opacity, translateY, rotate])

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 + Math.random() * 360}deg`] })

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: -10,
        left: `${left}%`,
        width: 8,
        height: 8,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { rotate: spin }],
      }}
    />
  )
}

// ─── SVG Icons ──────────────────────────────────────────────────────────

function CreditsBadge() {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80">
      <Defs>
        <SvgLinearGradient id="coinGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#F59E0B" />
        </SvgLinearGradient>
        <SvgLinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={AURORA_MAGENTA} />
          <Stop offset="1" stopColor={AURORA_TEAL} />
        </SvgLinearGradient>
      </Defs>
      {/* Outer glow ring */}
      <Circle cx="40" cy="40" r="38" fill="none" stroke="url(#ringGrad)" strokeWidth="3" opacity={0.4} />
      {/* Coin */}
      <Circle cx="40" cy="40" r="28" fill="url(#coinGrad)" />
      <Circle cx="40" cy="40" r="22" fill="none" stroke="#78350F" strokeWidth="1.5" opacity={0.3} />
      {/* Star in center */}
      <SvgPath
        d="M40 28 L42.5 35 L50 35 L44 39.5 L46 47 L40 43 L34 47 L36 39.5 L30 35 L37.5 35 Z"
        fill="#78350F"
        opacity={0.5}
      />
    </Svg>
  )
}

function SparkleSmall({ x, y, size, delay: d }: { x: number; y: number; size: number; delay: number }) {
  const scale = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(d),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        Animated.delay(1200),
      ])
    ).start()
  }, [d, scale, opacity])

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity,
        transform: [{ scale }],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <SvgPath
          d="M12 2L13.5 9L20 10.5L13.5 12L12 19L10.5 12L4 10.5L10.5 9L12 2Z"
          fill={AURORA_PINK}
        />
      </Svg>
    </Animated.View>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const router = useRouter()

  // Entrance animations
  const badgeScale = useRef(new Animated.Value(0)).current
  const badgeBounce = useRef(new Animated.Value(0)).current
  const titleOpacity = useRef(new Animated.Value(0)).current
  const titleSlide = useRef(new Animated.Value(20)).current
  const creditsScale = useRef(new Animated.Value(0)).current
  const subtitleOpacity = useRef(new Animated.Value(0)).current
  const buttonOpacity = useRef(new Animated.Value(0)).current
  const buttonSlide = useRef(new Animated.Value(20)).current

  useEffect(() => {
    Animated.sequence([
      // Badge pops in
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      // Badge bounces
      Animated.sequence([
        Animated.timing(badgeBounce, { toValue: -12, duration: 150, useNativeDriver: true }),
        Animated.spring(badgeBounce, { toValue: 0, friction: 3, tension: 120, useNativeDriver: true }),
      ]),
      // Title fades in
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(titleSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      // Credits number pops
      Animated.spring(creditsScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
      // Subtitle + button
      Animated.parallel([
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(buttonSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start()
  }, [])

  const confettiParticles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: 200 + Math.random() * 600,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: 5 + Math.random() * 90,
  }))

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[AURORA_NAVY, '#0D2E4A', '#1C1240', AURORA_NAVY]}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Confetti layer */}
      <View style={styles.confettiContainer} pointerEvents="none">
        {confettiParticles.map((p) => (
          <ConfettiParticle key={p.id} delay={p.delay} color={p.color} left={p.left} />
        ))}
      </View>

      {/* Sparkles */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <SparkleSmall x={SCREEN_W * 0.15} y={180} size={18} delay={400} />
        <SparkleSmall x={SCREEN_W * 0.8} y={200} size={14} delay={800} />
        <SparkleSmall x={SCREEN_W * 0.6} y={140} size={20} delay={1200} />
        <SparkleSmall x={SCREEN_W * 0.25} y={260} size={12} delay={600} />
        <SparkleSmall x={SCREEN_W * 0.7} y={300} size={16} delay={1000} />
      </View>

      {/* Glow */}
      <View style={styles.glowOrb} />

      {/* Content */}
      <View style={styles.content}>
        {/* Badge */}
        <Animated.View
          style={[
            styles.badgeWrap,
            { transform: [{ scale: badgeScale }, { translateY: badgeBounce }] },
          ]}
        >
          <CreditsBadge />
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleSlide }] }}>
          <Text style={styles.welcomeTitle}>Welcome to AutoToon!</Text>
        </Animated.View>

        {/* Credits highlight */}
        <Animated.View style={[styles.creditsCard, { transform: [{ scale: creditsScale }] }]}>
          <Text style={styles.creditsNumber}>10</Text>
          <Text style={styles.creditsLabel}>Free Credits</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={{ opacity: subtitleOpacity }}>
          <Text style={styles.subtitle}>
            Use your credits to enhance product{'\n'}photos with AI-powered generation
          </Text>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View
          style={{
            opacity: buttonOpacity,
            transform: [{ translateY: buttonSlide }],
            width: '100%',
          }}
        >
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[AURORA_MAGENTA, '#9333EA', AURORA_TEAL]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.ctaText}>Start Creating</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AURORA_NAVY,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: AURORA_MAGENTA,
    opacity: 0.08,
    ...Platform.select({
      ios: {
        shadowColor: AURORA_MAGENTA,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 100,
      },
      android: {},
    }),
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // Badge
  badgeWrap: {
    marginBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: AURORA_MAGENTA,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    }),
  },

  // Title
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 24,
  },

  // Credits card
  creditsCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
    paddingVertical: 20,
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  creditsNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FBBF24',
    lineHeight: 64,
  },
  creditsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(251,191,36,0.8)',
    marginTop: 2,
  },

  // Subtitle
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },

  // CTA
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
