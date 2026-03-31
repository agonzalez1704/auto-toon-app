import { useSignUp, useSSO } from '@clerk/clerk-expo'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useSignUpStore } from '@/stores/use-signup-store'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
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
  Defs,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
} from 'react-native-svg'

WebBrowser.maybeCompleteAuthSession()

// Aurora Blossom palette
const AURORA_NAVY = '#193153'
const AURORA_TEAL = '#0B5777'
const AURORA_MAGENTA = '#EB96FF'
const AURORA_PINK = '#F9D4E0'

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

function SparkleIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Defs>
        <SvgLinearGradient id="sparkleGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={AURORA_MAGENTA} />
          <Stop offset="1" stopColor={AURORA_TEAL} />
        </SvgLinearGradient>
      </Defs>
      <Rect x="4" y="4" width="40" height="40" rx="12" fill="url(#sparkleGrad)" />
      <Rect x="22" y="14" width="4" height="20" rx="2" fill="#FFFFFF" opacity={0.9} />
      <Rect x="14" y="22" width="20" height="4" rx="2" fill="#FFFFFF" opacity={0.9} />
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

// ─── Main Screen ────────────────────────────────────────────────────────

export default function SignUpScreen() {
  const router = useRouter()
  const { startSSOFlow } = useSSO()
  const { signUp, setActive, isLoaded } = useSignUp()
  const markSignedUp = useSignUpStore((s) => s.setJustSignedUp)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingVerification, setPendingVerification] = useState(false)

  const otpInputRef = useRef<TextInput>(null)

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

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

  const handleGoogleSSO = useCallback(async () => {
    try {
      const { createdSessionId, setActive: setActiveSSO } = await startSSOFlow({
        strategy: 'oauth_google',
      })
      if (createdSessionId && setActiveSSO) {
        await setActiveSSO({ session: createdSessionId })
        markSignedUp(true)
      }
    } catch (err) {
      console.error('Google SSO error:', err)
    }
  }, [startSSOFlow, markSignedUp])

  const handleAppleSSO = useCallback(async () => {
    try {
      const { createdSessionId, setActive: setActiveSSO } = await startSSOFlow({
        strategy: 'oauth_apple',
      })
      if (createdSessionId && setActiveSSO) {
        await setActiveSSO({ session: createdSessionId })
        markSignedUp(true)
      }
    } catch (err) {
      console.error('Apple SSO error:', err)
    }
  }, [startSSOFlow, markSignedUp])

  const handleEmailSignUp = useCallback(async () => {
    if (!isLoaded || !signUp) return
    setError('')
    setLoading(true)
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
      })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Sign up failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [isLoaded, signUp, email, password])

  const handleVerify = useCallback(async () => {
    if (!isLoaded || !signUp) return
    setError('')
    setLoading(true)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === 'complete' && setActive) {
        await setActive({ session: result.createdSessionId })
        markSignedUp(true)
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Verification failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [isLoaded, signUp, setActive, code])

  // ─── Verification Screen ──────────────────────────────────────────────

  if (pendingVerification) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={[AURORA_NAVY, '#0D2E4A', '#1C1240']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.glowOrb} />

        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <View style={styles.verifyContent}>
              <View style={styles.authCard}>
                <Text style={styles.authCardTitle}>Check your email</Text>
                <Text style={styles.authCardSubtitle}>
                  We sent a verification code to {email}
                </Text>

                <View style={otpStyles.container}>
                  <TextInput
                    ref={otpInputRef}
                    style={otpStyles.hiddenInput}
                    value={code}
                    onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoFocus
                    maxLength={6}
                  />
                  <View style={otpStyles.boxes}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          otpStyles.box,
                          code.length === i && otpStyles.boxFocused,
                          code.length > i && otpStyles.boxFilled,
                        ]}
                        activeOpacity={1}
                        onPress={() => otpInputRef.current?.focus()}
                      >
                        <Text style={[otpStyles.digit, code.length > i && otpStyles.digitFilled]}>
                          {code[i] || ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  onPress={handleVerify}
                  activeOpacity={0.7}
                  disabled={loading || !code}
                  style={loading ? { opacity: 0.6 } : undefined}
                >
                  <LinearGradient
                    colors={[AURORA_MAGENTA, '#9333EA', AURORA_TEAL]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emailButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.emailButtonText}>Verify Email</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setPendingVerification(false)
                    setCode('')
                    setError('')
                  }}
                  style={{ marginTop: 16, alignItems: 'center' }}
                >
                  <Text style={styles.linkText}>
                    <Text style={styles.linkAccent}>Go back</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    )
  }

  // ─── Sign Up Screen ───────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[AURORA_NAVY, '#0D2E4A', '#1C1240']}
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
              <SparkleIcon />
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Start enhancing your product photos with AI
              </Text>
            </View>

            {/* Auth card */}
            <View style={styles.authCard}>
              <Text style={styles.authCardTitle}>Get started for free</Text>
              <Text style={styles.authCardSubtitle2}>
                10 free credits included with signup
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
                  <Text style={styles.ssoButtonText}>Sign up with Google</Text>
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
                    Sign up with Apple
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
                  textContentType="newPassword"
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                onPress={handleEmailSignUp}
                activeOpacity={0.7}
                disabled={loading || !email || !password}
                style={loading ? { opacity: 0.6 } : undefined}
              >
                <LinearGradient
                  colors={[AURORA_MAGENTA, '#9333EA', AURORA_TEAL]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.emailButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <MailIcon />
                      <Text style={styles.emailButtonText}>Sign up with Email</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Footer link */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.linkWrap}
            >
              <Text style={styles.linkText}>
                Already have an account?{' '}
                <Text style={styles.linkAccent}>Sign in</Text>
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
    backgroundColor: AURORA_NAVY,
  },
  glowOrb: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: AURORA_MAGENTA,
    opacity: 0.06,
    ...Platform.select({
      ios: {
        shadowColor: AURORA_MAGENTA,
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
  verifyContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
    textAlign: 'center',
  },

  // Auth card
  authCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(235,150,255,0.12)',
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
  authCardSubtitle2: {
    fontSize: 14,
    color: AURORA_PINK,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
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
    backgroundColor: '#050505',
    borderColor: '#131313',
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
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    marginBottom: 12,
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
    color: AURORA_PINK,
    fontWeight: '600',
  },
})

const otpStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  boxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  box: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxFocused: {
    borderColor: AURORA_MAGENTA,
    backgroundColor: 'rgba(235,150,255,0.08)',
  },
  boxFilled: {
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  digit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  digitFilled: {
    color: '#FFFFFF',
  },
})
