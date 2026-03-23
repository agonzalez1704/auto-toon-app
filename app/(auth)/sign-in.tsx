import { useAuth, useSignIn, useSSO } from '@clerk/clerk-expo'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
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
const BRAND = '#8B5CF6'
const BRAND_CYAN = '#06B6D4'

// ─── SVG Icons ──────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <SvgPath
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <SvgPath
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <SvgPath
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <SvgPath
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  )
}

function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <SvgPath
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill="#FFFFFF"
      />
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

function AutoToonLogo() {
  return (
    <View style={logoStyles.container}>
      <View style={logoStyles.iconWrap}>
        <Svg width={40} height={40} viewBox="0 0 48 48">
          <Defs>
            <SvgLinearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={BRAND} />
              <Stop offset="1" stopColor={BRAND_CYAN} />
            </SvgLinearGradient>
          </Defs>
          <Rect x="4" y="4" width="40" height="40" rx="12" fill="url(#logoGrad)" />
          <Circle cx="24" cy="22" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2.5" opacity={0.9} />
          <Circle cx="24" cy="22" r="5" fill="#FFFFFF" opacity={0.8} />
          <SvgPath
            d="M24 32 L26 36 L30 36 L27 38.5 L28 42 L24 40 L20 42 L21 38.5 L18 36 L22 36 Z"
            fill="#FFFFFF"
            opacity={0.7}
          />
        </Svg>
      </View>
    </View>
  )
}

const logoStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
})

// ─── Main Screen ────────────────────────────────────────────────────────

export default function SignInScreen() {
  const router = useRouter()
  const { startSSOFlow } = useSSO()
  const { signIn, setActive, isLoaded } = useSignIn()
  const { isSignedIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  const handleGoogleSSO = useCallback(async () => {
    try {
      const { createdSessionId, setActive: setActiveSSO } = await startSSOFlow({
        strategy: 'oauth_google',
      })
      if (createdSessionId && setActiveSSO) {
        await setActiveSSO({ session: createdSessionId })
      }
    } catch (err) {
      console.error('Google SSO error:', err)
    }
  }, [startSSOFlow])

  const handleAppleSSO = useCallback(async () => {
    try {
      const { createdSessionId, setActive: setActiveSSO } = await startSSOFlow({
        strategy: 'oauth_apple',
      })
      if (createdSessionId && setActiveSSO) {
        await setActiveSSO({ session: createdSessionId })
      }
    } catch (err) {
      console.error('Apple SSO error:', err)
    }
  }, [startSSOFlow])

  const handleEmailSignIn = useCallback(async () => {
    if (!isLoaded || !signIn) return
    setError('')
    setLoading(true)
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      })
      if (result.status === 'complete' && setActive) {
        await setActive({ session: result.createdSessionId })
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Sign in failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [isLoaded, signIn, setActive, email, password])

  useEffect(() => {
    if (isSignedIn) {
      router.replace('/(tabs)')
    }
  }, [isSignedIn, router])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, slideAnim])

  if (isSignedIn) {
    return null
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#0a0a0a', '#0f0520', '#0a0a0a']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.glowOrb} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <Animated.ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          >
            {/* Header */}
            <View style={styles.header}>
              <AutoToonLogo />
              <Text style={styles.title}>AutoToon</Text>
              <Text style={styles.subtitle}>
                AI-powered product photography
              </Text>
            </View>

            {/* Auth card */}
            <View style={styles.authCard}>
              <Text style={styles.authCardTitle}>Welcome back</Text>
              <Text style={styles.authCardSubtitle}>
                Sign in to continue creating
              </Text>

              {/* SSO buttons */}
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={styles.ssoButton}
                  onPress={handleGoogleSSO}
                  activeOpacity={0.7}
                >
                  <View style={styles.ssoIconWrap}>
                    <GoogleIcon />
                  </View>
                  <Text style={styles.ssoButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.ssoButton, styles.appleButton]}
                  onPress={handleAppleSSO}
                  activeOpacity={0.7}
                >
                  <View style={[styles.ssoIconWrap, styles.appleIconWrap]}>
                    <AppleIcon />
                  </View>
                  <Text style={[styles.ssoButtonText, styles.appleButtonText]}>
                    Continue with Apple
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email / Password */}
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="password"
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.emailButton, loading && { opacity: 0.6 }]}
                onPress={handleEmailSignIn}
                activeOpacity={0.7}
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MailIcon />
                    <Text style={styles.emailButtonText}>Sign in with Email</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer link */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/sign-up')}
              style={styles.linkWrap}
            >
              <Text style={styles.linkText}>
                Don&apos;t have an account?{' '}
                <Text style={styles.linkAccent}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </Animated.ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  glowOrb: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: BRAND,
    opacity: 0.06,
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 80,
      },
      android: {},
    }),
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },

  // Auth card
  authCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    marginBottom: 24,
  },
  authCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  authCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 24,
  },

  // SSO Buttons
  buttons: {
    gap: 12,
  },
  ssoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 12,
  },
  ssoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ssoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#0D0D0D',
  },
  appleIconWrap: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  appleButtonText: {
    color: '#EFEFEF',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
  },

  // Inputs
  inputGroup: {
    gap: 12,
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: BRAND,
    gap: 10,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Footer
  linkWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  linkAccent: {
    color: BRAND,
    fontWeight: '600',
  },
})
