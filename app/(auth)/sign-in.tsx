import { useAuth, useSignIn, useSignUp, useSSO } from '@clerk/clerk-expo'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, {
  Circle,
  Defs,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
} from 'react-native-svg'

WebBrowser.maybeCompleteAuthSession()

const { width: SCREEN_W } = Dimensions.get('window')

// Brand palette
const AURORA_NAVY = '#193153'
const AURORA_TEAL = '#06B6D4'
const AURORA_MAGENTA = '#7C3AED'
const AURORA_PINK = '#A78BFA'
const ACCENT = '#FBBF24'

// Hero showcase assets (bundled editorial samples)
const HERO_IMAGES = [
  require('@/assets/images/previews/fashion-editorial-1.png'),
  require('@/assets/images/previews/fashion-editorial-2.png'),
  require('@/assets/images/previews/fashion-editorial-3.png'),
  require('@/assets/images/previews/fashion-editorial-4.png'),
]

// ─── SVG Icons ──────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <SvgPath d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <SvgPath d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <SvgPath d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <SvgPath d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  )
}

function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <SvgPath d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="#FFFFFF" />
    </Svg>
  )
}

function MailIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="20" height="16" rx="3" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" />
      <SvgPath d="M2 7l10 7 10-7" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function CheckIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M5 13l4 4L19 7" stroke={ACCENT} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function BoltIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill={ACCENT}>
      <SvgPath d="M11 0L0 14h8l-3 10L24 8h-9l4-8z" />
    </Svg>
  )
}

function AutoToonLogo() {
  return (
    <View style={logoStyles.iconWrap}>
      <Svg width={36} height={36} viewBox="0 0 48 48">
        <Defs>
          <SvgLinearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={AURORA_MAGENTA} />
            <Stop offset="1" stopColor={AURORA_TEAL} />
          </SvgLinearGradient>
        </Defs>
        <Rect x="4" y="4" width="40" height="40" rx="12" fill="url(#logoGrad)" />
        <Circle cx="24" cy="22" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2.5" opacity={0.9} />
        <Circle cx="24" cy="22" r="5" fill="#FFFFFF" opacity={0.8} />
        <SvgPath d="M24 32 L26 36 L30 36 L27 38.5 L28 42 L24 40 L20 42 L21 38.5 L18 36 L22 36 Z" fill="#FFFFFF" opacity={0.7} />
      </Svg>
    </View>
  )
}

const logoStyles = StyleSheet.create({
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: AURORA_MAGENTA, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 14 },
      android: { elevation: 8 },
    }),
  },
})

// ─── Hero showcase: auto-scrolling row of editorial samples ────────────

const HERO_CARD_W = 180
const HERO_CARD_H = 240
const HERO_GAP = 12
const HERO_ITEM_W = HERO_CARD_W + HERO_GAP
const HERO_LOOP = HERO_IMAGES.length

function HeroShowcase() {
  const scroll = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const totalWidth = HERO_ITEM_W * HERO_LOOP
    const loop = Animated.loop(
      Animated.timing(scroll, {
        toValue: -totalWidth,
        duration: HERO_LOOP * 4500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    loop.start()
    return () => loop.stop()
  }, [scroll])

  // Duplicate row twice for seamless loop
  const items = [...HERO_IMAGES, ...HERO_IMAGES]

  return (
    <View style={heroStyles.wrap}>
      <Animated.View style={[heroStyles.row, { transform: [{ translateX: scroll }] }]}>
        {items.map((src, i) => (
          <View key={i} style={heroStyles.card}>
            <Image source={src} style={heroStyles.image} contentFit="cover" transition={200} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)']}
              style={heroStyles.imageGradient}
            />
          </View>
        ))}
      </Animated.View>
      {/* Fade edges */}
      <LinearGradient
        colors={[AURORA_NAVY, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[heroStyles.fade, { left: 0 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', AURORA_NAVY]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[heroStyles.fade, { right: 0 }]}
        pointerEvents="none"
      />
    </View>
  )
}

const heroStyles = StyleSheet.create({
  wrap: { height: HERO_CARD_H, marginBottom: 24, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: HERO_GAP, paddingHorizontal: 0 },
  card: { width: HERO_CARD_W, height: HERO_CARD_H, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)' },
  image: { width: '100%', height: '100%' },
  imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%' },
  fade: { position: 'absolute', top: 0, bottom: 0, width: 40, zIndex: 2 },
})

// ─── Pay-per-use pitch card ────────────────────────────────────────────

function PayPerUsePitch() {
  return (
    <View style={pitchStyles.borderWrap}>
      <LinearGradient
        colors={[ACCENT, '#F59E0B', AURORA_MAGENTA]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={pitchStyles.inner}>
        <View style={pitchStyles.badgeRow}>
          <View style={pitchStyles.badge}>
            <BoltIcon />
            <Text style={pitchStyles.badgeText}>PAY-PER-USE</Text>
          </View>
          <Text style={pitchStyles.eyebrow}>No subscription</Text>
        </View>

        <Text style={pitchStyles.title}>Pay only when{'\n'}you create.</Text>
        <Text style={pitchStyles.sub}>
          Start free with 10 credits. After that, pay per image — billed automatically as you go. Cancel anytime, nothing to remember.
        </Text>

        <View style={pitchStyles.bullets}>
          <View style={pitchStyles.bullet}>
            <View style={pitchStyles.bulletDot}><CheckIcon /></View>
            <Text style={pitchStyles.bulletText}>From $0.07 per editorial image</Text>
          </View>
          <View style={pitchStyles.bullet}>
            <View style={pitchStyles.bulletDot}><CheckIcon /></View>
            <Text style={pitchStyles.bulletText}>10 free credits — no card required</Text>
          </View>
          <View style={pitchStyles.bullet}>
            <View style={pitchStyles.bulletDot}><CheckIcon /></View>
            <Text style={pitchStyles.bulletText}>Cap your monthly spend at any amount</Text>
          </View>
          <View style={pitchStyles.bullet}>
            <View style={pitchStyles.bulletDot}><CheckIcon /></View>
            <Text style={pitchStyles.bulletText}>Cancel anytime, zero commitment</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const pitchStyles = StyleSheet.create({
  borderWrap: {
    borderRadius: 22,
    padding: 1.5,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 22 },
      android: { elevation: 12 },
    }),
  },
  inner: {
    borderRadius: 20.5,
    backgroundColor: 'rgba(20, 30, 55, 0.95)',
    padding: 20,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)' },
  badgeText: { fontSize: 10, color: ACCENT, fontWeight: '800', letterSpacing: 1 },
  eyebrow: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.6, lineHeight: 30, marginBottom: 10 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 19, marginBottom: 16 },
  bullets: { gap: 10 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(251,191,36,0.16)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  bulletText: { fontSize: 13, color: '#FFFFFF', fontWeight: '500', flex: 1 },
})

// ─── Social proof strip ────────────────────────────────────────────────

function SocialProof() {
  return (
    <View style={proofStyles.row}>
      <View style={proofStyles.statBlock}>
        <Text style={proofStyles.statNum}>12k+</Text>
        <Text style={proofStyles.statLabel}>creators</Text>
      </View>
      <View style={proofStyles.divider} />
      <View style={proofStyles.statBlock}>
        <Text style={proofStyles.statNum}>4.9★</Text>
        <Text style={proofStyles.statLabel}>rating</Text>
      </View>
      <View style={proofStyles.divider} />
      <View style={proofStyles.statBlock}>
        <Text style={proofStyles.statNum}>2M+</Text>
        <Text style={proofStyles.statLabel}>images</Text>
      </View>
    </View>
  )
}

const proofStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 24, paddingVertical: 8 },
  statBlock: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: '500' },
  divider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
})

// ─── Main Screen ────────────────────────────────────────────────────────

export default function SignInScreen() {
  const router = useRouter()
  const { startSSOFlow } = useSSO()
  const { signIn, setActive, isLoaded } = useSignIn()
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp()
  const { isSignedIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingVerification, setPendingVerification] = useState(false)
  const [verifyMode, setVerifyMode] = useState<'signIn' | 'signUp'>('signIn')
  const [showEmailForm, setShowEmailForm] = useState(false)

  const otpInputRef = useRef<TextInput>(null)

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  const handleGoogleSSO = useCallback(async () => {
    try {
      const { createdSessionId, setActive: setActiveSSO } = await startSSOFlow({ strategy: 'oauth_google' })
      if (createdSessionId && setActiveSSO) await setActiveSSO({ session: createdSessionId })
    } catch (err) {
      console.error('Google SSO error:', err)
    }
  }, [startSSOFlow])

  const handleAppleSSO = useCallback(async () => {
    try {
      const { createdSessionId, setActive: setActiveSSO } = await startSSOFlow({ strategy: 'oauth_apple' })
      if (createdSessionId && setActiveSSO) await setActiveSSO({ session: createdSessionId })
    } catch (err) {
      console.error('Apple SSO error:', err)
    }
  }, [startSSOFlow])

  const startEmailSignUp = useCallback(async () => {
    if (!signUpLoaded || !signUp) return
    try {
      await signUp.create({ emailAddress: email.trim(), ...(password ? { password } : {}) })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setVerifyMode('signUp')
      setPendingVerification(true)
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Sign up failed')
    }
  }, [signUpLoaded, signUp, email, password])

  const handleEmailSignIn = useCallback(async () => {
    if (!isLoaded || !signIn) return
    setError('')
    setLoading(true)
    try {
      const result = await signIn.create({ identifier: email.trim() })
      if (result.status === 'complete' && setActive) {
        await setActive({ session: result.createdSessionId })
        return
      }
      if (result.status === 'needs_first_factor') {
        const factors = result.supportedFirstFactors ?? []
        const emailCodeFactor = factors.find((f: any) => f.strategy === 'email_code')
        if (emailCodeFactor && 'emailAddressId' in emailCodeFactor) {
          await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: emailCodeFactor.emailAddressId })
          setVerifyMode('signIn')
          setPendingVerification(true)
          return
        }
        const hasPassword = factors.some((f: any) => f.strategy === 'password')
        if (hasPassword && password) {
          const pwResult = await signIn.attemptFirstFactor({ strategy: 'password', password })
          if (pwResult.status === 'complete' && setActive) {
            await setActive({ session: pwResult.createdSessionId })
            return
          }
        }
      }
      setError('Unable to complete sign in. Try Google or Apple instead.')
    } catch (err: any) {
      const code = err?.errors?.[0]?.code
      // Auto-fall-through to sign-up when account doesn't exist
      if (code === 'form_identifier_not_found') {
        await startEmailSignUp()
      } else {
        setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Sign in failed')
      }
    } finally {
      setLoading(false)
    }
  }, [isLoaded, signIn, setActive, email, password, startEmailSignUp])

  const handleVerifyCode = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      if (verifyMode === 'signUp') {
        if (!signUpLoaded || !signUp) return
        const result = await signUp.attemptEmailAddressVerification({ code })
        if (result.status === 'complete' && setActiveSignUp) {
          await setActiveSignUp({ session: result.createdSessionId })
        } else {
          setError('Verification failed. Please try again.')
        }
      } else {
        if (!isLoaded || !signIn) return
        const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code })
        if (result.status === 'complete' && setActive) {
          await setActive({ session: result.createdSessionId })
        } else {
          setError('Verification failed. Please try again.')
        }
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }, [verifyMode, isLoaded, signIn, setActive, signUpLoaded, signUp, setActiveSignUp, code])

  useEffect(() => {
    if (isSignedIn) router.replace('/(tabs)')
  }, [isSignedIn, router])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start()
  }, [fadeAnim, slideAnim])

  if (isSignedIn) return null

  if (pendingVerification) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={[AURORA_NAVY, '#0D2E4A', '#1A0F3A']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.glowOrb} />
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.verifyContent}>
              <View style={styles.authCard}>
                <Text style={styles.authCardTitle}>Check your email</Text>
                <Text style={styles.authCardSubtitle}>We sent a verification code to {email}</Text>
                <View style={otpStyles.container}>
                  <TextInput ref={otpInputRef} style={otpStyles.hiddenInput} value={code} onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoFocus maxLength={6} />
                  <View style={otpStyles.boxes}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <TouchableOpacity key={i} style={[otpStyles.box, code.length === i && otpStyles.boxFocused, code.length > i && otpStyles.boxFilled]} activeOpacity={1} onPress={() => otpInputRef.current?.focus()}>
                        <Text style={[otpStyles.digit, code.length > i && otpStyles.digitFilled]}>{code[i] || ''}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity onPress={handleVerifyCode} activeOpacity={0.7} disabled={loading || !code} style={loading ? { opacity: 0.6 } : undefined}>
                  <LinearGradient colors={[AURORA_MAGENTA, '#D946EF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emailButton}>
                    {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.emailButtonText}>Verify & Sign In</Text>}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setPendingVerification(false); setCode(''); setError('') }} style={{ marginTop: 16, alignItems: 'center' }}>
                  <Text style={styles.linkText}><Text style={styles.linkAccent}>Go back</Text></Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[AURORA_NAVY, '#0D2E4A', '#1C1240']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.glowOrb} />
      <View style={[styles.glowOrb, styles.glowOrbAccent]} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Brand row */}
              <View style={styles.brandRow}>
                <AutoToonLogo />
                <View style={{ flex: 1 }}>
                  <Text style={styles.brand}>AutoToon</Text>
                  <Text style={styles.brandSub}>AI fashion studio</Text>
                </View>
              </View>

              {/* Hero showcase */}
              <HeroShowcase />

              {/* Headline */}
              <Text style={styles.headline}>
                Studio-quality editorial.{'\n'}
                <Text style={{ color: ACCENT }}>In your pocket.</Text>
              </Text>
              <Text style={styles.headlineSub}>
                Upload a model and a product. Get a campaign-ready image in seconds.
              </Text>

              {/* Social proof */}
              <SocialProof />

              {/* Pay-per-use pitch */}
              <PayPerUsePitch />

              {/* Auth card */}
              <View style={styles.authCard}>
                <Text style={styles.authCardTitle}>Start creating</Text>
                <Text style={styles.authCardSubtitle}>10 free credits on sign-up</Text>

                <View style={styles.buttons}>
                  <TouchableOpacity style={styles.ssoButton} onPress={handleGoogleSSO} activeOpacity={0.7}>
                    <View style={styles.ssoIconWrap}><GoogleIcon /></View>
                    <Text style={styles.ssoButtonText}>Continue with Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.ssoButton, styles.appleButton]} onPress={handleAppleSSO} activeOpacity={0.7}>
                    <View style={[styles.ssoIconWrap, styles.appleIconWrap]}><AppleIcon /></View>
                    <Text style={[styles.ssoButtonText, styles.appleButtonText]}>Continue with Apple</Text>
                  </TouchableOpacity>

                  {!showEmailForm ? (
                    <TouchableOpacity
                      style={styles.emailToggleBtn}
                      onPress={() => setShowEmailForm(true)}
                      activeOpacity={0.7}
                    >
                      <MailIcon />
                      <Text style={styles.emailToggleText}>Continue with Email</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.emailFormWrap}>
                      <TextInput style={styles.input} placeholder="Email address" placeholderTextColor="rgba(255,255,255,0.3)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" />
                      <TextInput style={styles.input} placeholder="Password (optional)" placeholderTextColor="rgba(255,255,255,0.3)" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" />
                      {error ? <Text style={styles.errorText}>{error}</Text> : null}
                      <TouchableOpacity onPress={handleEmailSignIn} activeOpacity={0.7} disabled={loading || !email} style={loading ? { opacity: 0.6 } : undefined}>
                        <LinearGradient colors={[AURORA_MAGENTA, '#D946EF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emailButton}>
                          {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.emailButtonText}>Sign in / Sign up</Text>}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <Text style={styles.terms}>
                  By continuing, you agree to the Terms & Privacy Policy.{'\n'}No charge until you exceed your free credits.
                </Text>
              </View>

              <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')} style={styles.linkWrap}>
                <Text style={styles.linkText}>
                  Have an account? <Text style={styles.linkAccent}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AURORA_NAVY },
  glowOrb: {
    position: 'absolute', top: '15%', left: '50%', marginLeft: -120, width: 240, height: 240, borderRadius: 120,
    backgroundColor: AURORA_MAGENTA, opacity: 0.08,
    ...Platform.select({
      ios: { shadowColor: AURORA_MAGENTA, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 90 },
      android: {},
    }),
  },
  glowOrbAccent: {
    top: '55%', left: '0%', marginLeft: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: ACCENT, opacity: 0.05,
  },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  // Brand
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  brand: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  brandSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 1 },

  // Headline
  headline: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.8, lineHeight: 36, marginBottom: 10 },
  headlineSub: { fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 21, marginBottom: 22 },

  // Auth card
  authCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 20, marginBottom: 16 },
  authCardTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  authCardSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 18 },

  // SSO Buttons
  buttons: { gap: 10 },
  ssoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', gap: 12 },
  ssoIconWrap: { width: 24, height: 24, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  ssoButtonText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.92)' },
  appleButton: { backgroundColor: '#000000', borderColor: '#0D0D0D' },
  appleIconWrap: { backgroundColor: 'rgba(0,0,0,0.1)' },
  appleButtonText: { color: '#EFEFEF' },

  emailToggleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 13, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  emailToggleText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },

  emailFormWrap: { gap: 10, marginTop: 4 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#FFFFFF' },
  errorText: { fontSize: 12, color: '#EF4444', textAlign: 'center', marginTop: 2 },
  emailButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 10 },
  emailButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  terms: { fontSize: 10.5, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 14, lineHeight: 15 },

  // Footer
  linkWrap: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  linkAccent: { color: AURORA_PINK, fontWeight: '700' },

  verifyContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
})

const otpStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0, width: 0 },
  boxes: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  box: { width: 44, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  boxFocused: { borderColor: AURORA_MAGENTA, backgroundColor: 'rgba(251,191,36,0.08)' },
  boxFilled: { borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.08)' },
  digit: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  digitFilled: { color: '#FFFFFF' },
})
